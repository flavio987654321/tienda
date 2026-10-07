"use client";
/**
 * El pie de las tiendas de autos (08/10/26): portada, listado y página de cada
 * vehículo. Antes eran una fila de links legales sueltos, y el dueño: "no me
 * gusta, ordenalo mejor".
 *
 * Ordenado de arriba abajo por lo que busca quien llega al final de la página:
 *   1. Una franja para escribir por WhatsApp (si la tienda lo tiene activo).
 *   2. Tres columnas: la tienda (frase y redes), los vehículos por tipo, la
 *      información (las políticas, que antes ocupaban la fila de abajo).
 *   3. Una línea chica: © y "Reportar tienda".
 *
 * El contenido es uno solo; el `estilo` cambia la forma: Auto Motor recto y en
 * mayúsculas, Auto Drive redondeado. Los colores los pone quien lo usa (en la
 * portada el fondo del pie se puede cambiar desde el editor).
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { linksLegales, type ClaveLegal } from "@/lib/politicas-tienda";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { linkAVehiculos } from "@/lib/filtroVehiculos";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import type { StorefrontProduct } from "@/hooks/useStorefront";

/** La frase de fábrica del pie. En la portada se edita (campo "footerFrase") y las otras páginas la leen de ahí. */
export const FRASE_PIE = "Vehículos seleccionados, con la ficha completa de cada unidad.";

export type ColoresPie = { fondo: string; tinta: string; suave: string; linea: string };
export type EstiloPie = "motor" | "drive";

/** Los tipos que la tienda tiene publicados, con cuántos hay, para la columna "Vehículos". */
export function tiposParaPie(products: StorefrontProduct[], slug: string, enEditor: boolean) {
  const cuenta = new Map<string, number>();
  for (const p of products) {
    const c = (p.category ?? "").toLowerCase();
    if (NOMBRE_TIPO[c as CategoriaVehiculo]) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => ({ label: NOMBRE_TIPO[c as CategoriaVehiculo].varios, n, href: linkAVehiculos(slug, { tipo: c }, enEditor) }));
}

/** Sólo links web de verdad: lo escribe el dueño, y un `javascript:` en un href es un agujero. */
const linkSeguro = (u: string | undefined) => (u && /^https?:\/\/[^\s]+$/i.test(u.trim()) ? u.trim() : null);

const ICONOS: Record<string, ReactNode> = {
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.7" />,
  youtube: <><path d="M22 8.6a3 3 0 0 0-2.1-2.1C18 6 12 6 12 6s-6 0-7.9.5A3 3 0 0 0 2 8.6 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.4a3 3 0 0 0 2.1 2.1C6 18 12 18 12 18s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.4 31 31 0 0 0-.4-3.4z" /><path d="m10 15 5-3-5-3z" /></>,
};
const REDES: [string, string][] = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"]];

export function ContenidoPieAutos({
  slug, storeName, descripcion, whatsapp, redes, products, legales, enEditor, colores, acento, estilo, onReportar, copyright,
}: {
  slug: string;
  storeName: string;
  /** La frase de la tienda. En la portada llega editable (EditableZone). */
  descripcion?: ReactNode;
  whatsapp?: string | null;
  redes?: Record<string, string> | null;
  products: StorefrontProduct[];
  legales: ClaveLegal[] | undefined;
  enEditor: boolean;
  colores: Omit<ColoresPie, "fondo">;
  acento: string;
  estilo: EstiloPie;
  onReportar?: () => void;
  /** El "© año tienda". En la portada llega editable. */
  copyright?: ReactNode;
}) {
  const motor = estilo === "motor";
  const radio = motor ? 2 : 999;
  const wa = linkWhatsApp(whatsapp, `Hola ${storeName}, vi los vehículos en la tienda y quería consultar.`);
  const susRedes = REDES.map(([k, label]) => ({ k, label, href: linkSeguro(redes?.[k]) })).filter((r) => r.href);
  const tipos = tiposParaPie(products, slug, enEditor);
  const inicio = `/tienda/${slug}${enEditor ? "?from=editor" : ""}`;
  const legal = linksLegales(slug, legales, { esAutos: true, enEditor });

  const titulo = { margin: "0 0 14px", fontSize: 11, fontWeight: 800, letterSpacing: motor ? 2.5 : 1.2, textTransform: "uppercase" as const, color: colores.tinta };
  const link = { color: colores.suave, textDecoration: "none", fontSize: 14, lineHeight: 1.4, minHeight: 34, display: "inline-flex", alignItems: "center", gap: 8 };

  return (
    <>
      <style>{`
        .pda-cols { display:grid; gap:36px 28px; grid-template-columns:minmax(0,1fr) }
        @media(min-width:600px){ .pda-cols { grid-template-columns:repeat(2,minmax(0,1fr)) } .pda-marca { grid-column:1 / -1 } }
        @media(min-width:960px){ .pda-cols { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) } .pda-marca { grid-column:auto } }
        .pda-cta { display:flex; flex-direction:column; align-items:flex-start; gap:16px }
        @media(min-width:720px){ .pda-cta { flex-direction:row; align-items:center; justify-content:space-between } }
        .pda-link { transition:color .15s }
        .pda-link:hover { color:${acento} !important }
        .pda-red { transition:border-color .15s, color .15s, transform .15s }
        .pda-red:hover { border-color:${acento} !important; color:${acento} !important; transform:translateY(-1px) }
        .pda-wa { transition:filter .15s, transform .15s }
        .pda-wa:hover { filter:brightness(1.08); transform:translateY(-1px) }
      `}</style>

      {/* 1. Escribinos */}
      {wa && (
        <div className="pda-cta" style={{ paddingBottom: 32, marginBottom: 36, borderBottom: `1px solid ${colores.linea}` }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 800, letterSpacing: motor ? -0.3 : -0.5, color: colores.tinta,
              textTransform: motor ? "uppercase" : "none", lineHeight: 1.15 }}>
              ¿Te interesa alguno?
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: colores.suave }}>Escribinos y te respondemos con todos los datos.</p>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="pda-wa"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 22px", borderRadius: radio, background: "#22c55e",
              color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", letterSpacing: motor ? 0.8 : 0, textTransform: motor ? "uppercase" : "none", flexShrink: 0 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
            Escribinos por WhatsApp
          </a>
        </div>
      )}

      {/* 2. Tres columnas */}
      <div className="pda-cols">
        <div className="pda-marca" style={{ minWidth: 0 }}>
          <Link href={inicio} style={{ color: colores.tinta, textDecoration: "none", fontWeight: 900, fontSize: 20, letterSpacing: motor ? 3 : -0.3,
            textTransform: motor ? "uppercase" : "none", overflowWrap: "anywhere" }}>
            {storeName}
          </Link>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.65, color: colores.suave, maxWidth: 400 }}>
            {descripcion || FRASE_PIE}
          </p>
          {susRedes.length > 0 && (
            <ul aria-label="Redes" style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {susRedes.map((r) => (
                <li key={r.k}>
                  <a href={r.href!} target="_blank" rel="noopener noreferrer" aria-label={r.label} className="pda-red"
                    style={{ width: 42, height: 42, borderRadius: motor ? 2 : "50%", border: `1px solid ${colores.linea}`, color: colores.tinta,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONOS[r.k]}</svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Vehículos" style={{ minWidth: 0 }}>
          <p style={titulo}>Vehículos</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {tipos.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="pda-link" style={link}>
                  {t.label} <span style={{ fontSize: 12, opacity: 0.6 }}>({t.n})</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={linkAVehiculos(slug, {}, enEditor)} className="pda-link" style={{ ...link, color: colores.tinta, fontWeight: 600 }}>
                Ver todos <span aria-hidden="true">→</span>
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Información" style={{ minWidth: 0 }}>
          <p style={titulo}>Información</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {legal.map(({ clave, label, href }) => (
              <li key={clave}><a href={href} className="pda-link" style={link}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 3. La línea de abajo */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${colores.linea}`, display: "flex", flexWrap: "wrap", gap: "8px 20px",
        alignItems: "center", justifyContent: "space-between", fontSize: 12, color: colores.suave }}>
        <p style={{ margin: 0 }}>{copyright ?? `© ${new Date().getFullYear()} ${storeName}`}</p>
        {onReportar && (
          <button type="button" onClick={onReportar} className="pda-link"
            style={{ fontSize: 12, color: colores.suave, background: "none", border: "none", padding: 0, minHeight: 32, cursor: "pointer", fontFamily: "inherit" }}>
            Reportar tienda
          </button>
        )}
      </div>
    </>
  );
}

/** El pie entero, con su fondo: para el listado y la página del vehículo. */
export default function PieDeAutos(props: Omit<Parameters<typeof ContenidoPieAutos>[0], "colores"> & { colores: ColoresPie }) {
  const { colores } = props;
  return (
    <footer style={{ background: colores.fondo, borderTop: `1px solid ${colores.linea}`, color: colores.tinta }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px clamp(16px,4vw,32px) 24px" }}>
        <ContenidoPieAutos {...props} />
      </div>
    </footer>
  );
}
