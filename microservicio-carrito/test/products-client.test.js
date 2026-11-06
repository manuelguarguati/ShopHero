const { createProductsClient } = require('../src/products-client');
const { observeCircuitBreaker } = require('../src/observability');

function productResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('cliente resiliente de productos', () => {
  it('reintenta una consulta idempotente y valida con autenticación de servicio', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('transient'), { cause: { code: 'ECONNRESET' } }))
      .mockResolvedValueOnce(productResponse(200, { id: 1 }));
    const createToken = jest.fn().mockResolvedValue('service-jwt');
    const client = createProductsClient({ fetchImpl, createToken, random: () => 0 });

    const result = await client.getProduct('1');

    expect(result).toEqual({ status: 'found', product: { id: 1 }, stale: false });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer service-jwt', Accept: 'application/json' },
    });
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('devuelve producto en caché marcado como obsoleto durante una falla', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(productResponse(200, { id: 1, nombre: 'Teclado' }))
      .mockRejectedValue(Object.assign(new Error('unavailable'), { cause: { code: 'ECONNREFUSED' } }));
    const client = createProductsClient({
      fetchImpl,
      createToken: jest.fn().mockResolvedValue('service-jwt'),
      random: () => 0,
    });

    expect(await client.getProduct('1')).toMatchObject({ status: 'found', stale: false });
    expect(await client.getProduct('1')).toEqual({
      status: 'found',
      product: { id: 1, nombre: 'Teclado' },
      stale: true,
    });
  });

  it('falla cerrado cuando no hay caché y Productos no responde', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValue(Object.assign(new Error('unavailable'), { cause: { code: 'ECONNREFUSED' } }));
    const client = createProductsClient({
      fetchImpl,
      createToken: jest.fn().mockResolvedValue('service-jwt'),
      random: () => 0,
    });

    expect(await client.getProduct('1')).toEqual({ status: 'unavailable' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('abre el breaker después de fallas y se recupera en half-open', async () => {
    let available = false;
    const fetchImpl = jest.fn(async () => {
      if (!available) {
        throw Object.assign(new Error('unavailable'), { cause: { code: 'ECONNREFUSED' } });
      }
      return productResponse(200, { id: 1 });
    });
    const client = createProductsClient({
      fetchImpl,
      createToken: jest.fn().mockResolvedValue('service-jwt'),
      random: () => 0,
      breakerOptions: { volumeThreshold: 1, resetTimeout: 50 },
    });

    expect(await client.getProduct('1')).toEqual({ status: 'unavailable' });
    expect(client.breaker.opened).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await new Promise((resolve) => setTimeout(resolve, 60));
    available = true;
    expect(await client.getProduct('1')).toMatchObject({ status: 'found', stale: false });
    expect(client.breaker.closed).toBe(true);
  });

  it('no reintenta errores definitivos como un producto inexistente', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(productResponse(404, {}));
    const client = createProductsClient({
      fetchImpl,
      createToken: jest.fn().mockResolvedValue('service-jwt'),
    });

    expect(await client.getProduct('999')).toEqual({ status: 'not_found' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
