-- Verificación en dos pasos para tiendas, productos digitales y afiliados (15/10/26).
-- Los factores (huella y app de códigos) los guarda Supabase en auth.mfa_factors.
-- Acá va lo que Supabase no tiene: los códigos de respaldo, los pedidos de
-- "Perdí mi celular" con su espera, y el historial que la persona ve en
-- Seguridad. Más una columna en User para trabar los datos de cobro después de
-- una recuperación. Ver "lib/seguridad-cuenta".
--
-- Sólo agrega: no toca ninguna fila ni columna existente. Idempotente.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dineroTrabadoHasta" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CodigoRespaldo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "usadoAt" TIMESTAMP(3),
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodigoRespaldo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CodigoRespaldo_huella_key" ON "CodigoRespaldo"("huella");
CREATE INDEX IF NOT EXISTS "CodigoRespaldo_userId_idx" ON "CodigoRespaldo"("userId");

CREATE TABLE IF NOT EXISTS "RecuperacionDosPasos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "huellaConfirmar" TEXT,
    "huellaCancelar" TEXT NOT NULL,
    "conContrasena" BOOLEAN NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadaAt" TIMESTAMP(3),
    "venceAt" TIMESTAMP(3),
    "cerradaAt" TIMESTAMP(3),
    "motivoCierre" TEXT,
    "ultimoAvisoAt" TIMESTAMP(3),
    CONSTRAINT "RecuperacionDosPasos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecuperacionDosPasos_huellaConfirmar_key" ON "RecuperacionDosPasos"("huellaConfirmar");
CREATE UNIQUE INDEX IF NOT EXISTS "RecuperacionDosPasos_huellaCancelar_key" ON "RecuperacionDosPasos"("huellaCancelar");
CREATE INDEX IF NOT EXISTS "RecuperacionDosPasos_userId_estado_idx" ON "RecuperacionDosPasos"("userId", "estado");
CREATE INDEX IF NOT EXISTS "RecuperacionDosPasos_estado_venceAt_idx" ON "RecuperacionDosPasos"("estado", "venceAt");

CREATE TABLE IF NOT EXISTS "EventoCuenta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT,
    "dispositivo" TEXT,
    CONSTRAINT "EventoCuenta_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EventoCuenta_userId_creadoAt_idx" ON "EventoCuenta"("userId", "creadoAt" DESC);
CREATE INDEX IF NOT EXISTS "EventoCuenta_creadoAt_idx" ON "EventoCuenta"("creadoAt");

DO $$ BEGIN
  ALTER TABLE "CodigoRespaldo" ADD CONSTRAINT "CodigoRespaldo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "RecuperacionDosPasos" ADD CONSTRAINT "RecuperacionDosPasos_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EventoCuenta" ADD CONSTRAINT "EventoCuenta_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
