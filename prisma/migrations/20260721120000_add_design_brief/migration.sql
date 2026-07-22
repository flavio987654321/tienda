-- CreateTable: ideas de diseño mandadas desde /diseno-propio. Aditivo: tabla
-- nueva, sin FK y sin tocar nada existente. No se relaciona con Store ni con
-- User porque el formulario es público y sin registro — la mayoría de los briefs
-- llegan de gente que todavía no tiene cuenta.
CREATE TABLE IF NOT EXISTS "DesignBrief" (
    "id" TEXT NOT NULL,
    "tipoTienda" TEXT NOT NULL,
    "estetica" TEXT NOT NULL,
    "paleta" TEXT NOT NULL,
    "coloresPropios" TEXT,
    "referencias" TEXT,
    "noQuiero" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "tieneTienda" BOOLEAN NOT NULL DEFAULT false,
    "tiendaUrl" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedIp" TEXT,
    "acceptedVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignBrief_pkey" PRIMARY KEY ("id")
);

-- Para la bandeja: lo nuevo primero.
CREATE INDEX IF NOT EXISTS "DesignBrief_status_createdAt_idx" ON "DesignBrief"("status", "createdAt" DESC);

-- Para agrupar por patrón (rubro + estética) y ver qué se repite más, que es
-- lo que decide qué plantilla se construye primero.
CREATE INDEX IF NOT EXISTS "DesignBrief_tipoTienda_estetica_idx" ON "DesignBrief"("tipoTienda", "estetica");
