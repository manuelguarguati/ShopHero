const express = require('express');
const { exposeMetrics, measureRequests, requestLogger } = require('./observability');
const { createJwtAuth, requireScopes } = require('./auth');
const { createMemoryStore } = require('./store');

function createApp({ jwtSecret, store = createMemoryStore() } = {}) {
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

  app.get('/api/productos', requireScopes('products:read'), async (req, res) => {
    try {
      res.json(await store.list());
    } catch (error) {
      req.log.error({ err: error }, 'Error listando productos');
      res.status(503).json({ error: 'No se pudo consultar el catálogo' });
    }
  });

  app.get('/api/productos/:id', requireScopes('products:read'), async (req, res) => {
    try {
      const producto = await store.getById(req.params.id);
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(producto);
    } catch (error) {
      req.log.error({ err: error }, 'Error consultando producto');
      res.status(503).json({ error: 'No se pudo consultar el producto' });
    }
  });

  app.post('/api/productos', requireScopes('products:write'), async (req, res) => {
    const { nombre, precio, stock, categoria, descripcion } = req.body || {};
    if (!nombre || typeof nombre !== 'string' || typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0) {
      return res.status(400).json({ error: 'nombre (string) y precio (number) son obligatorios' });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return res.status(400).json({ error: 'stock debe ser un entero mayor o igual a 0' });
    }

    try {
      const nuevo = await store.create({
        nombre: nombre.trim(),
        precio,
        stock: stock !== undefined ? stock : 25,
        categoria: typeof categoria === 'string' && categoria.trim() ? categoria.trim() : 'Accesorios',
        descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      });
      res.status(201).json(nuevo);
    } catch (error) {
      req.log.error({ err: error }, 'Error creando producto');
      res.status(503).json({ error: 'No se pudo guardar el producto' });
    }
  });

  app.patch('/api/productos/:id', requireScopes('products:write'), async (req, res) => {
    const { nombre, precio, stock, categoria, descripcion } = req.body || {};
    const fields = {};
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) return res.status(400).json({ error: 'nombre inválido' });
      fields.nombre = nombre.trim();
    }
    if (precio !== undefined) {
      if (typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0) return res.status(400).json({ error: 'precio inválido' });
      fields.precio = precio;
    }
    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'stock inválido' });
      fields.stock = stock;
    }
    if (categoria !== undefined) {
      if (typeof categoria !== 'string' || !categoria.trim()) return res.status(400).json({ error: 'categoria inválida' });
      fields.categoria = categoria.trim();
    }
    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string') return res.status(400).json({ error: 'descripcion inválida' });
      fields.descripcion = descripcion.trim();
    }

    try {
      const updated = await store.update(req.params.id, fields);
      if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(updated);
    } catch (error) {
      req.log.error({ err: error }, 'Error actualizando producto');
      res.status(503).json({ error: 'No se pudo actualizar el producto' });
    }
  });

  app.delete('/api/productos/:id', requireScopes('products:write'), async (req, res) => {
    try {
      const deleted = await store.remove(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, 'Error eliminando producto');
      res.status(503).json({ error: 'No se pudo eliminar el producto' });
    }
  });

  app.resetProductos = () => {
    if (typeof store.reset === 'function') store.reset();
  };

  return app;
}

module.exports = { createApp };
