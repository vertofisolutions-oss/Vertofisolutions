# Vertofi production infrastructure on Google Cloud (replaces the AWS stack).
#
# Provisions, in one apply:
#   • VPC + subnet with secondary ranges (GKE-native)
#   • GKE Autopilot cluster (no node management)
#   • Cloud SQL for PostgreSQL (regional HA) + private VPC peering
#   • Memorystore for Redis
#   • Cloud Storage bucket for documents (S3-compatible API)
#   • Artifact Registry (Docker) for service/app images
#   • A runtime GCP service account + Workload Identity binding for the pods
#   • Secret Manager admin (secrets themselves are created by the go-live script)
#
# Region defaults to asia-south1 (Mumbai) for Indian data residency.

locals {
  services = [
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each                   = toset(local.services)
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}

# ── Networking ────────────────────────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "vertofi-${var.env}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.enabled]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "vertofi-${var.env}-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }
  private_ip_google_access = true
}

# Cloud NAT so private GKE/Cloud SQL can reach the internet (OpenAI, GSP, etc.)
resource "google_compute_router" "router" {
  name    = "vertofi-${var.env}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "vertofi-${var.env}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Private services access for Cloud SQL (VPC peering range)
resource "google_compute_global_address" "private_ip_range" {
  name          = "vertofi-${var.env}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
  depends_on              = [google_project_service.enabled]
}

# ── GKE Autopilot ─────────────────────────────────────────────────────────
resource "google_container_cluster" "gke" {
  name     = "vertofi-${var.env}"
  location = var.region

  enable_autopilot    = true
  network             = google_compute_network.vpc.id
  subnetwork          = google_compute_subnetwork.subnet.id
  deletion_protection = false

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity is on by default for Autopilot; declared for clarity.
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  depends_on = [google_project_service.enabled]
}

# ── Cloud SQL (PostgreSQL) ────────────────────────────────────────────────
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "pg" {
  name                = "vertofi-${var.env}-pg"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = false
  depends_on          = [google_service_networking_connection.psa]

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = var.db_ha ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    # C-1 fix: set max_connections to match pool math.
    # Formula: ~20 DB services × 30 replicas × 5 pool_max = 3,000.
    # Adding 500 headroom for admin/migrations/monitoring = 3,500.
    database_flags {
      name  = "max_connections"
      value = "3500"
    }

    # Enable query insights for production performance analysis.
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
}

# C-2 fix: Read replica for analytics/reporting/BHS queries so they don't
# compete with transactional writes on the primary. Route benchmarks, reporting,
# bhs-intelligence, and admin-console aggregate reads to this replica.
resource "google_sql_database_instance" "pg_replica" {
  name                 = "vertofi-${var.env}-pg-replica"
  database_version     = "POSTGRES_16"
  region               = var.region
  deletion_protection  = false
  master_instance_name = google_sql_database_instance.pg.name

  replica_configuration {
    failover_target = false
  }

  settings {
    tier            = var.db_tier
    edition         = "ENTERPRISE"
    disk_autoresize = true
    disk_type       = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }
  }
}

resource "google_sql_database" "vertofi" {
  name     = "vertofi"
  instance = google_sql_database_instance.pg.name
}

resource "google_sql_user" "vertofi" {
  name     = "vertofi"
  instance = google_sql_database_instance.pg.name
  password = random_password.db.result
}

# ── Memorystore (Redis) ───────────────────────────────────────────────────
resource "google_redis_instance" "redis" {
  name               = "vertofi-${var.env}-redis"
  tier               = var.db_ha ? "STANDARD_HA" : "BASIC"
  memory_size_gb     = var.redis_memory_gb
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_2"
  depends_on         = [google_service_networking_connection.psa]
}

# ── Cloud Storage (documents bucket, S3-compatible API) ───────────────────
resource "google_storage_bucket" "documents" {
  name                        = "vertofi-${var.env}-documents-${var.project_id}"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning { enabled = true }

  # M-5 fix: restrict CORS from wildcard to known Vertofi app origins.
  cors {
    origin = [
      "https://vertofi.com",
      "https://www.vertofi.com",
      "https://business.vertofi.com",
      "https://associates.vertofi.com",
      "https://accountants.vertofi.com",
      "https://legal.vertofi.com",
      "https://bhs.vertofi.com",
      "https://admin.vertofi.com",
      "https://teams.vertofi.com",
    ]
    method          = ["GET", "PUT", "POST", "HEAD"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }
}

# ── Artifact Registry (Docker images) ─────────────────────────────────────
resource "google_artifact_registry_repository" "vertofi" {
  location      = var.region
  repository_id = "vertofi"
  format        = "DOCKER"
  description   = "Vertofi service & app container images"
  depends_on    = [google_project_service.enabled]
}

# ── Runtime service account + Workload Identity ───────────────────────────
resource "google_service_account" "runtime" {
  account_id   = "vertofi-runtime"
  display_name = "Vertofi pod runtime SA"
}

# Runtime IAM: read secrets, use Cloud SQL, read/write the documents bucket.
resource "google_project_iam_member" "runtime_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_storage_bucket_iam_member" "runtime_bucket" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.runtime.email}"
}

# NOTE: Workload Identity bindings (roles/iam.workloadIdentityUser) for each
# per-service KSA are created at deploy time by infra/gke/deploy-gke.ps1 — IAM
# members cannot use a wildcard namespace/KSA, and the KSAs only exist once Helm
# has created them in their namespaces.

# ── Outputs ───────────────────────────────────────────────────────────────
output "gke_cluster_name" { value = google_container_cluster.gke.name }
output "gke_location" { value = google_container_cluster.gke.location }
output "db_private_ip" { value = google_sql_database_instance.pg.private_ip_address }
output "db_connection_name" { value = google_sql_database_instance.pg.connection_name }
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
output "redis_host" { value = google_redis_instance.redis.host }
output "redis_port" { value = google_redis_instance.redis.port }
output "documents_bucket" { value = google_storage_bucket.documents.name }
output "artifact_registry" { value = "${var.region}-docker.pkg.dev/${var.project_id}/vertofi" }
output "runtime_sa_email" { value = google_service_account.runtime.email }

output "database_url" {
  value     = "postgresql://vertofi:${random_password.db.result}@${google_sql_database_instance.pg.private_ip_address}:5432/vertofi"
  sensitive = true
}
