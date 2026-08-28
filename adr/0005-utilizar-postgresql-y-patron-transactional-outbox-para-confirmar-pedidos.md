# ADR-005 — Utilizar PostgreSQL y Patrón Transactional Outbox para Confirmar Pedidos

* **Estado**: Aceptado.
* **NFR Relacionados**: Consistencia, Disponibilidad e Integridad del Inventario.

## Contexto

Al finalizar una compra es necesario registrar *correctamente* el pedido y *posteriormente* informar a los demás servicios que la compra fue confirmada. Existe un problema si el pedido se guarda en PostgreSQL pero el sistema falla antes de publicar el evento en Kafka. En ese caso, el pedido existiría, pero otros servicios podrían no enterarse.

## Decisión

Se decide utilizar **PostgreSQL** como almacenamiento transaccional para pedidos y aplicar el patrón **Transactional Outbox**. Cuando se confirma una compra, dentro de la misma transacción se almacenarán:
1. El pedido.
2. El evento que debe publicarse.

Posteriormente un proceso publicará el evento almacenado hacia Kafka.

## Consecuencias

### Positivas
- Evita perder eventos después de confirmar una compra.
- Mantiene consistencia entre pedidos y eventos.
- No requiere una transacción distribuida entre PostgreSQL y Kafka.
- Facilita la recuperación ante fallos.

### Negativas
- Se necesita implementar un proceso adicional para publicar los eventos.
- Los eventos pueden tener un pequeño retraso.
- Se necesita controlar eventos duplicados.
