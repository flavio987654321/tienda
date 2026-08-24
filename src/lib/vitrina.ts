// ─────────────────────────────────────────────────────────────────────────────
// Qué productos muestra el bloque de la portada.
//
// El bloque de la portada es una VITRINA: seis u ocho lugares que se miran todos
// juntos, no una lista. Hasta ahora los llenaba siempre lo mismo —los últimos
// cargados— y no había forma de tocarlo: una tienda con cincuenta productos tenía
// cuarenta y cuatro que no aparecían nunca en la portada.
//
// Vive acá y no adentro de cada template porque los cinco de moda tienen el mismo
// bloque y tenían la misma decisión hardcodeada. Es la misma razón por la que
// existe `masVistos.ts`: cuando cinco archivos copian una regla, la corrección
// llega a tres y nadie se entera de los otros dos.
//
// Antes esto se decidía con la casilla "Destacado" de cada producto. Se sacó: qué
// se ve en una vitrina es una decisión de DISEÑO —se toma mirando el bloque
// entero— y estaba metida en la ficha de cada producto, o sea que armar la
// portada era entrar y salir de cincuenta formularios sin ver nunca el resultado.
// ─────────────────────────────────────────────────────────────────────────────

/** Cómo se llenan los lugares de la vitrina. */
export type ModoVitrina =
  /** Los últimos que se cargaron. Es el que rige si nadie eligió nada. */
  | "recientes"
  /** Los que la dueña eligió a mano, en el orden en que los eligió. */
  | "elegidos"
  /** Sorteados, pero fijos durante todo el día. Ver `semillaDelDia`. */
  | "azar";

export const MODO_VITRINA_POR_DEFECTO: ModoVitrina = "recientes";

/* Cuántos productos se pueden elegir a mano.
 *
 * El tope no es un gusto: la elección se guarda en un `textOverride`, y el
 * esquema le pone 500 caracteres. Un id de producto son ~25, así que arriba de
 * ~19 el guardado empieza a recortar en silencio — y "elegí doce y se guardaron
 * nueve" es de los errores más difíciles de entender.
 *
 * Doce entra cómodo abajo de ese techo (12 × 26 = 312) y alcanza para el bloque
 * más grande que tenemos (nueve, en Casa Clara). */
export const MAX_ELEGIDOS = 12;

export type ProductoParaVitrina = { id: string };

/** Lee la lista guardada. Los ids van separados por coma en un solo override. */
export function leerElegidos(crudo: string | undefined | null): string[] {
  return (crudo ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ELEGIDOS);
}

/** La escribe de vuelta. Inversa exacta de `leerElegidos`. */
export function escribirElegidos(ids: string[]): string {
  return ids.slice(0, MAX_ELEGIDOS).join(",");
}

/** Lee el modo guardado, cayendo al de siempre si es cualquier cosa. */
export function leerModo(crudo: string | undefined | null): ModoVitrina {
  return crudo === "elegidos" || crudo === "azar" ? crudo : MODO_VITRINA_POR_DEFECTO;
}

/* La zona horaria de la tienda. NO la del que ejecuta el código.
 *
 * Acá había un bug fino y sólo de noche. La semilla salía de la fecha LOCAL, y
 * eso da dos respuestas distintas según quién pregunte: el servidor de Vercel
 * corre en UTC y el comprador está en Argentina (UTC-3). Entre las 21:00 y la
 * medianoche de acá, para el servidor ya es mañana. O sea que el servidor dibuja
 * una vitrina, el navegador dibuja otra, y React encuentra que el HTML que
 * recibió no es el que iba: se queja y redibuja el árbol entero.
 *
 * Se fija la zona, así la fecha es la misma la calcule quien la calcule. Y es la
 * correcta además por lo de siempre: la tienda es argentina y el corte del día
 * tiene que caer a la medianoche de acá, no a las 21.
 *
 * Argentina no cambia de hora, así que no hay verano ni invierno que atender. */
const ZONA_TIENDA = "America/Argentina/Buenos_Aires";
/* Se arma UNA vez: construir un Intl.DateTimeFormat es caro y esto lo llama cada
   render de la portada. "en-CA" porque escribe la fecha como AAAA-MM-DD. */
const FECHA_EN_LA_TIENDA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_TIENDA, year: "numeric", month: "2-digit", day: "2-digit",
});

/* La semilla del sorteo: el día de hoy.
 *
 * "Al azar" tenía que ser al azar PERO ESTABLE. Sorteando en cada carga, la dueña
 * recarga tres veces, ve tres portadas distintas y concluye que está roto — y el
 * comprador que vuelve a buscar la remera que vio recién no la encuentra más.
 *
 * Con el día como semilla, la vitrina cambia todos los días y dentro del mismo
 * día es siempre la misma. Se usa la fecha LOCAL y no UTC a propósito: la tienda
 * es argentina y el corte tiene que caer a la medianoche de acá, no a las 21.
 *
 * Se puede pasar una fecha para poder probarlo sin esperar a mañana. */
export function semillaDelDia(hoy: Date = new Date()): number {
  const [a, m, d] = FECHA_EN_LA_TIENDA.format(hoy).split("-").map(Number);
  return a * 10000 + m * 100 + d;
}

/* Un revoltijo determinista.
 *
 * `Math.random()` no sirve: no se le puede fijar la semilla, así que no habría
 * forma de que dos cargas del mismo día den lo mismo.
 *
 * El barajado es Fisher-Yates —el que reparte parejo— con un generador de números
 * pseudoaleatorios sembrado (mulberry32). Ordenar con `sort(() => rand - 0.5)`,
 * que es el truco que aparece primero, NO reparte parejo: deja los primeros
 * elementos cerca del principio, y en una vitrina eso significa que los mismos
 * productos salen casi siempre. */
function mezclar<T>(lista: T[], semilla: number): T[] {
  let s = semilla >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Los productos que van en la vitrina, ya recortados a `cuantos`.
 *
 * Nunca devuelve vacío si hay productos: los tres modos caen a "los últimos
 * cargados" cuando no tienen con qué llenar. Un bloque vacío en la portada se lee
 * como una tienda rota, y es justo lo que pasaría el día que la dueña elige tres
 * productos a mano y después los borra.
 *
 * Los elegidos salen EN EL ORDEN EN QUE LOS ELIGIÓ, no en el de la lista: si armó
 * la vitrina poniendo primero el que más quiere mostrar, ese orden es la decisión.
 * Un id que ya no existe se saltea sin dejar un hueco.
 */
export function productosDeLaVitrina<T extends ProductoParaVitrina>(
  products: T[],
  cuantos: number,
  opciones?: { modo?: ModoVitrina; elegidos?: string[]; hoy?: Date },
): T[] {
  const modo = opciones?.modo ?? MODO_VITRINA_POR_DEFECTO;
  const recientes = products.slice(0, cuantos);

  if (modo === "elegidos") {
    const ids = opciones?.elegidos ?? [];
    const porId = new Map(products.map(p => [p.id, p]));
    const elegidos = ids
      .map(id => porId.get(id))
      .filter((p): p is T => !!p)
      .slice(0, cuantos);
    // Ninguno de los elegidos existe ya (o nunca eligió): antes que un hueco, lo
    // de siempre.
    return elegidos.length > 0 ? elegidos : recientes;
  }

  if (modo === "azar") {
    return mezclar(products, semillaDelDia(opciones?.hoy)).slice(0, cuantos);
  }

  return recientes;
}
