-- Las donaciones PENDING abandonadas (pago nunca completado) no deben
-- bloquear un reintento real. Solo una donación CONFIRMED por persona por
-- campaña debe ser única.
DROP INDEX IF EXISTS "Donation_campaignId_userId_key";
DROP INDEX IF EXISTS "Donation_campaignId_donorEmail_donorPhone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "donation_one_confirmed_per_user"
  ON "Donation" ("campaignId", "userId")
  WHERE status = 'CONFIRMED' AND "userId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "donation_one_confirmed_per_guest"
  ON "Donation" ("campaignId", "donorEmail", "donorPhone")
  WHERE status = 'CONFIRMED';
