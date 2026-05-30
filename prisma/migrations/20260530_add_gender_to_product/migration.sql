-- Add gender column to Product table (mujer/hombre/unisex)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT 'unisex';
