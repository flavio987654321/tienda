-- Botón de arrepentimiento (Resolución 424/2020).
--
-- El derecho ya existía y estaba escrito en las políticas de cada tienda y en
-- /terminos: los 10 días corridos del art. 34 de la Ley 24.240. Lo que faltaba
-- era por dónde ejercerlo — hasta acá, escribirle al comercio y esperar.
--
-- La tabla NO guarda una decisión, guarda un pedido: quién quiso dar marcha
-- atrás, cuándo, y con qué número de constancia. Lo que se resuelve se resuelve
-- entre la persona y quien le vendió.
--
-- `storeId` es NULLABLE a propósito: la solicitud puede ser contra una tienda o
-- contra TiendaApps, que también vende (las suscripciones) y por lo tanto
-- también necesita el botón. Sin eso haría falta una segunda tabla idéntica.
--
-- Idempotente (IF NOT EXISTS) para poder correrla dos veces sin romper nada.

CREATE TABLE IF NOT EXISTS "Arrepentimiento" (
    "id"         TEXT NOT NULL,
    "numero"     TEXT NOT NULL,
    "storeId"    TEXT,
    "nombre"     TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "telefono"   TEXT,
    "referencia" TEXT NOT NULL,
    "motivo"     TEXT,
    "estado"     TEXT NOT NULL DEFAULT 'RECIBIDO',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arrepentimiento_pkey" PRIMARY KEY ("id")
);

-- Único: el número es lo que la persona va a leer para reclamar. Dos solicitudes
-- con el mismo número harían que la constancia no identifique nada. Lo garantiza
-- la base y no un "¿ya existe?" antes de insertar, que con dos pedidos en
-- paralelo lee los dos "todavía no" y crea los dos.
CREATE UNIQUE INDEX IF NOT EXISTS "Arrepentimiento_numero_key"
    ON "Arrepentimiento"("numero");

CREATE INDEX IF NOT EXISTS "Arrepentimiento_storeId_createdAt_idx"
    ON "Arrepentimiento"("storeId", "createdAt" DESC);

-- La clave foránea va en un bloque aparte porque, a diferencia de las de arriba,
-- ADD CONSTRAINT no acepta IF NOT EXISTS: correr la migración dos veces tiraría
-- error. Así la segunda vez no hace nada.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Arrepentimiento_storeId_fkey'
    ) THEN
        ALTER TABLE "Arrepentimiento"
            ADD CONSTRAINT "Arrepentimiento_storeId_fkey"
            FOREIGN KEY ("storeId") REFERENCES "Store"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
