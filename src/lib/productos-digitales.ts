import { TOPES_DIGITALES } from "@/lib/planLimits";
import type { TierDigital } from "@/lib/planes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   EL EMBUDO DE UN PRODUCTO DIGITAL
   ══════════════════════════════════════════════════════════════════════════

   Un producto digital, un bono y un upsell son LA MISMA COSA: un archivo con
   título, descripción, precio e imagen. Lo único que cambia es el papel que
   juegan. Por eso viven en la misma tabla y se separan por `rolDigital`.

   No hay tablas nuevas a propósito: dos tablas más —una de bonos y otra de
   upsells— serían dos copias del mismo formulario, de la misma subida de
   archivo y de la misma entrega, y se desincronizan de a una. */

export const ROLES = ["PRINCIPAL", "BONO", "UPSELL"] as const;
export type RolDigital = (typeof ROLES)[number];

/**
 * El rol que llega del navegador, o `null`.
 *
 * `hasOwnProperty` no hace falta acá porque es un array y no un objeto, pero el
 * criterio es el mismo que en `planDe`: una clave que no está en la lista no
 * devuelve nada, nunca un valor por defecto.
 */
export function rolDe(valor: unknown): RolDigital | null {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor)
    ? (valor as RolDigital)
    : null;
}

/**
 * @property corto La palabra del rol, en singular, para el sello de la
 *   miniatura. **No es el título recortado**: aquél es de sección y va en plural
 *   —"Bonos"—, y en la ficha de UNO eso se lee como si esa tarjeta fuera todas.
 *   Existe porque los tres roles se distinguían sólo por el tono del ícono, y
 *   los tres tonos son naranjas.
 */
export const COPY_ROL: Record<RolDigital, { titulo: string; bajada: string; corto: string }> = {
  PRINCIPAL: {
    titulo: "Producto principal",
    bajada: "Es lo que la persona compra. Tiene su propia página de venta.",
    corto: "Principal",
  },
  BONO: {
    titulo: "Bonos",
    bajada: "Van de regalo con la compra. No se cobran: suman valor.",
    corto: "Bono",
  },
  UPSELL: {
    titulo: "Upsells",
    bajada: "Se ofrecen aparte durante la compra, con su propio precio.",
    corto: "Upsell",
  },
};

/**
 * Cuántos de cada cosa permite un plan.
 *
 * `PRINCIPAL` sale de `paginas` porque son el mismo número: cada producto
 * principal tiene su página de venta, así que contar uno es contar el otro. En
 * pantalla se dice **"páginas de venta"** y nunca "tiendas" — la competencia
 * vende tiendas y nosotros no, y prometer lo de ellos sería mentir.
 *
 * Los bonos y los upsells son **por producto principal**, no por cuenta: el tope
 * de Starter son 3 bonos en CADA producto, no 3 en total.
 */
export function topeDe(tier: TierDigital, rol: RolDigital): number {
  const t = TOPES_DIGITALES[tier];
  if (rol === "PRINCIPAL") return t.paginas;
  if (rol === "BONO") return t.bonos;
  return t.upsells;
}

/**
 * Por qué un producto todavía no se puede publicar, o `null` si está listo.
 *
 * Se muestra **adentro de la tarjeta**, no en un panel de errores aparte: el
 * lugar donde se ve el problema tiene que ser el lugar donde se arregla.
 *
 * El orden importa: primero lo que hace imposible la venta (no hay qué
 * entregar), después lo que la hace incobrable (no hay precio). Un producto sin
 * archivo publicado es lo peor que puede pasar en este ecosistema — se cobra y
 * no se entrega nada.
 */
export function loQueFalta(p: {
  rolDigital: string | null;
  archivoPath: string | null;
  price: number;
  name: string;
  /**
   * Si la cuenta tiene Mercado Pago conectado.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ VA ACÁ DESDE EL 08/09/26, Y ES OBLIGATORIO A PROPÓSITO
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Ese día Mercado Pago **salió de la puerta del panel**: la pantalla donde se
   * conecta vive en Configuración, o sea del otro lado de una puerta que lo
   * pedía, y quien todavía no tenía cuenta de MP —hay que crearla y verificar
   * identidad, no es un clic— se quedaba afuera quemando sus siete días de
   * prueba. Ver `PASOS_DE_ADENTRO` en `primeros-pasos`.
   *
   * Al sacarlo de ahí, la red se mueve acá: **se entra al panel y se hace todo,
   * pero no se publica sin cobro.** Sin esto, alguien pondría a la vista una
   * página con dirección propia, la metería en un anuncio, y el botón de
   * comprar contestaría "probá más tarde" — plata gastada en publicidad para
   * una página que no puede cobrar.
   *
   * Y es un campo OBLIGATORIO del tipo, no opcional: opcional, un lugar que se
   * olvida de pasarlo deja de mirar el cobro **sin fallar**, que es exactamente
   * la clase de agujero que no se ve hasta que alguien lo cuenta.
   */
  cobroConectado: boolean;
}): string | null {
  if (!p.name.trim()) return "Falta ponerle un título.";
  if (!p.archivoPath) return "Falta el archivo. Sin él no hay nada que entregar.";
  /* Un bono es gratis por definición, así que no se le pide precio. El upsell y
     el principal sí: con precio 0 se regalarían solos. */
  if (p.rolDigital !== "BONO" && p.price <= 0) return "Falta ponerle precio.";
  /* Último de los cuatro, y no por descuido: es el único que no lastima a
     nadie. Sin archivo se cobra y no se entrega; sin cobro, simplemente no
     entra un peso. Igual no se publica, por lo de arriba. */
  /* ⚠️ El texto DICE DÓNDE se arregla, y no es adorno: es el único de los
     cuatro que no se resuelve en la pantalla donde aparece el cartel. Este
     mensaje estaba escrito así en el checkout y a secas acá; ahora es uno solo,
     para que no queden dos versiones y se corrija una. */
  /* ⚠️ Y el texto vale para los TRES roles. Decía "el botón de comprar no cobra
     nada", y en la tarjeta de un bono eso no se entiende: un bono es gratis y no
     tiene botón de comprar propio — viaja adentro de la compra del principal.
     Visto en el panel el 08/09/26, el mismo día que se escribió. */
  if (!p.cobroConectado) {
    return "Falta conectar Mercado Pago en Configuración → Pagos. Sin eso no se puede cobrar ninguna venta.";
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE SE ESCRIBE A MANO
   ══════════════════════════════════════════════════════════════════════════ */

export const LARGO_TITULO = 140;
export const LARGO_DESCRIPCION = 10000;
/** Cien millones de pesos. Nadie vende un ebook a eso; un cero de más, sí. */
export const PRECIO_MAXIMO = 99_999_999;

/**
 * Si una dirección de imagen es una de las nuestras.
 *
 * La URL llega del navegador —la devuelve `/api/upload`, pero nadie garantiza
 * que el pedido de guardar venga de ahí— y termina adentro de un `<img>` en la
 * página de venta, que abre cualquiera. Sin lista blanca, alguien pone la
 * dirección de un servidor propio y cada visita a esa página le avisa a ese
 * servidor quién entró, desde dónde y cuándo. Es un rastreador puesto por un
 * tercero adentro de nuestra página.
 *
 * Sólo dos formas valen: lo que `/api/upload` guarda en el disco local (en
 * desarrollo) y lo que guarda en el storage de Supabase (en producción).
 */
export const LARGO_URL = 500;

export function imagenValida(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > LARGO_URL) return false;
  if (url.startsWith("/uploads/")) return true;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return Boolean(supabase && url.startsWith(`${supabase}/storage/`));
}

export type CamposProducto = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  comparePrice?: unknown;
};

/**
 * Qué está mal en lo que llegó, o `null` si está todo bien.
 *
 * Vive acá y no adentro de la ruta porque la usan **las dos** que escriben —crear
 * y editar— y la pantalla. Copiada en cada una se desincroniza sola: se agrega
 * una condición al alta y la edición sigue aceptando lo que el alta rechaza,
 * que es exactamente lo que acababa de pasar con el teléfono.
 *
 * Devuelve el problema en castellano porque se muestra tal cual al lado del
 * campo. Un error en inglés o un 400 pelado dejan a la persona adivinando.
 */
export function validarCampos(c: CamposProducto, rol: RolDigital): string | null {
  if (c.name !== undefined) {
    if (typeof c.name !== "string") return "El título no es válido";
    const t = c.name.trim();
    if (t.length < 2) return "El título tiene que tener al menos 2 letras";
    if (t.length > LARGO_TITULO) return `El título no puede pasar de ${LARGO_TITULO} caracteres`;
  }

  if (c.description !== undefined && c.description !== null) {
    if (typeof c.description !== "string") return "La descripción no es válida";
    if (c.description.length > LARGO_DESCRIPCION) {
      return `La descripción no puede pasar de ${LARGO_DESCRIPCION.toLocaleString("es-AR")} caracteres`;
    }
  }

  /* Los precios se revisan con `Number.isFinite` y no con `> 0` a secas: del
     navegador puede llegar `NaN` o `Infinity`, y los dos pasan cualquier
     comparación sin que nadie se entere hasta que el total de un pedido sale en
     "NaN". */
  if (c.price !== undefined) {
    if (typeof c.price !== "number" || !Number.isFinite(c.price)) return "El precio no es un número";
    if (c.price < 0) return "El precio no puede ser negativo";
    if (c.price > PRECIO_MAXIMO) return "Ese precio es demasiado alto";
    // Un bono es gratis por definición; si tuviera precio, no sería un regalo.
    if (rol === "BONO" && c.price !== 0) return "Un bono va gratis: su precio tiene que ser 0";
  }

  if (c.comparePrice !== undefined && c.comparePrice !== null) {
    if (typeof c.comparePrice !== "number" || !Number.isFinite(c.comparePrice)) {
      return "El precio original no es un número";
    }
    if (c.comparePrice < 0) return "El precio original no puede ser negativo";
    if (c.comparePrice > PRECIO_MAXIMO) return "Ese precio original es demasiado alto";
    /* Un "antes" más barato que el "ahora" es un descuento al revés: en pantalla
       queda un número tachado más chico que el que se cobra, y eso no es un
       error de dibujo — es publicidad engañosa. */
    const precio = typeof c.price === "number" ? c.price : null;
    if (precio !== null && c.comparePrice > 0 && c.comparePrice <= precio) {
      return "El precio original tiene que ser mayor que el precio de venta";
    }
  }

  return null;
}
