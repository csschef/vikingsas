CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  volume_ml INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  heat_level INTEGER NOT NULL CHECK (heat_level BETWEEN 1 AND 10),
  image_url TEXT,
  ingredients TEXT,
  energy_kj INTEGER,
  energy_kcal INTEGER,
  fat_g NUMERIC(6,2),
  saturated_fat_g NUMERIC(6,2),
  carbohydrate_g NUMERIC(6,2),
  sugars_g NUMERIC(6,2),
  protein_g NUMERIC(6,2),
  salt_g NUMERIC(6,2),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_title TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'Beställd' CHECK (status IN ('Beställd', 'Behandlas', 'Levererad', 'Återbetald'));

ALTER TABLE products ADD COLUMN sku TEXT UNIQUE;
ALTER TABLE products ADD COLUMN ean TEXT;
ALTER TABLE products ADD COLUMN category TEXT;
ALTER TABLE products ADD COLUMN stock INTEGER CHECK (stock >= 0);
ALTER TABLE products ADD COLUMN variants TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ALTER COLUMN volume_ml DROP NOT NULL;
ALTER TABLE products ALTER COLUMN heat_level DROP NOT NULL;

ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Obetald' CHECK (payment_status IN ('Obetald', 'Betald', 'Avbruten'));
UPDATE orders SET payment_status = 'Betald';
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN cart_id INTEGER REFERENCES carts(id);

ALTER TABLE orders ADD COLUMN customer_phone TEXT;
ALTER TABLE orders ADD COLUMN shipping_street TEXT;
ALTER TABLE orders ADD COLUMN shipping_postal_code TEXT;
ALTER TABLE orders ADD COLUMN shipping_city TEXT;

ALTER TABLE products ADD COLUMN image_path TEXT;

CREATE TABLE shipping_methods (
  code TEXT PRIMARY KEY CHECK (code IN ('ombud', 'hem')),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  free_from NUMERIC(10,2) CHECK (free_from > 0)
);

ALTER TABLE orders ADD COLUMN shipping_method TEXT CHECK (shipping_method IN ('ombud', 'hem'));
ALTER TABLE orders ADD COLUMN shipping_method_name TEXT;
ALTER TABLE orders ADD COLUMN shipping_price NUMERIC(10,2) CHECK (shipping_price >= 0);
ALTER TABLE orders ADD COLUMN service_point_status TEXT CHECK (service_point_status IN ('Vald', 'Väntar'));
ALTER TABLE orders ADD COLUMN service_point_id TEXT;
ALTER TABLE orders ADD COLUMN service_point_country_code TEXT;
ALTER TABLE orders ADD COLUMN service_point_name TEXT;
ALTER TABLE orders ADD COLUMN service_point_street TEXT;
ALTER TABLE orders ADD COLUMN service_point_postal_code TEXT;
ALTER TABLE orders ADD COLUMN service_point_city TEXT;
ALTER TABLE orders ADD CONSTRAINT orders_shipping_check CHECK (
  num_nonnulls(shipping_method, shipping_method_name, shipping_price) IN (0, 3)
);
ALTER TABLE orders ADD CONSTRAINT orders_service_point_check CHECK (
  CASE
    WHEN shipping_method IS NULL OR shipping_method = 'hem' THEN
      num_nonnulls(service_point_status, service_point_id, service_point_country_code, service_point_name,
                   service_point_street, service_point_postal_code, service_point_city) = 0
    WHEN service_point_status = 'Väntar' THEN
      num_nonnulls(service_point_id, service_point_country_code, service_point_name,
                   service_point_street, service_point_postal_code, service_point_city) = 0
    WHEN service_point_status = 'Vald' THEN
      service_point_id IS NOT NULL AND service_point_country_code IS NOT NULL
    ELSE false
  END
);
