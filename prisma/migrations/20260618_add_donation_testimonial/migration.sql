CREATE TABLE IF NOT EXISTS "DonationTestimonial" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "donorName" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "mediaType" TEXT,
  "text" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DonationTestimonial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DonationTestimonial_campaignId_key" ON "DonationTestimonial"("campaignId");
ALTER TABLE "DonationTestimonial" ADD CONSTRAINT "DonationTestimonial_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
