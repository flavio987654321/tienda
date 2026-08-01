-- Borrado blando de campañas.
--
-- El límite de 3 notificaciones por semana se calcula contando filas de
-- "PushCampaign" de los últimos 7 días. Con el DELETE de verdad que había, el
-- dueño podía mandar tres, borrarlas del historial y recuperar el cupo: nueve
-- mensajes en una semana con el panel diciendo "te quedan 3 disponibles".
--
-- Ese tope no es un capricho de producto: todas las tiendas mandan desde el
-- mismo dominio, así que una que satura a su gente se gana denuncias de spam
-- que le bajan la reputación a todas.
--
-- Ahora borrar marca la fila y la saca de la vista. El envío ya ocurrido sigue
-- contando, que es lo correcto: lo que el dueño deshace es su registro, no el
-- push que ya está en el celular de alguien.
ALTER TABLE "PushCampaign" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- El historial del panel y el banner de la tienda filtran por (tienda, no
-- borrada) y ordenan por fecha.
CREATE INDEX IF NOT EXISTS "PushCampaign_storeId_deletedAt_idx"
  ON "PushCampaign"("storeId", "deletedAt");
