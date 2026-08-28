# 1. Adopción de Arquitectura de Microservicios Desacoplados

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura ShopHero
* **NFRs Relacionados**: NFR-01 (Alta Concurrencia y Rendimiento), NFR-04 (Escalabilidad Horizontal)

## Contexto y Problema

ShopHero es una plataforma e-commerce orientada a ventas flash (Black Friday) donde se experimentan incrementos drásticos de tráfico (picos de 50,000 usuarios concurrentes). En una arquitectura monolítica tradicional, el tráfico masivo de consultas al catálogo bloquea la base de datos transaccional e imposibilita procesar compras. Se requiere una arquitectura que permita aislar la lectura del catálogo de las operaciones escritas del proceso de compra.

## Opciones Consideradas

1. **Opción 1: Arquitectura Monolítica con Caching**: Un solo ejecutable centralizado apoyado por caché Redis.
2. **Opción 2: Microservicios Desacoplados por Dominio**: División de la aplicación en microservicios independientes (*CatalogService*, *CartService*, *CheckoutService*, *ReservationService*, *InventoryService*) con sus propias bases de datos y canales de comunicación.

## Decisión Seleccionada

Opción 2: **Arquitectura de Microservicios Desacoplados por Dominio**.

### Justificación

- **Escalabilidad Independiente**: Permite auto-escalar únicamente el servicio de *Checkout* o *Reservas* durante picos de compra sin necesidad de replicar todo el sistema.
- **Aislamiento de Fallos**: Una sobrecarga en la búsqueda de productos no interrumpe el procesamiento de pedidos en curso.
- **Optimización de Almacenamiento**: Cada microservicio utiliza el motor de persistencia adecuado (PostgreSQL para pedidos/inventario, Redis para carritos/reservas, OpenSearch para catálogo).

## Consecuencias

### Positivas
- Cumplimiento de NFR-01 y NFR-04 bajo altas cargas de tráfico.
- Despliegues y mantenibilidad independientes para cada componente.
- Reducción del radio de impacto ante errores.

### Negativas / Riesgos
- Incremento de la complejidad operativa y necesidad de infraestructura distribuida (API Gateway, Service Mesh).
- Gestión de consistencia eventual entre bases de datos desacopladas.
