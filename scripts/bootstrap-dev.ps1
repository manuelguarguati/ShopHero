$ErrorActionPreference = 'Stop'

$secretDirectory = Join-Path $PSScriptRoot '..\.dev-secrets'
New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
$agentTokenPath = Join-Path $secretDirectory 'vault-agent-token'
if (-not (Test-Path $agentTokenPath)) {
  New-Item -ItemType File -Path $agentTokenPath | Out-Null
}

docker compose up -d vault
if ($LASTEXITCODE -ne 0) {
  throw 'No se pudo iniciar Vault en modo de desarrollo.'
}

$rootToken = $null
for ($attempt = 0; $attempt -lt 30 -and -not $rootToken; $attempt++) {
  $vaultLogs = docker compose logs --no-color vault
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudieron leer los logs de inicio de Vault.'
  }
  $tokenMatch = [regex]::Matches(($vaultLogs -join "`n"), 'Root Token:\s*(\S+)') | Select-Object -Last 1
  if ($tokenMatch) {
    $rootToken = $tokenMatch.Groups[1].Value
  } else {
    Start-Sleep -Seconds 2
  }
}
if (-not $rootToken) {
  throw 'Vault no publicó su token efímero de desarrollo.'
}

function Invoke-Vault {
  param([string[]]$Arguments)
  docker compose exec -T -e "VAULT_TOKEN=$rootToken" vault vault @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló el comando Vault: vault $($Arguments -join ' ')"
  }
}

$mounts = Invoke-Vault -Arguments @('secrets', 'list', '-format=json') | ConvertFrom-Json
if (-not ($mounts.PSObject.Properties.Name -contains 'secret/')) {
  Invoke-Vault -Arguments @('secrets', 'enable', '-path=secret', 'kv-v2') | Out-Null
}

Invoke-Vault -Arguments @('policy', 'write', 'shophero-agent', '/vault/config/agent-policy.hcl') | Out-Null

$jwtSecretPath = Join-Path $secretDirectory 'jwt-secret'
$redisPasswordPath = Join-Path $secretDirectory 'redis-password'
$postgresPasswordPath = Join-Path $secretDirectory 'postgres-password'

if (-not (Test-Path $jwtSecretPath)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [System.IO.File]::WriteAllText($jwtSecretPath, [Convert]::ToBase64String($bytes))
}
if (-not (Test-Path $redisPasswordPath)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $redisPassword = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
  [System.IO.File]::WriteAllText($redisPasswordPath, $redisPassword)
}
if (-not (Test-Path $postgresPasswordPath)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $postgresPassword = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
  [System.IO.File]::WriteAllText($postgresPasswordPath, $postgresPassword)
}

$jwtSecret = [System.IO.File]::ReadAllText($jwtSecretPath).Trim()
$redisPassword = [System.IO.File]::ReadAllText($redisPasswordPath).Trim()
$postgresPassword = [System.IO.File]::ReadAllText($postgresPasswordPath).Trim()

Invoke-Vault -Arguments @('kv', 'put', 'secret/shophero/jwt', "secret=$jwtSecret") | Out-Null
Invoke-Vault -Arguments @('kv', 'put', 'secret/shophero/redis', "password=$redisPassword") | Out-Null
Invoke-Vault -Arguments @('kv', 'put', 'secret/shophero/postgres', "password=$postgresPassword") | Out-Null

$agentTokenJson = Invoke-Vault -Arguments @('token', 'create', '-orphan', '-policy=shophero-agent', '-ttl=24h', '-format=json')
$agentToken = ($agentTokenJson | ConvertFrom-Json).auth.client_token
if (-not $agentToken) {
  throw 'Vault no generó un token de lectura para Vault Agent.'
}
[System.IO.File]::WriteAllText($agentTokenPath, $agentToken, [System.Text.UTF8Encoding]::new($false))

node (Join-Path $PSScriptRoot 'generate-frontend-tokens.js')

node (Join-Path $PSScriptRoot 'generate-frontend-tokens.js')

docker compose up -d --force-recreate vault-agent
if ($LASTEXITCODE -ne 0) {
  throw 'No se pudo iniciar vault-agent.'
}

docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
  throw 'No se pudo iniciar el stack ShopHero.'
}

docker compose restart gateway
if ($LASTEXITCODE -ne 0) {
  throw 'No se pudo recargar el API Gateway NGINX.'
}

Write-Output 'Vault inicializado; 11 contenedores ShopHero (PostgreSQL, Redis, Vault, microservicios, NGINX y observabilidad) activos.'
