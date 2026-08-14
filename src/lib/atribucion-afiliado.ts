/**
 * De quién es la venta: se guarda en el navegador, no en la memoria de la
 * pantalla.
 *
 * El problema que resuelve
 * -----------------------
 * El link del afiliado es `/tienda/lo-que-sea?ref=SU-ID`. Ese `ref` se leía y
 * se guardaba en un `useState` — o sea, en la memoria de ESA pantalla. Alcanzaba
 * con que la persona tocara una categoría, "ver todos" o (según la plantilla) un
 * producto para que el navegador cargara una página nueva: la dirección ya no
 * llevaba el `ref`, el estado arrancaba vacío, y la venta dejaba de ser de
 * nadie.
 *
 * No se perdía a veces. Se perdía SIEMPRE que hubiera un cambio de pantalla, y
 * nueve de las once plantillas tienen links de esos. La persona compraba igual,
 * la tienda cobraba igual, y el afiliado no se enteraba de que esa venta había
 * sido suya.
 *
 * Cómo se arregla
 * ---------------
 * El `ref` se guarda apenas entra y se lee después en cada pantalla que puede
 * vender. Sobrevive a recargas, a cerrar la pestaña y a volver mañana.
 *
 * La tienda sale de la URL y no de una prop: todas las pantallas que venden
 * viven bajo `/tienda/<slug>/...`, así que el dato ya está ahí. Eso evita
 * enhebrar el slug por media docena de componentes, que es justo el tipo de
 * cableado que se olvida en la próxima pantalla que alguien agregue.
 *
 * Se guarda una entrada POR TIENDA. Con una sola, quien abre el link de dos
 * afiliados distintos pisaba el primero, y al volver a la primera tienda esa
 * venta ya no era de nadie.
 *
 * Gana el último link: si la persona entra por dos afiliados de la MISMA tienda,
 * cobra el que la trajo la última vez. Es lo que hace toda la industria, y es lo
 * defendible — es el que estaba empujando cuando decidió comprar.
 *
 * Guardarlo acá no lo hace confiable: cualquiera puede editar lo que hay en su
 * navegador. Por eso el servidor igual comprueba que ese afiliado exista, esté
 * activo y sea DE ESA TIENDA, tanto en el cobro como en las consultas. Esto sólo
 * decide a quién proponer, nunca a quién pagarle.
 */

/** 30 días, la ventana habitual en los programas de afiliados. */
const DIAS_DE_VENTANA = 30;
const CLAVE = "tiendaapps:afiliado";

type Guardado = Record<string, { id: string; vence: number }>;

/** El slug de la tienda que se está mirando, sacado de la propia dirección. */
function slugDeLaUrl(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/tienda\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/* Todo lo que toca `localStorage` va con try/catch: en Safari en modo privado
   —y con algunas configuraciones de cookies— leer o escribir TIRA en vez de
   devolver vacío. Sin esto, una tienda entera se caía en pantalla blanca por no
   poder guardar de quién era la comisión. */
function leerTodo(): Guardado {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return {};
    const dato = JSON.parse(crudo);
    return dato && typeof dato === "object" ? (dato as Guardado) : {};
  } catch {
    return {};
  }
}

/** Anota que esta visita la trajo este afiliado. */
export function recordarAfiliado(affiliateId: string): void {
  const slug = slugDeLaUrl();
  if (!slug || !affiliateId) return;
  try {
    const todo = leerTodo();
    const ahora = Date.now();
    // De paso se limpian las vencidas: si no, el registro crece para siempre en
    // el navegador de alguien que entra a muchas tiendas.
    for (const [k, v] of Object.entries(todo)) {
      if (!v || typeof v.vence !== "number" || v.vence <= ahora) delete todo[k];
    }
    todo[slug] = { id: affiliateId, vence: ahora + DIAS_DE_VENTANA * 24 * 60 * 60 * 1000 };
    window.localStorage.setItem(CLAVE, JSON.stringify(todo));
  } catch {
    /* Sin lugar donde guardar, la atribución dura lo que dure la pantalla.
       Es exactamente como funcionaba antes: se pierde una comisión, no la venta. */
  }
}

/** Quién trajo a esta persona a la tienda que está mirando. */
export function afiliadoDeEstaTienda(): string | null {
  const slug = slugDeLaUrl();
  if (!slug) return null;
  const entrada = leerTodo()[slug];
  if (!entrada || typeof entrada.id !== "string") return null;
  if (typeof entrada.vence !== "number" || entrada.vence <= Date.now()) return null;
  return entrada.id;
}
