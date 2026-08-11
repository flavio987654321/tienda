-- La cuarta política: privacidad.
--
-- Las dos páginas legales de la plataforma le dicen al dueño que es el único
-- responsable de informar el uso de Analytics/Pixel "en tu política de
-- privacidad" (/terminos §5 bis, /privacidad §4), pero el panel solo tenía tres
-- campos: devoluciones, envíos y términos. Le exigíamos un documento que no
-- tenía dónde escribir.
--
-- `policyPrivacyActive` arranca en true igual que las otras tres: la bandera
-- dice "mostrala si existe", y como el texto arranca en NULL, nada cambia en
-- las tiendas que ya están publicadas.
ALTER TABLE "Store" ADD COLUMN "policyPrivacy" TEXT;
ALTER TABLE "Store" ADD COLUMN "policyPrivacyActive" BOOLEAN NOT NULL DEFAULT true;

-- Cuándo se editó por última vez cualquiera de las cuatro. Queda NULL para las
-- que ya existen: no sabemos cuándo se escribieron, y poner la fecha de hoy
-- sería afirmar algo falso en un dato que existe justamente para un reclamo.
ALTER TABLE "Store" ADD COLUMN "policiesUpdatedAt" TIMESTAMP(3);
