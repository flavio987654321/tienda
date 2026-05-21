-- Agregar campo acceptsRewardCoupons a Store
ALTER TABLE "Store" ADD COLUMN "acceptsRewardCoupons" BOOLEAN NOT NULL DEFAULT false;

-- Crear tabla AffiliateRewardCoupon
CREATE TABLE "AffiliateRewardCoupon" (
    "id"            TEXT NOT NULL,
    "code"          TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "type"          TEXT NOT NULL,
    "level"         TEXT NOT NULL,
    "plan"          TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "earnedMonth"   TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'AVAILABLE',
    "usedAt"        TIMESTAMP(3),
    "usedOrderId"   TEXT,
    "usedStoreName" TEXT,
    "expiresAt"     TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateRewardCoupon_pkey" PRIMARY KEY ("id")
);

-- Índice único en code
CREATE UNIQUE INDEX "AffiliateRewardCoupon_code_key" ON "AffiliateRewardCoupon"("code");

-- Foreign key a User
ALTER TABLE "AffiliateRewardCoupon" ADD CONSTRAINT "AffiliateRewardCoupon_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
