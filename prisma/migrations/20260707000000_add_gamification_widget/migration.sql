-- CreateTable
CREATE TABLE "GamificationWidget" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SPIN',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT '¡Girá y ganá!',
    "subtitle" TEXT NOT NULL DEFAULT 'Probá tu suerte y ganá un premio',
    "buttonText" TEXT NOT NULL DEFAULT '¡Girá y ganá!',
    "reclaimText" TEXT NOT NULL DEFAULT 'Reclamar premio',
    "legalText" TEXT,
    "headerImage" TEXT,
    "centerType" TEXT NOT NULL DEFAULT 'text',
    "centerText" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'FIRST_CLICK',
    "triggerDelay" INTEGER,
    "showFrequency" TEXT NOT NULL DEFAULT 'ONCE_SESSION',
    "emailRequired" BOOLEAN NOT NULL DEFAULT true,
    "styles" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationPrize" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "isNoPrize" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "couponId" TEXT,

    CONSTRAINT "GamificationPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationSpin" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "email" TEXT,
    "ip" TEXT NOT NULL,
    "prizeLabel" TEXT,
    "isNoPrize" BOOLEAN NOT NULL DEFAULT false,
    "couponId" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationSpin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamificationWidget_storeId_key" ON "GamificationWidget"("storeId");

-- CreateIndex
CREATE INDEX "GamificationPrize_widgetId_idx" ON "GamificationPrize"("widgetId");

-- CreateIndex
CREATE INDEX "GamificationSpin_widgetId_idx" ON "GamificationSpin"("widgetId");

-- CreateIndex
CREATE INDEX "GamificationSpin_widgetId_email_idx" ON "GamificationSpin"("widgetId", "email");

-- AddForeignKey
ALTER TABLE "GamificationWidget" ADD CONSTRAINT "GamificationWidget_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationPrize" ADD CONSTRAINT "GamificationPrize_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "GamificationWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationPrize" ADD CONSTRAINT "GamificationPrize_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationSpin" ADD CONSTRAINT "GamificationSpin_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "GamificationWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
