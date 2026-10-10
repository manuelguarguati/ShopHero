const request = require('supertest');
const { createApp } = require('../src/app');

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

describe('API de carrito', () => {
  it('comprueba que Redis está disponible', async () => {
    const { redis } = createRedisMock();
    const response = await request(createApp(redis)).get('/health');

    expect(response.statusCode).toBe(200);
    expect(redis.ping).toHaveBeenCalled();
  });

  it('recupera el carrito desde Redis', async () => {
    const { redis } = createRedisMock();
    const response = await request(createApp(redis)).get('/api/carritos/usuario_1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      usuarioId: 'usuario_1',
      productos: [{ productoId: 'teclado', cantidad: 2 }],
    });
  });

  it('agrega unidades y renueva el TTL de 30 días', async () => {
    const { redis, transaction } = createRedisMock();
    const response = await request(createApp(redis))
      .post('/api/carritos/usuario_1/productos')
      .send({ productoId: 'teclado', cantidad: 2 });

    expect(response.statusCode).toBe(200);
    expect(transaction.hIncrBy).toHaveBeenCalledWith('cart:usuario_1', 'teclado', 2);
    expect(transaction.expire).toHaveBeenCalledWith('cart:usuario_1', 2592000);
  });

  it('rechaza cantidades inválidas', async () => {
    const { redis } = createRedisMock();
    const response = await request(createApp(redis))
      .post('/api/carritos/usuario_1/productos')
      .send({ productoId: 'teclado', cantidad: 0 });

    expect(response.statusCode).toBe(400);
    expect(redis.multi).not.toHaveBeenCalled();
  });

  it('elimina un producto de forma atómica y renueva el TTL', async () => {
    const { redis, transaction } = createRedisMock();
    const response = await request(createApp(redis))
      .delete('/api/carritos/usuario_1/productos/teclado');

    expect(response.statusCode).toBe(204);
    expect(transaction.hDel).toHaveBeenCalledWith('cart:usuario_1', 'teclado');
    expect(transaction.expire).toHaveBeenCalledWith('cart:usuario_1', 2592000);
  });

  it('elimina el carrito del usuario', async () => {
    const { redis } = createRedisMock();
    const response = await request(createApp(redis)).delete('/api/carritos/usuario_1');

    expect(response.statusCode).toBe(204);
    expect(redis.del).toHaveBeenCalledWith('cart:usuario_1');
  });
});
