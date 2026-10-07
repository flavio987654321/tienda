"use client";
/**
 * El pie de las páginas de autos que no son la portada: el listado de
 * vehículos y la página de cada uno (08/10/26). Antes era una fila de links
 * legales sueltos: quien llegaba por un link compartido no tenía cómo escribirle
 * a la concesionaria, ni volver al inicio, sin subir hasta arriba.
 *
 * Tres columnas (la tienda, los vehículos, el contacto) y la fila legal abajo.
 * Los colores los pone cada página (`tema`): oscura en Auto Motor, clara en el resto.
 */
import Link from "next/link";
import { linksLegales, type ClaveLegal } from "@/lib/politicas-tienda";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { linkAVehiculos } from "@/lib/filtroVehiculos";

export type TemaPie = { fondo: string; tinta: string; suave: string; linea: string };

const REDES: [string, string][] = [
  ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"],
];

/** Sólo links web de verdad: lo escribe el dueño, y un `javascript:` en un href es un agujero. */
const linkSeguro = (u: string | undefined) => (u && /^https?:\/\/[^\s]+$/i.test(u.trim()) ? u.trim() : null);

export default function PieDeAutos({
  slug, storeName, descripcion, whatsapp, redes, legales, enEditor, tema, acento, onReportar,
}: {
  slug: string;
  storeName: string;
  descripcion?: string | null;
  whatsapp?: string | null;
  redes?: Record<string, string>;
  legales: ClaveLegal[] | undefined;
  enEditor: boolean;
  tema: TemaPie;
  acento: string;
  onReportar?: () => void;
}) {
  const wa = linkWhatsApp(whatsapp, `Hola ${storeName}, vi los vehículos en la tienda y quería consultar.`);
  const susRedes = REDES.map(([k, label]) => ({ k, label, href: linkSeguro(redes?.[k]) })).filter((r) => r.href);
  const inicio = `/tienda/${slug}${enEditor ? "?from=editor" : ""}`;
  const titulo = { margin: "0 0 12px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: tema.tinta };
  const link = { color: tema.suave, textDecoration: "none", fontSize: 14, minHeight: 32, display: "inline-flex", alignItems: "center" };

  return (
    <footer style={{ background: tema.fondo, borderTop: `1px solid ${tema.linea}`, color: tema.tinta }}>
      <style>{`
        .pda-cols { display:grid; gap:28px; grid-template-columns:minmax(0,1fr) }
        @media(min-width:640px){ .pda-cols { grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) } }
        .pda-link:hover { color:${acento} !important }
      `}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px clamp(16px,4vw,32px) 24px" }}>
        <div className="pda-cols">
          <div style={{ minWidth: 0 }}>
            <Link href={inicio} style={{ color: tema.tinta, textDecoration: "none", fontWeight: 900, fontSize: 18, letterSpacing: 1.5, textTransform: "uppercase", overflowWrap: "anywhere" }}>
              {storeName}
            </Link>
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: tema.suave, maxWidth: 380 }}>
              {descripcion?.trim() || "Vehículos seleccionados, con la ficha completa de cada unidad. Consultanos por cualquiera."}
            </p>
          </div>

          <nav aria-label="Vehículos" style={{ minWidth: 0 }}>
            <p style={titulo}>Vehículos</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              <li><Link href={linkAVehiculos(slug, {}, enEditor)} className="pda-link" style={link}>Ver todos</Link></li>
              <li><Link href={inicio} className="pda-link" style={link}>Inicio de la tienda</Link></li>
            </ul>
          </nav>

          <div style={{ minWidth: 0 }}>
            <p style={titulo}>Contacto</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" className="pda-link" style={link}>WhatsApp</a></li>}
              {susRedes.map((r) => (
                <li key={r.k}><a href={r.href!} target="_blank" rel="noopener noreferrer" className="pda-link" style={link}>{r.label}</a></li>
              ))}
              {!wa && susRedes.length === 0 && <li style={{ ...link, cursor: "default" }}>Consultanos con el formulario de cualquier vehículo.</li>}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 18, borderTop: `1px solid ${tema.linea}`, display: "flex", flexWrap: "wrap", gap: "8px 18px",
          alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 12, color: tema.suave }}>© {new Date().getFullYear()} {storeName}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {linksLegales(slug, legales, { esAutos: true, enEditor }).map(({ clave, label, href }) => (
              <a key={clave} href={href} className="pda-link" style={{ ...link, fontSize: 12 }}>{label}</a>
            ))}
            {onReportar && (
              <button type="button" onClick={onReportar} className="pda-link"
                style={{ ...link, fontSize: 12, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>
                Reportar tienda
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
