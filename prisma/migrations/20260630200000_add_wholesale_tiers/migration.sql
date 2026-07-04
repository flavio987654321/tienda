-- AlterTable: add wholesale tiers and wholesale-only visibility flag to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preciosEscalonados" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "soloMayorista" BOOLEAN NOT NULL DEFAULT false;
