import { leerDelCache, guardarEnCache } from "@/lib/cache-corto";

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
/**
 * Por qué faltó una foto, para quien arma el PDF.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIN ESTO, UN EBOOK SALÍA SIN FOTOS Y NADIE SE ENTERABA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `buscarFoto` devuelve `null` ante cualquier problema y el molde dibuja un
 * bloque de color en su lugar — eso está bien, un ebook que no se arma es peor
 * que uno sin fotos. Pero el PDF quedaba colgado del producto, listo para
 * vender, con bloques de color donde iban las fotos, y **quien lo hizo creía
 * que ése era el diseño**.
 *
 * Y encima tenía arreglo gratis: rehacer el PDF no gasta ninguna generación,
 * así que media hora después —cuando el tope compartido del banco se libera—
 * salen todas. Nadie podía saberlo porque nadie lo decía.
 *
 * Es un anotador y no un valor devuelto a propósito: quien llama sigue
 * recibiendo la foto o `null`, y esto se pasa sólo si le interesa el motivo.
 */
export type ComoFue = {
  /** El banco contestó 429: nos pasamos del tope compartido de la plataforma. */
  sinCupo: boolean;
  /** Falta configurar la clave. No es problema de quien está vendiendo. */
  sinClave: boolean;
};

/** Un anotador en cero, para empezar. */
export const comoFue = (): ComoFue => ({ sinCupo: false, sinClave: false });

export async function buscarFoto(
  consulta: string,
  { alta = false, usadas, como }: {
    alta?: boolean;
    usadas?: Set<string>;
    /** Dónde anotar por qué no vino, si a quien llama le interesa. */
    como?: ComoFue;
  } = {},
): Promise<FotoDelEbook | null> {
  /* ⚠️ Por la MISMA puerta que la pantalla, que es lo que hace que el
     guardarropas sirva: la frase que alguien ya buscó al elegir sus fotos no se
     vuelve a pedir cuando el armado pasa por acá. Y rehacer el PDF diez veces
     cuesta un pedido, no diez. Ver `preguntarAlBanco`. */
  const { fotos, sinCupo, sinClave } = await preguntarAlBanco(consulta, alta);
  /* Se anota SIEMPRE, aunque después la foto venga bien: alcanza con que una
     sola búsqueda del ebook se haya topado con el tope para que el archivo
     salga incompleto, y eso es lo que hay que poder decir. */
  if (como) {
    if (sinCupo) como.sinCupo = true;
    if (sinClave) como.sinClave = true;
  }
  if (fotos.length === 0) return null;

  /* La primera que no se haya llevado otro capítulo. Si TODAS están usadas
     —dos capítulos con la misma búsqueda y pocos resultados— se repite antes
     que dejar el capítulo sin foto: repetida se ve mejor que vacía. */
  const libre = fotos.find((f) => !usadas?.has(f.id)) ?? fotos[0];
  usadas?.add(libre.id);

  const datos = await bajar(libre.url);
  if (!datos) return null;

  return { datos, fotografo: libre.fotografo, enlace: libre.enlace };
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
/**
 * Cuánto se guarda una búsqueda antes de volver a preguntar.
 *
 * ⚠️ Un día. El banco no cambia sus fotos de un rato para otro, así que una
 * lista de ayer sirve igual — y lo que se ahorra es lo que evita que diez
 * personas eligiendo fotos al mismo tiempo dejen sin pedidos a todos los demás.
 * Ver `cache-corto`.
 */
const HORAS_DE_CACHE = 24;

/** Qué pasó cuando se le preguntó al banco. */
export type RespuestaDelBanco = {
  fotos: FotoCandidata[];
  /** `true` si el banco contestó 429: nos pasamos del tope compartido. */
  sinCupo: boolean;
  /** `true` si esta instalación no tiene la clave configurada. */
  sinClave: boolean;
};

/**
 * Preguntarle al banco, pasando primero por el guardarropas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA ÚNICA PUERTA AL BANCO, Y ESO ES A PROPÓSITO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La usan las dos: la pantalla que muestra la grilla para elegir, y el armado
 * cuando le toca buscar una foto que nadie eligió. Que sea una sola es lo que
 * hace que el guardarropas sirva de verdad — la misma frase, buscada desde la
 * pantalla y después desde el armado, cuesta **un** pedido y no dos.
 *
 * ⚠️ Y distingue "no hay fotos de eso" de "nos quedamos sin pedidos". Son dos
 * cosas completamente distintas y antes las dos salían como una lista vacía: la
 * pantalla decía *"no encontramos fotos de X, probá con otras palabras"* cuando
 * en realidad las palabras estaban bien y el que se había llenado era el tope.
 * Alguien podía pasarse veinte minutos reescribiendo la frase sin saber que no
 * era la frase.
 */
async function preguntarAlBanco(
  consulta: string,
  alta: boolean,
): Promise<RespuestaDelBanco> {
  const clave = process.env.PEXELS_API_KEY;
  /* Sin clave no es un error: es una instalación que todavía no la configuró.
     El ebook sale sin fotos y se entrega igual. */
  if (!clave) return { fotos: [], sinCupo: false, sinClave: true };

  const limpia = consulta.trim().slice(0, 120);
  if (!limpia) return { fotos: [], sinCupo: false, sinClave: false };

  /* La clave del guardarropas: la frase en minúsculas y la orientación. Dos
     personas que escriben lo mismo comparten el pedido. */
  const enElRopero = `fotos:${alta ? "alta" : "ancha"}:${limpia.toLowerCase()}`;
  const guardadas = await leerDelCache<FotoCandidata[]>(enElRopero);
  if (guardadas && Array.isArray(guardadas)) {
    return { fotos: guardadas, sinCupo: false, sinClave: false };
  }

  const parametros = new URLSearchParams({
    query: limpia,
    /* Se piden varias y se elige una: pedir una sola deja sin salida cuando
       ese único resultado ya se lo llevó otro capítulo. */
    per_page: "15",
    orientation: alta ? "portrait" : "landscape",
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
    return { fotos: [], sinCupo: false, sinClave: false };
  }

  if (!respuesta.ok) {
    /* 429 es habernos pasado del tope compartido. Interesa saberlo, y quien
       llama tiene que poder decirlo con esas palabras. */
    console.error("[fotos-pexels] la búsqueda no salió", {
      estado: respuesta.status, consulta: limpia,
    });
    return { fotos: [], sinCupo: respuesta.status === 429, sinClave: false };
  }

  let cuerpo: { photos?: unknown };
  try {
    cuerpo = (await respuesta.json()) as { photos?: unknown };
  } catch {
    return { fotos: [], sinCupo: false, sinClave: false };
  }

  const crudas = Array.isArray(cuerpo.photos)
    ? (cuerpo.photos as (FotoDePexels & { src?: { medium?: unknown; tiny?: unknown } })[])
    : [];

  const fotos: FotoCandidata[] = [];
  for (const f of crudas) {
    const url = texto(f?.src?.large2x) || texto(f?.src?.large) || texto(f?.src?.portrait);
    const chica = texto(f?.src?.medium) || texto(f?.src?.tiny) || url;
    const id = String(f?.id ?? "");
    const fotografo = texto(f?.photographer);
    const enlace = texto(f?.url);
    /* Las cuatro cosas o ninguna: sin autor y enlace no se puede armar la hoja
       de créditos, y esa hoja es la licencia. Ver `leerFotoElegida`. */
    if (!id || !url || !fotografo || !enlace) continue;
    fotos.push({ id, chica, url, fotografo, enlace });
  }

  /* ⚠️ Se guarda aunque haya vuelto vacía. "De esto no hay fotos" también es una
     respuesta, y volver a preguntarla cada vez gasta lo mismo que una que sí
     trae. Era el caso peor: una frase que no existe se reintenta más veces. */
  guardarEnCache(enElRopero, fotos, HORAS_DE_CACHE * 3600);

  return { fotos, sinCupo: false, sinClave: false };
}

export async function buscarCandidatas(
  consulta: string,
  { alta = false }: { alta?: boolean } = {},
): Promise<RespuestaDelBanco> {
  return preguntarAlBanco(consulta, alta);
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
  /* ⚠️ Una foto propia subida EN DESARROLLO llega como ruta relativa
     (`/uploads/…`), porque ahí `/api/upload` guarda en el disco en vez de
     Supabase. `fetch` no sabe qué hacer con una ruta relativa del lado del
     servidor, así que se completa con la dirección de la aplicación. En
     producción la ruta ya viene entera y esto no toca nada. */
  const direccion = f.url.startsWith("/")
    ? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${f.url}`
    : f.url;

  const datos = await bajar(direccion);
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
export async function buscarFotos(
  consultas: string[],
  como?: ComoFue,
): Promise<(FotoDelEbook | null)[]> {
  /* Compartido entre todas: es lo que evita que dos capítulos salgan con la
     misma foto. Se puede compartir aunque las búsquedas vayan en paralelo
     porque elegir y anotar pasa de corrido, sin ningún `await` en el medio. */
  const usadas = new Set<string>();

  return Promise.all(
    consultas.map((c) => buscarFoto(c, { usadas, como }).catch(() => null)),
  );
}
