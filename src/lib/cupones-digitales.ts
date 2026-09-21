/* ══════════════════════════════════════════════════════════════════════════
   CUPONES DE DESCUENTO DE PRODUCTOS DIGITALES
   ══════════════════════════════════════════════════════════════════════════

   Un código que la persona escribe en el checkout y baja el precio. Es de la
   cuenta y puede valer para todas sus páginas o para una. Lo que hay acá es
   lo puro y compartido: cómo se escribe un código, qué es un cupón válido,
   cuánto descuenta y por qué no aplica. Lo usan la pantalla que los crea, la
   ruta que los verifica en el checkout, la ruta que cobra y el checkout mismo
   (para mostrar el precio nuevo con el MISMO cálculo que va a cobrar).

   ── Dónde se decide la plata ───────────────────────────────────────────────

   El descuento se calcula en el servidor al crear la orden, con el cupón
   leído de la base en ese momento. Lo que el navegador manda es el CÓDIGO,
   nunca un monto. La pantalla usa `descuentoDe` para mostrar el precio, pero
   si algo cambió entre que lo vio y pagó (venció, se agotó), la ruta lo
   rechaza y dice por qué.

   ── Qué NO descuenta ───────────────────────────────────────────────────────

   La oferta de después de pagar (el "agregado"): un cupón es para entrar, no
   para el upsell de la pantalla de gracias. Y nunca deja la compra por
   debajo de `MINIMO_A_COBRAR`: Mercado Pago no cobra cero, y un cupón del
   100 % es "regalarlo", que se hace mandando el archivo, no cobrando $0.

   Probado en `cupones-digitales.check.ts`. */

export const TIPOS_DE_CUPON = ["PORCENTAJE", "PESOS"] as const;
export type TipoDeCupon = (typeof TIPOS_DE_CUPON)[number];

/** Letras, números y guiones, en mayúscula. Corto: se escribe en un celular. */
export const CODIGO_RE = /^[A-Z0-9-]{3,20}$/;
/** Reservado para el cupón que crea la oferta de salida. Mismo valor que `codigoDeLaOferta`. */
export const PREFIJO_DE_LA_OFERTA = "SALIDA-";
/** Reservado para el cupón que crea el precio de bienvenida. Mismo valor que `codigoDeBienvenida`. */
export const PREFIJO_DE_BIENVENIDA = "BIENVENIDA-";
export const LARGO_CODIGO = 20;
/** Hasta este porcentaje. El 100 % no es un descuento, es un regalo, y se hace de otra forma. */
export const PORCENTAJE_MAXIMO = 90;
/** Un monto fijo hasta acá: por encima es un error de tipeo, no un cupón. */
export const PESOS_MAXIMOS = 5_000_000;
/** Lo mínimo que puede quedar para cobrar después del descuento. */
export const MINIMO_A_COBRAR = 100;
/** Cupones vivos por cuenta. Con más, la lista deja de ser una lista. */
export const MAX_CUPONES_POR_CUENTA = 50;

export type CuponDigitalPuro = {
  codigo: string;
  tipo: TipoDeCupon;
  valor: number;
  /** Null = todos los principales de la cuenta. */
  productId: string | null;
  venceAt: Date | null;
  topeUsos: number | null;
  usos: number;
  activo: boolean;
};

/** "promo 20" → "PROMO20". Sin espacios ni acentos: es lo que se tipea. */
export function normalizarCodigo(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/\s+/g, "").slice(0, LARGO_CODIGO);
}

/**
 * Lo que llega del panel para crear un cupón, verificado. Devuelve los datos
 * listos para guardar o el problema en castellano.
 */
export function validarCuponNuevo(body: unknown): { ok: true; datos: Omit<CuponDigitalPuro, "usos" | "activo"> } | { ok: false; problema: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const codigo = normalizarCodigo(b.codigo);
  if (!CODIGO_RE.test(codigo)) return { ok: false, problema: "El código lleva entre 3 y 20 letras, números o guiones. Ejemplo: PROMO20" };
  /* `SALIDA-…` es el de la oferta de salida (`codigoDeLaOferta`): lo crea
     esa pantalla y sólo vale con el plazo firmado. Uno escrito a mano con
     ese prefijo no se podría usar nunca, y se mostraría como "de la oferta". */
  if (codigo.startsWith(PREFIJO_DE_LA_OFERTA)) return { ok: false, problema: "Los códigos que empiezan con SALIDA- son de la oferta de salida. Elegí otro." };
  if (codigo.startsWith(PREFIJO_DE_BIENVENIDA)) return { ok: false, problema: "Los códigos que empiezan con BIENVENIDA- son del precio de bienvenida. Elegí otro." };

  const tipo = b.tipo === "PESOS" ? "PESOS" : b.tipo === "PORCENTAJE" ? "PORCENTAJE" : null;
  if (!tipo) return { ok: false, problema: "Elegí si el descuento es un porcentaje o un monto en pesos" };

  const valor = typeof b.valor === "number" ? b.valor : Number.parseInt(String(b.valor ?? ""), 10);
  if (!Number.isInteger(valor) || valor <= 0) return { ok: false, problema: "El descuento tiene que ser un número entero mayor que cero" };
  if (tipo === "PORCENTAJE" && valor > PORCENTAJE_MAXIMO) return { ok: false, problema: `El porcentaje va hasta ${PORCENTAJE_MAXIMO} %. Para regalarlo, mandá el archivo directo.` };
  if (tipo === "PESOS" && valor > PESOS_MAXIMOS) return { ok: false, problema: "Ese monto es demasiado alto" };

  const productId = typeof b.productId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(b.productId) ? b.productId : null;

  let venceAt: Date | null = null;
  if (typeof b.venceAt === "string" && b.venceAt.trim()) {
    /* "YYYY-MM-DD": vence al final de ese día en Argentina (03:00 UTC del siguiente). */
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.venceAt)) return { ok: false, problema: "La fecha de vencimiento no es válida" };
    venceAt = new Date(`${b.venceAt}T23:59:59-03:00`);
    if (Number.isNaN(venceAt.getTime())) return { ok: false, problema: "La fecha de vencimiento no es válida" };
    if (venceAt.getTime() < Date.now()) return { ok: false, problema: "Esa fecha ya pasó" };
  }

  let topeUsos: number | null = null;
  if (b.topeUsos !== undefined && b.topeUsos !== null && b.topeUsos !== "") {
    const t = typeof b.topeUsos === "number" ? b.topeUsos : Number.parseInt(String(b.topeUsos), 10);
    if (!Number.isInteger(t) || t <= 0 || t > 1_000_000) return { ok: false, problema: "El tope de usos tiene que ser un número entero mayor que cero" };
    topeUsos = t;
  }

  return { ok: true, datos: { codigo, tipo, valor, productId, venceAt, topeUsos } };
}

/**
 * Antes de crear un cupón en pesos: a qué productos no les va a aplicar
 * porque dejaría la compra por debajo de `MINIMO_A_COBRAR`. No es un error
 * (la regla la aplica `porQueNoAplica` al pagar): es para avisarlo antes de
 * que la persona lo reparta y nadie pueda usarlo.
 */
export function aQuienesNoLesAlcanza(
  cupon: { tipo: TipoDeCupon; valor: number; productId: string | null },
  productos: { id: string; name: string; price: number }[],
): string[] {
  if (cupon.tipo !== "PESOS" || !(cupon.valor > 0)) return [];
  return productos
    .filter((p) => !cupon.productId || p.id === cupon.productId)
    .filter((p) => p.price - cupon.valor < MINIMO_A_COBRAR)
    .map((p) => p.name);
}

/**
 * Por qué este cupón NO aplica a esta compra, o `null` si aplica. En
 * castellano, para decírselo a quien lo escribió: "venció" es distinto de
 * "es de otro producto".
 */
export function porQueNoAplica(c: CuponDigitalPuro, compra: { productId: string; total: number; ahora?: Date }): string | null {
  const ahora = compra.ahora ?? new Date();
  if (!c.activo) return "Ese cupón ya no está activo.";
  if (c.venceAt && c.venceAt.getTime() < ahora.getTime()) return "Ese cupón venció.";
  if (c.topeUsos !== null && c.usos >= c.topeUsos) return "Ese cupón ya se usó todas las veces que se podía.";
  if (c.productId && c.productId !== compra.productId) return "Ese cupón es para otro producto.";
  if (compra.total - descuentoDe(c, compra.total) < MINIMO_A_COBRAR) return "Ese cupón deja la compra por debajo del mínimo que se puede cobrar.";
  return null;
}

/** Cuánto descuenta sobre un total, en pesos enteros. Nunca más que el total. */
export function descuentoDe(c: Pick<CuponDigitalPuro, "tipo" | "valor">, total: number): number {
  const base = Math.max(0, Math.round(total));
  const d = c.tipo === "PORCENTAJE" ? Math.round((base * c.valor) / 100) : c.valor;
  return Math.min(Math.max(0, Math.round(d)), base);
}

/** "20 %" o "$ 2.000", para la lista y para el renglón del checkout. */
export function textoDelDescuento(c: Pick<CuponDigitalPuro, "tipo" | "valor">): string {
  return c.tipo === "PORCENTAJE"
    ? `${c.valor} %`
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(c.valor);
}

/** En qué anda un cupón, para la lista: vivo, vencido, agotado o apagado. */
export function estadoDelCupon(c: CuponDigitalPuro, ahora = new Date()): "vivo" | "apagado" | "vencido" | "agotado" {
  if (!c.activo) return "apagado";
  if (c.venceAt && c.venceAt.getTime() < ahora.getTime()) return "vencido";
  if (c.topeUsos !== null && c.usos >= c.topeUsos) return "agotado";
  return "vivo";
}
