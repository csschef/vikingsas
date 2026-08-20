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
