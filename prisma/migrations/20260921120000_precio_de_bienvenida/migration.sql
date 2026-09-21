-- El precio de bienvenida de un producto digital (un descuento que vale un
-- rato desde que cada visitante entra a la página), como JSON. Null =
-- apagado. Idempotente.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "bienvenida" TEXT;
