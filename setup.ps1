$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

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

function Install-WinGetPackage([string]$id) {
  Write-Host "Installing $id..." -ForegroundColor Cyan
  & winget.exe install --id $id --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget could not install $id (exit code $LASTEXITCODE)." }
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath"
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  Install-WinGetPackage 'OpenJS.NodeJS.LTS'
  Refresh-ProcessPath
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'Node.js installation finished but npm is not available. Close this window, reopen setup.ps1, and try again.'
}

$odbcDriverKeys = @(
  'HKLM:\SOFTWARE\ODBC\ODBCINST.INI\ODBC Driver 18 for SQL Server',
  'HKLM:\SOFTWARE\WOW6432Node\ODBC\ODBCINST.INI\ODBC Driver 18 for SQL Server'
)
if (-not ($odbcDriverKeys | Where-Object { Test-Path $_ })) {
  Install-WinGetPackage 'Microsoft.msodbcsql.18'
}

$expressService = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
if (-not $expressService) {
  Install-WinGetPackage 'Microsoft.SQLServer.2025.Express'
  $expressService = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
  if (-not $expressService) {
    throw 'SQL Server Express installation did not create the SQLEXPRESS instance. Complete the SQL Server installer, then rerun setup.ps1.'
  }
}
if ($expressService.Status -ne 'Running') { Start-Service -Name 'MSSQL$SQLEXPRESS' }

function Get-ConfigValue([string]$name) {
  $fromProcess = [Environment]::GetEnvironmentVariable($name)
  if ($fromProcess) { return $fromProcess }

  $envFile = Join-Path $projectRoot 'server/.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$name\s*=\s*(.*?)\s*$") {
        return $Matches[1].Trim().Trim('"').Trim("'")
      }
    }
  }
}

$dbServer = Get-ConfigValue 'DB_SERVER'
if (-not $dbServer) { $dbServer = 'localhost\SQLEXPRESS' }
$dbName = Get-ConfigValue 'DB_NAME'
if ($dbName -and $dbName -ne 'pc_store') {
  throw 'The setup SQL script creates pc_store. Set DB_NAME=pc_store in server/.env before running setup.'
}

$connectionString = "Data Source=$dbServer;Initial Catalog=master;Integrated Security=SSPI;TrustServerCertificate=True;Connect Timeout=5"
$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = $connectionString

try {
  $connection.Open()
} catch {
  throw "Cannot connect to SQL Server at '$dbServer' with Windows Authentication. Start SQL Server and enable the configured TCP endpoint. Details: $($_.Exception.Message)"
}

try {
  $checkDatabase = $connection.CreateCommand()
  $checkDatabase.CommandText = "SELECT DB_ID(N'pc_store')"
  $databaseId = $checkDatabase.ExecuteScalar()
  $databaseExists = $null -ne $databaseId -and [DBNull]::Value -ne $databaseId
  $checkDatabase.Dispose()

  if ($databaseExists) {
    Write-Warning 'pc_store already exists. The script will apply its migrations and seed any missing demo records.'
    $confirmation = Read-Host 'Type APPLY to continue against the existing database'
    if ($confirmation -cne 'APPLY') { throw 'Database setup cancelled; no SQL batches were run.' }
  }

  $schemaPath = Join-Path $projectRoot 'database/pc-store.sql'
  $schema = Get-Content -Raw -Path $schemaPath
  $batches = [regex]::Split($schema, '(?im)^[ \t]*GO[ \t]*(?:--[^\r\n]*)?\r?$')
  $batchNumber = 0
  foreach ($batch in $batches) {
    if (-not [string]::IsNullOrWhiteSpace($batch)) {
      $batchNumber += 1
      $command = $connection.CreateCommand()
      $command.CommandText = $batch
      $command.CommandTimeout = 120
      try {
        $null = $command.ExecuteNonQuery()
      } catch {
        throw "Database setup failed in SQL batch $batchNumber. Details: $($_.Exception.Message)"
      } finally {
        $command.Dispose()
      }
    }
  }

  $connection.ChangeDatabase('pc_store')
  $verify = $connection.CreateCommand()
  $verify.CommandText = 'SELECT COUNT(*) FROM dbo.Users'
  $userCount = $verify.ExecuteScalar()
  $verify.CommandText = 'SELECT COUNT(*) FROM dbo.Products'
  $productCount = $verify.ExecuteScalar()
  $verify.Dispose()
  Write-Host "Database ready: pc_store ($userCount users, $productCount products)." -ForegroundColor Green
} finally {
  $connection.Dispose()
}

Write-Host 'Installing project dependencies...' -ForegroundColor Cyan
& npm.cmd run install:all
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }

Write-Host 'Starting the client and API. Press Ctrl+C to stop them.' -ForegroundColor Green
& npm.cmd run dev
if ($LASTEXITCODE -ne 0) { throw 'The development servers stopped with an error.' }