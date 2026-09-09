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
 * Lo que se le muestra a alguien para que elija una foto.
 *
 * Es lo mismo que `FotoDelEbook` pero **sin la imagen**: acá viajan direcciones,
 * no bytes. La chica es para la grilla del editor y la grande es la que va a
 * bajar el armado cuando haga el PDF.
 */
export type FotoCandidata = {
  id: string;
  /** La miniatura, para la grilla. Pesa poco: se muestran quince. */
  chica: string;
  /** La buena, la que se guarda y baja el armado. */
  url: string;
  fotografo: string;
  enlace: string;
};

/**
 * Buscar fotos para elegir a mano, sin bajar ninguna.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO BAJA NADA, Y ESA ES LA DIFERENCIA CON `buscarFoto`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Aquella busca y **se trae la imagen**, porque quien la llama está armando el
 * PDF y necesita los bytes. Ésta la llama una pantalla para mostrar una grilla:
 * bajar quince imágenes por búsqueda a través de nuestro servidor sería pagar
 * el tránsito de todo lo que alguien descarta mientras elige. Van las
 * direcciones y las baja el navegador, que es lo que hace un navegador.
 *
 * ⚠️ Devuelve la miniatura Y la grande. La grande es la que se guarda: la
 * miniatura de Pexels mide 280 px y adentro de un PDF, en una banda de media
 * hoja, se ve como una foto rota.
 */
export async function buscarCandidatas(
  consulta: string,
  { alta = false }: { alta?: boolean } = {},
): Promise<FotoCandidata[]> {
  const clave = process.env.PEXELS_API_KEY;
  if (!clave) return [];

  const limpia = consulta.trim().slice(0, 120);
  if (!limpia) return [];

  const parametros = new URLSearchParams({
    query: limpia,
    orientation: alta ? "portrait" : "landscape",
    per_page: "15",
    locale: "es-ES",
  });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${RAIZ}?${parametros}`, {
      headers: { Authorization: clave },
      signal: AbortSignal.timeout(ESPERA_BUSQUEDA),
    });
  } catch {
    return [];
  }

  if (!respuesta.ok) {
    console.error("[fotos-pexels] la búsqueda para elegir no salió", {
      estado: respuesta.status, consulta: limpia,
    });
    return [];
  }

  let cuerpo: { photos?: unknown };
  try {
    cuerpo = (await respuesta.json()) as { photos?: unknown };
  } catch {
    return [];
  }

  const fotos = Array.isArray(cuerpo.photos)
    ? (cuerpo.photos as (FotoDePexels & { src?: { medium?: unknown; tiny?: unknown } })[])
    : [];

  const salida: FotoCandidata[] = [];
  for (const f of fotos) {
    const url = texto(f?.src?.large2x) || texto(f?.src?.large) || texto(f?.src?.portrait);
    const chica = texto(f?.src?.medium) || texto(f?.src?.tiny) || url;
    const id = String(f?.id ?? "");
    const fotografo = texto(f?.photographer);
    const enlace = texto(f?.url);
    /* Las cuatro cosas o ninguna: sin autor y enlace no se puede armar la hoja
       de créditos, y esa hoja es la licencia. Ver `leerFotoElegida`. */
    if (!id || !url || !fotografo || !enlace) continue;
    salida.push({ id, chica, url, fotografo, enlace });
  }
  return salida;
}

/**
 * Bajar una foto que ya se eligió, por su dirección.
 *
 * ⚠️ Quien llama tiene que haberla leído con `leerFotoElegida`, que es lo que
 * comprueba que la dirección sea del banco. Acá no se vuelve a mirar: esto es
 * el que baja, no el que decide.
 */
export async function bajarElegida(f: {
  url: string; fotografo: string; enlace: string;
}): Promise<FotoDelEbook | null> {
  const datos = await bajar(f.url);
  if (!datos) return null;
  return { datos, fotografo: f.fotografo, enlace: f.enlace };
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
