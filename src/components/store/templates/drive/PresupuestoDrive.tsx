"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { filtroAUrl, filtroVacio } from "@/lib/filtroVehiculos";
import { monedaDe, type Moneda } from "@/lib/monedaVehiculo";
import { fmtPrice } from "@/components/store/auto/AutoVehicleShared";

/**
 * "¿Cuánto querés gastar?" de Auto Drive (07/10/26): tramos de precio armados
 * con los precios REALES de la tienda (en la moneda principal), cada uno con
 * cuántos vehículos entran. Abre /vehiculos con el tope puesto. Con menos de
 * cuatro precios no se dibuja: tramos de uno no ayudan a nadie.
 */

/** Redondea para arriba a dos cifras: 28.430.000 → 29.000.000. */
export function redondearArriba(n: number): number {
  if (n <= 0) return 0;
  const paso = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.ceil(n / paso) * paso;
}

export function tramosDePrecio(productos: StorefrontProduct[], principal: Moneda): { hasta: number; cuantos: number }[] {
  const precios = productos.filter(p => p.price > 0 && monedaDe(p, principal) === principal).map(p => p.price).sort((a, b) => a - b);
  if (precios.length < 4) return [];
  const topes = [0.25, 0.5, 0.75].map(q => redondearArriba(precios[Math.min(precios.length - 1, Math.floor(q * precios.length))]));
  const unicos = [...new Set(topes)].filter(t => t < precios[precios.length - 1]);
  return unicos.map(hasta => ({ hasta, cuantos: precios.filter(p => p <= hasta).length })).filter(t => t.cuantos > 0);
}

export function PresupuestoDrive({ productos, principal, slug, enEditor, acento }: {
  productos: StorefrontProduct[];
  principal: Moneda;
  slug: string;
  enEditor: boolean;
  acento: string;
}) {
  const tramos = tramosDePrecio(productos, principal);
  if (!tramos.length) return null;
  const total = productos.filter(p => p.price > 0 && monedaDe(p, principal) === principal).length;
  const link = (hasta: number | null) => {
    const sp = filtroAUrl({ ...filtroVacio(principal), precioHasta: hasta, moneda: principal, orden: hasta ? "precio_desc" : "recientes" }, principal);
    if (enEditor) sp.set("from", "editor");
    const s = sp.toString();
    return `/tienda/${slug}/vehiculos${s ? `?${s}` : ""}`;
  };

  return (
    <ul className="pd-lista" style={{ listStyle: "none", margin: 0, padding: 0, ...({ "--pd-acento": acento } as React.CSSProperties) }}>
      {tramos.map((t, i) => (
        <li key={t.hasta}>
          <Link href={link(t.hasta)} className="pd-item">
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b" }}>Hasta</span>
            <span style={{ display: "block", fontSize: "clamp(20px,2.2vw,26px)", fontWeight: 800, letterSpacing: -0.8, color: "#0f172a", overflowWrap: "anywhere" }}>
              {fmtPrice(t.hasta, principal)}
            </span>
            {/* La barrita: qué parte de lo publicado entra en este tramo. */}
            <span aria-hidden="true" style={{ display: "block", height: 6, borderRadius: 99, background: "#eef0f3", margin: "14px 0 10px", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.max(8, Math.round((t.cuantos / total) * 100))}%`, borderRadius: 99, background: acento, opacity: 0.55 + i * 0.15 }} />
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t.cuantos} {t.cuantos === 1 ? "vehículo" : "vehículos"}
              <span aria-hidden="true" className="pd-flecha">→</span>
            </span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={link(null)} className="pd-item pd-todos">
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Sin tope</span>
          <span style={{ display: "block", fontSize: "clamp(20px,2.2vw,26px)", fontWeight: 800, letterSpacing: -0.8 }}>Ver todos</span>
          <span style={{ display: "block", marginTop: 30, fontSize: 13, fontWeight: 700 }}>{productos.length} vehículos <span aria-hidden="true">→</span></span>
        </Link>
      </li>
    </ul>
  );
}

export const PRESUPUESTO_DRIVE_CSS = `
  .pd-lista { display:grid; gap:12px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  @media(min-width:900px){ .pd-lista { grid-template-columns:repeat(4,minmax(0,1fr)) } }
  .pd-item { display:block; height:100%; box-sizing:border-box; text-decoration:none; background:#fff; border:1px solid #e8ebf0; border-radius:18px; padding:18px;
    transition: border-color .2s, box-shadow .25s }
  .pd-item:hover { border-color: var(--pd-acento); box-shadow:0 12px 30px rgba(15,23,42,.08) }
  .pd-item:hover .pd-flecha { transform: translateX(3px) }
  .pd-flecha { color: var(--pd-acento); transition: transform .2s }
  .pd-item:focus-visible { outline:3px solid var(--pd-acento); outline-offset:2px }
  .pd-todos { background:#0f172a; border-color:#0f172a; color:#fff }
  .pd-todos:hover { border-color:#0f172a }
`;
