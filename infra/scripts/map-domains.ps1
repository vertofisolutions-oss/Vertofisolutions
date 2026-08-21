$ErrorActionPreference = "Continue"

# Map: latest deployment URL -> custom domain to assign
# These are the correct isolated project deployments
$mappings = @(
  @{ deployment = "https://vertofi-web-associates-elf3g46hb.vercel.app";          domain = "associates.vertofi.com" },
  @{ deployment = "https://vertofi-platform-web-accountants-q6ewhi3nm.vercel.app"; domain = "accountants.vertofi.com" },
  @{ deployment = "https://vertofi-platform-web-basbtj3vw-vertofisolutions-7574s-projects.vercel.app"; domain = "bhs.vertofi.com" },
  @{ deployment = "https://vertofi-platform-web-legal-9pv2qj8c9.vercel.app";      domain = "legal.vertofi.com" },
  @{ deployment = "https://vertofi-platform-web-teams-gd2x545px.vercel.app";      domain = "teams.vertofi.com" }
)

foreach ($m in $mappings) {
  Write-Host ""
  Write-Host "== Mapping $($m.domain) ==" -ForegroundColor Cyan
  vercel alias set $m.deployment $m.domain 2>&1
}

Write-Host ""
Write-Host "== All domains mapped! ==" -ForegroundColor Green
