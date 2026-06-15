-- Add vehicle status fields to Product model
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "vehicleStatus"  TEXT,
  ADD COLUMN IF NOT EXISTS "soldAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "soldPrice"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "soldBuyerName"  TEXT,
  ADD COLUMN IF NOT EXISTS "soldBuyerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "soldNotes"      TEXT;
