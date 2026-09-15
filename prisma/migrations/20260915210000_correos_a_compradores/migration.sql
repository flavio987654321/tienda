-- Mail a compradores de Productos Digitales: el historial de envíos y la
-- lista de quienes pidieron no recibir más de una cuenta. Dos tablas nuevas,
-- con las claves foráneas adentro del CREATE; no toca ninguna fila existente.
-- Idempotente.

CREATE TABLE IF NOT EXISTS "CorreoDigital" (
  "id"            TEXT NOT NULL,
  "storeId"       TEXT NOT NULL,
  "productId"     TEXT,
  "asunto"        TEXT NOT NULL,
  "cuerpo"        TEXT NOT NULL,
  "enlace"        TEXT,
  "botonTexto"    TEXT,
  "destinatarios" INTEGER NOT NULL,
  "enviados"      INTEGER NOT NULL DEFAULT 0,
  "fallidos"      INTEGER NOT NULL DEFAULT 0,
  "estado"        TEXT NOT NULL DEFAULT 'ENVIANDO',
  "cursor"        TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorreoDigital_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorreoDigital_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CorreoDigital_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CorreoDigital_storeId_createdAt_idx" ON "CorreoDigital"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "CorreoDigital_productId_idx" ON "CorreoDigital"("productId");

CREATE TABLE IF NOT EXISTS "BajaCorreoDigital" (
  "id"        TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BajaCorreoDigital_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BajaCorreoDigital_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BajaCorreoDigital_storeId_email_key" ON "BajaCorreoDigital"("storeId", "email");
