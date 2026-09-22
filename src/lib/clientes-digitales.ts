import { comisionCongelada } from "@/lib/compra-digital";

/**
 * Tus clientes: quién te compró, cuántas veces, cuánto, y si tiene lo suyo.
 *
 * ── Qué es un cliente ───────────────────────────────────────────────────────
 *
 * Alguien que PAGÓ al menos una vez. Quien abrió el pago y se fue es un
 * carrito (pantalla Carritos), no un cliente: mezclarlos volvería la lista
 * una lista de mails, y esta pantalla es de gente que ya confió.
 *
 * ── Ventas, Clientes y Carritos son la misma cosa vista de tres lados ──────
 *
 * Ventas dice qué se cobró; Clientes, a quién; Carritos, qué se escapó. Por
 * eso acá no se inventa ninguna cuenta: el neto de cada compra es el mismo
 * `comisionCongelada` que Ventas, y "sin bajar" es el mismo permiso con cero
 * descargas y vigente. Dos pantallas que hablan de la misma plata no pueden
 * decir dos números.
 *
 * ── Lo que contesta ─────────────────────────────────────────────────────────
 *
 *   - ¿Quién repite? La gente que compró dos veces es a quien hay que
 *     escribirle cuando sale algo nuevo.
 *   - ¿Quién no tiene lo suyo? Un archivo pago sin bajar es casi siempre el
 *     mail en spam: se le escribe, desde acá, con el texto ya armado.
 *   - ¿Quién pidió que no le escriban más? Se marca y no se le ofrece el
 *     mail. La baja es de la vendedora, no nuestra.
 *
 * Puro: sin base ni React. Lo que toca la base está en la página. Probado en
 * `clientes-digitales.check.ts`.
 */

export const CLIENTES_POR_PAGINA = 25;
export const LARGO_MAXIMO_DE_BUSQUEDA = 120;
/** Hasta cuántos clientes se cuentan para los números de arriba. */
export const TECHO_DE_CLIENTES = 5000;

/**
 * Los filtros. `p` y `sin` son el MISMO segmento que "Mail a tus
 * compradores" (compraron X, y no compraron Y): lo que se filtra acá se le
 * puede escribir allá con un clic, y la cuenta coincide. `f` son los otros
 * dos: quienes repiten, y quienes tienen algo pago sin bajar.
 */
export const FILTROS_DE_CLIENTES = {
  repiten: "Repiten",
  "sin-bajar": "Sin bajar",
} as const;
export type FiltroDeClientes = keyof typeof FILTROS_DE_CLIENTES;

export type ConsultaDeClientes = {
  q: string;
  pagina: number;
  /** Compraron este principal (id crudo: la página lo verifica contra los propios). */
  p: string | null;
  /** …y NO compraron este otro. */
  sin: string | null;
  f: FiltroDeClientes | null;
};

/* Un cuid: lo que la base pone de id. Cualquier otra cosa se ignora. */
const ID_RE = /^c[a-z0-9]{20,30}$/;

export function leerConsultaDeClientes(params: Record<string, string | string[] | undefined>): ConsultaDeClientes {
  const uno = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v; };
  const pagina = Number.parseInt(uno("pagina") ?? "1", 10);
  const id = (k: string) => { const v = uno(k); return v && ID_RE.test(v) ? v : null; };
  const f = uno("f");
  return {
    q: (uno("q") ?? "").trim().slice(0, LARGO_MAXIMO_DE_BUSQUEDA),
    pagina: Number.isInteger(pagina) && pagina > 0 && pagina < 10_000 ? pagina : 1,
    p: id("p"),
    sin: id("sin"),
    f: f && f in FILTROS_DE_CLIENTES ? (f as FiltroDeClientes) : null,
  };
}

export function direccionDeClientes(c: { q?: string; pagina?: number; p?: string | null; sin?: string | null; f?: FiltroDeClientes | null }): string {
  const s = new URLSearchParams();
  if (c.q) s.set("q", c.q);
  if (c.p) s.set("p", c.p);
  if (c.sin) s.set("sin", c.sin);
  if (c.f) s.set("f", c.f);
  if (c.pagina && c.pagina > 1) s.set("pagina", String(c.pagina));
  const qs = s.toString();
  return `/digitales/clientes${qs ? `?${qs}` : ""}`;
}

/** A dónde lleva "Escribirles a estos": Mail a tus compradores con el mismo segmento. */
export function direccionParaEscribirles(c: { p: string | null; sin: string | null }): string {
  const s = new URLSearchParams();
  if (c.p) s.set("p", c.p);
  if (c.sin) s.set("sin", c.sin);
  const qs = s.toString();
  return `/digitales/marketing/compradores${qs ? `?${qs}` : ""}`;
}

/* ── Lo que entra ───────────────────────────────────────────────────────── */

export type CompraCruda = {
  id: string;
  /** CONFIRMED = cobrada; CANCELLED con pago REFUNDED = devuelta. */
  status: string;
  total: number;
  /** Null en órdenes viejas: `comisionCongelada` lo toma como cero. */
  lockedCommissionRate: number | null;
  createdAt: Date;
  items: {
    product: { name: string; rolDigital: string | null };
    descargas: { descargas: number; expiresAt: Date }[];
  }[];
};

export type PersonaCruda = { id: string; name: string | null; email: string; phone: string | null };

/* ── Lo que sale ────────────────────────────────────────────────────────── */

export type CompraDelCliente = {
  id: string;
  fecha: string;
  /** El principal de la compra; si no hay (raro), la primera línea. */
  producto: string;
  estado: "COBRADA" | "DEVUELTA";
  total: number;
  neto: number;
  conUpsell: boolean;
  /** Archivos pagos de esta compra que no bajó y todavía puede bajar. */
  sinBajar: number;
};

export type ClienteEnPantalla = {
  id: string;
  nombre: string | null;
  email: string;
  telefono: string | null;
  compras: number;
  devoluciones: number;
  /** Lo que pagó en las cobradas, y lo que quedó después de la comisión. */
  gasto: number;
  neto: number;
  primera: string;
  ultima: string;
  /** Los principales distintos que compró, del más reciente al más viejo. */
  productos: string[];
  /** Archivos pagos sin bajar y vigentes, en todas sus compras. */
  sinBajar: number;
  /** Pidió no recibir más mails de esta vendedora. */
  dioDeBaja: boolean;
  /** Para el mensaje: el último producto que compró. */
  ultimoProducto: string;
  historial: CompraDelCliente[];
};

const AR_TZ = "America/Argentina/Buenos_Aires";
const calendario = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: AR_TZ });

export function armarCliente(persona: PersonaCruda, compras: CompraCruda[], ahora: Date, dioDeBaja: boolean): ClienteEnPantalla {
  const ordenadas = [...compras].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const historial: CompraDelCliente[] = ordenadas.map((o) => {
    const cobrada = o.status === "CONFIRMED";
    const comision = cobrada ? comisionCongelada(o.total, o.lockedCommissionRate) : 0;
    const principal = o.items.find((i) => i.product.rolDigital === "PRINCIPAL") ?? o.items[0];
    return {
      id: o.id,
      fecha: calendario.format(o.createdAt),
      producto: principal?.product.name ?? "—",
      estado: cobrada ? "COBRADA" : "DEVUELTA",
      total: o.total,
      neto: cobrada ? o.total - comision : 0,
      conUpsell: o.items.some((i) => i.product.rolDigital === "UPSELL"),
      /* Sólo en una cobrada: en una devuelta el permiso se revocó y no hay
         nada que bajar. */
      sinBajar: cobrada ? o.items.flatMap((i) => i.descargas).filter((d) => d.descargas === 0 && d.expiresAt > ahora).length : 0,
    };
  });
  const cobradas = historial.filter((h) => h.estado === "COBRADA");
  const productos = [...new Set(historial.map((h) => h.producto))];
  return {
    id: persona.id,
    nombre: persona.name?.trim() || null,
    email: persona.email,
    telefono: persona.phone,
    compras: cobradas.length,
    devoluciones: historial.length - cobradas.length,
    gasto: cobradas.reduce((s, h) => s + h.total, 0),
    neto: cobradas.reduce((s, h) => s + h.neto, 0),
    primera: historial[historial.length - 1]?.fecha ?? "",
    ultima: historial[0]?.fecha ?? "",
    productos,
    sinBajar: cobradas.reduce((s, h) => s + h.sinBajar, 0),
    dioDeBaja,
    ultimoProducto: historial[0]?.producto ?? "",
    historial,
  };
}

/** Los números de arriba, sobre TODOS los clientes (no sólo la página). */
export type ResumenDeClientes = {
  clientes: number;
  /** Compraron dos veces o más. */
  repiten: number;
  /** Con al menos un archivo pago sin bajar. */
  sinBajar: number;
};

export function resumirClientes(cuentas: { compras: number; sinBajar: number }[]): ResumenDeClientes {
  return {
    clientes: cuentas.length,
    repiten: cuentas.filter((c) => c.compras >= 2).length,
    sinBajar: cuentas.filter((c) => c.sinBajar > 0).length,
  };
}
