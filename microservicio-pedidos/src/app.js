const express = require('express');
const { exposeMetrics, measureRequests, observeOrder, requestLogger } = require('./observability');
const { createJwtAuth, requireAdmin, requireOrderOwner, requireScopes } = require('./auth');
const { createCartClient } = require('./cart-client');
const { CheckoutError, createMemoryOrderStore } = require('./store');

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const ALLOWED_METHODS = new Set(['Tarjeta', 'PSE', 'Nequi']);

function createApp({
  jwtSecret,
  store = createMemoryOrderStore(),
  cartClient = createCartClient(),
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use(measureRequests);
  app.use(createJwtAuth(jwtSecret));

  app.get('/health', async (_req, res) => {
    try {
      await store.ping();
      res.status(200).json({ estado: 'ok' });
    } catch (_error) {
      res.status(503).json({ estado: 'error' });
    }
  });

  app.get('/metrics', exposeMetrics);

  app.get('/api/pedidos', requireAdmin, async (req, res) => {
    try {
      res.json(await store.listAll());
    } catch (error) {
      req.log.error({ err: error }, 'Error listando pedidos globales');
      res.status(503).json({ error: 'No se pudieron consultar los pedidos' });
    }
  });

  app.get('/api/outbox', requireAdmin, async (req, res) => {
    try {
      res.json(await store.listOutbox());
    } catch (error) {
      req.log.error({ err: error }, 'Error consultando tabla outbox');
      res.status(503).json({ error: 'No se pudo consultar el outbox transaccional' });
    }
  });

  app.get('/api/pedidos/:usuarioId', requireScopes('orders:read'), requireOrderOwner, async (req, res) => {
    const { usuarioId } = req.params;
    if (!ID_PATTERN.test(usuarioId)) {
      return res.status(400).json({ error: 'usuarioId inválido' });
    }
    try {
      res.json(await store.listByUser(usuarioId));
    } catch (error) {
      req.log.error({ err: error }, 'Error listando pedidos del usuario');
      res.status(503).json({ error: 'No se pudieron consultar los pedidos' });
    }
  });

  app.post('/api/pedidos/:usuarioId', requireScopes('orders:write'), requireOrderOwner, async (req, res) => {
    const { usuarioId } = req.params;
    if (!ID_PATTERN.test(usuarioId)) {
      return res.status(400).json({ error: 'usuarioId inválido' });
    }

    const rawMethod = req.body && typeof req.body.metodoPago === 'string' ? req.body.metodoPago.trim() : 'Tarjeta';
    const metodoPago = ALLOWED_METHODS.has(rawMethod) ? rawMethod : 'Tarjeta';
    const authHeader = req.get('authorization');

    let cart;
    try {
      cart = await cartClient.getCart(usuarioId, authHeader);
    } catch (error) {
      req.log.error({ err: error }, 'No se pudo obtener el carrito para checkout');
      const status = error.statusCode || 503;
      return res.status(status).json({ error: status === 503 ? 'Servicio de carrito no disponible' : error.message });
    }

    const items = Array.isArray(cart?.productos) ? cart.productos : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Tu carrito está vacío' });
    }

    let order;
    try {
      order = await store.checkout({ usuarioId, items, metodoPago });
    } catch (error) {
      if (error instanceof CheckoutError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      req.log.error({ err: error }, 'Error en transacción de checkout');
      return res.status(503).json({ error: 'No se pudo confirmar el pedido en la base de datos' });
    }

    observeOrder(order.total, metodoPago);

    let cartCleared = true;
    try {
      await cartClient.clearCart(usuarioId, authHeader);
    } catch (error) {
      cartCleared = false;
      req.log.warn({ err: error, orderId: order.id }, 'Pedido confirmado pero falló limpieza inmediata del carrito');
    }

    return res.status(201).json({ ...order, cartCleared });
  });

  app.resetPedidos = () => {
    if (typeof store.reset === 'function') store.reset();
  };

  return app;
}

module.exports = { createApp };
