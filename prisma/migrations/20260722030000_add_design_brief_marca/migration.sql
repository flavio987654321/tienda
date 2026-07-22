-- Cinco datos mas que definen la anatomia de la plantilla: nombre de la tienda,
-- que vende exactamente, si tiene fotos propias, que tan grande es el catalogo
-- y si tiene logo.
--
-- Todas nullable: los briefs que ya entraron no las tienen y no se les puede
-- inventar un valor.
--
-- ADD COLUMN IF NOT EXISTS en cada una, igual que en la migracion anterior: es
-- idempotente y no depende de que la tabla tenga exactamente la forma esperada.
-- Ojo con el CREATE TABLE IF NOT EXISTS, que fue el que nos mordio: ese no
-- corrige la forma, solo saltea. ADD COLUMN si la corrige.
ALTER TABLE "DesignBrief" ADD COLUMN IF NOT EXISTS "nombreTienda" TEXT;
ALTER TABLE "DesignBrief" ADD COLUMN IF NOT EXISTS "queVende" TEXT;
ALTER TABLE "DesignBrief" ADD COLUMN IF NOT EXISTS "fotos" TEXT;
ALTER TABLE "DesignBrief" ADD COLUMN IF NOT EXISTS "catalogo" TEXT;
ALTER TABLE "DesignBrief" ADD COLUMN IF NOT EXISTS "logo" TEXT;
