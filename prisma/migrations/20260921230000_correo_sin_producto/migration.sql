-- Mail a tus compradores: "compraron X y NO compraron Y". Sin FK a propósito:
-- es un filtro guardado para el historial, no una relación que haya que seguir.
-- Idempotente, como todas las de digitales.
ALTER TABLE "CorreoDigital" ADD COLUMN IF NOT EXISTS "sinProductoId" TEXT;
