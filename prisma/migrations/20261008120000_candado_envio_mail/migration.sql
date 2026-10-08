-- Candado del envío por mail de una campaña (08/10/26).
-- Dos pasadas a la vez de "continuar envío" (dos pestañas) arrancaban del mismo
-- cursor y la misma tanda de mails le llegaba dos veces a los mismos
-- suscriptores. La pasada que arranca marca desde cuándo está mandando; las
-- demás ven la marca y no mandan. Ver "lib/newsletter".
--
-- Una columna nueva y opcional: no toca ninguna fila ni columna existente.
-- Idempotente.
ALTER TABLE "PushCampaign" ADD COLUMN IF NOT EXISTS "emailEnvioDesde" TIMESTAMP(3);
