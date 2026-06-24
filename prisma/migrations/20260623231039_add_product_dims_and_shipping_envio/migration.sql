-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "weightKg" DOUBLE PRECISION,
ADD COLUMN     "widthCm" DOUBLE PRECISION,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "depthCm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Shipping" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ADD COLUMN     "labelUrl" TEXT;
