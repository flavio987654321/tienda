import { prisma } from "@/lib/prisma";
import { MAX_OPINIONES_EN_PAGINA, type OpinionPublicada } from "@/lib/opiniones-digitales";

/**
 * Las opiniones verificadas contra la base. Sólo servidor.
 */

const AR_TZ = "America/Argentina/Buenos_Aires";
const mes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: AR_TZ });

/** Las PUBLICADAS de un producto, las últimas primero: lo que se dibuja. */
export async function opinionesPublicadasDe(productId: string): Promise<OpinionPublicada[]> {
  const filas = await prisma.opinionDigital.findMany({
    where: { productId, estado: "PUBLICADA" },
    orderBy: { createdAt: "desc" },
    take: MAX_OPINIONES_EN_PAGINA,
    select: { nombre: true, texto: true, createdAt: true },
  });
  return filas.map((f) => ({ nombre: f.nombre, texto: f.texto, fecha: mes.format(f.createdAt) }));
}

/** Escapar para el HTML del bloque de la landing propia. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * El bloque para el hueco `data-tienda="opiniones"` de la landing propia:
 * HTML simple, sin clases nuestras que choquen con su CSS, con la marca de
 * compra verificada en cada una. Vacío (undefined) si no hay: `armarLanding`
 * saca el hueco.
 */
export function htmlDeOpiniones(opiniones: OpinionPublicada[]): string | undefined {
  if (opiniones.length === 0) return undefined;
  const items = opiniones.map((o) => {
    const inicial = [...o.nombre.trim()][0]?.toUpperCase() ?? "";
    return `<figure style="display:flex;gap:14px;margin:0;padding:18px;border:1px solid rgba(0,0,0,.08);border-radius:14px;background:rgba(255,255,255,.6)">`
      + (inicial ? `<span aria-hidden="true" style="flex:0 0 40px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:rgba(0,0,0,.06)">${esc(inicial)}</span>` : "")
      + `<div style="min-width:0;flex:1"><blockquote style="margin:0;line-height:1.55">${esc(o.texto)}</blockquote>`
      + `<figcaption style="margin-top:10px;font-size:14px;opacity:.75">${esc(o.nombre)} · <b>✓ Compra verificada</b> · ${esc(o.fecha)}</figcaption></div></figure>`;
  });
  return `<div data-tienda-opiniones="" style="display:grid;gap:14px">${items.join("")}</div>`;
}
