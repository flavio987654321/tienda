-- Configuración → General → Avisos de ventas: "Recibir un mail por cada venta".
-- Idempotente, como todas las de digitales.
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "avisoMailVentas" BOOLEAN NOT NULL DEFAULT false;
