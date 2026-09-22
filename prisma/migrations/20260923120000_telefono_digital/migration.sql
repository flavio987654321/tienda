-- El celular opcional que deja quien compra en el checkout digital. Sirve
-- para recuperar el carrito por WhatsApp (lo manda la vendedora desde su
-- teléfono) y para la lista de públicos de Meta Ads.
--
-- Va en la orden y no en la cuenta del comprador: esa cuenta es una sola para
-- toda la plataforma. Acá el dato es "el teléfono que dio para ESTA compra".
--
-- Una columna opcional: no toca ninguna fila. Idempotente.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "telefonoDigital" TEXT;
