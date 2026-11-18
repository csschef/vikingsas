-- Labb 6: kunder som loggar in med Google. Adminerna ligger kvar i users.

BEGIN;

-- Kunden känns igen på Googles sub, aldrig på e-postadressen
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tom för gästköp och för ordrar från innan inloggningen fanns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders (customer_id);

COMMIT;
