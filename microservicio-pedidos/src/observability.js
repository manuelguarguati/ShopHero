const pino = require('pino');
const pinoHttp = require('pino-http');
const promClient = require('prom-client');
const { context, trace } = require('@opentelemetry/api');

const logger = pino({ level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info') });
const registry = new promClient.Registry();
registry.setDefaultLabels({ service: process.env.OTEL_SERVICE_NAME || 'pedidos' });
promClient.collectDefaultMetrics({ register: registry });

const requests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});
const duration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2],
  registers: [registry],
});
const ordersTotal = new promClient.Counter({
  name: 'shophero_orders_total',
  help: 'Total confirmed ShopHero orders',
  labelNames: ['metodo_pago'],
  registers: [registry],
});
const ordersRevenue = new promClient.Counter({
  name: 'shophero_orders_revenue_cop_total',
  help: 'Total confirmed order value in COP',
  registers: [registry],
});

const requestLogger = pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
  },
  customProps() {
    const span = trace.getSpan(context.active());
    const spanContext = span && span.spanContext();
    return spanContext
      ? { trace_id: spanContext.traceId, span_id: spanContext.spanId }
      : {};
  },
});

function measureRequests(req, res, next) {
  if (req.path === '/metrics') return next();

  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    requests.inc(labels);
    duration.observe(labels, seconds);
  });
  next();
}

async function exposeMetrics(_req, res) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

function observeOrder(total, metodoPago = 'Tarjeta') {
  ordersTotal.inc({ metodo_pago: metodoPago });
  if (Number.isFinite(total) && total > 0) {
    ordersRevenue.inc(total);
  }
}

module.exports = { exposeMetrics, logger, measureRequests, observeOrder, requestLogger };
