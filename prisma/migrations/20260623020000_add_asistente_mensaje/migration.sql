-- CreateTable
CREATE TABLE "AsistenteMensaje" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsistenteMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsistenteMensaje_userId_day_idx" ON "AsistenteMensaje"("userId", "day");

-- AddForeignKey
ALTER TABLE "AsistenteMensaje" ADD CONSTRAINT "AsistenteMensaje_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
