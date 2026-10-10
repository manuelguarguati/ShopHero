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
├── adr/                                  # Architectural Decision Records (5 ADRs)
│   ├── punto 3 ADRs.docx                 # Documento Word de ADRs (Punto 3)
│   ├── 0001-separar-navegacion-y-busqueda-del-checkout-e-inventario.md
│   ├── 0002-utilizar-redis-con-ttl-para-las-reservas-temporales-de-inventario.md
│   ├── 0003-utilizar-kafka-y-consistencia-eventual-entre-los-servicios.md
│   ├── 0004-utilizar-redis-cluster-para-carritos-persistentes.md
│   └── 0005-utilizar-postgresql-y-patron-transactional-outbox-para-confirmar-pedidos.md
├── docs/                                 # Documentación de Trade-Offs del Proyecto
│   ├── punto 4 Trade-off.docx            # Documento Word de Trade-offs (Punto 4)
│   └── trade-offs.md                     # Análisis de Trade-Offs (Markdown)
├── microservicio-productos/              # Microservicio existente de productos
├── microservicio-carrito/                # Microservicio de carrito (Fase 1)
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

---

## ⚖️ Documentación de Trade-Offs (`docs/`)

- **Punto 4 — Análisis de Trade-Offs**: [`docs/punto 4 Trade-off.docx`](docs/punto%204%20Trade-off.docx) | **[trade-offs.md](docs/trade-offs.md)** (Atributos de Calidad y Matriz de Compromisos de ADRs).

---

## Fase 1: carrito y Redis con Docker Compose

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
