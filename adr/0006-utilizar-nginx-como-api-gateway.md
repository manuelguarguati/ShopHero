# ADR-006 — Utilizar NGINX como API Gateway

* **Estado**: Aceptado.
* **NFR Relacionados**: Desempeño, Disponibilidad y Seguridad.

## Contexto

La aplicación tiene dos servicios HTTP y requiere un punto de entrada común para limitar solicitudes y aislar las interfaces internas. Publicar directamente cada servicio y Redis aumenta la superficie expuesta y dificulta aplicar controles uniformes.

## Decisión

Se decide utilizar **NGINX** como API Gateway. En Compose, el puerto `8080` del Gateway es el único puerto publicado; carrito, productos, Redis, Prometheus, Grafana, Collector y Vault permanecen en redes internas. NGINX aplica `limit_req` y enruta las solicitudes HTTP.

## Consecuencias

### Positivas
- Centraliza entrada, enrutamiento y rate limiting.
- Reduce la exposición de servicios y dependencias de datos.
- Permite mantener métricas y herramientas administrativas fuera del acceso directo público.

### Negativas
- El Gateway es un componente adicional que requiere monitoreo y escalado.
- Una mala configuración puede convertirse en punto de falla o cuello de botella.
- El entorno local usa HTTP; TLS y redundancia del Gateway deben configurarse en producción.
