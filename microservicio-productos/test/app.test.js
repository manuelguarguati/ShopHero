const request = require('supertest');
const { createApp } = require('../src/app');
const { issueToken, TEST_SECRET } = require('./auth-helpers');

let app;
beforeEach(() => {
  app = createApp({ jwtSecret: TEST_SECRET });
  app.resetProductos();
});

describe('GET /health', () => {
  it('responde 200 y estado ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });
});

describe('GET /metrics', () => {
  it('expone métricas Prometheus HTTP y del proceso Node', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toContain('process_resident_memory_bytes');
  });
});

describe('API de productos', () => {
  it('lista los productos', async () => {
    const token = await issueToken(['products:read']);
    const res = await request(app).get('/api/productos').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('obtiene un producto por id', async () => {
    const token = await issueToken(['products:read']);
    const res = await request(app).get('/api/productos/1').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe('Teclado');
  });

  it('devuelve 404 si el producto no existe', async () => {
    const token = await issueToken(['products:read']);
    const res = await request(app).get('/api/productos/999').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('crea un producto válido', async () => {
    const token = await issueToken(['products:write']);
    const res = await request(app).post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Monitor', precio: 500000 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ id: 3, nombre: 'Monitor', precio: 500000 });
  });

  it('rechaza un producto inválido con 400', async () => {
    const token = await issueToken(['products:write']);
    const res = await request(app).post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Sin precio' });
    expect(res.statusCode).toBe(400);
  });

  it('no permite escribir con un scope de solo lectura', async () => {
    const token = await issueToken(['products:read']);
    const res = await request(app).post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Monitor', precio: 500000 });
    expect(res.statusCode).toBe(403);
  });

  it('rechaza tokens ausentes, inválidos y expirados', async () => {
    const absent = await request(app).get('/api/productos');
    const invalid = await request(app).get('/api/productos').set('Authorization', 'Bearer invalid');
    const expiredToken = await issueToken(['products:read'], { expiresAt: Math.floor(Date.now() / 1000) - 60 });
    const expired = await request(app).get('/api/productos').set('Authorization', `Bearer ${expiredToken}`);

    expect(absent.statusCode).toBe(401);
    expect(invalid.statusCode).toBe(401);
    expect(expired.statusCode).toBe(401);
  });

  it('rechaza tokens con issuer o audience incorrectos', async () => {
    const wrongIssuer = await issueToken(['products:read'], { issuer: 'other-issuer' });
    const wrongAudience = await issueToken(['products:read'], { audience: 'other-api' });

    const issuerResponse = await request(app).get('/api/productos')
      .set('Authorization', `Bearer ${wrongIssuer}`);
    const audienceResponse = await request(app).get('/api/productos')
      .set('Authorization', `Bearer ${wrongAudience}`);

    expect(issuerResponse.statusCode).toBe(401);
    expect(audienceResponse.statusCode).toBe(401);
  });

  it('actualiza y elimina un producto con products:write', async () => {
    const token = await issueToken(['products:write', 'products:read']);
    const patchRes = await request(app).patch('/api/productos/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 12, precio: 115000 });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body).toMatchObject({ id: 1, stock: 12, precio: 115000 });

    const delRes = await request(app).delete('/api/productos/1')
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.statusCode).toBe(204);

    const getRes = await request(app).get('/api/productos/1')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(404);
  });

  it('responde 503 en /health si la base de datos falla', async () => {
    const failingApp = createApp({
      jwtSecret: TEST_SECRET,
      store: {
        ping: async () => { throw new Error('db down'); },
        list: async () => { throw new Error('db down'); },
      },
    });
    const healthRes = await request(failingApp).get('/health');
    expect(healthRes.statusCode).toBe(503);
  });
});
