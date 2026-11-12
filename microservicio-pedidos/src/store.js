const crypto = require('node:crypto');

class CheckoutError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'CheckoutError';
    this.statusCode = statusCode;
  }
}

function generateOrderId() {
  return `SH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function createMemoryOrderStore() {
  let inventory = new Map([
    [1, { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, stock: 25 }],
    [2, { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, stock: 40 }],
  ]);
  const orders = [];
  const outbox = [];

  return {
    async init() {},
    async ping() {
      return true;
    },
    async checkout({ usuarioId, items, metodoPago = 'Tarjeta' }) {
      const normalized = items.map((i) => ({
        productoId: Number(i.productoId),
        cantidad: Number(i.cantidad),
      }));

      for (const item of normalized) {
        const prod = inventory.get(item.productoId);
        if (!prod) {
          throw new CheckoutError(`El producto #${item.productoId} no existe en el catálogo`, 404);
        }
        if (prod.stock < item.cantidad) {
          throw new CheckoutError(
            `Stock insuficiente para "${prod.nombre}": disponibles ${prod.stock}, solicitados ${item.cantidad}`,
            409,
          );
        }
      }

      let total = 0;
      const orderItems = normalized.map((item) => {
        const prod = inventory.get(item.productoId);
        prod.stock -= item.cantidad;
        total += prod.precio * item.cantidad;
        return {
          productoId: prod.id,
          nombreProducto: prod.nombre,
          precioUnitario: prod.precio,
          cantidad: item.cantidad,
        };
      });

      const order = {
        id: generateOrderId(),
        usuarioId,
        total,
        estado: 'CONFIRMADO',
        metodoPago,
        creadoEn: new Date().toISOString(),
        items: orderItems,
      };
      orders.unshift(order);
      outbox.unshift({
        id: outbox.length + 1,
        agregado: 'Pedido',
        agregadoId: order.id,
        tipoEvento: 'PedidoConfirmado',
        payload: { pedidoId: order.id, usuarioId, total, items: orderItems },
        procesado: false,
        creadoEn: order.creadoEn,
      });
      return order;
    },
    async listByUser(usuarioId) {
      return orders.filter((o) => o.usuarioId === usuarioId);
    },
    async listAll() {
      return [...orders];
    },
    async listOutbox() {
      return [...outbox];
    },
    reset() {
      orders.length = 0;
      outbox.length = 0;
      inventory = new Map([
        [1, { id: 1, nombre: 'Teclado Mecánico RGB', precio: 120000, stock: 25 }],
        [2, { id: 2, nombre: 'Mouse Gamer Inalámbrico', precio: 60000, stock: 40 }],
      ]);
    },
  };
}

function createPostgresOrderStore(pool) {
  async function attachItems(ordersRows) {
    if (ordersRows.length === 0) return [];
    const orderIds = ordersRows.map((r) => r.id);
    const { rows: itemRows } = await pool.query(
      `SELECT pedido_id, producto_id, nombre_producto, precio_unitario, cantidad
       FROM pedido_items WHERE pedido_id = ANY($1::text[]) ORDER BY id ASC`,
      [orderIds],
    );
    const itemsByOrder = new Map();
    for (const row of itemRows) {
      if (!itemsByOrder.has(row.pedido_id)) itemsByOrder.set(row.pedido_id, []);
      itemsByOrder.get(row.pedido_id).push({
        productoId: row.producto_id,
        nombreProducto: row.nombre_producto,
        precioUnitario: row.precio_unitario,
        cantidad: row.cantidad,
      });
    }
    return ordersRows.map((o) => ({
      id: o.id,
      usuarioId: o.usuario_id,
      total: o.total,
      estado: o.estado,
      metodoPago: o.metodo_pago,
      creadoEn: o.creado_en,
      items: itemsByOrder.get(o.id) || [],
    }));
  }

  return {
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS productos (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT NOT NULL DEFAULT '',
          categoria TEXT NOT NULL DEFAULT 'Accesorios',
          precio INTEGER NOT NULL CHECK (precio > 0),
          stock INTEGER NOT NULL DEFAULT 25 CHECK (stock >= 0),
          creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS pedidos (
          id TEXT PRIMARY KEY,
          usuario_id TEXT NOT NULL,
          total INTEGER NOT NULL CHECK (total >= 0),
          estado TEXT NOT NULL DEFAULT 'CONFIRMADO',
          metodo_pago TEXT NOT NULL DEFAULT 'Tarjeta',
          creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_fecha ON pedidos (usuario_id, creado_en DESC);
        CREATE TABLE IF NOT EXISTS pedido_items (
          id SERIAL PRIMARY KEY,
          pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          producto_id INTEGER NOT NULL,
          nombre_producto TEXT NOT NULL,
          precio_unitario INTEGER NOT NULL CHECK (precio_unitario > 0),
          cantidad INTEGER NOT NULL CHECK (cantidad > 0)
        );
        CREATE TABLE IF NOT EXISTS outbox_eventos (
          id SERIAL PRIMARY KEY,
          agregado TEXT NOT NULL,
          agregado_id TEXT NOT NULL,
          tipo_evento TEXT NOT NULL,
          payload JSONB NOT NULL,
          procesado BOOLEAN NOT NULL DEFAULT FALSE,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    },
    async ping() {
      await pool.query('SELECT 1');
      return true;
    },
    async checkout({ usuarioId, items, metodoPago = 'Tarjeta' }) {
      const normalized = items.map((i) => ({
        productoId: Number(i.productoId),
        cantidad: Number(i.cantidad),
      }));
      if (normalized.some((i) => !Number.isInteger(i.productoId) || i.productoId <= 0 || !Number.isInteger(i.cantidad) || i.cantidad <= 0)) {
        throw new CheckoutError('El carrito contiene artículos con formato inválido', 400);
      }

      const productIds = [...new Set(normalized.map((i) => i.productoId))].sort((a, b) => a - b);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows: productRows } = await client.query(
          'SELECT id, nombre, precio, stock FROM productos WHERE id = ANY($1::int[]) ORDER BY id ASC FOR UPDATE',
          [productIds],
        );
        const byId = new Map(productRows.map((p) => [p.id, p]));

        for (const item of normalized) {
          const prod = byId.get(item.productoId);
          if (!prod) {
            throw new CheckoutError(`El producto #${item.productoId} ya no existe en el catálogo`, 404);
          }
          if (prod.stock < item.cantidad) {
            throw new CheckoutError(
              `Stock insuficiente para "${prod.nombre}": disponibles ${prod.stock}, solicitados ${item.cantidad}`,
              409,
            );
          }
        }

        let total = 0;
        const orderItems = [];
        for (const item of normalized) {
          const prod = byId.get(item.productoId);
          await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, prod.id]);
          prod.stock -= item.cantidad;
          total += prod.precio * item.cantidad;
          orderItems.push({
            productoId: prod.id,
            nombreProducto: prod.nombre,
            precioUnitario: prod.precio,
            cantidad: item.cantidad,
          });
        }

        const orderId = generateOrderId();
        const { rows: insertedOrder } = await client.query(
          `INSERT INTO pedidos (id, usuario_id, total, estado, metodo_pago)
           VALUES ($1, $2, $3, 'CONFIRMADO', $4)
           RETURNING id, usuario_id, total, estado, metodo_pago, creado_en`,
          [orderId, usuarioId, total, metodoPago],
        );

        for (const line of orderItems) {
          await client.query(
            `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, line.productoId, line.nombreProducto, line.precioUnitario, line.cantidad],
          );
        }

        await client.query(
          `INSERT INTO outbox_eventos (agregado, agregado_id, tipo_evento, payload)
           VALUES ('Pedido', $1, 'PedidoConfirmado', $2::jsonb)`,
          [
            orderId,
            JSON.stringify({
              pedidoId: orderId,
              usuarioId,
              total,
              metodoPago,
              items: orderItems,
            }),
          ],
        );

        await client.query('COMMIT');
        const row = insertedOrder[0];
        return {
          id: row.id,
          usuarioId: row.usuario_id,
          total: row.total,
          estado: row.estado,
          metodoPago: row.metodo_pago,
          creadoEn: row.creado_en,
          items: orderItems,
        };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    async listByUser(usuarioId) {
      const { rows } = await pool.query(
        `SELECT id, usuario_id, total, estado, metodo_pago, creado_en
         FROM pedidos WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 50`,
        [usuarioId],
      );
      return attachItems(rows);
    },
    async listAll() {
      const { rows } = await pool.query(
        `SELECT id, usuario_id, total, estado, metodo_pago, creado_en
         FROM pedidos ORDER BY creado_en DESC LIMIT 100`,
      );
      return attachItems(rows);
    },
    async listOutbox() {
      const { rows } = await pool.query(
        `SELECT id, agregado, agregado_id, tipo_evento, payload, procesado, creado_en
         FROM outbox_eventos ORDER BY id DESC LIMIT 50`,
      );
      return rows.map((r) => ({
        id: r.id,
        agregado: r.agregado,
        agregadoId: r.agregado_id,
        tipoEvento: r.tipo_evento,
        payload: r.payload,
        procesado: r.procesado,
        creadoEn: r.creado_en,
      }));
    },
    reset() {},
  };
}

module.exports = { CheckoutError, createMemoryOrderStore, createPostgresOrderStore };
