-- Una clave por envío evita guardar dos tasaciones si el navegador reintenta
-- después de un timeout o si dos requests llegan al mismo tiempo.
ALTER TABLE "Tasacion" ADD COLUMN IF NOT EXISTS "submissionKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Tasacion_submissionKey_key" ON "Tasacion"("submissionKey");
