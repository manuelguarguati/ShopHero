# ADR-009 — Instrumentar servicios con OpenTelemetry y Prometheus

* **Estado**: Aceptado.
* **NFR Relacionados**: Desempeño, Disponibilidad, Escalabilidad y Mantenibilidad.

## Contexto

Los NFR de latencia y disponibilidad necesitan medición operacional. Las llamadas entre carrito, productos y Redis requieren contexto correlacionado para poder identificar degradaciones y fallas.

## Decisión

Se decide exponer métricas Prometheus desde ambos servicios, usar OpenTelemetry Node SDK con propagación W3C y exportar trazas OTLP al Collector. Los logs se emiten en JSON con `pino` y campos de correlación; no registran cabeceras de autenticación. Grafana consume Prometheus y provisiona un dashboard base.

El Collector local usa el exporter `debug`; una plataforma de producción puede exportar hacia un backend de trazas aprobado.

## Consecuencias

### Positivas
- Permite medir p95, errores y recursos del proceso.
- Correlaciona llamadas y logs por `trace_id`/`span_id`.
- Separa la instrumentación del backend final de trazas.

### Negativas
- Métricas, trazas y logs consumen CPU, memoria, almacenamiento y ancho de banda.
- Cardinalidad alta o muestreo inadecuado puede aumentar costos o perder señales.
- Collector y Grafana añaden configuración y operación al entorno.
