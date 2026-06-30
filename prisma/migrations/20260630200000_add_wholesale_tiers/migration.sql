-- AlterTable: add wholesale tiers and wholesale-only visibility flag to Product
ALTER TABLE "Product" ADD COLUMN "preciosEscalonados" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Product" ADD COLUMN "soloMayorista" BOOLEAN NOT NULL DEFAULT false;
