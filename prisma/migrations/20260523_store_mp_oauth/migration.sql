-- Campos para conectar MercadoPago Marketplace por tienda
ALTER TABLE "Store" ADD COLUMN "mpAccessToken"  TEXT;
ALTER TABLE "Store" ADD COLUMN "mpRefreshToken" TEXT;
ALTER TABLE "Store" ADD COLUMN "mpSellerId"     TEXT;
ALTER TABLE "Store" ADD COLUMN "mpConnectedAt"  TIMESTAMP(3);
