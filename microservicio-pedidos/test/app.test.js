const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryOrderStore } = require('../src/store');
const { issueToken, TEST_SECRET } = require('./auth-helpers');

function createMockCartClient(initialItems = [{ productoId: '1', cantidad: 2 }]) {
  let items = [...initialItems];
  return {
    async getCart() {
      return { usuarioId: 'usuario_1', productos: items };
    },
    async clearCart() {
      items = [];
      return true;
    },
    setItems(next) {
      items = next;
    },
  };
}

let app;
let store;
let cartClient;

beforeEach(() => {
  store = createMemoryOrderStore();
  cartClient = createMockCartClient();
  app = createApp({ jwtSecret: TEST_SECRET, store, cartClient });
});

describe('microservicio-pedidos', () => {
  it('responde 200 en /health y expone /metrics', async () => {
    const health = await request(app).get('/health');
    expect(health.statusCode).toBe(200);
    expect(health.body).toEqual({ estado: 'ok' });

    const metrics = await request(app).get('/metrics');
    expect(metrics.statusCode).toBe(200);
    expect(metrics.text).toContain('shophero_orders_total');
  });

  it('crea un pedido real desde el carrito, descuenta stock, genera outbox y limpia el carrito', async () => {
    const token = await issueToken(['orders:write', 'orders:read'], { subject: 'usuario_1' });
    const res = await request(app)
      .post('/api/pedidos/usuario_1')
      .set('Authorization', `Bearer ${token}`)
      .send({ metodoPago: 'PSE' });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toMatch(/^SH-/);
    expect(res.body.total).toBe(240000);
    expect(res.body.metodoPago).toBe('PSE');
    expect(res.body.cartCleared).toBe(true);

    const listRes = await request(app)
      .get('/api/pedidos/usuario_1')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(res.body.id);

    const adminToken = await issueToken([], { subject: 'admin', roles: ['admin'] });
    const outboxRes = await request(app)
      .get('/api/outbox')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(outboxRes.statusCode).toBe(200);
    expect(outboxRes.body).toHaveLength(1);
    expect(outboxRes.body[0].tipoEvento).toBe('PedidoConfirmado');
  });

  it('rechaza checkout si el carrito está vacío (400) o hay stock insuficiente (409)', async () => {
    const token = await issueToken(['orders:write'], { subject: 'usuario_1' });
    cartClient.setItems([]);
    const emptyRes = await request(app)
      .post('/api/pedidos/usuario_1')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(emptyRes.statusCode).toBe(400);

    cartClient.setItems([{ productoId: '1', cantidad: 999 }]);
    const conflictRes = await request(app)
      .post('/api/pedidos/usuario_1')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(conflictRes.statusCode).toBe(409);
  });

  it('aplica BOLA y RBAC en pedidos y outbox', async () => {
    const u1 = await issueToken(['orders:read', 'orders:write'], { subject: 'usuario_1' });
    const resBola = await request(app)
      .get('/api/pedidos/usuario_2')
      .set('Authorization', `Bearer ${u1}`);
    expect(resBola.statusCode).toBe(403);

    const resAdminOnly = await request(app)
      .get('/api/outbox')
      .set('Authorization', `Bearer ${u1}`);
    expect(resAdminOnly.statusCode).toBe(403);
  });
});
