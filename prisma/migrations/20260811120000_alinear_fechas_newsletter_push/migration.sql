-- Alinea con el schema cuatro columnas de fecha que quedaron con otro tipo.
--
-- ── De dónde salió ───────────────────────────────────────────────────────────
-- Dos migraciones escritas a mano (`add_newsletter` y
-- `push_campaign_borrado_blando`) crearon estas columnas como TIMESTAMPTZ,
-- mientras el schema las declara `DateTime` a secas — que en Postgres Prisma
-- mapea a TIMESTAMP(3). Las otras ~115 columnas de fecha del proyecto son
-- TIMESTAMP(3).
--
-- El resultado más visible de la mezcla está dentro de una misma tabla:
-- "PushCampaign" tiene createdAt y expiresAt en TIMESTAMP(3) y deletedAt en
-- TIMESTAMPTZ(6), porque deletedAt se agregó después y por separado. Eso no es
-- una decisión de diseño, es un descuido.
--
-- Mientras tanto `prisma migrate diff` mostraba drift permanente, así que dejaba
-- de servir para lo que sirve: avisar cuando la base y el schema DE VERDAD se
-- separan. Ese es el motivo real de esta migración.
--
-- ── Por qué es seguro ────────────────────────────────────────────────────────
-- Verificado contra la base antes de escribir esto: NewsletterSubscriber tiene
-- 2 filas y PushCampaign 1. La conversión va con AT TIME ZONE 'UTC' explícito y
-- no dependiendo del TimeZone de la sesión, para que el resultado sea el mismo
-- corra donde corra. Los valores guardados ya estaban en UTC.

-- ── NewsletterSubscriber: las tres fechas ────────────────────────────────────
ALTER TABLE "NewsletterSubscriber"
  ALTER COLUMN "confirmedAt" TYPE TIMESTAMP(3) USING "confirmedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "bajaEn"      TYPE TIMESTAMP(3) USING "bajaEn"      AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt"   TYPE TIMESTAMP(3) USING "createdAt"   AT TIME ZONE 'UTC';

-- El default venía de NOW(), que devuelve TIMESTAMPTZ. Se deja explícito en
-- CURRENT_TIMESTAMP, que es lo que Prisma genera para `@default(now())`; si no,
-- el drift volvía por el default aunque el tipo ya estuviera bien.
ALTER TABLE "NewsletterSubscriber"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── PushCampaign: la que se agregó suelta ────────────────────────────────────
ALTER TABLE "PushCampaign"
  ALTER COLUMN "deletedAt" TYPE TIMESTAMP(3) USING "deletedAt" AT TIME ZONE 'UTC';

-- ── La foreign key ───────────────────────────────────────────────────────────
-- La creó a mano la migración del newsletter con ON DELETE CASCADE solamente,
-- así que ON UPDATE quedó en NO ACTION. Prisma, para `onDelete: Cascade`,
-- espera además ON UPDATE CASCADE. En la práctica no cambia nada —el id de una
-- tienda es un cuid que no se actualiza nunca— pero es la otra mitad del drift.
ALTER TABLE "NewsletterSubscriber"
  DROP CONSTRAINT "NewsletterSubscriber_storeId_fkey";
ALTER TABLE "NewsletterSubscriber"
  ADD CONSTRAINT "NewsletterSubscriber_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El índice de PushCampaign(storeId, deletedAt) NO se toca: existe en la base,
-- lo usan tres consultas del panel y del banner, y lo que faltaba era
-- declararlo en el schema. Ya está declarado.
