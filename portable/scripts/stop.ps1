$ErrorActionPreference = "Stop"

$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$appPidFile = Join-Path $packageRoot "run\app.pid"
$nodeExe = [System.IO.Path]::GetFullPath((Join-Path $packageRoot "runtime\node.exe"))
$postgresCtl = Join-Path $packageRoot "runtime\pgsql\bin\pg_ctl.exe"
$databaseRoot = Join-Path $packageRoot "database"

if (Test-Path -LiteralPath $appPidFile -PathType Leaf) {
  $appPid = [int](Get-Content -LiteralPath $appPidFile -Raw)
  $process = Get-Process -Id $appPid -ErrorAction SilentlyContinue
  if ($process) {
    $processPath = $process.Path
    if ($processPath -and [System.IO.Path]::GetFullPath($processPath) -eq $nodeExe) {
      Stop-Process -Id $appPid -Force
      $null = $process.WaitForExit(5000)
    } else {
      throw "Refusing to stop PID $appPid because it is not the bundled Node.js process."
    }
  }
  Remove-Item -LiteralPath $appPidFile -Force
}

if (Test-Path -LiteralPath $postgresCtl -PathType Leaf) {
  & $postgresCtl status -D $databaseRoot *> $null
  if ($LASTEXITCODE -eq 0) {
    & $postgresCtl stop -D $databaseRoot -m fast -w
    if ($LASTEXITCODE -ne 0) { throw "Bundled PostgreSQL failed to stop cleanly." }
  }
}

Write-Host "AI Mock portable services are stopped." -ForegroundColor Green
