-- Evento comercial de la promoción ("Black Friday", "Día de la Madre", o uno
-- propio de la tienda). Es solo presentación: no toca el cálculo del precio.
-- Cuando tiene valor, la tienda lo muestra en el tag del producto, en un banner
-- con cuenta regresiva y como filtro en el listado.
--
-- Aditiva y nullable: las promociones que ya existen quedan en NULL, que es
-- exactamente lo que son — promos sueltas, sin evento.

-- AlterTable
ALTER TABLE "StorePromotion" ADD COLUMN     "eventLabel" TEXT;
