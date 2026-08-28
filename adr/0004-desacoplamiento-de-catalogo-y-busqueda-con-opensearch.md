# 4. Desacoplamiento del Catálogo de Productos y Búsqueda con OpenSearch

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura ShopHero
* **NFRs Relacionados**: NFR-01 (Rendimiento), NFR-04 (Escalabilidad Horizontal)

## Contexto y Problema

Durante el Black Friday, más del 90% del tráfico corresponde a usuarios navegando, filtrando y buscando productos en el catálogo, mientras que solo un 10% realiza compras. Realizar búsquedas complejas con filtros dinámicos (categoría, precio, descuento, marcas) sobre una base de datos relacional (PostgreSQL) satura las lecturas de disco e impide escalar eficientemente.

## Opciones Consideradas

1. **Opción 1: Consultas Directas a PostgreSQL**: Ejecutar `LIKE` y filtros dinámicos en la base de datos SQL.
2. **Opción 2: Separación de Lectura con Motor de Búsqueda Dedicado (OpenSearch / Elasticsearch)**: Indexar el catálogo en OpenSearch para búsquedas avanzadas en memoria y filtros en tiempo real, manteniendo PostgreSQL como la fuente de verdad del catálogo.

## Decisión Seleccionada

Opción 2: **Desacoplamiento de Búsquedas mediante OpenSearch / Elasticsearch**.

### Justificación

- **Búsquedas Ultra-rápidas**: OpenSearch utiliza índices invertidos optimizados en memoria, respondiendo consultas complejas en **< 50 ms**.
- **Aislamiento de Cargas de Trabajo (Pattern CQRS)**: La navegación masiva de usuarios no consume recursos de la base de datos relacional de inventario ni de pedidos.
- **Sincronización Asíncrona**: Cuando un precio o existencias cambian, se emite un evento en Kafka que actualiza el índice en OpenSearch en segundo plano.

## Consecuencias

### Positivas
- Cumplimiento estricto del tiempo de respuesta < 200ms en navegación.
- Excelente experiencia de usuario con autocompletado y búsqueda difusa (*fuzzy search*).
- Reducción del 90% de la carga de lectura en las bases de datos relacionales.

### Negativas / Riesgos
- Duplicación de datos entre PostgreSQL y el índice de OpenSearch.
- Desfase temporal de pocos milisegundos en la actualización del catálogo de búsqueda.
