"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { PromoPrice } from "@/components/store/PromoDisplay";
import { CAPAS } from "@/lib/capas-tienda";
import { editorParam, type ProductDetailViewProps } from "./shared";

/* ── La barra de arriba de la ficha de Aire ───────────────────────────────────
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 * Acá había una barra CORTA: la marca, "Catálogo" y el carrito. La razón escrita
 * era que "quien está mirando un producto ya eligió", y es exactamente al revés.
 * Esta dirección —`/tienda/<slug>/producto/<id>`— es la que la dueña manda por
 * WhatsApp, la que pega en la bio de Instagram y la que devuelve Google. O sea:
 * la PRIMERA pantalla que ve alguien que no conoce la tienda.
 *
 * Medido en el navegador, sobre la misma dirección y el mismo producto:
 *
 *                              clickeando desde la tienda   link compartido
 *   barra de anuncios                    sí                       no
 *   Categorías / Nosotros / Contacto     sí                       no
 *   buscador                             sí                       no
 *   seguir tienda / campanita            sí                       no
 *   favoritos                            sí                       no
 *   Entrar                               sí                       no
 *   sello de verificada + bajada         sí                       no
 *
 * Comprar se podía en las dos (el precio, la promo, el WhatsApp y el carrito son
 * los mismos). Lo que no se podía era SEGUIR MIRANDO: quien entraba de afuera
 * veía un producto y una salida.
 *
 * ── Por qué no se reusa la barra de `Aire.tsx` ───────────────────────────────
 * La de allá está tejida con el editor: cada texto es un `EditableZone`, que
 * necesita el contexto de edición, y en esta ruta ese contexto no existe.
 * Traerla igual haría explotar la página con un contexto vacío. Es la misma
 * razón por la que el PIE de esta ficha también está escrito aparte, y está
 * anotada ahí. Si se rediseña una, hay que tocar las dos.
 *
 * ── Y por qué acá los links son links de verdad ──────────────────────────────
 * En el template, cambiar de pantalla se hace con la History API para no
 * desmontar el árbol (ver `useVistaTemplate`). Acá no hay árbol que conservar:
 * esta página ES una ficha suelta, así que "Catálogo" tiene que llevar a la
 * página del catálogo. Siendo `<Link>` de verdad se copian, se abren en otra
 * pestaña y Google los sigue.
 */

export type PaletaNav = {
  /** Fondo de la página. */
  BG: string;
  /** Fondo de las superficies (barra, tarjetas). */
  S: string;
  /** Texto principal. */
  T: string;
  /** Texto secundario. */
  T2: string;
  /** Líneas y bordes. */
  LN: string;
  /** El acento resuelto (el de la tienda si eligió uno). */
  G: string;
  /** Qué color de texto va ARRIBA del acento. */
  accentText: string;
  RAD: number;
  ANCHO: number;
};

const ALTO_ANUNCIO = 36;
const ALTO_BARRA_PC = 68;
const ALTO_BARRA_CEL = 58;

const ANUNCIOS_POR_DEFECTO = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
];

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

/* Se lee con `useSyncExternalStore` y no con un efecto de `resize` porque es
   justo para lo que existe: leer un valor que sólo el navegador conoce sin que
   el servidor y el navegador dibujen cosas distintas. El servidor contesta
   `false` —dibuja la barra de escritorio— y el navegador corrige en el primer
   pintado si el ancho es de celular. */
const suscribirAncho = (avisar: () => void) => {
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", avisar);
  window.addEventListener("resize", avisar);
  return () => {
    mq.removeEventListener("change", avisar);
    window.removeEventListener("resize", avisar);
  };
};

export default function AireNav({ view, paleta }: { view: ProductDetailViewProps; paleta: PaletaNav }) {
  const { BG, S, T, T2, LN, G, accentText, RAD, ANCHO } = paleta;
  const {
    slug, storeName, catalogHref, cartCount, cart, isPreview,
    products = [], promotions = [], ocultarPrecios = false,
    showPushBell = false, isVerified = false, verifiedInfo,
    promoBanner, navTagline,
  } = view;

  const {
    setCartOpen, setFavoritesOpen, favorites,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery, searchResults,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
  } = cart;

  const esCelular = useSyncExternalStore(
    suscribirAncho,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );

  const pushBell = usePushBell();
  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();

  const [anuncioVisible, setAnuncioVisible] = useState(true);
  const [anuncioIdx, setAnuncioIdx] = useState(0);
  const [catAbierta, setCatAbierta] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catsCelAbiertas, setCatsCelAbiertas] = useState(false);
  const [catCelAbierta, setCatCelAbierta] = useState<string | null>(null);

  /* Las mismas dos cuentas que hace el template sobre la misma lista de
     productos. Escritas igual a propósito: si acá dijeran otra cosa, el menú de
     la ficha y el de la portada ofrecerían categorías distintas para la misma
     tienda. */
  const categorias = useMemo(
    () => [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))],
    [products],
  );
  const subcategorias = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.subcategory && p.category) {
        if (!map[p.category]) map[p.category] = [];
        if (!map[p.category].includes(p.subcategory)) map[p.category].push(p.subcategory);
      }
    });
    return map;
  }, [products]);

  /* `enabled !== false`: una tienda que nunca tocó la barra de anuncios la tiene
     PRENDIDA, igual que en la portada. Con `=== true` quedaría apagada en todas
     las que no la configuraron nunca, o sea casi todas. */
  const anuncios = (promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? promoBanner!.messages!.filter(m => m.trim())
    : ANUNCIOS_POR_DEFECTO;
  const hayAnuncio = promoBanner?.enabled !== false && anuncioVisible;
  const altoAnuncio = hayAnuncio ? ALTO_ANUNCIO : 0;
  const altoBarra = esCelular ? ALTO_BARRA_CEL : ALTO_BARRA_PC;

  const sufijo = editorParam(isPreview);
  const url = (p: string) => `/tienda/${slug}${p}${sufijo}`;
  const urlCategoria = (cat: string, sub?: string) =>
    `/tienda/${slug}/productos?categoria=${encodeURIComponent(cat)}` +
    (sub ? `&subcategoria=${encodeURIComponent(sub)}` : "") +
    (isPreview ? "&from=editor" : "");

  const marca = (chico: boolean) => (
    <>
      <span aria-hidden style={{ width: chico ? 28 : 32, height: chico ? 28 : 32, borderRadius: 10, background: G, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <svg width={chico ? 15 : 17} height={chico ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke={accentText} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14h9a3 3 0 1 0-3-3"/><path d="M3 9h6"/><path d="M3 19h13a3 3 0 1 0-3-3"/>
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05, maxWidth: chico ? 118 : 210, minWidth: 0, overflow: "hidden" }}>
        <span style={{ fontSize: chico ? 15 : 17, fontWeight: 800, letterSpacing: "-0.4px", textTransform: "uppercase", color: T, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
          {storeName}
        </span>
        {/* La bajada sólo en pantalla grande, igual que en la portada: en un
            celular son 10px de alto que empujan la barra y no se leen. */}
        {!chico && navTagline !== "" && (
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T2, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
            {navTagline || "Tienda online"}
          </span>
        )}
      </span>
    </>
  );

  const linkMenu = (href: string, texto: string) => (
    <Link href={href}
      style={{ color: T, fontSize: 14, fontWeight: 500, textDecoration: "none", padding: "6px 2px", whiteSpace: "nowrap" }}
      onMouseEnter={e => (e.currentTarget.style.color = G)}
      onMouseLeave={e => (e.currentTarget.style.color = T)}>
      {texto}
    </Link>
  );

  const botonRedondo = (contenido: React.ReactNode, props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}
      style={{ background: "none", border: "none", color: T, cursor: "pointer", position: "relative", width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", ...props.style }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(20,22,26,0.05)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
      {contenido}
    </button>
  );

  return (
    <>
      {/* ── BARRA DE ANUNCIOS ──
          `sticky` y no `fixed`: acá ocupa su lugar en la página, así que la
          ficha arranca abajo sola. La de la portada va `fixed` y por eso allá
          hace falta un hueco falso que compense su alto — un problema que esta
          pantalla no necesita heredar. */}
      {hayAnuncio && (
        <div style={{ position: "sticky", top: 0, zIndex: CAPAS.navFicha + 1, height: ALTO_ANUNCIO, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: accentText, letterSpacing: 0.3, padding: "0 44px", textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {anuncios[anuncioIdx]}
          </span>
          {anuncios.length > 1 && (
            <div style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {/* Blanco de 26px con la rayita de 3 adentro — ver la misma barra en
                  `Aire.tsx`: tocar tres píxeles de alto en un celular es suerte. */}
              {anuncios.map((_, i) => (
                <button key={i} onClick={() => setAnuncioIdx(i)} aria-label={`Anuncio ${i + 1}`}
                  style={{ background: "none", border: "none", padding: 0, width: 28, height: 28, display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <span aria-hidden style={{ display: "block", width: i === anuncioIdx ? 16 : 6, height: 3, borderRadius: 999, background: accentText, opacity: i === anuncioIdx ? 0.95 : 0.4, transition: "all 0.3s" }}/>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setAnuncioVisible(false)} aria-label="Cerrar anuncio"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: accentText, cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.75, width: 30, height: 30, display: "grid", placeItems: "center", padding: 0 }}>×</button>
        </div>
      )}

      {/* ── LA BARRA ── */}
      <nav style={{ position: "sticky", top: altoAnuncio, zIndex: CAPAS.navFicha, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${LN}` }}>
        <div style={{ padding: `0 ${esCelular ? 12 : 24}px` }}>
          <div style={{ maxWidth: ANCHO, margin: "0 auto", height: altoBarra, display: "flex", alignItems: "center", gap: 16 }}>

            {/* ── La marca ──
                `minWidth:0` y sin `flexShrink:0`: es lo único que puede ceder
                ancho. Fijándola, un nombre de tienda largo empuja los botones
                fuera de la pantalla en un celular y la página entera queda con
                scroll horizontal. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Link href={url("")} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 0 }}>
                {marca(esCelular)}
              </Link>
              <VerifiedIconButton isVerified={isVerified} info={verifiedInfo} />
            </div>

            {/* ── Los links, al medio ── */}
            {!esCelular && (
              <div style={{ flex: 1, display: "flex", gap: 24, alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                {linkMenu(catalogHref, "Catálogo")}

                {categorias.length > 0 && (
                  <div style={{ position: "relative" }}
                    onMouseEnter={() => setCatAbierta("__abrir__")}
                    onMouseLeave={() => setCatAbierta(null)}>
                    <button style={{ background: "none", border: "none", color: T, fontSize: 14, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 5, padding: "6px 2px", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      onMouseEnter={e => (e.currentTarget.style.color = G)}
                      onMouseLeave={e => (e.currentTarget.style.color = T)}>
                      Categorías <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
                    </button>
                    {catAbierta && (() => {
                      const activa = catAbierta === "__abrir__" ? (categorias[0] ?? null) : catAbierta;
                      const subs = activa ? (subcategorias[activa] || []) : [];
                      return (
                        /* El hueco de 10px entre el botón y el panel se cubre con
                           `paddingTop` de la caja de afuera y no con `top:calc(100%+10px)`.
                           Con el hueco vacío, bajando el mouse para elegir una
                           categoría se cruzaban 10px de nada, ahí se disparaba el
                           "salió del menú" y el panel se cerraba en la cara. Es el
                           mismo arreglo que tiene la barra de la portada. */
                        <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: 10, zIndex: CAPAS.panel }}>
                          <div style={{ display: "flex", background: S, border: `1px solid ${LN}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 44px rgba(20,22,26,0.13)" }}>
                            <div style={{ minWidth: 210, padding: 8, borderRight: subs.length > 0 ? `1px solid ${LN}` : "none" }}>
                              {categorias.map(cat => {
                                const susSubs = subcategorias[cat] || [];
                                return (
                                  <Link key={cat} href={urlCategoria(cat)}
                                    onMouseEnter={() => setCatAbierta(cat)}
                                    onClick={() => setCatAbierta(null)}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", background: activa === cat ? "rgba(20,22,26,0.05)" : "none", borderRadius: 10, color: activa === cat ? G : T, padding: "9px 12px", fontSize: 13.5, fontWeight: activa === cat ? 700 : 500, textDecoration: "none", boxSizing: "border-box" }}>
                                    {cat}
                                    {susSubs.length > 0 && <span style={{ opacity: 0.45, fontSize: 11 }}>›</span>}
                                  </Link>
                                );
                              })}
                            </div>
                            {subs.length > 0 && (
                              <div style={{ minWidth: 190, padding: 8 }}>
                                <p style={{ margin: 0, padding: "6px 12px 8px", fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: T2 }}>{activa}</p>
                                {subs.map(sub => (
                                  <Link key={sub} href={urlCategoria(activa ?? "", sub)} onClick={() => setCatAbierta(null)}
                                    style={{ display: "block", width: "100%", borderRadius: 10, color: T, padding: "9px 12px", fontSize: 13.5, textDecoration: "none", boxSizing: "border-box" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(20,22,26,0.05)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                    {sub}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {linkMenu(url("/nosotros"), "Nosotros")}
                {linkMenu(url("/contacto"), "Contacto")}
              </div>
            )}

            {/* ── Las acciones ── */}
            <div style={{ display: "flex", alignItems: "center", gap: esCelular ? 4 : 6, flexShrink: 0, marginLeft: esCelular ? "auto" : 0 }}>
              {botonRedondo(
                <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
                { onClick: () => setSearchOpen(true), "aria-label": "Buscar" },
              )}

              {/* Sólo con Plan Plus y sólo para quien no es la dueña: es la misma
                  condición que la portada, resuelta en el servidor. */}
              {pushBell && showPushBell && !isPreview && (
                <StoreFollowButton storeSlug={slug} color={T} size={19} />
              )}
              {pushBell && showPushBell && !isPreview && (
                <button onClick={pushBell.openDrawer} aria-label="Novedades"
                  style={{ position: "relative", background: "none", border: "none", color: T, cursor: "pointer", width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center" }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {pushBell.hasNew && <span style={{ position: "absolute", top: 5, right: 5, width: 9, height: 9, background: "#ef4444", borderRadius: "50%", border: "2px solid #ffffff" }} />}
                </button>
              )}

              {!esCelular && botonRedondo(
                <>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill={favorites.length > 0 ? G : "none"} stroke={favorites.length > 0 ? G : "currentColor"} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {favorites.length > 0 && <span style={{ position: "absolute", top: 2, right: 2, background: G, color: accentText, borderRadius: 999, minWidth: 17, height: 17, fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 4px" }}>{favorites.length}</span>}
                </>,
                { onClick: () => { setFavoritesOpen(true); setUserDropdownOpen(false); setCartOpen(false); }, "aria-label": "Favoritos" },
              )}

              {/* ── Entrar / Mi cuenta ── */}
              <div ref={userDropdownRef} style={{ position: "relative" }}>
                <button onClick={() => { setUserDropdownOpen(!userDropdownOpen); setFavoritesOpen(false); }}
                  aria-label="Mi cuenta"
                  style={{ display: "flex", alignItems: "center", gap: 8, background: S, border: `1px solid ${LN}`, borderRadius: 999, color: T, cursor: "pointer", padding: esCelular ? "0" : "9px 16px 9px 13px", width: esCelular ? 38 : undefined, height: esCelular ? 38 : undefined, justifyContent: "center", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {/* Tres estados y no dos: mientras no se sabe se pone "…". Decir
                      "Entrar" antes de tiempo le ofrece iniciar sesión a alguien
                      que ya la tiene iniciada. */}
                  {!esCelular && <span style={{ whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>{cargando ? "…" : logueado ? (nombreMostrado || "Mi cuenta") : "Entrar"}</span>}
                </button>
                {userDropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: S, border: `1px solid ${LN}`, borderRadius: 14, padding: 6, minWidth: 210, zIndex: CAPAS.panel, boxShadow: "0 16px 40px rgba(20,22,26,0.14)" }}>
                    {cargando ? (<p style={{ padding: "12px 14px", margin: 0, fontSize: 13, color: T2 }}>Cargando…</p>) : logueado ? (
                      <>
                        <p style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: T2, padding: "10px 14px 6px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {nombreMostrado}
                        </p>
                        <a href={panelHref} onClick={() => setUserDropdownOpen(false)}
                          style={{ display: "block", color: T, padding: "11px 14px", fontSize: 13.5, textDecoration: "none", borderRadius: 10 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(20,22,26,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>{panelLabel}</a>
                        <div style={{ borderTop: `1px solid ${LN}`, margin: "5px 8px" }}/>
                        <button onClick={() => { if (isPreview) return; setUserDropdownOpen(false); signOut("/"); }}
                          style={{ display: "block", width: "100%", background: "none", border: "none", borderRadius: 10, color: "#dc2626", padding: "11px 14px", fontSize: 13.5, textAlign: "left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily: "inherit" }}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: T2, padding: "10px 14px 6px", margin: 0 }}>Mi cuenta</p>
                        {/* El `redirect` vuelve a ESTA página y no a la portada:
                            quien entra de un link compartido está mirando un
                            producto, y mandarlo al inicio después de identificarse
                            es hacerle buscar de nuevo lo que ya tenía abierto. */}
                        {[["Iniciar sesión", `/login?redirect=/tienda/${slug}/producto/${view.product.id}`],
                          ["Crear cuenta", `/registro?plan=buyer&redirect=/tienda/${slug}/producto/${view.product.id}`]].map(([label, href]) => (
                          <a key={label} href={isPreview ? undefined : href} onClick={() => !isPreview && setUserDropdownOpen(false)}
                            style={{ display: "block", color: T, padding: "11px 14px", fontSize: 13.5, textDecoration: "none", borderRadius: 10, cursor: isPreview ? "default" : "pointer" }}
                            onMouseEnter={e => { if (!isPreview) e.currentTarget.style.background = "rgba(20,22,26,0.05)"; }}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>{label}</a>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── El carrito ──
                  Cápsula verde: es el único botón de la barra que hace algo
                  irreversible y tiene que verse distinto de un link. */}
              <button onClick={() => { setCartOpen(true); setFavoritesOpen(false); setUserDropdownOpen(false); }}
                aria-label={`Carrito${cartCount > 0 ? ` (${cartCount})` : ""}`}
                style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 9, background: G, color: accentText, border: "none", borderRadius: 999, padding: esCelular ? "0" : "10px 15px 10px 14px", width: esCelular ? 40 : undefined, height: esCelular ? 40 : undefined, justifyContent: "center", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {!esCelular && <span>Carrito</span>}
                <span style={{ background: esCelular ? "#ef4444" : (accentText === "#ffffff" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.14)"), color: esCelular ? "#fff" : accentText, borderRadius: 999, minWidth: 20, height: 20, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800, padding: "0 6px", ...(esCelular ? { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, fontSize: 10 } : {}) }}>
                  {cartCount}
                </span>
              </button>

              {esCelular && (
                <button onClick={() => { setMenuAbierto(!menuAbierto); setCatsCelAbiertas(false); setCatCelAbierta(null); }}
                  aria-label="Menú" aria-expanded={menuAbierto}
                  style={{ background: "none", border: "none", color: T, cursor: "pointer", width: 38, height: 38, borderRadius: 999, display: "flex", flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center" }}>
                  <span style={{ display: "block", width: 19, height: 2, borderRadius: 2, background: T, transition: "all 0.3s", transform: menuAbierto ? "rotate(45deg) translate(4px,4px)" : "none" }}/>
                  <span style={{ display: "block", width: 19, height: 2, borderRadius: 2, background: T, transition: "all 0.3s", opacity: menuAbierto ? 0 : 1 }}/>
                  <span style={{ display: "block", width: 19, height: 2, borderRadius: 2, background: T, transition: "all 0.3s", transform: menuAbierto ? "rotate(-45deg) translate(4px,-4px)" : "none" }}/>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── MENÚ DE CELULAR ── */}
      {esCelular && menuAbierto && (
        <div style={{ position: "fixed", top: altoAnuncio + altoBarra, left: 0, right: 0, bottom: 0, background: BG, zIndex: CAPAS.menuMobile, overflowY: "auto", overscrollBehavior: "contain", padding: "14px 14px 40px" }}>
          {categorias.length > 0 && (
            <div style={{ background: S, border: `1px solid ${LN}`, borderRadius: RAD, overflow: "hidden", marginBottom: 12 }}>
              <button onClick={() => setCatsCelAbiertas(!catsCelAbiertas)}
                style={{ display: "flex", width: "100%", background: "none", border: "none", color: T, padding: "16px 18px", fontSize: 15, fontWeight: 700, textAlign: "left", cursor: "pointer", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                Categorías
                <span style={{ fontSize: 11, color: T2, transform: catsCelAbiertas ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
              </button>
              {catsCelAbiertas && categorias.map(cat => {
                const subs = subcategorias[cat] || [];
                return (
                  <div key={cat}>
                    {subs.length > 0 ? (
                      <button onClick={() => setCatCelAbierta(catCelAbierta === cat ? null : cat)}
                        style={{ display: "flex", width: "100%", background: "none", border: "none", borderTop: `1px solid ${LN}`, color: T, padding: "14px 18px 14px 30px", fontSize: 14, fontWeight: 500, textAlign: "left", cursor: "pointer", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                        {cat}
                        <span style={{ fontSize: 13, color: T2, transform: catCelAbierta === cat ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>›</span>
                      </button>
                    ) : (
                      <Link href={urlCategoria(cat)} onClick={() => setMenuAbierto(false)}
                        style={{ display: "block", width: "100%", borderTop: `1px solid ${LN}`, color: T, padding: "14px 18px 14px 30px", fontSize: 14, fontWeight: 500, textDecoration: "none", boxSizing: "border-box" }}>
                        {cat}
                      </Link>
                    )}
                    {subs.length > 0 && catCelAbierta === cat && subs.map(sub => (
                      <Link key={sub} href={urlCategoria(cat, sub)} onClick={() => setMenuAbierto(false)}
                        style={{ display: "block", width: "100%", background: "rgba(20,22,26,0.02)", borderTop: `1px solid ${LN}`, color: T2, padding: "12px 18px 12px 44px", fontSize: 13.5, textDecoration: "none", boxSizing: "border-box" }}>
                        {sub}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ background: S, border: `1px solid ${LN}`, borderRadius: RAD, overflow: "hidden" }}>
            {[["Catálogo", catalogHref], ["Nosotros", url("/nosotros")], ["Contacto", url("/contacto")]].map(([texto, href], i) => (
              <Link key={texto} href={href} onClick={() => setMenuAbierto(false)}
                style={{ display: "block", width: "100%", borderTop: i > 0 ? `1px solid ${LN}` : "none", color: T, padding: "16px 18px", fontSize: 15, fontWeight: 500, textDecoration: "none", boxSizing: "border-box" }}>
                {texto}
              </Link>
            ))}
            <button onClick={() => { setFavoritesOpen(true); setMenuAbierto(false); setUserDropdownOpen(false); setCartOpen(false); }}
              style={{ display: "block", width: "100%", background: "none", border: "none", borderTop: `1px solid ${LN}`, color: T, padding: "16px 18px", fontSize: 15, fontWeight: 500, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
              Favoritos {favorites.length > 0 && <span style={{ color: G, fontWeight: 800 }}>({favorites.length})</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── EL BUSCADOR ──
          Va en `CAPAS.buscador`, ARRIBA de la barra. Compartiendo capa con ella,
          la × queda justo debajo del botón del carrito y el clic se lo come la
          barra: medido, no llegaba nunca.
          Cierra de tres maneras —la ×, tocando afuera y Escape (que lo maneja
          `useCartLogic`)— porque con una sola, si esa falla, no hay salida. */}
      {searchOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: CAPAS.buscador, background: "rgba(244,244,241,0.94)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 110 }}>
          <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"
            style={{ position: "absolute", top: 20, right: 24, width: 40, height: 40, borderRadius: 999, background: S, border: `1px solid ${LN}`, color: T, fontSize: 22, cursor: "pointer", lineHeight: 1, display: "grid", placeItems: "center" }}>×</button>
          <div style={{ width: "100%", maxWidth: 660, padding: "0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: S, border: `1px solid ${LN}`, borderRadius: 999, padding: "6px 10px 6px 22px", boxShadow: "0 10px 30px rgba(20,22,26,0.06)" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={T2} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                style={{ flex: 1, background: "transparent", border: "none", color: T, fontSize: 17, padding: "14px 0", outline: "none", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0 }}/>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div style={{ width: "100%", maxWidth: 660, padding: "22px 24px 0", overflowY: "auto", maxHeight: "calc(100vh - 250px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: esCelular ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 14 }}>
                {searchResults.map(p => (
                  <Link key={p.id} href={`/tienda/${slug}/producto/${p.id}${sufijo}`} onClick={() => setSearchOpen(false)}
                    style={{ background: S, border: `1px solid ${LN}`, borderRadius: RAD - 4, textAlign: "left", color: T, overflow: "hidden", textDecoration: "none", display: "block" }}>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: BG }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 200px" style={{ objectFit: "cover" }}/>}
                    </div>
                    <div style={{ padding: "10px 12px 12px" }}>
                      <p style={{ fontSize: 12.5, margin: "0 0 5px", fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{p.name}</p>
                      <PromoPrice product={p} promotions={promotions} fmt={fmt} accent={G}
                        priceSize={13} compareSize={11} weight={800} ocultarPrecios={ocultarPrecios} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color: T2, marginTop: 30, fontSize: 14 }}>Sin resultados para &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}
    </>
  );
}
