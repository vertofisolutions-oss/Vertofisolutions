# Monitoring & alerting (Cloud Monitoring). GKE Autopilot ships metrics/logs to
# Cloud Monitoring + Logging automatically (managed Prometheus included), so this
# file adds the alerting layer: an email channel + the policies that matter most
# for a lean single-instance launch. Uptime check on the gateway is added after
# deploy (its public IP isn't known until the Ingress provisions).

resource "google_monitoring_notification_channel" "email" {
  display_name = "Vertofi Alerts"
  type         = "email"
  labels       = { email_address = var.alert_email }
  depends_on   = [google_project_service.enabled]
}

# Cloud SQL CPU — the lean DB (1 vCPU) is the first thing to saturate under load.
resource "google_monitoring_alert_policy" "sql_cpu" {
  display_name = "Cloud SQL CPU > 80% (5m)"
  combiner     = "OR"
  conditions {
    display_name = "CPU utilization high"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  notification_channels = [google_monitoring_notification_channel.email.id]
  depends_on            = [google_project_service.enabled]
}

# Cloud SQL disk — autoresize is on, but alert before it grows unexpectedly.
resource "google_monitoring_alert_policy" "sql_disk" {
  display_name = "Cloud SQL disk > 85% (5m)"
  combiner     = "OR"
  conditions {
    display_name = "Disk utilization high"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/disk/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  notification_channels = [google_monitoring_notification_channel.email.id]
  depends_on            = [google_project_service.enabled]
}

# Cloud SQL connections — with 32 services × small pools against a 1-vCPU DB,
# connection exhaustion bites before CPU. Watch it.
resource "google_monitoring_alert_policy" "sql_connections" {
  display_name = "Cloud SQL connections > 150 (5m)"
  combiner     = "OR"
  conditions {
    display_name = "Active connections high"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/postgresql/num_backends\""
      comparison      = "COMPARISON_GT"
      threshold_value = 150
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  notification_channels = [google_monitoring_notification_channel.email.id]
  depends_on            = [google_project_service.enabled]
}

# Pod crash-looping — surfaces a bad deploy or a service misconfig fast.
resource "google_monitoring_alert_policy" "pod_restarts" {
  display_name = "GKE container restarts spiking (5m)"
  combiner     = "OR"
  conditions {
    display_name = "Container restart count"
    condition_threshold {
      filter          = "resource.type = \"k8s_container\" AND metric.type = \"kubernetes.io/container/restart_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }
  notification_channels = [google_monitoring_notification_channel.email.id]
  depends_on            = [google_project_service.enabled]
}

output "alert_notification_channel" {
  value = google_monitoring_notification_channel.email.id
}
