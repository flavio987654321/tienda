-- De dónde vinieron las visitas.
--
-- Hasta acá se guardaba cuántas visitas tuvo la tienda cada día y nada más. La
-- primera pregunta que hace cualquiera que vende por internet —"¿esto lo trajo
-- Instagram o el WhatsApp que mandé?"— no se podía contestar.
--
-- Va en una tabla aparte y no como una columna de "StoreView". Meterle el
-- origen a StoreView obligaba a cambiarle la clave única, a rellenar todo el
-- historial con un "desconocido" inventado y a tocar los seis lugares que hoy
-- la leen. Así no se toca nada de lo que ya funciona, y el precio —que las dos
-- cuentas no den iguales hasta que pase un período entero— es un dato honesto
-- que la pantalla muestra en vez de esconder.
--
-- "source" sale siempre de la lista cerrada de src/lib/origen-visita.ts. Si
-- fuera el dominio crudo del referente, una tienda linkeada desde cincuenta
-- agregadores tendría cincuenta filas por día para siempre.
CREATE TABLE IF NOT EXISTS "StoreViewSource" (
  "id"      TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "date"    TEXT NOT NULL,
  "source"  TEXT NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "StoreViewSource_pkey" PRIMARY KEY ("id")
);

-- La clave del upsert: cada visita hace un INCREMENT sobre (tienda, día, origen).
CREATE UNIQUE INDEX IF NOT EXISTS "StoreViewSource_storeId_date_source_key"
  ON "StoreViewSource"("storeId", "date", "source");

-- La lectura del panel es siempre "esta tienda, los últimos N días".
CREATE INDEX IF NOT EXISTS "StoreViewSource_storeId_date_idx"
  ON "StoreViewSource"("storeId", "date" DESC);

-- Igual que StoreView: si se borra la tienda, se van con ella.
ALTER TABLE "StoreViewSource"
  ADD CONSTRAINT "StoreViewSource_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
