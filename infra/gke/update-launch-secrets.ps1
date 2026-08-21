# ─────────────────────────────────────────────────────────────────────────
# Update critical production secrets for launch:
#   1. OTP_BYPASS_CODE = 123456 (soft-launch break-glass)
#   2. CORS_ORIGINS = all Vertofi domains + panel subdomains
#   3. NEXT_PUBLIC_API_URL = gateway IP (until DNS is live)
#
# Run: .\update-launch-secrets.ps1 -ProjectId vertofi-prod-001
# ─────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$ProjectId = "vertofi-prod-001"
)
$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
gcloud config set project $ProjectId | Out-Null

function Set-Secret {
  param([string]$Key, [string]$Value)
  $secretName = "vertofi-shared-$Key"
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.UTF8Encoding]::new($false))
  try {
    $exists = gcloud secrets describe $secretName --project $ProjectId 2>$null
    if (-not $exists) {
      Write-Host "Creating secret $secretName"
      gcloud secrets create $secretName --data-file=$tmp --replication-policy="automatic" --project $ProjectId | Out-Null
    } else {
      Write-Host "Updating secret $secretName"
      gcloud secrets versions add $secretName --data-file=$tmp --project $ProjectId | Out-Null
    }
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}

# 1. OTP break-glass bypass code (123456 — soft launch)
Write-Host "== Setting OTP_BYPASS_CODE =="
Set-Secret "OTP_BYPASS_CODE" "123456"

# 2. OTP_BYPASS_ENABLED must be 1 (already set; update to be safe)
Write-Host "== Setting OTP_BYPASS_ENABLED =="
Set-Secret "OTP_BYPASS_ENABLED" "1"

# 3. CORS origins — all Vertofi domains + all panel subdomains
Write-Host "== Setting CORS_ORIGINS =="
$cors = "https://vertofi.com,https://www.vertofi.com,https://app.vertofi.com,https://panels.vertofi.com,https://admin.vertofi.com,https://associates.vertofi.com,https://accountants.vertofi.com,https://bhs.vertofi.com,https://legal.vertofi.com"
Set-Secret "CORS_ORIGINS" $cors

Write-Host ""
Write-Host "== Done. Now rolling out the auth and api-gateway pods =="
Write-Host "Restarting auth deployment..."
kubectl rollout restart deployment/auth -n vertofi-identity
Write-Host "Restarting api-gateway deployment..."
kubectl rollout restart deployment/api-gateway -n vertofi-gateway
Write-Host ""
Write-Host "Waiting for rollouts..."
kubectl rollout status deployment/auth -n vertofi-identity --timeout=120s
kubectl rollout status deployment/api-gateway -n vertofi-gateway --timeout=120s
Write-Host ""
Write-Host "== Launch secrets updated. OTP bypass code: 123456 =="
Write-Host "== CORS now allows all Vertofi domains =="
