require('./telemetry');

const app = require('./app');
const { logger } = require('./observability');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Microservicio de productos iniciado');
});
