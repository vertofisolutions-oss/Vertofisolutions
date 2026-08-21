variable "project_id" {
  description = "GCP project ID hosting Vertofi."
  type        = string
}

variable "region" {
  description = "Primary GCP region (India data residency: asia-south1 = Mumbai)."
  type        = string
  default     = "asia-south1"
}

variable "env" {
  description = "Deployment environment."
  type        = string
  default     = "production"
}

variable "subnet_cidr" {
  description = "Primary CIDR for the GKE node subnet."
  type        = string
  default     = "10.40.0.0/20"
}

variable "pods_cidr" {
  description = "Secondary range for GKE pods."
  type        = string
  default     = "10.44.0.0/14"
}

variable "services_cidr" {
  description = "Secondary range for GKE services."
  type        = string
  default     = "10.48.0.0/20"
}

variable "db_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  # C-2 fix: bumped from db-custom-2-7680 (2 vCPU/7.5 GB) to db-custom-8-30720
  # (8 vCPU/30 GB). The 2-vCPU box was the hard throughput ceiling for 32 services.
  # Tune tier down per load-test results; never run prod on less than db-custom-4-15360.
  default = "db-custom-8-30720"
}

variable "db_ha" {
  description = "Enable Cloud SQL regional HA + Redis STANDARD_HA."
  type        = bool
  # C-2 fix: defaulting to true. ZONAL means a single zone outage takes the whole
  # platform offline. REGIONAL adds an automatic failover standby in a second zone.
  default = true
}

variable "redis_memory_gb" {
  description = "Memorystore (Redis) capacity in GB."
  type        = number
  default     = 1
}

variable "alert_email" {
  description = "Email address that receives monitoring alerts."
  type        = string
  default     = "maheshmahi.ai224@gmail.com"
}
