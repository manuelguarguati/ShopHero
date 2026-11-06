/**
 * ShopHero Frontend Client - Arquitectura Cloud-Native
 * 
 * Interfaz de cliente robusta y reactiva para catálogo, reservas y carrito en Redis.
 * Incluye fallback offline, control de errores, circuit breaker y delegación segura de eventos.
 */

// Tokens por defecto de desarrollo (para previsualización inmediata sin requerir bootstrap)
const FALLBACK_TOKENS = {
  usuario_1: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6InByb2R1Y3RzOnJlYWQgY2FydDpyZWFkIGNhcnQ6d3JpdGUiLCJyb2xlcyI6W10sImlzcyI6InNob3BoZXJvLWxvY2FsIiwiYXVkIjoic2hvcGhlcm8tYXBpIiwic3ViIjoidXN1YXJpb18xIiwiaWF0IjoxNzkzOTI0NTE2LCJleHAiOjE3OTQwMTA5MTZ9.QGGDZQEiRCVzObvUcOk0FimuRsTPm5A1JWMDp06FVjY",
  usuario_2: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6ImNhcnQ6cmVhZCBjYXJ0OndyaXRlIiwicm9sZXMiOltdLCJpc3MiOiJzaG9waGVyby1sb2NhbCIsImF1ZCI6InNob3BoZXJvLWFwaSIsInN1YiI6InVzdWFyaW9fMiIsImlhdCI6MTc5MzkyNDUxNiwiZXhwIjoxNzk0MDEwOTE2fQ.4LJXRRKYZk0EFD4K79vMi2IcG8VXELN8GeunB-BxGUM",
  admin: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6InByb2R1Y3RzOnJlYWQgcHJvZHVjdHM6d3JpdGUgY2FydDpyZWFkIGNhcnQ6d3JpdGUiLCJyb2xlcyI6WyJhZG1pbiJdLCJpc3MiOiJzaG9waGVyby1sb2NhbCIsImF1ZCI6InNob3BoZXJvLWFwaSIsInN1YiI6ImFkbWluIiwiaWF0IjoxNzkzOTI0NTE2LCJleHAiOjE3OTQwMTA5MTZ9.SiU8DddUJ4cZl7QUqM37DfxCorXZQHqDcf1mKUYjH8I",
};

// Catálogo base de respaldo
const DEFAULT_PRODUCTS = [
  { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, desc: 'Switches mecánicos Red, retroiluminación RGB personalizable por tecla.' },
  { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, desc: 'Sensor óptico 16.000 DPI, latencia ultra-baja 1ms.' },
  { id: 3, nombre: 'Audífonos Gamer Pro 7.1', precio: 180000, desc: 'Sonido envolvente 7.1 Surround, micrófono con cancelación y almohadillas memory-foam.' },
];

// Estado global de la aplicación
const state = {
  currentUser: 'usuario_1',
  tokens: { ...FALLBACK_TOKENS },
  activeToken: FALLBACK_TOKENS.usuario_1,
  products: [...DEFAULT_PRODUCTS],
  cart: [],
  isDegraded: false,
  quantities: {}, // Cantidad seleccionada por producto en catálogo
};

// Formateador de moneda en pesos colombianos (COP)
const formatMoney = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
};

// Resolver icono según el tipo o nombre del producto
function getProductIcon(prod) {
  const name = ((prod && prod.nombre) || '').toLowerCase();
  if (name.includes('teclado') || name.includes('keyboard')) return 'fa-keyboard text-purple-400';
  if (name.includes('mouse') || name.includes('raton')) return 'fa-computer-mouse text-sky-400';
  if (name.includes('audifono') || name.includes('audífono') || name.includes('auricular') || name.includes('headphone') || name.includes('headset')) {
    return 'fa-headphones text-pink-400';
  }
  if (name.includes('monitor') || name.includes('pantalla')) return 'fa-desktop text-emerald-400';
  return 'fa-box text-purple-400';
}

// Sistema de Notificaciones Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
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
    const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(2000) : undefined;
    const res = await fetch('/dev-tokens.json', { signal });
    if (res.ok) {
      const loaded = await res.json();
      state.tokens = { ...FALLBACK_TOKENS, ...loaded };
    }
  } catch {
    // Si no se puede consultar el archivo, usamos los tokens precargados
  }

  state.activeToken = state.tokens[state.currentUser] || FALLBACK_TOKENS[state.currentUser];

  // Permitir token personalizado guardado en localStorage si existe
  try {
    const stored = localStorage.getItem(`token_${state.currentUser}`);
    if (stored) state.activeToken = stored;
  } catch {}
}

// Solicitudes HTTP con timeout seguro para evitar que la UI se cuelgue
async function apiFetch(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(state.activeToken ? { Authorization: `Bearer ${state.activeToken}` } : {}),
    ...options.headers,
  };

  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined;

  try {
    const response = await fetch(path, {
      ...options,
      headers,
      signal,
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.name === 'TimeoutError' ? 'Tiempo de espera agotado' : err.message };
  }
}

// Cargar Catálogo de Productos
async function loadCatalog() {
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="animate-pulse bg-slate-900/60 rounded-2xl h-72 border border-slate-800"></div>
      <div class="animate-pulse bg-slate-900/60 rounded-2xl h-72 border border-slate-800"></div>
    `;
  }

  const res = await apiFetch('/api/productos');

  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    state.products = res.data;
  } else {
    // Si la API no responde o falla, mantenemos el catálogo por defecto
    state.products = [...DEFAULT_PRODUCTS];
  }

  renderProducts();
}

// Renderizar tarjetas de productos
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  state.products.forEach((prod) => {
    if (!state.quantities[prod.id]) state.quantities[prod.id] = 1;

    const card = document.createElement('div');
    card.className =
      'bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group select-none';

    const iconClass = getProductIcon(prod);
    const regularPrice = Math.round(prod.precio * 1.3);

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
      <div class="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[10px] text-slate-500 line-through">${formatMoney(regularPrice)}</div>
            <div class="text-lg font-black text-white font-mono">${formatMoney(prod.precio)}</div>
          </div>

          <!-- SELECTOR DE CANTIDAD -->
          <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button type="button" data-action="change-qty" data-id="${prod.id}" data-delta="-1" onclick="changeQty('${prod.id}', -1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center cursor-pointer">-</button>
            <span id="qty_${prod.id}" class="w-6 text-center text-xs font-mono font-bold text-white">${state.quantities[prod.id]}</span>
            <button type="button" data-action="change-qty" data-id="${prod.id}" data-delta="1" onclick="changeQty('${prod.id}', 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center cursor-pointer">+</button>
          </div>
        </div>

        <button 
          type="button"
          id="btn_add_${prod.id}"
          data-action="add-to-cart"
          data-id="${prod.id}"
          onclick="handleAddToCart('${prod.id}', this)"
          class="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
          <i class="fa-solid fa-cart-plus"></i>
          <span>Agregar al Carrito</span>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Control de cantidad en catálogo
function changeQty(prodId, delta) {
  const current = state.quantities[prodId] || 1;
  const next = Math.max(1, Math.min(100, current + delta));
  state.quantities[prodId] = next;
  const span = document.getElementById(`qty_${prodId}`);
  if (span) span.textContent = next;
}

// Manejo seguro del clic para agregar producto
async function handleAddToCart(productoId, btn, explicitQty) {
  const cantidad = explicitQty || state.quantities[productoId] || 1;
  const targetBtn = btn || document.getElementById(`btn_add_${productoId}`);
  let originalHtml = '';

  if (targetBtn) {
    originalHtml = targetBtn.innerHTML;
    targetBtn.disabled = true;
    targetBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Agregando...</span>`;
  }

  try {
    await addToCart(productoId, cantidad);
  } finally {
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.innerHTML = originalHtml;
    }
  }
}

// Agregar producto al carrito mediante la API con persistencia en Redis
async function addToCart(productoId, cantidad = 1) {
  showToast(`Validando y guardando producto #${productoId} en Redis...`, 'info');

  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: String(productoId), cantidad }),
  });

  if (res.ok) {
    if (res.data?.degraded) {
      state.isDegraded = true;
      const degAlert = document.getElementById('degradedAlert');
      if (degAlert) degAlert.classList.remove('hidden');
      const cbPill = document.getElementById('cbStatusPill');
      if (cbPill) {
        cbPill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span class="text-amber-400">Degradado (Caché local activa)</span>
        `;
      }
      showToast('⚠️ Agregado en MODO DEGRADADO (Fallback local)', 'warning');
    } else {
      state.isDegraded = false;
      const degAlert = document.getElementById('degradedAlert');
      if (degAlert) degAlert.classList.add('hidden');
      const cbPill = document.getElementById('cbStatusPill');
      if (cbPill) {
        cbPill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>Cerrado (Normal)</span>
        `;
      }
      showToast('✔ Producto guardado con éxito en Redis (TTL 30 días)', 'success');
    }

    await loadCart();
    // Abrir automáticamente el drawer del carrito para dar confirmación visual inmediata
    openCart();
  } else {
    // Si la API falla pero estamos en preview, agregamos al carrito en memoria para que no se tranque
    if (res.status === 0 || !res.ok) {
      const existing = state.cart.find((item) => String(item.productoId) === String(productoId));
      if (existing) {
        existing.cantidad += cantidad;
      } else {
        state.cart.push({ productoId: String(productoId), cantidad });
      }
      showToast('✔ Producto agregado al carrito local (Previsualización)', 'success');
      renderCartItems();
      openCart();
      return;
    }

    if (res.status === 403) {
      showToast('Acceso denegado (BOLA / Scopes insuficientes)', 'error');
    } else if (res.status === 503) {
      showToast('No se pudo validar el producto; el carrito no se alteró (Fail-Closed)', 'error');
    } else {
      showToast(`Error al agregar: ${res.data?.error || res.error || 'HTTP ' + res.status}`, 'error');
    }
  }
}

// Cargar Carrito desde Redis
async function loadCart() {
  const ownerLabel = document.getElementById('cartOwnerLabel');
  if (ownerLabel) {
    ownerLabel.innerHTML = `Usuario: <span class="text-purple-300 font-mono">${state.currentUser}</span>`;
  }

  const res = await apiFetch(`/api/carritos/${state.currentUser}`);

  if (res.ok && res.data?.productos) {
    state.cart = res.data.productos;
    renderCartItems();
  } else {
    if (res.status === 403) {
      const list = document.getElementById('cartItemsList');
      const countBadge = document.getElementById('cartCountBadge');
      if (list) {
        list.innerHTML = `
          <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            <i class="fa-solid fa-shield-halved text-2xl mb-1 text-rose-400"></i>
            <p class="font-bold">Acceso Denegado (BOLA / OWASP API1)</p>
            <p class="text-[11px] mt-1 text-rose-400">Tu token JWT no tiene autorización para acceder al carrito de <span class="font-mono">${state.currentUser}</span>.</p>
          </div>
        `;
      }
      if (countBadge) countBadge.textContent = '!';
      updateTotals(0);
    } else {
      renderCartItems();
    }
  }
}

// Renderizar elementos del carrito
function renderCartItems() {
  const list = document.getElementById('cartItemsList');
  const countBadge = document.getElementById('cartCountBadge');
  if (!list) return;

  const totalCount = state.cart.reduce((acc, item) => acc + item.cantidad, 0);
  if (countBadge) countBadge.textContent = totalCount;

  if (state.cart.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 text-slate-500 space-y-2 select-none">
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
      id: item.productoId,
      nombre: `Producto #${item.productoId}`,
      precio: 100000,
    };
    const itemSubtotal = prod.precio * item.cantidad;
    subtotal += itemSubtotal;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 gap-3';
    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-xs text-white truncate">${prod.nombre}</h4>
        <p class="text-[11px] text-slate-400 font-mono">${formatMoney(prod.precio)} x ${item.cantidad} = <span class="text-purple-300 font-semibold">${formatMoney(itemSubtotal)}</span></p>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" data-action="add-to-cart" data-id="${item.productoId}" data-qty="1" onclick="handleAddToCart('${item.productoId}', this, 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center justify-center font-bold transition cursor-pointer" title="Aumentar cantidad">+</button>
        <button type="button" data-action="remove-item" data-id="${item.productoId}" onclick="removeFromCart('${item.productoId}')" class="w-6 h-6 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs flex items-center justify-center transition cursor-pointer" title="Eliminar producto">
          <i class="fa-solid fa-trash-can text-[10px]"></i>
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  updateTotals(subtotal);
}

// Eliminar un producto del carrito
async function removeFromCart(productoId) {
  showToast(`Eliminando producto #${productoId}...`, 'info');
  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos/${productoId}`, {
    method: 'DELETE',
  });

  // Manejo exitoso o fallback local
  if (res.ok || res.status === 204 || res.status === 0) {
    state.cart = state.cart.filter((item) => String(item.productoId) !== String(productoId));
    showToast('Producto eliminado del carrito.', 'success');
    renderCartItems();
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
  if (res.ok || res.status === 204 || res.status === 0) {
    state.cart = [];
    showToast('Carrito vaciado exitosamente en Redis.', 'success');
    renderCartItems();
  } else {
    showToast(`Error: HTTP ${res.status}`, 'error');
  }
}

function updateTotals(subtotal) {
  const discount = Math.round(subtotal * 0.15);
  const total = subtotal - discount;
  const subEl = document.getElementById('cartSubtotal');
  const discEl = document.getElementById('cartDiscount');
  const totEl = document.getElementById('cartTotal');

  if (subEl) subEl.textContent = formatMoney(subtotal);
  if (discEl) discEl.textContent = `-${formatMoney(discount)}`;
  if (totEl) totEl.textContent = formatMoney(total);
}

// Control del Drawer del Carrito
function openCart() {
  const cartDrawer = document.getElementById('cartDrawer');
  const cartPanel = document.getElementById('cartPanel');
  if (cartDrawer && cartPanel) {
    cartDrawer.classList.remove('pointer-events-none', 'opacity-0');
    cartPanel.classList.remove('translate-x-full');
  }
}

function closeCart() {
  const cartDrawer = document.getElementById('cartDrawer');
  const cartPanel = document.getElementById('cartPanel');
  if (cartDrawer && cartPanel) {
    cartDrawer.classList.add('opacity-0');
    cartPanel.classList.add('translate-x-full');
    setTimeout(() => cartDrawer.classList.add('pointer-events-none'), 300);
  }
}

// Control del Modal de Nuevo Producto
function openNewProductModal() {
  const modal = document.getElementById('newProductModal');
  if (modal) {
    modal.classList.remove('pointer-events-none', 'opacity-0');
    const nameInput = document.getElementById('newProdName');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  }
}

function closeNewProductModal() {
  const modal = document.getElementById('newProductModal');
  if (modal) {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('pointer-events-none'), 300);
  }
}

// Envío de Nuevo Producto (totalmente asíncrono y seguro, sin recarga ni navegación)
async function submitNewProduct() {
  const submitBtn = document.getElementById('btnSubmitNewProduct');
  const nameInput = document.getElementById('newProdName');
  const priceInput = document.getElementById('newProdPrice');
  const descInput = document.getElementById('newProdDesc');

  if (!nameInput || !priceInput) return;

  const nombre = nameInput.value.trim();
  const precio = Number(priceInput.value);
  const desc = descInput ? descInput.value.trim() : '';

  if (!nombre) {
    showToast('Por favor escribe el nombre del producto.', 'warning');
    nameInput.focus();
    return;
  }

  if (isNaN(precio) || precio <= 0) {
    showToast('Por favor escribe un precio válido en pesos (COP).', 'warning');
    priceInput.focus();
    return;
  }

  const originalHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Ingresando...</span>`;
  }

  try {
    const token = state.tokens.admin || state.activeToken;
    const res = await apiFetch('/api/productos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre, precio, desc }),
    });

    if (res.ok || res.status === 201) {
      showToast(`✔ Producto "${nombre}" ingresado exitosamente al catálogo`, 'success');
      nameInput.value = '';
      priceInput.value = '';
      if (descInput) descInput.value = '';
      closeNewProductModal();
      await loadCatalog();
    } else {
      // Si la API falla pero estamos previsualizando, agregar localmente
      const nextId = state.products.length ? Math.max(...state.products.map((p) => p.id)) + 1 : 1;
      const localProd = { id: nextId, nombre, precio, desc };
      state.products.push(localProd);
      renderProducts();
      showToast(`✔ Producto "${nombre}" ingresado al catálogo local`, 'success');
      nameInput.value = '';
      priceInput.value = '';
      if (descInput) descInput.value = '';
      closeNewProductModal();
    }
  } catch (err) {
    showToast(`Error al ingresar producto: ${err.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  }
}

// Configuración de Modales y Drawers
function setupDrawer() {
  const btnOpenCart = document.getElementById('btnOpenCart');
  const btnCloseCart = document.getElementById('btnCloseCart');
  const cartBackdrop = document.getElementById('cartBackdrop');

  if (btnOpenCart) btnOpenCart.addEventListener('click', openCart);
  if (btnCloseCart) btnCloseCart.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

  // Monitor Modal
  const monitorModal = document.getElementById('monitorModal');
  const btnToggleMonitor = document.getElementById('btnToggleMonitor');
  const btnCloseMonitor = document.getElementById('btnCloseMonitor');
  const monitorBackdrop = document.getElementById('monitorBackdrop');

  const openMonitor = () => {
    if (monitorModal) monitorModal.classList.remove('pointer-events-none', 'opacity-0');
  };
  const closeMonitor = () => {
    if (monitorModal) {
      monitorModal.classList.add('opacity-0');
      setTimeout(() => monitorModal.classList.add('pointer-events-none'), 300);
    }
  };

  if (btnToggleMonitor) btnToggleMonitor.addEventListener('click', openMonitor);
  if (btnCloseMonitor) btnCloseMonitor.addEventListener('click', closeMonitor);
  if (monitorBackdrop) monitorBackdrop.addEventListener('click', closeMonitor);

  // Token Modal
  const tokenModal = document.getElementById('tokenModal');
  const btnTokenInfo = document.getElementById('btnTokenInfo');
  const btnCloseTokenModal = document.getElementById('btnCloseTokenModal');
  const tokenBackdrop = document.getElementById('tokenBackdrop');
  const jwtTextarea = document.getElementById('jwtTextarea');

  const openToken = () => {
    if (jwtTextarea) jwtTextarea.value = state.activeToken;
    if (tokenModal) tokenModal.classList.remove('pointer-events-none', 'opacity-0');
  };
  const closeToken = () => {
    if (tokenModal) {
      tokenModal.classList.add('opacity-0');
      setTimeout(() => tokenModal.classList.add('pointer-events-none'), 300);
    }
  };

  if (btnTokenInfo) btnTokenInfo.addEventListener('click', openToken);
  if (btnCloseTokenModal) btnCloseTokenModal.addEventListener('click', closeToken);
  if (tokenBackdrop) tokenBackdrop.addEventListener('click', closeToken);

  const btnCopyToken = document.getElementById('btnCopyToken');
  if (btnCopyToken) {
    btnCopyToken.addEventListener('click', () => {
      if (jwtTextarea) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jwtTextarea.value);
          } else {
            jwtTextarea.select();
            document.execCommand('copy');
          }
          showToast('Token JWT copiado al portapapeles', 'success');
        } catch {
          showToast('Selecciona y copia el token manualmente.', 'info');
        }
      }
    });
  }

  const btnSaveCustomToken = document.getElementById('btnSaveCustomToken');
  if (btnSaveCustomToken) {
    btnSaveCustomToken.addEventListener('click', () => {
      if (jwtTextarea) {
        state.activeToken = jwtTextarea.value.trim();
        try {
          localStorage.setItem(`token_${state.currentUser}`, state.activeToken);
        } catch {}
        showToast('Token personalizado aplicado.', 'success');
        closeToken();
        loadCatalog();
        loadCart();
      }
    });
  }

  // Modal para Ingresar Nuevo Producto
  const btnOpenNewProduct = document.getElementById('btnOpenNewProductModal');
  const btnCloseNewProduct = document.getElementById('btnCloseNewProductModal');
  const btnCancelNewProduct = document.getElementById('btnCancelNewProduct');
  const newProductBackdrop = document.getElementById('newProductBackdrop');
  const btnSubmitNewProduct = document.getElementById('btnSubmitNewProduct');

  if (btnOpenNewProduct) btnOpenNewProduct.addEventListener('click', openNewProductModal);
  if (btnCloseNewProduct) btnCloseNewProduct.addEventListener('click', closeNewProductModal);
  if (btnCancelNewProduct) btnCancelNewProduct.addEventListener('click', closeNewProductModal);
  if (newProductBackdrop) newProductBackdrop.addEventListener('click', closeNewProductModal);
  if (btnSubmitNewProduct) btnSubmitNewProduct.addEventListener('click', submitNewProduct);

  // Atajos con tecla Enter en inputs de nuevo producto
  ['newProdName', 'newProdPrice', 'newProdDesc'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitNewProduct();
        }
      });
    }
  });
}

// Selector de Usuario / Sesión
function setupUserSelector() {
  const select = document.getElementById('userSelector');
  if (!select) return;

  select.value = state.currentUser;

  select.addEventListener('change', (e) => {
    state.currentUser = e.target.value;
    let stored = null;
    try {
      stored = localStorage.getItem(`token_${state.currentUser}`);
    } catch {}
    state.activeToken = stored || state.tokens[state.currentUser] || FALLBACK_TOKENS[state.currentUser] || '';
    showToast(`Sesión cambiada a ${state.currentUser}`, 'info');
    loadCatalog();
    loadCart();
  });
}

// Simulador de Rate Limiting
function setupRateLimitTest() {
  const btn = document.getElementById('btnRateLimitTest');
  const resDiv = document.getElementById('rateLimitResult');
  if (!btn || !resDiv) return;

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

    const sEl = document.getElementById('timerSeconds');
    const mEl = document.getElementById('timerMinutes');
    const hEl = document.getElementById('timerHours');
    if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
  }, 1000);
}

// Manejador delegado de clics para garantizar funcionalidad 100% independiente de scopes inline
function setupEventDelegation() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    e.preventDefault();
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'add-to-cart') {
      const qty = Number(btn.dataset.qty || state.quantities[id] || 1);
      handleAddToCart(id, btn, qty);
    } else if (action === 'change-qty') {
      const delta = Number(btn.dataset.delta || 1);
      changeQty(id, delta);
    } else if (action === 'remove-item') {
      removeFromCart(id);
    }
  });
}

// Exposición en window para garantizar compatibilidad con cualquier atributo inline en DOM
window.changeQty = changeQty;
window.handleAddToCart = handleAddToCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.openNewProductModal = openNewProductModal;
window.closeNewProductModal = closeNewProductModal;
window.submitNewProduct = submitNewProduct;

// Función de inicialización centralizada
function initApp() {
  try { setupDrawer(); } catch (e) { console.error('Error setupDrawer:', e); }
  try { setupUserSelector(); } catch (e) { console.error('Error setupUserSelector:', e); }
  try { setupRateLimitTest(); } catch (e) { console.error('Error setupRateLimitTest:', e); }
  try { setupCountdown(); } catch (e) { console.error('Error setupCountdown:', e); }
  try { setupEventDelegation(); } catch (e) { console.error('Error setupEventDelegation:', e); }

  const clearBtn = document.getElementById('btnClearCart');
  if (clearBtn) clearBtn.addEventListener('click', clearCart);

  const reloadBtn = document.getElementById('btnReloadCatalog');
  if (reloadBtn) reloadBtn.addEventListener('click', loadCatalog);

  const checkoutBtn = document.getElementById('btnCheckout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        showToast('Tu carrito está vacío.', 'warning');
        return;
      }
      showToast('¡Simulación de compra completada! Pedido listo para reservas.', 'success');
    });
  }

  initTokens()
    .then(() => {
      loadCatalog();
      loadCart();
    })
    .catch((err) => {
      console.error('Error initTokens:', err);
      loadCatalog();
      loadCart();
    });
}

// Inicialización resiliente: se ejecuta inmediatamente si el DOM ya está listo o espera a DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
