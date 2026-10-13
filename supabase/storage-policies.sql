-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- ⚠️ Este archivo CREABA cuatro permisos sobre el depósito `tienda-imagenes`
-- (subir, reemplazar, borrar y listar) y ahora los QUITA. No los vuelvas a crear.
--
-- Existían para que el panel de Diseño subiera directo del navegador a Supabase.
-- Pero no miraban de quién era cada archivo: cualquier cuenta —y el registro está
-- abierto— podía subir archivos de cualquier tipo y tamaño sin límite, reemplazar
-- o borrar los banners y flyers de cualquier otra tienda, y cualquiera sin cuenta
-- podía listar todo el depósito.
--
-- Desde octubre de 2026 el panel de Diseño sube por `/api/upload` (sesión, tope
-- por hora, tope de tamaño, revisión del tipo real). Nuestro servidor usa la clave
-- de servicio, que no depende de estos permisos, y las fotos se siguen viendo
-- porque el depósito es público: una URL pública no pasa por estas reglas.

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read images" ON storage.objects;
