# 5 Requerimientos No Funcionales (NFRs) - Proyecto ShopHero

Este documento define los 5 Atributos de Calidad iniciales desarrollados para la plataforma e-commerce de alta concurrencia **ShopHero** como parte del **Taller #1 de Arquitectura de Software**.

---

## 1. NFR-01: Alta Concurrencia y Rendimiento (Performance & Concurrency)

* **Descripción**: La plataforma debe responder eficientemente ante ráfagas extremas de tráfico durante ventas flash y eventos de tipo Black Friday.
* **Métricas**:
  - Soporte comprobado de hasta **50,000 usuarios concurrentes** simultáneos.
  - Tiempo de respuesta del API Gateway y Servicio de Catálogo **< 200 ms** en el percentil 95 (p95) para búsquedas y lecturas de productos.
  - Tiempo de procesamiento del checkout **< 800 ms** desde el envío del pedido hasta la solicitud a la pasarela de pago.

---

## 2. NFR-02: Disponibilidad y Resiliencia (Availability & Fault Tolerance)

* **Descripción**: El sistema debe mantener una operación ininterrumpida durante eventos comerciales críticos, aislando fallos de componentes secundarios.
* **Métricas**:
  - Acuerdo de Nivel de Servicio (**SLA**) de **99.99% de disponibilidad** durante los eventos de venta flash.
  - **Degradación Graciosa (Graceful Degradation)**: Si el índice de búsqueda (OpenSearch) sufre una falla, el sistema debe degradar a consultas básicas de base de datos sin interrumpir el flujo transaccional de carrito y pago.

---

## 3. NFR-03: Consistencia de Datos y Control de Concurrencia (Data Consistency)

* **Descripción**: El sistema debe prevenir el sobrestock (overselling) de productos con alta demanda y bajo inventario mediante reservas temporales eficientes.
* **Métricas**:
  - Las reservas temporales creadas en Redis Cluster deben tener una expiración estricta por **TTL de 10 minutos**. Si el cliente no completa la compra en este lapso, el stock reservado se libera automáticamente de forma atómica.
  - Consistencia eventual garantizada mediante eventos en Apache Kafka en menos de **1.0 segundo** entre la actualización de inventario real y el catálogo público.

---

## 4. NFR-04: Escalabilidad Horizontal (Horizontal Scalability)

* **Descripción**: Los microservicios centrales deben poder adaptarse dinámicamente a las variaciones masivas de carga de trabajo de manera independiente.
* **Métricas**:
  - Capacidad de auto-escalado horizontal de los contenedores de *Checkout*, *Carrito* y *Reservas* en menos de **60 segundos** ante un consumo de CPU superior al 70%.
  - Aplicación de arquitectura CQRS (Command Query Responsibility Segregation) permitiendo que la navegación masiva no impacte el rendimiento de la base de datos de pedidos.

---

## 5. NFR-05: Seguridad y Procesamiento de Pagos (Security & Compliance)

* **Descripción**: Protección estricta de la información personal de los usuarios y cumplimiento de normativas financieras para transacciones bancarias.
* **Métricas**:
  - Cumplimiento **PCI-DSS Level 1**: Ningún dato sensible de tarjeta de crédito (PAN/CVV) debe almacenarse en las bases de datos internas de ShopHero, delegando el cobro y la tokenización a la Pasarela de Pago externa.
  - Autenticación mediante **OAuth 2.0 / JWT** con cifrado en tránsito **TLS 1.3** obligatorio para todas las comunicaciones API.
