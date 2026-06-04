CREATE TABLE "StoreReport" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreReport_storeId_idx" ON "StoreReport"("storeId");
CREATE INDEX "StoreReport_status_createdAt_idx" ON "StoreReport"("status", "createdAt" DESC);

ALTER TABLE "StoreReport" ADD CONSTRAINT "StoreReport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
