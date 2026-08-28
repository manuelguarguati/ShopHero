# 3. Bus de Eventos con Apache Kafka para Procesamiento Asíncrono

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura ShopHero
* **NFRs Relacionados**: NFR-01 (Alta Concurrencia), NFR-02 (Disponibilidad y Resiliencia), NFR-03 (Consistencia Eventual)

## Contexto y Problema

Cuando se confirma una compra, múltiples sistemas secundarios deben reaccionar: actualización del inventario real, sincronización del catálogo público, envío de correos de confirmación, facturación y análisis de datos. Realizar todas estas llamadas de forma síncrona dentro del flujo de Checkout ralentiza la respuesta al cliente y aumenta la probabilidad de fallas encadenadas.

## Opciones Consideradas

1. **Opción 1: Llamadas REST Síncronas (HTTP)**: El servicio de Checkout llama secuencialmente a cada servicio.
2. **Opción 2: Event-Driven Architecture (EDA) con Apache Kafka**: El servicio de Checkout emite el evento `PedidoConfirmado` a un tópico distribuido en Kafka, y los servicios consumidores procesan el evento de forma asíncrona.

## Decisión Seleccionada

Opción 2: **Bus de Eventos distribuido con Apache Kafka**.

### Justificación

- **Desacoplamiento Transaccional**: El flujo de checkout finaliza tan pronto se autoriza el pago y se emite el evento en Kafka, entregando respuesta inmediata al cliente (< 800 ms).
- **Resiliencia y Reintento Automático**: Si el servicio de inventario o facturación está temporalmente sobrecargado, Kafka retiene los mensajes de forma persistente hasta que los consumidores se recuperen.
- **Escalabilidad de Consumidores**: Múltiples instancias de consumidores pueden procesar eventos en paralelo organizados en *Consumer Groups*.

## Consecuencias

### Positivas
- Tiempos de latencia mínimos en el Checkout.
- Alta tolerancia a fallos en servicios no críticos (notificaciones, analítica).
- Garantía de orden de eventos por partición de producto o pedido.

### Negativas / Riesgos
- Introducción de consistencia eventual entre el catálogo y el inventario real.
- Necesidad de gestionar idempotencia en los servicios consumidores para evitar procesar pedidos duplicados.
