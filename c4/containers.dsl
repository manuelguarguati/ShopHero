workspace "ShopHero" "E-Commerce de Venta Flash / Black Friday" {

    model {

        cliente = person "Cliente" "Usuario que navega, busca productos, administra su carrito y realiza compras."

        administrador = person "Administrador" "Gestiona productos, promociones, precios e inventario."

        pasarelaPago = softwareSystem "Pasarela de Pago" "Sistema externo encargado de procesar los pagos."

        shopHero = softwareSystem "ShopHero" "Plataforma e-commerce para ventas flash y Black Friday." {

            webApp = container "Aplicación Web" "Interfaz utilizada por clientes y administradores." "React / JavaScript"

            apiGateway = container "API Gateway" "Punto de entrada NGINX con rate limiting a los servicios internos." "NGINX"

            catalogService = container "Servicio de Catálogo y Búsqueda" "Gestiona navegación, consulta de productos y búsquedas sin bloquear el proceso transaccional." "Microservicio"

            cartService = container "Servicio de Carrito" "Gestiona los carritos persistentes de los clientes." "Microservicio"

            checkoutService = container "Servicio de Checkout" "Coordina la compra, pago y confirmación del pedido." "Microservicio"

            reservationService = container "Servicio de Reservas" "Crea reservas temporales de productos con expiración automática mediante TTL." "Microservicio"

            inventoryService = container "Servicio de Inventario" "Gestiona el inventario real disponible y publica cambios de existencias." "Microservicio"

            catalogDb = container "Base de Datos de Catálogo" "Almacena productos, precios y promociones." "PostgreSQL"

            inventoryDb = container "Base de Datos de Inventario" "Mantiene el inventario real de los productos." "PostgreSQL"

            ordersDb = container "Base de Datos de Pedidos" "Almacena los pedidos y transacciones confirmadas." "PostgreSQL"

            redis = container "Redis Cluster" "Almacena carritos persistentes y reservas temporales con TTL; en Compose local se ejecuta standalone." "Redis"

            searchIndex = container "Índice de Búsqueda" "Mantiene una vista optimizada del catálogo para navegación y búsquedas rápidas." "OpenSearch / Elasticsearch"

            kafka = container "Bus de Eventos" "Distribuye eventos de inventario, reservas, pedidos y actualizaciones entre microservicios." "Apache Kafka"

            prometheus = container "Prometheus" "Recopila métricas HTTP y del proceso de los microservicios." "Prometheus"

            grafana = container "Grafana" "Consulta y visualiza métricas del dashboard base de ShopHero." "Grafana"

            otelCollector = container "OpenTelemetry Collector" "Recibe trazas OTLP y las exporta al backend configurado." "OpenTelemetry Collector"

            vault = container "Vault" "Almacena secretos; el modo dev se limita al entorno local." "HashiCorp Vault"

            vaultAgent = container "Vault Agent" "Autentica en Vault y renderiza secretos en archivos montados para los servicios." "Vault Agent"
        }

        cliente -> webApp "Navega, busca productos, administra carrito y compra" "HTTPS"

        administrador -> webApp "Administra catálogo, promociones e inventario" "HTTPS"

        webApp -> apiGateway "Realiza solicitudes" "HTTPS/JSON"

        apiGateway -> grafana "Expone el dashboard de observabilidad" "HTTP/JSON"

        apiGateway -> catalogService "Consulta productos y búsquedas" "HTTP/JSON"

        apiGateway -> cartService "Gestiona el carrito" "HTTP/JSON"

        cartService -> catalogService "Valida el producto antes de persistir el carrito" "HTTP/JSON + JWT de servicio"

        apiGateway -> checkoutService "Inicia y consulta el proceso de compra" "HTTP/JSON"

        catalogService -> catalogDb "Consulta información oficial de productos" "SQL"

        catalogService -> searchIndex "Realiza búsquedas optimizadas"

        cartService -> redis "Guarda y recupera carritos persistentes"

        prometheus -> cartService "Scrapea /metrics" "HTTP"

        prometheus -> catalogService "Scrapea /metrics" "HTTP"

        grafana -> prometheus "Consulta métricas para el dashboard" "PromQL"

        cartService -> otelCollector "Exporta trazas con contexto propagado" "OTLP/HTTP"

        catalogService -> otelCollector "Exporta trazas de HTTP" "OTLP/HTTP"

        vaultAgent -> vault "Lee secretos locales con política de mínimo privilegio" "HTTP"

        vaultAgent -> cartService "Entrega secreto JWT y contraseña Redis en archivos montados" "Volumen interno"

        vaultAgent -> catalogService "Entrega secreto JWT en archivo montado" "Volumen interno"

        checkoutService -> reservationService "Solicita una reserva temporal de inventario" "HTTP/JSON"

        checkoutService -> ordersDb "Crea y confirma pedidos" "SQL"

        checkoutService -> pasarelaPago "Solicita el procesamiento del pago" "HTTPS/API"

        checkoutService -> kafka "Publica eventos de pedidos confirmados"

        reservationService -> redis "Crea y elimina reservas temporales usando TTL"

        reservationService -> kafka "Publica eventos de reserva creada, confirmada o expirada"

        inventoryService -> inventoryDb "Consulta y actualiza inventario real" "SQL"

        inventoryService -> kafka "Publica cambios de inventario"

        catalogService -> kafka "Consume cambios de inventario y actualiza el catálogo"

        reservationService -> kafka "Consume actualizaciones de disponibilidad"
    }

    views {

        container shopHero "ContenedoresShopHero" {
            include *
            autolayout lr
        }

        theme default
    }
}
