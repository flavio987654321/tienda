CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER,
    "reason" TEXT,
    "errorName" TEXT,
    "requestId" TEXT,
    "ipFingerprint" TEXT,
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt" DESC);
CREATE INDEX "SecurityEvent_kind_createdAt_idx" ON "SecurityEvent"("kind", "createdAt" DESC);
CREATE INDEX "SecurityEvent_ipFingerprint_createdAt_idx" ON "SecurityEvent"("ipFingerprint", "createdAt" DESC);
