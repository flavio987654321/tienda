/* ══════════════════════════════════════════════════════════════════════════
   LAS ETIQUETAS UTM DE UNA VISITA — qué se acepta y qué no
   ══════════════════════════════════════════════════════════════════════════

   Un UTM es lo que se le pega al link cuando se comparte:
   `?utm_source=instagram&utm_medium=pago&utm_campaign=lanzamiento&utm_content=video2`.
   La persona no nota nada; la página lo lee al entrar y anota de dónde vino y
   de qué anuncio. Para el que paga publicidad es LA métrica: "el anuncio
   'video2' trajo 3 ventas y el 'foto' ninguna" es lo que le dice qué apagar.

   `utm_source` ya lo resuelve `origen-visita` con una lista cerrada. Acá van
   los otros tres, y los tres son distintos:

   - `utm_medium` **va a lista cerrada** (`MEDIOS`): pago / orgánico / mail /
     historia / otro. Es parte de una clave y no puede ser texto libre.
   - `utm_campaign` y `utm_content` **son texto del visitante**, y así se
     guardan: no hay lista posible de nombres de campaña. Por eso se limpian
     y se recortan ANTES de entrar, y por eso hay un techo de cuántas
     combinaciones distintas se aceptan por producto y por día. Sin el techo,
     un bot con nombres inventados llena la tabla en una tarde.

   ⚠️ Nada de esto se dibuja como HTML —React lo escapa— pero igual no entra
   basura: caracteres de control afuera, espacios dobles a uno, minúsculas,
   largo acotado. Lo que la dueña ve en su panel es lo que ella misma escribió
   en el link, o lo que Meta le completó.

   Este archivo no importa nada del servidor: lo usan el navegador (para
   anotar) y las rutas (para guardar). */

/** Los medios que se guardan. Cambiar uno rompe el historial ya escrito. */
export const MEDIOS = ["pago", "organico", "mail", "historia", "otro"] as const;
export type Medio = (typeof MEDIOS)[number];

export const NOMBRE_MEDIO: Record<Medio, string> = {
  pago: "Anuncio pago",
  organico: "Orgánico",
  mail: "Mail",
  historia: "Historia",
  otro: "Otro",
};

/**
 * Cómo se llama cada medio en los links de la vida real. Meta pone `paid`
 * o `cpc`; Google Ads `cpc`; Mailchimp `email`; la gente escribe lo que se le
 * ocurre. Se compara ya en minúsculas y sin acentos.
 */
const POR_MEDIO: Record<string, Medio> = {
  pago: "pago", paid: "pago", cpc: "pago", ppc: "pago", ads: "pago", ad: "pago",
  paid_social: "pago", paidsocial: "pago", display: "pago", anuncio: "pago", anuncios: "pago",
  organico: "organico", organic: "organico", social: "organico", post: "organico", posteo: "organico",
  bio: "organico", perfil: "organico", link_bio: "organico", linkbio: "organico",
  mail: "mail", email: "mail", newsletter: "mail", correo: "mail",
  historia: "historia", historias: "historia", story: "historia", stories: "historia", reel: "historia", reels: "historia",
};

/** Cuánto texto se le acepta a una campaña o a un anuncio. */
export const LARGO_UTM = 80;

/**
 * La fila donde caen las que pasaron el techo. Con paréntesis para que no se
 * confunda con un nombre real — y `limpiarUtm` se ocupa de que nadie pueda
 * mandar exactamente esto desde la URL y mezclarse con ella.
 */
export const OTRAS = "(otras)";

/**
 * Cuántas combinaciones distintas de (medio, campaña, anuncio) se aceptan por
 * producto y por día. Una cuenta real con publicidad tiene 3 campañas × 5
 * anuncios = 15. Pasado el techo, todo cae en `OTRAS`: la visita se cuenta,
 * sólo no se distingue el anuncio. Es lo que frena al que manda mil nombres.
 */
export const MAX_CAMPANIAS_POR_DIA = 50;


/** Lo que trae la URL, crudo, tal como lo manda el navegador. */
export type UtmCrudo = { medium?: unknown; campaign?: unknown; content?: unknown };

/** Lo que se guarda. `null` si la visita no traía campaña. */
export type Campania = { medio: Medio; campania: string; anuncio: string };

/**
 * Limpia un texto del visitante: recorta, saca lo que no es texto, junta
 * espacios, minúsculas. Devuelve "" si no queda nada.
 *
 * Se acepta cualquier letra de cualquier idioma, números y la puntuación
 * común de un nombre de campaña (guiones, puntos, barras, paréntesis). Lo
 * demás —`<`, `>`, comillas, llaves, caracteres de control— se saca: no es
 * un nombre de campaña, es alguien probando.
 */
export function limpiarUtm(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const limpio = valor
    .normalize("NFC")
    .slice(0, LARGO_UTM * 2)
    .replace(/[^\p{L}\p{N}\s._\-/|:+()#&%]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, LARGO_UTM);
  /* La fila del techo es nuestra: lo que venga igual desde afuera pierde los
     paréntesis y queda como un nombre más. */
  return limpio === OTRAS ? "otras" : limpio;
}

/** El `utm_medium` a la lista cerrada. Sin medio, o con uno que no está, "otro". */
export function medioDe(valor: unknown): Medio {
  const limpio = limpiarUtm(valor).normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s-]+/g, "_");
  return POR_MEDIO[limpio] ?? "otro";
}

/**
 * La campaña de una visita, o `null` si no traía.
 *
 * Hace falta `utm_campaign` **y** `utm_source`: una campaña sin fuente no es
 * una campaña, es alguien jugando con la URL. El anuncio (`utm_content`) es
 * opcional y queda "" si no vino; el medio cae en "otro" si no vino.
 */
export function campaniaDe(utm: UtmCrudo | null | undefined, utmSource: unknown): Campania | null {
  if (typeof utmSource !== "string" || utmSource.trim() === "") return null;
  const campania = limpiarUtm(utm?.campaign);
  if (!campania) return null;
  return { medio: medioDe(utm?.medium), campania, anuncio: limpiarUtm(utm?.content) };
}

/**
 * ¿Esta combinación entra, o cae en `OTRAS`? Recibe cuántas combinaciones
 * distintas ya hay ese día para ese producto y si ésta es una de ellas. Una
 * que ya existe siempre entra —sumar a una fila que está no agranda nada—;
 * una nueva entra sólo si hay lugar.
 */
export function dondeCae(c: Campania, yaExiste: boolean, distintasHoy: number): Campania {
  if (yaExiste || distintasHoy < MAX_CAMPANIAS_POR_DIA) return c;
  return { medio: c.medio, campania: OTRAS, anuncio: "" };
}

/**
 * El texto para pegar en Meta, en "Parámetros de URL" de cada anuncio. Meta
 * reemplaza `{{campaign.name}}` y `{{ad.name}}` por los nombres reales, así
 * que la persona lo pega una vez y cada anuncio se etiqueta solo.
 */
export const PARAMETROS_PARA_META =
  "utm_source=facebook&utm_medium=pago&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

/** Lo mismo para un link que se arma a mano: Instagram, WhatsApp, un mail. */
export function linkConUtm(base: string, p: { source: string; medium?: Medio; campaign: string; content?: string }): string {
  const q = new URLSearchParams();
  q.set("utm_source", limpiarUtm(p.source) || "otro");
  if (p.medium) q.set("utm_medium", p.medium);
  q.set("utm_campaign", limpiarUtm(p.campaign) || "campania");
  if (p.content) q.set("utm_content", limpiarUtm(p.content));
  return `${base}${base.includes("?") ? "&" : "?"}${q.toString()}`;
}
