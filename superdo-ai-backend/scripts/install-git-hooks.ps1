$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
  Write-Error "No .git directory found in current path. Run this from a Git repository root."
}

git config core.hooksPath .githooks
Write-Host "Git hooks installed. core.hooksPath=.githooks"
