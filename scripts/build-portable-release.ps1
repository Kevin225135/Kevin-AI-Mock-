param(
  [Parameter(Mandatory = $true)]
  [string]$OutputRoot,
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [string]$PostgresRoot = "C:\Program Files\PostgreSQL\17",
  [int]$BuildDatabasePort = 55439
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputRootFull = [System.IO.Path]::GetFullPath($OutputRoot)
$archiveFull = [System.IO.Path]::GetFullPath($ArchivePath)
$packageName = "AI-Mock-Portable-Windows-x64"
$packageRoot = Join-Path $outputRootFull $packageName
$standaloneRoot = Join-Path $projectRoot ".next\standalone"
$portableTemplateRoot = Join-Path $projectRoot "portable"
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$postgresBin = Join-Path $PostgresRoot "bin"
$databaseRoot = Join-Path $packageRoot "database"
$buildLog = Join-Path $outputRootFull "portable-build-postgres.log"
$builderStarted = $false

if (Test-Path -LiteralPath $outputRootFull) {
  throw "OutputRoot already exists; choose a new empty path: $outputRootFull"
}
if (Test-Path -LiteralPath $archiveFull) {
  throw "Archive already exists; choose a new path: $archiveFull"
}
if (-not (Test-Path -LiteralPath (Join-Path $standaloneRoot "server.js") -PathType Leaf)) {
  throw "Missing Next.js standalone build. Run npm run build first."
}
if (-not (Test-Path -LiteralPath (Join-Path $postgresBin "initdb.exe") -PathType Leaf)) {
  throw "PostgreSQL 17 runtime was not found at $PostgresRoot"
}

New-Item -ItemType Directory -Path $outputRootFull | Out-Null
New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "app") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "runtime\pgsql\bin") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "runtime\pgsql\lib") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "runtime\pgsql\share") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "logs") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "run") | Out-Null

function Invoke-Robocopy([string]$source, [string]$destination, [string[]]$excludedDirectories = @()) {
  $arguments = @($source, $destination, "/E", "/R:2", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
  if ($excludedDirectories.Count -gt 0) {
    $arguments += "/XD"
    $arguments += $excludedDirectories
  }
  & robocopy.exe @arguments | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Robocopy failed with exit code $LASTEXITCODE while copying $source"
  }
}

try {
  $excludedAppDirectories = @(
    (Join-Path $standaloneRoot "node_modules\@img"),
    (Join-Path $standaloneRoot "node_modules\sharp"),
    (Join-Path $standaloneRoot "node_modules\typescript"),
    (Join-Path $standaloneRoot "node_modules\caniuse-lite")
  )
  Invoke-Robocopy $standaloneRoot (Join-Path $packageRoot "app") $excludedAppDirectories
  # pdfjs loads the canvas adapter dynamically, so Next.js file tracing does not
  # include it in standalone output even though PDF resume parsing needs it.
  Invoke-Robocopy (Join-Path $projectRoot "node_modules\@napi-rs") (Join-Path $packageRoot "app\node_modules\@napi-rs")
  Copy-Item -LiteralPath (Join-Path $projectRoot "node_modules\pdfjs-dist\legacy\build\pdf.worker.mjs") `
    -Destination (Join-Path $packageRoot "app\node_modules\pdfjs-dist\legacy\build\pdf.worker.mjs")
  Invoke-Robocopy $portableTemplateRoot $packageRoot
  Copy-Item -LiteralPath $nodeExe -Destination (Join-Path $packageRoot "runtime\node.exe")

  $requiredExecutables = @("postgres.exe", "pg_ctl.exe", "pg_isready.exe")
  foreach ($name in $requiredExecutables) {
    Copy-Item -LiteralPath (Join-Path $postgresBin $name) -Destination (Join-Path $packageRoot "runtime\pgsql\bin\$name")
  }
  Get-ChildItem -LiteralPath $postgresBin -Filter "*.dll" -File |
    Where-Object { $_.Name -notlike "wx*" -and $_.Name -notlike "libecpg*" -and $_.Name -notlike "libpgtypes*" } |
    Copy-Item -Destination (Join-Path $packageRoot "runtime\pgsql\bin")
  Copy-Item -LiteralPath (Join-Path $PostgresRoot "lib\plpgsql.dll") -Destination (Join-Path $packageRoot "runtime\pgsql\lib\plpgsql.dll")
  Invoke-Robocopy (Join-Path $PostgresRoot "share\timezone") (Join-Path $packageRoot "runtime\pgsql\share\timezone")
  Invoke-Robocopy (Join-Path $PostgresRoot "share\timezonesets") (Join-Path $packageRoot "runtime\pgsql\share\timezonesets")

  & (Join-Path $postgresBin "initdb.exe") -D $databaseRoot -U postgres -A trust -E UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) { throw "initdb failed with exit code $LASTEXITCODE" }

  & (Join-Path $postgresBin "pg_ctl.exe") start -D $databaseRoot -l $buildLog -o "-p $BuildDatabasePort -h 127.0.0.1" -w
  if ($LASTEXITCODE -ne 0) { throw "Build PostgreSQL failed to start." }
  $builderStarted = $true

  & (Join-Path $postgresBin "createdb.exe") -h 127.0.0.1 -p $BuildDatabasePort -U postgres ai_mock_coach
  if ($LASTEXITCODE -ne 0) { throw "Failed to create the portable database." }

  $previousDatabaseUrl = $env:DATABASE_URL
  $previousAdminEmail = $env:SEED_ADMIN_EMAIL
  $previousAdminPassword = $env:SEED_ADMIN_PASSWORD
  $previousEmbeddingProvider = $env:EMBEDDING_PROVIDER
  try {
    $env:DATABASE_URL = "postgresql://postgres@127.0.0.1:$BuildDatabasePort/ai_mock_coach?schema=public"
    $env:SEED_ADMIN_EMAIL = ""
    $env:SEED_ADMIN_PASSWORD = ""
    $env:EMBEDDING_PROVIDER = "local"
    Push-Location $projectRoot
    try {
      & npm.cmd run db:deploy
      if ($LASTEXITCODE -ne 0) { throw "Prisma migration deployment failed." }
      & npm.cmd run db:seed
      if ($LASTEXITCODE -ne 0) { throw "Database seed failed." }
      & (Join-Path $projectRoot "node_modules\.bin\tsx.cmd") scripts\seed-knowledge.ts
      if ($LASTEXITCODE -ne 0) { throw "Knowledge seed failed." }
    } finally {
      Pop-Location
    }
  } finally {
    $env:DATABASE_URL = $previousDatabaseUrl
    $env:SEED_ADMIN_EMAIL = $previousAdminEmail
    $env:SEED_ADMIN_PASSWORD = $previousAdminPassword
    $env:EMBEDDING_PROVIDER = $previousEmbeddingProvider
  }

  & (Join-Path $postgresBin "pg_ctl.exe") stop -D $databaseRoot -m fast -w
  if ($LASTEXITCODE -ne 0) { throw "Build PostgreSQL failed to stop." }
  $builderStarted = $false

  @"
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/ai_mock_coach?schema=public
PORTABLE_DATABASE_PORT=55432
PORT=3000
HOSTNAME=127.0.0.1
AUTH_ACCESS_TOKEN_TTL_MINUTES=15
AUTH_REFRESH_TOKEN_TTL_DAYS=30
DEFAULT_USER_PLAN=FREE
AI_PROVIDER=local
RAG_LLM_ENABLED=false
RAG_WEB_SEARCH_ENABLED=false
EMBEDDING_PROVIDER=local
RERANK_ENABLED=false
ASYNC_SCORING=false
LANGFUSE_TRACE_ENABLED=false
"@ | Set-Content -LiteralPath (Join-Path $packageRoot "portable.env") -Encoding UTF8

  tar.exe -a -c -f $archiveFull -C $outputRootFull $packageName
  if ($LASTEXITCODE -ne 0) { throw "Failed to create the portable ZIP." }

  $archive = Get-Item -LiteralPath $archiveFull
  $packageBytes = (Get-ChildItem -LiteralPath $packageRoot -File -Recurse -Force | Measure-Object Length -Sum).Sum
  [pscustomobject]@{
    packageRoot = $packageRoot
    packageBytes = [int64]$packageBytes
    packageMiB = [math]::Round($packageBytes / 1MB, 2)
    archivePath = $archive.FullName
    archiveBytes = $archive.Length
    archiveMiB = [math]::Round($archive.Length / 1MB, 2)
    under100MiB = $archive.Length -lt 100MB
  } | ConvertTo-Json
} finally {
  if ($builderStarted) {
    & (Join-Path $postgresBin "pg_ctl.exe") stop -D $databaseRoot -m fast -w | Out-Null
  }
}
