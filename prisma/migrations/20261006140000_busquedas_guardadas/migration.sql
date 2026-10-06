-- "Avisame si entra" (06/10/26): búsquedas que dejan los compradores en una
-- tienda de autos, para avisarles cuando entra un vehículo que coincide.
-- Ver "lib/busquedas".
--
-- Una tabla nueva: no toca ninguna fila ni columna de las que ya existen.
-- Idempotente.
CREATE TABLE IF NOT EXISTS "BusquedaGuardada" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "categoria" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "anioDesde" INTEGER,
    "precioHasta" DOUBLE PRECISION,
    "comentario" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVA',
    "notificadoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avisadoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusquedaGuardada_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BusquedaGuardada_storeId_status_idx" ON "BusquedaGuardada"("storeId", "status");

DO $$ BEGIN
  ALTER TABLE "BusquedaGuardada" ADD CONSTRAINT "BusquedaGuardada_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
