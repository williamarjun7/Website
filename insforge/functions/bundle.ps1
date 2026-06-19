# bundle.ps1 — Creates self-contained deploy files by inlining _shared dependencies
param([string]$FunctionName = "all")

$root = $PSScriptRoot

# Read all shared modules
$sharedCode = @{}
Get-ChildItem "$root/_shared/*.ts" | ForEach-Object {
  $mod = $_.BaseName
  $code = Get-Content $_.FullName -Raw
  $sharedCode[$mod] = $code
}

# Transitive dependency map for shared modules
$sharedDeps = @{
  "timing-safe" = @()
  "sync-harden" = @("timing-safe")
  "idempotency" = @()
}

$importRegex = '^import .+ from "\.\./_shared/[\w-]+\.ts"'

# Build a combined inline blob for a shared module (resolve deps recursively)
$injectCache = @{}
$visitGuard = @{}
function Get-InjectedCode {
  param([string]$mod)
  if ($injectCache.ContainsKey($mod)) { return $injectCache[$mod] }
  if ($visitGuard.ContainsKey($mod)) { return "" }
  $visitGuard[$mod] = $true

  $parts = @()
  foreach ($dep in $sharedDeps[$mod]) {
    $parts += Get-InjectedCode $dep
  }
  $code = $sharedCode[$mod]
  $code = ($code -split "`n" | Where-Object { $_ -notmatch '^import ' }) -join "`n"
  $parts += "// ── Inlined from _shared/$mod.ts ──"
  $parts += $code.TrimEnd()
  $parts += "// ── End inlined ──"
  $result = $parts -join "`n"
  $injectCache[$mod] = $result
  return $result
}

function Bundle-Function {
  param([string]$slug)
  $src = Get-Content "$root/$slug/index.ts" -Raw
  $lines = $src -split "`n"
  $out = @()

  # Collect all shared imports and inject them in preamble
  $preamble = @()
  $injected = @{}
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed -match $importRegex) {
      $mod = $trimmed -replace '^import .+ from "\.\./_shared/([\w-]+)\.ts"', '$1'
      if (-not $injected.ContainsKey($mod)) {
        $injected[$mod] = $true
        $preamble += Get-InjectedCode $mod
      }
    }
  }
  if ($preamble.Count -gt 0) { $out += $preamble -join "`n`n" }

  # Now add source lines, skipping shared imports
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed -match $importRegex) { continue }
    $out += $line
  }

  $outDir = "$root/deploy"
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
  $outPath = "$outDir/$slug.ts"
  $out -join "`n" | Set-Content -Path $outPath -NoNewline
  Write-Output "Bundled $slug → $outPath"
}

$functions = @{
  "create-booking"        = $true
  "sync-webhook-sender"   = $true
  "booking-webhook"       = $true
  "pos-sync-api"          = $true
  "monitor-sync-health"   = $true
  "reconcile-dead-letter" = $true
  "echo-pos"              = $true
}

if ($FunctionName -eq "all") {
  foreach ($slug in $functions.Keys) { Bundle-Function $slug }
} else {
  Bundle-Function $FunctionName
}
