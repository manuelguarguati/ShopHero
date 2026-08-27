# 2. Uso de una Arquitectura Modular para los Servicios Principales

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Carlos Galvis / Andrés Reyes / Manuel Guarguati
* **NFRs Relacionados**: Escalabilidad, Disponibilidad, Mantenibilidad

## Contexto y Problema

La plataforma requiere atender múltiples usuarios y permitir que sus servicios principales funcionen de manera coordinada. También debe facilitar el crecimiento del sistema y la incorporación de nuevas funcionalidades sin afectar toda la solución.

## Opciones Analizadas

1. **Opción 1: Arquitectura Monolítica**
   - Construir todas las funcionalidades dentro de una única aplicación.
2. **Opción 2: Microservicios / Servicios Independientes**
   - Separar las funcionalidades principales en componentes independientes que se comuniquen mediante mecanismos definidos.

## Decisión

Se decide utilizar una **arquitectura modular basada en servicios independientes** para organizar las funciones principales de la plataforma.

Esta decisión permite que cada componente pueda crecer o ajustarse según sus necesidades, sin depender completamente del resto del sistema. Además, mejora la mantenibilidad porque facilita realizar cambios, pruebas y actualizaciones de manera más controlada.

## Consecuencias

### Positivas
- **Mayor escalabilidad**: Permite atender grandes cantidades de usuarios.
- **Evolución continua**: Facilita agregar nuevas funcionalidades.
- **Escalado independiente**: Los servicios pueden escalar de forma independiente según la demanda.
- **Aislamiento de fallas**: Una falla en un servicio puede aislarse mejor y evitar afectar completamente la plataforma.

### Negativas / Riesgos
- **Complejidad operativa**: Aumenta la complejidad en la administración de la infraestructura.
- **Gestión de servicios**: Requiere administrar y coordinar varios servicios independientes.
- **Costos de infraestructura**: Puede incrementar los costos operativos en la nube.
- **Monitoreo avanzado**: Se necesita monitoreo distribuido para detectar problemas entre los diferentes servicios.
