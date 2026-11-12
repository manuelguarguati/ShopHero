# ShopHero - Plataforma E-Commerce de Venta Flash / Black Friday
**UNISANGIL – Ingeniería de Sistemas – Arquitectura de Software**  
**Taller # 1: Modelado Visual con C4 + ADRs**

---

## 📁 Estructura del Repositorio

```text
agrodata/
├── c4/                                   # Modelos C4 en Structurizr DSL
│   ├── context.dsl                       # Nivel 1: Diagrama de Contexto de ShopHero
│   ├── containers.dsl                    # Nivel 2: Diagrama de Contenedores de ShopHero
│   └── components.dsl                    # Nivel 3: Diagrama de Componentes (Checkout & Reservas)
├── nfr/                                  # Requerimientos No Funcionales (NFRs)
│   ├── punto 1 NFRs.docx                 # Documento Word de NFRs (Punto 1)
│   └── nfr.md                            # 5 Requerimientos No Funcionales (Markdown)
├── adr/                                  # Architectural Decision Records (10 ADRs)
│   ├── punto 3 ADRs.docx                 # Documento Word de ADRs (Punto 3)
│   ├── 0001-separar-navegacion-y-busqueda-del-checkout-e-inventario.md
│   ├── 0002-utilizar-redis-con-ttl-para-las-reservas-temporales-de-inventario.md
│   ├── 0003-utilizar-kafka-y-consistencia-eventual-entre-los-servicios.md
│   ├── 0004-utilizar-redis-cluster-para-carritos-persistentes.md
│   └── 0005-utilizar-postgresql-y-patron-transactional-outbox-para-confirmar-pedidos.md
├── docs/                                 # Arquitectura Cloud-Native, OWASP y Trade-Offs
│   ├── punto 4 Trade-off.docx            # Documento Word de Trade-offs (Punto 4)
│   └── trade-offs.md                     # Análisis de Trade-Offs (Markdown)
├── microservicio-productos/              # Microservicio de catálogo e inventario (PostgreSQL)
├── microservicio-carrito/                # Microservicio de carrito persistente (Redis + Circuit Breaker)
├── microservicio-pedidos/                # Microservicio de checkout y Transactional Outbox (PostgreSQL)
├── postgres/                             # Esquema SQL e inicialización de PostgreSQL 16
├── nginx/                                # API Gateway NGINX (rate limiting + DNS dinámico)
├── vault/                                # Políticas y plantillas Vault Agent
├── prometheus/ & grafana/ & otel-collector/ # Stack de observabilidad (métricas + trazas)
├── frontend/                             # SPA web conectada al API Gateway
├── compose.yaml                          # Orquestación de los 11 contenedores Docker
└── README.md                             # Documento Principal
```

---

## 🏛️ Modelado Visual C4 (`c4/`)

- **Contexto ([c4/context.dsl](c4/context.dsl))**: Mapea a los actores (*Cliente*, *Administrador*), el sistema principal (*ShopHero*) y el sistema externo (*Pasarela de Pago*).
- **Contenedores ([c4/containers.dsl](c4/containers.dsl))**: Modela los contenedores (*Aplicación Web*, *API Gateway*, *Microservicios de Catálogo, Carrito, Checkout, Reservas e Inventario*, *Bases de Datos PostgreSQL*, *Redis Cluster*, *OpenSearch* y *Apache Kafka*).
- **Componentes ([c4/components.dsl](c4/components.dsl))**: Especificación C4 Nivel 3 para los componentes internos del *Servicio de Checkout* y el *Servicio de Reservas*.

---

## 📐 Requerimientos No Funcionales (`nfr/`)

- **Punto 1 — 5 NFRs Iniciales**: [`nfr/punto 1 NFRs.docx`](nfr/punto%201%20NFRs.docx) | **[nfr.md](nfr/nfr.md)** (Escalabilidad 200k usuarios, Desempeño <300ms, Disponibilidad 99.95%, Consistencia/TTL 5 min, Persistencia Carrito 30 días).

---

## 📜 5 Registros de Decisiones de Arquitectura (`adr/`)

* **Documento Word Original**: [`adr/punto 3 ADRs.docx`](adr/punto%203%20ADRs.docx)

### Índice de ADRs en Markdown:
1. **[ADR-001: Separar Navegación y Búsqueda del Proceso de Checkout e Inventario](adr/0001-separar-navegacion-y-busqueda-del-checkout-e-inventario.md)**
2. **[ADR-002: Utilizar Redis con TTL para las Reservas Temporales de Inventario](adr/0002-utilizar-redis-con-ttl-para-las-reservas-temporales-de-inventario.md)**
3. **[ADR-003: Utilizar Kafka y Consistencia Eventual entre los Servicios](adr/0003-utilizar-kafka-y-consistencia-eventual-entre-los-servicios.md)**
4. **[ADR-004: Utilizar Redis Cluster para Carritos Persistentes](adr/0004-utilizar-redis-cluster-para-carritos-persistentes.md)**
5. **[ADR-005: Utilizar PostgreSQL y Patrón Transactional Outbox para Confirmar Pedidos](adr/0005-utilizar-postgresql-y-patron-transactional-outbox-para-confirmar-pedidos.md)**
6. **[ADR-006: Utilizar NGINX como API Gateway](adr/0006-utilizar-nginx-como-api-gateway.md)**
7. **[ADR-007: Validar JWT y scopes en cada servicio](adr/0007-validar-jwt-y-scopes-en-cada-servicio.md)**
8. **[ADR-008: Utilizar Vault para entregar secretos de desarrollo](adr/0008-utilizar-vault-para-secretos-de-desarrollo.md)**
9. **[ADR-009: Instrumentar servicios con OpenTelemetry y Prometheus](adr/0009-instrumentar-servicios-con-otel-y-prometheus.md)**
10. **[ADR-010: Proteger validación de productos con circuit breaker](adr/0010-proteger-validacion-de-productos-con-circuit-breaker.md)**

---

## ⚖️ Documentación de Trade-Offs (`docs/`)

- **Punto 4 — Análisis de Trade-Offs**: [`docs/punto 4 Trade-off.docx`](docs/punto%204%20Trade-off.docx) | **[trade-offs.md](docs/trade-offs.md)** (Atributos de Calidad y Matriz de Compromisos de ADRs).
- **[Arquitectura Cloud-Native](docs/ARQUITECTURA-CLOUD-NATIVE.md)**: flujo de seguridad, observabilidad y resiliencia.
- **[Análisis crítico](docs/ANALISIS-CRITICO.md)** y **[revisión OWASP API Security](docs/OWASP-API-SECURITY.md)**: trade-offs, riesgos y hallazgos.

---

## Fase 1: carrito y Redis con Docker Compose

> **Nota de evolución:** esta sección describe la implementación inicial de Fase 1. El Compose actual aplica la Etapa Cloud-Native: publica únicamente NGINX en el puerto `8080`, exige JWT en las rutas de negocio y obtiene los secretos desde Vault Agent. Para ejecutar el estado vigente, sigue la sección [Etapa Cloud-Native](#etapa-cloud-native-observabilidad-zero-trust-y-resiliencia); los ejemplos directos a `localhost:3000`/`3001` que siguen corresponden al estado histórico anterior al Gateway.

Esta fase incorpora el microservicio de carrito y Redis al entorno Compose. Desde la raíz del repositorio, con Docker Desktop y Docker Compose instalados, ejecuta:

```bash
docker compose up --build
```

El servicio de productos queda en `http://localhost:3000` y el carrito en `http://localhost:3001`. Redis solo se expone dentro de la red de Compose; sus datos se conservan en el volumen `redis-data`.

Prueba el estado del servicio, consulta un carrito vacío, agrega un producto y vuelve a consultarlo:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/carritos/usuario1
curl -X POST http://localhost:3001/api/carritos/usuario1/productos \
  -H "Content-Type: application/json" \
  -d "{\"productoId\":\"teclado\",\"cantidad\":2}"
curl http://localhost:3001/api/carritos/usuario1
```

Para quitar un producto o vaciar el carrito:

```bash
curl -X DELETE http://localhost:3001/api/carritos/usuario1/productos/teclado
curl -X DELETE http://localhost:3001/api/carritos/usuario1
```

Los carritos se guardan como hashes de Redis y agregar productos renueva un TTL de 30 días. Redis usa AOF para persistencia local. Para ejecutar las pruebas del servicio:

```bash
cd microservicio-carrito
npm ci
npm test
```

Para detener los contenedores sin borrar los datos:

```bash
docker compose down
```

Para eliminar también los datos persistidos en Redis:

```bash
docker compose down --volumes
```

### Redis simple en esta fase

La arquitectura documentada en el ADR-004 propone Redis Cluster. Por el alcance aprobado para esta implementación, esta fase utiliza **una instancia simple de Redis**, no un clúster. Esto simplifica el entorno de desarrollo local, pero no proporciona la alta disponibilidad, tolerancia a fallos ni escalado horizontal de Redis Cluster; por tanto, no debe considerarse una implementación equivalente a ese ADR para producción.

El microservicio existente de productos sigue disponible en [`microservicio-productos/`](microservicio-productos/). Sus endpoints se pueden verificar con:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/productos
```

Consulta el [README del microservicio](microservicio-productos/README.md) para ejecutarlo sin Docker.

## Etapa Cloud-Native: 11 Contenedores, PostgreSQL, Vault, Zero Trust y Resiliencia

La arquitectura actual en [`compose.yaml`](compose.yaml) levanta **11 contenedores Docker independientes**, aislados en dos redes (`gateway-edge` pública en `:8080` y `shophero-internal` marcada `internal: true` sin exposición directa al host) y **3 volúmenes** (`postgres-data`, `redis-data`, `vault-secrets`):

| Contenedor | Imagen / Build | Función principal |
| :--- | :--- | :--- |
| `gateway` | `nginxinc/nginx-unprivileged:1.27-alpine` | API Gateway en `:8080`, SPA estática, rate limiting `100 r/s`, cabeceras de seguridad y DNS dinámico (`127.0.0.11`) |
| `productos` | `./microservicio-productos` | Catálogo, stock y CRUD conectado a PostgreSQL 16 (`GET/POST/PATCH/DELETE /api/productos`) |
| `carrito` | `./microservicio-carrito` | Carritos persistentes en Redis 7 con Circuit Breaker (`opossum`) hacia `productos` |
| `pedidos` | `./microservicio-pedidos` | Checkout ACID en PostgreSQL (`FOR UPDATE`, descuento de stock, tabla `outbox_eventos` ADR-005 y limpieza en Redis) |
| `postgres` | `postgres:16-alpine` | Base de datos relacional (`productos`, `pedidos`, `pedido_items`, `outbox_eventos`) con clave vía Vault |
| `redis` | `redis:7-alpine` | Almacén AOF para carritos (`TTL` 30 días) con clave vía Vault |
| `vault` | `hashicorp/vault:1.18.3` | Gestor central de secretos (`secret/shophero/jwt`, `redis`, `postgres`) |
| `vault-agent` | `hashicorp/vault:1.18.3` | Renderiza secretos en el volumen `/vault/secrets/` |
| `otel-collector` | `otel/opentelemetry-collector-contrib:0.120.0` | Recolector de trazas OpenTelemetry (OTLP/HTTP) |
| `prometheus` | `prom/prometheus:v3.2.1` | Scrapeo de `/metrics` de `productos`, `carrito` y `pedidos` (`/prometheus/`) |
| `grafana` | `grafana/grafana:11.5.2` | Dashboards de observabilidad (`/grafana/`) |

### Levantar los 11 contenedores y generar tokens JWT locales

En PowerShell, desde la raíz del repositorio (con **Docker Desktop** en ejecución):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap-dev.ps1
```

El script inicia Vault dev, genera secretos aleatorios dentro de `.dev-secrets/` (ignorado por Git) para JWT, Redis y PostgreSQL, crea el token de Vault Agent, regenera `frontend/dev-tokens.json` y ejecuta `docker compose up --build -d` recargando el API Gateway. Para verificar los 11 contenedores, redes y volúmenes:

```powershell
docker compose ps
docker network ls
docker volume ls
```

Genera un JWT de 15 minutos para lectura y escritura del carrito:

```powershell
$token = (node .\scripts\create-dev-token.js usuario_1 cart:read cart:write | Out-String).Trim()
```

### Probar el flujo autenticado

```powershell
curl.exe http://localhost:8080/health
curl.exe -H "Authorization: Bearer $token" http://localhost:8080/api/carritos/usuario_1
curl.exe -X POST http://localhost:8080/api/carritos/usuario_1/productos `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"productoId\":\"1\",\"cantidad\":2}"
curl.exe -H "Authorization: Bearer $token" http://localhost:8080/api/carritos/usuario_1
```

El POST valida el producto `1` en el servicio de productos antes de persistirlo en Redis. La API directa de los servicios no está publicada. Sin JWT, las rutas de negocio responden `401`; un scope insuficiente o un usuario distinto responde `403`.

### 🌐 Interfaz Web del Cliente

SPA sin dependencias en tiempo de ejecución (`frontend/`): HTML + JavaScript puro, Tailwind CSS **precompilado** en `frontend/styles.css` y Font Awesome empaquetado en `frontend/vendor/`. Funciona sin internet (útil para exposiciones).

- **Con Docker Compose levantado**: abre [http://localhost:8080/](http://localhost:8080/) (NGINX sirve la interfaz y el API en el mismo origen).
- **Vista previa sin Docker**: `node .\scripts\serve-frontend.js` y abre [http://localhost:5000/](http://localhost:5000/). Si el Gateway responde, se le reenvían `/health` y `/api/*`; si no, la interfaz entra en **modo demo** (datos en memoria, scopes y dueño del carrito simulados; no verifica firma ni expiración) y lo indica en pantalla.

Funcionalidades:

- **Catálogo en PostgreSQL** (`GET /api/productos`) con stock real en base de datos, categorías, búsqueda, orden por precio/nombre y estados de carga/error.
- **Carrito persistente en Redis**: agregar, aumentar, disminuir, eliminar y vaciar. Como el API solo suma cantidades (`POST`, 1..1000) o elimina (`DELETE`), para disminuir la interfaz elimina el artículo y lo vuelve a agregar con la nueva cantidad.
- **Sesiones Zero-Trust**: selector `usuario_1` / `usuario_2` / `admin` con tokens de `frontend/dev-tokens.json`. El panel de la llave muestra los claims (scopes, roles, expiración) y permite pegar un token propio para probar BOLA (OWASP API1). Los errores 401/403/409/429/503 se muestran tal cual: la interfaz nunca simula un éxito.
- **Administración de catálogo** (`POST /api/productos`, `PATCH /api/productos/:id`, `DELETE /api/productos/:id`): habilitado solo para `admin` (`products:write`) para crear productos con stock/categoría, reponer stock (`+10`) o eliminar.
- **Checkout real y Transactional Outbox (ADR-005)**: `POST /api/pedidos/:usuarioId` ejecuta la transacción ACID en PostgreSQL (bloquea filas, valida y descuenta stock, guarda el pedido y registra `PedidoConfirmado` en `outbox_eventos`) y limpia el carrito en Redis. Incluye modal **Pedidos** (`GET /api/pedidos/:usuarioId`, y `/api/outbox` para `admin`).
- **Panel de arquitectura**: estado en vivo de Gateway, `productos` + PostgreSQL, `carrito` + Redis, `pedidos` + Outbox, circuit breaker, prueba de ráfaga HTTP 429 y enlaces directos a **Grafana** (`/grafana/`) y **Prometheus** (`/prometheus/`).

**Tokens de desarrollo.** Los JWT duran 24 h y se firman con el secreto local de `.dev-secrets/`. Si la interfaz avisa que el token venció o falta, regenera los tokens y recarga:

```powershell
node .\scripts\generate-frontend-tokens.js
```

**Estilos.** Solo hace falta recompilar `styles.css` si agregas clases de Tailwind nuevas:

```powershell
cd frontend
npm install
npm run build:css
```

### 🎮 Prototipo Interactivo en Consola

Se incluye una herramienta interactiva para demostrar y verificar en tiempo real todos los componentes del sistema (Zero-Trust, mitigación BOLA, persistencia en Redis, Circuit Breaker Opossum, Rate Limiting y observabilidad):

```powershell
# Menú interactivo con selección de escenarios paso a paso
node .\scripts\demo-interactivo.js

# Modo automatizado (tour completo continuo para exposiciones o entregas)
node .\scripts\demo-interactivo.js --auto
```

### Métricas, dashboard y pruebas

- Dashboards y métricas en vivo vía NGINX: [http://localhost:8080/grafana/](http://localhost:8080/grafana/) y [http://localhost:8080/prometheus/](http://localhost:8080/prometheus/). Grafana tiene rol Viewer anónimo en el entorno local.
- Para inspeccionar targets y trazas por consola:

```powershell
docker compose exec prometheus wget -qO- http://localhost:9090/prometheus/api/v1/targets
docker compose logs --tail 50 otel-collector
```

- Ejecuta las pruebas de los 3 microservicios:

```powershell
Push-Location .\microservicio-productos; npm.cmd ci; npm.cmd test; Pop-Location
Push-Location .\microservicio-carrito; npm.cmd ci; npm.cmd test; Pop-Location
Push-Location .\microservicio-pedidos; npm.cmd ci; npm.cmd test; Pop-Location
```

- Ejecuta el escenario de rate limit. Requiere k6:

```powershell
k6 run -e MODE=rate-limit -e TOKEN=$token .\tests\load\triad.js
```

- Prueba fallback y recuperación del breaker. Primero se llena la caché del carrito; luego se detiene productos mientras k6 comprueba el modo degradado:

```powershell
k6 run -e MODE=prime -e TOKEN=$token .\tests\load\triad.js
docker compose stop productos
k6 run -e MODE=outage -e TOKEN=$token .\tests\load\triad.js
docker compose start productos
Start-Sleep -Seconds 6
k6 run -e MODE=recovery -e TOKEN=$token .\tests\load\triad.js
```

Terraform se valida sin aprovisionar recursos:

```powershell
docker run --rm -v "${PWD}\infra:/workspace" -w /workspace hashicorp/terraform:1.9.8 init -backend=false
docker run --rm -v "${PWD}\infra:/workspace" -w /workspace hashicorp/terraform:1.9.8 validate
```

Para detener el entorno sin borrar el volumen persistente:

```powershell
docker compose down
```

La configuración de Vault en modo dev, JWT local, HTTP y Grafana anónimo es exclusivamente para desarrollo. Las limitaciones respecto a 200.000 usuarios concurrentes, 99,95 % de disponibilidad y Redis standalone se documentan en [docs/ANALISIS-CRITICO.md](docs/ANALISIS-CRITICO.md).
