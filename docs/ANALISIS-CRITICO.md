# Análisis crítico — Tríada Cloud-Native

## Patrón del carrito frente a los NFR

Agregar un artículo requiere verificar productos por HTTP antes de modificar Redis. El patrón combina una dependencia síncrona acotada y fallida en forma cerrada con circuit breaker, reintento idempotente limitado, bulkhead por dependencia y caché local de productos validados durante cinco minutos. La caché se usa solo como fallback degradado, se indica al cliente y no sustituye la reserva de inventario. Si no hay producto conocido y vigente, se responde `503` sin alterar el carrito.

La consulta aumenta latencia, por lo que el timeout es 150 ms por intento y el circuito limita la operación total a 500 ms, alineándose con el objetivo de <500 ms para carrito. La navegación/búsqueda mantiene su objetivo independiente de <300 ms. Se debe medir el p95 real con Prometheus antes de ajustar estos límites. La prueba local no demuestra 200.000 usuarios concurrentes.

## Riesgos residuales y compromisos

| Riesgo / trade-off | Decisión y mitigación | Riesgo residual |
|---|---|---|
| Costo y volumen de telemetría | Métricas de ruta, trazas OTLP y logs JSON; Collector local exporta a `debug`. | En producción se deben decidir sampling, cardinalidad, retención y backend. El overhead no está medido para 200k usuarios. |
| Complejidad operativa | Prometheus, Grafana, Collector, Vault Agent, Gateway y dos servicios se ejecutan en Compose. | Más componentes requieren observabilidad, actualizaciones, control de acceso y procedimientos de recuperación. |
| Latencia por JWT y validación síncrona | JWT se valida en cada servicio; `GET` a productos tiene timeout y retry limitado. | Criptografía y red añaden latencia; debe medirse el p95 con carga representativa y capacidad objetivo. |
| Fallback con datos obsoletos | Solo se permite una entrada validada en los últimos cinco minutos; se devuelve `degraded: true`. | Producto o precio puede haber cambiado. La confirmación de stock debe pertenecer al flujo de reserva/checkout, no al carrito. |
| Circuito abierto | `503` sin caché; breaker, capacidad y estado se exponen como métrica. | Umbrales/ventanas iniciales son una configuración de referencia, no calibrada contra Black Friday. |
| Redis standalone vs. Redis Cluster | Se preserva Redis standalone con AOF en el alcance local, sin migrar Redis. | No provee HA ni escalado distribuido del ADR-004; no satisface por sí solo el NFR de 99,95 %. |
| Tokens y secretos en desarrollo | JWT de 15 minutos, secreto generado localmente, Redis autenticado y Vault Agent. | Vault dev es efímero, HTTP y no durable; no usar como servicio productivo. |
| Gateway y perímetro | Un único puerto publicado, límite 100 req/s por IP y 50 de ráfaga. | Rate limit por IP puede agrupar usuarios detrás de NAT; TLS, límites por identidad y HA quedan para producción. |
| CI y dependencias | `npm audit --audit-level=high` y escaneo Trivy de imágenes. | Durante la instalación se reportaron 19 vulnerabilidades moderadas en dependencias transitivas; no se fuerza una actualización mayor automática. |

## Disponibilidad y escalabilidad

La meta de 99,95 % mensual implica aproximadamente 22 minutos de indisponibilidad. Esta implementación local no agrega réplicas HA de Redis/Vault ni redundancia multi-zona del Gateway y no puede demostrar ese SLO. Kubernetes define réplicas de servicios y Gateway, pero Redis se mantiene en una instancia única para respetar el alcance. Terraform es una base para infraestructura y no se ejecuta `apply`.

La carga k6 incluida comprueba la conducta del circuit breaker, fallback y recuperación en el entorno local. No es un benchmark de capacidad de 200.000 usuarios ni una prueba de disponibilidad mensual; esas metas requieren infraestructura, generación de carga distribuida y mediciones de extremo a extremo.
