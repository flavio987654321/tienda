import { limpiarTexto } from "@/lib/texto-limpio";

/**
 * Armar un embudo con IA: el principal, un bono y un upsell.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA CÁSCARA, NO EL CONTENIDO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Devuelve **tres fichas** con título, descripción y precio. No escribe ningún
 * PDF: eso es el otro botón, el que cuesta US$2–4 y gasta el cupo de `ebooksIA`.
 * Éste es texto corto, cuesta centavos, y por eso lo tienen los tres planes.
 *
 * ── Por qué UN embudo y no llenar el plan ──────────────────────────────────
 *
 * Porque **una descripción es un nicho**. Si alguien escribe "vendo cosas de
 * mecánica" y se le arman los 5 productos de Pro, los 5 van a ser de autos — y
 * eso es lo contrario de para qué sirve Pro, donde los 5 existen justamente para
 * ser de nichos distintos. Generarlos todos de un texto deja cuatro de sobra.
 *
 * ── Por qué la respuesta entra por una herramienta y no por texto ──────────
 *
 * Porque pidiendo "contestame en JSON" el modelo contesta en JSON **casi**
 * siempre, y el "casi" acá es una pantalla rota. Con una herramienta de esquema
 * fijo, la forma la garantiza la API: llegan los campos que se declararon, con
 * los tipos que se declararon.
 *
 * ⚠️ Eso NO reemplaza validar. El esquema garantiza que `precio` sea un número,
 * no que sea un número sensato; y garantiza que `titulo` sea texto, no que sea
 * texto que se pueda meter en una página. Todo lo que vuelve pasa por
 * `normalizarEmbudo` antes de que nadie lo vea. Es el mismo principio del
 * catálogo cerrado de la página de venta: se compara campo por campo contra una
 * lista, sobra algo se tira, falta algo se ve.
 */

/** Lo más largo que puede escribir la persona describiendo su negocio. */
export const LARGO_DEL_NICHO = 600;
/** Y lo más corto: con tres palabras no se puede armar nada que sirva. */
export const MINIMO_DEL_NICHO = 15;

/* Los topes de lo que se ACEPTA de vuelta. Son más chicos que los del producto
   —140 y 10.000— a propósito: acá no se está guardando lo que escribió una
   persona, se está aceptando lo que devolvió un modelo, y una ficha con un
   título de 140 caracteres no se lee en ninguna pantalla. Si el modelo se va de
   largo, se corta acá y no en el CSS. */
export const LARGO_TITULO_IA = 70;
export const LARGO_BAJADA_IA = 400;

/* ⚠️ El rango de precios que se acepta, en pesos.
 *
 * El modelo no conoce el dólar de hoy ni la inflación de este mes, así que un
 * precio suyo es una SUGERENCIA para editar, nunca un número para publicar. El
 * rango existe para que una alucinación no llegue a la pantalla: sin él, un
 * "$1" o un "$99.000.000" se dibujan igual de bien que un precio real.
 *
 * Fuera del rango no se rechaza la generación entera —sería tirar tres fichas
 * buenas por un número— sino que se acomoda al borde más cercano y queda para
 * que la persona lo corrija, que es lo que va a hacer igual. */
export const PRECIO_MINIMO_IA = 1_000;
export const PRECIO_MAXIMO_IA = 500_000;

export type FichaDelEmbudo = {
  titulo: string;
  bajada: string;
  /** En pesos. 0 en el bono, siempre: un bono que se cobra no es un regalo. */
  precio: number;
};

export type EmbudoSugerido = {
  principal: FichaDelEmbudo;
  bono: FichaDelEmbudo;
  upsell: FichaDelEmbudo;
};

/**
 * El esquema de la herramienta. Es lo que le da forma a la respuesta.
 *
 * Las descripciones de cada campo no son documentación: **son parte del prompt**.
 * El modelo las lee, y son el lugar donde se le dice qué es un bono y qué es un
 * upsell en este producto — que es justo lo que se confunde si se explica sólo
 * arriba.
 */
export const ESQUEMA_DEL_EMBUDO = {
  type: "object" as const,
  properties: {
    principal: ficha(
      "El producto principal: lo que la persona compra. Un ebook, guía o curso en PDF.",
      "El precio en pesos argentinos.",
    ),
    bono: ficha(
      "Un regalo que va INCLUIDO con el principal y lo complementa: una plantilla, una checklist, un"
      + " recetario. Tiene que ser algo distinto del principal, no un resumen de lo mismo.",
      "Siempre 0: el bono es gratis.",
    ),
    upsell: ficha(
      "Una oferta que se muestra DESPUÉS de pagar, para quien quiere más: algo más profundo, más"
      + " completo o el paso siguiente. También es un archivo que se descarga, nunca un video ni una"
      + " clase. Más caro que el bono y más barato que el principal no es una regla: poné lo que valga.",
      "El precio en pesos argentinos.",
    ),
  },
  required: ["principal", "bono", "upsell"],
  /* `satisfies` y no `as const`: la API pide un esquema con arreglos mutables,
     y un `as const` los congela en `readonly` y no compila. Igual queda
     comprobado que `type` diga "object" y no cualquier cosa. */
} satisfies { type: "object"; properties: Record<string, unknown>; required: string[] };

function ficha(queEs: string, quePrecio: string) {
  return {
    type: "object" as const,
    description: queEs,
    properties: {
      titulo: {
        type: "string" as const,
        description: `El nombre del producto, concreto y en castellano rioplatense. Máximo ${LARGO_TITULO_IA}`
          + " caracteres. Sin comillas, sin emojis y sin la palabra 'ebook' si se puede evitar.",
      },
      bajada: {
        type: "string" as const,
        description: "Dos o tres oraciones diciendo qué se lleva quien lo compra y para qué le sirve."
          + " En segunda persona ('vas a', 'tenés'). Sin saltos de línea, sin listas y sin promesas de"
          + " resultados que no podemos garantizar.",
      },
      precio: { type: "number" as const, description: quePrecio },
    },
    required: ["titulo", "bajada", "precio"],
  };
}

/**
 * Lo que se le dice al modelo antes del nicho.
 *
 * ⚠️ Termina con la regla de qué NO inventar, y está último a propósito: es lo
 * que más se olvida cuando el pedido de la persona empuja para el otro lado
 * ("quiero vender el método definitivo para ganar 1000 dólares por día").
 */
export const INSTRUCCIONES = [
  "Sos quien arma embudos de venta de productos digitales para gente que vende en Argentina.",
  "",
  "Te van a contar de qué es su negocio o su conocimiento, y tenés que devolver TRES fichas:",
  "el producto principal, un bono que va incluido, y un upsell que se ofrece después de pagar.",
  "",
  "⚠️ TODO lo que propongas se entrega como UN ARCHIVO QUE SE DESCARGA: un PDF, una guía, una",
  "planilla, un recetario. No propongas videos, clases en vivo, comunidades, grupos de WhatsApp,",
  "asesorías ni acompañamiento — nada de eso se puede entregar acá, y quien vende se queda",
  "prometiendo algo que la plataforma no le va a mandar a nadie.",
  "",
  "Cómo escribir:",
  "- Castellano rioplatense, de vos. Como habla alguien en Buenos Aires, no un manual.",
  "- Concreto. 'Cómo cambiar el aceite sin ir al taller' vale; 'Guía completa de mecánica' no dice nada.",
  "- Cortito. Nadie lee un párrafo en una tarjeta.",
  "- Sin lunfardo fuerte, insultos ni 'te la clavan'. Suena cercano en una charla y no en un título:",
  "  esto lo firma con su nombre quien vende, en su propia página.",
  "",
  "Los precios: en PESOS ARGENTINOS, redondos (terminados en 000 o en 900), y de un producto",
  "digital que se vende por internet, no de un curso presencial.",
  "",
  "⚠️ Lo que NO tenés que hacer, aunque te lo pidan:",
  "- No prometas resultados ('vas a facturar', 'garantizado', 'en 30 días'). Es publicidad engañosa",
  "  y quien responde es quien vende, no vos.",
  "- No inventes títulos, matrículas ni respaldos profesionales que no te dijeron.",
  "- No armes nada de salud, medicamentos, inversiones ni apuestas: si el nicho es de eso, armá",
  "  la parte informativa y general, nunca un consejo personalizado.",
].join("\n");

/**
 * Lo que llega del modelo, convertido en algo que se puede mostrar.
 *
 * Devuelve `null` si falta una ficha entera o si un título queda vacío después
 * de limpiarlo: eso no es una generación mediocre que la persona pueda editar,
 * es una pantalla rota, y es mejor decir "probá de nuevo".
 */
export function normalizarEmbudo(crudo: unknown): EmbudoSugerido | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const c = crudo as Record<string, unknown>;

  const principal = normalizarFicha(c.principal, false);
  const bono = normalizarFicha(c.bono, true);
  const upsell = normalizarFicha(c.upsell, false);
  if (!principal || !bono || !upsell) return null;

  return { principal, bono, upsell };
}

function normalizarFicha(crudo: unknown, esBono: boolean): FichaDelEmbudo | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const f = crudo as Record<string, unknown>;

  /* Por el mismo limpiador que usa todo lo que escribe una persona. No es
     paranoia sobrante: lo que vuelve de acá se dibuja en una página pública, y
     un salto de línea o un carácter de control adentro de un título rompe el
     mismo renglón que rompería si lo hubiera tipeado alguien. */
  const titulo = limpiarTexto(f.titulo, LARGO_TITULO_IA);
  if (titulo === null || titulo.length < 2) return null;

  /* La bajada sí puede quedar vacía: una ficha sin descripción se completa a
     mano en dos minutos. Un título vacío, en cambio, es una tarjeta sin nombre. */
  const bajada = limpiarTexto(f.bajada, LARGO_BAJADA_IA) ?? "";

  return { titulo, bajada, precio: esBono ? 0 : precioSano(f.precio) };
}

/**
 * Un precio que se puede dibujar.
 *
 * `Number.isFinite` y no `> 0` a secas: del modelo puede volver `NaN` o
 * `Infinity` —el esquema dice "number" y los dos lo son— y los dos pasan
 * cualquier comparación hasta que el total de un pedido sale en "NaN".
 */
export function precioSano(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return PRECIO_MINIMO_IA;
  const redondeado = Math.round(valor);
  if (redondeado < PRECIO_MINIMO_IA) return PRECIO_MINIMO_IA;
  if (redondeado > PRECIO_MAXIMO_IA) return PRECIO_MAXIMO_IA;
  return redondeado;
}

/* ⚠️ Lo que esta lima acepta no puede pasarse de lo que el producto acepta: si
   pasara, la IA propondría fichas que la ruta de crear rechaza, y la persona
   vería tres tarjetas lindas que no se pueden guardar. Está chequeado en
   `embudo-ia.check`, contra `LARGO_TITULO` y `PRECIO_MAXIMO` de verdad. */
