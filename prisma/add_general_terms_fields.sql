-- Migración: aceptación de Términos y Condiciones generales al registrarse (cualquier rol)
-- Ejecutar una vez en el SQL Editor de Supabase

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "termsVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "termsAcceptedIp" TEXT;

ALTER TABLE "DeletedAccountAudit"
  ADD COLUMN IF NOT EXISTS "generalTermsAcceptedAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "generalTermsVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "generalTermsAcceptedIp" TEXT;
