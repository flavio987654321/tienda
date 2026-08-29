-- Permisos de descarga de los productos digitales.
--
-- ── Qué agrega ───────────────────────────────────────────────────────────────
-- Una tabla nueva. No toca ninguna existente salvo por la clave foránea a
-- `OrderItem`, así que no reescribe filas ni necesita ventana de mantenimiento.
--
-- ── Por qué una fila por línea comprada y no por producto ────────────────────
-- Dos personas que compran el mismo PDF necesitan cada una su propio token, su
-- propio vencimiento y su propia cuenta de descargas. Colgarlo del producto
-- daría un permiso compartido: agotar el tope de uno se lo agotaría al otro.
--
-- ── Por qué el token no es la dirección del archivo ──────────────────────────
-- El token es una llave que se canjea en /api/descargas/[token]. Esa ruta mira
-- vencimiento y tope, y recién entonces le pide a Supabase un link firmado que
-- dura dos minutos. Así:
--
--     el mail nunca lleva una dirección que sirva por sí sola
--     el permiso se puede vencer o agotar sin mover el archivo de lugar
--     queda registrado quién bajó y cuántas veces
--
-- El token se genera con randomUUID (no Math.random): es lo ÚNICO que separa a
-- un comprador del archivo, y el generador de JS es predecible a partir de unas
-- pocas salidas del mismo proceso.
--
-- ── Los tres índices ─────────────────────────────────────────────────────────
-- `token` es único porque se busca por él en cada descarga. `orderItemId` es
-- único porque es la regla del modelo —un permiso por línea— y porque es lo que
-- hace que dos webhooks simultáneos no emitan dos permisos. `expiresAt` para que
-- la limpieza diaria de vencidos no lea la tabla entera.

CREATE TABLE IF NOT EXISTS "DigitalDownload" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "descargas" INTEGER NOT NULL DEFAULT 0,
    "maxDescargas" INTEGER NOT NULL DEFAULT 5,
    "ultimaDescarga" TIMESTAMP(3),
    "orderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalDownload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalDownload_token_key" ON "DigitalDownload"("token");
-- ÚNICO, no un índice común: un permiso por línea comprada, garantizado por la
-- base. Leer "¿ya existe?" antes de crear no alcanza — dos avisos de Mercado
-- Pago en paralelo leen los dos "todavía no" y crean los dos, dejando dos
-- tokens vivos y un tope de 10 descargas donde debía haber 5. Con esta
-- restricción, el upsert de lib/descargas resuelve la carrera sin transacción.
CREATE UNIQUE INDEX IF NOT EXISTS "DigitalDownload_orderItemId_key" ON "DigitalDownload"("orderItemId");
CREATE INDEX IF NOT EXISTS "DigitalDownload_expiresAt_idx" ON "DigitalDownload"("expiresAt");

-- La FK va en un bloque idempotente por si la migración se corre dos veces:
-- ADD CONSTRAINT no acepta IF NOT EXISTS. Mismo patrón que la de promociones.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DigitalDownload_orderItemId_fkey'
  ) THEN
    ALTER TABLE "DigitalDownload"
      ADD CONSTRAINT "DigitalDownload_orderItemId_fkey"
      FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
