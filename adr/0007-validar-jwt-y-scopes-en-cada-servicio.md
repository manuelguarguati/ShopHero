# ADR-007 — Validar JWT y scopes en cada servicio

* **Estado**: Aceptado.
* **NFR Relacionados**: Seguridad, Desempeño y Disponibilidad.

## Contexto

Un Gateway compartido no debe ser la única frontera de autorización: los servicios pueden quedar expuestos por error de configuración o consumirse desde otros procesos. Los carritos además contienen recursos privados ligados a un usuario.

## Decisión

Se decide verificar JWT **en cada servicio** con `jose`, incluyendo firma, algoritmo permitido, `exp`, `iss` y `aud`. Cada ruta de negocio exige scopes explícitos y las operaciones del carrito validan que `sub` coincida con el usuario de la ruta, salvo rol `admin`.

Para desarrollo local se utiliza un script que emite tokens HMAC de corta duración con scopes permitidos. El secreto se obtiene desde Vault Agent. Este emisor local no reemplaza un proveedor OIDC ni el ciclo de vida de identidad de producción; producción debe integrar el IdP corporativo y sus claves rotables.

## Consecuencias

### Positivas
- Las rutas deniegan por defecto y no confían únicamente en el Gateway.
- Se limita el acceso entre usuarios y por función.
- El modo local permite reproducir solicitudes autenticadas sin guardar tokens en el repositorio.

### Negativas
- Validar JWT añade trabajo a cada solicitud y requiere administrar claves/rotación.
- HMAC obliga a compartir un secreto entre servicios; producción puede migrar a claves asimétricas emitidas por OIDC.
- Los tokens emitidos localmente no incluyen revocación ni administración completa de sesiones.
