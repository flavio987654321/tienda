-- Migración: campos de aceptación de T&C del programa de afiliados por el titular
-- Ejecutar una vez en el SQL Editor de Supabase

ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "tcOwnerAcceptedAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "tcOwnerAcceptedIp" TEXT,
  ADD COLUMN IF NOT EXISTS "tcOwnerVersion"    TEXT;
