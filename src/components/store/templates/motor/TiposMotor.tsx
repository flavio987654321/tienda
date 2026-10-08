"use client";
import Link from "next/link";
import { useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { datosDe, linkAVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { useEditContext } from "@/contexts/EditContext";

function TarjetaTipo({ g, href, foto, campoFoto, editando, posX, posY, cambiarEncuadre }: {
  g: { valor: string; label: string; cuantos: number };
  href: string;
  foto?: string;
  campoFoto: string;
  editando: boolean;
  posX: number;
  posY: number;
  cambiarEncuadre: (campo: string, cambios: { posX?: number; posY?: number }) => void;
}) {
  const [ajustando, setAjustando] = useState(false);
  const controlesAbiertos = editando && ajustando;
  return (
    <div className="tp-item" style={{ position:"relative", overflow:controlesAbiertos ? "visible" : "hidden", borderRadius:4, background:"#141619", minHeight:140,
      aspectRatio:"16 / 10", border:"1px solid rgba(255,255,255,0.08)",
      zIndex:controlesAbiertos ? 5 : undefined }}>
      <Link href={href} aria-label={`${g.label}, ${g.cuantos} vehículos`} style={{ position:"absolute", inset:0, display:"block", color:"#fff", textDecoration:"none" }}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda
          <img src={foto} alt="" loading="lazy" className="tp-foto" onError={e => { e.currentTarget.style.display = "none"; }}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:`${posX}% ${posY}%`,
              borderRadius:4, ...(controlesAbiertos ? { transform:"none" } : {}) }} />
        )}
        <span aria-hidden="true" style={{ position:"absolute", inset:0, borderRadius:4, background:"linear-gradient(to top, rgba(11,12,14,0.92) 0%, rgba(11,12,14,0.25) 60%, rgba(11,12,14,0.1) 100%)" }} />
        <span style={{ position:"absolute", left:16, right:16, bottom:14, display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:10 }}>
          <span style={{ fontSize:"clamp(16px,1.8vw,21px)", fontWeight:800, letterSpacing:-0.3, lineHeight:1.1, overflowWrap:"anywhere" }}>{g.label}</span>
          <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)", flexShrink:0 }}>{g.cuantos} <span aria-hidden="true">→</span></span>
        </span>
      </Link>
      {editando && <div style={{ position:"absolute", zIndex:2, top:8, right:8 }}>
        <button type="button" aria-expanded={ajustando} onClick={() => setAjustando(v => !v)}
          style={{ border:"1px solid rgba(255,255,255,.4)", borderRadius:7, padding:"6px 9px", background:"rgba(15,23,42,.88)", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>
          {ajustando ? "Listo" : "Ajustar foto"}
        </button>
        {ajustando && <div onClick={e => e.stopPropagation()} style={{ width:"min(220px, calc(100vw - 80px))", marginTop:6, padding:10, borderRadius:8,
          background:"rgba(15,23,42,.94)", color:"white", boxShadow:"0 8px 24px rgba(0,0,0,.3)" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700 }}>Encuadre horizontal
            <input aria-label={`Encuadre horizontal de ${g.label}`} type="range" min={0} max={100} value={posX}
              onChange={e => cambiarEncuadre(campoFoto, { posX:Number(e.target.value) })} style={{ display:"block", width:"100%", accentColor:"#e8a020" }} />
          </label>
          <label style={{ display:"block", marginTop:8, fontSize:11, fontWeight:700 }}>Encuadre vertical
            <input aria-label={`Encuadre vertical de ${g.label}`} type="range" min={0} max={100} value={posY}
              onChange={e => cambiarEncuadre(campoFoto, { posY:Number(e.target.value) })} style={{ display:"block", width:"100%", accentColor:"#e8a020" }} />
          </label>
        </div>}
      </div>}
    </div>
  );
}

/** Una tarjeta por tipo con foto tomada de uno de sus vehículos. */
export function TiposMotor({ productos, opciones, moneda, slug, enEditor, titulo, tinta = "#f4f4f5", tintaSuave = "rgba(255,255,255,0.45)", acento = "#e8a020" }: {
  tinta?: string;
  tintaSuave?: string;
  acento?: string;
  productos: StorefrontProduct[];
  opciones: OpcionesDeFiltro;
  moneda: string;
  slug: string;
  enEditor: boolean;
  titulo: React.ReactNode;
}) {
  const { editMode, imageOverrides, setImageOverride } = useEditContext();
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const porTipo = opciones.tipos.length > 1;
  const grupos = porTipo ? opciones.tipos : opciones.marcas;
  if (grupos.length < 2) return null;
  const visibles = mostrarTodas ? grupos : grupos.slice(0, 8);
  const fotoDe = (valor: string) => productos.find(p => {
    const d = datosDe(p, moneda);
    return (porTipo ? d.tipo : d.claveMarca) === valor && p.images[0];
  })?.images[0];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:16, marginBottom:28, flexWrap:"wrap" }}>
        <h2 style={{ margin:0, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, letterSpacing:-1.2, lineHeight:1, color:tinta }}>{titulo}</h2>
        <span style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:tintaSuave }}>
          {porTipo ? `${grupos.length} tipos` : `${grupos.length} marcas`}
        </span>
      </div>
      <div className="tp-grilla" style={{ display:"grid", gap:10 }}>
        {visibles.map(g => {
          const campoFoto = `tipoFoto:${porTipo ? "tipo" : "marca"}:${g.valor}`;
          const encuadre = imageOverrides[campoFoto];
          return <TarjetaTipo key={g.valor} g={g}
            href={linkAVehiculos(slug, porTipo ? { tipo:g.valor } : { marca:g.valor }, enEditor)}
            foto={fotoDe(g.valor)} campoFoto={campoFoto} editando={editMode && enEditor}
            posX={encuadre?.posX ?? 50} posY={encuadre?.posY ?? 50} cambiarEncuadre={setImageOverride} />;
        })}
      </div>
      {grupos.length > 8 && <div style={{ display:"flex", justifyContent:"center", marginTop:18 }}>
        <button type="button" aria-expanded={mostrarTodas} onClick={() => setMostrarTodas(v => !v)}
          style={{ minHeight:44, padding:"0 20px", border:"1px solid rgba(255,255,255,.28)", borderRadius:999,
            background:"transparent", color:acento, fontFamily:"inherit", fontSize:13, fontWeight:800, cursor:"pointer" }}>
          {mostrarTodas ? `Ver menos ${porTipo ? "categorías" : "marcas"}` : `Ver más ${porTipo ? "categorías" : "marcas"} (+${grupos.length - 8})`}
        </button>
      </div>}
    </div>
  );
}
