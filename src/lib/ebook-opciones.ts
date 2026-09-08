import { PALETAS } from "@/lib/pagina-venta";

/**
 * Cómo quiere que salga su ebook: formato, tema y color.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TRES ELECCIONES QUE SE HACEN UNA VEZ Y NO SE PUEDEN DESHACER SOLAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Se eligen ANTES de generar, porque el formato cambia lo que se le pide al
 * modelo: un recetario no son párrafos, son campos (ver `Receta`). El tema y el
 * color no cambian el texto, así que esos sí se pueden cambiar después y volver
 * a armar el PDF sin pagar otra generación.
 *
 * ── ⚠️ Dónde se guardan, y por qué ahí ─────────────────────────────────────
 *
 * Adentro del JSON de `EbookIA.indice`, al lado de la promesa y los capítulos
 * planeados. **No en columnas propias**, que es donde irían si esto fuera un
 * campo más: agregar columnas es una migración, y la base de este proyecto es
 * la de producción. Mientras no haya deploy, esto anda igual y no la toca.
 *
 * El costo de la decisión es un nombre feo —las opciones viven en un campo que
 * se llama `indice`— y está anotado a propósito. Si algún día se migra, lo
 * único que cambia es `leerOpciones` y dónde escribe la ruta.
 */

export const FORMATOS = ["texto", "recetario"] as const;
export type FormatoDeEbook = (typeof FORMATOS)[number];

/**
 * Cuáles se pueden generar HOY.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN FORMATO QUE NO ESTÁ ACÁ ES UNA MENTIRA SI SE PUEDE ELEGIR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El molde del recetario ya está dibujado —ver `hojaDeReceta`— pero **al modelo
 * todavía no se le pide una receta**: se le piden párrafos. Si alguien pudiera
 * elegir "Recetario" hoy, se le cobraría una generación y recibiría un ebook de
 * texto con otro nombre.
 *
 * Por eso la lista está separada del catálogo: la pantalla apaga los que no
 * están, y `normalizarOpciones` los baja a `texto` aunque lleguen por un pedido
 * hecho a mano. Cuando el modelo aprenda a escribir recetas, se agrega
 * `"recetario"` acá y las dos puntas se encienden solas.
 */
export const FORMATOS_LISTOS: readonly FormatoDeEbook[] = ["texto", "recetario"];

/**
 * Cuántas recetas puede tener un recetario.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTE NÚMERO LO ELIGE QUIEN VENDE, Y NO ES UN DETALLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Va en la tapa —"30 RECETAS"— y es lo que justifica el precio. Nadie paga lo
 * mismo por diez que por treinta. Dejárselo decidir al modelo sería que el
 * producto salga distinto de lo que la persona pensaba vender.
 *
 * ⚠️ Los tres números no son redondeos lindos: son los que **caen justo** con
 * lo que el resto del sistema aguanta. Cada llamada al modelo escribe
 * `RECETAS_POR_LLAMADA` (3), y el temario no puede tener más de
 * `CAPITULOS_MAX` (10) secciones, así que el techo real es 30:
 *
 *   10 recetas → 4 llamadas   ·   20 → 7   ·   30 → 10, el máximo
 *
 * Y lo que sale, medido el 07/09/26: alrededor de **1 centavo por receta**.
 * Treinta recetas cuestan lo mismo que un ebook de texto de diez capítulos.
 * Subir el tope de acá no es cambiar un número: hay que subir `CAPITULOS_MAX`
 * o escribir más de tres por llamada, y esto último no entra en los 60
 * segundos de la función.
 */
export const RECETAS_OPCIONES = [10, 20, 30] as const;
export const RECETAS_DE_FABRICA = 20;

export const TEMAS = ["claro", "oscuro"] as const;
export type TemaDeEbook = (typeof TEMAS)[number];

/** Cómo se llama cada uno en pantalla, y qué es. */
export const QUE_ES_CADA_FORMATO: Record<FormatoDeEbook, { nombre: string; explica: string }> = {
  texto: {
    nombre: "Ebook de texto",
    explica: "Capítulos escritos, con fotos y recuadros. Sirve para cualquier tema.",
  },
  recetario: {
    nombre: "Recetario",
    explica: "Una receta por hoja: ingredientes, pasos y tiempos. Sólo para cocina.",
  },
};

/**
 * Cómo se llama cada cosa en pantalla, según el formato.
 *
 * ⚠️ Existe porque la tarjeta del producto decía "4 de 10 capítulos" para un
 * recetario, que no tiene capítulos. Un número con la palabra equivocada al lado
 * hace dudar de todo lo demás que dice la pantalla.
 */
export const COMO_SE_LLAMA: Record<FormatoDeEbook, {
  obra: string;
  parte: string;
  partes: string;
}> = {
  texto: { obra: "Ebook", parte: "capítulo", partes: "capítulos" },
  recetario: { obra: "Recetario", parte: "receta", partes: "recetas" },
};

export const QUE_ES_CADA_TEMA: Record<TemaDeEbook, { nombre: string; explica: string }> = {
  claro: { nombre: "Claro", explica: "Fondo claro. Es el que se imprime bien." },
  oscuro: { nombre: "Oscuro", explica: "Fondo oscuro. Se ve más en pantalla y en redes." },
};

export type OpcionesDelEbook = {
  formato: FormatoDeEbook;
  tema: TemaDeEbook;
  /**
   * La clave de una de `PALETAS`, o `""` para usar la de su página de venta.
   *
   * ⚠️ Vacío NO es lo mismo que la primera paleta: vacío significa **seguir a
   * la página**. Si mañana cambia el color de su página, el ebook la acompaña.
   * Con una clave guardada, el ebook se queda con la que eligió, que es lo que
   * quiso al elegirla.
   */
  paleta: string;
  /**
   * Cuántas recetas, si el formato es recetario. Una de `RECETAS_OPCIONES`.
   *
   * En un ebook de texto no se usa y se guarda igual: si mañana cambia de
   * formato, lo que había elegido sigue ahí.
   */
  recetas: number;
};

export const OPCIONES_DE_FABRICA: OpcionesDelEbook = {
  formato: "texto",
  tema: "claro",
  paleta: "",
  recetas: RECETAS_DE_FABRICA,
};

/**
 * Lo que llegó del navegador, dejado en algo que se puede usar.
 *
 * ⚠️ Nunca falla: cualquier cosa rara cae a la de fábrica. Esto se llama en el
 * camino de generar un ebook, y rechazar el pedido entero porque alguien mandó
 * `tema: "violeta"` sería cortarle la generación por una preferencia.
 */
export function normalizarOpciones(crudo: unknown): OpcionesDelEbook {
  const c = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;

  /* ⚠️ Contra `FORMATOS_LISTOS` y no contra `FORMATOS`: un formato que todavía
     no se puede escribir se baja a texto acá, aunque el pedido venga hecho a
     mano y no desde la pantalla. Si no, se cobra una generación y se entrega
     otra cosa. */
  const formato = FORMATOS_LISTOS.includes(c.formato as FormatoDeEbook)
    ? (c.formato as FormatoDeEbook)
    : OPCIONES_DE_FABRICA.formato;

  const tema = TEMAS.includes(c.tema as TemaDeEbook)
    ? (c.tema as TemaDeEbook)
    : OPCIONES_DE_FABRICA.tema;

  /* Sólo una de las seis. ⚠️ Nada de colores libres: cada paleta trae su acento
     Y el texto que va encima, medidos entre sí. Con un color a elección, una
     franja amarilla con texto blanco encima queda ilegible adentro de un
     archivo que ya se vendió y ya se mandó, y no hay forma de arreglarlo. */
  const clave = typeof c.paleta === "string" ? c.paleta : "";
  const paleta = PALETAS.some((p) => p.clave === clave) ? clave : "";

  /* ⚠️ Una de las tres, y nada más. No se redondea al más cercano: un "25"
     escrito a mano no es una preferencia mal puesta, es un pedido que el resto
     del sistema no puede cumplir —cada llamada escribe tres recetas y el
     temario no pasa de diez secciones—. Ver `RECETAS_OPCIONES`. */
  const cuantas = Number(c.recetas);
  const recetas = (RECETAS_OPCIONES as readonly number[]).includes(cuantas)
    ? cuantas
    : RECETAS_DE_FABRICA;

  return { formato, tema, paleta, recetas };
}

/**
 * Las opciones de un ebook guardado.
 *
 * Un ebook de antes del 07/09/26 no las tiene: sale la de fábrica, que es
 * exactamente lo que ese ebook era —texto, claro, con la paleta de su página—.
 */
export function leerOpciones(guardado: string | null | undefined): OpcionesDelEbook {
  if (typeof guardado !== "string") return { ...OPCIONES_DE_FABRICA };
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return { ...OPCIONES_DE_FABRICA }; }
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
    return { ...OPCIONES_DE_FABRICA };
  }
  return normalizarOpciones((crudo as { opciones?: unknown }).opciones);
}
