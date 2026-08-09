-- Los dos escalones del embudo que no se pueden sacar de ninguna otra tabla.
--
-- El recorrido completo es: entró → puso algo en el carrito → abrió el checkout
-- → escribió sus datos → hizo el pedido → pagó. El primero sale de "StoreView",
-- los dos últimos de "Order" y el de los datos de "AbandonedCart". Los dos del
-- medio no los sabía nadie, y son justo donde más gente se cae.
--
-- Hasta acá el panel tenía los dos extremos y una división entre ellos llamada
-- "conversión". Con eso se sabe que de cada cien compran dos, y nada sobre las
-- otras noventa y ocho: si no encontraron nada, si el envío las espantó, o si
-- llenaron todo y se cayeron al pagar. Son tres problemas distintos y ninguno
-- se arregla igual.
--
-- Se cuenta como las visitas: una vez por navegador por día por tienda, con el
-- dedup del lado del cliente. Así el denominador de arriba y el numerador de
-- abajo miden lo mismo y el porcentaje quiere decir algo.
--
-- "step" sale de la lista cerrada de src/lib/embudo.ts, por lo mismo que
-- StoreViewSource.source: es parte de la clave de la tabla.
CREATE TABLE IF NOT EXISTS "StoreFunnelStep" (
  "id"      TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "date"    TEXT NOT NULL,
  "step"    TEXT NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "StoreFunnelStep_pkey" PRIMARY KEY ("id")
);

-- La clave del upsert: cada paso hace un INCREMENT sobre (tienda, día, paso).
CREATE UNIQUE INDEX IF NOT EXISTS "StoreFunnelStep_storeId_date_step_key"
  ON "StoreFunnelStep"("storeId", "date", "step");

-- La lectura del panel es siempre "esta tienda, los últimos N días".
CREATE INDEX IF NOT EXISTS "StoreFunnelStep_storeId_date_idx"
  ON "StoreFunnelStep"("storeId", "date" DESC);

ALTER TABLE "StoreFunnelStep"
  ADD CONSTRAINT "StoreFunnelStep_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
