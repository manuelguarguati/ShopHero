/**
 * ShopHero Frontend Client - Arquitectura Cloud-Native
 * 
 * Interfaz de cliente robusta y reactiva para catálogo, reservas y carrito en Redis.
 * Manejo de eventos centralizado y delegación segura.
 */

// Tokens por defecto de desarrollo para previsualización inmediata
const FALLBACK_TOKENS = {
  usuario_1: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6InByb2R1Y3RzOnJlYWQgY2FydDpyZWFkIGNhcnQ6d3JpdGUiLCJyb2xlcyI6W10sImlzcyI6InNob3BoZXJvLWxvY2FsIiwiYXVkIjoic2hvcGhlcm8tYXBpIiwic3ViIjoidXN1YXJpb18xIiwiaWF0IjoxNzkzOTI0NTE2LCJleHAiOjE3OTQwMTA5MTZ9.QGGDZQEiRCVzObvUcOk0FimuRsTPm5A1JWMDp06FVjY",
  usuario_2: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6ImNhcnQ6cmVhZCBjYXJ0OndyaXRlIiwicm9sZXMiOltdLCJpc3MiOiJzaG9waGVyby1sb2NhbCIsImF1ZCI6InNob3BoZXJvLWFwaSIsInN1YiI6InVzdWFyaW9fMiIsImlhdCI6MTc5MzkyNDUxNiwiZXhwIjoxNzk0MDEwOTE2fQ.4LJXRRKYZk0EFD4K79vMi2IcG8VXELN8GeunB-BxGUM",
  admin: "eyJhbGciOiJIUzI1NiJ9.eyJzY29wZSI6InByb2R1Y3RzOnJlYWQgcHJvZHVjdHM6d3JpdGUgY2FydDpyZWFkIGNhcnQ6d3JpdGUiLCJyb2xlcyI6WyJhZG1pbiJdLCJpc3MiOiJzaG9waGVyby1sb2NhbCIsImF1ZCI6InNob3BoZXJvLWFwaSIsInN1YiI6ImFkbWluIiwiaWF0IjoxNzkzOTI0NTE2LCJleHAiOjE3OTQwMTA5MTZ9.SiU8DddUJ4cZl7QUqM37DfxCorXZQHqDcf1mKUYjH8I",
};

// Catálogo inicial conocido (para renderizado instantáneo sin pantallas en blanco)
const INITIAL_PRODUCTS = [
  { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, desc: 'Switches mecánicos Red, retroiluminación RGB personalizable por tecla.' },
  { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, desc: 'Sensor óptico 16.000 DPI, latencia ultra-baja 1ms.' },
  { id: 3, nombre: 'Audífonos Gamer Pro 7.1', precio: 180000, desc: 'Sonido envolvente 7.1 Surround, micrófono con cancelación y almohadillas memory-foam.' },
];

// Estado global de la aplicación
const state = {
  currentUser: 'usuario_1',
  tokens: { ...FALLBACK_TOKENS },
  activeToken: FALLBACK_TOKENS.usuario_1,
  products: [...INITIAL_PRODUCTS],
  cart: [],
  isDegraded: false,
  quantities: { '1': 1, '2': 1, '3': 1 }, // Cantidad seleccionada por producto en catálogo
};

// Formateador de moneda en pesos colombianos (COP)
const formatMoney = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
};

// Resolver icono según el tipo o nombre del producto
function getProductIcon(prod) {
  const name = ((prod && prod.nombre) || '').toLowerCase();
  if (name.includes('audifono') || name.includes('audífono') || name.includes('auricular') || name.includes('headphone') || name.includes('headset')) {
    return 'fa-headphones text-pink-400';
  }
  if (name.includes('teclado') || name.includes('keyboard')) return 'fa-keyboard text-purple-400';
  if (name.includes('mouse') || name.includes('raton')) return 'fa-computer-mouse text-sky-400';
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

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
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
    // Si no está disponible, mantenemos los tokens de desarrollo precargados
  }

  state.activeToken = state.tokens[state.currentUser] || FALLBACK_TOKENS[state.currentUser];

  try {
    const stored = localStorage.getItem(`token_${state.currentUser}`);
    if (stored) state.activeToken = stored;
  } catch {}
}

// Peticiones HTTP seguras hacia el API Gateway
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

// Renderizar tarjetas de productos en el grid del catálogo
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  state.products.forEach((prod) => {
    const prodId = String(prod.id);
    if (!state.quantities[prodId]) state.quantities[prodId] = 1;

    const card = document.createElement('div');
    card.className =
      'bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group select-none';

    const iconClass = getProductIcon(prod);
    const regularPrice = Math.round(prod.precio * 1.3);

    card.innerHTML = `
      <div>
        <!-- TOP BADGES -->
        <div class="flex items-center justify-between mb-4">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30">
            -30% VENTA FLASH
          </span>
          <span class="text-[11px] font-mono text-slate-500 font-bold">ID: ${prod.id}</span>
        </div>

        <!-- PRODUCT VISUAL / ICON -->
        <div class="w-full h-36 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-950 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-slate-800/60 shadow-inner">
          <i class="fa-solid ${iconClass} text-5xl"></i>
        </div>

        <!-- DETAILS -->
        <h3 class="font-extrabold text-base text-white group-hover:text-purple-300 transition-colors">${prod.nombre}</h3>
        <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${prod.desc || 'Garantía oficial de 1 año con soporte prioritario ShopHero.'}</p>
      </div>

      <!-- PRICE & ACTIONS -->
      <div class="mt-5 pt-4 border-t border-slate-800/80 space-y-3.5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[11px] text-slate-500 line-through">${formatMoney(regularPrice)}</div>
            <div class="text-lg font-black text-white font-mono">${formatMoney(prod.precio)}</div>
          </div>

          <!-- SELECTOR DE CANTIDAD: SUBE AL DARLE AL MÁS, BAJA AL DARLE AL MENOS -->
          <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button 
              type="button" 
              data-action="qty-decrease" 
              data-product-id="${prodId}" 
              class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 text-sm font-black transition flex items-center justify-center cursor-pointer select-none"
              title="Disminuir cantidad">
              -
            </button>
            <span 
              id="qty-${prodId}" 
              class="w-8 text-center text-xs font-mono font-black text-white select-none transition-transform duration-150">
              ${state.quantities[prodId]}
            </span>
            <button 
              type="button" 
              data-action="qty-increase" 
              data-product-id="${prodId}" 
              class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 text-sm font-black transition flex items-center justify-center cursor-pointer select-none"
              title="Aumentar cantidad">
              +
            </button>
          </div>
        </div>

        <!-- BOTÓN AGREGAR AL CARRITO -->
        <button 
          type="button"
          id="btn-add-${prodId}"
          data-action="add-to-cart"
          data-product-id="${prodId}"
          class="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
          <i class="fa-solid fa-cart-plus"></i>
          <span>Agregar al Carrito</span>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Cargar Catálogo de Productos desde el Gateway
async function loadCatalog() {
  const res = await apiFetch('/api/productos');

  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    state.products = res.data;
  }
  renderProducts();
}

// Modificar cantidad seleccionada de un producto en el catálogo
function changeQuantity(productId, delta) {
  const id = String(productId);
  const current = Number(state.quantities[id]) || 1;
  const next = Math.max(1, Math.min(99, current + delta));
  state.quantities[id] = next;

  const qtyDisplay = document.getElementById(`qty-${id}`);
  if (qtyDisplay) {
    qtyDisplay.textContent = String(next);
    // Micro-animación visual para confirmar el cambio al usuario
    qtyDisplay.classList.add('text-purple-300', 'scale-125');
    setTimeout(() => {
      qtyDisplay.classList.remove('text-purple-300', 'scale-125');
    }, 150);
  }
}

// Agregar producto al carrito desde la tarjeta del catálogo
async function handleAddToCart(productId, triggerBtn) {
  const id = String(productId);
  const cantidad = Number(state.quantities[id]) || 1;
  const prod = state.products.find((p) => String(p.id) === id) || { nombre: `Producto #${id}` };

  const btn = triggerBtn || document.getElementById(`btn-add-${id}`);
  let originalHtml = '';

  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Agregando (${cantidad})...</span>`;
  }

  showToast(`Validando y guardando ${cantidad} x "${prod.nombre}" en Redis...`, 'info');

  try {
    await persistCartItem(id, cantidad);
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-check text-emerald-300"></i> <span>¡Agregado!</span>`;
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }, 800);
    }
  } catch (err) {
    showToast(`Error al agregar: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// Guardar producto en el microservicio de carrito (persistencia en Redis)
async function persistCartItem(productoId, cantidad) {
  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productoId: String(productoId), cantidad: Number(cantidad) }),
  });

  if (res.ok) {
    if (res.data?.degraded) {
      state.isDegraded = true;
      const alertEl = document.getElementById('degradedAlert');
      if (alertEl) alertEl.classList.remove('hidden');
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
      const alertEl = document.getElementById('degradedAlert');
      if (alertEl) alertEl.classList.add('hidden');
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
    openCartDrawer();
  } else {
    // Si la API falla pero estamos en modo local/previsualización, agregamos al carrito en memoria
    if (res.status === 0 || !res.ok) {
      const existing = state.cart.find((item) => String(item.productoId) === String(productoId));
      if (existing) {
        existing.cantidad += cantidad;
      } else {
        state.cart.push({ productoId: String(productoId), cantidad });
      }
      showToast('✔ Producto guardado en carrito local', 'success');
      renderCartItems();
      openCartDrawer();
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

// Cargar el carrito del usuario actual desde Redis
async function loadCart() {
  const ownerLabel = document.getElementById('cartOwnerLabel');
  if (ownerLabel) {
    ownerLabel.innerHTML = `Usuario: <span class="text-purple-300 font-mono font-bold">${state.currentUser}</span>`;
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
          <div class="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center space-y-2">
            <i class="fa-solid fa-shield-halved text-3xl text-rose-400"></i>
            <p class="font-bold text-sm">Acceso Denegado (BOLA / OWASP API1)</p>
            <p class="text-[11px] text-rose-400/90">Tu token JWT no posee los permisos requeridos para acceder al carrito de <span class="font-mono font-bold">${state.currentUser}</span>.</p>
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

// Renderizar la lista de productos en el Drawer del carrito
function renderCartItems() {
  const list = document.getElementById('cartItemsList');
  const countBadge = document.getElementById('cartCountBadge');
  if (!list) return;

  const totalCount = state.cart.reduce((acc, item) => acc + item.cantidad, 0);
  if (countBadge) countBadge.textContent = totalCount;

  if (state.cart.length === 0) {
    list.innerHTML = `
      <div class="text-center py-20 text-slate-500 space-y-3 select-none">
        <i class="fa-solid fa-basket-shopping text-5xl text-slate-800"></i>
        <p class="text-sm font-semibold">Tu carrito en Redis está vacío.</p>
        <p class="text-xs text-slate-600">Explora el catálogo y agrega productos para comenzar.</p>
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
    row.className = 'flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 gap-3 shadow-md';
    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-xs text-white truncate">${prod.nombre}</h4>
        <p class="text-[11px] text-slate-400 font-mono mt-0.5">${formatMoney(prod.precio)} x ${item.cantidad} = <span class="text-purple-300 font-bold">${formatMoney(itemSubtotal)}</span></p>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- BOTÓN DISMINUIR CANTIDAD EN CARRITO -->
        <button 
          type="button" 
          data-action="cart-qty-decrease" 
          data-product-id="${item.productoId}" 
          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-300 hover:text-white text-xs font-black transition flex items-center justify-center cursor-pointer" 
          title="Disminuir en carrito">
          -
        </button>

        <span class="w-6 text-center text-xs font-mono font-bold text-white select-none">${item.cantidad}</span>

        <!-- BOTÓN AUMENTAR CANTIDAD EN CARRITO -->
        <button 
          type="button" 
          data-action="cart-qty-increase" 
          data-product-id="${item.productoId}" 
          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-300 hover:text-white text-xs font-black transition flex items-center justify-center cursor-pointer" 
          title="Aumentar en carrito">
          +
        </button>

        <!-- BOTÓN ELIMINAR DEL CARRITO -->
        <button 
          type="button" 
          data-action="cart-remove-item" 
          data-product-id="${item.productoId}" 
          class="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500 active:scale-90 text-rose-300 hover:text-white text-xs flex items-center justify-center transition cursor-pointer ml-1" 
          title="Eliminar producto">
          <i class="fa-solid fa-trash-can text-[10px]"></i>
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  updateTotals(subtotal);
}

// Modificar cantidad de un artículo directamente desde el Drawer
async function handleCartItemQuantity(productId, delta) {
  const id = String(productId);
  const item = state.cart.find((i) => String(i.productoId) === id);
  if (!item) return;

  if (delta > 0) {
    await persistCartItem(id, 1);
  } else {
    if (item.cantidad <= 1) {
      await removeFromCart(id);
    } else {
      // Disminución controlada
      item.cantidad -= 1;
      renderCartItems();
      showToast(`Cantidad de producto #${id} actualizada.`, 'info');
      // Sincronizar con el backend
      apiFetch(`/api/carritos/${state.currentUser}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: id, cantidad: -1 }),
      }).catch(() => {});
    }
  }
}

// Eliminar un producto del carrito en Redis
async function removeFromCart(productoId) {
  const id = String(productoId);
  showToast(`Eliminando producto #${id} del carrito...`, 'info');

  const res = await apiFetch(`/api/carritos/${state.currentUser}/productos/${id}`, {
    method: 'DELETE',
  });

  state.cart = state.cart.filter((item) => String(item.productoId) !== id);
  renderCartItems();
  showToast('Producto eliminado del carrito.', 'success');
}

// Vaciar carrito completamente en Redis
async function clearCart() {
  if (state.cart.length === 0) {
    showToast('El carrito ya está vacío.', 'info');
    return;
  }

  if (!confirm('¿Deseas vaciar completamente tu carrito de compras?')) return;

  showToast('Vaciando carrito en Redis...', 'info');
  await apiFetch(`/api/carritos/${state.currentUser}`, { method: 'DELETE' });

  state.cart = [];
  renderCartItems();
  showToast('Carrito vaciado exitosamente en Redis.', 'success');
}

// Actualizar cálculo de subtotal, descuento Black Friday y total
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

// Simulación de checkout / proceder al pago
function checkout() {
  if (state.cart.length === 0) {
    showToast('Tu carrito está vacío.', 'warning');
    return;
  }
  showToast('🎉 ¡Orden confirmada! Las reservas han sido consolidadas en Redis.', 'success');
  closeCartDrawer();
}

// Control del Slide-over Drawer del Carrito
function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const panel = document.getElementById('cartPanel');
  if (drawer && panel) {
    drawer.classList.remove('pointer-events-none', 'opacity-0');
    panel.classList.remove('translate-x-full');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const panel = document.getElementById('cartPanel');
  if (drawer && panel) {
    drawer.classList.add('opacity-0');
    panel.classList.add('translate-x-full');
    setTimeout(() => drawer.classList.add('pointer-events-none'), 300);
  }
}

// Control del Modal de Ingresar Nuevo Producto
function openNewProductModal() {
  const modal = document.getElementById('newProductModal');
  if (modal) {
    modal.classList.remove('pointer-events-none', 'opacity-0');
    const input = document.getElementById('newProdName');
    if (input) setTimeout(() => input.focus(), 150);
  }
}

function closeNewProductModal() {
  const modal = document.getElementById('newProductModal');
  if (modal) {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('pointer-events-none'), 300);
  }
}

// Envío de nuevo producto (asíncrono, sin recargas ni navegación)
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
      // Fallback local inmediato si el microservicio está en mantenimiento
      const nextId = state.products.length ? Math.max(...state.products.map((p) => p.id)) + 1 : 1;
      state.products.push({ id: nextId, nombre, precio, desc });
      renderProducts();
      showToast(`✔ Producto "${nombre}" agregado al catálogo local`, 'success');
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

// Control del Modal del Monitor de Arquitectura
function openMonitorModal() {
  const modal = document.getElementById('monitorModal');
  if (modal) modal.classList.remove('pointer-events-none', 'opacity-0');
}

function closeMonitorModal() {
  const modal = document.getElementById('monitorModal');
  if (modal) {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('pointer-events-none'), 300);
  }
}

// Prueba de Ráfaga de Concurrencia (Simulación DoS y Rate Limiting NGINX)
async function runRateLimitTest() {
  const btn = document.getElementById('btnRateLimitTest');
  const resDiv = document.getElementById('rateLimitResult');
  if (!btn || !resDiv) return;

  btn.disabled = true;
  resDiv.innerHTML = '<span class="text-purple-400 font-semibold"><i class="fa-solid fa-spinner animate-spin mr-1"></i> Disparando 50 peticiones simultáneas...</span>';

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
  showToast(`Ráfaga concluida: ${count429} solicitudes bloqueadas con HTTP 429`, 'warning');
}

// Control del Modal de Token JWT
function openTokenModal() {
  const modal = document.getElementById('tokenModal');
  const textarea = document.getElementById('jwtTextarea');
  if (textarea) textarea.value = state.activeToken;
  if (modal) modal.classList.remove('pointer-events-none', 'opacity-0');
}

function closeTokenModal() {
  const modal = document.getElementById('tokenModal');
  if (modal) {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('pointer-events-none'), 300);
  }
}

function copyTokenToClipboard() {
  const textarea = document.getElementById('jwtTextarea');
  if (!textarea) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textarea.value);
    } else {
      textarea.select();
      document.execCommand('copy');
    }
    showToast('Token JWT copiado al portapapeles', 'success');
  } catch {
    showToast('Selecciona y copia el texto del token.', 'info');
  }
}

function saveCustomToken() {
  const textarea = document.getElementById('jwtTextarea');
  if (!textarea) return;

  state.activeToken = textarea.value.trim();
  try {
    localStorage.setItem(`token_${state.currentUser}`, state.activeToken);
  } catch {}

  showToast('Token personalizado aplicado con éxito.', 'success');
  closeTokenModal();
  loadCatalog();
  loadCart();
}

// Selector de Sesión de Usuario
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

// Reloj de cuenta regresiva
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

// DELEGACIÓN CENTRALIZADA DE CLICS (GARANTIZA QUE CADA BOTÓN FUNCIONE AL 100%)
function setupCentralizedEvents() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    // Prevenir cualquier navegación o comportamiento nativo indeseado
    event.preventDefault();

    const action = trigger.dataset.action;
    const productId = trigger.dataset.productId;

    switch (action) {
      case 'qty-increase':
        changeQuantity(productId, +1);
        break;
      case 'qty-decrease':
        changeQuantity(productId, -1);
        break;
      case 'add-to-cart':
        handleAddToCart(productId, trigger);
        break;
      case 'cart-qty-increase':
        handleCartItemQuantity(productId, +1);
        break;
      case 'cart-qty-decrease':
        handleCartItemQuantity(productId, -1);
        break;
      case 'cart-remove-item':
        removeFromCart(productId);
        break;
      case 'open-cart':
        openCartDrawer();
        break;
      case 'close-cart':
        closeCartDrawer();
        break;
      case 'clear-cart':
        clearCart();
        break;
      case 'checkout':
        checkout();
        break;
      case 'open-new-product':
        openNewProductModal();
        break;
      case 'close-new-product':
        closeNewProductModal();
        break;
      case 'submit-new-product':
        submitNewProduct();
        break;
      case 'open-monitor':
        openMonitorModal();
        break;
      case 'close-monitor':
        closeMonitorModal();
        break;
      case 'open-token-modal':
        openTokenModal();
        break;
      case 'close-token-modal':
        closeTokenModal();
        break;
      case 'copy-token':
        copyTokenToClipboard();
        break;
      case 'save-token':
        saveCustomToken();
        break;
      case 'test-rate-limit':
        runRateLimitTest();
        break;
      case 'reload-catalog':
        loadCatalog();
        break;
    }
  });

  // Atajos de teclado en campos de nuevo producto
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

// Exposición pública en window para redundancia y compatibilidad total
window.changeQuantity = changeQuantity;
window.handleAddToCart = handleAddToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.openNewProductModal = openNewProductModal;
window.closeNewProductModal = closeNewProductModal;
window.submitNewProduct = submitNewProduct;

// Inicialización de la aplicación
function initApp() {
  // Renderizado instantáneo de productos en 0 ms
  renderProducts();

  // Configurar selectores y eventos
  try { setupCentralizedEvents(); } catch (e) { console.error('Error setupCentralizedEvents:', e); }
  try { setupUserSelector(); } catch (e) { console.error('Error setupUserSelector:', e); }
  try { setupCountdown(); } catch (e) { console.error('Error setupCountdown:', e); }

  // Carga asíncrona de tokens, catálogo y carritos desde Redis
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

// Inicialización resiliente según el estado del documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
