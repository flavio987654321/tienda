-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "gaAccountId" TEXT,
ADD COLUMN     "gaConnectedAt" TIMESTAMP(3),
ADD COLUMN     "gaPropertyId" TEXT,
ADD COLUMN     "gaRefreshToken" TEXT;
