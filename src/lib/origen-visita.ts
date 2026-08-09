/**
 * De dónde vino una visita.
 *
 * Es la primera pregunta que hace cualquiera que vende por internet —"¿esto lo
 * trajo Instagram o el WhatsApp que mandé?"— y hasta acá no había forma de
 * contestarla: se guardaba cuántas visitas hubo cada día y nada más.
 *
 * Todo son funciones puras: entra lo que dijo el navegador, sale una etiqueta de
 * una lista cerrada. Los chequeos están en `origen-visita.check.ts`.
 *
 * ── Por qué la lista es cerrada ──────────────────────────────────────────────
 * La etiqueta es parte de la clave de la tabla: una fila por (tienda, día,
 * origen). Si el origen fuera el dominio crudo del referente, un día alguien nos
 * linkea desde cincuenta agregadores distintos y esa tienda pasa a tener
 * cincuenta filas por día para siempre. Con diez etiquetas fijas el tope es
 * diez, y "otro" junta la cola larga.
 *
 * Se pierde el detalle de quién es "otro". Es a propósito: sirve más saber que
 * el 8% viene de algún lado que no controlamos que tener el 8% repartido en
 * treinta filas de 0,2% cada una.
 *
 * ── La limitación que hay que decir en voz alta ──────────────────────────────
 * WhatsApp abre los links en un navegador que en la mayoría de los teléfonos NO
 * manda el referente. O sea que buena parte de lo que en realidad vino de un
 * WhatsApp va a caer en "directo". En Argentina, donde WhatsApp es el canal
 * principal de una tienda chica, eso no es un detalle: es la diferencia entre
 * leer bien el número y sacar la conclusión al revés.
 *
 * El arreglo es del lado de la dueña, no del código: si manda el link con
 * `?utm_source=whatsapp`, se clasifica bien siempre. Por eso los `utm_*` le
 * ganan al referente, y por eso la pantalla lo explica en vez de esconderlo.
 */

/** Las etiquetas que se guardan. Cambiar una rompe el historial ya escrito. */
export const ORIGENES = [
  "directo",
  "whatsapp",
  "instagram",
  "facebook",
  "google",
  "tiktok",
  "youtube",
  "email",
  "tiendaapps",
  "otro",
] as const;

export type Origen = (typeof ORIGENES)[number];

/** Cómo se muestra cada uno. */
export const NOMBRE_ORIGEN: Record<Origen, string> = {
  directo: "Directo",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  tiktok: "TikTok",
  youtube: "YouTube",
  email: "Email",
  tiendaapps: "TiendaApps",
  otro: "Otros sitios",
};

/**
 * Cuánto texto se le acepta al navegador.
 *
 * El referente y el `utm_source` los manda el cliente, así que son texto de
 * cualquiera: sin un tope, un POST con un referente de dos megas hace trabajar
 * al parser al pedo. Una URL real no llega ni cerca de 500.
 */
const LARGO_MAXIMO = 500;

/**
 * El host de una URL, o `null` si no es una URL.
 *
 * Se le saca el `www.` y el `m.` para que `m.facebook.com` y `facebook.com` sean
 * lo mismo, que para esta cuenta lo son.
 */
function hostDe(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^(www|m|mobile)\./, "");
  } catch {
    return null;
  }
}

/** Las reglas, en orden. La primera que engancha, gana. */
const POR_HOST: { origen: Origen; coincide: (host: string) => boolean }[] = [
  // `l.instagram.com` es el redirector de los links del perfil y de las
  // historias, y es por donde llega la mayoría.
  { origen: "instagram", coincide: (h) => h === "instagram.com" || h.endsWith(".instagram.com") },
  { origen: "whatsapp", coincide: (h) => h === "whatsapp.com" || h.endsWith(".whatsapp.com") },
  {
    origen: "facebook",
    coincide: (h) =>
      h === "facebook.com" || h.endsWith(".facebook.com") || h === "fb.me" || h === "fb.com",
  },
  { origen: "tiktok", coincide: (h) => h === "tiktok.com" || h.endsWith(".tiktok.com") },
  { origen: "youtube", coincide: (h) => h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be" },
  // El correo va ANTES que Google, y no es un detalle de orden: `mail.google.com`
  // engancha con la regla de Google, y un click desde un mail que la dueña mandó
  // se contaría como si lo hubiera traído el buscador. Son dos canales
  // completamente distintos y uno de los dos se estaría llevando el crédito.
  {
    origen: "email",
    coincide: (h) =>
      h === "mail.google.com" || h === "mail.yahoo.com" || h.endsWith(".mail.yahoo.com") ||
      h === "outlook.com" || h.endsWith(".outlook.com") || h === "outlook.live.com",
  },
  // Cualquier Google que mande gente: la búsqueda de cada país es un dominio
  // distinto (`google.com.ar`, `google.es`), y `googleusercontent` es el
  // visor de la caché.
  {
    origen: "google",
    coincide: (h) => /(^|\.)google\.[a-z.]+$/.test(h) || h.endsWith(".googleusercontent.com"),
  },
];

/** Lo que dice `utm_source`, normalizado a una etiqueta nuestra. */
const POR_UTM: Record<string, Origen> = {
  whatsapp: "whatsapp", wa: "whatsapp", wsp: "whatsapp",
  instagram: "instagram", ig: "instagram", insta: "instagram",
  facebook: "facebook", fb: "facebook", meta: "facebook",
  google: "google", adwords: "google", googleads: "google",
  tiktok: "tiktok", tt: "tiktok",
  youtube: "youtube", yt: "youtube",
  email: "email", mail: "email", newsletter: "email", mailing: "email",
};

/**
 * Clasifica una visita.
 *
 * @param referente  Lo que el navegador reportó como página anterior.
 * @param utmSource  El `utm_source` de la URL con la que entró.
 * @param hostPropio El host de la tienda, para no contarse a sí misma.
 */
export function clasificarOrigen(
  referente: string | null | undefined,
  utmSource: string | null | undefined,
  hostPropio?: string | null
): Origen {
  // El utm le gana al referente. No es un desempate arbitrario: el referente lo
  // decide el navegador y falta la mitad de las veces (ver el comentario de
  // arriba sobre WhatsApp), mientras que el utm lo puso la dueña a propósito
  // cuando armó el link. Cuando alguien se tomó el trabajo de decir de dónde
  // viene, se le cree.
  if (utmSource) {
    const limpio = utmSource.slice(0, LARGO_MAXIMO).trim().toLowerCase();
    const conocido = POR_UTM[limpio];
    if (conocido) return conocido;
    // Un utm que no reconocemos igual es una campaña: la dueña etiquetó el link,
    // así que esto NO es tráfico directo aunque no sepamos ponerle nombre.
    if (limpio.length > 0) return "otro";
  }

  const crudo = (referente ?? "").slice(0, LARGO_MAXIMO).trim();
  if (crudo.length === 0) return "directo";

  const host = hostDe(crudo);
  // Un referente que no es una URL válida no dice nada. "directo" sería mentir
  // —algo lo mandó— así que va a "otro".
  if (host === null) return "otro";

  // La propia tienda no es una fuente de tráfico: es alguien que ya estaba
  // adentro. Va a "directo" y no a una etiqueta propia porque no hay nada para
  // decidir con eso, y sacarlo del todo dejaría la suma por debajo del total sin
  // explicación.
  //
  // Pasa poco: el cliente deduplica una visita por día por tienda, así que
  // navegar de una página a otra no vuelve a contar. Se ve sobre todo en modo
  // incógnito, donde el dedup no funciona.
  if (hostPropio) {
    const propio = hostPropio.toLowerCase().replace(/^(www|m|mobile)\./, "");
    if (host === propio) return "directo";
  }
  // Una tienda con dominio propio que recibe gente desde el listado de
  // TiendaApps: eso sí es tráfico que trajo la plataforma. En las que viven en
  // tiendaapps.com no se distingue del caso de arriba y cae en "directo".
  if (host === "tiendaapps.com" || host.endsWith(".tiendaapps.com")) return "tiendaapps";

  for (const regla of POR_HOST) {
    if (regla.coincide(host)) return regla.origen;
  }
  return "otro";
}

/**
 * Ordena los orígenes de mayor a menor, con "directo" y "otro" siempre al final.
 *
 * Los dos son bolsas, no canales: nadie decide "voy a invertir más en directo".
 * Arriba tienen que quedar los que sí se pueden mover.
 */
export function ordenarOrigenes<T extends { origen: Origen; visitas: number }>(filas: T[]): T[] {
  const esBolsa = (o: Origen) => o === "directo" || o === "otro";
  return [...filas].sort((a, b) => {
    if (esBolsa(a.origen) !== esBolsa(b.origen)) return esBolsa(a.origen) ? 1 : -1;
    return b.visitas - a.visitas;
  });
}
