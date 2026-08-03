import { permanentRedirect } from "next/navigation";

/**
 * "Canasta" se llama "Comunidad" desde hace rato. Esta página queda viva para
 * que los links viejos —los que quedaron en un WhatsApp, en un posteo, en el
 * historial de alguien— no terminen en un 404.
 *
 * Va con `permanentRedirect` (308) y no con `redirect` (307): la diferencia no
 * se ve en el navegador pero sí en Google. Un 307 dice "es temporal, seguí
 * pidiendo la dirección vieja", así que Google la deja para siempre en la lista
 * de páginas no indexadas y no le pasa a /comunidad nada de lo que la vieja
 * hubiera ganado. El 308 dice "se mudó", y Google transfiere y se olvida.
 */
export default function CanastaPage() {
  permanentRedirect("/comunidad");
}
