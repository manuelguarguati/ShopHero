/**
 * ShopHero — cliente web (SPA sin dependencias).
 *
 * Consume el API Gateway NGINX:
 *   GET    /health                                (y /health/productos, /health/carrito, /health/pedidos)
 *   GET    /api/productos                         (scope products:read)
 *   POST   /api/productos                         (scope products:write)
 *   PATCH  /api/productos/:id                     (scope products:write)
 *   DELETE /api/productos/:id                     (scope products:write)
 *   GET    /api/carritos/:usuarioId               (scope cart:read + dueño del carrito)
 *   POST   /api/carritos/:usuarioId/productos     (scope cart:write; suma cantidad 1..1000)
 *   DELETE /api/carritos/:usuarioId/productos/:id (scope cart:write)
 *   DELETE /api/carritos/:usuarioId               (scope cart:write)
 *   GET    /api/pedidos/:usuarioId                (scope orders:read + dueño)
 *   POST   /api/pedidos/:usuarioId                (scope orders:write + dueño; transacción ACID PostgreSQL)
 *   GET    /api/outbox                            (rol admin; eventos Transactional Outbox ADR-005)
 *
 * Principio: la interfaz nunca finge un éxito. Si el backend responde 401/403/429/503,
 * se muestra el motivo real para que los controles Zero-Trust sean visibles.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuración y estado
  // ---------------------------------------------------------------------------
  const USERS = ['usuario_1', 'usuario_2', 'admin'];
  const FLASH_DISCOUNT = 0.3; // el precio del API es el precio de oferta (30 % de descuento)
  const REQUEST_TIMEOUT_MS = 4000;
  const HEALTH_INTERVAL_MS = 10000;

  const state = {
    currentUser: 'usuario_1',
    tokens: {},          // tokens de dev-tokens.json
    activeToken: '',
    tokenIsCustom: false,
    backend: 'checking', // checking | online | demo | offline
    products: [],
    catalog: { status: 'loading', error: null },
    cart: [],
    cartStatus: { status: 'loading', error: null },
    quantities: {},      // cantidad elegida en cada tarjeta del catálogo
    pending: new Set(),  // operaciones en curso (evita doble clic)
    degraded: false,
    search: '',
    sort: 'relevance',
    category: '',        // filtro de categoría ('' = todas)
  };

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const formatMoney = (value) => moneyFmt.format(Number(value) || 0);

  /** Escapa texto antes de insertarlo como HTML (evita XSS con nombres de producto). */
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function regularPrice(price) {
    return Math.round(price / (1 - FLASH_DISCOUNT) / 1000) * 1000;
  }

  function normalize(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* almacenamiento no disponible */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* almacenamiento no disponible */ } },
  };

  // ---------------------------------------------------------------------------
  // JWT (solo lectura de claims para la interfaz; la verificación la hace el backend)
  // ---------------------------------------------------------------------------
  function decodeJwt(token) {
    try {
      const part = token.split('.')[1];
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  }

  function tokenInfo(token = state.activeToken) {
    const payload = token ? decodeJwt(token) : null;
    if (!payload) return { valid: false, present: Boolean(token) };
    const scopes = typeof payload.scope === 'string' ? payload.scope.split(/\s+/).filter(Boolean) : [];
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;
    return { valid: true, present: true, sub: payload.sub, scopes, roles, exp, expired: exp ? exp.getTime() <= Date.now() : false };
  }

  function can(scope) {
    const info = tokenInfo();
    return info.valid && (info.roles.includes('admin') || info.scopes.includes(scope));
  }

  function relativeTime(date) {
    const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffH = Math.round(diffMin / 60);
    if (Math.abs(diffH) < 48) return rtf.format(diffH, 'hour');
    return rtf.format(Math.round(diffH / 24), 'day');
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------
  function apiBaseUrl() {
    const { protocol, port } = window.location;
    // Servido por NGINX (:8080) o por scripts/serve-frontend.js (:5000): mismo origen.
    if (protocol.startsWith('http') && (port === '8080' || port === '5000')) return '';
    // Abierto como archivo o desde otro servidor: hablar directo con el Gateway.
    return 'http://localhost:8080';
  }

  async function apiFetch(path, { method = 'GET', body, token = state.activeToken, timeout = REQUEST_TIMEOUT_MS } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
      const response = await fetch(`${apiBaseUrl()}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined,
      });
      const type = response.headers.get('content-type') || '';
      let data = null;
      if (response.status !== 204) {
        data = type.includes('application/json') ? await response.json().catch(() => null) : await response.text();
      }
      const mock = response.headers.get('x-shophero-mock') === '1';
      if (mock) setBackend('demo');
      return { ok: response.ok, status: response.status, data, mock };
    } catch (err) {
      return { ok: false, status: 0, data: null, error: err.name === 'TimeoutError' ? 'timeout' : err.message };
    }
  }

  /** Traduce una respuesta fallida a un mensaje entendible. */
  function describeError(res, context = '') {
    const serverMsg = res.data && typeof res.data === 'object' && res.data.error ? res.data.error : '';
    switch (res.status) {
      case 0: return res.error === 'timeout'
        ? 'El API Gateway no respondió a tiempo.'
        : 'No hay conexión con el API Gateway (localhost:8080). ¿Está levantado Docker Compose?';
      case 400: return serverMsg || 'Solicitud inválida.';
      case 401: return 'Token ausente, inválido o vencido. Regenera los tokens de desarrollo.';
      case 403: return serverMsg
        ? `Acceso denegado: ${serverMsg}.`
        : `Acceso denegado: tu token no tiene permiso${context ? ` para ${context}` : ''}.`;
      case 404: return serverMsg || 'Recurso no encontrado.';
      case 409: return serverMsg || 'Conflicto de stock disponible al procesar el pedido.';
      case 429: return 'Demasiadas solicitudes: el API Gateway aplicó rate limiting (HTTP 429).';
      case 503: return serverMsg || 'Servicio no disponible temporalmente.';
      default: return serverMsg || `Error inesperado (HTTP ${res.status}).`;
    }
  }

  // ---------------------------------------------------------------------------
  // Notificaciones
  // ---------------------------------------------------------------------------
  const TOAST_STYLE = {
    info: ['border-purple-500/40 text-purple-100', 'fa-circle-info text-purple-300'],
    success: ['border-emerald-500/40 text-emerald-100', 'fa-circle-check text-emerald-400'],
    warning: ['border-amber-500/40 text-amber-100', 'fa-triangle-exclamation text-amber-400'],
    error: ['border-rose-500/40 text-rose-100', 'fa-circle-xmark text-rose-400'],
  };

  function showToast(message, type = 'info', duration = 4000) {
    const container = $('toastContainer');
    const [colors, icon] = TOAST_STYLE[type] || TOAST_STYLE.info;
    const toast = document.createElement('div');
    toast.className = `toast ${colors}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `<i class="fa-solid ${icon} mt-0.5" aria-hidden="true"></i><span class="leading-relaxed">${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.setAttribute('data-show', '')));
    setTimeout(() => {
      toast.removeAttribute('data-show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ---------------------------------------------------------------------------
  // Overlays (drawer y modales) con foco y Escape
  // ---------------------------------------------------------------------------
  let lastFocused = null;

  function openOverlay(id) {
    const el = $(id);
    if (!el || !el.hidden) return;
    lastFocused = document.activeElement;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute('data-open', '')));
    const focusTarget = el.querySelector('[autofocus], input, textarea, select, button:not([data-action="close-overlay"])') || el.querySelector('button');
    setTimeout(() => focusTarget && focusTarget.focus(), 60);
  }

  function closeOverlay(id) {
    const el = id ? $(id) : topOverlay();
    if (!el || el.hidden) return;
    el.removeAttribute('data-open');
    setTimeout(() => {
      el.hidden = true;
      if (!topOverlay()) document.body.style.overflow = '';
    }, 250);
    if (el.id === 'confirmModal' && confirmResolver) resolveConfirm(false);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function topOverlay() {
    const open = [...document.querySelectorAll('[data-overlay]')].filter((el) => !el.hidden);
    return open[open.length - 1] || null;
  }

  let confirmResolver = null;
  function resolveConfirm(value) {
    const resolve = confirmResolver;
    confirmResolver = null;
    if (resolve) resolve(value);
  }

  function confirmDialog({ title, text, okLabel = 'Confirmar' }) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    openOverlay('confirmModal');
    return new Promise((resolve) => { confirmResolver = resolve; });
  }

  // ---------------------------------------------------------------------------
  // Estado del backend y avisos
  // ---------------------------------------------------------------------------
  function setBackend(status) {
    if (state.backend === status) return;
    state.backend = status;
    renderBackendStatus();
    renderNotices();
    renderAdminControls();
    if (state.catalog.status === 'ok') renderProducts();
  }

  function renderBackendStatus() {
    const pill = $('backendStatusPill');
    const labels = {
      checking: 'Conectando…',
      online: 'Backend conectado',
      demo: 'Modo demo (datos simulados)',
      offline: 'Gateway sin conexión',
    };
    pill.className = `status-pill status-pill--${state.backend} hidden lg:flex`;
    $('backendStatusText').textContent = labels[state.backend];

    const gw = $('gwStatus');
    const redis = $('redisStatus');
    const pgProd = $('pgProdStatus');
    const ordersSvc = $('ordersSvcStatus');
    const set = (el, color, text) => { if (el) el.innerHTML = `<span class="w-2 h-2 rounded-full ${color}"></span><span>${text}</span>`; };
    if (state.backend === 'online') {
      set(gw, 'bg-emerald-500', 'Conectado');
      set(redis, 'bg-emerald-500', 'Operativo (/health OK)');
    } else if (state.backend === 'demo') {
      set(gw, 'bg-sky-400', 'Simulado (preview)');
      set(redis, 'bg-sky-400', 'Simulado en memoria');
      set(pgProd, 'bg-sky-400', 'Simulado en memoria');
      set(ordersSvc, 'bg-sky-400', 'Simulado en memoria');
    } else if (state.backend === 'offline') {
      set(gw, 'bg-rose-500', 'Sin conexión');
      set(redis, 'bg-rose-500', 'Desconocido');
      set(pgProd, 'bg-rose-500', 'Desconocido');
      set(ordersSvc, 'bg-rose-500', 'Desconocido');
    }
    renderCircuitBreaker();
  }

  function renderCircuitBreaker() {
    const cb = $('cbStatus');
    cb.innerHTML = state.degraded
      ? '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span class="text-amber-300">Abierto · usando caché</span>'
      : '<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-emerald-300">Cerrado (normal)</span>';
  }

  async function checkBackend() {
    const [gwRes, prodRes, cartRes, ordRes] = await Promise.all([
      apiFetch('/health', { token: null, timeout: 2500 }),
      apiFetch('/health/productos', { token: null, timeout: 2500 }),
      apiFetch('/health/carrito', { token: null, timeout: 2500 }),
      apiFetch('/health/pedidos', { token: null, timeout: 2500 }),
    ]);

    if (gwRes.status === 0) setBackend('offline');
    else setBackend(gwRes.mock ? 'demo' : 'online');

    const setHealthEl = (el, r, okLabel, failLabel) => {
      if (!el || gwRes.mock) return;
      if (r.ok) el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-emerald-300">${okLabel}</span>`;
      else if (r.status === 0) el.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-rose-300">Sin conexión</span>';
      else el.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-rose-300">${failLabel} (${r.status})</span>`;
    };

    setHealthEl($('pgProdStatus'), prodRes, 'PostgreSQL OK', 'DB no disponible');
    setHealthEl($('redisStatus'), cartRes, 'Redis AOF OK', 'Redis no disponible');
    setHealthEl($('ordersSvcStatus'), ordRes, 'PostgreSQL + Outbox OK', 'Servicio no disponible');
  }

  function renderNotices() {
    const area = $('noticeArea');
    const notices = [];
    const info = tokenInfo();

    if (state.backend === 'offline') {
      notices.push({
        type: 'error', icon: 'fa-plug-circle-xmark',
        title: 'No hay conexión con el API Gateway',
        body: 'Levanta el entorno con <code class="code">docker compose up -d</code> y abre <code class="code">http://localhost:8080</code>, o usa la vista previa con <code class="code">node scripts/serve-frontend.js</code>.',
      });
    } else if (state.backend === 'demo') {
      notices.push({
        type: 'info', icon: 'fa-circle-info',
        title: 'Modo demo',
        body: 'El Gateway no está disponible, así que la vista previa responde con datos simulados en memoria. Los permisos (scopes y dueño del carrito) se simulan, pero la firma y la expiración del token no se verifican.',
      });
    }

    if (!info.present) {
      notices.push({
        type: 'warning', icon: 'fa-key',
        title: `No hay token para ${escapeHtml(state.currentUser)}`,
        body: 'Genera los tokens de desarrollo con <code class="code">node scripts/generate-frontend-tokens.js</code> (requiere haber ejecutado <code class="code">bootstrap-dev.ps1</code>) y recarga la página.',
      });
    } else if (!info.valid) {
      notices.push({ type: 'warning', icon: 'fa-key', title: 'El token no tiene formato JWT', body: 'Revisa el token en el panel de sesión (ícono de llave).' });
    } else if (info.expired && state.backend !== 'demo') {
      notices.push({
        type: 'warning', icon: 'fa-clock',
        title: `El token de ${escapeHtml(state.currentUser)} venció ${escapeHtml(relativeTime(info.exp))}`,
        body: 'El backend responderá 401. Regenera los tokens con <code class="code">node scripts/generate-frontend-tokens.js</code> y recarga, o pega uno nuevo en el panel de sesión.',
      });
    }

    if (state.degraded) {
      notices.push({
        type: 'warning', icon: 'fa-triangle-exclamation',
        title: 'Modo degradado: circuit breaker abierto',
        body: 'El servicio de productos no respondió; el carrito validó el producto con su caché local (TTL 5 min). Tu carrito sigue guardándose en Redis.',
      });
    }

    $('tokenAlertDot').classList.toggle('hidden', info.valid && (!info.expired || state.backend === 'demo'));

    area.innerHTML = notices.map((n) => `
      <div class="notice notice--${n.type}">
        <i class="fa-solid ${n.icon} mt-0.5 text-base" aria-hidden="true"></i>
        <div class="space-y-1"><p class="font-bold">${n.title}</p><p class="text-xs opacity-90 leading-relaxed">${n.body}</p></div>
      </div>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Productos
  // ---------------------------------------------------------------------------
  const PRODUCT_KINDS = [
    { match: ['audifono', 'auricular', 'headset', 'headphone', 'diadema'], icon: 'fa-headphones', tone: 'from-pink-500/25 text-pink-300', category: 'Audio', desc: 'Sonido envolvente y micrófono con cancelación de ruido.' },
    { match: ['teclado', 'keyboard'], icon: 'fa-keyboard', tone: 'from-purple-500/25 text-purple-300', category: 'Teclados', desc: 'Switches mecánicos e iluminación RGB por tecla.' },
    { match: ['mouse', 'raton'], icon: 'fa-computer-mouse', tone: 'from-sky-500/25 text-sky-300', category: 'Mouse', desc: 'Sensor óptico de alta precisión y respuesta de 1 ms.' },
    { match: ['monitor', 'pantalla'], icon: 'fa-desktop', tone: 'from-emerald-500/25 text-emerald-300', category: 'Monitores', desc: 'Alta tasa de refresco para partidas sin desenfoque.' },
    { match: ['control', 'gamepad', 'joystick'], icon: 'fa-gamepad', tone: 'from-amber-500/25 text-amber-300', category: 'Controles', desc: 'Agarre ergonómico y vibración háptica.' },
    { match: ['ssd', 'disco', 'memoria'], icon: 'fa-hard-drive', tone: 'from-indigo-500/25 text-indigo-300', category: 'Almacenamiento', desc: 'Cargas más rápidas para tus juegos.' },
  ];

  function productMeta(prod) {
    const name = normalize(prod.nombre);
    const kind = PRODUCT_KINDS.find((k) => k.match.some((m) => name.includes(m)));
    const base = kind || { icon: 'fa-box', tone: 'from-slate-500/25 text-slate-300', category: 'Accesorios', desc: 'Garantía oficial de 1 año.' };
    return {
      ...base,
      category: prod.categoria || base.category,
      desc: prod.descripcion || prod.desc || base.desc,
    };
  }

  function findProduct(id) {
    return state.products.find((p) => String(p.id) === String(id));
  }

  async function loadCatalog({ silent = false } = {}) {
    if (!silent) {
      state.catalog = { status: 'loading', error: null };
      renderProducts();
    }
    $('reloadIcon').classList.add('animate-spin');
    const res = await apiFetch('/api/productos');
    $('reloadIcon').classList.remove('animate-spin');

    if (res.ok && Array.isArray(res.data)) {
      state.products = res.data;
      state.catalog = { status: 'ok', error: null };
    } else {
      state.products = [];
      state.catalog = { status: 'error', error: res };
    }
    renderProducts();
    renderCart(); // los precios del carrito dependen del catálogo
  }

  function visibleProducts() {
    const q = normalize(state.search.trim());
    let list = state.products.filter((p) => {
      const category = productMeta(p).category;
      if (state.category && category !== state.category) return false;
      return !q || normalize(p.nombre).includes(q) || normalize(category).includes(q);
    });
    const sorters = {
      'price-asc': (a, b) => a.precio - b.precio,
      'price-desc': (a, b) => b.precio - a.precio,
      name: (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'),
    };
    if (sorters[state.sort]) list = [...list].sort(sorters[state.sort]);
    return list;
  }

  function renderCategoryFilters() {
    const box = $('categoryFilters');
    const counts = new Map();
    if (state.catalog.status === 'ok') {
      state.products.forEach((p) => {
        const { category, icon } = productMeta(p);
        const entry = counts.get(category) || { icon, n: 0 };
        entry.n += 1;
        counts.set(category, entry);
      });
    }
    if (state.category && !counts.has(state.category)) state.category = '';
    box.hidden = counts.size < 2;
    if (box.hidden) { box.innerHTML = ''; return; }

    const chip = (value, label, icon, n) => `
      <button type="button" class="cat-chip" data-action="filter-category" data-category="${escapeHtml(value)}" aria-pressed="${state.category === value}">
        <i class="fa-solid ${icon}" aria-hidden="true"></i>${escapeHtml(label)}<small>${n}</small>
      </button>`;
    box.innerHTML = chip('', 'Todos', 'fa-border-all', state.products.length)
      + [...counts].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([cat, { icon, n }]) => chip(cat, cat, icon, n)).join('');
  }

  /** Oferta destacada del hero: el producto con mayor ahorro (dato real del catálogo). */
  function renderFeatured() {
    const box = $('heroFeatured');
    if (state.catalog.status !== 'ok' || state.products.length === 0) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const prod = state.products.reduce((best, p) => (Number(p.precio) > Number(best.precio) ? p : best));
    const meta = productMeta(prod);
    const id = escapeHtml(String(prod.id));
    const busy = state.pending.has(`add-${prod.id}`);
    const canAdd = can('cart:write');
    box.hidden = false;
    box.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-xl">
        <p class="text-[11px] uppercase tracking-widest text-pink-300 font-bold mb-3"><i class="fa-solid fa-fire mr-1" aria-hidden="true"></i> Mayor ahorro de hoy</p>
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br ${meta.tone.split(' ')[0]} to-slate-900 flex items-center justify-center border border-white/5">
            <i class="fa-solid ${meta.icon} ${meta.tone.split(' ')[1]} text-2xl" aria-hidden="true"></i>
          </div>
          <div class="min-w-0">
            <p class="font-bold text-white text-sm truncate">${escapeHtml(prod.nombre)}</p>
            <p class="text-xs text-slate-400 line-through tabular-nums">${formatMoney(regularPrice(prod.precio))}</p>
            <p class="text-lg font-black text-white tabular-nums leading-tight">${formatMoney(prod.precio)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 mt-3">
          <span class="text-xs font-semibold text-emerald-400">Ahorras ${formatMoney(regularPrice(prod.precio) - prod.precio)}</span>
          <button type="button" class="h-9 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            data-action="add-to-cart" data-product-id="${id}" ${busy || !canAdd ? 'disabled' : ''} ${!canAdd ? 'title="Tu token no tiene el scope cart:write"' : ''}>
            ${busy ? '<i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i> Agregando…' : '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Agregar'}
          </button>
        </div>
      </div>`;
  }

  function renderProducts() {
    const grid = $('productsGrid');
    const count = $('catalogCount');
    grid.setAttribute('aria-busy', String(state.catalog.status === 'loading'));
    renderCategoryFilters();
    renderFeatured();

    if (state.catalog.status === 'loading') {
      count.textContent = '';
      grid.innerHTML = Array.from({ length: 3 }, () => `
        <div class="product-card" aria-hidden="true">
          <div class="skeleton h-40 rounded-2xl mb-4"></div>
          <div class="skeleton h-4 w-2/3 mb-2"></div>
          <div class="skeleton h-3 w-full mb-6"></div>
          <div class="skeleton h-10 w-full rounded-xl"></div>
        </div>`).join('');
      return;
    }

    if (state.catalog.status === 'error') {
      const res = state.catalog.error;
      count.textContent = '';
      const hint = res.status === 403
        ? `<p class="text-xs text-slate-400">El token de <span class="font-mono text-slate-200">${escapeHtml(state.currentUser)}</span> no incluye el scope <code class="code">products:read</code>. Prueba con otra sesión.</p>`
        : '';
      grid.innerHTML = `
        <div class="col-span-full rounded-3xl border border-dashed border-slate-800 p-10 text-center space-y-3">
          <i class="fa-solid ${res.status === 403 ? 'fa-shield-halved text-rose-400' : 'fa-plug-circle-xmark text-slate-500'} text-4xl" aria-hidden="true"></i>
          <p class="font-bold text-white">No se pudo cargar el catálogo</p>
          <p class="text-sm text-slate-400 max-w-md mx-auto">${escapeHtml(describeError(res, 'ver el catálogo'))}</p>
          ${hint}
          <button type="button" data-action="reload-catalog" class="btn-secondary mx-auto !h-10"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
        </div>`;
      return;
    }

    const list = visibleProducts();
    count.textContent = `(${list.length}${list.length !== state.products.length ? ` de ${state.products.length}` : ''})`;

    if (list.length === 0) {
      const filtered = state.products.length > 0;
      const what = [state.search.trim() && `“${escapeHtml(state.search.trim())}”`, state.category && `la categoría ${escapeHtml(state.category)}`].filter(Boolean).join(' en ');
      grid.innerHTML = `
        <div class="col-span-full rounded-3xl border border-dashed border-slate-800 p-10 text-center space-y-2">
          <i class="fa-solid fa-magnifying-glass text-3xl text-slate-600" aria-hidden="true"></i>
          <p class="font-bold text-white">${filtered ? 'Sin resultados' : 'El catálogo está vacío'}</p>
          <p class="text-sm text-slate-400">${filtered ? `Nada coincide con ${what || 'los filtros'}.` : 'Un administrador puede agregar productos.'}</p>
          ${filtered ? '<button type="button" data-action="clear-filters" class="btn-secondary mx-auto !h-10 mt-2"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpiar filtros</button>' : ''}
        </div>`;
      return;
    }

    const canAdd = can('cart:write');
    const isAdmin = can('products:write');
    grid.innerHTML = list.map((prod) => {
      const id = String(prod.id);
      const meta = productMeta(prod);
      const hasStockField = Number.isInteger(prod.stock);
      const stock = hasStockField ? prod.stock : null;
      const outOfStock = hasStockField && stock <= 0;
      const maxQty = hasStockField && stock > 0 ? Math.min(99, stock) : 99;
      const qty = Math.min(maxQty, state.quantities[id] || 1);
      const busy = state.pending.has(`add-${id}`) || state.pending.has(`admin-${id}`);
      const stockBadge = !hasStockField
        ? ''
        : outOfStock
          ? '<span class="text-[11px] font-bold text-rose-400"><i class="fa-solid fa-circle-xmark mr-1" aria-hidden="true"></i>Agotado</span>'
          : stock <= 5
            ? `<span class="text-[11px] font-bold text-amber-300"><i class="fa-solid fa-fire mr-1" aria-hidden="true"></i>¡Últimas ${stock} uds.!</span>`
            : `<span class="text-[11px] font-semibold text-emerald-400"><i class="fa-solid fa-cubes mr-1" aria-hidden="true"></i>${stock} disponibles</span>`;
      const adminRow = isAdmin
        ? `<div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
             <button type="button" data-action="restock-product" data-product-id="${escapeHtml(id)}" ${busy ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold transition cursor-pointer disabled:opacity-50"><i class="fa-solid fa-boxes-stacked mr-1" aria-hidden="true"></i>+10 stock</button>
             <button type="button" data-action="delete-product" data-product-id="${escapeHtml(id)}" ${busy ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-300 font-semibold transition cursor-pointer disabled:opacity-50"><i class="fa-solid fa-trash-can mr-1" aria-hidden="true"></i>Eliminar</button>
           </div>`
        : '';
      return `
        <article class="product-card group" aria-labelledby="prod-name-${escapeHtml(id)}">
          <div class="product-visual bg-gradient-to-br ${meta.tone.split(' ')[0]} to-slate-950">
            <i class="fa-solid ${meta.icon} ${meta.tone.split(' ')[1]} text-6xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300" aria-hidden="true"></i>
            <span class="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white shadow">−${Math.round(FLASH_DISCOUNT * 100)}%</span>
            <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950/70 text-slate-300 border border-white/10">${escapeHtml(meta.category)}</span>
          </div>
          <div class="flex items-start justify-between gap-2">
            <h3 id="prod-name-${escapeHtml(id)}" class="font-extrabold text-base text-white group-hover:text-purple-200 transition-colors">${escapeHtml(prod.nombre)}</h3>
          </div>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed flex-1">${escapeHtml(meta.desc)}</p>
          ${stockBadge ? `<div class="mt-2">${stockBadge}</div>` : ''}

          <div class="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div class="flex items-end justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
                  <span class="text-slate-400 line-through">${formatMoney(regularPrice(prod.precio))}</span>
                  <span class="text-emerald-400 font-semibold">−${formatMoney(regularPrice(prod.precio) - prod.precio)}</span>
                </div>
                <div class="text-xl font-black text-white tabular-nums">${formatMoney(prod.precio)}</div>
              </div>
              <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1" role="group" aria-label="Cantidad de ${escapeHtml(prod.nombre)}">
                <button type="button" class="qty-btn" data-action="qty-decrease" data-product-id="${escapeHtml(id)}" aria-label="Disminuir cantidad" ${qty <= 1 || outOfStock ? 'disabled' : ''}><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
                <span id="qty-${escapeHtml(id)}" class="w-8 text-center text-sm font-mono font-black text-white tabular-nums" aria-live="polite">${qty}</span>
                <button type="button" class="qty-btn" data-action="qty-increase" data-product-id="${escapeHtml(id)}" aria-label="Aumentar cantidad" ${qty >= maxQty || outOfStock ? 'disabled' : ''}><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
              </div>
            </div>
            <button type="button" class="btn-primary" data-action="add-to-cart" data-product-id="${escapeHtml(id)}" ${busy || !canAdd || outOfStock ? 'disabled' : ''}
              ${!canAdd ? 'title="Tu token no tiene el scope cart:write"' : ''}>
              ${busy ? '<i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i> Procesando…'
                : outOfStock ? '<i class="fa-solid fa-ban" aria-hidden="true"></i> Sin stock'
                  : canAdd ? '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Agregar al carrito'
                    : '<i class="fa-solid fa-lock" aria-hidden="true"></i> Sin permiso para comprar'}
            </button>
            ${adminRow}
          </div>
        </article>`;
    }).join('');
  }

  function changeQuantity(productId, delta) {
    const id = String(productId);
    const prod = findProduct(id);
    const maxQty = prod && Number.isInteger(prod.stock) && prod.stock > 0 ? Math.min(99, prod.stock) : 99;
    state.quantities[id] = Math.max(1, Math.min(maxQty, (state.quantities[id] || 1) + delta));
    renderProducts();
  }

  // ---------------------------------------------------------------------------
  // Carrito
  // ---------------------------------------------------------------------------
  const cartPath = () => `/api/carritos/${encodeURIComponent(state.currentUser)}`;

  async function loadCart() {
    $('cartOwnerLabel').textContent = state.currentUser;
    const res = await apiFetch(cartPath());
    if (res.ok && res.data && Array.isArray(res.data.productos)) {
      state.cart = res.data.productos.map((p) => ({ productoId: String(p.productoId), cantidad: Number(p.cantidad) }));
      state.cartStatus = { status: 'ok', error: null };
    } else {
      state.cart = [];
      state.cartStatus = { status: 'error', error: res };
    }
    renderCart();
  }

  /** Aplica la marca "degraded" que devuelve el carrito cuando el circuit breaker usa caché. */
  function applyDegraded(res) {
    const degraded = Boolean(res.data && res.data.degraded);
    if (degraded !== state.degraded) {
      state.degraded = degraded;
      renderNotices();
      renderCircuitBreaker();
    }
  }

  async function postCartItem(productoId, cantidad) {
    const res = await apiFetch(`${cartPath()}/productos`, { method: 'POST', body: { productoId: String(productoId), cantidad } });
    if (res.ok) applyDegraded(res);
    return res;
  }

  async function addToCart(productId) {
    const id = String(productId);
    const key = `add-${id}`;
    if (state.pending.has(key)) return;
    const cantidad = state.quantities[id] || 1;
    const prod = findProduct(id);

    state.pending.add(key);
    renderProducts();
    const res = await postCartItem(id, cantidad);
    state.pending.delete(key);

    if (res.ok) {
      state.quantities[id] = 1;
      await loadCart();
      bumpBadge();
      showToast(
        res.data && res.data.degraded
          ? `Agregado en modo degradado: ${cantidad} × ${prod ? prod.nombre : `#${id}`}.`
          : `Agregaste ${cantidad} × ${prod ? prod.nombre : `#${id}`} al carrito.`,
        res.data && res.data.degraded ? 'warning' : 'success',
      );
    } else {
      showToast(describeError(res, 'modificar este carrito'), 'error', 6000);
    }
    renderProducts();
  }

  /**
   * Fija la cantidad de un artículo. El API solo permite sumar (POST, cantidad ≥ 1) o
   * eliminar (DELETE), así que para disminuir se elimina y se vuelve a agregar.
   */
  async function setCartQuantity(productId, nextQty) {
    const id = String(productId);
    const item = state.cart.find((i) => i.productoId === id);
    const key = `cart-${id}`;
    if (!item || state.pending.has(key)) return;
    if (nextQty > 1000) {
      showToast('El máximo por producto es 1000 unidades.', 'warning');
      return;
    }

    state.pending.add(key);
    renderCart();
    let res;
    if (nextQty <= 0) {
      res = await apiFetch(`${cartPath()}/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else if (nextQty > item.cantidad) {
      res = await postCartItem(id, nextQty - item.cantidad);
    } else {
      res = await apiFetch(`${cartPath()}/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) res = await postCartItem(id, nextQty);
    }
    state.pending.delete(key);

    if (!res.ok) showToast(describeError(res, 'modificar este carrito'), 'error', 6000);
    else if (nextQty <= 0) showToast('Producto eliminado del carrito.', 'success');
    await loadCart();
  }

  async function clearCart() {
    if (state.cart.length === 0) return;
    const ok = await confirmDialog({ title: '¿Vaciar el carrito?', text: 'Se eliminarán todos los productos guardados en Redis para esta sesión.', okLabel: 'Vaciar' });
    if (!ok) return;
    const res = await apiFetch(cartPath(), { method: 'DELETE' });
    if (res.ok) showToast('Carrito vaciado.', 'success');
    else showToast(describeError(res, 'vaciar este carrito'), 'error', 6000);
    await loadCart();
  }

  function cartTotals() {
    let total = 0;
    let regular = 0;
    let unknown = 0;
    for (const item of state.cart) {
      const prod = findProduct(item.productoId);
      if (!prod) { unknown += item.cantidad; continue; }
      total += prod.precio * item.cantidad;
      regular += regularPrice(prod.precio) * item.cantidad;
    }
    return { total, regular, savings: regular - total, unknown, count: state.cart.reduce((n, i) => n + i.cantidad, 0) };
  }

  function bumpBadge() {
    const badge = $('cartCountBadge');
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }

  /** Resumen lateral del carrito (solo visible en escritorio ancho). */
  function renderMiniCart(totals, blocked) {
    const body = $('miniCartBody');
    $('miniCartCount').textContent = blocked ? '' : `${totals.count} ${totals.count === 1 ? 'unidad' : 'unidades'}`;
    $('miniCartSavings').textContent = `−${formatMoney(totals.savings)}`;
    $('miniCartTotal').textContent = formatMoney(totals.total);
    $('btnMiniCheckout').disabled = blocked || state.cart.length === 0;

    if (state.cartStatus.status === 'loading') {
      body.innerHTML = '<div class="space-y-2" aria-hidden="true"><div class="skeleton h-12 rounded-xl"></div><div class="skeleton h-12 rounded-xl"></div></div>';
      return;
    }
    if (blocked) {
      const res = state.cartStatus.error;
      body.innerHTML = `
        <div class="text-center py-6 space-y-2">
          <i class="fa-solid ${res.status === 403 || res.status === 401 ? 'fa-shield-halved text-rose-400' : 'fa-plug-circle-xmark text-slate-500'} text-2xl" aria-hidden="true"></i>
          <p class="text-xs text-slate-300 px-2">${escapeHtml(describeError(res, `ver el carrito de ${state.currentUser}`))}</p>
          <button type="button" data-action="reload-cart" class="btn-secondary mx-auto !h-8 !text-xs"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
        </div>`;
      return;
    }
    if (state.cart.length === 0) {
      body.innerHTML = `
        <div class="text-center py-8 space-y-2 select-none">
          <i class="fa-solid fa-basket-shopping text-3xl text-slate-700" aria-hidden="true"></i>
          <p class="text-sm font-semibold text-slate-300">Tu carrito está vacío</p>
          <p class="text-xs text-slate-500">Lo que agregues aparecerá aquí.</p>
        </div>`;
      return;
    }
    body.innerHTML = state.cart.map((item) => {
      const prod = findProduct(item.productoId);
      const meta = prod ? productMeta(prod) : { icon: 'fa-box', tone: 'from-slate-500/25 text-slate-400' };
      const busy = state.pending.has(`cart-${item.productoId}`);
      const id = escapeHtml(item.productoId);
      return `
        <div class="group/item flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition ${busy ? 'opacity-60' : ''}">
          <div class="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${meta.tone.split(' ')[0]} to-slate-900 flex items-center justify-center">
            <i class="fa-solid ${meta.icon} ${meta.tone.split(' ')[1]}" aria-hidden="true"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">${prod ? escapeHtml(prod.nombre) : `Producto #${id}`}</p>
            <p class="text-[11px] text-slate-400 tabular-nums">${item.cantidad} × ${prod ? formatMoney(prod.precio) : '—'}</p>
          </div>
          <span class="text-xs font-bold text-slate-200 tabular-nums">${prod ? formatMoney(prod.precio * item.cantidad) : ''}</span>
          <button type="button" class="icon-btn !w-7 !h-7 text-xs opacity-60 group-hover/item:opacity-100 hover:!text-rose-300 hover:!bg-rose-500/10" data-action="cart-remove" data-product-id="${id}" aria-label="Eliminar ${prod ? escapeHtml(prod.nombre) : 'producto'} del carrito" ${busy ? 'disabled' : ''}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>`;
    }).join('');
  }

  function renderCart() {
    const list = $('cartItemsList');
    const totals = cartTotals();
    const badge = $('cartCountBadge');
    const blocked = state.cartStatus.status === 'error';
    badge.textContent = blocked ? '!' : String(totals.count);
    renderMiniCart(totals, blocked);

    $('cartRegular').textContent = formatMoney(totals.regular);
    $('cartSavings').textContent = `−${formatMoney(totals.savings)}`;
    $('cartTotal').textContent = formatMoney(totals.total);
    $('btnCheckout').disabled = blocked || state.cart.length === 0;
    $('btnClearCart').disabled = blocked || state.cart.length === 0;

    if (state.cartStatus.status === 'loading') {
      list.innerHTML = '<div class="space-y-3" aria-hidden="true"><div class="skeleton h-16 rounded-2xl"></div><div class="skeleton h-16 rounded-2xl"></div></div>';
      return;
    }

    if (blocked) {
      const res = state.cartStatus.error;
      const isAuth = res.status === 401 || res.status === 403;
      list.innerHTML = `
        <div class="p-5 rounded-2xl ${isAuth ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-slate-800/50 border-slate-700 text-slate-300'} border text-center space-y-2">
          <i class="fa-solid ${isAuth ? 'fa-shield-halved text-rose-400' : 'fa-plug-circle-xmark text-slate-500'} text-3xl" aria-hidden="true"></i>
          <p class="font-bold text-sm">${res.status === 403 ? 'Acceso denegado (OWASP API1 · BOLA)' : 'No se pudo cargar el carrito'}</p>
          <p class="text-xs opacity-90">${escapeHtml(describeError(res, `ver el carrito de ${state.currentUser}`))}</p>
          <button type="button" data-action="reload-cart" class="btn-secondary mx-auto !h-9 mt-2"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button>
        </div>`;
      return;
    }

    if (state.cart.length === 0) {
      list.innerHTML = `
        <div class="text-center py-16 text-slate-500 space-y-3 select-none">
          <i class="fa-solid fa-basket-shopping text-5xl text-slate-700" aria-hidden="true"></i>
          <p class="text-sm font-semibold text-slate-300">Tu carrito está vacío</p>
          <p class="text-xs">Agrega productos del catálogo para empezar.</p>
          <button type="button" data-action="close-overlay" class="btn-secondary mx-auto !h-9 mt-2">Ver catálogo</button>
        </div>`;
      return;
    }

    list.innerHTML = state.cart.map((item) => {
      const prod = findProduct(item.productoId);
      const meta = prod ? productMeta(prod) : { icon: 'fa-box', tone: 'from-slate-500/25 text-slate-400' };
      const busy = state.pending.has(`cart-${item.productoId}`);
      const id = escapeHtml(item.productoId);
      return `
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 ${busy ? 'opacity-60' : ''}">
          <div class="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${meta.tone.split(' ')[0]} to-slate-900 flex items-center justify-center">
            <i class="fa-solid ${meta.icon} ${meta.tone.split(' ')[1]} text-lg" aria-hidden="true"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm text-white truncate">${prod ? escapeHtml(prod.nombre) : `Producto #${id}`}</p>
            <p class="text-[11px] text-slate-400 tabular-nums">${prod
              ? `${formatMoney(prod.precio)} c/u · <span class="text-purple-300 font-semibold">${formatMoney(prod.precio * item.cantidad)}</span>`
              : '<span class="text-amber-300">Precio no disponible en el catálogo</span>'}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0" role="group" aria-label="Cantidad">
            <button type="button" class="qty-btn !w-7 !h-7" data-action="cart-decrease" data-product-id="${id}" aria-label="Quitar una unidad" ${busy ? 'disabled' : ''}><i class="fa-solid ${item.cantidad <= 1 ? 'fa-trash-can text-rose-300' : 'fa-minus'}" aria-hidden="true"></i></button>
            <span class="w-7 text-center text-sm font-mono font-bold text-white tabular-nums">${busy ? '<i class="fa-solid fa-spinner animate-spin text-xs" aria-hidden="true"></i>' : item.cantidad}</span>
            <button type="button" class="qty-btn !w-7 !h-7" data-action="cart-increase" data-product-id="${id}" aria-label="Agregar una unidad" ${busy ? 'disabled' : ''}><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>
          <button type="button" class="icon-btn !w-8 !h-8 hover:!text-rose-300 hover:!bg-rose-500/10" data-action="cart-remove" data-product-id="${id}" aria-label="Eliminar del carrito" ${busy ? 'disabled' : ''}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>`;
    }).join('') + (totals.unknown ? `<p class="text-[11px] text-amber-300/90 px-1">${totals.unknown} unidad(es) no aparecen en el catálogo actual y no suman al total.</p>` : '');
  }

  // ---------------------------------------------------------------------------
  // Checkout (simulado: el servicio de Checkout de ADR-005 aún no existe)
  // ---------------------------------------------------------------------------
  function openCheckout() {
    if (state.cart.length === 0) return;
    const totals = cartTotals();
    const rows = state.cart.map((item) => {
      const prod = findProduct(item.productoId);
      return `<li class="flex justify-between gap-3 py-2"><span class="text-slate-300">${item.cantidad} × ${prod ? escapeHtml(prod.nombre) : `Producto #${escapeHtml(item.productoId)}`}</span>
        <span class="font-mono text-slate-200 tabular-nums">${prod ? formatMoney(prod.precio * item.cantidad) : '—'}</span></li>`;
    }).join('');
    $('checkoutBody').innerHTML = `
      <ul class="divide-y divide-slate-800 text-sm">${rows}</ul>
      <div class="flex justify-between items-baseline border-t border-slate-800 pt-3">
        <span class="text-sm font-bold text-white">Total a pagar</span>
        <span class="text-2xl font-black text-purple-300 tabular-nums">${formatMoney(totals.total)}</span>
      </div>
      <p class="text-[11px] text-emerald-300">Ahorras ${formatMoney(totals.savings)} con la venta flash.</p>
      <div>
        <label for="checkoutMethod" class="field-label">Método de pago</label>
        <select id="checkoutMethod" class="field">
          <option value="Tarjeta">Tarjeta crédito / débito (•••• 4242)</option>
          <option value="PSE">Transferencia PSE</option>
          <option value="Nequi">Nequi</option>
        </select>
      </div>
      <div class="notice notice--info !p-3 !text-xs"><i class="fa-solid fa-database mt-0.5" aria-hidden="true"></i>
        <p>Transacción ACID real en PostgreSQL (<code class="code">POST /api/pedidos/${escapeHtml(state.currentUser)}</code>): bloquea filas, descuenta stock, registra evento Outbox (ADR-005) y limpia el carrito en Redis.</p></div>
      <div class="flex justify-end gap-2.5">
        <button type="button" data-action="close-overlay" class="btn-secondary">Seguir comprando</button>
        <button type="button" id="btnConfirmOrder" data-action="confirm-order" class="btn-primary !w-auto px-5"><i class="fa-solid fa-lock" aria-hidden="true"></i> Confirmar pedido</button>
      </div>`;
    openOverlay('checkoutModal');
  }

  async function confirmOrder() {
    const btn = $('btnConfirmOrder');
    const metodoPago = $('checkoutMethod') ? $('checkoutMethod').value : 'Tarjeta';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i> Procesando…';
    const totals = cartTotals();
    const res = await apiFetch(`/api/pedidos/${encodeURIComponent(state.currentUser)}`, {
      method: 'POST',
      body: { metodoPago },
    });
    if (!res.ok) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock" aria-hidden="true"></i> Reintentar';
      showToast(describeError(res, 'completar el pedido'), 'error', 6000);
      return;
    }
    const order = res.data || {};
    const orderId = order.id || 'SH-OK';
    $('checkoutBody').innerHTML = `
      <div class="text-center py-6 space-y-3">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center"><i class="fa-solid fa-check text-3xl text-emerald-400" aria-hidden="true"></i></div>
        <p class="text-lg font-black text-white">¡Pedido guardado en PostgreSQL!</p>
        <p class="text-sm text-slate-400">Pedido <span class="font-mono font-bold text-purple-300">${escapeHtml(orderId)}</span> · ${escapeHtml(order.metodoPago || metodoPago)} · ${formatMoney(order.total ?? totals.total)}</p>
        <p class="text-xs text-emerald-300">Stock descontado en PostgreSQL · Evento <code class="code">PedidoConfirmado</code> en Outbox</p>
        <div class="flex justify-center gap-2.5 pt-2">
          <button type="button" data-action="open-orders" class="btn-secondary !h-10"><i class="fa-solid fa-receipt" aria-hidden="true"></i> Ver mis pedidos</button>
          <button type="button" data-action="close-all" class="btn-primary !w-auto !h-10 px-5">Volver a la tienda</button>
        </div>
      </div>`;
    await Promise.all([loadCatalog({ silent: true }), loadCart()]);
  }

  // ---------------------------------------------------------------------------
  // Historial de pedidos y Transactional Outbox (PostgreSQL)
  // ---------------------------------------------------------------------------
  async function loadOrders() {
    const body = $('ordersBody');
    body.innerHTML = '<div class="py-8 text-center text-slate-400 text-sm"><i class="fa-solid fa-spinner animate-spin mr-2" aria-hidden="true"></i>Consultando PostgreSQL…</div>';
    const isAdmin = can('products:write');
    const ordersPath = isAdmin ? '/api/pedidos' : `/api/pedidos/${encodeURIComponent(state.currentUser)}`;
    const [ordersRes, outboxRes] = await Promise.all([
      apiFetch(ordersPath),
      isAdmin ? apiFetch('/api/outbox') : Promise.resolve(null),
    ]);

    if (!ordersRes.ok) {
      body.innerHTML = `<div class="notice notice--error"><i class="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true"></i><div><p class="font-bold">No se pudieron cargar los pedidos</p><p class="text-xs">${escapeHtml(describeError(ordersRes, 'consultar pedidos'))}</p></div></div>`;
      return;
    }

    const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    const ordersHtml = orders.length === 0
      ? '<div class="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400"><i class="fa-solid fa-receipt text-2xl text-slate-600 mb-2 block" aria-hidden="true"></i>Aún no hay pedidos confirmados en PostgreSQL.</div>'
      : orders.map((o) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-purple-300 text-sm">${escapeHtml(o.id)}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${escapeHtml(o.estado)}</span>
              <span class="text-xs text-slate-400">${escapeHtml(o.usuarioId)} · ${escapeHtml(o.metodoPago || 'Tarjeta')}</span>
            </div>
            <span class="font-mono font-black text-white text-sm tabular-nums">${formatMoney(o.total)}</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-1">
            ${(o.items || []).map((i) => `<li class="flex justify-between gap-2"><span>${i.cantidad} × ${escapeHtml(i.nombreProducto)}</span><span class="font-mono text-slate-400 tabular-nums">${formatMoney(i.precioUnitario * i.cantidad)}</span></li>`).join('')}
          </ul>
          <p class="text-[11px] text-slate-500">${o.creadoEn ? new Date(o.creadoEn).toLocaleString('es-CO') : ''}</p>
        </div>`).join('');

    let outboxHtml = '';
    if (outboxRes && outboxRes.ok && Array.isArray(outboxRes.data)) {
      const events = outboxRes.data.slice(0, 6);
      outboxHtml = `
        <div class="pt-2 border-t border-slate-800 space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400"><i class="fa-solid fa-paper-plane text-purple-400 mr-1.5" aria-hidden="true"></i>Transactional Outbox (ADR-005 · solo admin)</h4>
          ${events.length === 0
            ? '<p class="text-xs text-slate-500">Sin eventos publicados todavía.</p>'
            : `<div class="space-y-1.5">${events.map((ev) => `
                <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                  <span class="font-mono text-slate-300">#${ev.id} · <b class="text-purple-300">${escapeHtml(ev.tipoEvento)}</b> (${escapeHtml(ev.agregadoId)})</span>
                  <span class="text-[11px] text-slate-500">${ev.creadoEn ? new Date(ev.creadoEn).toLocaleTimeString('es-CO') : ''}</span>
                </div>`).join('')}</div>`}
        </div>`;
    }

    body.innerHTML = `<div class="space-y-3 max-h-[60dvh] overflow-y-auto pr-1">${ordersHtml}${outboxHtml}</div>`;
  }

  async function restockProduct(productId) {
    const id = String(productId);
    const prod = findProduct(id);
    if (!prod || state.pending.has(`admin-${id}`)) return;
    const nextStock = (Number.isInteger(prod.stock) ? prod.stock : 0) + 10;
    state.pending.add(`admin-${id}`);
    renderProducts();
    const res = await apiFetch(`/api/productos/${encodeURIComponent(id)}`, { method: 'PATCH', body: { stock: nextStock } });
    state.pending.delete(`admin-${id}`);
    if (res.ok) {
      showToast(`Stock de “${prod.nombre}” actualizado a ${nextStock} uds.`, 'success');
      await loadCatalog({ silent: true });
    } else {
      showToast(describeError(res, 'actualizar stock'), 'error', 5000);
      renderProducts();
    }
  }

  async function deleteProduct(productId) {
    const id = String(productId);
    const prod = findProduct(id);
    if (!prod || state.pending.has(`admin-${id}`)) return;
    const ok = await confirmDialog({
      title: '¿Eliminar producto?',
      text: `Se eliminará “${prod.nombre}” de PostgreSQL.`,
      okLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    state.pending.add(`admin-${id}`);
    renderProducts();
    const res = await apiFetch(`/api/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.pending.delete(`admin-${id}`);
    if (res.ok) {
      showToast(`Producto “${prod.nombre}” eliminado.`, 'success');
      await loadCatalog({ silent: true });
    } else {
      showToast(describeError(res, 'eliminar producto'), 'error', 5000);
      renderProducts();
    }
  }

  // ---------------------------------------------------------------------------
  // Nuevo producto
  // ---------------------------------------------------------------------------
  function renderAdminControls() {
    const btn = $('btnOpenNewProduct');
    const allowed = can('products:write');
    // Sin permiso, el botón se oculta: un botón desactivado sin explicación confunde (sobre todo en táctil).
    btn.hidden = !allowed;
    btn.disabled = !allowed;
    btn.title = 'Crear un producto';
  }

  function openNewProduct() {
    $('newProductForm').reset();
    $('newProductError').classList.add('hidden');
    $('newProdPricePreview').textContent = '';
    ['newProdName', 'newProdPrice'].forEach((id) => $(id).removeAttribute('aria-invalid'));
    openOverlay('newProductModal');
  }

  async function submitNewProduct(event) {
    event.preventDefault();
    const nameEl = $('newProdName');
    const priceEl = $('newProdPrice');
    const stockEl = $('newProdStock');
    const categoryEl = $('newProdCategory');
    const descEl = $('newProdDesc');
    const errorEl = $('newProductError');
    const nombre = nameEl.value.trim();
    const precio = Number(priceEl.value);
    const stock = stockEl ? Number(stockEl.value) : 25;
    const categoria = categoryEl ? categoryEl.value : 'Accesorios';
    const descripcion = descEl ? descEl.value.trim() : '';

    const problems = [];
    nameEl.toggleAttribute('aria-invalid', !nombre);
    if (!nombre) problems.push('Escribe el nombre del producto.');
    const badPrice = !Number.isFinite(precio) || precio < 1000;
    priceEl.toggleAttribute('aria-invalid', badPrice);
    if (badPrice) problems.push('El precio debe ser de al menos $1.000.');
    if (!Number.isInteger(stock) || stock < 0) problems.push('El stock debe ser un entero mayor o igual a 0.');
    if (problems.length) {
      errorEl.textContent = problems.join(' ');
      errorEl.classList.remove('hidden');
      (nombre ? priceEl : nameEl).focus();
      return;
    }

    const submitBtn = $('btnSubmitNewProduct');
    submitBtn.disabled = true;
    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i> Creando…';
    const res = await apiFetch('/api/productos', {
      method: 'POST',
      body: { nombre, precio: Math.round(precio), stock, categoria, descripcion },
    });
    submitBtn.disabled = false;
    submitBtn.innerHTML = original;

    if (res.ok) {
      closeOverlay('newProductModal');
      showToast(`Producto “${nombre}” creado con ID ${res.data && res.data.id}.`, 'success');
      await loadCatalog({ silent: true });
    } else {
      errorEl.textContent = describeError(res, 'crear productos');
      errorEl.classList.remove('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // Monitor: prueba de rate limiting
  // ---------------------------------------------------------------------------
  async function runRateLimitTest() {
    const btn = $('btnRateLimitTest');
    const out = $('rateLimitResult');
    const n = Number($('burstSize').value) || 150;
    btn.disabled = true;
    out.innerHTML = `<span class="text-purple-300"><i class="fa-solid fa-spinner animate-spin mr-1" aria-hidden="true"></i> Enviando ${n} peticiones…</span>`;

    const started = performance.now();
    const statuses = await Promise.all(Array.from({ length: n }, () => apiFetch(cartPath(), { timeout: 8000 }).then((r) => r.status)));
    const ms = Math.round(performance.now() - started);
    const groups = statuses.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    const label = (s) => ({ 0: 'Sin respuesta', 200: '200 OK', 401: '401 No autenticado', 403: '403 Prohibido', 429: '429 Rate limit' }[s] || `HTTP ${s}`);
    const color = (s) => ({ 200: 'bg-emerald-500', 429: 'bg-amber-400', 0: 'bg-slate-600' }[s] || 'bg-rose-500');

    out.innerHTML = `
      <div class="flex h-3 rounded-full overflow-hidden bg-slate-800 mb-2">
        ${Object.entries(groups).map(([s, c]) => `<div class="${color(Number(s))}" style="width:${(c / n) * 100}%" title="${label(Number(s))}: ${c}"></div>`).join('')}
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        ${Object.entries(groups).map(([s, c]) => `<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ${color(Number(s))}"></span>${label(Number(s))}: <b class="text-white">${c}</b></span>`).join('')}
        <span class="text-slate-500">${ms} ms</span>
      </div>
      ${state.backend === 'demo' ? '<p class="text-[11px] text-sky-300 mt-2">En modo demo no hay NGINX, así que no habrá respuestas 429.</p>' : ''}`;
    btn.disabled = false;
    if (groups[429]) showToast(`NGINX bloqueó ${groups[429]} de ${n} peticiones con HTTP 429.`, 'warning');
    loadCart();
  }

  // ---------------------------------------------------------------------------
  // Sesión / token
  // ---------------------------------------------------------------------------
  async function loadDevTokens() {
    try {
      const res = await fetch(`${apiBaseUrl()}/dev-tokens.json`, { cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined });
      if (res.ok) {
        const data = await res.json();
        USERS.forEach((u) => { if (typeof data[u] === 'string') state.tokens[u] = data[u]; });
      }
    } catch { /* sin tokens: se mostrará un aviso */ }
  }

  function selectUser(user) {
    state.currentUser = user;
    storage.set('shophero_user', user);
    const custom = storage.get(`shophero_token_${user}`);
    state.tokenIsCustom = Boolean(custom);
    state.activeToken = custom || state.tokens[user] || '';
    $('userSelector').value = user;
    $('cartOwnerLabel').textContent = user;
    $('miniCartOwner').textContent = user;
    renderNotices();
    renderAdminControls();
  }

  function renderTokenModal() {
    const info = tokenInfo();
    $('jwtTextarea').value = state.activeToken;
    $('btnResetToken').disabled = !state.tokenIsCustom;
    const chips = (items, cls) => items.length ? items.map((s) => `<span class="px-2 py-0.5 rounded-md border ${cls} font-mono text-[11px]">${escapeHtml(s)}</span>`).join(' ') : '<span class="text-slate-500">ninguno</span>';
    if (!info.valid) {
      $('tokenClaims').innerHTML = `<p class="notice notice--warning !p-3">${info.present ? 'El texto actual no es un JWT válido.' : 'No hay token para esta sesión.'}</p>`;
      return;
    }
    $('tokenClaims').innerHTML = `
      <dl class="grid grid-cols-[6rem_1fr] gap-y-2 items-center">
        <dt class="text-slate-400">Usuario (sub)</dt><dd class="font-mono text-white">${escapeHtml(info.sub)}</dd>
        <dt class="text-slate-400">Scopes</dt><dd class="flex flex-wrap gap-1">${chips(info.scopes, 'border-purple-500/30 bg-purple-500/10 text-purple-200')}</dd>
        <dt class="text-slate-400">Roles</dt><dd class="flex flex-wrap gap-1">${chips(info.roles, 'border-amber-500/30 bg-amber-500/10 text-amber-200')}</dd>
        <dt class="text-slate-400">Expira</dt><dd class="${info.expired ? 'text-rose-300 font-bold' : 'text-emerald-300'}">${info.exp ? `${escapeHtml(info.exp.toLocaleString('es-CO'))} (${escapeHtml(relativeTime(info.exp))})` : 'sin fecha'}</dd>
        <dt class="text-slate-400">Origen</dt><dd class="text-slate-300">${state.tokenIsCustom ? 'Token personalizado (este navegador)' : 'frontend/dev-tokens.json'}</dd>
      </dl>`;
  }

  async function refreshSession() {
    state.cartStatus = { status: 'loading', error: null };
    renderCart();
    await Promise.all([loadCatalog(), loadCart()]);
    renderAdminControls();
  }

  // ---------------------------------------------------------------------------
  // Cuenta regresiva hasta la medianoche local
  // ---------------------------------------------------------------------------
  function tickCountdown() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((end - now) / 1000));
    $('timerHours').textContent = String(Math.floor(s / 3600)).padStart(2, '0');
    $('timerMinutes').textContent = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    $('timerSeconds').textContent = String(s % 60).padStart(2, '0');
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  function onClick(event) {
    const trigger = event.target.closest('[data-action]');
    if (!trigger || trigger.disabled) return;
    const { action, productId, category } = trigger.dataset;
    const item = productId ? state.cart.find((i) => i.productoId === productId) : null;

    const actions = {
      'go-top': () => window.scrollTo({ top: 0 }),
      'qty-increase': () => changeQuantity(productId, 1),
      'qty-decrease': () => changeQuantity(productId, -1),
      'add-to-cart': () => addToCart(productId),
      'cart-increase': () => item && setCartQuantity(productId, item.cantidad + 1),
      'cart-decrease': () => item && setCartQuantity(productId, item.cantidad - 1),
      'cart-remove': () => setCartQuantity(productId, 0),
      'reload-cart': () => loadCart(),
      'open-cart': () => { openOverlay('cartDrawer'); loadCart(); },
      'clear-cart': () => clearCart(),
      'open-checkout': () => openCheckout(),
      'confirm-order': () => confirmOrder(),
      'open-orders': () => { closeOverlay('checkoutModal'); closeOverlay('cartDrawer'); openOverlay('ordersModal'); loadOrders(); },
      'reload-orders': () => loadOrders(),
      'restock-product': () => restockProduct(productId),
      'delete-product': () => deleteProduct(productId),
      'open-new-product': () => openNewProduct(),
      'open-monitor': () => { openOverlay('monitorModal'); checkBackend(); },
      'test-rate-limit': () => runRateLimitTest(),
      'open-token-modal': () => { renderTokenModal(); openOverlay('tokenModal'); },
      'copy-token': () => copyToken(),
      'save-token': () => saveCustomToken(),
      'reset-token': () => resetToken(),
      'reload-catalog': () => loadCatalog(),
      'filter-category': () => { state.category = category || ''; renderProducts(); },
      'clear-filters': () => {
        state.category = '';
        state.search = '';
        $('searchInput').value = '';
        renderProducts();
      },
      'close-overlay': () => closeOverlay(),
      'close-all': () => { closeOverlay('checkoutModal'); closeOverlay('cartDrawer'); },
      'confirm-ok': () => { resolveConfirm(true); closeOverlay('confirmModal'); },
      'confirm-cancel': () => closeOverlay('confirmModal'),
    };
    if (actions[action]) {
      event.preventDefault();
      actions[action]();
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText($('jwtTextarea').value);
      showToast('Token copiado al portapapeles.', 'success');
    } catch {
      $('jwtTextarea').select();
      showToast('Selecciona el texto y cópialo con Ctrl+C.', 'info');
    }
  }

  function saveCustomToken() {
    const value = $('jwtTextarea').value.trim();
    if (value === (state.tokens[state.currentUser] || '')) {
      resetToken();
      return;
    }
    storage.set(`shophero_token_${state.currentUser}`, value);
    selectUser(state.currentUser);
    closeOverlay('tokenModal');
    showToast('Token personalizado aplicado.', 'success');
    refreshSession();
  }

  function resetToken() {
    storage.remove(`shophero_token_${state.currentUser}`);
    selectUser(state.currentUser);
    renderTokenModal();
    showToast('Se restableció el token de desarrollo.', 'info');
    refreshSession();
  }

  function bindEvents() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && topOverlay()) closeOverlay();
      // Atajo "/" para buscar (como en muchas tiendas y sitios de documentación).
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === '/' && !typing && !topOverlay() && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        $('searchInput').focus();
      }
    });

    $('userSelector').addEventListener('change', (e) => {
      selectUser(e.target.value);
      showToast(`Sesión cambiada a ${e.target.value}.`, 'info', 2500);
      refreshSession();
    });

    let searchTimer;
    $('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.search = e.target.value; renderProducts(); }, 120);
    });
    $('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderProducts(); });

    $('newProductForm').addEventListener('submit', submitNewProduct);
    $('newProdPrice').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      $('newProdPricePreview').textContent = v >= 1000 ? `${formatMoney(v)} · precio antes de la oferta: ${formatMoney(regularPrice(v))}` : '';
    });
  }

  // ---------------------------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------------------------
  async function init() {
    bindEvents();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    renderProducts();
    renderCart();
    renderCircuitBreaker();

    const savedUser = storage.get('shophero_user');
    await Promise.all([loadDevTokens(), checkBackend()]);
    selectUser(USERS.includes(savedUser) ? savedUser : 'usuario_1');
    await refreshSession();
    setInterval(checkBackend, HEALTH_INTERVAL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
