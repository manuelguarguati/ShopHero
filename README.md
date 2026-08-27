# AgroData - Plataforma de Gestión y Analítica Agrícola Inteligente

**AgroData** es una plataforma integral de recolección, procesamiento y analítica de datos agrícolas e IoT (humedad de suelo, microclima, imágenes satelitales) diseñada para optimizar la toma de decisiones de agricultores y agrónomos.

---

## 📁 Estructura del Repositorio

El repositorio está organizado con la siguiente estructura de arquitectura y documentación técnica:

```text
agrodata/
├── c4/                                   # Modelo de Arquitectura C4 (Structurizr DSL)
│   ├── context.dsl                       # Diagrama de Contexto del Sistema
│   └── containers.dsl                    # Diagrama de Contenedores de la Plataforma
├── adr/                                  # Architectural Decision Records (ADRs)
│   ├── ADRs.docx                         # Documento de ADRs (Formato Word)
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-uso-de-una-arquitectura-modular.md
│   ├── 0003-uso-de-una-solucion-de-comunicacion-en-tiempo-real.md
│   ├── 0004-relational-geospatial-and-timeseries-database.md
│   └── 0005-event-driven-architecture-for-iot-telemetry.md
├── docs/                                 # Documentación del Sistema
│   ├── NFRs.docx                         # Documento de Requerimientos No Funcionales (Formato Word)
│   └── nfr.md                            # Especificación de NFRs (Formato Markdown)
└── README.md                             # Documento Principal
```

---

## 🏛️ Modelo C4 (`c4/`)

- **Contexto ([c4/context.dsl](c4/context.dsl))**: Define los límites del sistema AgroData, los actores (*Agricultor*, *Agrónomo*, *Administrador de Sistema*) y las integraciones con sistemas externos (*Sensores IoT*, *APIs de Clima* y *Servicios Satelitales*).
- **Contenedores ([c4/containers.dsl](c4/containers.dsl))**: Modela los contenedores de software ejecutables (*SPA Web React*, *App Móvil Flutter*, *API Gateway*, *Microservicios*, *PostgreSQL con PostGIS & TimescaleDB*, *RabbitMQ Broker* y *Redis Cache*).

---

## 📜 Registros de Decisiones de Arquitectura (`adr/`)

* **Documento Word Original**: [`adr/ADRs.docx`](adr/ADRs.docx)

### Índice de ADRs en Markdown:
1. **[ADR 0001: Adopción de Registros de Decisiones de Arquitectura (ADR)](adr/0001-record-architecture-decisions.md)**
2. **[ADR 0002: Uso de una Arquitectura Modular para los Servicios Principales](adr/0002-uso-de-una-arquitectura-modular.md)**
3. **[ADR 0003: Uso de una Solución de Comunicación en Tiempo Real](adr/0003-uso-de-una-solucion-de-comunicacion-en-tiempo-real.md)**
4. **[ADR 0004: Selección de Base de Datos Relacional, Geoespacial y de Series Temporales](adr/0004-relational-geospatial-and-timeseries-database.md)**
5. **[ADR 0005: Arquitectura Basada en Eventos para Ingesta de Telemetría IoT](adr/0005-event-driven-architecture-for-iot-telemetry.md)**

---

## 📐 Requerimientos No Funcionales (`docs/`)

* **Documento Word Original**: [`docs/NFRs.docx`](docs/NFRs.docx)
* **Especificación Markdown**: **[NFRs (docs/nfr.md)](docs/nfr.md)** (Especificaciones de Rendimiento, SLA 99.9%, modo offline móvil, escalabilidad, cifrado TLS 1.3 / AES-256, OAuth2/RBAC e interoperabilidad).
