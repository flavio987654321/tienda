-- Tipo de promoción por cantidad: PERCENT (% descuento) o N_PAY_M (llevá N pagá M)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "promoType" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "promoPayQty" INTEGER;
