-- CreateTable
CREATE TABLE "StoreArchive" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT NOT NULL,
    "tipoTiendaAnterior" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "totalFacturado" DOUBLE PRECISION NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "StoreArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreArchive_storeId_idx" ON "StoreArchive"("storeId");

-- AddForeignKey
ALTER TABLE "StoreArchive" ADD CONSTRAINT "StoreArchive_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
