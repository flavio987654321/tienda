import { limpiarTexto } from "@/lib/texto-limpio";
import {
  PUNTOS_MAX, LARGO_TITULO_LAMINA, LARGO_TEXTO_LAMINA, LARGO_PUNTO, LARGO_FOTO,
  cortarEnUnaIdea, leerFotoElegida,
  type Lamina, type FotoElegida,
} from "@/lib/ebook-ia";

/**
 * Corregir a mano las láminas ya escritas.
 *
 * Es el tercer editor, y existe por lo mismo que `recetario-texto`: una
 * lámina no es prosa —es un título, un texto corto y hasta tres datos, cada
 * uno con su tope— y el editor de párrafos no la puede dibujar. Sin esto, una
 * coma mal puesta en una infografía costaría una generación entera.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ LO QUE ESTE ARCHIVO CUIDA: QUE NO DESAPAREZCA UNA LÁMINA ENTERA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `normalizarLaminas` —el lector, del otro lado— **descarta la lámina
 * completa** sin decir nada si se queda sin título o sin texto. Del lado del
 * modelo está bien: es limar lo que vino mal. Del lado de una persona que
 * borró el texto para reescribirlo y guardó a mitad de camino es un desastre
 * silencioso: la infografía que se vendió como de diez entrega nueve, y todas
 * las de abajo se corren un lugar.
 *
 * Así que acá se revisa con las MISMAS reglas y se avisa antes de guardar. Es
 * la misma decisión que en `ebook-texto` con `BLOQUES_MIN` y en
 * `recetario-texto` con los ingredientes.
 */

/** Un título de una sola letra tampoco cuenta como título. */
export const LARGO_TITULO_LAMINA_MIN = 2;

/**
 * Las láminas se guardan agrupadas por sección, y cada grupo es una llamada al
 * modelo ya cobrada. Ver `leerGruposDeLaminas`.
 */
export type LoQueHayEnLaminas = { grupos: Lamina[][] };

export type RevisionDeLaminas =
  | { ok: true; grupos: Lamina[][] }
  | { ok: false; error: string };

/**
 * Lo que llegó del navegador, dejado en láminas que se pueden guardar — o el
 * motivo, escrito para mostrarlo tal cual.
 *
 * ⚠️ Devuelve **la lista entera de grupos**, no sólo los que llegaron. Si la
 * cadena escribió una sección más mientras la persona corregía, lo que llegó
 * pisa los primeros y los de abajo se mantienen tal cual. Es la misma regla
 * que en `revisarTexto` y `revisarRecetas`.
 */
export function revisarLaminas(recibido: unknown, hay: LoQueHayEnLaminas): RevisionDeLaminas {
  if (!recibido || typeof recibido !== "object") {
    return { ok: false, error: "No pudimos leer lo que mandaste." };
  }
  const cuerpo = recibido as Record<string, unknown>;
  if (!Array.isArray(cuerpo.laminas)) {
    return { ok: false, error: "No pudimos leer las láminas." };
  }

  /* ⚠️ NI UNA SECCIÓN MÁS DE LAS QUE HAY. Cada grupo es una llamada al modelo
     ya cobrada: aceptar una de más sería agregar láminas sin haberlas pagado. */
  if (cuerpo.laminas.length > hay.grupos.length) {
    return { ok: false, error: "Llegaron más secciones de las que tiene esta infografía." };
  }

  const corregidos: Lamina[][] = [];

  for (const [g, grupoCrudo] of cuerpo.laminas.entries()) {
    const original = hay.grupos[g] ?? [];
    if (!Array.isArray(grupoCrudo)) {
      return { ok: false, error: "No pudimos leer una de las secciones." };
    }

    /* ⚠️ Y NI UNA LÁMINA MÁS NI UNA MENOS por sección. El número de láminas es
       lo que se eligió antes de generar, lo que va escrito en la tapa —"10
       LÁMINAS"— y lo que justifica el precio. Que se pueda corregir el texto
       no quiere decir que se pueda cambiar el producto. */
    if (grupoCrudo.length !== original.length) {
      return {
        ok: false,
        error: "La cantidad de láminas no coincide con la de tu infografía. Recargá la pantalla.",
      };
    }

    const grupo: Lamina[] = [];

    for (const [i, crudo] of grupoCrudo.entries()) {
      /* En qué número está, contando desde la primera: es lo que la persona ve
         en pantalla. Sin esto, el aviso diría "la lámina 2" y habría seis. */
      const numero = corregidos.reduce((n, gr) => n + gr.length, 0) + i + 1;

      if (!crudo || typeof crudo !== "object") {
        return { ok: false, error: `No pudimos leer la lámina ${numero}.` };
      }
      const b = crudo as Record<string, unknown>;

      const titulo = cortarEnUnaIdea(b.titulo, LARGO_TITULO_LAMINA) ?? "";
      /* ⚠️ El lector descarta la lámina ENTERA si el título no llega a dos
         letras, y todas las de abajo se corren un lugar. Se avisa acá. */
      if (titulo.length < LARGO_TITULO_LAMINA_MIN) {
        return {
          ok: false,
          error: `La lámina ${numero} se quedó sin título. Sin título no se puede guardar: la lámina entera desaparecería.`,
        };
      }

      const texto = cortarEnUnaIdea(b.texto, LARGO_TEXTO_LAMINA) ?? "";
      if (!texto) {
        return {
          ok: false,
          error: `"${titulo}" se quedó sin texto. Sin texto no se puede guardar: la lámina entera desaparecería.`,
        };
      }

      /* Los datos sí pueden faltar, y se cuentan sobre los LIMPIOS: tres
         renglones vacíos son cero datos, y eso está bien. */
      const puntos: string[] = [];
      if (Array.isArray(b.puntos)) {
        for (const bp of b.puntos) {
          if (puntos.length >= PUNTOS_MAX) break;
          const punto = cortarEnUnaIdea(bp, LARGO_PUNTO);
          if (punto) puntos.push(punto);
        }
      }

      grupo.push({
        titulo,
        texto,
        puntos,
        /* Con qué se busca la foto. Se toma de lo que llegó porque el editor la
           deja cambiar, igual que en los otros dos. */
        foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "",
        /* ⚠️ Y la foto ELEGIDA a mano, con el mismo control de siempre: si la
           dirección no es del banco ni nuestra, vuelve `null`. Nunca se toma
           la vieja como respaldo — sacar la foto elegida tiene que poder
           hacerse, y `null` es exactamente eso. Ver `leerFotoElegida`. */
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
 * La foto elegida de cada lámina, para la pantalla.
 *
 * Se arma aparte porque la pantalla las muestra todas seguidas —una lámina es
 * una hoja— mientras que lo guardado va agrupado por sección. La misma forma
 * que `fotosDeLasRecetas`, así el editor las trata igual.
 */
export type FotoDeLamina = { frase: string; elegida: FotoElegida | null };

export function fotosDeLasLaminas(grupos: Lamina[][]): FotoDeLamina[] {
  return grupos.flat().map((l) => ({ frase: l.foto, elegida: l.fotoElegida ?? null }));
}
