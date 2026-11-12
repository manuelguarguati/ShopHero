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

INSERT INTO productos (id, nombre, descripcion, categoria, precio, stock) VALUES
  (1, 'Teclado Mecánico RGB', 'Switches táctiles hot-swap con iluminación RGB por tecla y chasis de aluminio.', 'Teclados', 120000, 25),
  (2, 'Mouse Gamer Inalámbrico', 'Sensor óptico de 16.000 DPI, baja latencia 2.4 GHz y batería de 70 horas.', 'Mouse', 60000, 40),
  (3, 'Audífonos Gamer Pro 7.1', 'Sonido envolvente virtual 7.1 y micrófono retráctil con cancelación de ruido.', 'Audio', 180000, 18),
  (4, 'Monitor 27" 165 Hz', 'Panel IPS QHD 1 ms compatible con FreeSync y G-Sync para juego competitivo.', 'Monitores', 890000, 10),
  (5, 'Control Inalámbrico Pro', 'Agarre ergonómico texturizado, gatillos adaptativos y vibración háptica.', 'Controles', 210000, 22),
  (6, 'SSD NVMe Gen4 1 TB', 'Lectura secuencial hasta 7.000 MB/s con disipador térmico integrado.', 'Almacenamiento', 260000, 30)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('productos', 'id'), COALESCE((SELECT MAX(id) FROM productos), 1));
