# ─────────────────────────────────────────────────────────────────────────
# Build & push all 32 Vertofi service images to Artifact Registry using Cloud
# Build (no local Docker required). Node services use the generic monorepo
# Dockerfile; the 3 Python services use their own Dockerfile + service context.
#
# Usage:
#   .\build-images.ps1 -ProjectId vertofi-prod-001 -Region asia-south1
#   .\build-images.ps1 -ProjectId vertofi-prod-001 -Only auth        # one service
#   .\build-images.ps1 -ProjectId vertofi-prod-001 -Async            # submit all, don't wait
# ─────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "asia-south1",
  [string]$Tag = "latest",
  [string]$Only = "",
  [switch]$Async
)
$ErrorActionPreference = "Stop"
# Ensure gcloud/gsutil are on PATH in fresh / non-interactive shells.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$AR = "$Region-docker.pkg.dev/$ProjectId/vertofi"

$nodeServices = @(
  "api-gateway", "auth", "tenant", "access", "audit", "onboarding", "document",
  "billing", "notification", "accounting-ledger", "reconciliation",
  "exception-workflow", "bank-connector", "gst-connector", "accounting-sync",
  "whatsapp", "bhs-engine", "reporting", "prediction", "lifeguard", "vendor",
  "vbd", "legal-cases", "bhs-intelligence", "benchmarks", "warranty",
  "verification-connectors", "admin-console", "accounting"
)
$pythonServices = @("ocr", "ai-gateway", "categorization")

$asyncFlag = if ($Async) { "--async" } else { $null }

Push-Location $repoRoot
try {
  foreach ($s in $nodeServices) {
    if ($Only -and $s -ne $Only) { continue }
    Write-Host "== Cloud Build (node): $s =="
    gcloud builds submit --project $ProjectId `
      --config infra/gke/cloudbuild-node.yaml `
      --substitutions "_SERVICE=$s,_IMAGE=$AR/${s}:$Tag" `
      $asyncFlag .
  }
  foreach ($s in $pythonServices) {
    if ($Only -and $s -ne $Only) { continue }
    Write-Host "== Cloud Build (python): $s =="
    gcloud builds submit --project $ProjectId `
      --tag "$AR/${s}:$Tag" `
      $asyncFlag "services/$s"
  }
}
finally {
  Pop-Location
}
Write-Host "Done. Check builds: gcloud builds list --region $Region --project $ProjectId"
