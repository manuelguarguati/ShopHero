# Análisis de Trade-Offs y Atributos de Calidad — ShopHero

**Taller en clase: Punto 4 Trade-off**

---

## 1. ¿Qué Atributos de Calidad se Reflejan en este Nivel?

Los atributos de calidad que se reflejan en la arquitectura de **ShopHero** son:

* **Escalabilidad**: Permite soportar una gran cantidad de usuarios concurrentes durante eventos como Black Friday o ventas flash.
* **Desempeño**: Busca mantener tiempos de respuesta bajos en navegación, búsqueda, carrito, reservas y checkout.
* **Disponibilidad**: Procura que los servicios principales permanezcan activos incluso durante picos de tráfico.
* **Consistencia**: Busca evitar errores de inventario, sobreventas y reservas fantasma.
* **Mantenibilidad**: La separación de servicios permite realizar cambios sin afectar todo el sistema.
* **Persistencia**: Permite conservar carritos, pedidos y reservas aunque ocurra una falla o cambio de servidor.

---

## 2. ¿Qué Trade-Offs Surgieron en las Decisiones Documentadas en ADRs?

Los principales trade-offs identificados son:

1. **Escalabilidad vs Complejidad**: Separar el sistema en varios servicios mejora la escalabilidad, pero aumenta la complejidad de administración y monitoreo.
2. **Desempeño vs Consistencia Inmediata**: Usar Kafka y consistencia eventual mejora el rendimiento, pero algunos datos pueden tardar unos segundos en actualizarse.
3. **Rapidez de Reservas vs Sincronización**: Utilizar Redis con TTL reduce bloqueos y permite reservas rápidas, pero requiere sincronización con el inventario real.
4. **Disponibilidad vs Costo**: Utilizar Redis Cluster mejora la disponibilidad y persistencia, pero aumenta el costo de infraestructura.
5. **Consistencia vs Complejidad de Implementación**: Utilizar PostgreSQL con Transactional Outbox mejora la confiabilidad de los pedidos y eventos, pero requiere lógica adicional y manejo de posibles eventos duplicados.

---

## Conclusión

En conclusión, **ShopHero** prioriza principalmente la **escalabilidad**, el **desempeño** y la **disponibilidad**, aceptando como consecuencia una mayor complejidad técnica, mayores costos de infraestructura y cierto nivel de consistencia eventual en algunas operaciones.
