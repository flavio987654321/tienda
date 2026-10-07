"use client";
import Link from "next/link";
import { linkAVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import { IconoTipo } from "./IconoTipo";

/**
 * "Explorá por tipo" de Auto Drive (07/10/26): un botón con dibujito por cada
 * tipo que la tienda TIENE, con cuántos hay. Con un solo tipo, por marca (con
 * la inicial en vez del dibujito). Cada uno abre /vehiculos ya filtrado.
 */
export function TiposDrive({ opciones, slug, enEditor, acento }: {
  opciones: OpcionesDeFiltro;
  slug: string;
  enEditor: boolean;
  acento: string;
}) {
  const porTipo = opciones.tipos.length > 1;
  const grupos = (porTipo ? opciones.tipos : opciones.marcas).slice(0, 10);
  if (grupos.length < 2) return null;

  return (
    <ul className="tdr-lista" style={{ listStyle: "none", margin: 0, padding: 0, ...({ "--tdr-acento": acento } as React.CSSProperties) }}>
      {grupos.map(g => (
        <li key={g.valor}>
          <Link href={linkAVehiculos(slug, { [porTipo ? "tipo" : "marca"]: g.valor }, enEditor)} className="tdr-item">
            <span className="tdr-icono" aria-hidden="true">
              {porTipo ? <IconoTipo tipo={g.valor} ancho={52} /> : <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1 }}>{g.label.slice(0, 2).toUpperCase()}</span>}
            </span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#0f172a", overflowWrap: "anywhere" }}>{g.label}</span>
            <span style={{ display: "block", fontSize: 13, color: "#64748b", marginTop: 2 }}>{g.cuantos} {g.cuantos === 1 ? "disponible" : "disponibles"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const TIPOS_DRIVE_CSS = `
  .tdr-lista { display:grid; gap:12px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  @media(min-width:640px){ .tdr-lista { grid-template-columns:repeat(auto-fit,minmax(160px,1fr)) } }
  .tdr-item { display:block; height:100%; box-sizing:border-box; text-decoration:none; background:#fff; border:1px solid #e8ebf0; border-radius:18px; padding:18px 16px;
    transition: border-color .2s, box-shadow .25s, transform .25s cubic-bezier(.2,.7,.2,1) }
  .tdr-item:hover { border-color: var(--tdr-acento); box-shadow:0 12px 30px rgba(15,23,42,.08); transform:translateY(-2px) }
  .tdr-item:focus-visible { outline:3px solid var(--tdr-acento); outline-offset:2px }
  .tdr-icono { display:flex; align-items:center; justify-content:center; width:72px; height:52px; border-radius:14px; margin-bottom:14px;
    background:#f1f5f9; color:#0f172a; transition: background .2s, color .2s }
  .tdr-item:hover .tdr-icono { background: var(--tdr-acento); color:#fff }
  @media (prefers-reduced-motion: reduce) { .tdr-item { transition:none } .tdr-item:hover { transform:none } }
`;
