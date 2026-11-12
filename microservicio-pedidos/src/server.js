require('./telemetry');

const fs = require('node:fs');
const { Pool } = require('pg');
const { createApp } = require('./app');
const { createPostgresOrderStore } = require('./store');
const { logger } = require('./observability');

const PORT = process.env.PORT || 3002;

async function initStore() {
  const password = process.env.POSTGRES_PASSWORD_PATH
    ? fs.readFileSync(process.env.POSTGRES_PASSWORD_PATH, 'utf8').trim()
    : process.env.POSTGRES_PASSWORD;

  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.POSTGRES_HOST || 'postgres',
          port: Number(process.env.POSTGRES_PORT || 5432),
          user: process.env.POSTGRES_USER || 'shophero',
          database: process.env.POSTGRES_DB || 'shophero',
          password,
        },
  );

  pool.on('error', (err) => {
    logger.error({ err }, 'Error en pool de PostgreSQL');
  });

  const store = createPostgresOrderStore(pool);
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await store.init();
      logger.info('Pedidos conectado e inicializado en PostgreSQL');
      return store;
    } catch (error) {
      logger.warn({ attempt, err: error.message }, 'Esperando disponibilidad de PostgreSQL...');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('No se pudo inicializar PostgreSQL tras múltiples intentos');
}

async function start() {
  const store = await initStore();
  const app = createApp({ store });
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Microservicio de pedidos iniciado');
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, 'No se pudo iniciar el microservicio de pedidos');
  process.exit(1);
});
