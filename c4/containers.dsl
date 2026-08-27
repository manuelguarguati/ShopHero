workspace "AgroData Containers" "Modelo de Contenedores de la Plataforma AgroData" {

    model {
        agricultor = person "Agricultor / Productor" "Supervisa lotes agrícolas y recibe alertas." "User"
        agronomo = person "Agrónomo / Asesor Técnico" "Analiza métricas y emite diagnósticos agronómicos." "User"
        admin = person "Administrador de Sistema" "Gestiona configuraciones, usuarios y sensores." "User"

        sensoresIoT = softwareSystem "Estaciones y Sensores IoT" "Sensores de campo que transmiten lecturas de telemetría." "ExternalSystem"
        servicioClima = softwareSystem "Servicio de Clima Externo" "Proveedor externo de datos meteorológicos." "ExternalSystem"
        proveedorSatelital = softwareSystem "Proveedor de Imágenes Satelitales" "Servicio externo de imágenes multiespectrales." "ExternalSystem"

        agrodata = softwareSystem "Plataforma AgroData" "Sistema integral de recolección y analítica agrícola." {
            webApp = container "Aplicación Web (SPA)" "Interfaz web para gestión de lotes, mapas GIS interactivos y reportes." "React / TypeScript" "Web"
            mobileApp = container "Aplicación Móvil" "Aplicación móvil híbrida para operadores de campo con soporte offline." "Flutter / React Native" "Mobile"
            apiGateway = container "API Gateway" "Punto de entrada unificado para clientes, autenticación, rate limiting y enrutamiento." "Nginx / Spring Cloud Gateway" "Gateway"
            coreService = container "Servicio Core de Gestión Agrícola" "Gestiona entidades principales: fincas, lotes, cultivos, labores y usuarios." "Node.js / Java Spring Boot" "Microservice"
            iotIngestionService = container "Servicio de Ingesta IoT" "Recibe, valida y procesa el flujo de telemetría de alta frecuencia de sensores." "Python / FastAPI" "Microservice"
            analyticsService = container "Servicio de Analítica e IA" "Procesa cálculo de NDVI, modelos predictivos de rendimiento y detección de plagas." "Python / PyTorch / GeoPandas" "Microservice"
            notificationService = container "Servicio de Notificaciones" "Genera y envía alertas (Push, SMS, Email) por eventos climáticos o de humedad." "Go / Node.js" "Microservice"

            messageBroker = container "Agente de Mensajes (Message Broker)" "Gestiona colas de eventos asíncronos y desacopla la ingesta de telemetría." "RabbitMQ / Apache Kafka" "Broker"
            relationalDb = container "Base de Datos Relacional y Geoespacial" "Almacena datos estructurados, información de usuarios y geometrías de lotes (Polígonos GIS)." "PostgreSQL + PostGIS" "Database"
            timeseriesDb = container "Base de Datos de Series Temporales" "Almacena y optimiza la consulta de métricas continuas de sensores IoT." "PostgreSQL + TimescaleDB" "Database"
            cacheStore = container "Almacén de Caché" "Cachea datos de sesión, consultas frecuentes de clima y respuestas API." "Redis" "Cache"
        }

        # Interacciones de Usuarios
        agricultor -> webApp "Accede a reportes y configuración" "HTTPS"
        agricultor -> mobileApp "Registra labores y revisa alertas en campo" "HTTPS / Offline Storage"
        agronomo -> webApp "Analiza mapas GIS y prescribe tratamientos" "HTTPS"
        admin -> webApp "Gestiona accesos y dispositivos sensores" "HTTPS"

        # Interacciones Frontend -> API Gateway
        webApp -> apiGateway "Realiza solicitudes de la API" "HTTPS / JSON"
        mobileApp -> apiGateway "Sincroniza datos y realiza solicitudes API" "HTTPS / JSON"

        # Interacciones API Gateway -> Servicios
        apiGateway -> coreService "Enruta peticiones de gestión" "gRPC / HTTP"
        apiGateway -> analyticsService "Enruta peticiones de analítica" "gRPC / HTTP"
        apiGateway -> notificationService "Enruta peticiones de alerta" "HTTP"
        apiGateway -> cacheStore "Verifica credenciales y tokens de sesión" "RESP"

        # Ingesta IoT y Mensajería
        sensoresIoT -> iotIngestionService "Envía lecturas de sensores" "MQTT / HTTPS"
        iotIngestionService -> messageBroker "Publica eventos de telemetría" "AMQP / Kafka Protocol"
        messageBroker -> timeseriesDb "Persiste lecturas en series de tiempo" "SQL"
        messageBroker -> analyticsService "Suministra datos para modelos en tiempo real" "AMQP / Kafka Protocol"
        messageBroker -> notificationService "Dispara alertas por umbrales superados" "AMQP"

        # Servicios Core y Analítica -> Almacenamiento
        coreService -> relationalDb "Lee y escribe lotes, cultivos y usuarios" "SQL / PostGIS"
        coreService -> cacheStore "Cachea catálogos y consultas de lotes" "RESP"
        analyticsService -> timeseriesDb "Consulta histórico de humedad y clima" "SQL"
        analyticsService -> relationalDb "Lee polígonos de lotes y cultivos" "SQL / PostGIS"

        # Integraciones Externas
        coreService -> servicioClima "Obtiene pronósticos meteorológicos" "HTTPS / REST API"
        analyticsService -> proveedorSatelital "Descarga imágenes multiespectrales" "HTTPS / REST API"
    }

    views {
        container agrodata "DiagramaContenedores" "Diagrama de Contenedores de la Plataforma AgroData" {
            include *
            autoLayout lr
        }

        styles {
            element "Web" {
                background #1976D2
                color #ffffff
                shape WebBrowser
            }
            element "Mobile" {
                background #0288D1
                color #ffffff
                shape MobileDeviceTarget
            }
            element "Gateway" {
                background #7B1FA2
                color #ffffff
                shape Box
            }
            element "Microservice" {
                background #388E3C
                color #ffffff
                shape Hexagon
            }
            element "Broker" {
                background #E65100
                color #ffffff
                shape Pipe
            }
            element "Database" {
                background #00796B
                color #ffffff
                shape Cylinder
            }
            element "Cache" {
                background #C2185B
                color #ffffff
                shape Cylinder
            }
            element "ExternalSystem" {
                background #455A64
                color #ffffff
                shape RoundedBox
            }
            element "User" {
                background #37474F
                color #ffffff
                shape Person
            }
        }
    }
}
