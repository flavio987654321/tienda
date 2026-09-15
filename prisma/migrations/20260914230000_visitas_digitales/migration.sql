-- Visitas a la página de venta de cada producto digital, por día, con cuántas
-- llegaron al checkout, desde qué dispositivo y de dónde vinieron. Y en la
-- orden, de dónde vino la visita que terminó en compra.
--
-- Son `StoreView` + `StoreFunnelStep` + `StoreViewSource` colgadas del PRODUCTO
-- y no de la tienda: en Productos Digitales cada principal es su propio sitio,
-- y una cuenta Pro tiene cinco. Es lo que hace falta para que Estadísticas
-- diga "de 100 que entraron compraron 3" por producto, que es el número que
-- decide si una página sirve; y "Instagram trajo 500 visitas y 12 ventas",
-- que es el que decide dónde poner la publicidad.
--
-- Dos tablas nuevas y una columna que admite nulos: no toca ninguna fila
-- existente, y volver a correrla no hace nada (IF NOT EXISTS en todo). Las
-- claves foráneas van adentro del CREATE TABLE —las tablas son nuevas— y no en
-- un ALTER aparte, que necesitaría su propio "si no existe".

CREATE TABLE IF NOT EXISTS "DigitalVisita" (
  "id"          TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "date"        TEXT NOT NULL,
  "paso"        TEXT NOT NULL,
  "dispositivo" TEXT NOT NULL,
  "count"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DigitalVisita_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigitalVisita_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisita_productId_date_paso_dispositivo_key"
  ON "DigitalVisita"("productId", "date", "paso", "dispositivo");
CREATE INDEX IF NOT EXISTS "DigitalVisita_productId_date_idx"
  ON "DigitalVisita"("productId", "date" DESC);

CREATE TABLE IF NOT EXISTS "DigitalVisitaOrigen" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "source"    TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DigitalVisitaOrigen_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigitalVisitaOrigen_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisitaOrigen_productId_date_source_key"
  ON "DigitalVisitaOrigen"("productId", "date", "source");
CREATE INDEX IF NOT EXISTS "DigitalVisitaOrigen_productId_date_idx"
  ON "DigitalVisitaOrigen"("productId", "date" DESC);

-- De dónde vino la visita que terminó en esta compra. Null en todo lo que ya
-- existe (órdenes de tiendas, y digitales de antes de esto).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "origenVisita" TEXT;
