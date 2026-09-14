import { limpiarTexto } from "@/lib/texto-limpio";
import {
  CAPITULOS_MIN, CAPITULOS_MAX,
  LARGO_TITULO_EBOOK, LARGO_TITULO_CAPITULO, LARGO_RESUMEN_CAPITULO, LARGO_FOTO,
  leerFotoElegida,
  type CapituloPlaneado,
} from "@/lib/ebook-ia";

/**
 * Revisar el temario antes de que se escriba.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL ÚNICO MOMENTO BARATO PARA ARREGLAR UN EBOOK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El temario sale de la llamada más barata de las tres —dos mil tokens— y de él
 * sale la forma de todo lo demás: cada capítulo se escribe leyendo el título y
 * el resumen de su entrada. Cambiar una línea acá cambia el ebook entero y no
 * cuesta nada. La misma corrección después de escrito cuesta rehacerlo.
 *
 * Por eso esto está antes del bucle y no después: la pantalla frena, muestra lo
 * que armó el modelo, y recién escribe cuando la persona dice que sí.
 *
 * ── Está aparte de la ruta a propósito ─────────────────────────────────────
 *
 * Acá no se toca la base ni se llama a nadie: entra lo que mandó el navegador y
 * sale un temario limado o un motivo escrito. Así se puede probar entero —ver
 * `ebook-temario.check.ts`— sin base, sin claves y sin gastar una generación.
 *
 * ── ⚠️ Las tres cosas que NO se pueden hacer, y por qué ─────────────────────
 *
 * 1. **Tocar lo que ya está escrito.** El capítulo escrito Nº 3 es el que le
 *    corresponde a la entrada Nº 3 del temario: no hay ningún otro vínculo
 *    entre los dos que la posición. Dejar cambiar —o peor, borrar— una entrada
 *    ya escrita corre todo lo de abajo y el ebook sale con los títulos de un
 *    capítulo sobre el texto de otro. Y eso no falla: sale un PDF perfecto que
 *    dice cualquier cosa.
 *
 * 2. **Cambiar cuántas secciones tiene un recetario.** No son capítulos: son el
 *    reparto de las recetas que la persona eligió y pagó. Sacar una sección de
 *    un recetario de 30 entrega 27 con "30 RECETAS" en la tapa.
 *
 * 3. **Dejar un capítulo sin resumen.** El resumen no es adorno: es lo único
 *    que lee el modelo cuando escribe ese capítulo. Vacío, escribe a ciegas
 *    sobre un título.
 */

export type Temario = {
  titulo: string;
  promesa: string;
  capitulos: CapituloPlaneado[];
};

/** Lo que hay guardado hoy, que es contra lo que se compara lo que llegó. */
export type LoQueHay = {
  /** El temario tal cual está en la base. */
  capitulos: CapituloPlaneado[];
  /**
   * Cuántas partes ya se escribieron. Son las primeras de la lista, siempre:
   * se escribe de arriba para abajo y el que sigue es el largo de lo escrito.
   */
  escritos: number;
  /**
   * Un recetario —y una infografía— tiene las secciones repartidas según lo
   * que se eligió y pagó, y no se pueden agregar ni quitar.
   */
  porSecciones: boolean;
};

export type Revision =
  | { ok: true; temario: Temario }
  | { ok: false; error: string };

/**
 * En qué estados se puede tocar el temario.
 *
 * ⚠️ `COMPLETO` y `LISTO` no están, y no es por prudencia: con todo escrito el
 * temario ya no dirige nada —los títulos del PDF salen de cada capítulo
 * escrito, no de acá— así que editarlo daría la sensación de estar arreglando
 * algo mientras el archivo sale igual. Un botón que no hace nada es peor que un
 * botón que no está.
 */
export const ESTADOS_EDITABLES = ["INDICE", "ESCRIBIENDO", "FALLADO"] as const;

export function sePuedeEditarElTemario(estado: string): boolean {
  return (ESTADOS_EDITABLES as readonly string[]).includes(estado);
}

/**
 * Lo que llegó del navegador, dejado en un temario que se puede guardar — o el
 * motivo, escrito para que se pueda mostrar tal cual.
 *
 * ⚠️ **No descarta en silencio.** `normalizarIndice` sí lo hace, y ahí está
 * bien: del otro lado hay un modelo y lo que se pierde lo escribió una máquina.
 * Acá del otro lado hay una persona que acaba de escribir eso. Tirarle el
 * capítulo que le faltó completar y guardar el resto sin decir nada es lo peor
 * que puede hacer un editor.
 */
export function revisarTemario(recibido: unknown, hay: LoQueHay): Revision {
  if (!recibido || typeof recibido !== "object") {
    return { ok: false, error: "No llegó el temario." };
  }
  const c = recibido as Record<string, unknown>;

  const titulo = limpiarTexto(c.titulo, LARGO_TITULO_EBOOK);
  if (!titulo || titulo.length < 2) {
    return { ok: false, error: "El ebook necesita un título." };
  }

  /* La promesa puede quedar vacía: la tapa se las arregla con el resumen del
     primer capítulo, que es lo que hacía antes de que existiera. */
  const promesa = limpiarTexto(c.promesa, LARGO_RESUMEN_CAPITULO) ?? "";

  if (!Array.isArray(c.capitulos)) {
    return { ok: false, error: "No llegó la lista de capítulos." };
  }

  /* ── Lo escrito no se toca ─────────────────────────────────────────────
     El prefijo sale de la BASE, no de lo que mandó el navegador: así no hay
     forma —ni con un pedido hecho a mano— de correr las posiciones y dejar el
     texto de un capítulo abajo del título de otro. */
  const escritos = Math.max(0, Math.min(hay.escritos, hay.capitulos.length));
  const prefijo = hay.capitulos.slice(0, escritos);

  if (c.capitulos.length < escritos) {
    return {
      ok: false,
      error: escritos === 1
        ? "El capítulo que ya está escrito no se puede borrar."
        : `Los ${escritos} capítulos que ya están escritos no se pueden borrar.`,
    };
  }

  const nuevos: CapituloPlaneado[] = [];
  for (let i = escritos; i < c.capitulos.length; i++) {
    const numero = i + 1;
    const bruto = c.capitulos[i];
    if (!bruto || typeof bruto !== "object") {
      return { ok: false, error: `El capítulo ${numero} llegó vacío.` };
    }
    const b = bruto as Record<string, unknown>;

    const tit = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    if (!tit || tit.length < 2) {
      return { ok: false, error: `Al capítulo ${numero} le falta el título.` };
    }

    /* Ver el punto 3 de arriba: sin resumen, ese capítulo se escribe a ciegas. */
    const res = limpiarTexto(b.resumen, LARGO_RESUMEN_CAPITULO);
    if (!res) {
      return {
        ok: false,
        error: `Contá en dos renglones de qué se trata el capítulo ${numero}: es lo único que se lee para escribirlo.`,
      };
    }

    /* La foto sí puede faltar: quien la busca cae al título, que es lo que se
       hacía antes de que este campo existiera. Nunca tumba un capítulo. */
    /* ⚠️ Y la foto ELEGIDA viaja con su entrada. Sin esta línea, tocar el
       temario borraba la foto que alguien había elegido a mano: se guardaba la
       entrada sin ella y el armado volvía a buscar una cualquiera. Viaja por el
       cuerpo y no se copia de lo guardado por posición, porque acá las entradas
       se pueden mover y borrar — copiar por posición le daría la foto del 3 al
       capítulo 4. Ver `FotoElegida`. */
    nuevos.push({
      titulo: tit,
      resumen: res,
      foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "",
      fotoElegida: leerFotoElegida(b.fotoElegida),
    });
  }

  const capitulos = [...prefijo, ...nuevos];

  /* ── Cuántos pueden ser ────────────────────────────────────────────────── */
  if (hay.porSecciones) {
    /* Ver el punto 2: las secciones son el reparto de lo que se pagó. */
    if (capitulos.length !== hay.capitulos.length) {
      return {
        ok: false,
        error: "Las secciones son las que hacen falta para la cantidad que elegiste: no se pueden agregar ni quitar.",
      };
    }
  } else {
    if (capitulos.length < CAPITULOS_MIN) {
      return { ok: false, error: `Un ebook necesita al menos ${CAPITULOS_MIN} capítulos.` };
    }
    /* Se rechaza en vez de cortar: cortar dejaría a alguien mirando un temario
       de doce y un ebook de diez, sin nada que lo avise. */
    if (capitulos.length > CAPITULOS_MAX) {
      return { ok: false, error: `Un ebook no puede tener más de ${CAPITULOS_MAX} capítulos.` };
    }
  }

  /* Dos capítulos con el mismo título dejan un índice que se lee como un error
     de imprenta — y encima se escriben, y se pagan, dos veces. */
  const vistos = new Set<string>();
  for (const cap of capitulos) {
    const clave = cap.titulo.toLowerCase();
    if (vistos.has(clave)) {
      return { ok: false, error: `Hay dos capítulos con el mismo título: "${cap.titulo}".` };
    }
    vistos.add(clave);
  }

  return { ok: true, temario: { titulo, promesa, capitulos } };
}
