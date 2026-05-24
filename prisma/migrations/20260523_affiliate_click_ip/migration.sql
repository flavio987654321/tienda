-- Agrega campo ip a AffiliateClick para deduplicación y prevención de inflación de clicks
ALTER TABLE "AffiliateClick" ADD COLUMN "ip" TEXT;
CREATE INDEX "AffiliateClick_affiliateId_ip_idx" ON "AffiliateClick"("affiliateId", "ip");
