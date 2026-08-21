# ─────────────────────────────────────────────────────────────────────────
# MSG91 OTP setup for Vertofi. MSG91 powers EVERY SMS OTP on the platform
# (registration, login, MFA, and step-up Financial/Document approvals) via the
# auth service's SmsConnector → MSG91 v5 OTP API.
#
# India/TRAI: you must complete DLT registration in the MSG91 dashboard
# (Principal Entity + Sender/Header ID + template(s)) BEFORE OTPs will deliver.
#
# Usage (base — one template for all purposes):
#   .\setup-msg91.ps1 -AuthKey xxxx -SenderId VERTFI -TemplateId 64ab...
#
# Optional — branded, anti-phishing per-purpose DLT templates (the code reads
# MSG91_TEMPLATE_ID_<PURPOSE> and falls back to the base template if absent):
#   .\setup-msg91.ps1 -AuthKey xxxx -SenderId VERTFI -TemplateId 64ab... `
#       -TemplateLogin 64l... -TemplateRegister 64r... -TemplateMfa 64m... `
#       -TemplateFinancial 64f... -TemplateDocument 64d... -TemplateReset 64s...
# ─────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$AuthKey,
  [Parameter(Mandatory = $true)][string]$SenderId,
  [Parameter(Mandatory = $true)][string]$TemplateId,
  [string]$TemplateLogin,
  [string]$TemplateRegister,
  [string]$TemplateMfa,
  [string]$TemplateFinancial,
  [string]$TemplateDocument,
  [string]$TemplateReset,
  [string]$TemplateEmailVerify,
  [string]$ProjectId = "vertofi-prod-001",
  # Set to $false to keep the soft-launch OTP bypass (123456) enabled.
  [bool]$DisableBypass = $true
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

function Set-Secret {
  param([string]$Key, [string]$Value)
  if (-not $Value) { return }
  $secretName = "vertofi-shared-$Key"
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.UTF8Encoding]::new($false))
  try {
    $exists = gcloud secrets describe $secretName --project $ProjectId 2>$null
    if (-not $exists) {
      Write-Host "  creating secret $secretName"
      gcloud secrets create $secretName --data-file=$tmp --replication-policy="automatic" --project $ProjectId | Out-Null
    } else {
      Write-Host "  updating secret $secretName"
      gcloud secrets versions add $secretName --data-file=$tmp --project $ProjectId | Out-Null
    }
  } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

Write-Host "== Storing MSG91 credentials =="
Set-Secret "MSG91_AUTH_KEY" $AuthKey
Set-Secret "MSG91_SENDER_ID" $SenderId
Set-Secret "MSG91_TEMPLATE_ID" $TemplateId

Write-Host "== Storing optional per-purpose DLT templates (skipped if blank) =="
Set-Secret "MSG91_TEMPLATE_ID_LOGIN" $TemplateLogin
Set-Secret "MSG91_TEMPLATE_ID_REGISTER" $TemplateRegister
Set-Secret "MSG91_TEMPLATE_ID_MFA" $TemplateMfa
Set-Secret "MSG91_TEMPLATE_ID_FINANCIAL" $TemplateFinancial
Set-Secret "MSG91_TEMPLATE_ID_DOCUMENT" $TemplateDocument
Set-Secret "MSG91_TEMPLATE_ID_RESET" $TemplateReset
Set-Secret "MSG91_TEMPLATE_ID_EMAIL_VERIFY" $TemplateEmailVerify

if ($DisableBypass) {
  Write-Host "== Disabling soft-launch OTP bypass (123456) =="
  Set-Secret "OTP_BYPASS_ENABLED" "0"
}

# External Secrets Operator refreshes on a 1h interval — force an immediate sync
# so the auth pod restarts onto the NEW secret version, not a stale one.
Write-Host "== Forcing External Secrets sync (auth-secrets) =="
$stamp = [int][double]::Parse((Get-Date -UFormat %s))
kubectl annotate externalsecret auth-secrets -n vertofi-identity force-sync="$stamp" --overwrite 2>$null
Start-Sleep -Seconds 8

Write-Host "== Restarting auth service =="
kubectl rollout restart deployment/auth -n vertofi-identity
kubectl rollout status deployment/auth -n vertofi-identity --timeout=120s

Write-Host "`n✅ MSG91 OTP integration live. Real SMS now sent for all OTP flows."
Write-Host "   Verify: register/login on app.vertofi.com and confirm the SMS arrives."
if ($DisableBypass) { Write-Host "   Soft-launch bypass (123456) is now OFF." }
