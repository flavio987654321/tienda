-- Cuántas generaciones de IA le quedan a una cuenta digital.
--
-- ── Por qué hace falta la base y no alcanza Redis ──────────────────────────
--
-- Los topes de ráfaga viven en Redis con una ventana, y está bien: son
-- anti-script y se tienen que olvidar solos. Esto es otra cosa — es un CUPO:
-- "3 en el plan gratis, en toda la vida de la cuenta". Un contador que se
-- olvida cuando pasa la ventana regala el cupo entero de nuevo cada rato.
--
-- ── Son dos bolsas, y la diferencia es que una se vence ────────────────────
--
--   bienvenidaUsadas — se dan una vez al empezar y NO vencen nunca.
--   mesUsadas        — se renuevan el 1° y NO se acumulan.
--
-- Se gasta primero la del mes, porque es la que se pierde si no se usa.
--
-- ── Por qué el mes es texto y no hay ningún cron ───────────────────────────
--
-- `mesClave` guarda "2026-09". Cuando llega un pedido y la clave no es la del
-- mes actual, el contador se pone en cero EN ESE MOMENTO. Así el reinicio no
-- depende de que un proceso nocturno corra — y en este plan de Vercel el cron
-- es uno solo por día.
--
-- ADITIVA: una tabla nueva. Nada de lo que ya existe cambia de forma ni de
-- significado. Idempotente (IF NOT EXISTS) para poder correrla dos veces.

CREATE TABLE IF NOT EXISTS "CupoIA" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    -- EMBUDO (armar las tres fichas) o EBOOK (escribir el PDF).
    "concepto"         TEXT NOT NULL,
    "bienvenidaUsadas" INTEGER NOT NULL DEFAULT 0,
    "mesUsadas"        INTEGER NOT NULL DEFAULT 0,
    -- "2026-09", o NULL si todavía no gastó ninguna del mes.
    "mesClave"         TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CupoIA_pkey" PRIMARY KEY ("id")
);

-- ⚠️ UNA FILA POR CUENTA Y CONCEPTO, y lo garantiza la base.
--
-- Leer "¿ya existe?" antes de crear no alcanza: dos pedidos en paralelo leen
-- los dos "todavía no" y crean los dos, y ahí la cuenta pasa a tener dos filas
-- de cupo — o sea el doble de generaciones, sin que nadie se entere. Con la
-- restricción acá, un `upsert` resuelve la carrera sin transacción.
CREATE UNIQUE INDEX IF NOT EXISTS "CupoIA_userId_concepto_key"
    ON "CupoIA"("userId", "concepto");

-- La clave foránea va aparte porque ADD CONSTRAINT no acepta IF NOT EXISTS:
-- correr la migración dos veces tiraría error. Así la segunda vez no hace nada.
--
-- CASCADE: el cupo es de esa cuenta y no significa nada sin ella.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CupoIA_userId_fkey'
    ) THEN
        ALTER TABLE "CupoIA"
            ADD CONSTRAINT "CupoIA_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
