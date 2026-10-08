"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, vehicleLocation, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe } from "@/lib/monedaVehiculo";
import { linkWhatsApp } from "@/lib/whatsappTienda";

export function FocoDrive({ p, acento, moneda, href, whatsapp }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  href: string;
  whatsapp: { enabled: boolean; number: string };
}) {
  const datos = [["Año", attr(p, "Año")], ["Kilómetros", attr(p, "Kilómetros")], ["Ubicación", vehicleLocation(p)]]
    .filter((item): item is [string, string] => !!item[1]);
  const wa = whatsapp.enabled ? linkWhatsApp(whatsapp.number, `Hola! Me interesa el ${p.name}. ¿Sigue disponible?`) : null;

  return (
    <>
      <style>{`.fd-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);align-items:stretch}@media(max-width:760px){.fd-grid{grid-template-columns:minmax(0,1fr)}}`}</style>
      <article className="fd-grid" style={{ overflow:"hidden", borderRadius:22, background:"#fff", border:"1px solid #e8ebf0", boxShadow:"0 14px 40px rgba(15,23,42,.08)" }}>
        <Link href={href} aria-label={`Ver ${p.name}`} style={{ position:"relative", display:"block", minHeight:260, background:"#e8ebf0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos cargadas por cada tienda */}
          {p.images[0] ? <img src={p.images[0]} alt={p.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", color:"#64748b", fontSize:14 }}>Vehículo sin foto</span>}
        </Link>
        <div style={{ display:"flex", flexDirection:"column", gap:16, padding:"clamp(22px,4vw,38px)", minWidth:0 }}>
          <p style={{ margin:0, color:acento, fontSize:12, fontWeight:900, letterSpacing:1.5, textTransform:"uppercase" }}>Elegido para destacar</p>
          <h3 style={{ margin:0, color:"#0f172a", fontSize:"clamp(24px,3.3vw,38px)", lineHeight:1.08, fontWeight:900, overflowWrap:"anywhere" }}>{p.name}</h3>
          <p style={{ margin:0, color:"#0f172a", fontSize:"clamp(24px,3vw,32px)", fontWeight:900 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar precio"}</p>
          {datos.length > 0 && <dl style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:12, margin:0 }}>
            {datos.map(([label, value]) => <div key={label} style={{ minWidth:0 }}><dt style={{ color:"#64748b", fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>{label}</dt><dd style={{ margin:"4px 0 0", color:"#0f172a", fontSize:14, fontWeight:700, overflowWrap:"anywhere" }}>{value}</dd></div>)}
          </dl>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:"auto" }}>
            <Link href={href} style={{ minHeight:46, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"0 22px", borderRadius:12, background:acento, color:"#fff", textDecoration:"none", fontWeight:800 }}>Ver vehículo</Link>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={{ minHeight:46, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"0 18px", borderRadius:12, background:"#25d366", color:"#fff", textDecoration:"none", fontWeight:800 }}>Consultar</a>}
          </div>
        </div>
      </article>
    </>
  );
}
