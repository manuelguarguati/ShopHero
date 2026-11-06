# ADR-008 — Utilizar Vault para entregar secretos de desarrollo

* **Estado**: Aceptado.
* **NFR Relacionados**: Seguridad, Disponibilidad y Mantenibilidad.

## Contexto

Los servicios necesitan secretos de JWT y Redis. Incluir credenciales en el código, Compose o las imágenes aumenta el riesgo de divulgación y hace más difícil su rotación.

## Decisión

Se decide utilizar **HashiCorp Vault en modo dev** para el entorno local. El script de inicialización crea secretos aleatorios locales, los registra en Vault y provisiona un token de lectura para Vault Agent. Agent los renderiza en un volumen compartido; las aplicaciones leen archivos y Redis exige contraseña. Los archivos locales quedan fuera de Git.

El modo dev no es apropiado para producción: no brinda almacenamiento durable, sellado, alta disponibilidad ni una política operacional de rotación.

## Consecuencias

### Positivas
- Las aplicaciones no necesitan credenciales embebidas en imágenes.
- Los secretos locales se generan por entorno y se entregan mediante archivos montados.
- El acceso de Vault Agent se limita a los paths de lectura necesarios.

### Negativas
- Aumenta la complejidad de inicio local y añade Vault Agent.
- Reiniciar el servidor dev puede requerir volver a provisionar los secretos.
- Producción requiere Vault configurado con TLS, backend durable, autenticación de workload, auditoría y recuperación.
