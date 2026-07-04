-- Add verified and verifiedBy columns to PublicReview
-- "verified" indicates the review comes from a real buyer
-- "verifiedBy" is either "auto" (matched against a delivered order) or "owner" (manually approved)
ALTER TABLE "PublicReview" ADD COLUMN IF NOT EXISTS "verified"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublicReview" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
