param(
  [string[]]$Spec = @("tests/popup-ui.spec.js", "tests/smokebomb.spec.js")
)

$ErrorActionPreference = "Stop"

npx --yes -p @playwright/test playwright --version | Out-Null

$NpxCache = Join-Path $env:LOCALAPPDATA "npm-cache\_npx"
$PlaywrightNodeModules = Get-ChildItem $NpxCache -Directory -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  ForEach-Object { Join-Path $_.FullName "node_modules" } |
  Where-Object { Test-Path (Join-Path $_ "@playwright\test") } |
  Select-Object -First 1

if (-not $PlaywrightNodeModules) {
  throw "Could not locate @playwright/test in the npx cache."
}

$env:NODE_PATH = $PlaywrightNodeModules
npx --yes -p @playwright/test playwright test @Spec
exit $LASTEXITCODE
