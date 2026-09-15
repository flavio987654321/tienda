-- La campaña de cada visita a la página de venta de un producto digital, y la
-- de cada venta. Es el escalón de abajo de "de dónde vino": no sólo Instagram,
-- sino qué anuncio de qué campaña. Para el que paga publicidad es la tabla
-- que le dice qué anuncio apagar.
--
-- Una tabla nueva y tres columnas que admiten nulos en la orden: no toca
-- ninguna fila existente, y volver a correrla no hace nada (IF NOT EXISTS en
-- todo). La clave foránea va adentro del CREATE TABLE.

CREATE TABLE IF NOT EXISTS "DigitalVisitaCampania" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "medio"     TEXT NOT NULL,
  "campania"  TEXT NOT NULL,
  "anuncio"   TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DigitalVisitaCampania_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigitalVisitaCampania_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisitaCampania_productId_date_medio_campania_anuncio_key"
  ON "DigitalVisitaCampania"("productId", "date", "medio", "campania", "anuncio");
CREATE INDEX IF NOT EXISTS "DigitalVisitaCampania_productId_date_idx"
  ON "DigitalVisitaCampania"("productId", "date" DESC);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmMedio"    TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmCampania" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmAnuncio"  TEXT;
