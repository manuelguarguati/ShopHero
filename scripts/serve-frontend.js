/**
 * Servidor ligero de desarrollo y previsualización para el frontend de ShopHero.
 *
 *   node scripts/serve-frontend.js      →  http://localhost:5000
 *
 * - Sirve los archivos estáticos de frontend/.
 * - Reenvía /health y /api/* al API Gateway (http://localhost:8080 por defecto).
 * - Si el Gateway no responde, contesta con datos simulados en memoria ("modo demo")
 *   y marca cada respuesta con la cabecera `X-ShopHero-Mock: 1` para que la interfaz
 *   lo indique. El modo demo simula scopes, rol admin y dueño del carrito leyendo los
 *   claims del JWT, pero NO verifica firma ni expiración.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.FRONTEND_PORT) || 5000;
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
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// Cabeceras que no deben copiarse al reenviar una respuesta ya decodificada por fetch.
const HOP_BY_HOP = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);

// ---------------------------------------------------------------------------
// Datos simulados (solo en memoria)
// ---------------------------------------------------------------------------
const mockProducts = [
  { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000 },
  { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000 },
  { id: 3, nombre: 'Audífonos Gamer Pro 7.1', precio: 180000 },
  { id: 4, nombre: 'Monitor 27" 165 Hz', precio: 890000 },
  { id: 5, nombre: 'Control Inalámbrico', precio: 210000 },
];

const mockCarts = {
  usuario_1: new Map([['1', 1]]),
  usuario_2: new Map(),
  admin: new Map(),
};

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];

  if (pathname === '/health' || pathname.startsWith('/health/') || pathname.startsWith('/api/')) {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req).catch(() => Buffer.alloc(0)) : undefined;

    try {
      const headers = { ...req.headers };
      delete headers.host;
      const upstream = await fetch(`${GATEWAY_URL}${req.url}`, {
        method: req.method,
        headers,
        body,
        signal: AbortSignal.timeout(1500),
      });
      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => {
        if (!HOP_BY_HOP.has(key)) res.setHeader(key, value);
      });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      handleMockApi(req, res, pathname, body);
    }
    return;
  }

  serveStatic(pathname, res);
});

function serveStatic(pathname, res) {
  let relative;
  try {
    relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    res.writeHead(400).end('Ruta inválida');
    return;
  }
  const filePath = path.join(FRONTEND_DIR, relative);
  if (filePath !== FRONTEND_DIR && !filePath.startsWith(FRONTEND_DIR + path.sep)) {
    res.writeHead(403).end('Acceso denegado');
    return;
  }

  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(FRONTEND_DIR, 'index.html');
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.json' || ext === '.html' ? 'no-store' : 'no-cache',
  });
  fs.createReadStream(target).pipe(res);
}

// ---------------------------------------------------------------------------
// API simulada
// ---------------------------------------------------------------------------
function send(res, status, payload) {
  const headers = { 'X-ShopHero-Mock': '1' };
  if (payload === undefined) {
    res.writeHead(status, headers).end();
    return;
  }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  res.writeHead(status, headers).end(JSON.stringify(payload));
}

/** Lee los claims del JWT sin verificar la firma (solo para la demo). */
function readClaims(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) return null;
  try {
    const payload = JSON.parse(Buffer.from(match[1].split('.')[1], 'base64url').toString('utf8'));
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      scopes: typeof payload.scope === 'string' ? payload.scope.split(/\s+/) : [],
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  } catch {
    return null;
  }
}

const hasScope = (auth, scope) => auth.roles.includes('admin') || auth.scopes.includes(scope);

function parseJson(buffer) {
  try {
    return JSON.parse(buffer ? buffer.toString('utf8') : '{}') || {};
  } catch {
    return {};
  }
}

function handleMockApi(req, res, pathname, bodyData) {
  if (pathname === '/health') {
    send(res, 200, { estado: 'demo' });
    return;
  }

  const auth = readClaims(req);
  if (!auth) {
    send(res, 401, { error: 'Se requiere un token Bearer válido' });
    return;
  }

  // --- Productos ---------------------------------------------------------
  const productMatch = /^\/api\/productos(?:\/([^/]+))?$/.exec(pathname);
  if (productMatch) {
    const [, id] = productMatch;
    if (req.method === 'GET') {
      if (!hasScope(auth, 'products:read')) return send(res, 403, { error: 'Permisos insuficientes' });
      if (!id) return send(res, 200, mockProducts);
      const product = mockProducts.find((p) => p.id === Number(id));
      return product ? send(res, 200, product) : send(res, 404, { error: 'Producto no encontrado' });
    }
    if (req.method === 'POST' && !id) {
      if (!hasScope(auth, 'products:write')) return send(res, 403, { error: 'Permisos insuficientes' });
      const { nombre, precio } = parseJson(bodyData);
      if (!nombre || typeof precio !== 'number') {
        return send(res, 400, { error: 'nombre (string) y precio (number) son obligatorios' });
      }
      const nuevo = { id: Math.max(0, ...mockProducts.map((p) => p.id)) + 1, nombre, precio };
      mockProducts.push(nuevo);
      return send(res, 201, nuevo);
    }
  }

  // --- Carritos ----------------------------------------------------------
  const cartMatch = /^\/api\/carritos\/([^/]+)(?:\/productos(?:\/([^/]+))?)?$/.exec(pathname);
  if (cartMatch) {
    const usuarioId = decodeURIComponent(cartMatch[1]);
    const productoId = cartMatch[2] && decodeURIComponent(cartMatch[2]);
    const isItemsRoute = pathname.includes('/productos');
    const needed = req.method === 'GET' ? 'cart:read' : 'cart:write';

    if (!hasScope(auth, needed)) return send(res, 403, { error: 'Permisos insuficientes' });
    if (!auth.roles.includes('admin') && auth.sub !== usuarioId) {
      return send(res, 403, { error: 'No se permite acceder al carrito de otro usuario' });
    }
    if (!ID_PATTERN.test(usuarioId)) return send(res, 400, { error: 'usuarioId inválido' });

    const cart = mockCarts[usuarioId] || (mockCarts[usuarioId] = new Map());

    if (req.method === 'GET' && !isItemsRoute) {
      return send(res, 200, {
        usuarioId,
        productos: [...cart].map(([id, cantidad]) => ({ productoId: id, cantidad })),
      });
    }

    if (req.method === 'POST' && isItemsRoute && !productoId) {
      const body = parseJson(bodyData);
      const id = String(body.productoId || '');
      if (!ID_PATTERN.test(id)) return send(res, 400, { error: 'usuarioId y productoId deben ser válidos' });
      if (!Number.isInteger(body.cantidad) || body.cantidad < 1 || body.cantidad > 1000) {
        return send(res, 400, { error: 'cantidad debe ser un entero entre 1 y 1000' });
      }
      if (!mockProducts.some((p) => String(p.id) === id)) return send(res, 404, { error: 'Producto no encontrado' });
      cart.set(id, (cart.get(id) || 0) + body.cantidad);
      return send(res, 200, { usuarioId, productoId: id, cantidad: body.cantidad });
    }

    if (req.method === 'DELETE') {
      if (productoId) cart.delete(productoId);
      else if (!isItemsRoute) cart.clear();
      else return send(res, 404, { error: 'Ruta no encontrada' });
      return send(res, 204);
    }
  }

  send(res, 404, { error: 'Ruta no encontrada' });
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
  console.log('\n======================================================');
  console.log(`🚀 ShopHero Frontend listo en: http://localhost:${PORT}`);
  console.log(`   Gateway: ${GATEWAY_URL} (si no responde se usa el modo demo)`);
  console.log('======================================================\n');
});
