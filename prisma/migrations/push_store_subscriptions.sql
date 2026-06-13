-- Migración: notificaciones push por tienda
-- Ejecutar en el SQL Editor de Supabase si prisma migrate no puede conectarse directamente.

CREATE TABLE IF NOT EXISTS "StoreSubscription" (
  "id"        TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreSubscription_endpoint_key"
  ON "StoreSubscription"("endpoint");

CREATE INDEX IF NOT EXISTS "StoreSubscription_storeId_idx"
  ON "StoreSubscription"("storeId");

ALTER TABLE "StoreSubscription"
  DROP CONSTRAINT IF EXISTS "StoreSubscription_storeId_fkey";
ALTER TABLE "StoreSubscription"
  ADD CONSTRAINT "StoreSubscription_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PushCampaign" (
  "id"        TEXT NOT NULL,
  "storeId"   TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "url"       TEXT,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PushCampaign_storeId_createdAt_idx"
  ON "PushCampaign"("storeId", "createdAt" DESC);

ALTER TABLE "PushCampaign"
  DROP CONSTRAINT IF EXISTS "PushCampaign_storeId_fkey";
ALTER TABLE "PushCampaign"
  ADD CONSTRAINT "PushCampaign_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
