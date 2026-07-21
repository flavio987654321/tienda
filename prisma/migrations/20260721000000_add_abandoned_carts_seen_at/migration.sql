-- Marca cuándo el dueño abrió por última vez "Carritos abandonados".
-- El puntito del sidebar cuenta los carritos con actividad posterior a esta fecha.

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "abandonedCartsSeenAt" TIMESTAMP(3);

-- Las tiendas que ya existen arrancan en "visto recién". Sin esto, la primera vez
-- que alguien abra la pantalla le aparecerían marcados como nuevos TODOS los
-- carritos viejos y el puntito diría 9+, que es justo el ruido que la función
-- viene a evitar. Desde acá en adelante solo se marca lo que entra de verdad.
UPDATE "Store" SET "abandonedCartsSeenAt" = NOW();
