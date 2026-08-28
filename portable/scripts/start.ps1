$ErrorActionPreference = "Stop"

$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$runtimeRoot = Join-Path $packageRoot "runtime"
$appRoot = Join-Path $packageRoot "app"
$databaseRoot = Join-Path $packageRoot "database"
$logRoot = Join-Path $packageRoot "logs"
$runRoot = Join-Path $packageRoot "run"
$postgresCtl = Join-Path $runtimeRoot "pgsql\bin\pg_ctl.exe"
$nodeExe = Join-Path $runtimeRoot "node.exe"
$appPidFile = Join-Path $runRoot "app.pid"

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

function Import-PortableEnvironment([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
  foreach ($line in Get-Content -LiteralPath $path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $separator = $trimmed.IndexOf("=")
    if ($separator -le 0) { continue }
    $name = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1).Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Import-PortableEnvironment (Join-Path $packageRoot "portable.env")
Import-PortableEnvironment (Join-Path $packageRoot "optional-model.env")

if (-not $env:AUTH_JWT_SECRET) {
  $authSecretPath = Join-Path $runRoot "auth-jwt-secret.txt"
  if (-not (Test-Path -LiteralPath $authSecretPath -PathType Leaf)) {
    $secretBytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($secretBytes) } finally { $generator.Dispose() }
    $generatedSecret = ([System.BitConverter]::ToString($secretBytes)).Replace("-", "").ToLowerInvariant()
    Set-Content -LiteralPath $authSecretPath -Value $generatedSecret -Encoding ASCII -NoNewline
  }
  $env:AUTH_JWT_SECRET = (Get-Content -LiteralPath $authSecretPath -Raw).Trim()
}

if (-not (Test-Path -LiteralPath $postgresCtl -PathType Leaf)) {
  throw "Bundled PostgreSQL runtime is missing."
}
if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf)) {
  throw "Bundled Node.js runtime is missing."
}

$env:PATH = "$(Join-Path $runtimeRoot 'pgsql\bin');$env:PATH"
$databasePort = if ($env:PORTABLE_DATABASE_PORT) { $env:PORTABLE_DATABASE_PORT } else { "55432" }
$appPort = if ($env:PORT) { $env:PORT } else { "3000" }
$env:DATABASE_URL = "postgresql://postgres@127.0.0.1:$databasePort/ai_mock_coach?schema=public"
$env:PORT = $appPort
$env:HOSTNAME = "127.0.0.1"

& $postgresCtl status -D $databaseRoot *> $null
if ($LASTEXITCODE -ne 0) {
  $postgresLog = Join-Path $logRoot "postgres.log"
  & $postgresCtl start -D $databaseRoot -l $postgresLog -o "-p $databasePort -h 127.0.0.1" -w
  if ($LASTEXITCODE -ne 0) { throw "Bundled PostgreSQL failed to start." }
}

$existingApp = $null
if (Test-Path -LiteralPath $appPidFile -PathType Leaf) {
  $existingPid = [int](Get-Content -LiteralPath $appPidFile -Raw)
  $existingApp = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
}

if (-not $existingApp) {
  $stdoutLog = Join-Path $logRoot "app.log"
  $stderrLog = Join-Path $logRoot "app-error.log"
  $appProcess = Start-Process -FilePath $nodeExe -ArgumentList @("server.js") `
    -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
  Set-Content -LiteralPath $appPidFile -Value $appProcess.Id -Encoding ASCII
}

$url = "http://127.0.0.1:$appPort"
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $ready) {
  throw "AI Mock did not become ready. Check logs\app-error.log."
}

if ($env:PORTABLE_NO_BROWSER -ne "true") {
  Start-Process $url
}
Write-Host ""
Write-Host "AI Mock is ready: $url" -ForegroundColor Green
Write-Host "Demo account: demo@ai-mock.local"
Write-Host "Demo password: demo-password-change-me"
Write-Host "Run STOP_AI_MOCK.cmd before moving or deleting the package."
