-- La medición (píxel de Meta, GA, Clarity) por producto digital. Vacío = usa
-- el de la cuenta. Una cuenta Pro tiene hasta 5 páginas con dominio propio,
-- que pueden ser cinco negocios con cinco cuentas de anuncios. Idempotente.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "medicion" TEXT;
