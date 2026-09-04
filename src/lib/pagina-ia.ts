import {
  SECCIONES, buscarSeccion, normalizarContenido,
  type Seccion, type Campo, type PaginaVenta, type SeccionGuardada,
} from "@/lib/pagina-venta";

/**
 * Escribir la página de venta con IA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * HAY SECCIONES QUE LA IA NO PUEDE TOCAR, Y ES LO MÁS IMPORTANTE DE ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No es una decisión de alcance: es la línea entre escribir una página y
 * **fabricar prueba**.
 *
 * | Sección | Por qué queda afuera |
 * |---|---|
 * | **Opiniones** | Serían testimonios inventados de gente que no compró. Es lo primero que alguien captura de pantalla y publica, y además es publicidad engañosa. La sección nace apagada justo por esto. |
 * | **Garantía** | Es una **obligación que se asume**, no un texto de venta. Una IA prendiéndola le crea a quien vende un compromiso de devolución que nadie leyó. Y le gana al art. 1116: la promesa de la página vale más que la excepción del Código. |
 * | **Oferta con fecha** | Es una fecha real. Inventarla es la cuenta regresiva mentirosa de la competencia, que ya se descartó por escrito. |
 * | **Aviso de ventas** | Igual: se llenaría con compras que no pasaron. |
 * | **Precio** | Sale del producto. Copiado acá, el día que se corrige el precio la página sigue mostrando el viejo — y ese número es el que la persona lee antes de pagar. |
 * | **Barra y Pie** | No son texto de venta. El pie además lleva el contacto de quien vende y sus documentos legales. |
 *
 * Lo que sí escribe son las ocho de **copy**: portada, qué te llevás, bonos,
 * beneficios, esto te suena, cómo funciona, preguntas frecuentes y cierre.
 *
 * ── Por qué el esquema se DERIVA del catálogo ──────────────────────────────
 *
 * Porque escrito a mano se desincroniza: alguien agrega un campo a una sección
 * y la IA no lo llena nunca, sin que falle nada. Derivado, un campo nuevo entra
 * solo — y uno que se saca deja de pedirse.
 *
 * Y lo que vuelve pasa por `normalizarContenido`, que es la MISMA puerta por la
 * que pasa lo que escribe una persona en el editor: descarta secciones que no
 * existen, descarta campos que no existen, recorta lo largo y devuelve claves de
 * estilo válidas. Es exactamente para lo que se hizo el catálogo cerrado.
 */

/**
 * Las ocho que la IA escribe.
 *
 * ⚠️ Es una lista blanca, no una lista negra. Con una lista negra, una sección
 * nueva del catálogo entraría sola en lo que la IA puede escribir — y la próxima
 * que se agregue puede ser otra "opiniones".
 */
export const SECCIONES_QUE_ESCRIBE: readonly string[] = [
  "portada", "producto", "bonos", "beneficios", "dolores", "comoFunciona",
  "preguntas", "cierre",
];

/** Los tipos de campo que la IA puede llenar. */
const TIPOS_QUE_ESCRIBE = new Set(["texto", "parrafo", "lista", "icono"]);

/* ⚠️ Una imagen NO: sería una dirección inventada. Una fecha tampoco —es la
   urgencia, que ya está afuera— y un número tampoco: el único es la cantidad de
   días de garantía, que es una obligación que se asume. */

const seccionesQueEscribe = (): Seccion[] =>
  SECCIONES.filter((s) => SECCIONES_QUE_ESCRIBE.includes(s.clave));

/**
 * El esquema de la herramienta, derivado del catálogo.
 *
 * Las descripciones no son documentación: **son el prompt**. Salen de la propia
 * definición del campo —su etiqueta, su ayuda, su ejemplo— así que el día que se
 * mejora la ayuda de un campo en el editor, mejora también lo que la IA entiende.
 */
export function esquemaDeLaPagina(): {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
} {
  const properties: Record<string, unknown> = {};

  for (const s of seccionesQueEscribe()) {
    const campos: Record<string, unknown> = {};
    const obligatorios: string[] = [];

    for (const c of s.campos) {
      if (!TIPOS_QUE_ESCRIBE.has(c.tipo)) continue;
      campos[c.clave] = esquemaDeCampo(c);
      /* Todo lo que se pide se pide entero: un campo opcional que el modelo
         decide no llenar deja un hueco que después hay que ir a buscar a mano. */
      obligatorios.push(c.clave);
    }

    if (Object.keys(campos).length === 0) continue;

    properties[s.clave] = {
      type: "object",
      description: `${s.nombre}: ${s.para}.`,
      properties: campos,
      required: obligatorios,
    };
  }

  return {
    type: "object",
    properties,
    required: Object.keys(properties),
  };
}

function esquemaDeCampo(c: Campo): Record<string, unknown> {
  const dice = [c.etiqueta, c.ayuda, c.ejemplo ? `Por ejemplo: "${c.ejemplo}"` : null]
    .filter(Boolean)
    .join(". ");

  if (c.tipo === "lista") {
    const sub: Record<string, unknown> = {};
    const req: string[] = [];
    for (const h of c.campos ?? []) {
      if (!TIPOS_QUE_ESCRIBE.has(h.tipo)) continue;
      sub[h.clave] = esquemaDeCampo(h);
      req.push(h.clave);
    }
    return {
      type: "array",
      description: `${dice}. Entre 3 y ${c.maxItems ?? 6}.`,
      maxItems: c.maxItems ?? 6,
      items: { type: "object", properties: sub, required: req },
    };
  }

  if (c.tipo === "icono") {
    return {
      type: "string",
      description: `${dice}. UN solo emoji, sin letras ni números.`
        + (c.sugerencias?.length ? ` Por ejemplo: ${c.sugerencias.slice(0, 6).join(" ")}` : ""),
    };
  }

  /* El tope se le DICE al modelo además de recortarse después. Recortado a
     secas, una frase de 200 caracteres en un campo de 90 queda cortada por la
     mitad de una palabra; avisado, la escribe corta. */
  return { type: "string", description: `${dice}. Máximo ${c.largo} caracteres.` };
}

/**
 * Lo que se le dice al modelo.
 *
 * ⚠️ Las prohibiciones van al final, que es donde más pesan cuando el pedido de
 * la persona empuja para el otro lado.
 */
export const INSTRUCCIONES_PAGINA = [
  "Escribís páginas de venta de productos digitales para gente que vende en Argentina.",
  "",
  "Te van a pasar de qué se trata el producto, y tenés que llenar cada sección de la página.",
  "",
  "Cómo escribir:",
  "- Castellano rioplatense, de vos. Como habla alguien en Buenos Aires, no un manual.",
  "- En segunda persona: 'vas a', 'tenés', 'te llevás'.",
  "- Concreto y corto. Cada campo tiene su tope de caracteres y hay que respetarlo:",
  "  un texto que se pasa se corta en la pantalla y queda a la mitad de una palabra.",
  "- Sin lunfardo fuerte ni insultos: esto lo firma con su nombre quien vende.",
  "- Los emojis, UNO por ítem y sin letras adentro.",
  "",
  "⚠️ Lo que NO tenés que hacer, aunque te lo pidan:",
  "- No prometas resultados ('vas a facturar', 'garantizado', 'en 30 días'). Es publicidad",
  "  engañosa y quien responde es quien vende.",
  "- No inventes cifras, cantidades de alumnos, años de experiencia ni respaldos que no te dijeron.",
  "- No escribas testimonios ni opiniones de nadie: esa sección no te toca y se llena sola",
  "  cuando haya compradores de verdad.",
  "- No inventes plazos, cupos ni ofertas que vencen.",
  "- No hables de salud, medicamentos, inversiones ni apuestas como si fuera un consejo",
  "  personalizado: si el nicho es de eso, quedate en lo informativo y general.",
].join("\n");

/**
 * Lo que vuelve del modelo, convertido en una página guardable.
 *
 * ⚠️ **Es un MERGE, no un reemplazo.** Si la persona ya tenía página, esto sólo
 * pisa los campos de las ocho secciones de copy. Lo que NO toca:
 *
 *   - Su estilo, su paleta y su tipografía — las eligió ella.
 *   - El orden en que puso las secciones.
 *   - Qué secciones tenía prendidas o apagadas.
 *   - Opiniones, garantía y las dos de urgencia: sus textos quedan como estaban.
 *
 * Sin esto, "regenerar el texto" le borraría el diseño, y esa es la clase de
 * pérdida que no se puede deshacer desde ninguna pantalla.
 *
 * Devuelve `null` si no llegó ni una sección utilizable: mejor decir "probá de
 * nuevo" que guardar una página a medio llenar arriba de la que había.
 */
export function fusionarPaginaIA(
  actual: PaginaVenta,
  crudo: unknown,
): PaginaVenta | null {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return null;
  const llego = crudo as Record<string, unknown>;

  let tocadas = 0;
  const secciones: SeccionGuardada[] = actual.secciones.map((s) => {
    /* Sólo las de la lista blanca, y sólo si el modelo mandó algo para ellas. */
    if (!SECCIONES_QUE_ESCRIBE.includes(s.clave)) return s;
    const def = buscarSeccion(s.clave);
    const nuevo = llego[s.clave];
    if (!def || !nuevo || typeof nuevo !== "object" || Array.isArray(nuevo)) return s;

    tocadas++;
    /* Los campos viejos se conservan y encima se escriben los nuevos: si el
       modelo se salteó uno, queda el que había en vez de un hueco. */
    return { ...s, campos: { ...s.campos, ...(nuevo as Record<string, unknown>) } };
  });

  if (tocadas === 0) return null;

  /* Y todo por la MISMA puerta que usa el editor: descarta lo que no existe,
     recorta lo largo y devuelve claves de estilo válidas. El catálogo cerrado se
     hizo para poder hacer exactamente esto. */
  return normalizarContenido({ ...actual, secciones });
}
