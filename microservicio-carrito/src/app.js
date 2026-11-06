const express = require('express');
const { exposeMetrics, measureRequests, requestLogger } = require('./observability');
const { createJwtAuth, requireCartOwner, requireScopes } = require('./auth');
const { createProductsClient } = require('./products-client');

const CART_TTL_SECONDS = 30 * 24 * 60 * 60;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

function createApp(redis, { jwtSecret, productsClient = createProductsClient() } = {}) {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use(measureRequests);
  app.use(createJwtAuth(jwtSecret));

  // Redis stores each cart as a hash: product ID -> quantity.
  app.get('/health', async (req, res) => {
    try {
      await redis.ping();
      res.status(200).json({ estado: 'ok' });
    } catch (error) {
      req.log.error({ err: error }, 'Health check de Redis falló');
      res.status(503).json({ error: 'Redis no está disponible' });
    }
  });

  app.get('/metrics', exposeMetrics);

  app.get('/api/carritos/:usuarioId', requireScopes('cart:read'), requireCartOwner, async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidId(usuarioId)) {
      return res.status(400).json({ error: 'usuarioId inválido' });
    }

    try {
      const quantities = await redis.hGetAll(cartKey(usuarioId));
      const productos = Object.entries(quantities).map(([productoId, cantidad]) => ({
        productoId,
        cantidad: Number(cantidad),
      }));
      res.json({ usuarioId, productos });
    } catch (error) {
      reportRedisError(req, res, error);
    }
  });

  app.post('/api/carritos/:usuarioId/productos', requireScopes('cart:write'), requireCartOwner, async (req, res) => {
    const { usuarioId } = req.params;
    const { productoId, cantidad } = req.body || {};
    if (!isValidId(usuarioId) || !isValidId(String(productoId || ''))) {
      return res.status(400).json({ error: 'usuarioId y productoId deben ser válidos' });
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
      return res.status(400).json({ error: 'cantidad debe ser un entero entre 1 y 1000' });
    }

    try {
      const product = await productsClient.getProduct(productoId);
      if (product.status === 'not_found') {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      if (product.status === 'unavailable') {
        return res.status(503).json({ error: 'No se pudo validar el producto; el carrito no se modificó' });
      }

      const key = cartKey(usuarioId);
      await redis.multi()
        .hIncrBy(key, productoId, cantidad)
        .expire(key, CART_TTL_SECONDS)
        .exec();
      res.status(200).json({
        usuarioId,
        productoId,
        cantidad,
        ...(product.stale ? { degraded: true } : {}),
      });
    } catch (error) {
      reportRedisError(req, res, error);
    }
  });

  app.delete('/api/carritos/:usuarioId/productos/:productoId', requireScopes('cart:write'), requireCartOwner, async (req, res) => {
    const { usuarioId, productoId } = req.params;
    if (!isValidId(usuarioId) || !isValidId(productoId)) {
      return res.status(400).json({ error: 'usuarioId y productoId deben ser válidos' });
    }

    try {
      const key = cartKey(usuarioId);
      await redis.multi()
        .hDel(key, productoId)
        .expire(key, CART_TTL_SECONDS)
        .exec();
      res.status(204).end();
    } catch (error) {
      reportRedisError(req, res, error);
    }
  });

  app.delete('/api/carritos/:usuarioId', requireScopes('cart:write'), requireCartOwner, async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidId(usuarioId)) {
      return res.status(400).json({ error: 'usuarioId inválido' });
    }

    try {
      await redis.del(cartKey(usuarioId));
      res.status(204).end();
    } catch (error) {
      reportRedisError(req, res, error);
    }
  });

  return app;
}

function cartKey(usuarioId) {
  return `cart:${usuarioId}`;
}

function isValidId(value) {
  return ID_PATTERN.test(value);
}

function reportRedisError(req, res, error) {
  req.log.error({ err: error }, 'Error al acceder a Redis');
  res.status(503).json({ error: 'No se pudo completar la operación del carrito' });
}

module.exports = { createApp };
