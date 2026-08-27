# 1. Adopción de Registros de Decisiones de Arquitectura (ADR)

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura AgroData

## Contexto y Problema

El desarrollo de la plataforma AgroData involucra múltiples componentes técnicos (gestión de datos GIS, telemetría IoT de alta frecuencia, analítica e integraciones externas). A medida que el sistema evoluciona, es fundamental documentar de forma clara y auditable las razones y el contexto detrás de las decisiones de arquitectura de software para evitar la pérdida de conocimiento técnico y mantener la coherencia técnica del proyecto a largo plazo.

## Opciones Consideradas

1. **Documentos formales en procesador de texto (Word/PDF)** almacenados en repositorios documentales externos.
2. **Wiki de proyecto** (ej. Confluence/GitHub Wiki).
3. **Architecture Decision Records (ADRs) en formato Markdown** dentro del mismo repositorio de código fuente (`adr/`).

## Decisión Seleccionada

Opción 3: **Adopción de Architecture Decision Records (ADRs) versionados en el repositorio de código fuente (`adr/`)**.

### Justificación

- **Cercanía al código**: Los desarrolladores y arquitectos leen y mantienen los ADRs junto con el código fuente.
- **Trazabilidad y Historial**: Cada decisión de arquitectura es versionada mediante Git, permitiendo saber exactamente cuándo y por qué se introdujo un cambio estructural.
- **Transparencia en Code Reviews**: Permite discutir y revisar cambios de arquitectura mediante Pull Requests.

## Consecuencias

### Positivas
- Documentación técnica actualizada, ligera y accesible.
- Facilita la incorporación de nuevos desarrolladores al proyecto.
- Historial transparente del diseño de la plataforma.

### Negativas / Riesgos
- Requiere disciplina del equipo para actualizar o crear un ADR ante cualquier cambio significativo en el diseño del sistema.
