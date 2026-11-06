const CircuitBreaker = require('opossum');
const { createServiceToken } = require('./auth');
const { logger, observeCircuitBreaker } = require('./observability');

const PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000;
const RETRIES = 2;
const INITIAL_BACKOFF_MS = 25;

class ProductLookupError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'ProductLookupError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function createProductsClient({
  baseUrl = process.env.PRODUCTOS_URL || 'http://localhost:3000',
  fetchImpl = fetch,
  createToken = createServiceToken,
  now = Date.now,
  random = Math.random,
  breakerOptions = {},
} = {}) {
  const cache = new Map();

  async function requestProduct(productId) {
    for (let attempt = 0; ; attempt++) {
      try {
        const token = await createToken();
        const response = await fetchImpl(`${baseUrl}/api/productos/${encodeURIComponent(productId)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(150),
        });

        if (response.status === 404) {
          return { status: 'not_found' };
        }
        if (response.status === 429 || response.status >= 500) {
          throw new ProductLookupError('Productos respondió con error transitorio', 'TRANSIENT_HTTP', response.status);
        }
        if (!response.ok) {
          throw new ProductLookupError('Productos rechazó la consulta', 'UPSTREAM_HTTP', response.status);
        }

        const product = await response.json();
        cache.set(String(productId), { product, expiresAt: now() + PRODUCT_CACHE_TTL_MS });
        return { status: 'found', product, stale: false };
      } catch (error) {
        const retryable = error.name === 'TimeoutError'
          || error.name === 'AbortError'
          || error.code === 'TRANSIENT_HTTP'
          || error.cause?.code === 'ECONNREFUSED'
          || error.cause?.code === 'ECONNRESET'
          || error.cause?.code === 'EAI_AGAIN'
          || error.cause?.code === 'ETIMEDOUT';
        if (!retryable || attempt >= RETRIES) {
          throw error;
        }
        const ceiling = INITIAL_BACKOFF_MS * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, ceiling + random() * ceiling));
      }
    }
  }

  const breaker = new CircuitBreaker(requestProduct, {
    timeout: 500,
    errorThresholdPercentage: 50,
    resetTimeout: 5000,
    volumeThreshold: 4,
    capacity: 20,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    ...breakerOptions,
  });
  breaker.fallback((productId, error) => {
    const cached = cache.get(String(productId));
    if (cached && cached.expiresAt > now()) {
      logger.warn({ product_id: productId, reason: error.code || error.name }, 'Validando producto desde caché degradada');
      return { status: 'found', product: cached.product, stale: true };
    }
    if (cached) cache.delete(String(productId));
    return { status: 'unavailable' };
  });
  breaker.on('open', () => {
    observeCircuitBreaker('productos', 'open');
    logger.warn('Circuit breaker de productos abierto');
  });
  breaker.on('halfOpen', () => {
    observeCircuitBreaker('productos', 'half-open');
    logger.info('Circuit breaker de productos en half-open');
  });
  breaker.on('close', () => {
    observeCircuitBreaker('productos', 'closed');
    logger.info('Circuit breaker de productos cerrado');
  });
  observeCircuitBreaker('productos', 'closed');

  return {
    breaker,
    async getProduct(productId) {
      return breaker.fire(String(productId));
    },
  };
}

module.exports = { createProductsClient, ProductLookupError };
