# 3. Arquitectura Basada en Eventos para Ingesta de Telemetría IoT

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Equipo de Arquitectura AgroData

## Contexto y Problema

Las estaciones meteorológicas y sensores de suelo desplegados en los campos agrícolas envían lecturas periódicas y eventos imprevistos (picos de temperatura, ráfagas de viento, caídas repentinas de humedad). Procesar estas lecturas de forma síncrona mediante peticiones HTTP REST directamente hacia la base de datos genera cuellos de botella en la ingesta, alto acoplamiento y riesgo de pérdida de datos ante caídas temporales de la base de datos o de la red celular/LoRaWAN en el campo.

## Opciones Consideradas

1. **Ingesta Síncrona (REST / HTTP Directo a Base de Datos)**:
   - Los sensores o gateways envían HTTP POST al API central, que escribe directamente en la base de datos.
2. **Arquitectura Basada en Eventos (EDA) con Message Broker**:
   - Ingesta liviana mediante protocolo MQTT/HTTPS en un microservicio de ingesta que publica mensajes en un Message Broker (RabbitMQ / Kafka) para procesamiento asíncrono.

## Decisión Seleccionada

Opción 2: **Arquitectura Basada en Eventos (EDA) utilizando MQTT para transmisión en campo y RabbitMQ/Kafka como Message Broker**.

### Justificación

- **Desacoplamiento Operativo**: El microservicio de ingesta recibe los paquetes IoT de baja latencia y los publica de inmediato en el Broker sin esperar operaciones en la base de datos.
- **Resiliencia y Tolerancia a Fallos**: Si la base de datos o el motor de analítica experimentan mantenimiento o sobrecarga, las colas del broker almacenan los mensajes de telemetría de forma segura sin perder datos.
- **Escalabilidad Horizontal**: Múltiples consumidores (Worker de Persistencia, Worker de Notificaciones de Alertas, Engine de Analítica en Tiempo Real) procesan las lecturas de forma independiente y en paralelo.

## Consecuencias

### Positivas
- Alta disponibilidad e ingesta tolerante a fallos.
- Soporte para protocolos ligeros ideales para zonas rurales (MQTT sobre redes móviles/LoRaWAN).
- Facilidad para agregar nuevos procesadores de eventos (ej. módulo de predicción de heladas) sin modificar los servicios existentes.

### Negativas / Riesgos
- Incrementa la complejidad de infraestructura al incorporar un agente de mensajes (Broker).
- Manejo de consistencia eventual al consultar datos recién transmitidos por los sensores.
