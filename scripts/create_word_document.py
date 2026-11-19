import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = Document()

    # Configurar márgenes de página
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Colores del tema
    COLOR_PRIMARY = RGBColor(30, 58, 138)     # Azul marino profundo (#1E3A8A)
    COLOR_SECONDARY = RGBColor(14, 116, 144)  # Cyan/Teal oscuro (#0E7490)
    COLOR_TEXT = RGBColor(31, 41, 55)         # Gris oscuro (#1F2937)
    COLOR_MUTED = RGBColor(107, 114, 128)     # Gris medio (#6B7280)
    HEX_HEADER = "1E3A8A"
    HEX_LIGHT_BG = "F3F4F6"
    HEX_CALLOUT_BG = "EFF6FF"
    HEX_CALLOUT_BORDER = "3B82F6"

    # Estilos de texto base
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Segoe UI'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = COLOR_TEXT

    # -------------------------------------------------------------
    # PORTADA / ENCABEZADO PRINCIPAL
    # -------------------------------------------------------------
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("UNISANGIL · FACULTAD DE CIENCIAS NATURALES E INGENIERÍA\nINGENIERÍA DE SISTEMAS")
    r_inst.font.size = Pt(10)
    r_inst.font.bold = True
    r_inst.font.color.rgb = COLOR_MUTED

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(20)
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("SHOPHERO: ARQUITECTURA DE SOFTWARE\nY ADMINISTRACIÓN DE SERVIDORES")
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run("Dossier Técnico Integral, Guion de Diapositivas, Comandos Operativos y Manual de Demostración")
    r_sub.font.size = Pt(12)
    r_sub.font.italic = True
    r_sub.font.color.rgb = COLOR_SECONDARY

    # Caja de metadatos de portada
    table_meta = doc.add_table(rows=4, cols=2)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Materia:", "Arquitectura de Software / Administración de Servidores"),
        ("Proyecto:", "ShopHero Cloud-Native Resilient E-Commerce"),
        ("Ecosistema:", "11 Contenedores Docker, NGINX Gateway, Redis, PostgreSQL, Vault, Prometheus, Grafana, OpenTelemetry"),
        ("Fecha:", "Noviembre de 2026")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = table_meta.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(1.8)
        c1.width = Inches(4.8)
        set_cell_background(c0, "F8FAFC")
        set_cell_background(c1, "F8FAFC")
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(10)
        r0.font.color.rgb = COLOR_PRIMARY
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(10)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 1: GUÍA RÁPIDA DE ENCENDIDO, ENLACES Y SIMULACIÓN
    # -------------------------------------------------------------
    h1 = doc.add_heading("1. Manual Operativo: Encendido, Enlaces y Simulación", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    p = doc.add_paragraph()
    p.add_run("Esta sección resume los comandos esenciales para levantar el ecosistema completo en vivo, acceder a las interfaces y correr la simulación interactiva.")

    # Paso 0
    h2 = doc.add_heading("Paso 0: Iniciar Docker Desktop", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("Asegúrate de que la aplicación Docker Desktop esté abierta en Windows y su icono de la ballena permanezca en verde ('Engine running') antes de ejecutar comandos.")

    # Paso 1
    h2 = doc.add_heading("Paso 1: Comando Único para Encender TODO el Sistema (11 Contenedores)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("Abre una consola de PowerShell en la raíz del proyecto (c:\\Users\\manuel\\Desktop\\proyecto) y ejecuta:")

    # Callout de código
    p_code = doc.add_paragraph()
    p_code.paragraph_format.left_indent = Inches(0.3)
    p_code.paragraph_format.space_before = Pt(4)
    p_code.paragraph_format.space_after = Pt(4)
    r_code = p_code.add_run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\bootstrap-dev.ps1")
    r_code.font.name = 'Consolas'
    r_code.font.size = Pt(10)
    r_code.font.bold = True
    r_code.font.color.rgb = RGBColor(17, 24, 39)

    doc.add_paragraph("¿Qué ejecuta este script en segundo plano?\n"
                      "1. Inicializa HashiCorp Vault en modo de desarrollo local.\n"
                      "2. Genera credenciales criptográficas seguras al vuelo (secreto JWT, contraseñas de Redis y Postgres).\n"
                      "3. Inicia Vault Agent para sincronizar los secretos en volúmenes en memoria RAM (tmpfs).\n"
                      "4. Compila y levanta los 11 contenedores con Docker Compose.\n"
                      "5. Comprueba de forma automática que los 11 servicios estén en estado (healthy).\n"
                      "6. Reinicia el API Gateway NGINX para asegurar la resolución DNS dinámica de los microservicios.")

    doc.add_paragraph("Comando para comprobar el estado de salud de los contenedores:")
    p_code2 = doc.add_paragraph()
    p_code2.paragraph_format.left_indent = Inches(0.3)
    r_code2 = p_code2.add_run("docker compose ps")
    r_code2.font.name = 'Consolas'
    r_code2.font.bold = True

    # Paso 2: Tabla de enlaces
    h2 = doc.add_heading("Paso 2: Enlaces (URLs) del Sistema en el Navegador", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY

    t_links = doc.add_table(rows=6, cols=3)
    t_links.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Componente / Servicio", "URL en el Navegador", "Descripción Operativa"]
    for j, h in enumerate(headers):
        cell = t_links.rows[0].cells[j]
        set_cell_background(cell, HEX_HEADER)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9.5)

    links_data = [
        ("Frontend Tienda Web", "http://localhost:8080", "Catálogo de 14 productos, gestión de carrito y checkout en tiempo real."),
        ("Dashboards en Grafana", "http://localhost:8080/grafana", "Panel de telemetría: latencia p95, throughput, errores 5xx, CPU y RAM."),
        ("Prometheus Metrics", "http://localhost:8080/prometheus/", "Consola de métricas y scraping cada 5 segundos de los microservicios."),
        ("Healthcheck Gateway", "http://localhost:8080/health", "Diagnóstico de conectividad HTTP del API Gateway NGINX."),
        ("API REST Productos", "http://localhost:8080/api/productos", "Endpoint JSON con los 14 productos y stock en inventario.")
    ]
    for i, row_data in enumerate(links_data):
        row = t_links.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            set_cell_background(cell, "FFFFFF" if i % 2 == 0 else "F9FAFB")
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9)
            if j == 1:
                r.font.name = 'Consolas'
                r.font.color.rgb = COLOR_PRIMARY

    # Paso 3: Simulación interactiva
    h2 = doc.add_heading("Paso 3: La Simulación de Todo (CLI Interactivo y Automatizado)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("El proyecto incluye un simulador de consola en Node.js que pone a prueba en tiempo real todos los escenarios de arquitectura:")

    p_sim = doc.add_paragraph()
    p_sim.paragraph_format.left_indent = Inches(0.3)
    r_sim = p_sim.add_run("node .\\scripts\\demo-interactivo.js")
    r_sim.font.name = 'Consolas'
    r_sim.font.bold = True

    doc.add_paragraph("Opciones del menú de simulación:\n"
                      "• [1] Diagnóstico del Sistema y Health Check: Valida respuesta HTTP 200 de NGINX.\n"
                      "• [2] Seguridad Zero-Trust y BOLA (OWASP API1/5): Intenta que usuario_1 acceda al carrito de usuario_2 y comprueba el bloqueo con HTTP 403 Forbidden.\n"
                      "• [3] Catálogo y Persistencia en Redis: Guarda artículos en Redis con TTL de 30 días y valida persistencia AOF.\n"
                      "• [4] Resiliencia y Circuit Breaker (Opossum): Apaga productos y demuestra que el carrito sigue respondiendo con datos degradados de caché.\n"
                      "• [5] Rate Limiting y Control DoS (OWASP API4): Envía ráfaga sostenida y verifica el bloqueo con HTTP 429 Too Many Requests.\n"
                      "• [6] Observabilidad: Consulta las métricas recolectadas por Prometheus.\n"
                      "• [7] Tour Completo Automatizado: Ejecuta todos los escenarios en secuencia con resultados en verde.")

    doc.add_paragraph("Para correr la simulación automática directa de entrega sin interacción manual:")
    p_sim2 = doc.add_paragraph()
    p_sim2.paragraph_format.left_indent = Inches(0.3)
    r_sim2 = p_sim2.add_run("node .\\scripts\\demo-interactivo.js --auto")
    r_sim2.font.name = 'Consolas'
    r_sim2.font.bold = True

    # Paso 4: Respaldos y apagado
    h2 = doc.add_heading("Paso 4: Respaldos, Restauración y Apagado", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY

    t_cmds = doc.add_table(rows=4, cols=2)
    t_cmds.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_cmds.rows[0].cells[0].paragraphs[0].add_run("Acción").font.bold = True
    t_cmds.rows[0].cells[1].paragraphs[0].add_run("Comando PowerShell").font.bold = True
    set_cell_background(t_cmds.rows[0].cells[0], HEX_HEADER)
    set_cell_background(t_cmds.rows[0].cells[1], HEX_HEADER)
    t_cmds.rows[0].cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    t_cmds.rows[0].cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    actions = [
        ("Crear Respaldo (Postgres + Redis)", ".\\scripts\\backup.ps1"),
        ("Restaurar Último Respaldo", ".\\scripts\\restore.ps1"),
        ("Detener y Apagar Contenedores", "docker compose down")
    ]
    for i, (act, cmd) in enumerate(actions):
        row = t_cmds.rows[i+1]
        row.cells[0].paragraphs[0].add_run(act).font.size = Pt(9.5)
        r = row.cells[1].paragraphs[0].add_run(cmd)
        r.font.name = 'Consolas'
        r.font.size = Pt(9.5)
        set_cell_background(row.cells[0], "FFFFFF" if i % 2 == 0 else "F9FAFB")
        set_cell_background(row.cells[1], "FFFFFF" if i % 2 == 0 else "F9FAFB")

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 2: ARQUITECTURA DE SOFTWARE Y PATRONES DE DISEÑO
    # -------------------------------------------------------------
    h1 = doc.add_heading("2. Fundamentos de Arquitectura de Software y Patrones de Diseño", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph("ShopHero está diseñado siguiendo principios de Arquitectura Limpia, Microservicios Cloud-Native, Diseño Guiado por el Dominio (DDD) y Persistencia Políglota.")

    h2 = doc.add_heading("2.1 Descomposición del Dominio (DDD - Domain-Driven Design)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("El sistema descompone el e-commerce en tres Bounded Contexts autónomos:\n"
                      "1. Catálogo de Productos: Dominio de lectura intensiva encargado del catálogo de 14 productos, descripción, precios y stock disponible.\n"
                      "2. Carrito de Compras: Dominio volátil de alta velocidad para sesiones temporales de clientes, cálculo de totales y preparación de compra.\n"
                      "3. Pedidos y Checkout: Dominio transaccional de misión crítica que asegura la atomicidad de la compra, descuento formal de inventario y emisión de eventos de dominio.")

    h2 = doc.add_heading("2.2 Persistencia Políglota (Database-per-Service)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("En lugar de una base de datos monolítica compartida, cada contexto utiliza el motor de almacenamiento óptimo para su perfil de carga:\n"
                      "• Redis 7 (In-Memory + AOF): Utilizado por el Carrito. Proporciona latencias de lectura/escritura en submilisegundos, claves con TTL de expiración y persistencia Append-Only File (AOF) para recuperación ante reinicios.\n"
                      "• PostgreSQL 16 (Relacional ACID): Utilizado por Pedidos. Proporciona transacciones atómicas (BEGIN/COMMIT), integridad referencial estricta y aislamiento contra sobreventas de inventario.")

    h2 = doc.add_heading("2.3 Patrones Arquitectónicos Clave Implementados", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY

    patterns = [
        ("Patrón API Gateway (BFF - Backend For Frontend)",
         "Implementado con NGINX unprivileged (puerto 8080). Centraliza el enrutamiento perimetral, oculta la topología interna, aplica Rate Limiting (10 req/s con burst 20) e inserta cabeceras de seguridad estrictas (HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff)."),
        
        ("Patrón Circuit Breaker (Opossum)",
         "Protege el microservicio de carrito frente a la caída o latencia del catálogo. Opera en tres estados: Closed (nominal), Open (interrupción inmediata de peticiones para no saturar la red) y Half-Open (sonda de verificación de recuperación). Evita caídas en cascada."),
        
        ("Patrón Cache-Aside con Degradación Elegante",
         "El servicio de carrito mantiene una caché local en Redis con los datos validados de productos en los últimos 5 minutos. Si el catálogo cae, responde con HTTP 200 entregando el carrito enriquecido con la bandera '_degraded: true'."),
        
        ("Patrón Transactional Outbox",
         "Resuelve el problema del Dual-Write en microservicios. En una única transacción atómica en PostgreSQL: descuenta stock, inserta el pedido en 'pedidos', guarda los ítems en 'pedido_items' y registra el evento 'PedidoConfirmado' en la tabla 'outbox_eventos'. Garantiza consistencia eventual sin usar transacciones distribuidas 2PC."),
        
        ("Patrón Sidecar & Externalized Secrets Store",
         "HashiCorp Vault + Vault Agent. Vault almacena los secretos centralizados y Vault Agent los sincroniza en caliente como archivos en memoria RAM volátil (tmpfs), impidiendo que contraseñas se quemen en código, imágenes de Docker o variables de entorno visibles con 'docker inspect'.")
    ]

    for title, desc in patterns:
        p = doc.add_paragraph()
        r_t = p.add_run(f"• {title}: ")
        r_t.font.bold = True
        r_t.font.color.rgb = COLOR_PRIMARY
        p.add_run(desc)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 3: ATRIBUTOS DE CALIDAD Y COMPROMISOS (TRADE-OFFS / CAP)
    # -------------------------------------------------------------
    h1 = doc.add_heading("3. Atributos de Calidad (NFRs), Trade-Offs y Teorema CAP", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    h2 = doc.add_heading("3.1 Matriz de Atributos de Calidad (ISO/IEC 25010)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY

    t_nfr = doc.add_table(rows=7, cols=4)
    t_nfr.alignment = WD_TABLE_ALIGNMENT.CENTER
    nfr_headers = ["Atributo de Calidad", "Escenario / Meta", "Mecanismo Arquitectónico", "Resultado Verificado"]
    for j, h in enumerate(nfr_headers):
        cell = t_nfr.rows[0].cells[j]
        set_cell_background(cell, HEX_HEADER)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)

    nfr_data = [
        ("Rendimiento", "Latencia p95 < 300ms en catálogo; < 500ms en carrito.", "NGINX event-driven, caché Redis en RAM, I/O asíncrono Node.js.", "p95 de 4.47 ms bajo ráfaga de 300 req/s con k6."),
        ("Disponibilidad", "Operatividad continua ante caídas (SLO 99.95%).", "Circuit Breaker Opossum + Fallback de caché degradada.", "100% de éxito en fallback durante apagado de productos."),
        ("Seguridad", "Zero-Trust y mitigación OWASP API Top 10.", "Validación JWT por microservicio, mitigación BOLA, non-root.", "1,950 peticiones bloqueadas con 429; BOLA bloqueado con 403."),
        ("Consistencia", "Cero sobreventas de inventario y pedidos atómicos.", "Bloqueo a nivel de fila y transacciones ACID en PostgreSQL.", "Transacciones atómicas verificadas; reversión con 409 si falta stock."),
        ("Mantenibilidad", "Evolución y despliegues independientes.", "Microservicios desacoplados con contratos REST y tests Jest.", "35 de 35 pruebas unitarias automatizadas aprobadas."),
        ("Recuperabilidad", "Rápido Disaster Recovery ante pérdida total de datos.", "Scripts automatizados de backup (pg_dump, bgsave) con rotación a 7.", "Recuperación íntegra de PostgreSQL en 2 segundos comprobada.")
    ]

    for i, row_data in enumerate(nfr_data):
        row = t_nfr.rows[i+1]
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            set_cell_background(cell, "FFFFFF" if i % 2 == 0 else "F9FAFB")
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if j == 0:
                r.font.bold = True

    h2 = doc.add_heading("3.2 Aplicación del Teorema CAP (Brewer)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    doc.add_paragraph("El sistema adopta un modelo híbrido según la naturaleza de cada contexto delimitado:\n"
                      "• Carrito + Redis -> Enfoque AP (Availability & Partition Tolerance): Prioriza la Disponibilidad. Ante una desconexión de red con el catálogo, el sistema no bloquea al comprador; responde con datos cacheados (_degraded: true) para permitirle seguir interactuando.\n"
                      "• Pedidos + PostgreSQL -> Enfoque CP (Consistency & Partition Tolerance): Prioriza la Consistencia. En el checkout de compra, el sistema exige consistencia atómica absoluta. Si el inventario o la base de datos no pueden garantizar stock, la transacción se aborta (HTTP 409) para impedir sobreventas.")

    h2 = doc.add_heading("3.3 Matriz de Trade-Offs (Compromisos)", level=2)
    h2.style.font.color.rgb = COLOR_SECONDARY
    tradeoffs = [
        ("Escalabilidad vs. Complejidad Operativa",
         "Dividir la aplicación en 11 contenedores permite escalar cada microservicio de forma independiente según su ratio de tráfico, pero exige mayor observabilidad (OpenTelemetry, Prometheus, Grafana) y orquestación con Docker Compose / Kubernetes."),
        ("Desempeño vs. Consistencia Inmediata",
         "El uso de caché de 5 minutos en Redis garantiza respuestas en milisegundos para el carrito, aceptando el compromiso de consistencia eventual temporal si un precio o stock cambia súbitamente en el catálogo."),
        ("Consistencia Transaccional vs. Acoplamiento Distribuido",
         "El patrón Transactional Outbox elimina la necesidad de protocolos bloqueantes pesados como Two-Phase Commit (2PC), aceptando como contrapartida la necesidad de un relay de mensajes asíncrono hacia Kafka/RabbitMQ.")
    ]
    for k, v in tradeoffs:
        p = doc.add_paragraph()
        r = p.add_run(f"• {k}: ")
        r.font.bold = True
        r.font.color.rgb = COLOR_SECONDARY
        p.add_run(v)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 4: DIAPOSITIVA POR DIAPOSITIVA (10 SLIDES Y GUION)
    # -------------------------------------------------------------
    h1 = doc.add_heading("4. Guion Maestro Diapositiva por Diapositiva (10 Slides)", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    slides = [
        ("Diapositiva 1: Portada y Visión General",
         "ShopHero: Arquitectura de Microservicios Resiliente y Cloud-Native",
         ["E-Commerce de alta concurrencia desacoplado en microservicios.",
          "Orquestación de 11 contenedores con Docker Compose y Kubernetes.",
          "Principio de Menor Privilegio, Zero-Trust y Gestión Dinámica de Secretos.",
          "Observabilidad integral con Prometheus, Grafana y OpenTelemetry."],
         "Buenos días, profesor y compañeros. Hoy presentamos la arquitectura de software de ShopHero. El reto consistió en concebir una plataforma capaz de soportar picos masivos de tráfico concurrente como Black Friday, eliminando los puntos únicos de falla de los monolitos tradicionales y garantizando atributos clave de calidad como rendimiento, disponibilidad y consistencia."),

        ("Diapositiva 2: Bounded Contexts y Persistencia Políglota",
         "Descomposición del Dominio (DDD) y Database-per-Service",
         ["Catálogo de Productos: Dominio de lectura intensiva (14 productos).",
          "Carrito de Compras: Sesión volátil de alta velocidad -> Redis 7 en RAM con AOF.",
          "Pedidos y Checkout: Transacciones atómicas de compras -> PostgreSQL 16 ACID."],
         "Aplicamos diseño guiado por el dominio delimitando tres contextos claramente separados. En lugar de una base de datos única, implementamos Database-per-Service mediante Persistencia Políglota: Redis para el carrito, optimizado para operaciones en submilisegundos y TTL, y PostgreSQL para pedidos, garantizando cumplimiento transaccional ACID y evitando sobreventas."),

        ("Diapositiva 3: Vista de Contenedores y Topología de Red",
         "Vista C4 Nivel 2 y Segregación de Redes Zero-Trust",
         ["Single Point of Entry: Únicamente el puerto 8080 (NGINX) expuesto al host.",
          "Redes internas segregadas: edge-net, app-net, data-net, obs-net.",
          "100% de contenedores ejecutándose como usuarios sin privilegios (non-root: UID 101/70/node)."],
         "Nuestra vista de contenedores refleja una arquitectura de defensa en profundidad. El API Gateway NGINX es el único componente expuesto al exterior. Los microservicios y bases de datos residen en redes internas aisladas. De esta manera, si un atacante comprometiera el catálogo, no tendría ruta de red directa hacia la base de datos de pedidos."),

        ("Diapositiva 4: Resiliencia con Circuit Breaker",
         "Patrón Circuit Breaker (Opossum) y Degradación Elegante",
         ["Prevención de fallas en cascada si el catálogo se ralentiza o cae.",
          "Estados: Closed (nominal) -> Open (interrupción inmediata) -> Half-Open (recuperación).",
          "Degradación elegante: Fallback a caché local en Redis respondiendo HTTP 200 con '_degraded: true'."],
         "En sistemas distribuidos, la falla de dependencias es inevitable. Implementamos el patrón Circuit Breaker con Opossum. Si el microservicio de productos cae, el circuito se abre y el servicio de carrito conmuta de inmediato a la caché en Redis, devolviendo los datos marcados como degradados. El usuario puede seguir comprando sin percibir error 500."),

        ("Diapositiva 5: Consistencia Atómica: Transactional Outbox",
         "Consistencia de Datos sin 2PC: Patrón Transactional Outbox",
         ["Eliminación del antipatrón Dual-Write sin usar transacciones distribuidas bloqueantes.",
          "Transacción atómica en PostgreSQL: descuenta stock, inserta orden y guarda evento de dominio.",
          "Tabla 'outbox_eventos' lista para ser leída por un relay asíncrono hacia Apache Kafka."],
         "Uno de los mayores desafíos en microservicios es cómo actualizar la base de datos y publicar un evento de dominio sin usar transacciones en dos fases (2PC). Implementamos Transactional Outbox: dentro de una única transacción ACID en PostgreSQL descontamos el stock, registramos el pedido y guardamos el evento en la tabla 'outbox_eventos'. Esto garantiza consistencia atómica."),

        ("Diapositiva 6: Validación Empírica de NFRs con k6",
         "Pruebas de Carga Reales a 300 Peticiones por Segundo",
         ["3,001 peticiones evaluadas bajo tráfico sostenido.",
          "Latencia p95 de apenas 4.47 milisegundos en el Gateway.",
          "1,950 peticiones bloqueadas (64.97%) con HTTP 429 por el Rate Limiter de NGINX."],
         "En arquitectura de software, los atributos de calidad deben verificarse empíricamente. Sometimos el sistema a pruebas de carga con k6 enviando 300 peticiones concurrentes por segundo. La arquitectura demostró un desempeño excelente: el percentil 95 de latencia se ubicó en apenas 4.47 ms, y el Rate Limiter de NGINX actuó como escudo perimetral mitigando 1,950 peticiones abusivas."),

        ("Diapositiva 7: Seguridad Arquitectónica: Zero-Trust y Vault",
         "Security by Design y Mitigación de Vulnerabilidades OWASP",
         ["Mitigación BOLA/IDOR (OWASP API1): Validación criptográfica de pertenencia de usuario en el JWT.",
          "HashiCorp Vault + Vault Agent: Cero credenciales quemadas en código o Dockerfiles.",
          "Inyección dinámica de secretos en memoria RAM volátil (tmpfs)."],
         "La seguridad fue concebida como un atributo transversal. Implementamos Zero-Trust interno: aunque el Gateway valide el tráfico, cada microservicio vuelve a verificar la firma y scopes del JWT. Mitigamos el riesgo de acceso cruzado entre carritos validando que el claim 'sub' coincida con el usuario. Además, eliminamos el hardcoding de contraseñas usando HashiCorp Vault y Vault Agent."),

        ("Diapositiva 8: Observabilidad Distribuida: Métricas y Trazas",
         "La Tríada de Observabilidad: Prometheus, Grafana y OpenTelemetry",
         ["Prometheus v3.2: Extracción periódica de métricas de proceso y HTTP cada 5 segundos.",
          "OpenTelemetry Collector: Ingesta de trazas distribuidas con propagación W3C (traceparent).",
          "Grafana 11.5.2: Dashboards pre-aprovisionados como código para diagnóstico de cuellos de botella."],
         "Para garantizar la operabilidad de la arquitectura, implementamos la tríada de observabilidad. Cada petición HTTP recibe un encabezado de traza distribuida bajo el estándar W3C que viaja entre servicios. Prometheus recolecta métricas en tiempo real y Grafana ofrece tableros de control para supervisar percentiles de latencia y saturación de recursos."),

        ("Diapositiva 9: Trade-Offs y Posicionamiento en el Teorema CAP",
         "Compromisos Arquitectónicos y Análisis CAP",
         ["Carrito -> Modelo AP: Prioriza Disponibilidad y tolerancia a particiones con degradación.",
          "Pedidos -> Modelo CP: Prioriza Consistencia transaccional estricta; aborta con 409 si falta stock.",
          "Complejidad operativa asumida conscientemente a cambio de alta escalabilidad e independencia."],
         "Toda arquitectura es una gestión consciente de compromisos. En términos del Teorema CAP, diseñamos una solución híbrida: el carrito adopta un modelo AP, priorizando la disponibilidad continua mediante caché. Por el contrario, el servicio de pedidos adopta un modelo CP, priorizando la consistencia transaccional absoluta para evitar sobreventas. Esta dualidad demuestra madurez de diseño."),

        ("Diapositiva 10: Conclusiones y Deuda Técnica Documentada",
         "Conclusiones y Hoja de Ruta para Producción",
         ["Arquitectura cloud-native funcional de 11 contenedores con patrones probados en vivo.",
          "26 de 26 recursos de Kubernetes validados con 0 errores mediante Kubeconform.",
          "Deuda técnica documentada: migrar Vault dev a clúster HA Raft y Redis standalone a Redis Cluster."],
         "En conclusión, ShopHero demuestra la aplicación rigurosa de patrones de arquitectura de software para resolver problemas reales de concurrencia, tolerancia a fallos y atomicidad. Validamos formalmente 26 manifiestos de Kubernetes con Kubeconform y dejamos documentada la deuda técnica para escalar a la nube. Quedamos atentos a sus preguntas y listos para la demostración en vivo.")
    ]

    for num, title, bullets, script in slides:
        h2 = doc.add_heading(f"{num}: {title}", level=2)
        h2.style.font.color.rgb = COLOR_PRIMARY

        p_b = doc.add_paragraph()
        r_bt = p_b.add_run("Puntos Clave en la Lámina:\n")
        r_bt.font.bold = True
        for b in bullets:
            p_b.add_run(f"  • {b}\n")

        p_s = doc.add_paragraph()
        p_s.paragraph_format.left_indent = Inches(0.2)
        set_cell_background(doc.add_table(rows=1, cols=1).rows[0].cells[0], HEX_CALLOUT_BG)
        # Reemplazar tabla por párrafo estilizado para evitar saltos raros
        doc.paragraphs[-1]._p.getparent().remove(doc.tables[-1]._tbl)
        
        r_st = p_s.add_run("Lo que debes decir (Guion del Orador):\n")
        r_st.font.bold = True
        r_st.font.color.rgb = COLOR_SECONDARY
        r_sc = p_s.add_run(f'"{script}"')
        r_sc.font.italic = True

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 5: GUION DE DEMOSTRACIÓN EN VIVO (5 MINUTOS)
    # -------------------------------------------------------------
    h1 = doc.add_heading("5. Guion de Demostración en Vivo Paso a Paso (5 Minutos)", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    demo_steps = [
        ("Paso 1: Demostrar los 11 Contenedores y sus Healthchecks",
         "docker compose ps",
         "Muestra en la pantalla que los 11 contenedores tienen el estado 'healthy' y señala que únicamente el puerto 8080 del Gateway está publicado al host."),
        
        ("Paso 2: Mostrar el Patrón Transactional Outbox en PostgreSQL",
         "docker compose exec postgres psql -U shophero -d shophero -c \"SELECT id, orden_id, total, estado FROM pedidos;\"\n"
         "docker compose exec postgres psql -U shophero -d shophero -c \"SELECT id, agregado, tipo_evento, payload FROM outbox_eventos;\"",
         "Explica que en una sola transacción ACID se creó la orden de compra y se registró el evento de dominio 'PedidoConfirmado' en la tabla outbox."),
        
        ("Paso 3: Demostración de Respaldo y Disaster Recovery en 2 Segundos",
         ".\\scripts\\backup.ps1\n"
         "docker compose exec postgres psql -U shophero -d shophero -c \"DELETE FROM pedidos;\"\n"
         ".\\scripts\\restore.ps1\n"
         "docker compose exec postgres psql -U shophero -d shophero -c \"SELECT orden_id, total FROM pedidos;\"",
         "Demuestra cómo tras vaciar la base de datos simulando un fallo catastrófico, el script de restauración recuperó los pedidos íntegros en 2 segundos."),
        
        ("Paso 4: Demostrar el Circuit Breaker y la Degradación Elegante",
         "docker compose stop productos\n"
         "curl -s http://localhost:8080/api/carritos/usuario_1\n"
         "docker compose start productos",
         "Muestra que al apagar el catálogo, el carrito no devuelve error 500, sino los productos cacheados en Redis con la bandera '_degraded: true'."),
        
        ("Paso 5: Mostrar la Telemetría en Grafana",
         "Abrir navegador en: http://localhost:8080/grafana",
         "Proyecta los tableros de latencia p95 (por debajo de 15 ms), el throughput de peticiones y el consumo de memoria de los contenedores.")
    ]

    for title, cmd, desc in demo_steps:
        h2 = doc.add_heading(title, level=2)
        h2.style.font.color.rgb = COLOR_SECONDARY
        
        doc.add_paragraph("Comando a ejecutar en la terminal:")
        p_c = doc.add_paragraph()
        p_c.paragraph_format.left_indent = Inches(0.3)
        r_c = p_c.add_run(cmd)
        r_c.font.name = 'Consolas'
        r_c.font.bold = True
        r_c.font.size = Pt(9.5)
        
        p_d = doc.add_paragraph()
        r_dt = p_d.add_run("Qué explicar al docente: ")
        r_dt.font.bold = True
        p_d.add_run(desc)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECCIÓN 6: BANCO DE PREGUNTAS DIFÍCILES Y RESPUESTAS
    # -------------------------------------------------------------
    h1 = doc.add_heading("6. Banco de Preguntas Clave del Docente y Respuestas Técnicas", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    qa = [
        ("¿Por qué una arquitectura de microservicios y no un monolito modular?",
         "Porque ShopHero experimenta un ratio asimétrico de tráfico: el catálogo recibe hasta 100 consultas de lectura por cada checkout de compra. Desacoplar los servicios nos permite escalar horizontalmente los pods de catálogo en Kubernetes sin incurrir en costos innecesarios en la capa transaccional de base de datos relacional."),

        ("¿Por qué Transactional Outbox en lugar de Two-Phase Commit (2PC) o Saga?",
         "Two-Phase Commit es un protocolo bloqueante que genera cuellos de botella severos y acopla temporalmente los sistemas, violando la autonomía de microservicios. Elegimos Transactional Outbox porque garantiza atomicidad local en la misma transacción de PostgreSQL sin necesidad de coordinadores distribuidos, siendo el paso previo ideal para un bus de eventos con Kafka."),

        ("¿Por qué Redis para carritos y PostgreSQL para pedidos?",
         "Por el principio de Persistencia Políglota. Un carrito requiere escrituras ultra rápidas en memoria con expiración automática (TTL), para lo cual Redis es óptimo. Un pedido completado involucra facturación legal, transacciones ACID estrictas y relaciones de llaves foráneas, donde PostgreSQL es el estándar de fiabilidad."),

        ("¿Cómo mitigan la vulnerabilidad BOLA / IDOR (OWASP API1)?",
         "A nivel del middleware de autorización del microservicio de carrito: cada solicitud extrae el claim 'sub' del JWT validado criptográficamente y verifica estrictamente que sea idéntico al parámetro 'usuarioId' de la ruta HTTP, denegando el acceso con HTTP 403 si un usuario intenta ver o alterar el carrito de otro."),

        ("¿Qué ventaja aporta Vault Agent frente a inyectar secretos como variables de entorno?",
         "Las variables de entorno en Docker quedan expuestas en texto plano para cualquier usuario con acceso a 'docker inspect' o a '/proc/1/environ'. Con Vault Agent, las credenciales se montan dinámicamente como archivos en un volumen en memoria RAM (tmpfs), nunca tocan el disco físico y pueden rotarse en caliente sin reiniciar los contenedores.")
    ]

    for q, a in qa:
        p_q = doc.add_paragraph()
        r_q = p_q.add_run(f"P: {q}")
        r_q.font.bold = True
        r_q.font.color.rgb = COLOR_PRIMARY

        p_a = doc.add_paragraph()
        p_a.paragraph_format.left_indent = Inches(0.2)
        r_at = p_a.add_run("Respuesta: ")
        r_at.font.bold = True
        r_at.font.color.rgb = COLOR_SECONDARY
        r_ac = p_a.add_run(f'"{a}"')
        r_ac.font.italic = True

    # -------------------------------------------------------------
    # SECCIÓN 7: CIFRAS Y MÉTRICAS DE IMPACTO
    # -------------------------------------------------------------
    h1 = doc.add_heading("7. Las 5 Métricas Más Impactantes para Diapositivas", level=1)
    h1.style.font.color.rgb = COLOR_PRIMARY

    metrics = [
        ("3,001 peticiones a 300 req/s", "Tasa masiva soportada en pruebas de estrés con k6, con 1,950 peticiones (64.97%) filtradas por el Rate Limiter de NGINX con HTTP 429 para proteger la infraestructura."),
        ("4.47 ms de latencia p95", "Tiempo de respuesta del Gateway bajo condiciones de alta concurrencia, cumpliendo con creces el NFR de latencia inferior a 300 ms."),
        ("100% de tolerancia a fallos", "El Circuit Breaker garantizó que el 100% de las peticiones al carrito respondieran con datos cacheados ante el apagado forzado del catálogo."),
        ("2 segundos de Disaster Recovery", "Tiempo total que tomó restaurar por completo la base de datos de pedidos tras un borrado masivo catastrófico intencional."),
        ("26 de 26 recursos de Kubernetes validados", "Conformidad técnica absoluta de los 7 manifiestos YAML auditados con la herramienta Kubeconform frente a los esquemas oficiales de la CNCF.")
    ]

    for m, d in metrics:
        p = doc.add_paragraph()
        r_m = p.add_run(f"• {m}: ")
        r_m.font.bold = True
        r_m.font.color.rgb = COLOR_PRIMARY
        p.add_run(d)

    # Guardar en las dos rutas deseadas
    doc_path1 = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'docs', 'Guia_Presentacion_ShopHero_Arquitectura_Software.docx'))
    doc_path2 = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Guia_Presentacion_ShopHero_Arquitectura_Software.docx'))

    doc.save(doc_path1)
    doc.save(doc_path2)
    print(f"Documento generado exitosamente en:\n1. {doc_path1}\n2. {doc_path2}")

if __name__ == '__main__':
    create_document()
