"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ProductDetailBody, ProductDetailOverlays, resolveDetailTheme, editorParam,
  type DetailTheme, type ProductDetailViewProps,
} from "./shared";
import { linksLegales } from "@/lib/politicas-tienda";
import { getContrastColor } from "@/contexts/EditContext";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { CAPAS } from "@/lib/capas-tienda";

/* ── La ficha de producto de Aire ─────────────────────────────────────────────
 *
 * Página entera, no ventanita. El modal servía para espiar sin perder el lugar
 * en la grilla, pero también era el techo: no se puede compartir por link, no
 * entra en Google, y todo lo que el vendedor cargó —el video, las medidas, las
 * reseñas— tenía que caber en una cajita con scroll propio.
 *
 * El cuerpo es el COMPARTIDO (`ProductDetailBody`): la galería, las opciones,
 * el carrito, la descripción, la ficha técnica, los videos, las reseñas con su
 * formulario y los productos relacionados ya están resueltos ahí y los usan los
 * otros seis templates. Acá se define nada más cómo se viste.
 */

/* La misma paleta que el template. Escrita al lado de la de Aire.tsx y no
   importada de allá porque ese archivo es un componente de cliente enorme:
   traerlo entero para leerle cinco colores arrastraría todo el template a esta
   página. Si cambian allá, cambian acá. */
const BG = "#f4f4f1";
const S  = "#ffffff";
const T  = "#14161a";
const T2 = "#6f7478";
const LN = "#e5e5df";
const RAD = 20;
const ANCHO = 1360;

/* Se exporta porque `Aire.tsx` dibuja esta MISMA ficha adentro de la portada,
   sin cambiar de página. Las dos entradas al producto —la de acá, para el link
   compartido y para Google, y la de allá, navegando por la tienda— tienen que
   verse iguales, y con la paleta copiada en dos lados no hay forma de que sigan
   iguales. */
export const themeBase: DetailTheme = {
  pageBg: BG,
  text: T,
  muted: T2,
  accent: "#1f5c3d",
  accentText: "#ffffff",
  accentReadable: "#1f5c3d",
  cardBorder: LN,
  font: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  headingFont: "inherit",
  radius: RAD,
  vestido: {
    // Los títulos de sección, como en la portada: cortos, en mayúsculas y
    // apretados. Sin esto salen con la tipografía por defecto y la ficha se lee
    // como de otro sitio.
    tituloSeccion: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.4px", textTransform: "uppercase", color: T },
    nombre: { fontWeight: 800, letterSpacing: "-1px" },
    miniaturaActiva: { borde: "#1f5c3d", grosor: 2 },

    /* El formulario de reseña arranca CERRADO, detrás de un botón, y se abre en
       una ventana flotante.

       Desplegado son cinco campos ocupando media pantalla para algo que hace una
       de cada cien personas que miran un producto: la mayoría viene a LEER las
       reseñas, y se encontraba con un formulario en blanco antes de llegar a los
       productos relacionados.

       Es el mismo botón que la portada —mismo texto, misma cápsula— para que sea
       una sola cosa en toda la tienda y no dos que se parecen. */
    resenaFormPlegado: true,
    resenaFormModal: true,
    botonEscribirResena: "Dejá tu opinión",
    botonEscribirResenaEstilo: {
      borderRadius: 999, padding: "12px 26px", fontSize: 13.5, fontWeight: 700,
      letterSpacing: 0, textTransform: "none",
    },
  },
};

export default function AireDetail({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, cartCount, catalogHref, whatsapp, product, cart, isPreview,
          accentOverride, socialLinks, legales, footerBg, esAutos } = view;
  const theme = resolveDetailTheme(themeBase, accentOverride);
  const G = theme.accent;
  const accentText = theme.accentText;
  const homeHref = `/tienda/${slug}${editorParam(isPreview)}`;

  const [showReport, setShowReport] = useState(false);
  const [ANIO] = useState(() => new Date().getFullYear());

  /* El pie con columnas, como el de la portada.
     Está escrito acá y no importado del template a propósito: el pie de Aire.tsx
     usa `EditableZone` para que la dueña lo edite en vivo, y eso necesita el
     contexto del editor, que en esta ruta no existe. Traerlo igual habría hecho
     explotar la página con un contexto vacío. Es la misma forma con otros
     ladrillos; si se rediseña uno, hay que tocar los dos. */
  const pieBg    = footerBg ?? S;
  const pieText  = getContrastColor(pieBg) === "light" ? "#ffffff" : T;
  const pieBorde = pieText === T ? LN : "rgba(255,255,255,0.16)";

  const columnas: { titulo: string; items: { label: string; href: string; externo?: boolean }[] }[] = [];
  const legalesLinks = linksLegales(slug, legales, { esAutos, enEditor: isPreview });
  if (legalesLinks.length > 0) {
    columnas.push({ titulo: "Ayuda", items: legalesLinks.map(l => ({ label: l.label, href: l.href })) });
  }
  const contacto: { label: string; href: string; externo?: boolean }[] = [];
  const wa = whatsapp?.replace(/\D/g, "");
  if (wa) contacto.push({ label: "Escribinos por WhatsApp", href: `https://wa.me/${wa}`, externo: true });
  contacto.push({ label: "Contacto", href: `/tienda/${slug}/contacto${editorParam(isPreview)}` });
  contacto.push({ label: "Ver todo el catálogo", href: catalogHref });
  columnas.push({ titulo: "Contacto", items: contacto });

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, fontFamily: theme.font, color: T }}>
      <style>{`
        .ai-fd-pie { display:grid; gap:28px; grid-template-columns:1fr }
        .ai-fd-cols { display:grid; gap:24px; grid-template-columns:repeat(2,1fr) }
        @media (min-width:1024px) {
          .ai-fd-pie { grid-template-columns:1.5fr 2fr; gap:40px }
          .ai-fd-cols { gap:36px }
        }
      `}</style>

      {/* ── La barra ──
          Es la de Aire en versión corta: la marca, el catálogo y el carrito. No
          lleva el menú entero —categorías, géneros, buscador, favoritos— porque
          todos ésos filtran o abren cosas de la portada, y desde acá no hay nada
          que filtrar: quien está mirando un producto ya eligió. */}
      <nav style={{ borderBottom: `1px solid ${LN}`, background: S, position: "sticky", top: 0, zIndex: CAPAS.navFicha }}>
        <div style={{ padding: "0 24px" }}>
          <div style={{ maxWidth: ANCHO, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <Link href={homeHref} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 0 }}>
              <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: G, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
                </svg>
              </span>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.4px", textTransform: "uppercase", color: T, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {storeName}
              </span>
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <Link href={catalogHref} style={{ fontSize: 14, fontWeight: 500, color: T, textDecoration: "none", whiteSpace: "nowrap" }}>
                Catálogo
              </Link>
              {/* El carrito como cápsula verde, igual que en la portada: es el
                  único botón de la barra que hace algo irreversible, y tiene que
                  verse distinto de un link. */}
              <button onClick={() => { cart.setCartOpen(true); cart.setFavoritesOpen(false); }}
                aria-label="Carrito"
                style={{ display: "inline-flex", alignItems: "center", gap: 9, background: G, color: accentText, border: "none", borderRadius: 999, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                Carrito
                <span style={{ background: accentText === "#ffffff" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.14)", borderRadius: 999, minWidth: 20, height: 20, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800, padding: "0 6px" }}>
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ padding: "16px 24px 0" }}>
        <div style={{ maxWidth: ANCHO, margin: "0 auto" }}>
          <Link href={catalogHref}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: T2, textDecoration: "none", fontWeight: 500 }}>
            <span aria-hidden>←</span> Volver al catálogo
          </Link>
        </div>
      </div>

      <ProductDetailBody theme={theme} view={view} />

      {/* ── El pie ── */}
      <footer style={{ background: pieBg, borderTop: `1px solid ${LN}`, color: pieText }}>
        <div style={{ padding: "48px 24px 26px" }}>
          <div style={{ maxWidth: ANCHO, margin: "0 auto" }}>
            <div className="ai-fd-pie">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: G, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
                    </svg>
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.4px", textTransform: "uppercase", color: pieText, overflowWrap: "anywhere" }}>{storeName}</span>
                </div>
                {(isPreview || Object.values(socialLinks ?? {}).some(Boolean)) && (
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
                    {(["instagram", "facebook", "tiktok", "youtube", "pinterest"] as const).map(k => {
                      const url = socialLinks?.[k];
                      if (!isPreview && !url) return null;
                      return (
                        <a key={k} href={url || "#"} target={url ? "_blank" : undefined} rel="noopener noreferrer"
                          aria-label={k} onClick={e => { if (!url) e.preventDefault(); }}
                          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${pieBorde}`, color: pieText, opacity: url ? 0.75 : 0.3, display: "grid", placeItems: "center", textDecoration: "none", fontSize: 11, textTransform: "capitalize" }}>
                          {k.charAt(0).toUpperCase()}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="ai-fd-cols">
                {columnas.map(col => (
                  <div key={col.titulo} style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: pieText, opacity: 0.5, margin: "0 0 14px" }}>{col.titulo}</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {col.items.map(it => (
                        <li key={it.label}>
                          <a href={it.href}
                            {...(it.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            style={{ fontSize: 13, color: pieText, opacity: 0.72, textDecoration: "none", lineHeight: 1.4, overflowWrap: "anywhere" }}>
                            {it.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${pieBorde}`, marginTop: 36, paddingTop: 18, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>© {ANIO} {storeName}. Todos los derechos reservados.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Hecho con ♥ en Argentina</p>
                {!isPreview && (
                  <button onClick={() => setShowReport(true)}
                    style={{ fontSize: 12, opacity: 0.35, background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontFamily: "inherit" }}>
                    Reportar tienda
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}

      {wa && (
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
          target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: CAPAS.navFicha, background: "linear-gradient(135deg,#2be374,#1fae57)", color: "white", width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(37,211,102,0.35)", textDecoration: "none" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}

      <ProductDetailOverlays theme={theme} view={view} />
    </div>
  );
}
