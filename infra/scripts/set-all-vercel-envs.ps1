$ErrorActionPreference = "Continue"

# Core Environment Variables
$API_URL = "https://api.vertofi.com/api/v1"
$BUSINESS_URL = "https://business.vertofi.com"

# Newly separated panel URLs
$ASSOCIATES_URL = "https://associates.vertofi.com"
$ACCOUNTANTS_URL = "https://accountants.vertofi.com"
$BHS_URL = "https://bhs.vertofi.com"
$LEGAL_URL = "https://legal.vertofi.com"
$ADMIN_URL = "https://admin.vertofi.com"
$TEAMS_URL = "https://teams.vertofi.com"

# App directories mapped to their specific env var sets
$apps = @(
  @{ 
    dir = "apps/web-landing"; 
    vars = @{ 
      "NEXT_PUBLIC_API_URL" = $API_URL; 
      "NEXT_PUBLIC_BUSINESS_URL" = $BUSINESS_URL; 
      "NEXT_PUBLIC_ASSOCIATES_URL" = $ASSOCIATES_URL; 
      "NEXT_PUBLIC_ACCOUNTANTS_URL" = $ACCOUNTANTS_URL; 
      "NEXT_PUBLIC_BHS_URL" = $BHS_URL; 
      "NEXT_PUBLIC_LEGAL_URL" = $LEGAL_URL; 
    } 
  },
  @{ 
    dir = "apps/web-business";   
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_BUSINESS_URL" = $BUSINESS_URL } 
  },
  @{ 
    dir = "apps/web-associates";   
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_ASSOCIATES_URL" = $ASSOCIATES_URL } 
  },
  @{ 
    dir = "apps/web-accountants";   
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_ACCOUNTANTS_URL" = $ACCOUNTANTS_URL } 
  },
  @{ 
    dir = "apps/web-bhs";   
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_BHS_URL" = $BHS_URL } 
  },
  @{ 
    dir = "apps/web-legal";   
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_LEGAL_URL" = $LEGAL_URL } 
  },
  @{ 
    dir = "apps/web-admin";    
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_ADMIN_URL" = $ADMIN_URL; "NEXT_PUBLIC_TEAMS_URL" = $TEAMS_URL } 
  },
  @{ 
    dir = "apps/web-teams";    
    vars = @{ "NEXT_PUBLIC_API_URL" = $API_URL; "NEXT_PUBLIC_TEAMS_URL" = $TEAMS_URL } 
  }
)

$environments = @("production", "preview", "development")

foreach ($app in $apps) {
  $dir = $app.dir
  Write-Host ""
  Write-Host "== $dir ==" -ForegroundColor Cyan
  
  # Check if directory exists before trying to run vercel commands inside it
  if (!(Test-Path -Path $dir)) {
    Write-Host "  Directory $dir does not exist. Skipping." -ForegroundColor Yellow
    continue
  }

  foreach ($env in $environments) {
    foreach ($key in $app.vars.Keys) {
      $val = $app.vars[$key]
      $tmp = [System.IO.Path]::GetTempFileName()
      # Use UTF8 encoding to write the file, so Get-Content pipes pure string data to vercel env add without BOM errors
      [System.IO.File]::WriteAllText($tmp, $val, [System.Text.UTF8Encoding]::new($false))
      
      Write-Host "  Setting $key=$val ($env)"
      
      # Remove it first in case it already exists (prevents prompt hanging)
      vercel env rm $key $env -y --cwd $dir 2>&1 | Out-Null
      
      # Run Vercel CLI. Pipe the temp file contents directly to bypass interactive prompts.
      Get-Content $tmp | vercel env add $key $env --cwd $dir 2>&1 | Out-Null
      
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host ""
Write-Host "== All Vercel env vars set ==" -ForegroundColor Green
