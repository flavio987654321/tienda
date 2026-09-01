-- Configuración de una cuenta de Productos Digitales.
--
-- Las cuatro son NULLABLE y aditivas: no tocan ninguna de las filas que ya
-- existen y no hay nada que rellenar. Una tienda común las deja en NULL para
-- siempre.
--
-- `checkoutName` y `supportEmail` son datos del negocio que hoy no tienen dónde
-- vivir. `iaProducto` e `iaDescripcion` son el NICHO: lo que la IA va a usar
-- como referencia para todo lo que genere.
ALTER TABLE "Store" ADD COLUMN     "checkoutName" TEXT,
ADD COLUMN     "iaDescripcion" TEXT,
ADD COLUMN     "iaProducto" TEXT,
ADD COLUMN     "supportEmail" TEXT;
