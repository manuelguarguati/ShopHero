workspace "AgroData" "Sistema de Gestión y Analítica Agrícola Inteligente" {

    model {
        agricultor = person "Agricultor / Productor" "Supervisa lotes agrícolas, registra actividades operativas y monitorea alertas meteorológicas." "Agricultor"
        agronomo = person "Agrónomo / Asesor Técnico" "Analiza datos agronómicos, genera diagnósticos de lotes y prescribe tratamientos o fertilización." "Agronomo"
        admin = person "Administrador de Sistema" "Gestiona usuarios, permisos, catálogos de lotes y registro de dispositivos IoT." "Admin"

        agrodata = softwareSystem "Plataforma AgroData" "Sistema integral de recolección, procesamiento y visualización de datos agrícolas e IoT para optimizar la toma de decisiones." "TargetSystem"

        sensoresIoT = softwareSystem "Estaciones y Sensores IoT" "Sensores de humedad de suelo, temperatura, pluviómetros y estaciones meteorológicas de campo." "ExternalSystem"
        servicioClima = softwareSystem "Servicio de Clima Externo" "API externa proveedora de pronósticos meteorológicos y datos climáticos históricos (ej. OpenWeather)." "ExternalSystem"
        proveedorSatelital = softwareSystem "Proveedor de Imágenes Satelitales" "Servicio externo que provee imágenes multiespectrales e índices NDVI (ej. Copernicus / Sentinel)." "ExternalSystem"

        # Relaciones de personas con el sistema
        agricultor -> agrodata "Visualiza estado de cultivos, recibe alertas y registra labores de campo" "HTTPS / App Móvil & Web"
        agronomo -> agrodata "Consulta métricas avanzadas, emite recomendaciones y analiza mapas de salud vegetal" "HTTPS / Web Portal"
        admin -> agrodata "Administra usuarios, dispositivos y configuraciones globales del sistema" "HTTPS / Web Portal"

        # Relaciones con sistemas externos
        sensoresIoT -> agrodata "Envía telemetría en tiempo real (humedad, temperatura, precipitación)" "MQTT / HTTPS"
        agrodata -> servicioClima "Consulta pronósticos meteorológicos y alertas de clima" "HTTPS / REST API"
        agrodata -> proveedorSatelital "Descarga y procesa imágenes multiespectrales para análisis de cultivos" "HTTPS / REST API"
    }

    views {
        systemContext agrodata "ContextoAgroData" "Diagrama de Contexto del Sistema AgroData" {
            include *
            autoLayout lr
        }

        styles {
            element "TargetSystem" {
                background #2E7D32
                color #ffffff
                shape RoundedBox
            }
            element "ExternalSystem" {
                background #455A64
                color #ffffff
                shape RoundedBox
            }
            element "Agricultor" {
                background #1565C0
                color #ffffff
                shape Person
            }
            element "Agronomo" {
                background #00796B
                color #ffffff
                shape Person
            }
            element "Admin" {
                background #D84315
                color #ffffff
                shape Person
            }
        }
    }
}
