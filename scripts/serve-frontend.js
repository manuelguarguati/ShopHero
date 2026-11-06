/**
 * Servidor ligero de desarrollo y previsualización para ShopHero Frontend
 * 
 * Permite previsualizar la interfaz del cliente en http://localhost:5000
 * Si Docker/Gateway (:8080) está corriendo, redirige las peticiones /api a él.
 * Si Gateway está detenido o falla, responde inmediatamente con datos mock offline (sin trabas ni cuelgues).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.FRONTEND_PORT || 5000;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Productos y carritos en memoria para previsualización offline sin bloqueos
const mockProducts = [
  { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, desc: 'Switches mecánicos Red, retroiluminación RGB por tecla.' },
  { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, desc: 'Sensor óptico 16.000 DPI, latencia ultra-baja 1ms.' },
  { id: 3, nombre: 'Audífonos Gamer Pro 7.1', precio: 180000, desc: 'Sonido envolvente 7.1 Surround, micrófono con cancelación de ruido.' },
];

const mockCart = {
  usuario_1: [
    { productoId: '1', cantidad: 2 },
    { productoId: '2', cantidad: 1 },
  ],
  usuario_2: [],
  admin: [],
};

const server = http.createServer(async (req, res) => {
  // Manejo de peticiones API
  if (req.url.startsWith('/api/')) {
    let bodyData = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        bodyData = await readBody(req);
      } catch (err) {
        bodyData = Buffer.from('{}');
      }
    }

    // Intentar consultar al Gateway NGINX con timeout corto (1.5s)
    try {
      const targetUrl = `${GATEWAY_URL}${req.url}`;
      const headers = { ...req.headers };
      delete headers.host;

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: bodyData,
        signal: AbortSignal.timeout(1500),
      });

      res.statusCode = proxyRes.status;
      proxyRes.headers.forEach((val, key) => res.setHeader(key, val));
      const resBuffer = await proxyRes.arrayBuffer();
      res.end(Buffer.from(resBuffer));
      return;
    } catch {
      // Modo Mock Offline inmediato si el Gateway no responde o se demora
      handleMockApi(req, res, bodyData);
      return;
    }
  }

  // Servir archivos estáticos de frontend/
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(FRONTEND_DIR, reqPath);

  // Seguridad de rutas
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.statusCode = 403;
    res.end('Acceso denegado');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const indexFile = path.join(FRONTEND_DIR, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexFile).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Archivo no encontrado');
    }
  }
});

function handleMockApi(req, res, bodyData) {
  const [pathname] = req.url.split('?');

  // Catálogo de Productos
  if (pathname === '/api/productos') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockProducts));
      return;
    }

    if (req.method === 'POST') {
      let body = {};
      try {
        body = JSON.parse(bodyData ? bodyData.toString('utf8') : '{}');
      } catch {}

      if (!body.nombre || typeof body.precio !== 'number') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'nombre (string) y precio (number) son obligatorios' }));
        return;
      }

      const nuevo = {
        id: mockProducts.length ? Math.max(...mockProducts.map((p) => p.id)) + 1 : 1,
        nombre: body.nombre,
        precio: body.precio,
        desc: body.desc || 'Producto ingresado manualmente desde la interfaz.',
      };
      mockProducts.push(nuevo);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(nuevo));
      return;
    }
  }

  // Operaciones de Carritos
  if (pathname.startsWith('/api/carritos/')) {
    const parts = pathname.split('/');
    const user = parts[3];

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        usuarioId: user,
        productos: mockCart[user] || [],
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = {};
      try {
        body = JSON.parse(bodyData ? bodyData.toString('utf8') : '{}');
      } catch {}

      if (!mockCart[user]) mockCart[user] = [];
      const prodId = String(body.productoId || '1');
      const cant = Number(body.cantidad || 1);

      const existing = mockCart[user].find((p) => String(p.productoId) === prodId);
      if (existing) {
        existing.cantidad += cant;
      } else {
        mockCart[user].push({ productoId: prodId, cantidad: cant });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ usuarioId: user, productoId: prodId, cantidad: cant }));
      return;
    }

    if (req.method === 'DELETE') {
      if (parts[4] === 'productos' && parts[5]) {
        if (mockCart[user]) {
          mockCart[user] = mockCart[user].filter((p) => String(p.productoId) !== String(parts[5]));
        }
      } else {
        mockCart[user] = [];
      }
      res.writeHead(204);
      res.end();
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 ShopHero Frontend listo en: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
