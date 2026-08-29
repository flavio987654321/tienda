-- Archivo del producto digital (rubro DIGITAL).
--
-- ── Qué agrega ───────────────────────────────────────────────────────────────
-- Tres columnas en `Product`, las tres NULLABLE: un producto físico no tiene
-- ninguna y no hay nada que rellenar. Migración puramente aditiva — no toca
-- filas existentes, no reescribe la tabla, no necesita ventana de mantenimiento.
--
--     archivoPath    la ruta del archivo en el bucket PRIVADO
--     archivoNombre  el nombre original, para mostrarlo en el panel
--     archivoPeso    bytes, para mostrarlo y para controlar el tope
--
-- ── Por qué la ruta y no una URL ─────────────────────────────────────────────
-- `archivoPath` guarda `supabase://<bucket>/<path>`, NO una URL servible. Las
-- fotos de producto viven en un bucket público a propósito (tienen que verse en
-- la tienda sin login), y si el archivo pago se guardara igual, cualquiera con
-- la dirección se lo baja sin comprarlo — sin sesión y para siempre.
--
-- El archivo va a un bucket privado y se lee con un link firmado y de vida
-- corta, que se emite después de verificar quién pregunta. Es el mismo camino
-- que ya usan los documentos de identidad de los afiliados.
--
-- ── Sin índice, a propósito ──────────────────────────────────────────────────
-- No se consulta "todos los productos con archivo": se llega al producto por su
-- id o por su tienda, y de ahí se lee la columna. El índice que importa
-- (`storeId`) ya está.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "archivoPath" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "archivoNombre" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "archivoPeso" INTEGER;
