/* A dónde va cada rol, decidido en UN solo lugar.
 *
 * Esta cadena —ADMIN al panel de admin, OWNER al dashboard, SELLER al panel de
 * afiliados, y el resto a mi cuenta— estaba escrita a mano en 13 archivos: la
 * home, el nav compartido y los once templates de tienda. Trece copias de la
 * misma decisión.
 *
 * El costo no era teórico. Cada copia además resolvía por su cuenta si había
 * sesión, y todas lo hacían mal del mismo modo (ver `useSesion`). Y la ruta
 * `/panel`, que hace esta misma decisión del lado del servidor, tiene una regla
 * que ninguna de las trece copias tenía: quien es dueño de una tienda va al
 * dashboard AUNQUE su rol no sea OWNER. O sea que el botón del nav y `/panel`
 * mandaban a lugares distintos a la misma persona.
 *
 * Con esto, agregar un rol o mover una ruta es tocar este archivo y nada más.
 */

export type DestinoDePanel = {
  /** A dónde lleva el botón. */
  href: string;
  /** Qué dice el botón. */
  label: string;
};

/**
 * El panel que le corresponde a un rol.
 *
 * `tieneTienda` refleja la regla de `/panel`: si la persona es dueña de una
 * tienda, su lugar es el dashboard aunque el rol todavía no diga OWNER —pasa
 * con cuentas viejas y con las que se crearon antes de tener tienda—. Quien no
 * pueda saberlo (el nav no consulta la base) lo deja en `false` y se comporta
 * como siempre.
 */
export function panelDeRol(
  role: string | null | undefined,
  tieneTienda = false,
): DestinoDePanel {
  if (role === "ADMIN") return { href: "/admin", label: "Admin" };
  if (role === "OWNER" || tieneTienda) return { href: "/dashboard", label: "Mi tienda" };
  if (role === "SELLER") return { href: "/afiliados", label: "Mi panel" };
  return { href: "/mi-cuenta", label: "Mi cuenta" };
}
