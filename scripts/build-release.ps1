param(
  [string]$Version
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$ManifestPath = Join-Path $Root "manifest.json"
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json

if (-not $Version) {
  $Version = $Manifest.version
}

$ReleaseDir = Join-Path $Root "release"
$Output = Join-Path $ReleaseDir "youtube-focus-mode-v$Version.zip"
$Files = @(
  "manifest.json",
  "popup.html",
  "popup.js",
  "storage.js",
  "content.js",
  "styles.css",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png"
)

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

if (Test-Path -LiteralPath $Output) {
  Remove-Item -LiteralPath $Output -Force
}

$Missing = $Files | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Root $_)) }
if ($Missing.Count -gt 0) {
  throw "Missing release files: $($Missing -join ', ')"
}

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "youtube-focus-mode-release-$([System.Guid]::NewGuid())"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
  foreach ($File in $Files) {
    $Source = Join-Path $Root $File
    $Destination = Join-Path $TempDir $File
    $DestinationDir = Split-Path -Parent $Destination

    New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination
  }

  Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $Output -CompressionLevel Optimal

  $Hash = Get-FileHash -Algorithm SHA256 -LiteralPath $Output
  Write-Host "Built $Output"
  Write-Host "SHA256 $($Hash.Hash)"
}
finally {
  if (Test-Path -LiteralPath $TempDir) {
    Remove-Item -LiteralPath $TempDir -Recurse -Force
  }
}
