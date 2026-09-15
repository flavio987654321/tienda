-- Cupones de descuento de Productos Digitales, y en la orden con qué cupón se
-- compró y cuánto descontó (`total` ya viene descontado). La tabla es nueva,
-- con la clave foránea adentro del CREATE; las columnas de Order admiten nulos
-- o tienen valor por defecto: no toca ninguna fila existente. Idempotente.

CREATE TABLE IF NOT EXISTS "CuponDigital" (
  "id"        TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "codigo"    TEXT NOT NULL,
  "tipo"      TEXT NOT NULL,
  "valor"     INTEGER NOT NULL,
  "productId" TEXT,
  "venceAt"   TIMESTAMP(3),
  "topeUsos"  INTEGER,
  "usos"      INTEGER NOT NULL DEFAULT 0,
  "activo"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CuponDigital_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CuponDigital_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CuponDigital_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CuponDigital_storeId_codigo_key" ON "CuponDigital"("storeId", "codigo");
CREATE INDEX IF NOT EXISTS "CuponDigital_productId_idx" ON "CuponDigital"("productId");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cuponCodigo" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "descuento" INTEGER NOT NULL DEFAULT 0;
