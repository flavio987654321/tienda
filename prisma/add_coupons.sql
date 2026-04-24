-- Agregar columnas a Order para soportar descuentos y cupones
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" TEXT;

-- Crear tabla Coupon
CREATE TABLE IF NOT EXISTS "Coupon" (
  "id"             TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "discountType"   TEXT NOT NULL DEFAULT 'percentage',
  "discountValue"  DOUBLE PRECISION NOT NULL,
  "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxUses"        INTEGER,
  "usedCount"      INTEGER NOT NULL DEFAULT 0,
  "expiresAt"      TIMESTAMP(3),
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "storeId"        TEXT NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Índice único: código por tienda
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_storeId_code_key" ON "Coupon"("storeId", "code");

-- Foreign keys
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
