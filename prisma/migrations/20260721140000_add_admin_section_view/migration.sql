-- CreateTable: marca cuándo el admin abrió por última vez cada sección del panel
-- que recibe cosas. El badge de "nuevo" del sidebar cuenta lo que entró después
-- de seenAt. Aditivo, sin FK, no toca nada existente.
CREATE TABLE IF NOT EXISTS "AdminSectionView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSectionView_pkey" PRIMARY KEY ("id")
);

-- Un registro por admin y por sección: el POST de "marcar visto" hace upsert
-- sobre esta clave.
CREATE UNIQUE INDEX IF NOT EXISTS "AdminSectionView_userId_section_key" ON "AdminSectionView"("userId", "section");
