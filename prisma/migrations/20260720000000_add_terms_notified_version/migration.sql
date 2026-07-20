-- Última versión de los Términos por la que se le mandó el aviso por email al
-- usuario. Va separada de "termsVersion" (que es la que ACEPTÓ) porque son dos
-- momentos distintos: se le avisa, y días después entra y acepta. Sin esta
-- columna el cron le volvería a escribir todos los días hasta que aceptara.
--
-- Aditiva y nullable: no toca ninguna fila existente ni rompe el código que ya
-- está online. Los usuarios actuales quedan en NULL, o sea "nunca avisado", que
-- es exactamente la verdad.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsNotifiedVersion" TEXT;
