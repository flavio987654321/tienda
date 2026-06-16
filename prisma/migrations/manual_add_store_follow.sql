-- Migration: add_store_follow
-- Aplicar en Supabase SQL Editor

-- 1. Agregar columna userId (opcional) a StoreSubscription
ALTER TABLE "StoreSubscription"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE "StoreSubscription"
  ADD CONSTRAINT "StoreSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "StoreSubscription_userId_idx" ON "StoreSubscription"("userId");

-- 2. Crear tabla StoreFollow
CREATE TABLE IF NOT EXISTS "StoreFollow" (
  "id"        TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"    TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,

  CONSTRAINT "StoreFollow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StoreFollow"
  ADD CONSTRAINT "StoreFollow_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreFollow"
  ADD CONSTRAINT "StoreFollow_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "StoreFollow_userId_storeId_key" ON "StoreFollow"("userId", "storeId");
CREATE INDEX IF NOT EXISTS "StoreFollow_storeId_idx" ON "StoreFollow"("storeId");
