const DEFAULT_PRODUCTS = [
  { id: 1, nombre: 'Teclado', precio: 120000, stock: 25, categoria: 'Teclados', descripcion: 'Teclado mecánico gamer.' },
  { id: 2, nombre: 'Mouse', precio: 60000, stock: 40, categoria: 'Mouse', descripcion: 'Mouse óptico de alta precisión.' },
];

const SEED_PRODUCTS = [
  [1, 'Teclado Mecánico RGB', 'Switches táctiles hot-swap con iluminación RGB por tecla y chasis de aluminio.', 'Teclados', 120000, 25],
  [2, 'Mouse Gamer Inalámbrico', 'Sensor óptico de 16.000 DPI, baja latencia 2.4 GHz y batería de 70 horas.', 'Mouse', 60000, 40],
  [3, 'Audífonos Gamer Pro 7.1', 'Sonido envolvente virtual 7.1 y micrófono retráctil con cancelación de ruido.', 'Audio', 180000, 18],
  [4, 'Monitor 27" 165 Hz', 'Panel IPS QHD 1 ms compatible con FreeSync y G-Sync para juego competitivo.', 'Monitores', 890000, 10],
  [5, 'Control Inalámbrico Pro', 'Agarre ergonómico texturizado, gatillos adaptativos y vibración háptica.', 'Controles', 210000, 22],
  [6, 'SSD NVMe Gen4 1 TB', 'Lectura secuencial hasta 7.000 MB/s con disipador térmico integrado.', 'Almacenamiento', 260000, 30],
];

function createMemoryStore(initial = DEFAULT_PRODUCTS) {
  let products = initial.map((p) => ({ ...p }));

  return {
    async init() {},
    async ping() {
      return true;
    },
    async list() {
      return products.map((p) => ({ ...p }));
    },
    async getById(id) {
      const item = products.find((p) => p.id === Number(id));
      return item ? { ...item } : null;
    },
    async create({ nombre, precio, stock = 25, categoria = 'Accesorios', descripcion = '' }) {
      const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
      const item = { id: nextId, nombre, precio, stock, categoria, descripcion };
      products.push(item);
      return { ...item };
    },
    async update(id, fields) {
      const index = products.findIndex((p) => p.id === Number(id));
      if (index === -1) return null;
      products[index] = { ...products[index], ...fields };
      return { ...products[index] };
    },
    async remove(id) {
      const before = products.length;
      products = products.filter((p) => p.id !== Number(id));
      return products.length < before;
    },
    reset() {
      products = initial.map((p) => ({ ...p }));
    },
  };
}

function createPostgresStore(pool) {
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
      `);
      const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM productos');
      if (rows[0].total === 0) {
        for (const [id, nombre, descripcion, categoria, precio, stock] of SEED_PRODUCTS) {
          await pool.query(
            `INSERT INTO productos (id, nombre, descripcion, categoria, precio, stock)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
            [id, nombre, descripcion, categoria, precio, stock],
          );
        }
        await pool.query(
          `SELECT setval(pg_get_serial_sequence('productos', 'id'), COALESCE((SELECT MAX(id) FROM productos), 1))`,
        );
      }
    },
    async ping() {
      await pool.query('SELECT 1');
      return true;
    },
    async list() {
      const { rows } = await pool.query(
        'SELECT id, nombre, descripcion, categoria, precio, stock FROM productos ORDER BY id ASC',
      );
      return rows;
    },
    async getById(id) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) return null;
      const { rows } = await pool.query(
        'SELECT id, nombre, descripcion, categoria, precio, stock FROM productos WHERE id = $1',
        [numericId],
      );
      return rows[0] || null;
    },
    async create({ nombre, precio, stock = 25, categoria = 'Accesorios', descripcion = '' }) {
      const { rows } = await pool.query(
        `INSERT INTO productos (nombre, descripcion, categoria, precio, stock)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nombre, descripcion, categoria, precio, stock`,
        [nombre, descripcion, categoria, Math.round(precio), stock],
      );
      return rows[0];
    },
    async update(id, fields) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) return null;
      const allowed = ['nombre', 'descripcion', 'categoria', 'precio', 'stock'];
      const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
      if (entries.length === 0) return this.getById(numericId);

      const sets = entries.map(([k], idx) => `${k} = $${idx + 1}`);
      const values = entries.map(([k, v]) => (k === 'precio' ? Math.round(v) : v));
      values.push(numericId);

      const { rows } = await pool.query(
        `UPDATE productos SET ${sets.join(', ')} WHERE id = $${values.length}
         RETURNING id, nombre, descripcion, categoria, precio, stock`,
        values,
      );
      return rows[0] || null;
    },
    async remove(id) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) return false;
      const result = await pool.query('DELETE FROM productos WHERE id = $1', [numericId]);
      return result.rowCount > 0;
    },
    reset() {},
  };
}

module.exports = { createMemoryStore, createPostgresStore };
