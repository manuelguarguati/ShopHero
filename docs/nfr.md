# Requerimientos No Funcionales (NFRs) - ShopHero

**Taller en clase: Punto 1 NFRs**

Este documento define los 5 Atributos de Calidad iniciales desarrollados para la plataforma e-commerce de alta concurrencia **ShopHero**.

---

## NFR-01 — Escalabilidad

* **Requerimiento**: ShopHero debe soportar hasta **200.000 usuarios concurrentes** durante eventos de venta flash o Black Friday sin que el sistema deje de prestar sus servicios principales.
* **Medida**: Las pruebas de carga deberán demostrar que la plataforma puede atender 200.000 usuarios concurrentes manteniendo disponibles la navegación, búsqueda, carrito y proceso de compra.
* **Justificación**: Durante una venta relámpago cientos de miles de usuarios pueden consultar y comprar los mismos productos prácticamente al mismo tiempo.

---

## NFR-02 — Desempeño

* **Requerimiento**: Las operaciones de navegación y búsqueda deben tener un tiempo de respuesta inferior a **300 ms**, mientras que agregar productos al carrito o solicitar una reserva de inventario debe responder en menos de **500 ms**.
* **Medida**: El percentil 95 (p95) de las solicitudes deberá mantenerse en:
  - **Navegación / Búsqueda**: < 300 ms.
  - **Carrito / Reserva**: < 500 ms.
  - **Checkout**: < 2 segundos, sin contar el tiempo de respuesta de la pasarela de pago.
* **Justificación**: En una venta flash, los retrasos pueden ocasionar abandono de compra y aumentar las solicitudes repetidas.

---

## NFR-03 — Disponibilidad

* **Requerimiento**: ShopHero debe mantener una disponibilidad mínima de **99,95 % mensual**, principalmente para catálogo, carrito, inventario y checkout.
* **Medida**: El tiempo de indisponibilidad mensual no deberá superar aproximadamente **22 minutos**.
* **Justificación**: Una caída durante Black Friday puede impedir miles de ventas en cuestión de minutos.

---

## NFR-04 — Consistencia e Integridad del Inventario

* **Requerimiento**: El sistema debe evitar que dos clientes compren la misma unidad disponible y debe eliminar automáticamente las reservas de inventario que no terminan en una compra.
* **Medida**:
  - Las reservas temporales tendrán un **TTL de 5 minutos**. Al vencer el TTL, el inventario deberá liberarse automáticamente.
  - No deberá confirmarse una compra cuando el inventario disponible sea cero.
  - Los cambios entre servicios deberán propagarse en un máximo aproximado de **5 segundos**.
* **Justificación**: El problema principal de ShopHero son los bloqueos de base de datos y las denominadas *reservas fantasma* cuando muchos usuarios intentan comprar el mismo producto.

---

## NFR-05 — Persistencia del Carrito

* **Requerimiento**: El carrito del usuario debe permanecer disponible aunque el usuario cierre sesión temporalmente, actualice la página o alguno de los servidores de aplicación sea reiniciado.
* **Medida**:
  - El carrito deberá conservarse durante al menos **30 días** o hasta que el usuario complete la compra o lo elimine.
  - La caída de una instancia de aplicación no deberá provocar la pérdida del carrito.
  - El carrito podrá recuperarse desde otra instancia del sistema.
* **Justificación**: ShopHero requiere explícitamente carritos de compra persistentes durante eventos de alta demanda.
