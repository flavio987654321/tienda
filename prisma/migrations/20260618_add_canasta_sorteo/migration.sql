-- Canasta Solidaria: sorteo en vivo
-- Migración aditiva. No toca tablas ni datos existentes.

ALTER TABLE "DonationCampaign"
  ADD COLUMN IF NOT EXISTS "scheduledDrawAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "drawStatus"      TEXT NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS "drawStartedAt"   TIMESTAMP(3);

ALTER TABLE "DonationDraw"
  ADD COLUMN IF NOT EXISTS "revealAt" TIMESTAMP(3);

-- Garantiza a nivel de base de datos que nunca pueda haber dos campañas
-- ACTIVE al mismo tiempo (defensa de fondo, no depende de que el código
-- de turno lo chequee correctamente — esto es lo que falló antes con el
-- seed duplicado).
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_campaign"
  ON "DonationCampaign" ("status")
  WHERE "status" = 'ACTIVE';

-- Garantiza que no pueda haber dos sorteos con el mismo número de intento
-- para la misma campaña (evita que un "activar sorteo" duplicado por
-- doble-click o carrera genere dos sets de ganadores).
CREATE UNIQUE INDEX IF NOT EXISTS "DonationDraw_campaignId_attemptNumber_key"
  ON "DonationDraw" ("campaignId", "attemptNumber");
