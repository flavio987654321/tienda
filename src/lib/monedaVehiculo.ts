/**
 * La moneda de cada vehículo (06/10/26).
 *
 * En Argentina una agencia publica los usados en dólares y los 0 km en pesos,
 * a la vez. La tienda tiene una moneda principal (Configuración → la de
 * `storeConfig.currency`) y cada vehículo puede cambiarla por la suya.
 *
 * Se guarda como un atributo interno, "Moneda" = "USD" | "ARS", igual que la
 * ficha técnica: sin columna nueva. Sin el atributo, vale la principal.
 *
 * Lo que va en la moneda DEL VEHÍCULO: su precio, el de lista, el de venta y
 * sus gastos (el margen se calcula entre ellos). Lo que sigue en la principal:
 * las búsquedas guardadas y las ofertas de tasación.
 *
 * Sin nada de servidor: lo usan la tienda, el panel y las rutas.
 */

export const CLAVE_MONEDA = "Moneda";

export type Moneda = "ARS" | "USD";

export const esMoneda = (v: unknown): v is Moneda => v === "ARS" || v === "USD";

/** La moneda principal desde `storeConfig` (texto o ya leído). Pesos si no dice. */
export function monedaDeTienda(storeConfig: string | { currency?: unknown } | null | undefined): Moneda {
  let c: unknown = undefined;
  if (typeof storeConfig === "string") {
    try { c = (JSON.parse(storeConfig || "{}") as { currency?: unknown })?.currency; } catch { /* pesos */ }
  } else c = storeConfig?.currency;
  return c === "USD" ? "USD" : "ARS";
}

type ConAtributos = { attributes?: unknown };

/** Los atributos llegan como lista (tienda) o como texto JSON (base). */
function listaDeAtributos(a: unknown): { key: string; value: unknown }[] {
  let l = a;
  if (typeof l === "string") { try { l = JSON.parse(l); } catch { return []; } }
  return Array.isArray(l) ? l.filter((x) => x && typeof x.key === "string") : [];
}

/** La moneda de un vehículo: la suya si la tiene, si no la principal. */
export function monedaDe(p: ConAtributos | null | undefined, principal: string | null | undefined): Moneda {
  const v = listaDeAtributos(p?.attributes).find((x) => x.key === CLAVE_MONEDA)?.value;
  if (esMoneda(v)) return v;
  return principal === "USD" ? "USD" : "ARS";
}

/** "USD 25.000" / "$30.000.000". El signo va adelante: "-$500.000". */
export function precioEn(n: number, moneda: string | null | undefined): string {
  return (n < 0 ? "-" : "") + (moneda === "USD" ? "USD " : "$") + Math.abs(n).toLocaleString("es-AR");
}

/** Ordenar por precio sin tipo de cambio: primero pesos, después dólares; adentro, por precio. */
export function compararPrecio(a: { price: number; moneda: Moneda }, b: { price: number; moneda: Moneda }, sube = true): number {
  if (a.moneda !== b.moneda) return a.moneda === "ARS" ? -1 : 1;
  return sube ? a.price - b.price : b.price - a.price;
}

/* ── Cifras con puntos en los campos ───────────────────────────────────────── */

/** "30000000" → "30.000.000" para mostrar en un campo. Sólo enteros. */
export function conPuntos(digitos: string): string {
  const d = digitos.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Lo que se escribió ("30.000.000", "30000000") → "30000000". */
export const sinPuntos = (v: string) => v.replace(/\D/g, "");
