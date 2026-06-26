-- Dirección de origen de la tienda, para cotizar envío en vivo (Envíopack).
-- Todas opcionales: una tienda puede seguir usando métodos fijos/"a coordinar"
-- sin completar esto.
ALTER TABLE "Store" ADD COLUMN "originStreet" TEXT;
ALTER TABLE "Store" ADD COLUMN "originCity" TEXT;
ALTER TABLE "Store" ADD COLUMN "originProvince" TEXT;
ALTER TABLE "Store" ADD COLUMN "originPostalCode" TEXT;
