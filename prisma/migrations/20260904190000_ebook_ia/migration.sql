-- El ebook que la IA está escribiendo, o ya escribió, para un producto.
--
-- ── Por qué hace falta una tabla ───────────────────────────────────────────
--
-- Porque un ebook no entra en un pedido. Una función de este plan de Vercel
-- tiene 60 segundos y se corta; un ebook de verdad son diez capítulos y varios
-- minutos de escritura. Así que se escribe DE A UN CAPÍTULO POR PEDIDO, y
-- entre pedido y pedido lo ya escrito tiene que estar guardado.
--
-- Y guardado en la base, no en la memoria del navegador: si alguien cierra la
-- pestaña en el capítulo 7, lo que ya se pagó no se puede perder.
--
-- ── Uno por producto ───────────────────────────────────────────────────────
--
-- Rehacerlo pisa el mismo borrador. Por eso el contador de reintentos
-- sobrevive a la regeneración: si cada intento creara una fila nueva, el
-- "un reintento incluido" sería infinito.
--
-- ADITIVA: una tabla nueva. Nada de lo que ya existe cambia de forma ni de
-- significado. Idempotente (IF NOT EXISTS) para poder correrla dos veces.

CREATE TABLE IF NOT EXISTS "EbookIA" (
    "id"              TEXT NOT NULL,
    "productId"       TEXT NOT NULL,
    -- Se guarda además del producto porque el producto se puede borrar, y la
    -- devolución del cupo no puede depender de eso.
    "userId"          TEXT NOT NULL,
    -- INDICE | ESCRIBIENDO | ARMANDO | LISTO | FALLADO.
    "estado"          TEXT NOT NULL,
    -- Lo que escribió la persona, tal cual. Guardado para poder reintentar sin
    -- volver a pedírselo.
    "tema"            TEXT NOT NULL,
    "publico"         TEXT,
    "titulo"          TEXT NOT NULL,
    -- JSON, igual que "Product"."paginaVenta": la forma la declara el código.
    -- "indice" son los capítulos planeados; "capitulos", los ya escritos.
    "indice"          TEXT NOT NULL,
    "capitulos"       TEXT NOT NULL,
    -- "mes" o "bienvenida": de qué bolsa del cupo salió.
    "bolsa"           TEXT,
    -- El reintento incluido: rehacerlo una vez no gasta cupo.
    "reintentos"      INTEGER NOT NULL DEFAULT 0,
    -- ⚠️ EL CANDADO. Dos pedidos a la vez escribirían dos veces el mismo
    -- capítulo, y lo cobrarían dos veces. Vence solo, así que un pedido que
    -- murió a mitad de camino no deja el ebook trabado para siempre.
    "trabajandoDesde" TIMESTAMP(3),
    "error"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookIA_pkey" PRIMARY KEY ("id")
);

-- UN EBOOK POR PRODUCTO, garantizado por la base. Sin esto, dos clics seguidos
-- en "escribirlo con IA" crean dos borradores y cobran dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS "EbookIA_productId_key"
    ON "EbookIA"("productId");

-- La pantalla de productos pide todos los ebooks de la cuenta de una.
CREATE INDEX IF NOT EXISTS "EbookIA_userId_idx"
    ON "EbookIA"("userId");

-- Las claves foráneas van aparte porque ADD CONSTRAINT no acepta IF NOT EXISTS:
-- correr la migración dos veces tiraría error. Así la segunda vez no hace nada.
--
-- CASCADE en las dos: el borrador es de ese producto y de esa cuenta, y no
-- significa nada sin ellos.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EbookIA_productId_fkey'
    ) THEN
        ALTER TABLE "EbookIA"
            ADD CONSTRAINT "EbookIA_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EbookIA_userId_fkey'
    ) THEN
        ALTER TABLE "EbookIA"
            ADD CONSTRAINT "EbookIA_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
