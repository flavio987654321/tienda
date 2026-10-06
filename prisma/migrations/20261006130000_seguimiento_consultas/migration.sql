-- El seguimiento de una consulta de autos (06/10/26): etapa (contactado,
-- visita agendada, negociando), nota, cuándo volver a llamar y la visita o
-- prueba de manejo. Ver "lib/seguimiento".
--
-- Una tabla nueva, aparte de "Lead": no toca ninguna fila ni columna de las que
-- ya existen. Idempotente.
CREATE TABLE IF NOT EXISTS "SeguimientoConsulta" (
    "leadId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "etapa" TEXT,
    "nota" TEXT,
    "recordarEl" TIMESTAMP(3),
    "visitaEl" TIMESTAMP(3),
    "visitaTipo" TEXT,
    "contactadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeguimientoConsulta_pkey" PRIMARY KEY ("leadId")
);
CREATE INDEX IF NOT EXISTS "SeguimientoConsulta_storeId_recordarEl_idx" ON "SeguimientoConsulta"("storeId", "recordarEl");
CREATE INDEX IF NOT EXISTS "SeguimientoConsulta_storeId_visitaEl_idx" ON "SeguimientoConsulta"("storeId", "visitaEl");

DO $$ BEGIN
  ALTER TABLE "SeguimientoConsulta" ADD CONSTRAINT "SeguimientoConsulta_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
