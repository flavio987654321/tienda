-- Move affiliate bank data from Wallet to User (global per person, not per affiliation)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateCbu"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateAlias"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateCuil"          TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateBankHolder"    TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateBankUpdatedAt" TIMESTAMP(3);

-- Store: verification ban flag
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "verificationBanned" BOOLEAN NOT NULL DEFAULT false;

-- VerificationRequest: CUIT submitted by the store owner
ALTER TABLE "VerificationRequest" ADD COLUMN IF NOT EXISTS "cuit" TEXT;

-- Commission: direct MP disbursement tracking
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "disbursedAt"    TIMESTAMP(3);
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "disbursementId" TEXT;
