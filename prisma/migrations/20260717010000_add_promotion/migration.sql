-- CreateTable: promociones a nivel tienda (entidad propia que reemplaza los
-- campos promo* del producto). Se llama StorePromotion porque ya existe una tabla
-- "Promotion" (banners del panel admin del marketplace). Aditivo: tabla nueva.
CREATE TABLE IF NOT EXISTS "StorePromotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "minQty" INTEGER,
    "payQty" INTEGER,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "categories" TEXT NOT NULL DEFAULT '[]',
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "combinesWithCoupons" BOOLEAN NOT NULL DEFAULT false,
    "combinesWithPromotions" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,
    CONSTRAINT "StorePromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StorePromotion_storeId_isActive_archivedAt_idx" ON "StorePromotion"("storeId", "isActive", "archivedAt");

-- FK idempotente: ADD CONSTRAINT no soporta IF NOT EXISTS, así que lo envolvemos
-- en un guard para que la migración se pueda correr más de una vez sin romper.
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StorePromotion_storeId_fkey'
    ) THEN
        ALTER TABLE "StorePromotion" ADD CONSTRAINT "StorePromotion_storeId_fkey"
            FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
