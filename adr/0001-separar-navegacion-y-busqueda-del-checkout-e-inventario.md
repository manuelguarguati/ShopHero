# ADR-001 — Separar Navegación y Búsqueda del Proceso de Checkout e Inventario

* **Estado**: Aceptado.
* **NFR Relacionados**: Escalabilidad, Desempeño y Disponibilidad.

## Contexto

Durante eventos como Black Friday, cientos de miles de usuarios pueden estar navegando y buscando productos mientras una cantidad menor está realizando compras. Si las consultas de catálogo y búsqueda utilizan directamente la misma base de datos que controla el inventario y los pedidos, el elevado número de consultas puede afectar las operaciones críticas de compra.

## Decisión

Se decide separar la arquitectura en servicios independientes:
- Servicio de Catálogo y Búsqueda.
- Servicio de Carrito.
- Servicio de Checkout.
- Servicio de Inventario.
- Servicio de Reservas.

La navegación y búsqueda utilizarán un índice optimizado como **OpenSearch / Elasticsearch**, evitando consultar continuamente la base de datos transaccional.

## Consecuencias

### Positivas
- Reduce la carga sobre la base de datos transaccional.
- Permite escalar búsqueda independientemente.
- Mejora los tiempos de respuesta.
- Un pico de búsquedas no bloquea directamente el checkout.

### Negativas
- Aumenta la cantidad de servicios.
- Es necesario sincronizar el índice de búsqueda.
- Puede existir un pequeño retraso entre el inventario real y el mostrado en catálogo.
