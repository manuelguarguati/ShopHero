FROM node:20-alpine

WORKDIR /app

# Instalar solo dependencias de producción (aprovecha la caché de capas)
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=3000
EXPOSE 3000

# Ejecutar como usuario sin privilegios
USER node

CMD ["node", "src/server.js"]
