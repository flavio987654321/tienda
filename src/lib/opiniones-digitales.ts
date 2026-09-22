/* ══════════════════════════════════════════════════════════════════════════
   OPINIONES VERIFICADAS
   ══════════════════════════════════════════════════════════════════════════

   Una opinión que sólo puede escribir quien pagó. La página de venta tiene
   una sección de opiniones que nace apagada y avisa "sólo las que te hayan
   dicho de verdad"; la competencia la llena con tres personas inventadas y
   la dibuja como captura de WhatsApp. Esto es lo contrario:

   - El link para opinar va FIRMADO con la compra (`opinion-firma`): sin una
     orden cobrada de ese producto no hay link, y con el link de otro no se
     puede opinar por él. Una por compra (`orderId` único).
   - Nace PENDIENTE y la vendedora decide: PUBLICADA (se ve en su página con
     la marca "compra verificada") u OCULTA. No se edita: lo que se publica
     es lo que la persona escribió, palabra por palabra. Quien quiera
     "mejorarla" que la esconda.
   - Sin estrellas ni foto: una inicial y el texto, como la sección manual.
     Un puntaje es un número que nadie puede verificar en pantalla.

   Puro: sin base ni React. La firma en `opinion-firma`; lo que toca la base
   en las rutas. Probado en `opiniones-digitales.check.ts`. */

export const OPINION_MIN = 20;
export const OPINION_MAX = 600;
export const NOMBRE_OPINION_MAX = 40;
/** Cuántas verificadas publicadas se dibujan en la página. Más que eso se vuelve una lista. */
export const MAX_OPINIONES_EN_PAGINA = 6;

export const ESTADOS_DE_OPINION = ["PENDIENTE", "PUBLICADA", "OCULTA"] as const;
export type EstadoDeOpinion = (typeof ESTADOS_DE_OPINION)[number];
export const esEstadoDeOpinion = (v: unknown): v is EstadoDeOpinion => typeof v === "string" && (ESTADOS_DE_OPINION as readonly string[]).includes(v);

/**
 * Lo que manda el formulario público, revisado. La misma función corre en
 * la pantalla (para avisar antes) y en la ruta (para decidir).
 */
export function validarOpinion(body: unknown, nombreSugerido: string | null): { ok: true; datos: { nombre: string; texto: string } } | { ok: false; problema: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const texto = typeof b.texto === "string" ? b.texto.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim() : "";
  const nombreCrudo = typeof b.nombre === "string" ? b.nombre.replace(/\s+/g, " ").trim() : "";
  const nombre = (nombreCrudo || nombrePublico(nombreSugerido)).slice(0, NOMBRE_OPINION_MAX);

  if (texto.length < OPINION_MIN) return { ok: false, problema: "Contá un poco más: dos o tres líneas alcanzan." };
  if (texto.length > OPINION_MAX) return { ok: false, problema: `La opinión va hasta ${OPINION_MAX} letras.` };
  /* Un link adentro de una opinión es publicidad de otro, no una opinión. */
  if (/https?:\/\/|www\./i.test(texto)) return { ok: false, problema: "Sin links, por favor: contá tu experiencia con tus palabras." };
  if (nombre.length < 1) return { ok: false, problema: "Escribí cómo querés aparecer (un nombre, o tus iniciales)." };
  return { ok: true, datos: { nombre, texto } };
}

/** Cómo aparece por defecto: el nombre de pila. "Ana" de "Ana María Pérez"; "" si no dejó nombre. */
export function nombrePublico(nombre: string | null | undefined): string {
  return (nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

/** La dirección pública para opinar, sobre la base del sitio. */
export function urlParaOpinar(base: string, productId: string, token: string): string {
  return `${base.replace(/\/$/, "")}/p/${encodeURIComponent(productId)}/opinar?t=${encodeURIComponent(token)}`;
}

/** El mail que se le manda a mano desde Tus clientes, con el link adentro. */
export function mensajeParaPedirOpinion(v: { nombre: string | null; producto: string; enlace: string }): { asunto: string; cuerpo: string } {
  const pila = nombrePublico(v.nombre);
  const hola = pila ? `Hola ${pila},` : "Hola,";
  return {
    asunto: `¿Cómo te fue con ${v.producto}?`,
    cuerpo: `${hola}\n\nHace un tiempo compraste «${v.producto}» y quería saber cómo te fue: qué te sirvió, qué te quedó picando.\n\nSi te dan ganas de dejarlo escrito para los que vienen, es un minuto y me ayuda un montón:\n${v.enlace}\n\nSólo vos podés escribir ahí: el link es de tu compra. Y si preferís, contestame este mail.\n\n¡Gracias!`,
  };
}

/* ── Lo que se dibuja ───────────────────────────────────────────────────── */

export type OpinionPublicada = { nombre: string; texto: string; fecha: string };

/**
 * Cómo se une lo verificado con lo escrito a mano en la sección de la
 * página: primero las verificadas (traen la marca), después las manuales.
 * Y si la sección está apagada pero hay verificadas publicadas, se dibuja
 * igual: la vendedora las publicó una por una, eso es prenderla.
 */
export function unirOpiniones(verificadas: OpinionPublicada[], manuales: { nombre?: string; texto?: string }[]): { nombre: string; texto: string; verificada: boolean }[] {
  return [
    ...verificadas.slice(0, MAX_OPINIONES_EN_PAGINA).map((o) => ({ nombre: o.nombre, texto: o.texto, verificada: true })),
    ...manuales.filter((m) => m.texto).map((m) => ({ nombre: m.nombre ?? "", texto: m.texto ?? "", verificada: false })),
  ];
}
