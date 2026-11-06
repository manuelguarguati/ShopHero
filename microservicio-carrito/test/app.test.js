const request = require('supertest');
const { createApp } = require('../src/app');
const { issueToken, TEST_SECRET } = require('./auth-helpers');

function createRedisMock() {
  const redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    hGetAll: jest.fn().mockResolvedValue({ teclado: '2' }),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    multi: jest.fn(),
  };
  const transaction = {
    hIncrBy: jest.fn(),
    hDel: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  transaction.hIncrBy.mockReturnValue(transaction);
  transaction.hDel.mockReturnValue(transaction);
  transaction.expire.mockReturnValue(transaction);
  redis.multi.mockReturnValue(transaction);
  return { redis, transaction };
}

function createTestApp(redis, productsClient = {
  getProduct: jest.fn().mockResolvedValue({ status: 'found', product: { id: 1 }, stale: false }),
}) {
  return createApp(redis, { jwtSecret: TEST_SECRET, productsClient });
}

describe('API de carrito', () => {
  it('expone métricas Prometheus HTTP y del proceso Node', async () => {
    const { redis } = createRedisMock();
    await request(createTestApp(redis)).get('/health');
    const response = await request(createTestApp(redis)).get('/metrics');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
    expect(response.text).toContain('http_request_duration_seconds_bucket');
    expect(response.text).toContain('process_resident_memory_bytes');
  });

  it('comprueba que Redis está disponible', async () => {
    const { redis } = createRedisMock();
    const response = await request(createTestApp(redis)).get('/health');

    expect(response.statusCode).toBe(200);
    expect(redis.ping).toHaveBeenCalled();
  });

  it('recupera el carrito desde Redis', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:read']);
    const response = await request(createTestApp(redis))
      .get('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      usuarioId: 'usuario_1',
      productos: [{ productoId: 'teclado', cantidad: 2 }],
    });
  });

  it('agrega unidades y renueva el TTL de 30 días', async () => {
    const { redis, transaction } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const productsClient = { getProduct: jest.fn().mockResolvedValue({ status: 'found', product: { id: 1 }, stale: false }) };
    const response = await request(createTestApp(redis, productsClient))
      .post('/api/carritos/usuario_1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ productoId: 'teclado', cantidad: 2 });

    expect(response.statusCode).toBe(200);
    expect(productsClient.getProduct).toHaveBeenCalledWith('teclado');
    expect(transaction.hIncrBy).toHaveBeenCalledWith('cart:usuario_1', 'teclado', 2);
    expect(transaction.expire).toHaveBeenCalledWith('cart:usuario_1', 2592000);
  });

  it('rechaza cantidades inválidas', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const response = await request(createTestApp(redis))
      .post('/api/carritos/usuario_1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ productoId: 'teclado', cantidad: 0 });

    expect(response.statusCode).toBe(400);
    expect(redis.multi).not.toHaveBeenCalled();
  });

  it('elimina un producto de forma atómica y renueva el TTL', async () => {
    const { redis, transaction } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const response = await request(createTestApp(redis))
      .delete('/api/carritos/usuario_1/productos/teclado')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(transaction.hDel).toHaveBeenCalledWith('cart:usuario_1', 'teclado');
    expect(transaction.expire).toHaveBeenCalledWith('cart:usuario_1', 2592000);
  });

  it('elimina el carrito del usuario', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const response = await request(createTestApp(redis))
      .delete('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(redis.del).toHaveBeenCalledWith('cart:usuario_1');
  });

  it('rechaza tokens ausentes, inválidos y expirados', async () => {
    const { redis } = createRedisMock();
    const app = createTestApp(redis);
    const absent = await request(app).get('/api/carritos/usuario_1');
    const invalid = await request(app).get('/api/carritos/usuario_1').set('Authorization', 'Bearer invalid');
    const expiredToken = await issueToken(['cart:read'], { expiresAt: Math.floor(Date.now() / 1000) - 60 });
    const expired = await request(app).get('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(absent.statusCode).toBe(401);
    expect(invalid.statusCode).toBe(401);
    expect(expired.statusCode).toBe(401);
    expect(redis.hGetAll).not.toHaveBeenCalled();
  });

  it('rechaza tokens con issuer o audience incorrectos', async () => {
    const { redis } = createRedisMock();
    const app = createTestApp(redis);
    const wrongIssuer = await issueToken(['cart:read'], { issuer: 'other-issuer' });
    const wrongAudience = await issueToken(['cart:read'], { audience: 'other-api' });

    const issuerResponse = await request(app).get('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${wrongIssuer}`);
    const audienceResponse = await request(app).get('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${wrongAudience}`);

    expect(issuerResponse.statusCode).toBe(401);
    expect(audienceResponse.statusCode).toBe(401);
  });

  it('requiere scopes de carrito para autorizar operaciones', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['products:read']);
    const response = await request(createTestApp(redis))
      .get('/api/carritos/usuario_1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(redis.hGetAll).not.toHaveBeenCalled();
  });

  it('impide consultar carritos de otros usuarios aunque el token tenga scope', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:read']);
    const response = await request(createTestApp(redis))
      .get('/api/carritos/otra_persona')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(redis.hGetAll).not.toHaveBeenCalled();
  });

  it('no persiste productos inexistentes', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const productsClient = { getProduct: jest.fn().mockResolvedValue({ status: 'not_found' }) };
    const { transaction } = createRedisMock();
    const response = await request(createTestApp(redis, productsClient))
      .post('/api/carritos/usuario_1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ productoId: '999', cantidad: 2 });

    expect(response.statusCode).toBe(404);
    expect(transaction.hIncrBy).not.toHaveBeenCalled();
    expect(redis.multi).not.toHaveBeenCalled();
  });

  it('no modifica Redis si Productos no está disponible sin caché', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const productsClient = { getProduct: jest.fn().mockResolvedValue({ status: 'unavailable' }) };
    const response = await request(createTestApp(redis, productsClient))
      .post('/api/carritos/usuario_1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ productoId: '1', cantidad: 2 });

    expect(response.statusCode).toBe(503);
    expect(redis.multi).not.toHaveBeenCalled();
  });

  it('permite persistir con caché degradada marcada', async () => {
    const { redis } = createRedisMock();
    const token = await issueToken(['cart:write']);
    const productsClient = { getProduct: jest.fn().mockResolvedValue({ status: 'found', stale: true }) };
    const response = await request(createTestApp(redis, productsClient))
      .post('/api/carritos/usuario_1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ productoId: '1', cantidad: 2 });

    expect(response.statusCode).toBe(200);
    expect(response.body.degraded).toBe(true);
    expect(redis.multi).toHaveBeenCalled();
  });
});
