-- El registro de los mails de entrega de una venta digital.
--
-- ── El agujero ─────────────────────────────────────────────────────────────
--
-- El mail de entrega sale con `despues`, fuera de la respuesta al aviso de
-- Mercado Pago. Si Resend se cae, `despues` se traga el error en un
-- `console.error` que nadie lee. Resultado: la venta figura COBRADA, quien
-- compró no recibió nada, y no queda un solo rastro en la base. Quien vende se
-- entera cuando le reclaman — o no se entera nunca.
--
-- Esta tabla es ese rastro, y anota los dos caminos por los que sale el mail:
-- el automático del cobro y el botón de reenviar. Los FALLOS se anotan igual
-- que los éxitos; son el motivo serio por el que la tabla existe.
--
-- ── Por qué una tabla y no dos columnas en "Order" ─────────────────────────
--
-- Porque un contador y una "última fecha" pierden el medio. Mismo motivo que
-- DigitalDownloadLog: en un reclamo, "se lo mandamos el 3, el 5 y el 8" es una
-- respuesta; "3 veces, la última el 8" es media.
--
-- ADITIVA: una tabla nueva. Nada de lo que ya existe cambia de forma ni de
-- significado. Idempotente (IF NOT EXISTS) para poder correrla dos veces.

CREATE TABLE IF NOT EXISTS "DigitalEnvioLog" (
    "id"        TEXT NOT NULL,
    "orderId"   TEXT NOT NULL,
    -- ENTREGA (el automático del cobro) o REENVIO (el botón del panel).
    "motivo"    TEXT NOT NULL,
    -- ENVIADO o FALLO.
    "estado"    TEXT NOT NULL,
    -- A qué dirección salió, congelada al momento del envío: si mañana la
    -- persona cambia su correo, el envío viejo tiene que seguir diciendo a
    -- dónde fue de verdad.
    "para"      TEXT,
    -- Qué dijo el error, recortado. Distingue "Resend está caído" de "esa
    -- dirección no existe", que se resuelven de maneras opuestas.
    "error"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalEnvioLog_pkey" PRIMARY KEY ("id")
);

-- Se consulta siempre por venta y de lo más nuevo a lo más viejo.
CREATE INDEX IF NOT EXISTS "DigitalEnvioLog_orderId_createdAt_idx"
    ON "DigitalEnvioLog"("orderId", "createdAt" DESC);

-- La clave foránea va aparte porque ADD CONSTRAINT no acepta IF NOT EXISTS:
-- correr la migración dos veces tiraría error. Así la segunda vez no hace nada.
--
-- CASCADE a propósito: el registro existe para defender ESA venta. Sin la venta
-- no hay nada que defender, y guardar la dirección de correo de alguien más
-- tiempo del que hace falta es guardarla sin motivo.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DigitalEnvioLog_orderId_fkey'
    ) THEN
        ALTER TABLE "DigitalEnvioLog"
            ADD CONSTRAINT "DigitalEnvioLog_orderId_fkey"
            FOREIGN KEY ("orderId") REFERENCES "Order"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
