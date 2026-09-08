/**
 * Las fotos del ebook.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTO NUNCA PUEDE ROMPER UN EBOOK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Todo acá adentro devuelve `null` cuando algo sale mal —no hay clave, Pexels
 * no contesta, la foto no baja, el tema no existe— y **nunca tira una
 * excepción**. El motivo es simple: el ebook ya está escrito y pagado cuando
 * se llega a este archivo. Que no se consiga una foto tiene que salir un PDF
 * sin foto, no un error que deje a la persona sin nada.
 *
 * El molde del PDF dibuja bloques de color donde no hay foto, así que un ebook
 * sin ninguna foto sigue siendo el que se entregaba hasta ahora.
 *
 * ── ⚠️ Pexels PIDE QUE SE LOS NOMBRE ──────────────────────────────────────
 *
 * La licencia de sus fotos no exige atribución, pero **las reglas de su API
 * sí**: hay que mostrar un enlace visible a Pexels y acreditar a quien sacó la
 * foto. Por eso cada foto vuelve con `fotografo` y `enlace`, y por eso el PDF
 * arma una hoja de créditos al final. No es un adorno: sin eso estamos usando
 * la API fuera de sus condiciones, en un archivo que además se vende.
 */

/** Lo que se guarda de cada foto: la imagen y a quién hay que nombrar. */
export type FotoDelEbook = {
  datos: Buffer;
  /** Quien la sacó. Va en la hoja de créditos. */
  fotografo: string;
  /** La página de la foto en Pexels. También va en los créditos. */
  enlace: string;
};

/**
 * Cuánto se espera y cuánto se acepta.
 *
 * ⚠️ Los segundos no son un número al azar: **armar el PDF entra en una
 * función que se corta a los 60**, y ahí adentro hay que buscar y bajar una
 * foto por capítulo. Con diez capítulos, seis segundos por foto ya son 60.
 * Por eso se buscan todas a la vez y por eso cada una tiene su propio tope: la
 * que se cuelga se abandona y su capítulo sale sin foto, en vez de arrastrar
 * al resto.
 */
const ESPERA_BUSQUEDA = 6_000;
const ESPERA_BAJADA = 9_000;
/** Una foto más pesada que esto no entra: son 10 en un archivo que se descarga. */
const PESO_MAXIMO = 3_500_000;

const RAIZ = "https://api.pexels.com/v1/search";

type FotoDePexels = {
  id?: unknown;
  photographer?: unknown;
  url?: unknown;
  src?: { large2x?: unknown; large?: unknown; portrait?: unknown };
};

/** El texto de un campo que vino de una API ajena, o `""`. */
function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Buscar una foto y bajarla.
 *
 * `consulta` es de qué tiene que ser la foto. `alta` pide una vertical grande
 * —la de la tapa, que ocupa la hoja entera—; sin eso alcanza con una apaisada
 * para la franja de arriba de cada capítulo.
 *
 * `usadas` es el conjunto de fotos que ya se llevó otro capítulo de este mismo
 * ebook. Quien la encuentra la anota ahí.
 *
 * ⚠️ Antes esto era un `salto`: al capítulo N se le daba el resultado número N,
 * para que no se repitieran. **Costaba relevancia y no hacía falta**: Pexels
 * ordena por lo que mejor coincide, así que al capítulo 9 le tocaba el noveno
 * resultado —el peor de los diez— aunque el primero estuviera libre. Medido: la
 * búsqueda "papeles y sello sobre escritorio" devolvía flores secas.
 *
 * Ahora se agarra el PRIMERO que no se haya usado. La repetición se evita
 * igual, y el que no repite se lleva la mejor.
 */
export async function buscarFoto(
  consulta: string,
  { alta = false, usadas }: { alta?: boolean; usadas?: Set<string> } = {},
): Promise<FotoDelEbook | null> {
  const clave = process.env.PEXELS_API_KEY;
  /* Sin clave no es un error: es una instalación que todavía no la configuró.
     El ebook sale sin fotos y se entrega igual. */
  if (!clave) return null;

  const limpia = consulta.trim().slice(0, 120);
  if (!limpia) return null;

  const parametros = new URLSearchParams({
    query: limpia,
    orientation: alta ? "portrait" : "landscape",
    /* Se piden varias y se elige una: pedir una sola deja sin salida cuando
       ese único resultado ya se lo llevó otro capítulo. */
    per_page: "15",
    /* Pexels entiende castellano, y las búsquedas salen del texto que escribió
       quien vende. Sin esto, "panadería casera" trae mucho menos. */
    locale: "es-ES",
  });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${RAIZ}?${parametros}`, {
      headers: { Authorization: clave },
      signal: AbortSignal.timeout(ESPERA_BUSQUEDA),
    });
  } catch {
    /* Se cortó o tardó demasiado. No se anota como error grave: pasa, y el
       ebook sigue. */
    return null;
  }

  if (!respuesta.ok) {
    /* 429 es habernos pasado del tope del mes. Interesa saberlo. */
    console.error("[fotos-pexels] la búsqueda no salió", {
      estado: respuesta.status, consulta: limpia,
    });
    return null;
  }

  let cuerpo: { photos?: unknown };
  try {
    cuerpo = (await respuesta.json()) as { photos?: unknown };
  } catch {
    return null;
  }

  const fotos = Array.isArray(cuerpo.photos) ? (cuerpo.photos as FotoDePexels[]) : [];
  if (fotos.length === 0) return null;

  /* La primera que no se haya llevado otro capítulo. Si TODAS están usadas
     —dos capítulos con la misma búsqueda y pocos resultados— se repite antes
     que dejar el capítulo sin foto: repetida se ve mejor que vacía. */
  const libre = fotos.find((f) => !usadas?.has(String(f?.id ?? ""))) ?? fotos[0];
  usadas?.add(String(libre?.id ?? ""));

  const direccion =
    texto(libre?.src?.large2x) || texto(libre?.src?.large) || texto(libre?.src?.portrait);
  if (!direccion) return null;

  const datos = await bajar(direccion);
  if (!datos) return null;

  return {
    datos,
    fotografo: texto(libre?.photographer),
    enlace: texto(libre?.url),
  };
}

/**
 * Bajar la imagen.
 *
 * ⚠️ Se corta por peso ANTES de guardarla entera en memoria. Una respuesta de
 * 80 MB —un servidor con un mal día, una dirección que devuelve otra cosa— se
 * traga la memoria de la función que está armando el PDF y se lleva puesto el
 * ebook. Se lee de a pedazos y se abandona apenas se pasa.
 */
async function bajar(direccion: string): Promise<Buffer | null> {
  let respuesta: Response;
  try {
    respuesta = await fetch(direccion, { signal: AbortSignal.timeout(ESPERA_BAJADA) });
  } catch {
    return null;
  }
  if (!respuesta.ok || !respuesta.body) return null;

  /* Sólo lo que pdfkit sabe dibujar. Un SVG o un webp no los abre y hace
     fallar el armado entero. */
  const tipo = respuesta.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png)$/i.test(tipo.split(";")[0].trim())) return null;

  const pedazos: Buffer[] = [];
  let total = 0;
  try {
    for await (const pedazo of respuesta.body as unknown as AsyncIterable<Uint8Array>) {
      total += pedazo.byteLength;
      if (total > PESO_MAXIMO) return null;
      pedazos.push(Buffer.from(pedazo));
    }
  } catch {
    return null;
  }

  return total > 0 ? Buffer.concat(pedazos) : null;
}

/**
 * Las fotos de un ebook entero, todas a la vez.
 *
 * ⚠️ **En paralelo y no en fila.** Una atrás de otra, diez fotos a dos
 * segundos cada una son veinte segundos de los sesenta que hay para todo el
 * armado. Juntas tardan lo que tarda la más lenta.
 *
 * Devuelve un arreglo del mismo largo que `consultas`, con `null` en las que
 * no se consiguieron: quien dibuja necesita saber qué capítulo se quedó sin
 * foto, y un arreglo más corto le correría todas las demás de lugar.
 */
export async function buscarFotos(consultas: string[]): Promise<(FotoDelEbook | null)[]> {
  /* Compartido entre todas: es lo que evita que dos capítulos salgan con la
     misma foto. Se puede compartir aunque las búsquedas vayan en paralelo
     porque elegir y anotar pasa de corrido, sin ningún `await` en el medio. */
  const usadas = new Set<string>();

  return Promise.all(
    consultas.map((c) => buscarFoto(c, { usadas }).catch(() => null)),
  );
}
