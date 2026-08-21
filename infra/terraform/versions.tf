terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # Remote state in a GCS bucket. Create it once before `terraform init`:
  #   gsutil mb -l asia-south1 gs://vertofi-tfstate-<PROJECT_ID>
  #   gsutil versioning set on gs://vertofi-tfstate-<PROJECT_ID>
  backend "gcs" {
    bucket = "vertofi-tfstate-vertofi-prod-001"
    prefix = "vertofi/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
