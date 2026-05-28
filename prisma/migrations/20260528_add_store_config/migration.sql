-- Add storeConfig column to Store table for new visual template editor
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "storeConfig" TEXT NOT NULL DEFAULT '{}';
