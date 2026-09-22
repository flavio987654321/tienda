-- Sasha: cuánto costó cada respuesta, para saber cuánto sale un plan por mes
-- con una consulta en vez de estimarlo. Cuatro columnas opcionales; no toca
-- ninguna fila. Idempotente.
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "tokensEntrada" INTEGER;
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "tokensSalida" INTEGER;
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "tokensCacheLeido" INTEGER;
ALTER TABLE "AsistenteMensaje" ADD COLUMN IF NOT EXISTS "tokensCacheEscrito" INTEGER;
