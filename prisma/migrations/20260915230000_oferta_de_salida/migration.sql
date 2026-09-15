-- La oferta de salida de un producto digital (qué se le ofrece a quien se va
-- del checkout sin pagar), como JSON. Null = apagada. Idempotente.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ofertaSalida" TEXT;
