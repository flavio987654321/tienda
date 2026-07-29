-- Avisos que Sasha manda sola, y el contador de no leídos.
--
-- Hasta ahora Sasha sólo hablaba si se le abría el chat: lo único que hacía por
-- su cuenta era cambiar la cara del globito. La idea es que escriba primero —una
-- vez por día, a la mañana— y que el globito muestre cuántos mensajes hay sin
-- leer, como cualquier chat.
--
-- Faltaban dos cosas en `AsistenteMensaje`:
--
-- `esAviso` — la tabla guarda la charla del día, que se borra sola al cambiar de
-- día (se filtra por `day`). Un aviso NO puede desaparecer así: si Sasha escribe
-- el martes y el dueño entra el jueves, ese mensaje tiene que seguir ahí. Esta
-- bandera separa las dos cosas sin partir la tabla en dos, que obligaría a
-- ordenar a mano las dos listas cada vez que se dibuja la conversación.
--
-- `leidoAt` — null significa "sin leer", y es lo que cuenta el globito. Se usa
-- timestamp y no un booleano porque cuesta lo mismo y además deja saber CUÁNDO lo
-- leyó, que sirve para medir si los avisos se miran o se ignoran. Un `read
-- boolean` no se puede convertir después sin perder esa información.
--
-- Las dos con DEFAULT y NULLABLE respectivamente, así las filas que ya existen
-- quedan bien sin tocarlas: todo lo viejo es charla (`esAviso = false`) y no
-- aparece en el contador.
-- `clave` — qué clase de aviso es ("stock-agotado", "ventas-bajando"). Sin esto,
-- un aviso que describe una situación que dura —el stock sigue bajo, las ventas
-- siguen flojas— se repetiría todas las mañanas hasta que el dueño lo resuelva, y
-- a la tercera repetición el globito deja de mirarse. Con la clave se puede decir
-- "esto ya lo dije hace poco, no lo repito".
--
-- NULLABLE porque la charla normal no tiene clave: sólo la tienen los avisos.
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "esAviso" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "clave" TEXT;
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "leidoAt" TIMESTAMP(3);

-- El contador corre en cada carga del panel, así que tiene que resolverse por
-- índice y no escaneando el historial completo del usuario. El mismo índice sirve
-- para la consulta de "¿ya mandé este aviso hace poco?" del cron.
CREATE INDEX IF NOT EXISTS "AsistenteMensaje_userId_esAviso_leidoAt_idx"
  ON "AsistenteMensaje" ("userId", "esAviso", "leidoAt");
