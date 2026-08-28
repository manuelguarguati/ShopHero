workspace "ShopHero" "E-Commerce de Venta Flash / Black Friday" {

    model {

        cliente = person "Cliente" "Usuario que navega, busca productos, administra su carrito y realiza compras."

        administrador = person "Administrador" "Gestiona productos, promociones, precios e inventario."

        shopHero = softwareSystem "ShopHero" "Plataforma e-commerce preparada para ventas flash con alta concurrencia, carritos persistentes y reservas temporales de inventario."

        pasarelaPago = softwareSystem "Pasarela de Pago" "Sistema externo encargado de procesar los pagos de las compras."

        cliente -> shopHero "Navega, busca productos, administra el carrito y realiza compras" "HTTPS"

        administrador -> shopHero "Administra catálogo, promociones e inventario" "HTTPS"

        shopHero -> pasarelaPago "Solicita el procesamiento de pagos" "HTTPS/API"
    }

    views {

        systemContext shopHero "ContextoShopHero" {
            include *
            autolayout lr
        }

        theme default
    }
}
