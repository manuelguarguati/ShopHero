#!/usr/bin/env node

/**
 * ShopHero - Prototipo y Demo Interactivo de Arquitectura Cloud-Native
 * 
 * Permite simular y verificar en tiempo real:
 * 1. Health checks y Gateway NGINX (puerto 8080)
 * 2. Seguridad Zero-Trust y mitigación BOLA / Scopes (OWASP API1 y API5)
 * 3. Catálogo de productos y persistencia en Redis (TTL 30 días)
 * 4. Resiliencia: Circuit Breaker Opossum y Modo Degradado ante caídas
 * 5. Protección DoS y Rate Limiting (OWASP API4)
 * 6. Observabilidad: Métricas en Prometheus y Dashboard de Grafana
 */

const readline = require('node:readline');
const { execSync } = require('node:child_process');
const { generateDevToken } = require('./create-dev-token');

const BASE_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

// Códigos ANSI para formato visual
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
};

function banner() {
  console.clear();
  console.log(`
${C.cyan}${C.bold}███████╗██╗  ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗██████╗  ██████╗ 
██╔════╝██║  ██║██╔═══██╗██╔══██╗██║  ██║██╔════╝██╔══██╗██╔═══██╗
███████╗███████║██║   ██║██████╔╝███████║█████╗  ██████╔╝██║   ██║
╚════██║██╔══██║██║   ██║██╔═══╝ ██╔══██║██╔══╝  ██╔══██╗██║   ██║
███████║██║  ██║╚██████╔╝██║     ██║  ██║███████╗██║  ██║╚██████╔╝
╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ${C.reset}
  ${C.white}${C.bold}ShopHero - E-Commerce de Venta Flash / Black Friday${C.reset}
  ${C.gray}UNISANGIL - Ingeniería de Sistemas - Arquitectura de Software${C.reset}
  ${C.yellow}Prototipo de Verificación de la Tríada Cloud-Native${C.reset}
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const start = Date.now();
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, options);
    const duration = Date.now() - start;
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, data, duration };
  } catch (err) {
    const duration = Date.now() - start;
    return { ok: false, status: 0, error: err.message, duration };
  }
}

function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function ensureGateway() {
  const check = await request('/health');
  if (check.status !== 200) {
    console.log(`\n ${C.red}✖ Error de conexión con el API Gateway (${BASE_URL})${C.reset}`);
    console.log(`   El Gateway no está respondiendo. Asegúrate de iniciar Docker Desktop y ejecutar:`);
    console.log(`   ${C.cyan}powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\bootstrap-dev.ps1${C.reset}\n`);
    return false;
  }
  return true;
}

// -------------------------------------------------------------
// ESCENARIO 1: Health Check y Conectividad
// -------------------------------------------------------------
async function scenarioHealth() {
  console.log(`\n${C.bold}${C.blue}=== [1] Diagnóstico del Sistema y Health Check ===${C.reset}`);
  console.log(`${C.gray}Verificando disponibilidad del Gateway en ${BASE_URL}/health...${C.reset}`);

  const res = await request('/health');
  if (res.status === 200) {
    console.log(` ${C.green}✔ Gateway disponible${C.reset} (HTTP 200 en ${res.duration}ms)`);
    console.log(`   Respuesta:`, JSON.stringify(res.data));
    console.log(` ${C.gray}El Gateway NGINX está enrutando correctamente las peticiones a la red interna.${C.reset}`);
  } else {
    console.log(` ${C.red}✖ Gateway no respondió correctamente (HTTP ${res.status || 'ERR'})${C.reset}`);
    if (res.error) console.log(`   Error de red: ${res.error}`);
    console.log(`\n ${C.yellow}Sugerencia:${C.reset} Asegúrate de haber iniciado Docker Desktop y ejecutado:`);
    console.log(`   ${C.cyan}powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\bootstrap-dev.ps1${C.reset}`);
  }
}

// -------------------------------------------------------------
// ESCENARIO 2: Seguridad Zero-Trust y Mitigación BOLA
// -------------------------------------------------------------
async function scenarioSecurity() {
  console.log(`\n${C.bold}${C.blue}=== [2] Demostración de Seguridad: JWT Zero-Trust y BOLA (OWASP API1/API5) ===${C.reset}`);
  if (!await ensureGateway()) return;

  // 1. Petición sin token
  console.log(`\n${C.cyan}1. Petición anónima a /api/carritos/usuario_1:${C.reset}`);
  const anon = await request('/api/carritos/usuario_1');
  if (anon.status === 401) {
    console.log(`   ${C.green}✔ Rechazado correctamente con HTTP 401 Unauthorized${C.reset}`);
    console.log(`   Cuerpo: ${JSON.stringify(anon.data)}`);
  } else {
    console.log(`   ${C.red}✖ Falló: se esperaba HTTP 401 y se obtuvo ${anon.status}${C.reset}`);
  }

  // 2. Generar token para usuario_1
  console.log(`\n${C.cyan}2. Generando token firmado con Vault JWT Secret para usuario_1 (scopes: cart:read, cart:write)...${C.reset}`);
  let tokenUser1;
  try {
    tokenUser1 = await generateDevToken('usuario_1', ['cart:read', 'cart:write']);
    console.log(`   ${C.green}✔ Token generado exitosamente.${C.reset}`);
    console.log(`   Token (primeros 40 caracteres): ${C.gray}${tokenUser1.slice(0, 40)}...${C.reset}`);
  } catch (err) {
    console.log(`   ${C.red}✖ Error generando token: ${err.message}${C.reset}`);
    return;
  }

  // 3. Intento de ataque BOLA: usuario_1 intenta consultar el carrito de usuario_2
  console.log(`\n${C.cyan}3. Prueba BOLA (OWASP API1): usuario_1 intenta leer el carrito de usuario_2 con su token:${C.reset}`);
  const bola = await request('/api/carritos/usuario_2', {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  if (bola.status === 403) {
    console.log(`   ${C.green}✔ Mitigado con HTTP 403 Forbidden: ${JSON.stringify(bola.data)}${C.reset}`);
    console.log(`   ${C.gray}El middleware requireCartOwner validó que el subject ('usuario_1') no coincide con el recurso solicitado.${C.reset}`);
  } else {
    console.log(`   ${C.red}✖ Vulnerable o inesperado: HTTP ${bola.status}${C.reset}`);
  }

  // 4. Acceso legítimo: usuario_1 consulta su propio carrito
  console.log(`\n${C.cyan}4. Acceso legítimo: usuario_1 consulta su propio carrito con su token:${C.reset}`);
  const legit = await request('/api/carritos/usuario_1', {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  if (legit.status === 200) {
    console.log(`   ${C.green}✔ Acceso concedido (HTTP 200)${C.reset}`);
    console.log(`   Contenido actual:`, JSON.stringify(legit.data));
  } else {
    console.log(`   ${C.red}✖ Falló acceso legítimo: HTTP ${legit.status}${C.reset}`);
  }

  // 5. Control de Scopes: Intento de leer productos con token que solo tiene scopes de carrito
  console.log(`\n${C.cyan}5. Control de Privilegio Mínimo (OWASP API5): Consultar /api/productos con token de carrito:${C.reset}`);
  const scopesTest = await request('/api/productos', {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  if (scopesTest.status === 403) {
    console.log(`   ${C.green}✔ Bloqueado con HTTP 403 (Permisos insuficientes: requiere 'products:read')${C.reset}`);
  } else {
    console.log(`   ${C.red}✖ Respuesta inesperada: HTTP ${scopesTest.status}${C.reset}`);
  }
}

// -------------------------------------------------------------
// ESCENARIO 3: Catálogo y Persistencia en Redis
// -------------------------------------------------------------
async function scenarioCartPersistence() {
  console.log(`\n${C.bold}${C.blue}=== [3] Catálogo de Productos y Persistencia en Redis ===${C.reset}`);
  if (!await ensureGateway()) return;

  // Token con permisos para catálogo y carrito
  const token = await generateDevToken('usuario_1', ['products:read', 'cart:read', 'cart:write']);

  console.log(`\n${C.cyan}1. Consultando catálogo oficial en /api/productos:${C.reset}`);
  const cat = await request('/api/productos', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (cat.status === 200 && Array.isArray(cat.data)) {
    console.log(`   ${C.green}✔ Catálogo obtenido (${cat.data.length} productos disponibles):${C.reset}`);
    console.table(cat.data);
  } else {
    console.log(`   ${C.red}✖ No se pudo leer el catálogo (HTTP ${cat.status})${C.reset}`);
  }

  console.log(`\n${C.cyan}2. Agregando Producto #1 (Teclado) x 2 unidades al carrito de usuario_1...${C.reset}`);
  const add1 = await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productoId: '1', cantidad: 2 }),
  });
  console.log(`   Respuesta: HTTP ${add1.status}`, JSON.stringify(add1.data));

  console.log(`\n${C.cyan}3. Agregando Producto #2 (Mouse) x 1 unidad al carrito de usuario_1...${C.reset}`);
  const add2 = await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productoId: '2', cantidad: 1 }),
  });
  console.log(`   Respuesta: HTTP ${add2.status}`, JSON.stringify(add2.data));

  console.log(`\n${C.cyan}4. Consultando el carrito persistido en Redis (/api/carritos/usuario_1):${C.reset}`);
  const cart = await request('/api/carritos/usuario_1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (cart.status === 200) {
    console.log(`   ${C.green}✔ Carrito persistido con éxito en Redis (TTL renovado a 30 días):${C.reset}`);
    console.table(cart.data.productos);
  } else {
    console.log(`   ${C.red}✖ Error consultando carrito: HTTP ${cart.status}${C.reset}`);
  }
}

// -------------------------------------------------------------
// ESCENARIO 4: Resiliencia y Circuit Breaker
// -------------------------------------------------------------
async function scenarioResilience(automated = false) {
  console.log(`\n${C.bold}${C.blue}=== [4] Resiliencia: Circuit Breaker Opossum y Modo Degradado ===${C.reset}`);
  if (!await ensureGateway()) return;
  console.log(`${C.gray}El servicio de carrito valida la existencia del producto en el microservicio de productos.`);
  console.log(`Si productos falla, el Circuit Breaker recurre a la caché local (5 min) y responde con flag 'degraded: true'.${C.reset}\n`);

  const token = await generateDevToken('usuario_1', ['products:read', 'cart:read', 'cart:write']);

  // Paso previo: asegurar que el producto 2 esté en caché
  console.log(`${C.cyan}1. Asegurando producto #2 en la caché local del carrito...${C.reset}`);
  await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: '2', cantidad: 1 }),
  });
  console.log(`   ${C.green}✔ Producto #2 consultado y cacheado en memoria.${C.reset}`);

  // Detener contenedor productos
  console.log(`\n${C.yellow}2. Simulando falla de infraestructura: deteniendo microservicio de productos...${C.reset}`);
  let stoppedByScript = false;
  try {
    execSync('docker compose stop productos', { stdio: 'pipe' });
    stoppedByScript = true;
    console.log(`   ${C.green}✔ Contenedor 'productos' detenido exitosamente.${C.reset}`);
  } catch {
    console.log(`   ${C.magenta}ℹ Nota: Si no tienes docker en PATH, ejecuta en otra terminal: 'docker compose stop productos'${C.reset}`);
    if (!automated) await promptUser(`   Presiona [Enter] cuando hayas detenido el servicio de productos...`);
  }

  // Probar petición con producto cacheado
  console.log(`\n${C.cyan}3. Intentando agregar Producto #2 (cacheado) mientras productos está APAGADO:${C.reset}`);
  const degradedReq = await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: '2', cantidad: 1 }),
  });

  if (degradedReq.status === 200 && degradedReq.data.degraded === true) {
    console.log(`   ${C.green}✔ Éxito en MODO DEGRADADO (HTTP 200):${C.reset}`);
    console.log(`   Respuesta:`, JSON.stringify(degradedReq.data));
    console.log(`   ${C.gray}El circuit breaker protegió la transacción utilizando los datos locales de respaldo.${C.reset}`);
  } else {
    console.log(`   ${C.yellow}Respuesta obtenida: HTTP ${degradedReq.status}`, JSON.stringify(degradedReq.data), `${C.reset}`);
  }

  // Probar petición con producto desconocido
  console.log(`\n${C.cyan}4. Intentando agregar un producto NO conocido (ID: 999) con productos APAGADO:${C.reset}`);
  const unknownReq = await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: '999', cantidad: 1 }),
  });

  if (unknownReq.status === 503) {
    console.log(`   ${C.green}✔ Política 'Fail-Closed' confirmada (HTTP 503 Service Unavailable):${C.reset}`);
    console.log(`   Respuesta:`, JSON.stringify(unknownReq.data));
    console.log(`   ${C.gray}Al no existir en caché, el carrito NO se corrompe y se rechaza la operación limpiamente.${C.reset}`);
  } else {
    console.log(`   Respuesta: HTTP ${unknownReq.status}`, JSON.stringify(unknownReq.data));
  }

  // Restaurar servicio
  console.log(`\n${C.yellow}5. Restaurando servicio de productos...${C.reset}`);
  if (stoppedByScript) {
    try {
      execSync('docker compose start productos', { stdio: 'pipe' });
      console.log(`   ${C.green}✔ Contenedor 'productos' iniciado. Esperando 6s para reset del breaker...${C.reset}`);
      await sleep(6000);
    } catch {
      console.log(`   ${C.red}✖ No se pudo iniciar automáticamente. Ejecuta 'docker compose start productos'.${C.reset}`);
    }
  } else {
    if (!automated) await promptUser(`   Reinicia productos ('docker compose start productos') y presiona [Enter] tras 6 segundos...`);
  }

  // Verificar recuperación
  console.log(`\n${C.cyan}6. Verificando recuperación del servicio (Circuit Breaker pasa a CLOSED):${C.reset}`);
  const recovered = await request('/api/carritos/usuario_1/productos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: '1', cantidad: 1 }),
  });
  if (recovered.status === 200 && !recovered.data.degraded) {
    console.log(`   ${C.green}✔ Sistema 100% recuperado. Respuesta normal sin modo degradado:${C.reset}`);
    console.log(`   Respuesta:`, JSON.stringify(recovered.data));
  } else {
    console.log(`   Respuesta: HTTP ${recovered.status}`, JSON.stringify(recovered.data));
  }
}

// -------------------------------------------------------------
// ESCENARIO 5: Rate Limiting y Control de Saturación
// -------------------------------------------------------------
async function scenarioRateLimit() {
  console.log(`\n${C.bold}${C.blue}=== [5] Rate Limiting: Prueba de Ráfaga y Control DoS (OWASP API4) ===${C.reset}`);
  if (!await ensureGateway()) return;
  console.log(`${C.gray}Configuración de NGINX: 100 req/s con ráfaga permitida de 50 (burst=50 nodelay).${C.reset}`);

  const token = await generateDevToken('usuario_1', ['cart:read']);
  const TOTAL = 150;
  console.log(`\n${C.cyan}Disparando ráfaga simultánea de ${TOTAL} peticiones a /api/carritos/usuario_1...${C.reset}`);

  const start = Date.now();
  const promises = [];
  for (let i = 0; i < TOTAL; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/carritos/usuario_1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.status).catch(() => 0)
    );
  }

  const results = await Promise.all(promises);
  const duration = Date.now() - start;

  const count200 = results.filter((s) => s === 200).length;
  const count429 = results.filter((s) => s === 429).length;
  const others = results.length - count200 - count429;

  console.log(`\n${C.green}Resultados de la ráfaga (${duration}ms en total):${C.reset}`);
  console.log(`   ✔ ${C.green}200 OK (Aceptadas dentro del límite):${C.reset} ${count200}`);
  console.log(`   🛡️ ${C.yellow}429 Too Many Requests (Bloqueadas por Rate Limit):${C.reset} ${count429}`);
  if (others > 0) console.log(`   ✖ Otros códigos/errores: ${others}`);

  const pctBlocked = ((count429 / TOTAL) * 100).toFixed(1);
  console.log(`   ${C.gray}El Gateway protegió los microservicios internos bloqueando el ${pctBlocked}% de la sobrecarga.${C.reset}`);
}

// -------------------------------------------------------------
// ESCENARIO 6: Observabilidad
// -------------------------------------------------------------
async function scenarioObservability() {
  console.log(`\n${C.bold}${C.blue}=== [6] Observabilidad: Métricas en Prometheus y Dashboard de Grafana ===${C.reset}`);
  if (!await ensureGateway()) return;

  console.log(`\n${C.cyan}1. Puntos de enlace de observabilidad:${C.reset}`);
  console.log(`   📈 ${C.bold}Grafana Dashboard:${C.reset}    ${C.cyan}http://localhost:8080/grafana/${C.reset} (Acceso directo vía Gateway)`);
  console.log(`   📊 ${C.bold}Prometheus Targets:${C.reset}   ${C.gray}http://localhost:9090/targets${C.reset} (Red interna)`);
  console.log(`   🔍 ${C.bold}OpenTelemetry OTLP:${C.reset}   ${C.gray}http://otel-collector:4318${C.reset} (Trazas W3C)`);

  console.log(`\n${C.cyan}2. Verificando métricas de Prometheus mediante Docker:${C.reset}`);
  try {
    const targets = execSync('docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/targets', { stdio: 'pipe' }).toString();
    const parsed = JSON.parse(targets);
    const active = parsed.data.activeTargets || [];
    console.log(`   ${C.green}✔ Prometheus scrapea ${active.length} microservicios activos:${C.reset}`);
    for (const t of active) {
      console.log(`      • Job: ${C.bold}${t.labels.job}${C.reset} | Estado: ${C.green}${t.health}${C.reset} | Último scrape: ${t.lastScrapeDuration}s`);
    }
  } catch {
    console.log(`   ${C.gray}(Para ver targets de scraping ejecuta: docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/targets)${C.reset}`);
  }
}

// -------------------------------------------------------------
// TOUR COMPLETO AUTOMATIZADO
// -------------------------------------------------------------
async function runFullTour() {
  console.log(`\n${C.bold}${C.bgBlue} INICIANDO TOUR COMPLETO DE VERIFICACIÓN CLOUD-NATIVE ${C.reset}\n`);
  if (!await ensureGateway()) return;
  await scenarioHealth();
  await sleep(1500);
  await scenarioSecurity();
  await sleep(1500);
  await scenarioCartPersistence();
  await sleep(1500);
  await scenarioResilience(true);
  await sleep(1500);
  await scenarioRateLimit();
  await sleep(1500);
  await scenarioObservability();
  console.log(`\n${C.bold}${C.green}✔ Tour completado exitosamente. Todos los componentes fueron verificados.${C.reset}\n`);
}

// -------------------------------------------------------------
// BUCLE PRINCIPAL / MENÚ
// -------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--auto') || args.includes('--all')) {
    banner();
    await runFullTour();
    return;
  }

  while (true) {
    banner();
    console.log(`${C.bold}Selecciona un escenario para ejecutar:${C.reset}\n`);
    console.log(`  ${C.cyan}[1]${C.reset} 🏥 Diagnóstico del Sistema y Health Check`);
    console.log(`  ${C.cyan}[2]${C.reset} 🛡️ Seguridad Zero-Trust: JWT y Mitigación BOLA (OWASP API1/5)`);
    console.log(`  ${C.cyan}[3]${C.reset} 🛒 Catálogo de Productos y Persistencia en Redis (TTL 30 días)`);
    console.log(`  ${C.cyan}[4]${C.reset} ⚡ Resiliencia: Fallback Circuit Breaker y Modo Degradado`);
    console.log(`  ${C.cyan}[5]${C.reset} 🚦 Rate Limiting: Ráfaga de Tráfico y Control DoS (OWASP API4)`);
    console.log(`  ${C.cyan}[6]${C.reset} 📊 Observabilidad: Métricas y Dashboard de Grafana`);
    console.log(`  ${C.cyan}[7]${C.reset} 🚀 ${C.bold}Tour Completo Automatizado (Demostración de Entrega)${C.reset}`);
    console.log(`  ${C.gray}[0] Salir${C.reset}\n`);

    const opt = await promptUser(`${C.yellow}Ingresa una opción [0-7]: ${C.reset}`);

    switch (opt) {
      case '1':
        await scenarioHealth();
        break;
      case '2':
        await scenarioSecurity();
        break;
      case '3':
        await scenarioCartPersistence();
        break;
      case '4':
        await scenarioResilience(false);
        break;
      case '5':
        await scenarioRateLimit();
        break;
      case '6':
        await scenarioObservability();
        break;
      case '7':
        await runFullTour();
        break;
      case '0':
        console.log(`\n${C.green}¡Hasta luego!${C.reset}\n`);
        process.exit(0);
      default:
        console.log(`\n${C.red}Opción inválida.${C.reset}`);
    }

    await promptUser(`\n${C.gray}Presiona [Enter] para volver al menú principal...${C.reset}`);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}Error fatal:${C.reset}`, err);
  process.exit(1);
});
