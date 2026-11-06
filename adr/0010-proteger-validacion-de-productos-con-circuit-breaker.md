# ADR-010 — Proteger la validación de productos con circuit breaker

* **Estado**: Aceptado.
* **NFR Relacionados**: Desempeño, Disponibilidad y Persistencia del Carrito.

## Contexto

Al agregar un producto, carrito necesita validar su existencia antes de persistir el cambio en Redis. Una falla o latencia alta del servicio de productos no debe mantener indefinidamente solicitudes abiertas ni permitir agregar productos no validados.

## Decisión

Se decide proteger la llamada idempotente `GET` carrito → productos mediante **Opossum**. Se establece un timeout, capacidad máxima por dependencia, retry limitado con backoff/jitter para errores transitorios y circuit breaker con recuperación automática.

Una caché local de productos exitosamente validados, con TTL de cinco minutos, permite un fallback degradado explícitamente marcado. Sin caché válida, la operación falla cerrada con `503` y no modifica Redis. Las respuestas `404` no se reintentan ni se convierten en éxitos.

## Consecuencias

### Positivas
- Limita latencia y concurrencia consumidas por la dependencia.
- Evita reintentos de operaciones no idempotentes.
- Permite continuar de forma degradada solo para productos conocidos recientemente.

### Negativas
- La caché puede aceptar temporalmente un producto cuya información haya cambiado.
- Un fallback no reemplaza la reserva de inventario ni garantiza stock disponible.
- Umbrales demasiado agresivos pueden abrir el circuito en fallas breves; deben ajustarse con métricas de carga real.
