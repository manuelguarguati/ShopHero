const express = require('express');

const app = express();
app.use(express.json());

// "Base de datos" en memoria (suficiente para el ejercicio)
let productos = [
  { id: 1, nombre: 'Teclado', precio: 120000 },
  { id: 2, nombre: 'Mouse', precio: 60000 },
];

// Health check: lo usan Kubernetes (probes) y el pipeline
app.get('/health', (req, res) => {
  res.status(200).json({ estado: 'ok' });
});

app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.get('/api/productos/:id', (req, res) => {
  const producto = productos.find((p) => p.id === Number(req.params.id));
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

app.post('/api/productos', (req, res) => {
  const { nombre, precio } = req.body;
  if (!nombre || typeof precio !== 'number') {
    return res.status(400).json({ error: 'nombre (string) y precio (number) son obligatorios' });
  }
  const nuevo = { id: productos.length ? Math.max(...productos.map((p) => p.id)) + 1 : 1, nombre, precio };
  productos.push(nuevo);
  res.status(201).json(nuevo);
});

// Utilidad solo para pruebas
app.resetProductos = () => {
  productos = [
    { id: 1, nombre: 'Teclado', precio: 120000 },
    { id: 2, nombre: 'Mouse', precio: 60000 },
  ];
};

module.exports = app;
