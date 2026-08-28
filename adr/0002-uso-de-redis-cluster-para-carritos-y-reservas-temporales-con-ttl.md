# 2. Uso de Redis Cluster para Carritos Persistentes y Reservas Temporales con TTL

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura ShopHero
* **NFRs Relacionados**: NFR-01 (Alta Concurrencia y Rendimiento), NFR-03 (Consistencia de Datos y Control de Concurrencia)

## Contexto y Problema

Durante un evento de Venta Flash, miles de usuarios intentan comprar los mismos productos con stock limitado de forma simultánea. Realizar bloqueos de filas en bases de datos relacionales (`SELECT FOR UPDATE` en PostgreSQL) destruye el rendimiento y genera bloqueos mutuos (*deadlocks*). Asimismo, los carritos de compras activos generan alta presión de I/O si se guardan en discos tradicionales.

## Opciones Consideradas

1. **Opción 1: Bloqueos Pesimistas en PostgreSQL**: Reservar inventario directamente en la tabla relacional con transacciones bloqueantes.
2. **Opción 2: Reservas en Memoria con Redis Cluster y TTL (Time-To-Live)**: Utilizar estructuras en memoria de Redis con expiración automática mediante TTL de 10 minutos y comandos atómicos (`INCRBY`, `DECRBY`, scripts Lua).

## Decisión Seleccionada

Opción 2: **Uso de Redis Cluster para Carritos y Reservas Temporales con TTL**.

### Justificación

- **Operaciones Atómicas de Alta Velocidad**: Redis procesa operaciones en memoria en tiempos sub-milisegundo (< 2ms), garantizando que las reservas de inventario se verifiquen y descuenten atómicamente sin *race conditions*.
- **Expiración Automática de Stock (TTL)**: Si un usuario agrega un producto al carrito pero no completa el checkout en 10 minutos, la llave en Redis expira automáticamente liberando el stock para otros compradores sin necesidad de tareas programadas (*cron jobs*) pesadas.
- **Reducción de I/O en la Base de Datos Relacional**: La base de datos SQL solo procesa pedidos cuyo pago ya ha sido autorizado.

## Consecuencias

### Positivas
- Prevención total de sobreventa (overselling) de productos estrella.
- Tiempos de respuesta ultra-rápidos en el manejo de carritos.
- Liberación automática e incondicional de inventario abandonado.

### Negativas / Riesgos
- Requisito de alta memoria RAM en el clúster de Redis.
- Necesidad de configurar persistencia (AOF/RDB) o replicación en Redis para mitigar caídas de nodos en memoria.
