-- Visitas a la página de venta de cada producto digital, por día, con cuántas
-- llegaron al checkout y de dónde vinieron.
--
-- Son `StoreView` + `StoreFunnelStep` + `StoreViewSource` colgadas del PRODUCTO
-- y no de la tienda: en Productos Digitales cada principal es su propio sitio,
-- y una cuenta Pro tiene cinco. Es lo que hace falta para que Estadísticas
-- diga "de 100 que entraron compraron 3" por producto, que es el número que
-- decide si una página sirve.
--
-- Dos tablas nuevas y nada más: no toca ninguna fila existente, y volver a
-- correrla no hace nada (IF NOT EXISTS en todo).

CREATE TABLE IF NOT EXISTS "DigitalVisita" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "paso"      TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DigitalVisita_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisita_productId_date_paso_key"
  ON "DigitalVisita"("productId", "date", "paso");
CREATE INDEX IF NOT EXISTS "DigitalVisita_productId_date_idx"
  ON "DigitalVisita"("productId", "date" DESC);

DO $$ BEGIN
  ALTER TABLE "DigitalVisita"
    ADD CONSTRAINT "DigitalVisita_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DigitalVisitaOrigen" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "source"    TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DigitalVisitaOrigen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisitaOrigen_productId_date_source_key"
  ON "DigitalVisitaOrigen"("productId", "date", "source");
CREATE INDEX IF NOT EXISTS "DigitalVisitaOrigen_productId_date_idx"
  ON "DigitalVisitaOrigen"("productId", "date" DESC);

DO $$ BEGIN
  ALTER TABLE "DigitalVisitaOrigen"
    ADD CONSTRAINT "DigitalVisitaOrigen_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
