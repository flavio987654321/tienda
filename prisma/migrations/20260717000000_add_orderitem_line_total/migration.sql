-- AlterTable: guardar el total real de cada línea de pedido.
-- Nullable a propósito: las órdenes previas no tienen el dato y los consumidores
-- caen en price * quantity (que para ellas era exacto). Aditivo, no rompe nada.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "lineTotal" DOUBLE PRECISION;
