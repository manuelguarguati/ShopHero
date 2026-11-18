$ErrorActionPreference = 'Stop'

$backupDir = Join-Path $PSScriptRoot '..\backups'
if (-not (Test-Path $backupDir)) {
  Write-Error "El directorio de respaldos $backupDir no existe."
  exit 1
}

$latestBackup = Get-ChildItem -Path $backupDir -Filter 'postgres-*.sql' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestBackup) {
  Write-Error "No se encontró ningún archivo de respaldo de PostgreSQL en $backupDir."
  exit 1
}

Write-Host "Restaurando base de datos PostgreSQL desde: $($latestBackup.Name)..." -ForegroundColor Cyan

try {
  cmd.exe /c "docker compose exec -T postgres psql -U shophero -d shophero < `"$($latestBackup.FullName)`""
  if ($LASTEXITCODE -ne 0) {
    throw "Falló la ejecución de psql al restaurar el respaldo."
  }
  Write-Host "EXITO: Base de datos PostgreSQL restaurada correctamente desde $($latestBackup.Name)" -ForegroundColor Green
} catch {
  Write-Error "ERROR al restaurar la base de datos: $_"
  exit 1
}
