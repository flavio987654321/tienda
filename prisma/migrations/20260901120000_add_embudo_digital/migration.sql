-- El embudo de Productos Digitales: un producto, sus bonos y sus upsells son la
-- misma tabla, separados por el rol y por de quien cuelgan.
--
-- Las dos columnas son NULLABLE a proposito: los 116 productos de tienda que ya
-- existen quedan en NULL y no se enteran. No se reescribe ninguna fila.

ALTER TABLE "Product" ADD COLUMN "rolDigital" TEXT;
ALTER TABLE "Product" ADD COLUMN "padreId" TEXT;

-- La ficha de un producto digital pide sus bonos y upsells con `where padreId`.
-- Sin indice, eso es un escaneo de la tabla entera en cada visita.
CREATE INDEX "Product_padreId_idx" ON "Product"("padreId");

-- Borrar el principal se lleva sus bonos y upsells: sin el no tienen donde vivir.
ALTER TABLE "Product" ADD CONSTRAINT "Product_padreId_fkey"
  FOREIGN KEY ("padreId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
