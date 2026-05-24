-- AffiliateClick: registra cada click en un link de afiliada (con o sin conversión)
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "convertedToOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- AffiliateGoal: metas mensuales de ventas por tienda con bonus de comisión
CREATE TABLE "AffiliateGoal" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "bonusRate" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateGoal_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "AffiliateClick_affiliateId_idx" ON "AffiliateClick"("affiliateId");
CREATE INDEX "AffiliateClick_storeId_idx" ON "AffiliateClick"("storeId");
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");
CREATE UNIQUE INDEX "AffiliateGoal_storeId_month_key" ON "AffiliateGoal"("storeId", "month");
CREATE INDEX "AffiliateGoal_storeId_idx" ON "AffiliateGoal"("storeId");

-- Foreign keys
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateGoal" ADD CONSTRAINT "AffiliateGoal_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
