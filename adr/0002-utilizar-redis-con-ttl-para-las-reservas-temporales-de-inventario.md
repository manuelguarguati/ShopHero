# ADR-002 — Utilizar Redis con TTL para las Reservas Temporales de Inventario

* **Estado**: Aceptado.
* **NFR Relacionados**: Desempeño, Escalabilidad y Consistencia del Inventario.

## Contexto

Miles de clientes pueden intentar agregar simultáneamente el mismo producto al carrito. Reservar directamente el inventario mediante bloqueos prolongados en PostgreSQL puede generar congestión y afectar el rendimiento. Además, algunos clientes pueden abandonar el carrito sin terminar la compra, generando *reservas fantasma*.

## Decisión

Se decide utilizar **Redis Cluster** para manejar las reservas temporales. Cada reserva tendrá un **TTL de 5 minutos**.

- Si el cliente completa el checkout, la reserva se confirma.
- Si el cliente no compra antes de finalizar el TTL, Redis eliminará la reserva y el producto volverá a estar disponible automáticamente.

## Consecuencias

### Positivas
- Reservas extremadamente rápidas.
- Reduce bloqueos en PostgreSQL.
- Las reservas abandonadas desaparecen automáticamente.
- Permite escalar horizontalmente.

### Negativas
- Redis se convierte en un componente crítico.
- Debe existir alta disponibilidad del clúster.
- Es necesario sincronizar correctamente Redis con el inventario definitivo.
