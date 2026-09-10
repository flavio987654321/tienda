import { leerDelCache, guardarEnCache } from "@/lib/cache-corto";

/**
 * Videos de stock para los reels de quien vende.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL MISMO BANCO Y LA MISMA CLAVE QUE LAS FOTOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Pexels tiene dos endpoints con la MISMA llave: `/v1/search` para fotos —lo
 * que usa `fotos-pexels`— y `/videos/search` para esto. No hay que contratar
 * nada nuevo ni pagar nada: lo que hay que cuidar es que los dos comparten el
 * mismo tope de pedidos por hora. Un 429 acá deja sin fotos a un ebook que se
 * está armando en la otra punta.
 *
 * Por eso esto NO se llama desde el armado de nada. Es una pantalla que abre
 * quien vende cuando quiere buscar material, con guardarropas por delante.
 *
 * ── ⚠️ Por qué NO se traduce la búsqueda al inglés ─────────────────────────
 *
 * Parecía obvio que convenía: sin `locale`, "car mechanic" trae 7.100 videos y
 * "mecanica del automotor" 1.400. Pero es una comparación tramposa, porque la
 * biblioteca de fotos manda `locale: es-ES` y con eso la misma búsqueda pasa a
 * 3.100. Medido el 10/09/26 con dos rubros:
 *
 *   "panaderia casera"  + es-ES → 5.369 · amasado artesanal, horno de barro
 *   "home bakery bread"        → 8.000 · "close up of breads", cuatro veces
 *
 * O sea que el inglés trae MÁS y no mejor. Lo que de verdad decide es que la
 * frase sea **corta y visual**: "panadería casera" es algo que se ve,
 * "mecánica del automotor" es el nombre de una categoría. Es exactamente la
 * misma lección que está anotada en `ebook-ia` sobre la frase de la foto —
 * buscando por título, "Primeros pasos para arrancar esta semana" trajo una
 * guitarra acústica.
 *
 * Así que se busca en castellano, con el mismo `locale` que las fotos: una
 * sola regla para toda la plataforma en vez de dos que se contradicen.
 */

const RAIZ = "https://api.pexels.com/videos/search";
const ESPERA_BUSQUEDA = 6_000;

/**
 * Cuántos se piden.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SE PIDE EL MÁXIMO, Y SE MUESTRAN DE A POCO — 10/09/26
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Esto pedía 24 con este motivo: *"cada video de más es una miniatura más que
 * el navegador va a bajar; con 80 en pantalla, alguien con datos móviles se
 * come 80 previsualizaciones para mirar cuatro"*.
 *
 * El motivo era bueno y la conclusión estaba mal. **Lo que cuesta cuota es el
 * PEDIDO, no cuántos vengan adentro**: traer 24 y traer 80 cuestan exactamente
 * lo mismo contra el tope de 200 por hora que compartimos con las fotos de los
 * ebooks. Pidiendo 24 estábamos tirando a la basura 56 videos gratis y
 * obligando a otro pedido para ver más.
 *
 * Así que se pide el máximo que la API permite —80— y **la pantalla es la que
 * muestra de a poco**: veinticuatro, y el resto aparece al apretar "Ver más",
 * sin salir a pedir nada. El miedo a las miniaturas se resuelve donde estaba el
 * problema, que era el navegador y no el banco.
 *
 * Es también la respuesta a "cómo hacen las otras plataformas para ofrecer cien
 * videos": no hacen cien pedidos, hacen uno.
 */
const POR_PAGINA = 80;

/** El guardarropas. La misma frase, buscada dos veces, cuesta un pedido. */
const HORAS_DE_CACHE = 24;

/**
 * Un video listo para mostrar y para bajar.
 *
 * ⚠️ `fotografo` y `enlace` NO son adorno: las reglas de la API de Pexels piden
 * acreditar a quien filmó y un enlace visible a Pexels. Es la misma condición
 * que obliga a la hoja de créditos del ebook. Si alguno de los dos falta, el
 * video se descarta acá y no llega a la pantalla — mostrarlo sin poder
 * acreditarlo sería usar la API afuera de sus condiciones.
 */
export type VideoDeStock = {
  id: string;
  /** La imagen de portada, para la grilla. */
  portada: string;
  /** El archivo que se baja, ya elegido: ver `archivoQueConviene`. */
  archivo: string;
  /** Ancho y alto del archivo elegido, para decirlo en la tarjeta. */
  ancho: number;
  alto: number;
  /** Cuánto dura, en segundos. */
  duracion: number;
  fotografo: string;
  /** La página del video en Pexels. El enlace que la licencia pide. */
  enlace: string;
};

export type RespuestaDeVideos = {
  videos: VideoDeStock[];
  /** Cuántos hay en el banco para esa búsqueda, no cuántos se devuelven. */
  total: number;
  /** `true` si el banco contestó 429: nos pasamos del tope compartido. */
  sinCupo: boolean;
  /** `true` si esta instalación no tiene la clave configurada. */
  sinClave: boolean;
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function numero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

type ArchivoDePexels = { link?: unknown; width?: unknown; height?: unknown };

/**
 * De las seis calidades que trae cada video, cuál se ofrece.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ NO SE OFRECE LA MÁS GRANDE, Y NO ES POR AHORRAR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Pexels devuelve el mismo video hasta en 4K (2160×3840). Un reel de Instagram
 * se sube a 1080×1920 y lo que esté por encima **lo recomprime Instagram igual**:
 * la persona bajaría 90 MB para que del otro lado quede lo mismo que con 12.
 * Y lo baja con los datos del celular, que es donde se editan los reels.
 *
 * Así que se elige el más grande que no pase de 1080 de ancho. Si no hubiera
 * ninguno —un video viejo que sólo existe en 4K— se cae al primero antes que
 * dejar a la persona sin nada.
 */
function archivoQueConviene(archivos: ArchivoDePexels[]): ArchivoDePexels | null {
  const validos = archivos.filter((a) => texto(a?.link) && numero(a?.width) > 0);
  if (validos.length === 0) return null;
  const entran = validos.filter((a) => Math.min(numero(a.width), numero(a.height)) <= 1080);
  const mirar = entran.length > 0 ? entran : validos;
  return mirar.reduce((mejor, a) => (numero(a.width) > numero(mejor.width) ? a : mejor));
}

/**
 * Buscar videos en el banco.
 *
 * `vertical` decide la orientación, y no es un detalle: un reel es vertical y
 * un video apaisado recortado a 9:16 deja a la persona sin la mitad de la
 * escena. Se ofrece el apaisado igual porque el mismo material sirve para una
 * publicación o un anuncio, que no son verticales.
 */
/**
 * Hasta qué página se puede pedir.
 *
 * ⚠️ Cada página es un pedido contra el tope compartido con las fotos, así que
 * esto NO puede ser abierto: `?pagina=99999` desde afuera sería una forma de
 * gastarnos la cuota de a un pedido por clic, aun con sesión. Diez páginas son
 * 800 videos de una misma búsqueda — quien no encontró nada en 800 tiene un
 * problema de palabras, no de cantidad, y la salida es buscar otra cosa.
 */
export const MAX_PAGINA = 10;

export async function buscarVideos(
  consulta: string,
  { vertical = true, pagina = 1 }: { vertical?: boolean; pagina?: number } = {},
): Promise<RespuestaDeVideos> {
  const clave = process.env.PEXELS_API_KEY;
  /* Sin clave no es un error: es una instalación que no la configuró. La
     pantalla lo dice con esas palabras en vez de mostrar una grilla vacía. */
  if (!clave) return { videos: [], total: 0, sinCupo: false, sinClave: true };

  const limpia = consulta.trim().slice(0, 120);
  if (!limpia) return { videos: [], total: 0, sinCupo: false, sinClave: false };

  /* La página se acota ACÁ y no en quien llama: es la única puerta al banco, y
     un `Math.floor` de más en la ruta no sirve de nada si mañana alguien llama a
     esta función desde otro lado. `|| 1` ataja el `NaN`. */
  const cual = Math.min(Math.max(Math.floor(pagina) || 1, 1), MAX_PAGINA);

  /* ⚠️ La página va en la clave del guardarropas. Sin esto, la página 2 se
     serviría con lo guardado de la 1 —misma frase, mismo formato— y "ver más"
     devolvería los mismos ochenta videos para siempre. */
  const enElRopero = `videos:${vertical ? "alto" : "ancho"}:${cual}:${limpia.toLowerCase()}`;
  const guardado = await leerDelCache<{ videos: VideoDeStock[]; total: number }>(enElRopero);
  if (guardado && Array.isArray(guardado.videos)) {
    return { videos: guardado.videos, total: guardado.total, sinCupo: false, sinClave: false };
  }

  const parametros = new URLSearchParams({
    query: limpia,
    page: String(cual),
    per_page: String(POR_PAGINA),
    orientation: vertical ? "portrait" : "landscape",
    /* El mismo `locale` que las fotos. Ver el encabezado: sin esto la misma
       búsqueda en castellano trae menos de la mitad. */
    locale: "es-ES",
  });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${RAIZ}?${parametros}`, {
      headers: { Authorization: clave },
      signal: AbortSignal.timeout(ESPERA_BUSQUEDA),
    });
  } catch {
    /* Se cortó o tardó demasiado. Pasa, y no es una falla que valga la pena
       gritar: la pantalla muestra que no vino nada y se vuelve a intentar. */
    return { videos: [], total: 0, sinCupo: false, sinClave: false };
  }

  if (!respuesta.ok) {
    /* ⚠️ 429 es habernos pasado del tope compartido CON LAS FOTOS, y quien
       llama tiene que poder decirlo con esas palabras: si sale "no encontramos
       videos de eso", alguien reescribe la búsqueda veinte minutos sin saber
       que el problema no era la búsqueda. */
    console.error("[videos-pexels] la búsqueda no salió", {
      estado: respuesta.status, consulta: limpia,
    });
    return { videos: [], total: 0, sinCupo: respuesta.status === 429, sinClave: false };
  }

  let cuerpo: { videos?: unknown; total_results?: unknown };
  try {
    cuerpo = (await respuesta.json()) as { videos?: unknown; total_results?: unknown };
  } catch {
    return { videos: [], total: 0, sinCupo: false, sinClave: false };
  }

  const crudos = Array.isArray(cuerpo.videos) ? cuerpo.videos : [];
  const videos: VideoDeStock[] = [];

  for (const v of crudos as Record<string, unknown>[]) {
    const archivos = Array.isArray(v?.video_files) ? (v.video_files as ArchivoDePexels[]) : [];
    const elegido = archivoQueConviene(archivos);
    const portadas = Array.isArray(v?.video_pictures) ? (v.video_pictures as { picture?: unknown }[]) : [];
    const portada = texto(v?.image) || texto(portadas[0]?.picture);
    const id = String(numero(v?.id) || "");
    const usuario = (v?.user ?? {}) as { name?: unknown };
    const fotografo = texto(usuario?.name);
    const enlace = texto(v?.url);

    /* Las cinco cosas o ninguna. Sin autor y enlace no se puede acreditar, y
       sin acreditar no se puede mostrar: es la licencia, no la prolijidad. */
    if (!id || !elegido || !portada || !fotografo || !enlace) continue;

    videos.push({
      id,
      portada,
      archivo: texto(elegido.link),
      ancho: numero(elegido.width),
      alto: numero(elegido.height),
      duracion: Math.round(numero(v?.duration)),
      fotografo,
      enlace,
    });
  }

  const total = numero(cuerpo.total_results);

  /* ⚠️ Se guarda aunque haya vuelto vacía: "de esto no hay videos" también es
     una respuesta, y volver a preguntarla cuesta lo mismo que una que sí trae.
     Es el caso peor — una frase que no existe se reintenta más veces. */
  guardarEnCache(enElRopero, { videos, total }, HORAS_DE_CACHE * 3600);

  return { videos, total, sinCupo: false, sinClave: false };
}
