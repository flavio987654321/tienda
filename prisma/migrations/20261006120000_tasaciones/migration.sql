-- Los pedidos de tasación de un usado (06/10/26): desde la tienda de autos,
-- alguien carga el auto que quiere entregar en parte de pago (o vender) y la
-- concesionaria le responde con una oferta desde el panel. Ver "lib/tasaciones".
--
-- Una tabla nueva: no toca ninguna fila de las que ya existen. Idempotente.
CREATE TABLE IF NOT EXISTS "Tasacion" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "version" TEXT,
    "anio" INTEGER NOT NULL,
    "km" INTEGER NOT NULL,
    "combustible" TEXT,
    "transmision" TEXT,
    "estado" TEXT,
    "comentario" TEXT,
    "modalidad" TEXT NOT NULL DEFAULT 'PERMUTA',
    "productoId" TEXT,
    "productoNombre" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "ofertaMonto" DOUBLE PRECISION,
    "ofertaNota" TEXT,
    "ofertadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tasacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Tasacion_storeId_createdAt_idx" ON "Tasacion"("storeId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Tasacion_storeId_status_idx" ON "Tasacion"("storeId", "status");

DO $$ BEGIN
  ALTER TABLE "Tasacion" ADD CONSTRAINT "Tasacion_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
