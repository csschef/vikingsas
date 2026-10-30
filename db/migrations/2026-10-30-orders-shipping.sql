-- Labb 5: frakt och ombud på ordern. Körs en gång i Supabase SQL Editor. Gamla ordrar påverkas inte, och en andra körning ändrar ingenting.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT CHECK (shipping_method IN ('ombud', 'hem'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_price NUMERIC(10,2) CHECK (shipping_price >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_status TEXT CHECK (service_point_status IN ('Vald', 'Väntar'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_country_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_street TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_postal_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_point_city TEXT;

-- Fraktsätt, namn och pris finns alla eller inga. Gamla ordrar har inga.
ALTER TABLE orders ADD CONSTRAINT orders_shipping_check CHECK (
  num_nonnulls(shipping_method, shipping_method_name, shipping_price) IN (0, 3)
);

ALTER TABLE orders ADD CONSTRAINT orders_service_point_check CHECK (
  CASE
    -- Gamla ordrar och hemleverans har inget ombud alls
    WHEN shipping_method IS NULL OR shipping_method = 'hem' THEN
      num_nonnulls(service_point_status, service_point_id, service_point_country_code, service_point_name,
                   service_point_street, service_point_postal_code, service_point_city) = 0
    -- Väntar: ombudet väljs i efterhand, så inga ombudsfält är ifyllda än
    WHEN service_point_status = 'Väntar' THEN
      num_nonnulls(service_point_id, service_point_country_code, service_point_name,
                   service_point_street, service_point_postal_code, service_point_city) = 0
    -- Vald: PostNords id är bara unikt tillsammans med landskoden, så båda krävs
    WHEN service_point_status = 'Vald' THEN
      service_point_id IS NOT NULL AND service_point_country_code IS NOT NULL
    ELSE false
  END
);

COMMIT;
