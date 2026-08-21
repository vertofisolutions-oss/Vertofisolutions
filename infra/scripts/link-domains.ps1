$ErrorActionPreference = "Continue"

# Add custom domains to their Vercel PROJECTS (not specific deployments).
# This makes the domain permanently follow new production builds automatically.

$mappings = @(
  @{ project = "vertofi-web-associates";          domain = "associates.vertofi.com" },
  @{ project = "vertofi-platform-web-accountants"; domain = "accountants.vertofi.com" },
  @{ project = "vertofi-platform-web-bhs";         domain = "bhs.vertofi.com" },
  @{ project = "vertofi-platform-web-legal";       domain = "legal.vertofi.com" },
  @{ project = "vertofi-platform-web-teams";       domain = "teams.vertofi.com" },
  @{ project = "vertofi-platform-web-business";    domain = "business.vertofi.com" },
  @{ project = "vertofi-admin";                    domain = "admin.vertofi.com" },
  @{ project = "vertofi-platform-web-landing";     domain = "vertofi.com" }
)

foreach ($m in $mappings) {
  Write-Host ""
  Write-Host "== Adding $($m.domain) to project $($m.project) ==" -ForegroundColor Cyan
  # vercel domains add at project scope links domain permanently to project
  Push-Location apps
  vercel domains add $m.domain --scope vertofisolutions-7574s-projects 2>&1
  Pop-Location
}

Write-Host ""
Write-Host "== All domains permanently linked to their projects! ==" -ForegroundColor Green
