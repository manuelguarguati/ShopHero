const request = require('supertest');
const app = require('../src/app');

beforeEach(() => app.resetProductos());

describe('GET /health', () => {
  it('responde 200 y estado ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });
});

describe('API de productos', () => {
  it('lista los productos', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('obtiene un producto por id', async () => {
    const res = await request(app).get('/api/productos/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe('Teclado');
  });

  it('devuelve 404 si el producto no existe', async () => {
    const res = await request(app).get('/api/productos/999');
    expect(res.statusCode).toBe(404);
  });

  it('crea un producto válido', async () => {
    const res = await request(app).post('/api/productos').send({ nombre: 'Monitor', precio: 500000 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ id: 3, nombre: 'Monitor', precio: 500000 });
  });

  it('rechaza un producto inválido con 400', async () => {
    const res = await request(app).post('/api/productos').send({ nombre: 'Sin precio' });
    expect(res.statusCode).toBe(400);
  });
});
