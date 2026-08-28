# Análisis de Trade-Offs y Atributos de Calidad - Proyecto ShopHero

Este documento responde de forma directa a la **Sección 4 del Taller #1 (Arquitectura de Software - UNISANGIL)**, analizando los atributos de calidad reflejados en el modelo C4 y los compromisos de arquitectura (*trade-offs*) derivados de los ADRs.

---

## 1. ¿Qué Atributos de Calidad se Reflejan en este Nivel?

En los niveles de **Contenedores (C4 Level 2)** y **Componentes (C4 Level 3)** se reflejan explícitamente los siguientes atributos de calidad clave:

### A. Rendimiento (Performance)
- **C4 Level 2**: La presencia de **Redis Cluster** para el manejo de carritos y reservas en memoria, junto con **OpenSearch** para el catálogo, garantiza latencias de lectura menores a 200 ms sin tocar discos duros de las bases de datos relacionales.
- **C4 Level 3**: El uso de llamadas asíncronas hacia el **Kafka Event Publisher** desacopla la persistencia de pedidos del flujo HTTP principal.

### B. Escalabilidad Horizontal (Scalability)
- **C4 Level 2**: La separación de la plataforma en microservicios independientes (*CatalogService*, *CartService*, *CheckoutService*, *ReservationService*, *InventoryService*) permite escalar únicamente aquellos contenedores que sufren cuellos de botella durante eventos Flash Sale.
- **C4 Level 3**: El componente **Inventory Lock Manager** permite escalar múltiples réplicas del *Reservation Service* sin generar conflictos de stock.

### C. Disponibilidad y Tolerancia a Fallos (Availability & Fault Tolerance)
- **C4 Level 2**: El **Bus de Eventos (Apache Kafka)** actúa como un amortiguador (*buffer*) que almacena eventos de pedidos confirmados. Si el servicio de inventario sufre una inactividad temporal, los mensajes no se pierden y se procesan al restablecer el servicio.

### D. Consistencia y Prevención de Sobrevendedor (Data Integrity / Concurrency Control)
- **C4 Level 2 & 3**: El **Servicio de Reservas** combinado con **Redis TTL (10 min)** asegura el control de concurrencia atómico para productos en promoción sin bloquear la base de datos de compras.

### E. Seguridad y Cumplimiento (Security & Compliance)
- **C4 Level 2 & 3**: La interacción delegada desde el **Payment Gateway Client** hacia la **Pasarela de Pago externa** garantiza el aislamiento de datos financieros bajo el estándar PCI-DSS.

---

## 2. ¿Qué Trade-Offs Surgieron en las Decisiones Documentadas en ADRs?

A continuación se detallan los compromisos o balanzas de diseño (*Trade-Offs*) asumidos en cada uno de los 5 ADRs del proyecto:

| ADR | Decisión Tomada | Atributo Favorecido (+) | Atributo Comprometido (-) | Análisis del Trade-Off |
|---|---|---|---|---|
| **ADR-001** | Microservicios Desacoplados | Escalabilidad y Mantenibilidad | Complejidad Operativa y Costos | Se acepta una mayor complejidad de infraestructura (API Gateway, despliegues distribuibles) a cambio de garantizar que el sistema no se caiga totalmente en Black Friday. |
| **ADR-002** | Reservas en Memoria con Redis TTL | Rendimiento y Prevención de Sobreventa | Consumo de RAM y Complejidad de Volatilidad | Se prefiere usar memoria RAM costosa y manejar expiración por TTL antes que permitir bloqueos relacionales que colapsen PostgreSQL. |
| **ADR-003** | Bus de Eventos con Apache Kafka | Latencia de Checkout y Resiliencia | Consistencia Inmediata (Consistencia Eventual) | El cliente recibe confirmación de compra inmediata (<800ms), pero los reportes de inventario se sincronizan milisegundos después de forma asíncrona. |
| **ADR-004** | Desacoplamiento de Búsqueda con OpenSearch | Velocidad de Búsqueda (<50ms) | Redundancia de Datos y Sincronización | Se duplica la información del catálogo en OpenSearch para ofrecer filtros ultra-rápidos, aceptando un pequeño desfase en la actualización de precios/stock. |
| **ADR-005** | Pasarela de Pago Externa (Tokenización) | Seguridad (PCI-DSS) y Simplicidad de Cumplimiento | Dependencia de Terceros y Costos por Comisión | Se delega el cobro a un proveedor externo pagando una comisión por transacción a cambio de no asumir riesgos legales y financieros de manejar tarjetas de crédito. |
