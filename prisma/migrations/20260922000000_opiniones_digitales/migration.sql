-- Opiniones verificadas de Productos Digitales: una por compra, escrita por
-- quien pagó desde el link firmado; la vendedora la publica o la esconde.
-- Tabla nueva con las claves foráneas adentro del CREATE; no toca ninguna
-- fila existente. Idempotente.

CREATE TABLE IF NOT EXISTS "OpinionDigital" (
  "id"        TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId"   TEXT NOT NULL,
  "nombre"    TEXT NOT NULL,
  "texto"     TEXT NOT NULL,
  "estado"    TEXT NOT NULL DEFAULT 'PENDIENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpinionDigital_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpinionDigital_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpinionDigital_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpinionDigital_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpinionDigital_orderId_key" ON "OpinionDigital"("orderId");
CREATE INDEX IF NOT EXISTS "OpinionDigital_productId_estado_createdAt_idx" ON "OpinionDigital"("productId", "estado", "createdAt");
CREATE INDEX IF NOT EXISTS "OpinionDigital_storeId_estado_createdAt_idx" ON "OpinionDigital"("storeId", "estado", "createdAt");
