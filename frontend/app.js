/**
 * ShopHero Frontend Client - Arquitectura Cloud-Native
 */

// Estado global de la aplicación
const state = {
  currentUser: 'usuario_1',
  tokens: {},
  activeToken: '',
  products: [],
  cart: [],
  isDegraded: false,
};

// Formateador de moneda en pesos colombianos (COP)
const formatMoney = (val) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

// Sistema de Notificaciones Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-slate-900 border-purple-500/40 text-purple-200',
    success: 'bg-slate-900 border-emerald-500/40 text-emerald-200',
    warning: 'bg-slate-900 border-amber-500/40 text-amber-200',
    error: 'bg-slate-900 border-rose-500/40 text-rose-200',
  };
  const icons = {
    info: 'fa-info-circle text-purple-400',
    success: 'fa-circle-check text-emerald-400',
    warning: 'fa-triangle-exclamation text-amber-400',
    error: 'fa-circle-xmark text-rose-400',
  };

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Carga de Tokens de Desarrollo
async function initTokens() {
  try {
    const res = await fetch('/dev-tokens.json');
    if (res.ok) {
      state.tokens = await res.json();
      state.activeToken = state.tokens[state.currentUser] || '';
      console.log('Tokens cargados exitosamente desde /dev-tokens.json');
    }
  } catch (err) {
    console.warn('No se pudo cargar /dev-tokens.json de forma estática:', err);
  }

  // Si no hay token, intentar cargar de localStorage
  if (!state.activeToken) {
    const stored = localStorage.getItem(`token_${state.currentUser}`);
    if (stored) state.activeToken = stored;
  }
}

// Solicitudes autenticadas con Bearer JWT
async function apiFetch(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(state.activeToken ? { Authorization: `Bearer ${state.activeToken}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(path, { ...options, headers });
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

// Cargar Catálogo de Productos
async function loadCatalog() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = `
    <div class="animate-pulse bg-slate-900/60 rounded-2xl h-72 border border-slate-800"></div>
    <div class="animate-pulse bg-slate-900/60 rounded-2xl h-72 border border-slate-800"></div>
  `;

  const res = await apiFetch('/api/productos');

  if (res.ok && Array.isArray(res.data)) {
    state.products = res.data;
  } else {
    // Si no está el Gateway o falta token, usar productos conocidos por defecto
    state.products = [
      { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, desc: 'Switches mecánicos Red, retroiluminación RGB por tecla.' },
      { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, desc: 'Sensor óptico 16.000 DPI, latencia ultra-baja 1ms.' },
    ];
    if (res.status === 401) {
      showToast('Sesión no autenticada para ver productos (HTTP 401). Usando vista demo.', 'warning');
    }
  }

  renderProducts();
}

// Renderizar tarjetas de productos
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  const icons = {
    1: 'fa-keyboard text-purple-400',
    2: 'fa-computer-mouse text-sky-400',
  };

  state.products.forEach((prod) => {
    const card = document.createElement('div');
    card.className =
      'bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group';

    const iconClass = icons[prod.id] || 'fa-box text-purple-400';

    card.innerHTML = `
      <div>
        <!-- TOP CARD BADGES -->
        <div class="flex items-center justify-between mb-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            -30% VENTA FLASH
          </span>
          <span class="text-[11px] font-mono text-slate-500">ID: ${prod.id}</span>
        </div>

        <!-- PRODUCT ICON / VISUAL -->
        <div class="w-full h-32 rounded-xl bg-gradient-to-b from-slate-800/50 to-slate-950 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-slate-800/50">
          <i class="fa-solid ${iconClass} text-5xl"></i>
        </div>

        <!-- DETAILS -->
        <h3 class="font-bold text-base text-white group-hover:text-purple-300 transition-colors">${prod.nombre}</h3>
        <p class="text-xs text-slate-400 mt-1 line-clamp-2">${prod.desc || 'Garantía oficial de 1 año con soporte prioritario ShopHero.'}</p>
      </div>

      <!-- PRICE & ACTIONS -->
      <div class="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <div class="text-[10px] text-slate-500 line-through">${formatMoney(prod.precio * 1.3)}</div>
          <div class="text-lg font-black text-white font-mono">${formatMoney(prod.precio)}</div>
        </div>

        <button 
          onclick="addToCart('${prod.id}', 1)"
          class="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-purple-600/20">
          <i class="fa-solid fa-cart-plus"></i>
          <span>Agregar</span>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Agregar producto al carrito
async function addToCart(productoId, cantidad = 1) {
  showToast(`Validando y agregando producto ${productoId} en Redis...`, 'info');

  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: String(productoId), cantidad }),
  });

  if (res.ok) {
    if (res.data?.degraded) {
      state.isDegraded = true;
      document.getElementById('degradedAlert').classList.remove('hidden');
      document.getElementById('cbStatusPill').innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
        <span class="text-amber-400">Degradado (Caché local activa)</span>
      `;
      showToast('⚠️ Agregado en MODO DEGRADADO (Productos fuera de línea)', 'warning');
    } else {
      state.isDegraded = false;
      document.getElementById('degradedAlert').classList.add('hidden');
      document.getElementById('cbStatusPill').innerHTML = `
        <span class="w-2 h-2 rounded-full bg-purple-500"></span>
        <span>Cerrado (Normal)</span>
      `;
      showToast('✔ Producto guardado con éxito en Redis (TTL 30 días)', 'success');
    }
    await loadCart();
  } else {
    if (res.status === 403) {
      showToast('Acceso denegado (BOLA / Scopes insuficientes)', 'error');
    } else if (res.status === 503) {
      showToast('No se pudo validar el producto; el carrito no se alteró (Fail-Closed)', 'error');
    } else {
      showToast(`Error al agregar: ${res.data?.error || 'HTTP ' + res.status}`, 'error');
    }
  }
}

// Cargar Carrito desde Redis
async function loadCart() {
  document.getElementById('cartOwnerLabel').innerHTML = `Usuario: <span class="text-purple-300 font-mono">${state.currentUser}</span>`;

  const res = await apiFetch(`/api/carritos/${state.currentUser}`);

  const list = document.getElementById('cartItemsList');
  const countBadge = document.getElementById('cartCountBadge');

  if (res.ok && res.data?.productos) {
    state.cart = res.data.productos;
    const totalCount = state.cart.reduce((acc, item) => acc + item.cantidad, 0);
    countBadge.textContent = totalCount;

    if (state.cart.length === 0) {
      list.innerHTML = `
        <div class="text-center py-16 text-slate-500 space-y-2">
          <i class="fa-solid fa-basket-shopping text-4xl text-slate-700"></i>
          <p class="text-sm">Tu carrito en Redis está vacío.</p>
        </div>
      `;
      updateTotals(0);
      return;
    }

    let subtotal = 0;
    list.innerHTML = '';

    state.cart.forEach((item) => {
      const prod = state.products.find((p) => String(p.id) === String(item.productoId)) || {
        nombre: `Producto #${item.productoId}`,
        precio: 100000,
      };
      const itemSubtotal = prod.precio * item.cantidad;
      subtotal += itemSubtotal;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 gap-3';
      row.innerHTML = `
        <div class="flex-1">
          <h4 class="font-bold text-xs text-white">${prod.nombre}</h4>
          <p class="text-[11px] text-slate-400 font-mono">${formatMoney(prod.precio)} x ${item.cantidad} = <span class="text-purple-300 font-semibold">${formatMoney(itemSubtotal)}</span></p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="addToCart('${item.productoId}', 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center justify-center font-bold">+</button>
          <button onclick="removeFromCart('${item.productoId}')" class="w-6 h-6 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs flex items-center justify-center transition">
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </div>
      `;
      list.appendChild(row);
    });

    updateTotals(subtotal);
  } else {
    if (res.status === 403) {
      list.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
          <i class="fa-solid fa-shield-halved text-2xl mb-1 text-rose-400"></i>
          <p class="font-bold">Acceso Denegado (BOLA / OWASP API1)</p>
          <p class="text-[11px] mt-1 text-rose-400">Tu token JWT no tiene autorización para acceder al carrito de <span class="font-mono">${state.currentUser}</span>.</p>
        </div>
      `;
      countBadge.textContent = '!';
    } else {
      list.innerHTML = `<div class="text-center py-12 text-slate-500 text-xs">No se pudo consultar Redis (HTTP ${res.status}).</div>`;
      countBadge.textContent = '0';
    }
    updateTotals(0);
  }
}

// Eliminar un producto del carrito
async function removeFromCart(productoId) {
  showToast(`Eliminando producto ${productoId}...`, 'info');
  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos/${productoId}`, {
    method: 'DELETE',
  });
  if (res.ok || res.status === 204) {
    showToast('Producto eliminado del carrito.', 'success');
    await loadCart();
  } else {
    showToast(`Error al eliminar: HTTP ${res.status}`, 'error');
  }
}

// Vaciar carrito
async function clearCart() {
  if (!confirm('¿Deseas vaciar completamente tu carrito de compras?')) return;
  const res = await apiFetch(`/api/carritos/${state.currentUser}`, {
    method: 'DELETE',
  });
  if (res.ok || res.status === 204) {
    showToast('Carrito vaciado exitosamente en Redis.', 'success');
    await loadCart();
  } else {
    showToast(`Error: HTTP ${res.status}`, 'error');
  }
}

function updateTotals(subtotal) {
  const discount = subtotal * 0.15;
  const total = subtotal - discount;
  document.getElementById('cartSubtotal').textContent = formatMoney(subtotal);
  document.getElementById('cartDiscount').textContent = `-${formatMoney(discount)}`;
  document.getElementById('cartTotal').textContent = formatMoney(total);
}

// Drawer Controls
function setupDrawer() {
  const cartDrawer = document.getElementById('cartDrawer');
  const cartPanel = document.getElementById('cartPanel');
  const btnOpenCart = document.getElementById('btnOpenCart');
  const btnCloseCart = document.getElementById('btnCloseCart');
  const cartBackdrop = document.getElementById('cartBackdrop');

  const openCart = () => {
    cartDrawer.classList.remove('pointer-events-none', 'opacity-0');
    cartPanel.classList.remove('translate-x-full');
    loadCart();
  };

  const closeCart = () => {
    cartDrawer.classList.add('opacity-0');
    cartPanel.classList.add('translate-x-full');
    setTimeout(() => cartDrawer.classList.add('pointer-events-none'), 300);
  };

  btnOpenCart.addEventListener('click', openCart);
  btnCloseCart.addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);

  // Monitor Modal
  const monitorModal = document.getElementById('monitorModal');
  const btnToggleMonitor = document.getElementById('btnToggleMonitor');
  const btnCloseMonitor = document.getElementById('btnCloseMonitor');
  const monitorBackdrop = document.getElementById('monitorBackdrop');

  btnToggleMonitor.addEventListener('click', () => {
    monitorModal.classList.remove('pointer-events-none', 'opacity-0');
  });

  const closeMonitor = () => {
    monitorModal.classList.add('opacity-0');
    setTimeout(() => monitorModal.classList.add('pointer-events-none'), 300);
  };
  btnCloseMonitor.addEventListener('click', closeMonitor);
  monitorBackdrop.addEventListener('click', closeMonitor);

  // Token Modal
  const tokenModal = document.getElementById('tokenModal');
  const btnTokenInfo = document.getElementById('btnTokenInfo');
  const btnCloseTokenModal = document.getElementById('btnCloseTokenModal');
  const tokenBackdrop = document.getElementById('tokenBackdrop');
  const jwtTextarea = document.getElementById('jwtTextarea');

  btnTokenInfo.addEventListener('click', () => {
    jwtTextarea.value = state.activeToken;
    tokenModal.classList.remove('pointer-events-none', 'opacity-0');
  });

  const closeToken = () => {
    tokenModal.classList.add('opacity-0');
    setTimeout(() => tokenModal.classList.add('pointer-events-none'), 300);
  };
  btnCloseTokenModal.addEventListener('click', closeToken);
  tokenBackdrop.addEventListener('click', closeToken);

  document.getElementById('btnCopyToken').addEventListener('click', () => {
    navigator.clipboard.writeText(jwtTextarea.value);
    showToast('Token JWT copiado al portapapeles', 'success');
  });

  document.getElementById('btnSaveCustomToken').addEventListener('click', () => {
    state.activeToken = jwtTextarea.value.trim();
    localStorage.setItem(`token_${state.currentUser}`, state.activeToken);
    showToast('Token personalizado aplicado.', 'success');
    closeToken();
    loadCatalog();
    loadCart();
  });
}

// Selector de Usuario
function setupUserSelector() {
  const select = document.getElementById('userSelector');
  select.value = state.currentUser;

  select.addEventListener('change', (e) => {
    state.currentUser = e.target.value;
    state.activeToken = state.tokens[state.currentUser] || localStorage.getItem(`token_${state.currentUser}`) || '';
    showToast(`Sesión cambiada a ${state.currentUser}`, 'info');
    loadCatalog();
    loadCart();
  });
}

// Simulador de Rate Limiting
function setupRateLimitTest() {
  const btn = document.getElementById('btnRateLimitTest');
  const resDiv = document.getElementById('rateLimitResult');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    resDiv.innerHTML = '<span class="text-purple-400"><i class="fa-solid fa-spinner animate-spin"></i> Disparando 50 requests concurrentes...</span>';

    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(apiFetch(`/api/carritos/${state.currentUser}`).then((r) => r.status));
    }

    const statuses = await Promise.all(promises);
    const count200 = statuses.filter((s) => s === 200).length;
    const count429 = statuses.filter((s) => s === 429).length;

    resDiv.innerHTML = `
      <span class="text-emerald-400 font-bold">200 OK: ${count200}</span> | 
      <span class="text-amber-400 font-bold">429 Rate Limit: ${count429}</span>
    `;
    btn.disabled = false;
    showToast(`Ráfaga finalizada: ${count429} peticiones bloqueadas por NGINX (429)`, 'warning');
  });
}

// Countdown timer para Flash Sale
function setupCountdown() {
  let seconds = 18;
  let minutes = 42;
  let hours = 3;

  setInterval(() => {
    if (seconds > 0) {
      seconds--;
    } else {
      seconds = 59;
      if (minutes > 0) {
        minutes--;
      } else {
        minutes = 59;
        if (hours > 0) hours--;
      }
    }

    document.getElementById('timerSeconds').textContent = String(seconds).padStart(2, '0');
    document.getElementById('timerMinutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('timerHours').textContent = String(hours).padStart(2, '0');
  }, 1000);
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  setupDrawer();
  setupUserSelector();
  setupRateLimitTest();
  setupCountdown();

  document.getElementById('btnClearCart').addEventListener('click', clearCart);
  document.getElementById('btnReloadCatalog').addEventListener('click', loadCatalog);
  document.getElementById('btnCheckout').addEventListener('click', () => {
    if (state.cart.length === 0) {
      showToast('Tu carrito está vacío.', 'warning');
      return;
    }
    showToast('¡Simulación de compra completada! Pedido listo para reservas.', 'success');
  });

  await initTokens();
  await loadCatalog();
  await loadCart();
});
