-- Preferencia de afiliada: recibir alertas cuando se publique una nueva tienda
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyNewStores" BOOLEAN NOT NULL DEFAULT false;
