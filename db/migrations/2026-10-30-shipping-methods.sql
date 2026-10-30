-- Labb 5: fraktpriser i databasen. Körd i Supabase SQL Editor 30 okt 2026.

CREATE TABLE shipping_methods (
  code TEXT PRIMARY KEY CHECK (code IN ('ombud', 'hem')),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  free_from NUMERIC(10,2) CHECK (free_from > 0)
);

INSERT INTO shipping_methods (code, name, price, free_from)
VALUES
  ('ombud', 'Ombud eller paketbox', 69.00, 399.00),
  ('hem', 'Hemleverans', 139.00, 499.00);
