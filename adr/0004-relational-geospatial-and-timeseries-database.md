# 4. Selección de Base de Datos Relacional, Geoespacial y de Series Temporales

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura AgroData

## Contexto y Problema

La plataforma AgroData requiere gestionar dos tipos de datos altamente especializados junto con los datos relacionales tradicionales (usuarios, fincas, labores agrícolas):
1. **Datos Geoespaciales (GIS)**: Polígonos de lotes, delimitación de parcelas, capas de mapas y zonas de cultivo.
2. **Datos de Series Temporales (IoT Telemetry)**: Flujo continuo de lectura de sensores de campo (humedad de suelo, temperatura, pluviometría) que generan millones de registros continuos en el tiempo.

Se requiere determinar la estrategia de almacenamiento de datos que garantice rendimiento, integridad espacial y eficiencia en consultas de series de tiempo.

## Opciones Consideradas

1. **Bases de datos independientes especializadas (Polyglot Persistence pura)**:
   - PostgreSQL para datos relacionales.
   - MongoDB / GeoJSON para geometrías.
   - InfluxDB para telemetría de sensores.
2. **Base de Datos Unificada Extensible**:
   - **PostgreSQL con extensiones PostGIS** (para datos relacionales y espaciales/GIS) y **TimescaleDB** (para series temporales continuas de sensores IoT).

## Decisión Seleccionada

Opción 2: **PostgreSQL con extensión PostGIS para datos GIS y extensión TimescaleDB para telemetría IoT**.

### Justificación

- **Consultas unificadas y compuestas**: Permite realizar consultas analíticas complejas que combinan polígonos agrícolas (PostGIS) con lecturas históricas de sensores (TimescaleDB) usando SQL estándar sin sobrecostos de integración entre motores de bases de datos distintos.
- **Rendimiento de series temporales**: TimescaleDB convierte las tablas relacionales de lecturas en *Hypertables*, ofreciendo compresión nativa de hasta 90% y consultas de agregación temporal altamente optimizadas.
- **Madurez e Integración GIS**: PostGIS es el estándar de la industria para sistemas de información geográfica (GIS), soportando proyecciones, cálculos de área, intersecciones de lotes e índices espaciales (GIST/SP-GIST).
- **Reducción de Complejidad Operativa**: Mantiene una sola pila de motor de base de datos (PostgreSQL), simplificando backups, alta disponibilidad y mantenimiento.

## Consecuencias

### Positivas
- Simplificación de la arquitectura de datos al evitar la gestión de múltiples clústeres de bases de datos heterogéneas.
- Soporte completo para consultas SQL compuestas (espacio-temporales).
- Excelente capacidad de compresión y retención automática de datos de telemetría.

### Negativas / Riesgos
- Requiere ajustar la configuración de memoria y almacenamiento de PostgreSQL para balancear cargas escritas de IoT y cargas de lectura GIS.
