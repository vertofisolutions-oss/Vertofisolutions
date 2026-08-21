$ErrorActionPreference = "Continue"

# Permanent domain → project mapping
# After each fresh git-triggered build, remap all domains to the NEW latest deployment.
# Usage: ./infra/remap-domains.ps1

$projects = @(
  @{ name = "vertofi-web-associates";          domain = "associates.vertofi.com" },
  @{ name = "vertofi-platform-web-accountants"; domain = "accountants.vertofi.com" },
  @{ name = "vertofi-platform-web-bhs";         domain = "bhs.vertofi.com" },
  @{ name = "vertofi-platform-web-legal";       domain = "legal.vertofi.com" },
  @{ name = "vertofi-platform-web-teams";       domain = "teams.vertofi.com" },
  @{ name = "vertofi-platform-web-business";    domain = "business.vertofi.com" },
  @{ name = "vertofi-admin";                    domain = "admin.vertofi.com" },
  @{ name = "vertofi-platform-web-landing";     domain = "vertofi.com" }
)

foreach ($p in $projects) {
  Write-Host ""
  Write-Host "== Processing $($p.domain) ($($p.name)) ==" -ForegroundColor Cyan

  # Get latest READY deployment URL for this project
  $deployments = vercel ls $p.name 2>&1 | Select-String "Ready.*Production"
  $latestLine  = ($deployments | Select-Object -First 1).ToString()
  $latestUrl   = ($latestLine -split '\s+' | Where-Object { $_ -match 'vercel\.app' }) | Select-Object -First 1

  if (-not $latestUrl) {
    Write-Host "  WARN: Could not find a Ready deployment for $($p.name)" -ForegroundColor Yellow
    continue
  }

  $latestUrl = $latestUrl.Trim()
  Write-Host "  Latest Ready: $latestUrl" -ForegroundColor Gray
  vercel alias set $latestUrl $p.domain 2>&1
}

Write-Host ""
Write-Host "== All domains remapped to latest builds! ==" -ForegroundColor Green
