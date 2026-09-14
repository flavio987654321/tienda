/* ══════════════════════════════════════════════════════════════════════════
   VISITAS A LA PÁGINA DE VENTA DE UN PRODUCTO DIGITAL
   ══════════════════════════════════════════════════════════════════════════

   Lo que se guarda en `DigitalVisita`: cuántos entraron a la página de venta
   y cuántos abrieron el checkout, por producto y por día. La venta no se
   guarda acá —sale de `Order`— y con los tres se arma el embudo: entró →
   quiso pagar → pagó.

   Es el mismo molde que las visitas de tiendas (`StoreShell` + `registrarPaso`)
   y se copian las mismas reglas, porque el embudo divide uno por el otro y
   los dos lados tienen que medir lo mismo:

   - **Una vez por día por navegador**, con el día argentino. Deduplicado en
     el cliente con localStorage; lo que el cliente no puede filtrar —bots,
     origen forjado, el tope por IP— lo filtra el servidor con
     `visitaLegitima`.
   - **No cuenta a la dueña.** Lo decide el servidor, mirando la sesión, y no
     el cliente: la página pública no sabe quién la mira, y averiguarlo en
     cada dibujo sería una consulta a Supabase por visitante.
   - **Falla en silencio.** Es una métrica: jamás le rompe la página ni la
     compra a nadie.

   Este archivo no importa nada del servidor: lo usa el componente que manda
   el ping desde el navegador y también la ruta que lo recibe. */

/** Los dos pasos que se registran. La venta sale de `Order`. */
export const PASOS_DIGITALES = ["pagina", "pagar"] as const;
export type PasoDigital = (typeof PASOS_DIGITALES)[number];

export function esPasoDigital(valor: unknown): valor is PasoDigital {
  return typeof valor === "string" && (PASOS_DIGITALES as readonly string[]).includes(valor);
}

/**
 * Cuántas visitas se le aceptan a una misma IP para el mismo producto por
 * hora. Una persona real dispara UNA por día; 5 deja lugar a una familia o
 * una oficina detrás de la misma IP sin permitir inflar el número a mano.
 */
export const MAX_VISITAS_POR_IP = 5;

/** El prefijo de las claves de dedup en el navegador. */
const PREFIJO = "dv_";

/** El día del calendario argentino, "2026-09-14", con el reloj del visitante. */
function claveDelDia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/**
 * Manda el ping desde el navegador. Se llama en un efecto, una vez por
 * dibujo; el dedup por día está adentro.
 *
 * `referente` y `utm_source` se mandan crudos y los clasifica el servidor: la
 * lista de etiquetas es la que se escribe en la base y no puede depender de lo
 * que decida mandar un cliente que cualquiera puede editar. Sólo van con el
 * paso "pagina": el checkout se abre desde la propia página, así que su
 * referente seríamos siempre nosotros.
 */
export function registrarVisitaDigital(paso: PasoDigital, productId: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  /* Un navegador manejado por un script lo declara acá. El filtro del servidor
     mira el User-Agent, que estos suelen disfrazar; esta bandera es más difícil
     de sacar. */
  if (navigator.webdriver) return;

  const hoy = claveDelDia();
  const clave = `${PREFIJO}${productId}_${paso}_${hoy}`;
  try {
    if (localStorage.getItem(clave)) return;
    localStorage.setItem(clave, "1");
    /* Las claves de días anteriores no sirven para nada y se acumularían para
       siempre en el navegador del visitante. */
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIJO}${productId}_`) && !k.endsWith(`_${hoy}`)) localStorage.removeItem(k);
    }
  } catch {
    /* Modo incógnito con el almacenamiento bloqueado: se cuenta igual, sin
       dedup. Mejor una visita de más que perder la de un comprador real. */
  }

  let referente = "";
  let utmSource = "";
  if (paso === "pagina") {
    try {
      referente = document.referrer || "";
      utmSource = new URLSearchParams(window.location.search).get("utm_source") || "";
    } catch {
      /* Si esto falla la visita se cuenta igual y queda sin origen. El total es
         lo que no se puede perder. */
    }
  }

  fetch(`/api/digitales/visita/${productId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paso, referente, utmSource }),
    keepalive: true,
  }).catch(() => {});
}
