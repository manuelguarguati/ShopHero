# Revisión OWASP API Security Top 10

Revisión estática y pruebas del estado de esta fase; no constituye certificación ni pentest.

| Categoría | Hallazgo y estado |
|---|---|
| API1: Broken Object Level Authorization | **Mitigado en esta fase**: `sub` del JWT debe coincidir con `usuarioId`; `admin` puede operar otros carritos. Las pruebas verifican la denegación cruzada. |
| API2: Broken Authentication | **Mitigado parcialmente**: `jose` valida firma, algoritmo, `exp`, `iss` y `aud`; las rutas de negocio exigen Bearer JWT. El emisor de desarrollo es local y no ofrece revocación/gestión completa de sesiones. |
| API3: Broken Object Property Level Authorization | Los endpoints retornan campos de producto definidos por el servicio y carrito no acepta propiedades de usuario como permisos. El alta de producto debe endurecerse para validar tipos y rangos completos de `nombre` y `precio`. |
| API4: Unrestricted Resource Consumption | **Mitigado parcialmente**: NGINX limita a 100 solicitudes/s por IP y 50 de ráfaga; la llamada externa tiene timeout, reintentos acotados y capacidad 20. Falta un límite de tasa por usuario/tenant y pruebas de carga representativas. |
| API5: Broken Function Level Authorization | **Mitigado en rutas presentes**: scopes separados para lectura/escritura de carrito y productos; el acceso admin es explícito. Los endpoints futuros deben definir scopes antes de exponerse. |
| API6: Unrestricted Access to Sensitive Business Flows | Se valida existencia de producto antes de persistir. **Riesgo residual**: no hay inventario/reserva ni checkout implementados; agregar al carrito no garantiza stock ni evita abuso comercial automatizado. |
| API7: Server Side Request Forgery | La URL del servicio de productos proviene de configuración de despliegue, no de entrada del usuario. Debe restringirse a servicios internos en entornos productivos. |
| API8: Security Misconfiguration | **Riesgo residual local**: Vault se ejecuta en modo dev, HTTP sin TLS y Grafana permite Viewer anónimo detrás del Gateway. No desplegar esta configuración de desarrollo en producción. |
| API9: Improper Inventory Management | El repositorio documenta únicamente los endpoints implementados; es necesario mantener inventario de versiones, rutas, scopes y componentes. CI escanea imágenes con Trivy. |
| API10: Unsafe Consumption of APIs | **Mitigado parcialmente**: carrito consume un endpoint HTTP interno, exige token de servicio, maneja timeout y estado HTTP, reintenta solo errores transitorios y valida el 404. Respuestas JSON del proveedor requieren validación de esquema más estricta antes de producción. |

### Prioridades pendientes antes de producción

1. Sustituir el emisor local por un IdP OIDC y definir rotación/revocación de claves.
2. Configurar TLS, Vault durable/HA, Grafana autenticado y rate limit por identidad.
3. Endurecer validación de campos de productos, respuesta JSON del proveedor y límites de request.
4. Implementar reservas/checkout para validar disponibilidad real sin tratar el carrito como reserva.
5. Ejecutar pentest y pruebas distribuidas de latencia, saturación, recuperación y disponibilidad.
