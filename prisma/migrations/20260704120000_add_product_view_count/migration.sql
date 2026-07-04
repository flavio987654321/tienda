-- Columna para acumular vistas reales de compradores en la tienda.
-- Se usa para ordenar el bloque "Lo más visto" de mayor a menor.
-- El dueño de la tienda no cuenta (se omite cuando isOwner=true en el cliente).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
