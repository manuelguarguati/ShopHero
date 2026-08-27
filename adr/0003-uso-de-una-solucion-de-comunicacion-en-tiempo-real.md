# 3. Uso de una Solución de Comunicación en Tiempo Real para Transmisiones y Clases en Vivo

* **Estado**: Aceptado
* **Fecha**: 2026-08-27
* **Autores**: Carlos Galvis / Andrés Reyes / Manuel Guarguati
* **NFRs Relacionados**: Desempeño, Escalabilidad, Disponibilidad

## Contexto y Problema

La plataforma necesita ofrecer sesiones y transmisiones en tiempo real con una comunicación fluida entre presentadores/docentes y usuarios/estudiantes. Además, debe estar preparada para manejar varias conexiones simultáneas sin afectar la experiencia de los usuarios.

## Opciones Analizadas

1. **Opción 1: Streaming de video tradicional**
   - Utilizar un sistema convencional de transmisión de video, adecuado principalmente para contenido donde los usuarios solamente reciben la transmisión sin interacción.
2. **Opción 2: WebRTC con arquitectura Peer-to-Peer (P2P)**
   - Establecer conexiones directas entre los participantes.
3. **Opción 3: Servidor multimedia SFU (Selective Forwarding Unit) con WebRTC**
   - Utilizar una solución especializada que permita distribuir la comunicación en tiempo real de manera eficiente.

## Decisión

Se decide utilizar **una solución de comunicación en tiempo real apoyada en servidores multimedia especializados (SFU / WebRTC)** para gestionar las sesiones en vivo.

Esta alternativa se selecciona porque permite una interacción más fluida entre los participantes y facilita el manejo de múltiples conexiones simultáneas con baja latencia.

## Consecuencias

### Positivas
- **Baja latencia**: Permite mantener una baja latencia en la transmisión en vivo.
- **Experiencia interactiva**: Mejora la experiencia de interacción entre los participantes.
- **Concurrencia alta**: Permite manejar una mayor cantidad de conexiones simultáneas.
- **Escalabilidad**: Los servidores de streaming pueden escalar horizontalmente según la demanda.

### Negativas / Riesgos
- **Infraestructura compleja**: Requiere una arquitectura multimedia especializada más compleja.
- **Costos de nube**: Puede aumentar los costos de infraestructura y ancho de banda en la nube.
- **Monitoreo constante**: Es necesario realizar monitoreo continuo de la calidad del flujo (QoS/QoE).
- **Alta disponibilidad**: Una falla de un servidor multimedia puede afectar la transmisión en vivo, por lo que se deben implementar mecanismos de failover y alta disponibilidad.
