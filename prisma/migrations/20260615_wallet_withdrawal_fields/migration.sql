-- Add audit and snapshot fields to WalletWithdrawal
ALTER TABLE "WalletWithdrawal"
  ADD COLUMN IF NOT EXISTS "approvedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotCbu"     TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotAlias"   TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotCuil"    TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotHolder"  TEXT;
