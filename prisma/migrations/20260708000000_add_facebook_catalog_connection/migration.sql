-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "fbAccessToken" TEXT,
ADD COLUMN     "fbBusinessId" TEXT,
ADD COLUMN     "fbCatalogId" TEXT,
ADD COLUMN     "fbConnectedAt" TIMESTAMP(3),
ADD COLUMN     "fbFeedId" TEXT,
ADD COLUMN     "fbUserId" TEXT;
