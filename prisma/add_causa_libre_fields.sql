-- Migración: segundo tipo de campaña "Causa Libre" en DonationCampaign
-- Las columnas (type, mediaUrl, mediaType, contactPhone, goalAmount nullable)
-- ya se aplicaron vía `prisma db push`. Esto es solo la parte que Prisma no
-- puede expresar en el schema: el índice único parcial por tipo.
-- Ya ejecutado en producción — se deja como referencia.

DROP INDEX IF EXISTS "one_active_campaign";

-- Permite una campaña ACTIVE por tipo (antes: una sola ACTIVE en toda la tabla).
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_campaign_per_type"
  ON "DonationCampaign" ("type")
  WHERE "status" = 'ACTIVE';
