-- Cuotas sin interés informativas por producto (no conectado a ninguna API
-- bancaria ni de Mercado Pago). 0 = no mostrar.
ALTER TABLE "Product" ADD COLUMN "cuotas" INTEGER NOT NULL DEFAULT 0;
