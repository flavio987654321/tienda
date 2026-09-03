-- Dos pruebas que faltaban para poder defender una venta digital.
--
-- 1) EL CONSENTIMIENTO (art. 1116 inc. b del Código Civil y Comercial)
--
--    Un archivo de descarga inmediata está exceptuado del derecho de
--    arrepentimiento, pero la excepción dice "excepto pacto en contrario". Hay
--    que poder mostrar que la persona lo supo ANTES de pagar.
--
--    Se guarda el TEXTO entero y no un `true` ni un número de versión: si
--    mañana se cambia la redacción, una venta vieja tiene que seguir mostrando
--    la que su comprador leyó. Un booleano no prueba nada.
--
-- 2) EL REGISTRO DE DESCARGAS
--
--    El contador de DigitalDownload dice "se bajó 3 veces" y nada más. Ante un
--    contracargo hace falta cuándo y desde dónde, y sobre todo la PRIMERA vez
--    —que es la entrega—, no la última.
--
-- Las dos partes son ADITIVAS: columnas nuevas que quedan en NULL y una tabla
-- nueva. Nada de lo que ya existe cambia de forma ni de significado.
--
-- Idempotente (IF NOT EXISTS) para poder correrla dos veces sin romper nada.

-- ── 1) Consentimiento en la orden ──────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "digitalConsentAt"    TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "digitalConsentIp"    TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "digitalConsentTexto" TEXT;

-- ── 2) Registro de descargas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DigitalDownloadLog" (
    "id"         TEXT NOT NULL,
    "downloadId" TEXT NOT NULL,
    "ip"         TEXT,
    "agente"     TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalDownloadLog_pkey" PRIMARY KEY ("id")
);

-- Se consulta siempre por permiso y de lo más nuevo a lo más viejo.
CREATE INDEX IF NOT EXISTS "DigitalDownloadLog_downloadId_createdAt_idx"
    ON "DigitalDownloadLog"("downloadId", "createdAt" DESC);

-- La clave foránea va aparte porque ADD CONSTRAINT no acepta IF NOT EXISTS:
-- correr la migración dos veces tiraría error. Así la segunda vez no hace nada.
--
-- CASCADE a propósito: el registro existe para defender ESE permiso. Sin el
-- permiso no hay nada que defender, y guardar la IP de alguien más tiempo del
-- que hace falta es guardarla sin motivo.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DigitalDownloadLog_downloadId_fkey'
    ) THEN
        ALTER TABLE "DigitalDownloadLog"
            ADD CONSTRAINT "DigitalDownloadLog_downloadId_fkey"
            FOREIGN KEY ("downloadId") REFERENCES "DigitalDownload"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
