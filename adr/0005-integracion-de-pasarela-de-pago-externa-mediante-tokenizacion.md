# 5. Integración de Pasarela de Pago Externa mediante Tokenización

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura ShopHero
* **NFRs Relacionados**: NFR-05 (Seguridad y Cumplimiento PCI-DSS)

## Contexto y Problema

Para completar las compras, la plataforma ShopHero debe procesar pagos con tarjetas de crédito y débito. Almacenar o procesar números de tarjetas de crédito (PAN) directamente en la infraestructura de ShopHero implicaría someter a la organización a rigurosas auditorías PCI-DSS Level 1, elevando dramáticamente los costos de seguridad y el riesgo de filtración de datos sensibles.

## Opciones Consideradas

1. **Opción 1: Procesamiento Directo en Servidores Propios**: Capturar datos de tarjeta y procesarlos mediante librerías internas.
2. **Opción 2: Tokenización y Checkout Delegado mediante Pasarela Externa (Stripe / Wompi / PayU)**: La interfaz Web/Móvil captura los datos de la tarjeta usando iFrames/SDKs seguros de la Pasarela externa, retornando únicamente un *Token de Pago* temporal a ShopHero.

## Decisión Seleccionada

Opción 2: **Tokenización y Checkout Delegado mediante Pasarela de Pago Externa**.

### Justificación

- **Cumplimiento PCI-DSS Out-of-the-Box**: Al no tocar ni almacenar datos sensibles de tarjetas en las bases de datos de ShopHero, se reduce el alcance de auditoría PCI-DSS a la categoría más simple (SAQ A).
- **Seguridad Garantizada**: En caso de un compromiso de seguridad en la base de datos de ShopHero, ningún dato financiero de los clientes resultará expuesto.
- **Soporte Multimedio de Pago**: Facilita agregar nuevos métodos de pago (Tarjetas, PSE, Nequi, Daviplata, Apple Pay) mantenidos directamente por la pasarela.

## Consecuencias

### Positivas
- Máxima seguridad de datos financieros.
- Reducción drástica de costos de certificación de seguridad.
- Delegación de la responsabilidad de la detección de fraudes a la pasarela externa.

### Negativas / Riesgos
- Dependencia de un proveedor externo (pasarela) durante el momento crítico de cobro.
- Pago de comisiones por transacción a la pasarela externa.
