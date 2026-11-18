$ErrorActionPreference = 'Stop'

$backupDir = Join-Path $PSScriptRoot '..\backups'
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$pgBackupName = "postgres-$timestamp.sql"
$pgBackupPath = Join-Path $backupDir $pgBackupName
$redisBackupName = "redis-$timestamp.rdb"
$redisBackupPath = Join-Path $backupDir $redisBackupName

try {
  Write-Host "Iniciando respaldo de ShopHero ($timestamp)..." -ForegroundColor Cyan

  # a) PostgreSQL
  Write-Host "Generando pg_dump de PostgreSQL (base shophero, usuario shophero)..." -ForegroundColor Yellow
  cmd.exe /c "docker compose exec -T postgres pg_dump -U shophero -d shophero --clean --if-exists > `"$pgBackupPath`""
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $pgBackupPath) -or (Get-Item $pgBackupPath).Length -eq 0) {
    throw "Error generando el respaldo de PostgreSQL con pg_dump."
  }
  Write-Host "Respaldo de PostgreSQL guardado exitosamente: $pgBackupName" -ForegroundColor Green

  # b) Redis
  Write-Host "Ejecutando bgsave autenticado en Redis..." -ForegroundColor Yellow
  docker compose exec -T redis sh -c 'REDISCLI_AUTH=$(cat /vault/secrets/redis-password) redis-cli bgsave' | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Error ejecutando bgsave en Redis."
  }
  Start-Sleep -Seconds 2

  docker compose cp redis:/data/dump.rdb $redisBackupPath
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $redisBackupPath)) {
    throw "Error copiando el archivo dump.rdb de Redis."
  }
  Write-Host "Respaldo de Redis guardado exitosamente: $redisBackupName" -ForegroundColor Green

  # c) Conservar solo los últimos 7 respaldos
  Get-ChildItem -Path $backupDir -Filter 'postgres-*.sql' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 7 |
    ForEach-Object {
      Write-Host "Rotando respaldo antiguo de PostgreSQL: $($_.Name)" -ForegroundColor DarkGray
      Remove-Item $_.FullName -Force
    }

  Get-ChildItem -Path $backupDir -Filter 'redis-*.rdb' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 7 |
    ForEach-Object {
      Write-Host "Rotando respaldo antiguo de Redis: $($_.Name)" -ForegroundColor DarkGray
      Remove-Item $_.FullName -Force
    }

  # d) Mensaje de éxito
  Write-Host "EXITO: Respaldos generados y rotados correctamente en $backupDir" -ForegroundColor Cyan
} catch {
  Write-Error "ERROR en el proceso de respaldo: $_"
  exit 1
}
