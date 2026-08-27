# Requerimientos No Funcionales (NFRs) - Plataforma AgroData

Este documento define las cualidades de calidad, restricciones operativas y atributos no funcionales que rigen la arquitectura y la implementación técnica de la plataforma **AgroData**.

---

## 1. Rendimiento y Eficiencia de Recursos (Performance)

* **1.1 Tiempo de Respuesta en Interfaces de Usuario**:
  - El 95% de las solicitudes REST/gRPC a través del API Gateway deben responder en menos de **200 ms** bajo condiciones de carga normal.
  - El renderizado inicial de mapas GIS interactivos y capas de lotes debe completarse en menos de **2.0 segundos**.
* **1.2 Capacidad de Ingesta IoT**:
  - El microservicio de ingesta IoT debe ser capaz de procesar un flujo de al menos **5,000 lecturas por segundo** de sensores distribuidos sin pérdidas de paquetes ni degradación de latencia.
* **1.3 Procesamiento Analítico**:
  - El cálculo de índices de vegetación (NDVI) e integración de imágenes satelitales multiespectrales debe ejecutarse en menos de **5.0 segundos** por lote agrícola.

---

## 2. Disponibilidad y Confiabilidad (Availability & Reliability)

* **2.1 Acuerdo de Nivel de Servicio (SLA)**:
  - La plataforma debe garantizar una disponibilidad del **99.9% (3 naves)** en ambiente de producción (tiempo máximo de inactividad no planificada < 8.76 horas al año).
* **2.2 Operación Móvil Offline (Offline-First)**:
  - La aplicación móvil debe permitir al agricultor registrar labores de campo, tomar fotografías y consultar polígonos de lotes sin conectividad a Internet en zonas rurales.
  - Sincronización automática bidireccional en segundo plano una vez que el dispositivo detecte conectividad a red celular o Wi-Fi.
* **2.3 Recuperación ante Desastres (DRP)**:
  - **RPO (Recovery Point Objective)**: Máximo 1 hora de datos perdidos ante un evento catastrófico.
  - **RTO (Recovery Time Objective)**: Tiempo máximo de restauración total del servicio < 4 horas.
  - Backups automatizados diarios e incrementales cada hora para la base de datos PostgreSQL (PostGIS + TimescaleDB).

---

## 3. Escalabilidad (Scalability)

* **3.1 Escalado Horizontal de Servicios**:
  - Módulos de ingesta IoT, API Gateway y motor de notificaciones deben configurarse con auto-escalado horizontal basado en métricas de CPU (>70%) y longitud de colas de mensajes en el Broker.
* **3.2 Gestión de Series Temporales e Históricos**:
  - La base de datos TimescaleDB debe aplicar políticas automáticas de compresión para lecturas de sensores con antigüedad mayor a 30 días, reduciendo el almacenamiento hasta en un 90%.
  - Retención configurable de datos crudos por 1 año y datos agregados (promedios diarios/horarios) por 5 años.

---

## 4. Seguridad y Privacidad (Security & Compliance)

* **4.1 Autenticación y Autorización**:
  - Implementación de protocolo **OAuth2 / OpenID Connect** utilizando JSON Web Tokens (JWT) firmados con rotación de llaves (RS256).
  - Control de Acceso Basado en Roles (**RBAC**): Perfiles segregados para *Agricultor*, *Agrónomo* y *Administrador de Sistema*.
* **4.2 Cifrado de Datos**:
  - **En Tránsito**: Protocolo TLS 1.3 obligatorio para todas las comunicaciones HTTP/S, gRPC y MQTTs.
  - **En Reposo**: Cifrado de volúmenes de base de datos y respaldos utilizando algoritmo **AES-256**.
* **4.3 Propiedad y Privacidad de Datos Agrícolas**:
  - Cumplimiento con reglamentos de protección de datos personales (GDPR / normativas locales).
  - Aislamiento lógico estricto por cliente/finca (Multi-tenancy isolation), garantizando que los datos de rendimiento y delimitación de lotes de un agricultor sean inaccesibles para terceros.

---

## 5. Mantenibilidad y Observabilidad (Maintainability & Observability)

* **5.1 Trazabilidad de Arquitectura**:
  - Todos los modelos conceptuales y de contenedores deben mantenerse en código mediante el estándar **C4 Model (Structurizr DSL)** en la carpeta `c4/`.
  - Cambios significativos de diseño deben documentarse mediante ADRs en la carpeta `adr/`.
* **5.2 Monitoreo y Telemetría Centralizada**:
  - Exportación de métricas mediante Prometheus y visualización de tableros de salud en Grafana.
  - Logs estructurados en formato JSON agregados de forma centralizada.
  - Rastreo distribuido de peticiones mediante **OpenTelemetry**.

---

## 6. Interoperabilidad y Estándares (Interoperability)

* **6.1 Estándares Agrícolas y GIS**:
  - Exportación e importación de polígonos de campos compatibles con formatos **GeoJSON**, **KML** y **Shapefile**.
  - Cumplimiento de estándares de Open Geospatial Consortium (**OGC WMS/WFS**) para capas de mapas.
* **6.2 Documentación de APIs**:
  - Exposición de APIs REST documentadas bajo la especificación **OpenAPI v3.0 (Swagger)**.
