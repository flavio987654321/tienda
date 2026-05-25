-- Agrega el campo logoColor a la tabla Store
-- Ejecutar en Supabase SQL Editor
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "logoColor" TEXT;
