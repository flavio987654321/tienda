-- Canasta Solidaria: campaña de donación colectiva con sorteo
-- Migración 100% aditiva, no toca tablas existentes.

CREATE TABLE "DonationCampaign" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "goalAmount"      DOUBLE PRECISION NOT NULL,
  "reservePct"      DOUBLE PRECISION NOT NULL DEFAULT 10,
  "status"          TEXT NOT NULL DEFAULT 'ACTIVE',
  "estimatedDrawAt" TIMESTAMP(3),
  "bannerActive"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DonationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DonationCampaign_status_idx" ON "DonationCampaign"("status");

CREATE TABLE "DonationProduct" (
  "id"          TEXT NOT NULL,
  "campaignId"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "image"       TEXT,
  "targetPrice" DOUBLE PRECISION NOT NULL,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "DonationProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DonationProduct_campaignId_idx" ON "DonationProduct"("campaignId");

ALTER TABLE "DonationProduct"
  ADD CONSTRAINT "DonationProduct_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Donation" (
  "id"                TEXT NOT NULL,
  "campaignId"        TEXT NOT NULL,
  "userId"            TEXT,
  "amount"            DOUBLE PRECISION NOT NULL,
  "mpPaymentId"       TEXT,
  "status"            TEXT NOT NULL DEFAULT 'PENDING',
  "donorName"         TEXT NOT NULL,
  "donorPhone"        TEXT NOT NULL,
  "donorEmail"        TEXT NOT NULL,
  "donorLocalidad"    TEXT NOT NULL,
  "donorDeliveryPref" TEXT NOT NULL DEFAULT 'ENVIO',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Donation_mpPaymentId_key" ON "Donation"("mpPaymentId");
CREATE UNIQUE INDEX "Donation_campaignId_userId_key" ON "Donation"("campaignId", "userId");
CREATE UNIQUE INDEX "Donation_campaignId_donorEmail_donorPhone_key" ON "Donation"("campaignId", "donorEmail", "donorPhone");
CREATE INDEX "Donation_campaignId_status_idx" ON "Donation"("campaignId", "status");

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DonationDraw" (
  "id"                  TEXT NOT NULL,
  "campaignId"          TEXT NOT NULL,
  "attemptNumber"       INTEGER NOT NULL DEFAULT 1,
  "winner1Id"           TEXT,
  "winner2Id"           TEXT,
  "winner3Id"           TEXT,
  "winnerStatus"        TEXT NOT NULL DEFAULT 'PENDING',
  "excludedDonationIds" TEXT NOT NULL DEFAULT '[]',
  "conductedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextAttemptAt"       TIMESTAMP(3),
  "adminNotes"          TEXT,

  CONSTRAINT "DonationDraw_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DonationDraw_campaignId_idx" ON "DonationDraw"("campaignId");

ALTER TABLE "DonationDraw"
  ADD CONSTRAINT "DonationDraw_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DonationDraw"
  ADD CONSTRAINT "DonationDraw_winner1Id_fkey"
  FOREIGN KEY ("winner1Id") REFERENCES "Donation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DonationDraw"
  ADD CONSTRAINT "DonationDraw_winner2Id_fkey"
  FOREIGN KEY ("winner2Id") REFERENCES "Donation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DonationDraw"
  ADD CONSTRAINT "DonationDraw_winner3Id_fkey"
  FOREIGN KEY ("winner3Id") REFERENCES "Donation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
