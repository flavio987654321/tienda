"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { datosDe, linkAVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";

/**
 * "Explorá por tipo" de Auto Motor (06/10/26). Una tarjeta por cada tipo que la
 * tienda TIENE (autos, camiones, maquinaria…), con la foto de uno de ellos y
 * cuántos hay; abre /vehiculos ya filtrado. Con un solo tipo agrupa por marca:
 * una agencia que sólo vende autos no ve una única tarjeta "Autos".
 */
export function TiposMotor({ productos, opciones, moneda, slug, enEditor, titulo, tinta = "#f4f4f5", tintaSuave = "rgba(255,255,255,0.45)" }: {
  /** El color del título según el fondo que eligió el dueño. */
  tinta?: string;
  tintaSuave?: string;
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  moneda: string;
  slug: string;
  enEditor: boolean;
  titulo: React.ReactNode;
}) {
  const porTipo = opciones.tipos.length > 1;
  const grupos = (porTipo ? opciones.tipos : opciones.marcas).slice(0, 8);
  if (grupos.length < 2) return null;
  const grande = grupos.length >= 5;
  const fotoDe = (valor: string) => productos.find(p => {
    const d = datosDe(p, moneda);
    return (porTipo ? d.tipo : d.claveMarca) === valor && p.images[0];
  })?.images[0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1, color: tinta }}>
          {titulo}
        </h2>
        <span style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: tintaSuave }}>
          {porTipo ? `${grupos.length} tipos` : `${grupos.length} marcas`}
        </span>
      </div>
      {/* Con 5 o más, la primera va grande (2×2); con menos, todas iguales en una fila. */}
      <div className="tp-grilla" style={{ display: "grid", gap: 10, ...({ "--tp-cols": grande ? 4 : grupos.length } as React.CSSProperties) }}>
        {grupos.map((g, i) => {
          const foto = fotoDe(g.valor);
          // La última se estira hasta completar su fila: sin huecos con 3, 6 o 7 tipos.
          // Celular: 2 columnas. Compu: 4, y la primera ocupa 2×2 (4 lugares).
          const ultima = i === grupos.length - 1;
          const sobraCelu = grupos.length % 2;
          const sobraCompu = grande ? (grupos.length + 3) % 4 : 0;
          const vars = {
            "--tp-celu": ultima && sobraCelu ? 2 : 1,
            "--tp-compu": i === 0 && grande ? 2 : ultima && sobraCompu ? 4 - sobraCompu + 1 : 1,
          } as React.CSSProperties;
          return (
            <Link key={g.valor} href={linkAVehiculos(slug, porTipo ? { tipo: g.valor } : { marca: g.valor }, enEditor)}
              className={`tp-item${i === 0 && grande ? " tp-grande" : ""}`}
              style={{ position: "relative", display: "block", overflow: "hidden", borderRadius: 4, background: "#141619",
                textDecoration: "none", color: "#fff", minHeight: 150, border: "1px solid rgba(255,255,255,0.08)", ...vars }}>
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda
                <img src={foto} alt="" loading="lazy" className="tp-foto" onError={e => { e.currentTarget.style.display = "none"; }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,12,14,0.92) 0%, rgba(11,12,14,0.25) 60%, rgba(11,12,14,0.1) 100%)" }} />
              <span style={{ position: "absolute", left: 16, right: 16, bottom: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: "clamp(17px,2vw,22px)", fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, overflowWrap: "anywhere" }}>{g.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
                  {g.cuantos} <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
