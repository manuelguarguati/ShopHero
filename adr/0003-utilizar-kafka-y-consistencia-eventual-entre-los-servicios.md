# ADR-003 — Utilizar Kafka y Consistencia Eventual entre los Servicios

* **Estado**: Aceptado.
* **NFR Relacionados**: Escalabilidad, Disponibilidad y Consistencia.

## Contexto

ShopHero necesita actualizar diferentes partes del sistema cuando ocurre una compra, reserva o modificación de inventario. Realizar todas estas operaciones de manera síncrona haría que cada servicio dependiera de los demás y aumentaría los tiempos del checkout.

## Decisión

Se decide utilizar **Apache Kafka** como bus de eventos. Se manejarán eventos como:
- `StockUpdated`
- `ReservationCreated`
- `ReservationExpired`
- `ReservationConfirmed`
- `OrderCreated`
- `OrderConfirmed`

Los servicios reaccionarán a estos eventos de manera asíncrona utilizando consistencia eventual.

## Consecuencias

### Positivas
- Reduce el acoplamiento entre servicios.
- Facilita el procesamiento de grandes volúmenes.
- Evita que todos los servicios tengan que responder al mismo tiempo.
- Mejora la escalabilidad.

### Negativas
- La información no siempre se actualiza instantáneamente.
- Los eventos pueden llegar repetidos.
- Los consumidores deben ser idempotentes.
- Kafka aumenta la complejidad operativa.
