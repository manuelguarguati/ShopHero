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
├── adr/                                  # Architectural Decision Records (5 ADRs)
│   ├── punto 3 ADRs.docx                 # Documento Word de ADRs (Punto 3)
│   ├── 0001-separar-navegacion-y-busqueda-del-checkout-e-inventario.md
│   ├── 0002-utilizar-redis-con-ttl-para-las-reservas-temporales-de-inventario.md
│   ├── 0003-utilizar-kafka-y-consistencia-eventual-entre-los-servicios.md
│   ├── 0004-utilizar-redis-cluster-para-carritos-persistentes.md
│   └── 0005-utilizar-postgresql-y-patron-transactional-outbox-para-confirmar-pedidos.md
├── docs/                                 # Documentación del Proyecto
│   ├── punto 1 NFRs.docx                 # Documento Word de NFRs (Punto 1)
│   ├── punto 4 Trade-off.docx            # Documento Word de Trade-offs (Punto 4)
│   ├── nfr.md                            # 5 Requerimientos No Funcionales (NFRs en Markdown)
│   └── trade-offs.md                     # Análisis de Trade-Offs (Markdown)
└── README.md                             # Documento Principal
```

---

## 🏛️ Modelado Visual C4 (`c4/`)

- **Contexto ([c4/context.dsl](c4/context.dsl))**: Mapea a los actores (*Cliente*, *Administrador*), el sistema principal (*ShopHero*) y el sistema externo (*Pasarela de Pago*).
- **Contenedores ([c4/containers.dsl](c4/containers.dsl))**: Modela los contenedores (*Aplicación Web*, *API Gateway*, *Microservicios de Catálogo, Carrito, Checkout, Reservas e Inventario*, *Bases de Datos PostgreSQL*, *Redis Cluster*, *OpenSearch* y *Apache Kafka*).
- **Componentes ([c4/components.dsl](c4/components.dsl))**: Especificación C4 Nivel 3 para los componentes internos del *Servicio de Checkout* y el *Servicio de Reservas*.

---

## 📜 5 Registros de Decisiones de Arquitectura (`adr/`)

* **Documento Word Original**: [`adr/punto 3 ADRs.docx`](adr/punto%203%20ADRs.docx)

### Índice de ADRs en Markdown:
1. **[ADR-001: Separar Navegación y Búsqueda del Proceso de Checkout e Inventario](adr/0001-separar-navegacion-y-busqueda-del-checkout-e-inventario.md)**
2. **[ADR-002: Utilizar Redis con TTL para las Reservas Temporales de Inventario](adr/0002-utilizar-redis-con-ttl-para-las-reservas-temporales-de-inventario.md)**
3. **[ADR-003: Utilizar Kafka y Consistencia Eventual entre los Servicios](adr/0003-utilizar-kafka-y-consistencia-eventual-entre-los-servicios.md)**
4. **[ADR-004: Utilizar Redis Cluster para Carritos Persistentes](adr/0004-utilizar-redis-cluster-para-carritos-persistentes.md)**
5. **[ADR-005: Utilizar PostgreSQL y Patrón Transactional Outbox para Confirmar Pedidos](adr/0005-utilizar-postgresql-y-patron-transactional-outbox-para-confirmar-pedidos.md)**

---

## 📐 Documentación Técnica (`docs/`)

- **Punto 1 — 5 NFRs Iniciales**: [`docs/punto 1 NFRs.docx`](docs/punto%201%20NFRs.docx) | **[nfr.md](docs/nfr.md)** (Escalabilidad 200k usuarios, Desempeño <300ms, Disponibilidad 99.95%, Consistencia/TTL 5 min, Persistencia Carrito 30 días).
- **Punto 4 — Análisis de Trade-Offs**: [`docs/punto 4 Trade-off.docx`](docs/punto%204%20Trade-off.docx) | **[trade-offs.md](docs/trade-offs.md)** (Atributos de Calidad y Matriz de Compromisos de ADRs).
