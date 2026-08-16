$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$target = $env:WB_OUTPUT_ROOT
if (-not $target) { $target = Join-Path $root '.wb-output' }
if (Test-Path $target) {
  Remove-Item $target -Recurse -Force
  Write-Output ("Cleaned: " + $target)
} else {
  Write-Output ("Nothing to clean: " + $target)
}
