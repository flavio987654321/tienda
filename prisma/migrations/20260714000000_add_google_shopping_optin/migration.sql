-- Opt-in del dueño de tienda para publicar sus productos en el feed central
-- de Google Shopping (Merchant Center de la plataforma). Aditivo y nullable:
-- las tiendas existentes quedan sin publicar hasta que instalen la app.
ALTER TABLE "Store" ADD COLUMN "gsEnabledAt" TIMESTAMP(3);
