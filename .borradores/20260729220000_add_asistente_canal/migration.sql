-- Separa la charla del panel de la de WhatsApp.
--
-- Sin esto las dos viven en la misma lista y se mezclan: los mensajes de WhatsApp
-- aparecerían en el medio de la conversación del panel. Y cada canal tiene sus
-- reglas — el panel se vacía cada día (la pantalla arranca limpia y eso se ve),
-- pero en WhatsApp el hilo queda en el celular, así que ahí el historial no es una
-- mejora sino un requisito.
--
-- DEFAULT 'panel' deja todas las filas que ya existen exactamente donde estaban:
-- son todas del panel, porque hasta ahora no había otro canal.
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "canal" TEXT NOT NULL DEFAULT 'panel';

-- Para traer los últimos mensajes de un usuario en un canal sin escanear todo.
CREATE INDEX IF NOT EXISTS "AsistenteMensaje_userId_canal_createdAt_idx"
  ON "AsistenteMensaje" ("userId", "canal", "createdAt");
