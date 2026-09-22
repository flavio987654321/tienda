-- Cerrar la cuenta digital (Configuración → Zona de peligro): qué productos
-- estaban publicados al cerrar, para que al reabrir vuelvan ésos y sólo ésos.
-- Idempotente, como todas las de digitales.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "pausadoPorCierre" BOOLEAN NOT NULL DEFAULT false;
