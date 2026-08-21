param([string]$AppDir, [hashtable]$Vars)
foreach ($env in @("production", "preview", "development")) {
  foreach ($key in $Vars.Keys) {
    $val = $Vars[$key]
    Write-Host "[$AppDir] $key ($env)"
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $val, [System.Text.UTF8Encoding]::new($false))
    # Remove existing first (ignore error if doesn't exist)
    vercel env rm $key $env --yes --cwd $AppDir 2>$null
    # Add new value
    cmd.exe /c "vercel env add $key $env --cwd $AppDir < $tmp" 2>&1
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}
