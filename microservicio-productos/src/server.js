require('./telemetry');

const { createApp } = require('./app');
const { logger } = require('./observability');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Microservicio de productos iniciado');
});
