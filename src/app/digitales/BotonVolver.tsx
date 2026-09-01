import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * El "volver" de arriba de cada pantalla del panel.
 *
 * ── Por qué existe, si al lado hay un menú ───────────────────────────────────
 * El panel de tiendas se lo sacó a su pantalla de Mi plan, con este argumento:
 * "con el menú al lado no tiene a dónde llevar que no esté a un toque". En
 * escritorio es cierto — la franja de la barra está siempre a la vista.
 *
 * En el celular no. Ahí el menú vive atrás de una hamburguesa, así que volver son
 * dos toques y uno de ellos es abrir algo que no se ve. Y hay un caso peor: el
 * aviso del cron ("volviste a Free") linkea DERECHO a Mi cuenta, o sea que se
 * puede caer en una pantalla de adentro sin haber pasado nunca por el inicio. Sin
 * este botón, esa persona está en un lugar del que no sabe cómo se sale.
 *
 * Es un `<Link>` a una ruta fija y no un `history.back()`: la historia del
 * navegador puede venir de cualquier lado —del mail, de un aviso, de otra
 * pestaña— y "atrás" la sacaría del panel. Este siempre lleva al mismo lugar.
 */
export default function BotonVolver({
  href = "/digitales",
  children = "Volver al inicio",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 mb-4 text-sm font-medium text-gray-500 panel-oscuro:text-gray-400 hover:text-orange-600 transition-colors"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}
