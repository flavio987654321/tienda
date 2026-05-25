-- Tabla de leads/consultas para tiendas de tipo inquiry (vehículos, inmobiliaria, etc.)
CREATE TABLE IF NOT EXISTS "Lead" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "storeId"         TEXT NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE,
  "affiliateId"     TEXT REFERENCES "Affiliate"("id") ON DELETE SET NULL,
  "productId"       TEXT,
  "productName"     TEXT NOT NULL,
  "productPrice"    DOUBLE PRECISION NOT NULL,
  "customerName"    TEXT,
  "customerPhone"   TEXT,
  "customerMessage" TEXT,
  "status"          TEXT NOT NULL DEFAULT 'PENDING',
  "commissionAmount" DOUBLE PRECISION,
  "commissionRate"  DOUBLE PRECISION,
  "confirmedAt"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Lead_storeId_createdAt_idx" ON "Lead"("storeId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Lead_affiliateId_idx" ON "Lead"("affiliateId");
