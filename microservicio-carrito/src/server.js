const { createClient } = require('redis');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });

redis.on('error', (error) => {
  console.error('Error de conexión con Redis:', error);
});

async function start() {
  await redis.connect();
  const app = createApp(redis);
  app.listen(PORT, () => {
    console.log(`Microservicio de carrito escuchando en el puerto ${PORT}`);
  });
}

start().catch((error) => {
  console.error('No se pudo iniciar el microservicio de carrito:', error);
  process.exit(1);
});
