CREATE TABLE "DonationNotification" (
  "id"         TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "sentCount"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DonationNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DonationNotification_campaignId_createdAt_idx"
  ON "DonationNotification" ("campaignId", "createdAt" DESC);

ALTER TABLE "DonationNotification"
  ADD CONSTRAINT "DonationNotification_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
