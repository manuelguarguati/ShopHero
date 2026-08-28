workspace "ShopHero Components" "Modelo de Componentes del Servicio de Checkout y Reservas (C4 Level 3)" {

    model {
        pasarelaPago = softwareSystem "Pasarela de Pago" "Sistema externo de procesamiento de pagos." "ExternalSystem"

        shopHero = softwareSystem "ShopHero" "Plataforma e-commerce para ventas flash." {

            redis = container "Redis Cluster" "Almacena carritos y reservas temporales con TTL." "Redis"
            ordersDb = container "Base de Datos de Pedidos" "Almacena pedidos confirmados." "PostgreSQL"
            kafka = container "Bus de Eventos" "Distribuye eventos entre microservicios." "Apache Kafka"

            checkoutService = container "Servicio de Checkout" "Coordina la compra, pago y confirmación del pedido." "Microservicio / Node.js" {

                checkoutController = component "Checkout Controller" "Expone los endpoints HTTP para la inicialización y procesamiento de checkout." "Express Controller"
                paymentGatewayClient = component "Payment Gateway Client" "Maneja la integración y tokenización de pagos con la Pasarela de Pago." "HTTP Client"
                orderManager = component "Order Manager" "Valida las reglas de negocio, coordina transacciones y persiste pedidos." "Service Domain Object"
                eventPublisher = component "Event Publisher" "Publica eventos de pedidos creados y confirmados en Kafka." "Kafka Producer Component"

                checkoutController -> orderManager "Invoca flujo de procesamiento de pedido"
                orderManager -> paymentGatewayClient "Solicita autorización de cobro"
                orderManager -> ordersDb "Persiste el pedido confirmado" "SQL"
                orderManager -> eventPublisher "Dispara evento de pedido realizado"
            }

            reservationService = container "Servicio de Reservas" "Crea reservas temporales de productos con expiración automática mediante TTL." "Microservicio / Spring Boot" {

                reservationController = component "Reservation Controller" "Expone la API REST para crear y consultar reservas temporales." "Spring REST Controller"
                ttlManager = component "TTL Eviction Listener / Manager" "Gestiona la expiración automática de llaves de reserva en Redis." "Redis KeyExpiration Listener"
                inventoryLockManager = component "Inventory Lock Manager" "Aplica bloqueos atómicos sobre llaves de productos en Redis." "Redisson / Redis Service"

                reservationController -> inventoryLockManager "Solicita bloqueo temporal de stock"
                inventoryLockManager -> redis "Inserta llave con expiración TTL (10 min)" "RESP Protocol"
                ttlManager -> redis "Escucha eventos de llaves expiradas" "Redis Pub/Sub"
            }
        }

        checkoutController -> reservationService "Solicita reserva previa de productos" "HTTP/JSON"
        paymentGatewayClient -> pasarelaPago "Procesa transacciones con tarjeta" "HTTPS/API"
        eventPublisher -> kafka "Publica eventos al bus" "Kafka Producer Protocol"
        ttlManager -> kafka "Notifica reserva expirada" "Kafka Producer Protocol"
    }

    views {
        component checkoutService "ComponentesCheckoutService" "Diagrama de componentes del Servicio de Checkout" {
            include *
            autolayout lr
        }

        component reservationService "ComponentesReservationService" "Diagrama de componentes del Servicio de Reservas" {
            include *
            autolayout lr
        }

        theme default
    }
}
