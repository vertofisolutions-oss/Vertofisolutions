# ─────────────────────────────────────────────────────────────────────────
# Razorpay autopay setup for Vertofi (CARD + UPI AutoPay / QR, 7-day trial →
# auto-debit on day 8). Run ONCE per environment (re-run is safe; it creates a
# new plan version only if amounts change).
#
# What it does:
#   1. Creates a monthly Razorpay *Plan* for each tier (amount from services/billing/plans.ts).
#   2. Stores plan ids + API keys + webhook secret in GCP Secret Manager as
#      vertofi-shared-* (projected into the billing pod by External Secrets).
#   3. Prints the exact webhook URL + events to configure in the Razorpay dashboard.
#
# The billing service then does the rest: `subscribe()` opens Checkout with the
# subscription_id (card e-mandate + UPI AutoPay QR), and the webhook state
# machine drives authenticated → charged (day-8 auto-debit) → halted/cancelled.
#
# Usage (use TEST keys first, then live):
#   .\setup-razorpay.ps1 -ProjectId vertofi-prod-001 `
#       -KeyId rzp_test_xxx -KeySecret yyy -WebhookSecret zzz
# ─────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [Parameter(Mandatory = $true)][string]$KeyId,
  [Parameter(Mandatory = $true)][string]$KeySecret,
  [Parameter(Mandatory = $true)][string]$WebhookSecret,
  [string]$Prefix = "vertofi-shared",
  [string]$GatewayHost = "https://api.vertofi.com"
)
$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
gcloud config set project $ProjectId | Out-Null

# Plan catalog — keep amounts in sync with services/billing/plans.ts (INR/month).
$plans = @(
  @{ tier = "STARTER";    amount = 1499;  name = "Vertofi Starter" },
  @{ tier = "GROWTH";     amount = 3999;  name = "Vertofi Growth" },
  @{ tier = "PRO";        amount = 8999;  name = "Vertofi Pro" },
  @{ tier = "ENTERPRISE"; amount = 29999; name = "Vertofi Enterprise" }
)

$pair = "$($KeyId):$($KeySecret)"
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $basic"; "Content-Type" = "application/json" }

function Set-Secret([string]$Key, [string]$Value) {
  $secretName = "$Prefix-$Key"
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

Write-Host "== Storing Razorpay API credentials =="
Set-Secret "RAZORPAY_KEY_ID" $KeyId
Set-Secret "RAZORPAY_KEY_SECRET" $KeySecret
Set-Secret "RAZORPAY_WEBHOOK_SECRET" $WebhookSecret

Write-Host "== Creating Razorpay subscription plans (MONTHLY + ANNUAL) =="
# Annual = 10 months' price (2 months free). Keep in sync with services/billing/plans.ts.
foreach ($p in $plans) {
  $cycles = @(
    @{ key = "MONTHLY"; period = "monthly"; interval = 1; amount = $p.amount;       label = "mo" },
    @{ key = "YEARLY";  period = "yearly";  interval = 1; amount = ($p.amount * 10); label = "yr" }
  )
  foreach ($c in $cycles) {
    $body = @{
      period   = $c.period
      interval = $c.interval
      item     = @{ name = "$($p.name) ($($c.key.ToLower()))"; amount = [int]($c.amount * 100); currency = "INR" }
      notes    = @{ tier = $p.tier; cycle = $c.key }
    } | ConvertTo-Json -Depth 5

    try {
      $resp = Invoke-RestMethod -Uri "https://api.razorpay.com/v1/plans" -Method Post -Headers $headers -Body $body
      Write-Host "  $($p.tier) $($c.key): plan $($resp.id) (Rs $($c.amount)/$($c.label))"
      Set-Secret "RAZORPAY_PLAN_$($p.tier)_$($c.key)" $resp.id
    } catch {
      Write-Host "  ERROR creating $($c.key) plan for $($p.tier): $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "== Done. Restart the billing pod to pick up new secrets ==" -ForegroundColor Green
Write-Host "  kubectl annotate externalsecret billing-secrets -n vertofi-commerce force-sync=$(Get-Date -UFormat %s) --overwrite"
Write-Host "  kubectl rollout restart deploy/billing -n vertofi-commerce"
Write-Host ""
Write-Host "== MANUAL steps in the Razorpay dashboard ==" -ForegroundColor Cyan
Write-Host "  1. Settings -> Configuration: enable UPI AutoPay AND Card subscriptions (e-mandate)."
Write-Host "  2. Settings -> Webhooks -> Add: $GatewayHost/api/webhooks/razorpay"
Write-Host "     Secret: <the WebhookSecret you passed here>"
Write-Host "     Events: subscription.authenticated, subscription.charged, subscription.pending,"
Write-Host "             subscription.halted, subscription.cancelled, payment.captured"
Write-Host "  3. Use TEST keys end-to-end first; switch to LIVE keys only after a full"
Write-Host "     mandate -> trial -> simulated charge passes."
