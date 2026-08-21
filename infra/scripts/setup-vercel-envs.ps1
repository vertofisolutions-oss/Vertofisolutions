# ─────────────────────────────────────────────────────────────────────────
# Vertofi Vercel Environment Variables Setup Script
# Run this once per Vercel project using the Vercel CLI.
#
# Prerequisites:
#   npm i -g vercel
#   vercel login
#
# Usage: .\setup-vercel-envs.ps1
# ─────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

# ── CHANGE THESE if your Vercel project names differ ──────────────────────
$projects = @{
  "web-landing"  = "vertofi-landing"     # Your Vercel project name for web-landing
  "web-business" = "vertofi-business"    # Your Vercel project name for web-business
  "web-panels"   = "vertofi-panels"      # Your Vercel project name for web-panels
  "web-admin"    = "vertofi-admin"       # Your Vercel project name for web-admin
}

# ── API URL: use IP until DNS A record is set, then switch to domain ──────
# Phase 1 (now):    http://8.233.130.121/api/v1
# Phase 2 (post-DNS): https://api.vertofi.com/api/v1
$API_URL = "http://8.233.130.121/api/v1"

Write-Host "Setting Vercel environment variables for all 4 apps..."

foreach ($app in $projects.Keys) {
  $proj = $projects[$app]
  Write-Host ""
  Write-Host "== $app ($proj) =="

  $envVars = @{
    "NEXT_PUBLIC_API_URL"     = $API_URL
    "NEXT_PUBLIC_BUSINESS_URL" = "https://app.vertofi.com"
    "NEXT_PUBLIC_PANEL_BASE"  = "https://panels.vertofi.com"
  }

  foreach ($key in $envVars.Keys) {
    $val = $envVars[$key]
    Write-Host "  Setting $key = $val"
    # Set for all environments (production + preview + development)
    echo $val | vercel env add $key production --yes --scope your-team-or-username --project $proj 2>$null
    echo $val | vercel env add $key preview --yes --scope your-team-or-username --project $proj 2>$null
  }
}

Write-Host ""
Write-Host "== All Vercel env vars set =="
Write-Host ""
Write-Host "Next: trigger a redeploy in Vercel dashboard for each project (or push to main)."
