-- Promociones aplicadas al pedido, "congeladas" al momento de la venta.
-- Aditiva y con default: no toca ningún pedido existente ni rompe el código que
-- ya está online (que simplemente ignora estas columnas).
--   promoSavings: cuánto ahorró el comprador por promos (para métricas).
--   promoSummary: JSON con qué promos ganaron, para el comprobante — después la
--                 promo puede cambiar o archivarse y el email tiene que seguir
--                 diciendo la verdad de lo que se cobró.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "promoSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "promoSummary" TEXT;
