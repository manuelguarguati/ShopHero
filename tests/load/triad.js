import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const mode = __ENV.MODE || 'prime';
const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
const token = __ENV.TOKEN;
const userId = __ENV.USER_ID || 'usuario_1';
const rateLimitResponses = new Counter('rate_limit_429');

if (!token) {
  throw new Error('Define TOKEN con un JWT local válido.');
}

const thresholds = {
  http_req_duration: ['p(95)<500'],
  checks: ['rate>0.95'],
};
if (mode === 'rate-limit') {
  thresholds.rate_limit_429 = ['count>0'];
}

export const options = {
  scenarios: {
    shophero: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || (mode === 'rate-limit' ? 300 : 10)),
      timeUnit: '1s',
      duration: __ENV.DURATION || '10s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds,
};

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

export function setup() {
  if (mode !== 'prime' && mode !== 'rate-limit') return;
  const response = http.post(
    `${baseUrl}/api/carritos/${userId}/productos`,
    JSON.stringify({ productoId: '1', cantidad: 1 }),
    { headers },
  );
  check(response, { 'producto cacheado para modo degradado': (res) => res.status === 200 });
}

export default function () {
  if (mode === 'rate-limit') {
    const response = http.get(`${baseUrl}/api/carritos/${userId}`, { headers });
    if (response.status === 429) rateLimitResponses.add(1);
    check(response, { 'respuesta normal o 429 del rate limit': (res) => res.status === 200 || res.status === 429 });
    return;
  }

  const response = http.post(
    `${baseUrl}/api/carritos/${userId}/productos`,
    JSON.stringify({ productoId: '1', cantidad: 1 }),
    { headers },
  );
  const degraded = response.status === 200 && response.json('degraded') === true;
  const healthy = response.status === 200 && !degraded;

  if (mode === 'outage') {
    check(response, { 'fallback de caché tras detener productos': () => degraded });
  } else if (mode === 'recovery') {
    check(response, { 'Productos recuperado y breaker cerrado': () => healthy });
  } else {
    check(response, { 'flujo normal del carrito': () => healthy });
  }
}
