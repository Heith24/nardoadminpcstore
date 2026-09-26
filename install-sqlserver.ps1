$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
  exit
}

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
  throw 'Windows Package Manager (winget) is required. Install App Installer from the Microsoft Store, then rerun this script.'
}

$expressService = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
if (-not $expressService) {
  Write-Host 'Installing SQL Server 2025 Express...' -ForegroundColor Cyan
  & winget.exe install --id Microsoft.SQLServer.2025.Express --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget could not install SQL Server 2025 Express (exit code $LASTEXITCODE)." }

  $expressService = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
  if (-not $expressService) {
    throw 'The SQL Server installer did not create the SQLEXPRESS instance. Complete its setup prompts, then rerun this script.'
  }
}

if ($expressService.Status -ne 'Running') { Start-Service -Name 'MSSQL$SQLEXPRESS' }
Write-Host 'SQL Server Express is installed and running. Next, run setup.ps1 to configure the project database and app.' -ForegroundColor Green