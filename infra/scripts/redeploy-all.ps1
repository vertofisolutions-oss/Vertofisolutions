$ErrorActionPreference = "Continue"

# Exact Vercel project names -> their latest production deployment URLs
$projects = @(
  @{ name = "vertofi-platform-web-landing";    url = "https://vertofi.com" },
  @{ name = "vertofi-platform-web-business";   url = "https://business.vertofi.com" },
  @{ name = "vertofi-web-associates";          url = "https://vertofi-web-associates.vercel.app" },
  @{ name = "vertofi-platform-web-accountants";url = "https://vertofi-platform-web-accountants.vercel.app" },
  @{ name = "vertofi-platform-web-bhs";        url = "https://vertofi-platform-web-bhs.vercel.app" },
  @{ name = "vertofi-platform-web-legal";      url = "https://vertofi-platform-web-legal.vercel.app" },
  @{ name = "vertofi-admin";                   url = "https://admin.vertofi.com" },
  @{ name = "vertofi-platform-web-teams";      url = "https://vertofi-platform-web-teams.vercel.app" }
)

foreach ($p in $projects) {
  Write-Host ""
  Write-Host "== Redeploying $($p.name) ==" -ForegroundColor Cyan
  vercel redeploy $p.url --target production --no-wait 2>&1
}

Write-Host ""
Write-Host "== All apps redeployed! ==" -ForegroundColor Green
