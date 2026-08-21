$ErrorActionPreference = "Stop"
$Project = "vertofi-prod-001"
$Zone = "vertofi-zone"

Write-Host "Starting DNS transaction..."
gcloud dns record-sets transaction start --zone=$Zone --project=$Project

Write-Host "Adding A records..."
gcloud dns record-sets transaction add 76.76.21.21 --name="vertofi.com." --ttl=300 --type=A --zone=$Zone --project=$Project
gcloud dns record-sets transaction add 8.233.130.121 --name="api.vertofi.com." --ttl=300 --type=A --zone=$Zone --project=$Project

Write-Host "Adding CNAME records for Vercel..."
$cnames = @("www", "app", "panels", "admin", "associates", "accountants", "bhs", "legal")
foreach ($sub in $cnames) {
    gcloud dns record-sets transaction add "cname.vercel-dns.com." --name="$sub.vertofi.com." --ttl=300 --type=CNAME --zone=$Zone --project=$Project
}

Write-Host "Executing transaction..."
gcloud dns record-sets transaction execute --zone=$Zone --project=$Project

Write-Host "--------------------------------------------------------"
Write-Host "YOUR GOOGLE CLOUD NAMESERVERS (Copy these into GoDaddy):"
Write-Host "--------------------------------------------------------"
gcloud dns managed-zones describe $Zone --project=$Project --format="value(nameServers)"
