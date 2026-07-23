-- Reseñas de TIENDA: las que hablan de la experiencia y no de un producto.
--
-- Hasta acá una reseña siempre tenía que apuntar a un producto, así que una
-- opinión general sobre la tienda no se podía ni guardar.
--
-- Los dos cambios son ADITIVOS a propósito: esta migración se aplica contra la
-- base de producción ANTES de que se deploye el código que la usa (`npm run
-- build` corre `prisma migrate deploy` primero). El código viejo que queda
-- andando mientras tanto siempre manda `productId` y no conoce `status`, así que
-- no se entera de nada y sigue funcionando igual. No hay ventana en la que algo
-- se rompa.

-- 1) Una reseña de tienda no tiene producto.
--    Sin IF: aflojar un NOT NULL que ya está aflojado no falla ni cambia nada,
--    y no hay forma de que quede a medias.
ALTER TABLE "PublicReview" ALTER COLUMN "productId" DROP NOT NULL;

-- 2) Estado de publicación.
--    DEFAULT 'APPROVED' y no 'PENDING': todo lo que ya existe son reseñas de
--    producto que YA están publicadas. Entrar con PENDING las habría despublicado
--    a todas de golpe, y ningún dueño habría entendido por qué desaparecieron.
--    Las de tienda entran como PENDING desde el código, no desde el default.
ALTER TABLE "PublicReview" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'APPROVED';

-- 3) Para la cola de pendientes del panel y el listado por tipo, que filtran
--    siempre por tienda + estado.
CREATE INDEX IF NOT EXISTS "PublicReview_storeId_status_idx" ON "PublicReview"("storeId", "status");
