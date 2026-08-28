# ADR-004 — Utilizar Redis Cluster para Carritos Persistentes

* **Estado**: Aceptado.
* **NFR Relacionados**: Persistencia, Desempeño y Disponibilidad.

## Contexto

El caso ShopHero exige carritos persistentes. El carrito no puede depender únicamente de la memoria del servidor web porque, si el usuario cambia de servidor o una instancia falla, perdería los productos seleccionados.

## Decisión

Se decide utilizar **Redis Cluster** como almacenamiento de los carritos activos. Cada carrito estará asociado al identificador del usuario y podrá recuperarse desde cualquier instancia de la aplicación. Se habilitarán mecanismos de persistencia de Redis para reducir el riesgo de pérdida de información.

## Consecuencias

### Positivas
- Acceso rápido al carrito.
- El carrito no depende de una instancia específica.
- Facilita el escalamiento horizontal.
- Permite recuperar el carrito después de una reconexión.

### Negativas
- Requiere administrar un clúster Redis.
- Aumenta el consumo de memoria.
- Se deben configurar correctamente replicación y persistencia.
