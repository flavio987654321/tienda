import { limpiarTexto } from "@/lib/texto-limpio";
import {
  INGREDIENTES_MAX, PASOS_MAX, LARGO_CAMPO_CORTO, LARGO_PASO,
  LARGO_TITULO_CAPITULO, LARGO_DESCRIPCION_RECETA, LARGO_BLOQUE, LARGO_FOTO,
  cortarEnUnaIdea, leerFotoElegida,
  type Receta, type Ingrediente, type PasoDeReceta, type FotoElegida,
} from "@/lib/ebook-ia";

/**
 * Corregir a mano las recetas ya escritas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO EXISTE APARTE DE `ebook-texto`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un ebook de texto se corrige como párrafos: un campo grande por pedazo y
 * listo. **Una receta no es prosa: son campos.** "500 g" va en una columna con
 * la cantidad alineada, "165 °C" va en una ficha arriba y los pasos van
 * numerados. El editor de párrafos no puede dibujar eso, y por eso el botón de
 * corregir estaba escondido para los recetarios y la ruta los rechazaba.
 *
 * El agujero que deja es el mismo que tenía el ebook de texto hasta que se le
 * hizo su editor: **una coma mal puesta costaba una generación entera.** Y en
 * un recetario duele más, porque lo que se corrige suele ser un número —una
 * cantidad, una temperatura, un tiempo— y un número mal en una receta que
 * alguien compró no es una errata: es un budín que no sale.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ LO QUE ESTE ARCHIVO CUIDA: QUE NO DESAPAREZCA UNA RECETA ENTERA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `normalizarRecetas` —el lector, del otro lado— **descarta la receta completa**
 * en tres casos, sin decir nada:
 *
 *   · sin título, o con uno de una sola letra;
 *   · con menos de dos ingredientes;
 *   · con menos de dos pasos.
 *
 * Del lado del modelo eso está bien: es limar lo que vino mal. Del lado de una
 * persona que acaba de borrar un ingrediente de más es un desastre silencioso —
 * guarda, no falla nada, y la próxima vez que se lee **falta una receta entera**
 * y todas las de abajo se corren un lugar. El recetario que se vendió como de
 * treinta entrega veintinueve.
 *
 * Así que acá se revisa con las MISMAS reglas y se avisa antes de guardar. Es la
 * misma decisión que en `ebook-texto` con `BLOQUES_MIN`.
 */

/** Lo que el lector necesita para no tirar una receta a la basura. */
export const INGREDIENTES_MIN = 2;
export const PASOS_MIN = 2;
/** Y un título de una sola letra tampoco cuenta como título. */
export const LARGO_TITULO_RECETA_MIN = 2;

/** El tip de abajo se lima con el mismo tope que un párrafo. */
export const LARGO_TIP = LARGO_BLOQUE;

/**
 * Las recetas se guardan agrupadas por sección, y cada grupo es una llamada al
 * modelo ya cobrada. Ver `leerGruposDeRecetas`.
 */
export type LoQueHayEnRecetas = { grupos: Receta[][] };

export type RevisionDeRecetas =
  | { ok: true; grupos: Receta[][] }
  | { ok: false; error: string };

/** En qué estados se puede corregir. El mismo criterio que el ebook de texto. */
export const ESTADOS_CON_RECETAS = ["ESCRIBIENDO", "COMPLETO", "LISTO", "FALLADO"];

export function sePuedenEditarLasRecetas(estado: string): boolean {
  return ESTADOS_CON_RECETAS.includes(estado);
}

/** Cómo se llama cada campo en pantalla, para que el aviso diga lo mismo. */
export const COMO_SE_LLAMA_EL_CAMPO = {
  titulo: "el título",
  descripcion: "la bajada",
  rinde: "cuánto rinde",
  tiempo: "el tiempo",
  coccion: "la cocción",
  tip: "el consejo",
} as const;

function unIngrediente(crudo: unknown): Ingrediente | null {
  if (!crudo || typeof crudo !== "object") return null;
  const i = crudo as Record<string, unknown>;
  const nombre = limpiarTexto(i.nombre, LARGO_CAMPO_CORTO);
  /* Sin nombre no es un ingrediente. La cantidad SÍ puede faltar: "sal a gusto"
     no lleva número, y es exactamente lo que hace el lector del otro lado. */
  if (!nombre) return null;
  return { nombre, cantidad: limpiarTexto(i.cantidad, LARGO_CAMPO_CORTO) ?? "" };
}

function unPaso(crudo: unknown): PasoDeReceta | null {
  if (!crudo || typeof crudo !== "object") return null;
  const p = crudo as Record<string, unknown>;
  const texto = cortarEnUnaIdea(p.texto, LARGO_PASO);
  /* El título del paso sí puede faltar: el molde lo numera igual. */
  if (!texto) return null;
  return { titulo: limpiarTexto(p.titulo, LARGO_CAMPO_CORTO) ?? "", texto };
}

/**
 * Lo que llegó del navegador, dejado en recetas que se pueden guardar — o el
 * motivo, escrito para mostrarlo tal cual.
 *
 * ⚠️ Devuelve **la lista entera de grupos**, no sólo los que llegaron. Si la
 * cadena escribió una sección más mientras la persona corregía, lo que llegó
 * pisa los primeros y los de abajo se mantienen tal cual. Sin esto, guardar
 * mientras se escribe borraría una sección recién escrita, que costó plata. Es
 * la misma regla que en `revisarTexto`.
 */
export function revisarRecetas(recibido: unknown, hay: LoQueHayEnRecetas): RevisionDeRecetas {
  if (!recibido || typeof recibido !== "object") {
    return { ok: false, error: "No pudimos leer lo que mandaste." };
  }
  const cuerpo = recibido as Record<string, unknown>;
  if (!Array.isArray(cuerpo.recetas)) {
    return { ok: false, error: "No pudimos leer las recetas." };
  }

  /* ⚠️ NI UNA SECCIÓN MÁS DE LAS QUE HAY. Cada grupo es una llamada al modelo
     ya cobrada: aceptar una de más sería agregar recetas sin haberlas pagado, y
     encima el recetario diría en la tapa un número que no es. */
  if (cuerpo.recetas.length > hay.grupos.length) {
    return { ok: false, error: "Llegaron más secciones de las que tiene este recetario." };
  }

  const corregidos: Receta[][] = [];

  for (const [g, grupoCrudo] of cuerpo.recetas.entries()) {
    const original = hay.grupos[g] ?? [];
    if (!Array.isArray(grupoCrudo)) {
      return { ok: false, error: "No pudimos leer una de las secciones." };
    }

    /* ⚠️ Y NI UNA RECETA MÁS NI UNA MENOS por sección. El número de recetas es
       lo que se eligió antes de generar, lo que va escrito en la tapa —"30
       RECETAS"— y lo que justifica el precio. Que se pueda corregir el texto no
       quiere decir que se pueda cambiar el producto. */
    if (grupoCrudo.length !== original.length) {
      return {
        ok: false,
        error: "La cantidad de recetas no coincide con la de tu recetario. Recargá la pantalla.",
      };
    }

    const grupo: Receta[] = [];

    for (const [r, crudo] of grupoCrudo.entries()) {
      /* En qué número está, contando desde la primera del recetario: es lo que
         la persona ve en pantalla. Sin esto, el aviso diría "la receta 2" y
         habría cuatro recetas 2. */
      const numero = corregidos.reduce((n, gr) => n + gr.length, 0) + r + 1;

      if (!crudo || typeof crudo !== "object") {
        return { ok: false, error: `No pudimos leer la receta ${numero}.` };
      }
      const b = crudo as Record<string, unknown>;

      const titulo = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO) ?? "";
      /* ⚠️ El lector descarta la receta ENTERA si el título no llega a dos
         letras, y todas las de abajo se corren un lugar. Se avisa acá. */
      if (titulo.length < LARGO_TITULO_RECETA_MIN) {
        return {
          ok: false,
          error: `La receta ${numero} se quedó sin título. Sin título no se puede guardar: la receta entera desaparecería.`,
        };
      }

      const ingredientes: Ingrediente[] = [];
      if (Array.isArray(b.ingredientes)) {
        for (const bi of b.ingredientes) {
          if (ingredientes.length >= INGREDIENTES_MAX) break;
          const uno = unIngrediente(bi);
          if (uno) ingredientes.push(uno);
        }
      }
      /* ⚠️ Lo mismo: menos de dos y la receta desaparece al leerla. Y se cuenta
         sobre los LIMPIOS, no sobre los que llegaron: tres renglones vacíos son
         cero ingredientes para el lector. */
      if (ingredientes.length < INGREDIENTES_MIN) {
        return {
          ok: false,
          error: `"${titulo}" necesita al menos ${INGREDIENTES_MIN} ingredientes con nombre. Con menos, la receta entera desaparece.`,
        };
      }

      const pasos: PasoDeReceta[] = [];
      if (Array.isArray(b.pasos)) {
        for (const bp of b.pasos) {
          if (pasos.length >= PASOS_MAX) break;
          const uno = unPaso(bp);
          if (uno) pasos.push(uno);
        }
      }
      if (pasos.length < PASOS_MIN) {
        return {
          ok: false,
          error: `"${titulo}" necesita al menos ${PASOS_MIN} pasos escritos. Con menos, la receta entera desaparece.`,
        };
      }

      grupo.push({
        titulo,
        descripcion: cortarEnUnaIdea(b.descripcion, LARGO_DESCRIPCION_RECETA) ?? "",
        rinde: limpiarTexto(b.rinde, LARGO_CAMPO_CORTO) ?? "",
        tiempo: limpiarTexto(b.tiempo, LARGO_CAMPO_CORTO) ?? "",
        coccion: limpiarTexto(b.coccion, LARGO_CAMPO_CORTO) ?? "",
        ingredientes,
        pasos,
        tip: cortarEnUnaIdea(b.tip, LARGO_TIP) ?? "",
        /* Con qué se busca la foto. Se toma de lo que llegó porque el editor la
           deja cambiar, igual que en el ebook de texto. */
        foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "",
        /* ⚠️ Y la foto ELEGIDA a mano, que se lee con el mismo control de
           siempre: si la dirección no es del banco ni nuestra, vuelve `null`.
           Nunca se toma la vieja como respaldo — sacar la foto elegida tiene
           que poder hacerse, y `null` es exactamente eso. Ver `leerFotoElegida`. */
        fotoElegida: leerFotoElegida(b.fotoElegida),
      });
    }

    corregidos.push(grupo);
  }

  /* Lo corregido pisa los primeros grupos; lo que la cadena escribió mientras
     tanto se mantiene. Ver el comentario de arriba. */
  return { ok: true, grupos: [...corregidos, ...hay.grupos.slice(corregidos.length)] };
}

/**
 * La foto elegida de cada receta, para la pantalla.
 *
 * Se arma aparte porque la pantalla las muestra todas seguidas —una receta es
 * una hoja— mientras que lo guardado va agrupado por sección.
 */
export type FotoDeReceta = { frase: string; elegida: FotoElegida | null };

export function fotosDeLasRecetas(grupos: Receta[][]): FotoDeReceta[] {
  return grupos.flat().map((r) => ({ frase: r.foto, elegida: r.fotoElegida ?? null }));
}
