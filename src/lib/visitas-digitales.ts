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

/** Desde qué pantalla. Lo decide el servidor con el hecho que manda el cliente. */
export const DISPOSITIVOS = ["movil", "escritorio"] as const;
export type Dispositivo = (typeof DISPOSITIVOS)[number];

/** El prefijo de las claves de dedup en el navegador. */
const PREFIJO = "dv_";
/** Dónde queda anotado de dónde vino, para que el checkout lo mande con la orden. */
const CLAVE_ORIGEN = "dv_origen_";

/** Lo que la página de venta anota al entrar y el checkout manda al comprar.
    Los tres utm de la campaña viajan crudos, como el resto: los limpia el
    servidor con `utm-digital`. */
export type OrigenCrudo = {
  referente: string;
  utmSource: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

/** Las cuatro etiquetas de la URL de ahora, crudas y como texto. */
function utmDeLaUrl(): { utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string } {
  const q = new URLSearchParams(window.location.search);
  const leer = (k: string) => q.get(k) || "";
  return { utmSource: leer("utm_source"), utmMedium: leer("utm_medium"), utmCampaign: leer("utm_campaign"), utmContent: leer("utm_content") };
}

/**
 * De dónde vino esta visita, tal como lo anotó la página de venta. `null` si
 * entró derecho al checkout o el almacenamiento está bloqueado. Lo lee el
 * checkout para mandarlo con la orden; el servidor lo clasifica.
 *
 * Se guarda al ENTRAR y no al comprar porque al comprar ya no hay referente:
 * el checkout se abre desde nuestra propia página. Y se pisa en cada entrada:
 * si vino por Instagram el lunes y volvió por WhatsApp el jueves y compró, la
 * venta es del jueves. Es la regla simple; la de "primer contacto" pide
 * guardar más y decidir cuánto dura, y no vale lo que cuesta acá.
 */
export function origenAnotado(productId: string): OrigenCrudo | null {
  try {
    const crudo = localStorage.getItem(`${CLAVE_ORIGEN}${productId}`);
    if (!crudo) return null;
    const o = JSON.parse(crudo) as Partial<OrigenCrudo>;
    const texto = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      referente: texto(o.referente),
      utmSource: texto(o.utmSource),
      utmMedium: texto(o.utmMedium),
      utmCampaign: texto(o.utmCampaign),
      utmContent: texto(o.utmContent),
    };
  } catch {
    return null;
  }
}

/**
 * ¿Es un teléfono? Se mira el puntero y no el ancho: una ventana angosta en
 * una computadora sigue siendo una computadora, y un teléfono apaisado sigue
 * siendo un teléfono. Es el hecho que se manda; la etiqueta la pone el servidor.
 */
function esMovil(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

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
  let utm = { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "" };
  if (paso === "pagina") {
    try {
      referente = document.referrer || "";
      utm = utmDeLaUrl();
    } catch {
      /* Si esto falla la visita se cuenta igual y queda sin origen. El total es
         lo que no se puede perder. */
    }
  }

  fetch(`/api/digitales/visita/${productId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paso, referente, ...utm, movil: esMovil() }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Anota de dónde vino, para la orden. Va APARTE del ping y ANTES del dedup:
 * la visita se cuenta una vez por día, pero el origen tiene que quedar
 * anotado en cada entrada, o la segunda visita del día compraría con el
 * origen de la primera. Sólo se guarda cuando hay algo que decir —un
 * referente o un utm—: una entrada directa no borra lo que anotó la anterior,
 * porque "directo" casi siempre es "volvió escribiendo la dirección" después
 * de haber llegado por algún lado.
 */
export function anotarOrigen(productId: string): void {
  if (typeof window === "undefined") return;
  try {
    let referente = document.referrer || "";
    const utm = utmDeLaUrl();
    /* Un referente nuestro —volvió del checkout, o de la página de gracias—
       no es un origen. El utm sí, venga de donde venga. */
    try {
      if (referente && new URL(referente).host === window.location.host) referente = "";
    } catch { /* un referente que no es URL se manda igual; el servidor lo descarta */ }
    if (!referente && !utm.utmSource) return;
    localStorage.setItem(`${CLAVE_ORIGEN}${productId}`, JSON.stringify({ referente, ...utm } satisfies OrigenCrudo));
  } catch {
    /* Sin almacenamiento la venta queda sin origen. */
  }
}
