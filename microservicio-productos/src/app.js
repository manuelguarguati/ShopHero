const express = require('express');
const { exposeMetrics, measureRequests, requestLogger } = require('./observability');
const { createJwtAuth, requireScopes } = require('./auth');

const INITIAL_PRODUCTS = [
  { id: 1, nombre: 'Teclado', precio: 120000 },
  { id: 2, nombre: 'Mouse', precio: 60000 },
];

function createApp({ jwtSecret } = {}) {
  const app = express();
  let products = [...INITIAL_PRODUCTS];
  app.use(express.json());
  app.use(requestLogger);
  app.use(measureRequests);
  app.use(createJwtAuth(jwtSecret));

  app.get('/health', (req, res) => {
    res.status(200).json({ estado: 'ok' });
  });

  app.get('/metrics', exposeMetrics);

  app.get('/api/productos', requireScopes('products:read'), (req, res) => {
    res.json(products);
  });

  app.get('/api/productos/:id', requireScopes('products:read'), (req, res) => {
    const producto = products.find((p) => p.id === Number(req.params.id));
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  });

  app.post('/api/productos', requireScopes('products:write'), (req, res) => {
    const { nombre, precio } = req.body;
    if (!nombre || typeof precio !== 'number') {
      return res.status(400).json({ error: 'nombre (string) y precio (number) son obligatorios' });
    }
    const nuevo = { id: products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1, nombre, precio };
    products.push(nuevo);
    res.status(201).json(nuevo);
  });

  app.resetProductos = () => {
    products = [...INITIAL_PRODUCTS];
  };

  return app;
}

module.exports = { createApp };
