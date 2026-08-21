# ─────────────────────────────────────────────────────────────────────────
# Push every key in a .env file into GCP Secret Manager as "vertofi-shared-<KEY>".
# The External Secrets Operator then projects these into each pod as env vars.
#
# Usage:
#   .\sync-secrets.ps1 -EnvFile ..\..\.env.production -ProjectId my-proj
#
# Re-run any time you change a secret; it adds a new secret version.
# NEVER commit the .env file you pass here.
# ─────────────────────────────────────────────────────────────────────────
param(
  [string]$EnvFile = "..\..\.env.production",
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Prefix = "vertofi-shared"
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
gcloud config set project $ProjectId | Out-Null

if (-not (Test-Path $EnvFile)) { throw "Env file not found: $EnvFile" }

# Keys that are build-time public (NEXT_PUBLIC_*) or pod-injected — skip them.
$skipPrefixes = @("NEXT_PUBLIC_", "GATEWAY_PORT", "AUTH_PORT")

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }

  $idx = $line.IndexOf("=")
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim()
  # strip surrounding quotes and inline comments after the value
  $val = $val -replace '^"(.*)"$', '$1'
  if (-not $val) { return } # don't push empty values (connector → NEEDS_CREDENTIALS)
  foreach ($p in $skipPrefixes) { if ($key.StartsWith($p)) { return } }

  $secretName = "$Prefix-$key"
  # Write the value to a temp file with NO trailing newline. Piping a string into
  # `gcloud ... --data-file=-` via PowerShell appends a CRLF, which corrupts the
  # stored secret (broken hostnames/keys, defeated placeholder checks). Use a
  # byte-exact temp file instead.
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, $val, [System.Text.UTF8Encoding]::new($false))
  try {
    $exists = gcloud secrets describe $secretName --project $ProjectId 2>$null
    if (-not $exists) {
      Write-Host "Creating secret $secretName"
      gcloud secrets create $secretName --data-file=$tmp --replication-policy="automatic" --project $ProjectId | Out-Null
    } else {
      Write-Host "Adding version to $secretName"
      gcloud secrets versions add $secretName --data-file=$tmp --project $ProjectId | Out-Null
    }
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Done. Secrets are in Secret Manager under prefix '$Prefix-'."
