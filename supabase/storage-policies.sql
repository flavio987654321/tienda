-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Corrige el error "row-level security policy" al subir imágenes

-- 1. Crear el bucket si no existe (ignorar si ya existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tienda-imagenes', 'tienda-imagenes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Política: cualquier usuario autenticado puede subir imágenes
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tienda-imagenes');

-- 3. Política: lectura pública (para mostrar las imágenes en la tienda)
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tienda-imagenes');

-- 4. Política: el dueño puede actualizar/reemplazar sus imágenes
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tienda-imagenes');

-- 5. Política: el dueño puede eliminar imágenes
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tienda-imagenes');
