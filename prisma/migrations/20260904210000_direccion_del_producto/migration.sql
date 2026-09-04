-- La dirección propia de cada producto digital: "mecanica.tiendaapps.com", y el
-- dominio propio del comerciante en el plan Pro.
--
-- ── Por qué cuelga del producto y no de la cuenta ──────────────────────────
--
-- Porque cada producto digital principal es SU PROPIO SITIO. La cuenta no la ve
-- nunca nadie: quien llega desde un anuncio de tortas tiene que ver tortas y
-- nada más, no el catálogo de otros cinco nichos.
--
-- Y el dominio no podía quedarse en "Store"."customDomain": esa columna es
-- @unique, o sea UNO POR CUENTA. Pro tiene cinco productos y cada uno lleva el
-- suyo.
--
-- ── Va en los tres planes, y desde que el producto se crea ─────────────────
--
-- Si el subdominio apareciera recién al mejorar de plan, la dirección
-- CAMBIARÍA. Alguien que pautó dos meses contra su dirección de Free perdería
-- los anuncios corriendo, el historial del píxel y todos los links que
-- compartió. Con el slug desde el día uno, mejorar de plan SUMA un dominio
-- encima y el de abajo sigue funcionando.
--
-- ⚠️ EL ESPACIO DE NOMBRES ES COMPARTIDO CON "Store"."slug": los dos se
-- traducen desde el mismo subdominio de tiendaapps.com. Que un nombre no esté
-- repetido ENTRE LAS DOS TABLAS no lo puede garantizar un índice único —viven
-- en tablas distintas—, así que lo garantiza un candado de Postgres al
-- reservarlo. Ver `lib/direccion-digital`.
--
-- ADITIVA: dos columnas nuevas que aceptan NULL. Nada de lo que ya existe
-- cambia de forma ni de significado, y ninguna fila de las que ya están se
-- toca. Idempotente para poder correrla dos veces.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slugDigital"   TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dominioPropio" TEXT;

-- Únicos, pero aceptando NULL: en Postgres un índice único deja pasar todos los
-- NULL que quieras, y eso es justo lo que hace falta — los productos de tienda,
-- los bonos y los upsells no tienen dirección y son la enorme mayoría de las
-- filas.
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slugDigital_key"
    ON "Product"("slugDigital");

CREATE UNIQUE INDEX IF NOT EXISTS "Product_dominioPropio_key"
    ON "Product"("dominioPropio");
