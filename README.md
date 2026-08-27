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
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-relational-geospatial-and-timeseries-database.md
│   └── 0003-event-driven-architecture-for-iot-telemetry.md
├── docs/                                 # Documentación del Sistema
│   └── nfr.md                            # Requerimientos No Funcionales (NFRs)
└── README.md                             # Documento Principal
```

---

## 🏛️ Modelo C4 (`c4/`)

- **Contexto ([c4/context.dsl](c4/context.dsl))**: Define los límites del sistema AgroData, los actores (*Agricultor*, *Agrónomo*, *Administrador de Sistema*) y las integraciones con sistemas externos (*Sensores IoT*, *APIs de Clima* y *Servicios Satelitales*).
- **Contenedores ([c4/containers.dsl](c4/containers.dsl))**: Modela los contenedores de software ejecutables (*SPA Web React*, *App Móvil Flutter*, *API Gateway*, *Microservicios*, *PostgreSQL con PostGIS & TimescaleDB*, *RabbitMQ Broker* y *Redis Cache*).

---

## 📜 Registros de Decisiones de Arquitectura (`adr/`)

1. **[ADR 0001: Adopción de Registros de Decisiones de Arquitectura (ADR)](adr/0001-record-architecture-decisions.md)**
2. **[ADR 0002: Selección de Base de Datos Relacional, Geoespacial y de Series Temporales](adr/0002-relational-geospatial-and-timeseries-database.md)**
3. **[ADR 0003: Arquitectura Basada en Eventos para Ingesta de Telemetría IoT](adr/0003-event-driven-architecture-for-iot-telemetry.md)**

---

## 📐 Requerimientos No Funcionales (`docs/`)

- **[NFRs (docs/nfr.md)](docs/nfr.md)**: Especificaciones detalladas de Rendimiento (latencias <200ms API, ingesta 5,000 req/sec IoT), Disponibilidad (SLA 99.9%, modo offline móvil), Escalabilidad, Cifrado (TLS 1.3 / AES-256), Seguridad (OAuth2/RBAC) e Interoperabilidad (GeoJSON, OGC WMS/WFS, OpenAPI v3.0).
