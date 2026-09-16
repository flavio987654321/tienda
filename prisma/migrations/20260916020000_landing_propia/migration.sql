-- La landing propia de un producto digital: el HTML que la vendedora diseñó
-- con Claude, limpio, por versiones; y en el producto, qué versión se muestra
-- y las fotos/links que sobreviven a las versiones. Idempotente; no toca
-- ninguna fila existente.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "landingPropia" TEXT;

CREATE TABLE IF NOT EXISTS "LandingDigital" (
  "id"         TEXT NOT NULL,
  "productId"  TEXT NOT NULL,
  "html"       TEXT NOT NULL,
  "bytes"      INTEGER NOT NULL,
  "titulo"     TEXT,
  "inventario" TEXT NOT NULL,
  "quitado"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingDigital_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandingDigital_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LandingDigital_productId_createdAt_idx" ON "LandingDigital"("productId", "createdAt");
