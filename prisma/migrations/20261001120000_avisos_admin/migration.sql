-- Los avisos del admin: el cartel que se muestra arriba del inicio de los
-- paneles (tiendas, afiliados, digitales). Es UNA fila por aviso, no una por
-- usuario, y aparte se anota quien lo vio, lo cerro o toco el boton.
-- Ver "lib/avisos-admin".
--
-- Dos tablas nuevas: no toca ninguna fila de las que ya existen. Idempotente.
CREATE TABLE IF NOT EXISTS "AvisoAdmin" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "botonTexto" TEXT,
    "botonLink" TEXT,
    "roles" TEXT[],
    "soloNuevosDias" INTEGER,
    "condicion" TEXT,
    "paraUserId" TEXT,
    "tono" TEXT NOT NULL DEFAULT 'verde',
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvisoAdmin_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AvisoAdmin_activo_idx" ON "AvisoAdmin"("activo");
CREATE INDEX IF NOT EXISTS "AvisoAdmin_paraUserId_idx" ON "AvisoAdmin"("paraUserId");

CREATE TABLE IF NOT EXISTS "AvisoAdminVisto" (
    "avisoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vistoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoAt" TIMESTAMP(3),
    "clickAt" TIMESTAMP(3),
    "voto" INTEGER,
    CONSTRAINT "AvisoAdminVisto_pkey" PRIMARY KEY ("avisoId","userId")
);
CREATE INDEX IF NOT EXISTS "AvisoAdminVisto_userId_idx" ON "AvisoAdminVisto"("userId");

DO $$ BEGIN
  ALTER TABLE "AvisoAdminVisto" ADD CONSTRAINT "AvisoAdminVisto_avisoId_fkey"
    FOREIGN KEY ("avisoId") REFERENCES "AvisoAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AvisoAdminVisto" ADD CONSTRAINT "AvisoAdminVisto_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AvisoAdmin" ADD CONSTRAINT "AvisoAdmin_paraUserId_fkey"
    FOREIGN KEY ("paraUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
