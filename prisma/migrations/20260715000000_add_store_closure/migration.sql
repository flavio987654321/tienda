-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoreClosure" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerName" TEXT,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreClosure_storeId_idx" ON "StoreClosure"("storeId");

-- CreateIndex
CREATE INDEX "StoreClosure_status_createdAt_idx" ON "StoreClosure"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "StoreClosure" ADD CONSTRAINT "StoreClosure_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

