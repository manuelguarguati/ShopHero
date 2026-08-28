workspace "ShopHero" "E-Commerce de Venta Flash / Black Friday" {

    model {

        cliente = person "Cliente" "Usuario que navega, busca productos, administra su carrito y realiza compras."

        administrador = person "Administrador" "Gestiona productos, promociones, precios e inventario."

        pasarelaPago = softwareSystem "Pasarela de Pago" "Sistema externo encargado de procesar los pagos."

        shopHero = softwareSystem "ShopHero" "Plataforma e-commerce para ventas flash y Black Friday." {

            webApp = container "Aplicación Web" "Interfaz utilizada por clientes y administradores." "React / JavaScript"

            apiGateway = container "API Gateway" "Punto de entrada a los servicios internos de ShopHero." "API Gateway"

            catalogService = container "Servicio de Catálogo y Búsqueda" "Gestiona navegación, consulta de productos y búsquedas sin bloquear el proceso transaccional." "Microservicio"

            cartService = container "Servicio de Carrito" "Gestiona los carritos persistentes de los clientes." "Microservicio"

            checkoutService = container "Servicio de Checkout" "Coordina la compra, pago y confirmación del pedido." "Microservicio"

            reservationService = container "Servicio de Reservas" "Crea reservas temporales de productos con expiración automática mediante TTL." "Microservicio"

            inventoryService = container "Servicio de Inventario" "Gestiona el inventario real disponible y publica cambios de existencias." "Microservicio"

            catalogDb = container "Base de Datos de Catálogo" "Almacena productos, precios y promociones." "PostgreSQL"

            inventoryDb = container "Base de Datos de Inventario" "Mantiene el inventario real de los productos." "PostgreSQL"

            ordersDb = container "Base de Datos de Pedidos" "Almacena los pedidos y transacciones confirmadas." "PostgreSQL"

            redis = container "Redis Cluster" "Almacena carritos persistentes y reservas temporales con TTL." "Redis"

            searchIndex = container "Índice de Búsqueda" "Mantiene una vista optimizada del catálogo para navegación y búsquedas rápidas." "OpenSearch / Elasticsearch"

            kafka = container "Bus de Eventos" "Distribuye eventos de inventario, reservas, pedidos y actualizaciones entre microservicios." "Apache Kafka"
        }

        cliente -> webApp "Navega, busca productos, administra carrito y compra" "HTTPS"

        administrador -> webApp "Administra catálogo, promociones e inventario" "HTTPS"

        webApp -> apiGateway "Realiza solicitudes" "HTTPS/JSON"

        apiGateway -> catalogService "Consulta productos y búsquedas" "HTTP/JSON"

        apiGateway -> cartService "Gestiona el carrito" "HTTP/JSON"

        apiGateway -> checkoutService "Inicia y consulta el proceso de compra" "HTTP/JSON"

        catalogService -> catalogDb "Consulta información oficial de productos" "SQL"

        catalogService -> searchIndex "Realiza búsquedas optimizadas"

        cartService -> redis "Guarda y recupera carritos persistentes"

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
