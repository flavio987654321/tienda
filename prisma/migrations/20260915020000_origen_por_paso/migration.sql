-- El origen de una visita digital, por paso: de dónde vino el que ENTRÓ y de
-- dónde había venido el que ABRIÓ EL PAGO. Con las ventas de la orden arman el
-- embudo por canal.
--
-- La tabla existía sin el paso, con la clave (producto, día, origen). Se
-- agrega la columna con valor por defecto "pagina" —todo lo escrito hasta hoy
-- eran entradas— y la clave única pasa a incluirla. Idempotente: la columna y
-- los índices se crean si no existen y el índice viejo se borra si existe.

ALTER TABLE "DigitalVisitaOrigen" ADD COLUMN IF NOT EXISTS "paso" TEXT NOT NULL DEFAULT 'pagina';

DROP INDEX IF EXISTS "DigitalVisitaOrigen_productId_date_source_key";

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVisitaOrigen_productId_date_paso_source_key"
  ON "DigitalVisitaOrigen"("productId", "date", "paso", "source");
