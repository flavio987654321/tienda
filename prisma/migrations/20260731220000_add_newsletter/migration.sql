-- Newsletter por mail: el bloque de suscripción del storefront pasa de
-- decorativo a real, y las campañas del panel de notificaciones salen por dos
-- canales (push a los seguidores, mail a los suscriptores).
--
-- Todo es ADITIVO y con defaults, igual que la migración de reseñas de tienda:
-- se aplica contra producción ANTES de que se deploye el código que la usa
-- (`npm run build` corre `prisma migrate deploy` primero). El código viejo que
-- sigue andando mientras tanto no conoce ninguna de estas columnas, así que no
-- se entera de nada. No hay ventana en la que algo se rompa.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Suscriptores
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "storeId"     TEXT NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE,
  "email"       TEXT NOT NULL,
  "confirmed"   BOOLEAN NOT NULL DEFAULT false,
  "confirmedAt" TIMESTAMPTZ,
  "token"       TEXT NOT NULL,
  "bajaEn"      TIMESTAMPTZ,
  "bajaMotivo"  TEXT,
  "ip"          TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- El token viaja en el link de confirmación y en el de baja: tiene que
-- identificar a UNA fila, si no la baja podría apagar a otro.
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_token_key"
  ON "NewsletterSubscriber"("token");

-- El mismo mail no se anota dos veces en la MISMA tienda, pero sí puede estar
-- en varias: son listas independientes, y darse de baja de una no es darse de
-- baja de todas.
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_storeId_email_key"
  ON "NewsletterSubscriber"("storeId", "email");

-- El orden de este índice es el mismo que recorre el envío y que asume el
-- cursor de la campaña.
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_storeId_confirmed_createdAt_idx"
  ON "NewsletterSubscriber"("storeId", "confirmed", "createdAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) La campaña ahora también lleva la cuenta del canal mail
-- ─────────────────────────────────────────────────────────────────────────────
-- DEFAULT 'SIN_MAIL' y no 'PENDIENTE': todas las campañas que ya existen son
-- push puro y nunca tuvieron un mail pendiente. Entrar como 'PENDIENTE' las
-- dejaría a todas en la cola de "falta enviar", y el primer drenado le mandaría
-- a la lista entera campañas viejas de hace meses.
ALTER TABLE "PushCampaign" ADD COLUMN IF NOT EXISTS "emailStatus" TEXT NOT NULL DEFAULT 'SIN_MAIL';
ALTER TABLE "PushCampaign" ADD COLUMN IF NOT EXISTS "sentEmail"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PushCampaign" ADD COLUMN IF NOT EXISTS "emailCursor" TEXT;

CREATE INDEX IF NOT EXISTS "PushCampaign_emailStatus_idx" ON "PushCampaign"("emailStatus");
