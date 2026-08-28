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
│   ├── 0001-arquitectura-de-microservicios-desacoplados.md
│   ├── 0002-uso-de-redis-cluster-para-carritos-y-reservas-temporales-con-ttl.md
│   ├── 0003-bus-de-eventos-con-apache-kafka-para-procesamiento-asincrono.md
│   ├── 0004-desacoplamiento-de-catalogo-y-busqueda-con-opensearch.md
│   └── 0005-integracion-de-pasarela-de-pago-externa-mediante-tokenizacion.md
├── docs/                                 # Documentación del Proyecto
│   ├── nfr.md                            # 5 Requerimientos No Funcionales (NFRs)
│   └── trade-offs.md                     # Análisis de Trade-Offs y Atributos de Calidad
└── README.md                             # Documento Principal
```

---

## 🏛️ Modelado Visual C4 (`c4/`)

- **Contexto ([c4/context.dsl](c4/context.dsl))**: Mapea a los actores (*Cliente*, *Administrador*), el sistema principal (*ShopHero*) y el sistema externo (*Pasarela de Pago*).
- **Contenedores ([c4/containers.dsl](c4/containers.dsl))**: Modela los contenedores (*Aplicación Web*, *API Gateway*, *Microservicios de Catálogo, Carrito, Checkout, Reservas e Inventario*, *Bases de Datos PostgreSQL*, *Redis Cluster*, *OpenSearch* y *Apache Kafka*).
- **Componentes ([c4/components.dsl](c4/components.dsl))**: Especificación C4 Nivel 3 para los componentes internos del *Servicio de Checkout* y el *Servicio de Reservas*.

---

## 📜 5 Registros de Decisiones de Arquitectura (`adr/`)

1. **[ADR-0001: Arquitectura de Microservicios Desacoplados](adr/0001-arquitectura-de-microservicios-desacoplados.md)**
2. **[ADR-0002: Uso de Redis Cluster para Carritos y Reservas Temporales con TTL](adr/0002-uso-de-redis-cluster-para-carritos-y-reservas-temporales-con-ttl.md)**
3. **[ADR-0003: Bus de Eventos con Apache Kafka para Procesamiento Asíncrono](adr/0003-bus-de-eventos-con-apache-kafka-para-procesamiento-asincrono.md)**
4. **[ADR-0004: Desacoplamiento del Catálogo de Productos y Búsqueda con OpenSearch](adr/0004-desacoplamiento-de-catalogo-y-busqueda-con-opensearch.md)**
5. **[ADR-0005: Integración de Pasarela de Pago Externa mediante Tokenización](adr/0005-integracion-de-pasarela-de-pago-externa-mediante-tokenizacion.md)**

---

## 📐 Documentación Técnica (`docs/`)

- **[5 NFRs Iniciales (docs/nfr.md)](docs/nfr.md)**: Especificación de Alta Concurrencia (50k usuarios), Disponibilidad (SLA 99.99%), Consistencia de Reservas con Redis TTL, Escalabilidad Horizontal y Seguridad PCI-DSS.
- **[Análisis de Trade-Offs (docs/trade-offs.md)](docs/trade-offs.md)**: Respuesta detallada a las preguntas del Taller #1 sobre atributos de calidad reflejados en C4 y la balanza de compromisos de cada ADR.
