require('./telemetry');

const { createClient } = require('redis');
const { createApp } = require('./app');
const { logger } = require('./observability');
const fs = require('node:fs');

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD_PATH
  ? fs.readFileSync(process.env.REDIS_PASSWORD_PATH, 'utf8').trim()
  : process.env.REDIS_PASSWORD;
const redis = createClient({ url: REDIS_URL, password: redisPassword });

redis.on('error', (error) => {
  logger.error({ err: error }, 'Error de conexión con Redis');
});

async function start() {
  await redis.connect();
  const app = createApp(redis);
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Microservicio de carrito iniciado');
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, 'No se pudo iniciar el microservicio de carrito');
  process.exit(1);
});
