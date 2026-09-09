import { limpiarTexto } from "@/lib/texto-limpio";
import {
  BLOQUES_MIN, BLOQUES_MAX, LARGO_BLOQUE, LARGO_TITULO_CAPITULO, LARGO_FOTO,
  TIPOS_DE_BLOQUE, leerFotoElegida,
  type Bloque, type TipoDeBloque, type CapituloEscrito, type CapituloPlaneado,
  type FotoElegida,
} from "@/lib/ebook-ia";

/**
 * Corregir el texto que ya está escrito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL ÚLTIMO ARREGLO BARATO, Y EL PRIMERO QUE NO CAMBIA EL EBOOK ENTERO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es el hermano de `ebook-temario`, del otro lado de la escritura:
 *
 *   - **Antes** de escribir, el temario es barato porque de una línea sale un
 *     capítulo entero. Cambiar algo ahí cambia todo lo que viene.
 *   - **Después** de escrito, esto es barato porque **no llama al modelo**:
 *     corregir un dato mal, sacar un párrafo que no va o arreglar una falta de
 *     ortografía sale gratis. La otra forma de arreglar una palabra era
 *     "Rehacerlo", que tira un ebook entero y cobra otra generación.
 *
 * Y es lo que hace que "leelo antes de publicarlo" signifique algo: hasta hoy,
 * quien lo leía y encontraba una macana no tenía con qué arreglarla.
 *
 * ── Está aparte de la ruta a propósito ─────────────────────────────────────
 *
 * Igual que `ebook-temario`: acá no se toca la base ni se llama a nadie. Entra
 * lo que mandó el navegador y sale texto listo para guardar o un motivo escrito.
 * Así se puede probar entero —ver `ebook-texto.check.ts`— sin base, sin claves y
 * sin gastar una generación.
 *
 * ── ⚠️ Las tres cosas que NO se pueden hacer, y por qué ─────────────────────
 *
 * 1. **Dejar un capítulo con menos de `BLOQUES_MIN` pedazos.** Es la regla con
 *    la que `leerCapitulos` descarta: un capítulo que queda corto no se guarda
 *    mal, se guarda bien y **desaparece la próxima vez que se lee**. Todo lo de
 *    abajo se corre un lugar y el texto del 4 sale abajo del título del 3 — un
 *    PDF perfecto que dice cualquier cosa. Es el mismo desastre que cuida
 *    `ebook-temario`, entrando por la otra puerta.
 *
 * 2. **Agregar o quitar capítulos.** El capítulo escrito Nº 3 es el de la
 *    entrada Nº 3 del temario, por su posición y por nada más. Acá se corrige
 *    lo que hay; los capítulos se agregan en el temario, antes de escribir.
 *
 * 3. **Descartar algo en silencio.** `normalizarCapitulo` sí lo hace, y ahí
 *    está bien: del otro lado hay un modelo y lo que se pierde lo escribió una
 *    máquina. Acá del otro lado hay una persona que acaba de escribir eso.
 *
 * ── ⚠️ Y lo que esto NO hace: el PDF ───────────────────────────────────────
 *
 * Guardar el texto **no rehace el archivo**. El PDF que está colgado del
 * producto es el de antes, y quien compre va a recibir ése hasta que se arme de
 * nuevo. Por eso la ruta baja el estado de `LISTO` a `COMPLETO` al guardar: el
 * ebook vuelve a ser "escrito pero sin archivo", que es exactamente lo que es.
 */

/**
 * En qué estados hay texto para corregir.
 *
 * `INDICE` no está porque todavía no se escribió nada — ahí lo que se edita es
 * el temario, que es otra pantalla. Los demás sí, incluso `FALLADO`: un ebook
 * que se cortó a la mitad tiene capítulos escritos y pagados, y no poder
 * tocarlos no protege a nadie.
 */
export const ESTADOS_CON_TEXTO = ["ESCRIBIENDO", "COMPLETO", "LISTO", "FALLADO"] as const;

export function sePuedeEditarElTexto(estado: string): boolean {
  return (ESTADOS_CON_TEXTO as readonly string[]).includes(estado);
}

/** Lo que hay guardado hoy, que es contra lo que se compara lo que llegó. */
export type LoQueHayEscrito = {
  /** Los capítulos escritos, tal como los lee `leerCapitulos`. */
  capitulos: CapituloEscrito[];
};

export type RevisionDelTexto =
  | { ok: true; capitulos: CapituloEscrito[] }
  | { ok: false; error: string };

/**
 * Cómo se llama cada pedazo, y para qué sirve.
 *
 * Los nombres del código no son los de nadie: "aviso" y "vineta" no le dicen a
 * quien está corrigiendo su ebook qué va a salir dibujado. Y están acá y no en
 * la pantalla porque los mensajes de error también los nombran — un mismo
 * pedazo tiene que llamarse igual en el botón que lo crea y en el aviso que
 * dice que quedó vacío.
 */
/**
 * Qué pedazo del ebook se está mirando.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE UNE LAS DOS COLUMNAS DEL EDITOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A la izquierda se escribe y a la derecha se ve cómo queda. Hasta acá eran dos
 * cosas que miraban lo mismo sin conocerse: se veía un párrafo mal escrito en la
 * previa y había que **buscarlo a mano** en la lista de la izquierda — abrir el
 * capítulo, contar los pedazos, adivinar cuál era. Con diez capítulos de quince
 * pedazos, encontrar el que se está mirando es el trabajo.
 *
 * Con esto, tocar algo en la previa abre su capítulo y lleva el cursor a su
 * campo; y al revés, escribir en un campo lo marca en la previa. Es un solo
 * dato, arriba de las dos columnas, porque las dos lo tienen que mirar.
 *
 * Vive en este archivo —y no en la pantalla— porque lo usan tres componentes
 * distintos y porque comparar dos selecciones tiene una sola forma correcta:
 * `mismoPedazo`.
 */
export type Seleccion =
  | { que: "tapa" }
  | { que: "foto"; capitulo: number }
  | { que: "titulo"; capitulo: number }
  | { que: "bloque"; capitulo: number; bloque: number };

/** Si dos selecciones son la misma. */
export function mismoPedazo(a: Seleccion | null, b: Seleccion | null): boolean {
  if (!a || !b || a.que !== b.que) return false;
  if (a.que === "tapa") return true;
  if (a.que === "bloque" && b.que === "bloque") {
    return a.capitulo === b.capitulo && a.bloque === b.bloque;
  }
  /* Los otros dos casos sólo tienen capítulo. */
  return "capitulo" in a && "capitulo" in b && a.capitulo === b.capitulo;
}

/** De qué capítulo es una selección, o `null` si es de la tapa. */
export function deQueCapitulo(s: Seleccion | null): number | null {
  if (!s || s.que === "tapa") return null;
  return s.capitulo;
}

export const COMO_SE_LLAMA_EL_BLOQUE: Record<TipoDeBloque, {
  nombre: string;
  explica: string;
}> = {
  subtitulo: { nombre: "Subtítulo", explica: "Parte el capítulo cuando cambia de tema." },
  parrafo: { nombre: "Párrafo", explica: "El texto corrido. Es casi todo el ebook." },
  vineta: { nombre: "Viñeta", explica: "Un renglón de una lista, con su bolita." },
  aviso: { nombre: "Recuadro", explica: "El dato que va aparte, en un recuadro de color." },
};

/**
 * Lo que llegó del navegador, dejado en capítulos que se pueden guardar — o el
 * motivo, escrito para que se pueda mostrar tal cual.
 *
 * ⚠️ Devuelve **la lista entera para guardar**, no sólo lo que llegó. Si la
 * cadena escribió un capítulo más mientras la persona corregía, lo que llegó
 * son los primeros y los de abajo se mantienen tal cual: se pisa lo que se
 * corrigió y no lo que se escribió en el medio. Sin esto, guardar mientras se
 * escribe **borraría** el capítulo recién escrito, que costó plata.
 */
export function revisarTexto(recibido: unknown, hay: LoQueHayEscrito): RevisionDelTexto {
  if (!recibido || typeof recibido !== "object") {
    return { ok: false, error: "No llegó el texto." };
  }
  const c = recibido as Record<string, unknown>;

  if (!Array.isArray(c.capitulos)) {
    return { ok: false, error: "No llegó la lista de capítulos." };
  }
  if (c.capitulos.length === 0) {
    return { ok: false, error: "No llegó ningún capítulo." };
  }

  /* Ver el punto 2: acá se corrige lo que hay. Un capítulo de más no es un
     capricho del que manda: es una posición que el temario no tiene, y el PDF
     saldría con un capítulo sin título y sin foto. */
  if (c.capitulos.length > hay.capitulos.length) {
    return {
      ok: false,
      error: "Acá se corrige lo que ya está escrito: los capítulos se agregan en el temario, antes de escribirlo.",
    };
  }

  const corregidos: CapituloEscrito[] = [];

  for (let i = 0; i < c.capitulos.length; i++) {
    const numero = i + 1;
    const bruto = c.capitulos[i];
    if (!bruto || typeof bruto !== "object") {
      return { ok: false, error: `El capítulo ${numero} llegó vacío.` };
    }
    const b = bruto as Record<string, unknown>;

    const titulo = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    if (!titulo || titulo.length < 2) {
      return { ok: false, error: `Al capítulo ${numero} le falta el título.` };
    }

    if (!Array.isArray(b.bloques)) {
      return { ok: false, error: `Al capítulo ${numero} le falta el texto.` };
    }
    if (b.bloques.length > BLOQUES_MAX) {
      return {
        ok: false,
        error: `El capítulo ${numero} tiene ${b.bloques.length} pedazos y el máximo es ${BLOQUES_MAX}.`,
      };
    }

    const bloques: Bloque[] = [];
    for (let j = 0; j < b.bloques.length; j++) {
      const crudo = b.bloques[j];
      if (!crudo || typeof crudo !== "object") {
        return { ok: false, error: `El pedazo ${j + 1} del capítulo ${numero} llegó vacío.` };
      }
      const p = crudo as Record<string, unknown>;

      /* ⚠️ Un tipo desconocido NO se arregla poniéndole "parrafo", que es lo
         que hace el lector con lo que manda el modelo. Del otro lado hay una
         pantalla nuestra: si mandó un tipo que no existe, algo está roto y
         taparlo lo deja roto y callado. */
      if (!TIPOS_DE_BLOQUE.includes(p.tipo as TipoDeBloque)) {
        return {
          ok: false,
          error: `El pedazo ${j + 1} del capítulo ${numero} no dice qué clase de pedazo es.`,
        };
      }

      /* Vacío se avisa, no se descarta: quien lo dejó vacío está mirando la
         pantalla y lo que corresponde es decirle que lo borre o lo llene. */
      const texto = limpiarTexto(p.texto, LARGO_BLOQUE);
      if (!texto) {
        return {
          ok: false,
          error: `El ${COMO_SE_LLAMA_EL_BLOQUE[p.tipo as TipoDeBloque].nombre.toLowerCase()} ${j + 1} del capítulo ${numero} quedó vacío. Escribilo o borralo.`,
        };
      }

      bloques.push({ tipo: p.tipo as TipoDeBloque, texto });
    }

    /* ⚠️ Ver el punto 1: esto es lo que impide guardar un capítulo que después
       desaparece solo al leerlo. Se mide sobre los bloques YA LIMADOS, porque
       eso es lo que va a contar el lector: tres pedazos donde dos son espacios
       en blanco son uno para `leerCapitulos`. */
    if (bloques.length < BLOQUES_MIN) {
      return {
        ok: false,
        error: `El capítulo ${numero} quedó con ${bloques.length === 1 ? "un pedazo" : `${bloques.length} pedazos`} y necesita ${BLOQUES_MIN}. Con menos, el capítulo se pierde y el ebook sale con los títulos corridos.`,
      };
    }

    corregidos.push({ titulo, bloques });
  }

  /* Lo que se escribió mientras corregía se mantiene. Ver el aviso de arriba. */
  return { ok: true, capitulos: [...corregidos, ...hay.capitulos.slice(corregidos.length)] };
}

/* ── Las fotos ───────────────────────────────────────────────────────────── */

/**
 * Lo que la pantalla manda de cada foto: con qué buscarla, y cuál se eligió.
 *
 * Van en el mismo guardado que el texto y no en uno aparte, a propósito: es un
 * solo botón para la persona, y del lado del servidor es el mismo candado y la
 * misma escritura. Dos guardados separados abren la puerta a que uno entre y el
 * otro no, y ahí el capítulo queda con el texto nuevo y la foto vieja.
 */
export type FotoRecibida = { frase: string; elegida: unknown };

/** Lo mismo, ya limado: es lo que maneja la pantalla. */
export type FotoDelCapitulo = { frase: string; elegida: FotoElegida | null };

/**
 * La foto de la tapa que llegó del navegador, limada.
 *
 * Se guarda en la raíz del índice, al lado de la promesa. Ver `leerFotoDeTapa`.
 * Si no vino nada en el cuerpo, se devuelve lo que ya había: mandar el texto sin
 * hablar de la tapa no puede borrar la tapa.
 */
export function pegarLaTapa(
  recibido: unknown,
  hay: FotoDelCapitulo,
): FotoDelCapitulo {
  const c = (recibido ?? {}) as Record<string, unknown>;
  const t = c.tapa;
  if (!t || typeof t !== "object") return hay;
  const f = t as Record<string, unknown>;

  return {
    frase: limpiarTexto(f.frase, LARGO_FOTO) ?? "",
    elegida: leerFotoElegida(f.elegida),
  };
}

/**
 * Las fotos corregidas, pegadas al temario que ya está guardado.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL TEMARIO SALE DE LA BASE, NO DEL NAVEGADOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * De lo que llega se toman **dos campos y nada más**: la frase de búsqueda y la
 * foto elegida. El título y el resumen de cada entrada se quedan como están.
 *
 * No es prudencia de más: el resumen es lo único que se lee para escribir un
 * capítulo, y esta pantalla no lo edita —lo edita el temario, antes—. Si acá se
 * aceptara el objeto entero, un pedido armado a mano podría reescribir el
 * temario por la puerta de las fotos, y encima sin pasar por las reglas que
 * cuidan lo ya escrito. Ver `revisarTemario`.
 *
 * Y las de más se ignoran en silencio, que acá sí corresponde: no son algo que
 * alguien escribió, son posiciones que ya no existen porque el temario tiene
 * los capítulos que tiene.
 */
export function pegarLasFotos(
  recibido: unknown,
  indice: CapituloPlaneado[],
): CapituloPlaneado[] {
  const c = (recibido ?? {}) as Record<string, unknown>;
  const fotos = c.fotos;
  if (!Array.isArray(fotos)) return indice;

  return indice.map((entrada, i) => {
    const bruto = fotos[i];
    if (!bruto || typeof bruto !== "object") return entrada;
    const f = bruto as Record<string, unknown>;

    return {
      ...entrada,
      /* Vacía se acepta: es "volvé a buscarla vos", y es lo que había antes de
         que este campo existiera. */
      foto: limpiarTexto(f.frase, LARGO_FOTO) ?? "",
      /* `leerFotoElegida` es el que mira que la dirección sea del banco. Lo que
         no pasa esa mirada vuelve `null`, o sea "buscala vos": una foto a
         medias no puede dejar un capítulo sin nada. */
      fotoElegida: leerFotoElegida(f.elegida),
    };
  });
}
