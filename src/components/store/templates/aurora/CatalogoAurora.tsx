"use client";
import { useEffect, useMemo, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo } from "@/lib/promoDisplay";
import { useFiltrosCatalogo, type FiltroInicial } from "@/hooks/useFiltrosCatalogo";
import { GrillaProfunda } from "@/components/store/templates/shared/GrillaProfunda";
import { TarjetaAurora, type TintaTarjeta } from "@/components/store/templates/aurora/TarjetaAurora";

/* ══════════════════════════════════════════════════════════════════════════
   EL CATÁLOGO DE AURORA
   ══════════════════════════════════════════════════════════════════════════

   Hasta el 03/10/26 Aurora mostraba `CatalogoGenerico`, el catálogo de todos
   los templates con su paleta: las mismas tarjetas, los mismos filtros y la
   ficha genérica. La portada prometía una tienda futurista y al tocar "Ver
   colección" aparecía otra. Flavio: "eso me la baja".

   Este es el suyo. Las REGLAS son las de siempre (`useFiltrosCatalogo`, el
   mismo cerebro que usa el catálogo compartido): lo que cambia es la cara.

     · Arriba, una escena de luz con el título de lo que se está mirando.
     · Una barra de vidrio que acompaña el scroll: buscar, ordenar, filtros.
     · Las categorías como cápsulas de vidrio; la elegida se enciende.
     · Las MISMAS piezas de la portada (`TarjetaAurora`), que llegan en
       profundidad, y al tocarlas abre la ficha de Aurora con su vuelo.
     · En vez de números de página, una línea de luz que se llena y "Mostrar
       más": en una tienda de ropa se mira de corrido, no se salta a la 4.
     · Los filtros finos en un panel de vidrio: al costado en la compu, desde
       abajo en el celular. */

const POR_TANDA = 24;

const ORDENES: { valor: string; label: string }[] = [
  { valor: "newest",     label: "Lo último" },
  { valor: "price_asc",  label: "Menor precio" },
  { valor: "price_desc", label: "Mayor precio" },
  { valor: "discount",   label: "Mayor descuento" },
  { valor: "name_az",    label: "A — Z" },
];

export type EscenaCatalogo = {
  BG: string; T: string; G: string; GT: string;
  LINEA: string; LINEA_FUERTE: string;
  luz: (a: number) => string;
  textoSobreAcento: string;
};

export function CatalogoAurora({
  products, promotions, cargando, inicial, fmt, ocultarPrecios,
  favorites, onFavorito, onAbrir, onVolver, tinta, escena, isMobile, topeBarra, capaPanel,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  cargando: boolean;
  inicial: FiltroInicial;
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  favorites: string[];
  onFavorito: (id: string) => void;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  onVolver: () => void;
  tinta: TintaTarjeta;
  escena: EscenaCatalogo;
  isMobile: boolean;
  /** Dónde se pega la barra de control: justo debajo de la barra del template. */
  topeBarra: number;
  /** La capa del panel de filtros. La decide Aurora, igual que la de su ficha. */
  capaPanel: number;
}) {
  const { BG, T, G, GT, LINEA, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const f = useFiltrosCatalogo({ products, promotions, inicial, porPagina: POR_TANDA });
  const [panelAbierto, setPanelAbierto] = useState(false);

  const hayPromos = useMemo(() => products.some(p => {
    const d = resolveProductPromo(p, promotions);
    return d.hasPriceDrop || !!d.nxm || d.freeShipping || d.pctOff != null;
  }), [products, promotions]);

  /* "Mostrar más" en vez de páginas: se muestran las tandas que se pidieron. */
  const visibles = f.filtered.slice(0, f.page * POR_TANDA);
  const total = f.filtered.length;
  const subs = f.activeCategory !== "Todos" ? (f.subcategoriesFor[f.activeCategory] ?? []) : [];

  const tituloCrudo = f.onlyPromos ? "En promoción"
    : f.onlyOfertas ? "Ofertas"
    : f.onlyDestacados ? "Lo más buscado"
    : f.activeSubcategory ? f.activeSubcategory
    : f.activeCategory === "Todos" ? "Toda la colección" : f.activeCategory;
  /* Sólo la primera letra: las categorías se cargan en minúscula ("pantalones")
     y `capitalize` de CSS ponía mayúscula a cada palabra ("Toda La Colección"). */
  const titulo = tituloCrudo.charAt(0).toUpperCase() + tituloCrudo.slice(1);

  /* Cuántos filtros finos hay puestos: es el número del botón "Filtros". */
  const filtrosPuestos = (f.onlyOfertas ? 1 : 0) + (f.onlyPromos ? 1 : 0) + (f.onlyDestacados ? 1 : 0)
    + (f.priceRange ? 1 : 0) + Object.values(f.activeAttrFilters).reduce((n, v) => n + v.length, 0);

  const limpiarTodo = () => {
    f.setOnlyOfertas(false); f.setOnlyPromos(false); f.setOnlyDestacados(false);
    f.setPriceRange(null); f.clearAttrFilters(); f.setSearch(""); f.changeCategory("Todos");
  };

  /* Escape cierra el panel; mientras está abierto, la página de atrás no se mueve. */
  useEffect(() => {
    if (!panelAbierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelAbierto(false); };
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = antes; };
  }, [panelAbierto]);

  const capsula = (activa: boolean): React.CSSProperties => ({
    flexShrink:0, borderRadius:999, padding: isMobile ? "9px 16px" : "10px 20px",
    fontSize:11, letterSpacing:2, textTransform:"uppercase", fontWeight:600, cursor:"pointer",
    whiteSpace:"nowrap", transition:"background .25s, box-shadow .25s, color .25s, border-color .25s",
    background: activa ? G : "rgba(255,255,255,0.04)",
    color: activa ? textoSobreAcento : T,
    border:`1px solid ${activa ? G : LINEA_FUERTE}`,
    boxShadow: activa ? `0 0 28px ${luz(0.45)}, inset 0 1px 0 rgba(255,255,255,0.25)` : "none",
  });

  /* La fila de cápsulas. Se funde en los bordes: si hay más categorías de las que
     entran, el corte avisa que se puede deslizar en vez de parecer un error. */
  const pista: React.CSSProperties = {
    display:"flex", overflowX:"auto", scrollbarWidth:"none",
    padding: isMobile ? "12px 16px" : "14px 22px", margin: isMobile ? "-12px -16px 0" : "-14px -22px 0",
    maskImage:"linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 36px), transparent 100%)",
    WebkitMaskImage:"linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 36px), transparent 100%)",
  };

  const campo: React.CSSProperties = {
    background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, color:T,
    borderRadius:999, padding:"11px 16px", fontSize:13, outline:"none", fontFamily:"inherit",
  };

  return (
    <div style={{ position:"relative", color:T }}>
      {/* ── LA ESCENA ─────────────────────────────────────────────────────
          Dos luces del acento detrás del título: es la misma "aurora" del
          template, para que el catálogo se lea como otra sala de la misma
          tienda y no como una página de listado. */}
      <div aria-hidden style={{ position:"absolute", inset:"0 0 auto 0", height: isMobile ? 320 : 460, pointerEvents:"none", overflow:"hidden",
        background:`radial-gradient(42% 70% at 18% 20%, ${luz(0.32)}, transparent 72%), radial-gradient(38% 60% at 82% 0%, ${luz(0.18)}, transparent 70%)` }} />

      <header style={{ position:"relative", maxWidth:1400, margin:"0 auto", padding: isMobile ? "20px 16px 18px" : "34px 32px 30px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom: isMobile ? 22 : 34 }}>
          <button onClick={onVolver}
            style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.05)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", border:`1px solid ${LINEA_FUERTE}`, color:T, borderRadius:999, padding:"9px 16px 9px 12px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontWeight:600 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la tienda
          </button>
          <span style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"rgba(242,242,247,0.5)", fontVariantNumeric:"tabular-nums" }}>
            {cargando ? "…" : `${total} ${total === 1 ? "pieza" : "piezas"}`}
          </span>
        </div>
        <p style={{ margin:"0 0 12px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>Catálogo</p>
        <h1 style={{ margin:0, fontFamily:"var(--au-titulo, inherit)", fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.02,
          fontSize: isMobile ? "clamp(34px,10vw,46px)" : "clamp(48px,6vw,84px)",
          background:`linear-gradient(100deg, ${T} 40%, ${luz(0.9)} 120%)`, WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent",
          overflowWrap:"anywhere" }}>
          {titulo}
        </h1>
      </header>

      {/* ── LA BARRA DE CONTROL ───────────────────────────────────────────
          Se pega debajo de la barra del template y acompaña el scroll: buscar,
          ordenar y filtrar siempre a mano, sin volver arriba. */}
      <div style={{ position:"sticky", top:topeBarra, zIndex:20, padding: isMobile ? "0 10px" : "0 24px", marginBottom: isMobile ? 18 : 28 }}>
        <div style={{ maxWidth:1352, margin:"0 auto", display:"flex", alignItems:"center", gap: isMobile ? 8 : 12,
          background:"rgba(10,11,20,0.72)", backdropFilter:"blur(20px) saturate(150%)", WebkitBackdropFilter:"blur(20px) saturate(150%)",
          border:`1px solid ${LINEA_FUERTE}`, borderRadius:999, padding: isMobile ? 6 : 8, boxShadow:"0 14px 40px rgba(0,0,0,0.45)" }}>
          <label style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, padding:"0 8px 0 12px" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, opacity:0.6 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={f.search} onChange={e => { f.setSearch(e.target.value); f.setPage(1); }}
              placeholder="Buscar en el catálogo" aria-label="Buscar en el catálogo"
              style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none", color:T, fontSize:14, padding:"8px 0", fontFamily:"inherit" }} />
            {f.search && (
              <button onClick={() => f.setSearch("")} aria-label="Borrar búsqueda" style={{ background:"none", border:"none", color:T, opacity:0.5, cursor:"pointer", fontSize:16, lineHeight:1, padding:4 }}>×</button>
            )}
          </label>
          {!isMobile && (
            <select value={f.sortBy} onChange={e => { f.setSortBy(e.target.value); f.setPage(1); }} aria-label="Ordenar"
              style={{ ...campo, padding:"10px 14px", fontSize:12, letterSpacing:1, cursor:"pointer", appearance:"none", WebkitAppearance:"none", paddingRight:30,
                backgroundImage:`linear-gradient(45deg, transparent 50%, ${T} 50%), linear-gradient(135deg, ${T} 50%, transparent 50%)`,
                backgroundPosition:"calc(100% - 16px) 52%, calc(100% - 11px) 52%", backgroundSize:"5px 5px, 5px 5px", backgroundRepeat:"no-repeat" }}>
              {ORDENES.map(o => <option key={o.valor} value={o.valor} style={{ color:"#111" }}>{o.label}</option>)}
            </select>
          )}
          <button onClick={() => setPanelAbierto(true)} aria-label="Filtros"
            style={{ display:"inline-flex", alignItems:"center", gap:8, flexShrink:0, background: filtrosPuestos ? luz(0.18) : "rgba(255,255,255,0.06)", border:`1px solid ${filtrosPuestos ? luz(0.55) : LINEA_FUERTE}`, color:T, borderRadius:999, padding: isMobile ? "10px 14px" : "10px 18px", fontSize:11, letterSpacing:2, textTransform:"uppercase", fontWeight:600, cursor:"pointer" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            {!isMobile && "Filtros"}
            {filtrosPuestos > 0 && (
              <span style={{ minWidth:18, height:18, borderRadius:999, background:G, color:textoSobreAcento, fontSize:10, fontWeight:800, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"0 5px", letterSpacing:0 }}>{filtrosPuestos}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── CATEGORÍAS ─────────────────────────────────────────────────── */}
      {f.CATEGORIES.length > 1 && (
        <nav aria-label="Categorías" style={{ maxWidth:1400, margin:"0 auto", padding: isMobile ? "0 16px" : "0 32px" }}>
          {/* El margen negativo con su padding deja lugar al brillo de la cápsula
              elegida: sin eso el borde de la fila lo cortaba en un rectángulo. */}
          <div className="au-cat-pista" style={{ ...pista, gap:10, paddingBottom:16 }}>
            {f.CATEGORIES.map(cat => {
              return (
                <button key={cat} onClick={() => f.changeCategory(cat)} aria-pressed={f.activeCategory === cat} style={capsula(f.activeCategory === cat)}>
                  {cat === "Todos" ? "Todo" : cat}
                </button>
              );
            })}
          </div>
          {subs.length > 0 && (
            <div className="au-cat-pista" style={{ ...pista, gap:8, paddingTop:0, marginTop:-14, paddingBottom:16 }}>
              {subs.map(sub => {
                const activa = f.activeSubcategory === sub;
                return (
                  <button key={sub} onClick={() => f.changeCategory(f.activeCategory, activa ? null : sub)} aria-pressed={activa}
                    style={{ flexShrink:0, borderRadius:999, padding:"7px 14px", fontSize:10.5, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", whiteSpace:"nowrap",
                      background: activa ? luz(0.2) : "transparent", color: activa ? T : "rgba(242,242,247,0.65)", border:`1px solid ${activa ? luz(0.6) : LINEA}` }}>
                    {sub}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      )}

      {/* ── LAS PIEZAS ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding: isMobile ? "8px 16px 80px" : "12px 32px 110px", overflowX:"clip" }}>
        {cargando ? (
          <p style={{ textAlign:"center", padding:"80px 0", fontSize:11, letterSpacing:4, textTransform:"uppercase", opacity:0.45 }}>Cargando…</p>
        ) : total === 0 ? (
          /* Nada que mostrar: una luz quieta y la salida a mano. */
          <div style={{ textAlign:"center", padding: isMobile ? "60px 0" : "90px 0" }}>
            <div aria-hidden style={{ width:120, height:120, margin:"0 auto 26px", borderRadius:"50%", background:`radial-gradient(circle at 40% 35%, ${luz(0.6)}, ${luz(0.08)} 60%, transparent 72%)`, filter:"blur(2px)" }} />
            <p style={{ fontFamily:"var(--au-titulo, inherit)", fontSize:22, margin:"0 0 8px" }}>Nada por acá</p>
            <p style={{ fontSize:13, opacity:0.55, margin:"0 0 24px" }}>Ninguna pieza coincide con lo que elegiste.</p>
            <button onClick={limpiarTodo} style={capsula(true)}>Ver toda la colección</button>
          </div>
        ) : (
          <>
            {/* La key rearma la grilla al cambiar el filtro: así las piezas
                vuelven a llegar en profundidad, en vez de cambiar de golpe. */}
            <GrillaProfunda key={`${f.activeCategory}|${f.activeSubcategory}|${f.sortBy}|${f.onlyOfertas}|${f.onlyPromos}|${f.onlyDestacados}`}
              min={isMobile ? 140 : 250} hueco={isMobile ? 12 : 22}>
              {visibles.map((p, i) => (
                <TarjetaAurora key={p.id} product={p} indice={i % POR_TANDA}
                  promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
                  favorito={favorites.includes(p.id)} onFavorito={() => onFavorito(p.id)}
                  onAbrir={e => onAbrir(p, e)} tinta={tinta} />
              ))}
            </GrillaProfunda>

            {/* ── CUÁNTO FALTA ──────────────────────────────────────────
                Una línea de luz que se llena con lo que ya se vio. */}
            <div style={{ maxWidth:420, margin: isMobile ? "44px auto 0" : "64px auto 0", textAlign:"center" }}>
              <p style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", opacity:0.55, margin:"0 0 14px", fontVariantNumeric:"tabular-nums" }}>
                {visibles.length} de {total}
              </p>
              <div style={{ height:2, background:LINEA_FUERTE, borderRadius:2, overflow:"hidden", marginBottom:22 }}>
                <div style={{ height:"100%", width:`${(visibles.length / total) * 100}%`, background:G, boxShadow:`0 0 14px ${luz(0.9)}`, transition:"width .6s cubic-bezier(.22,.9,.28,1)" }} />
              </div>
              {visibles.length < total && (
                <button onClick={() => f.setPage(f.page + 1)} style={{ ...capsula(false), padding:"13px 30px" }}>
                  Mostrar más
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── EL PANEL DE FILTROS ─────────────────────────────────────────── */}
      {panelAbierto && (
        <div role="dialog" aria-modal="true" aria-label="Filtros" onClick={e => { if (e.target === e.currentTarget) setPanelAbierto(false); }}
          style={{ position:"fixed", inset:0, zIndex:capaPanel, background:"rgba(3,4,8,0.62)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
            display:"flex", justifyContent: isMobile ? "stretch" : "flex-end", alignItems: isMobile ? "flex-end" : "stretch" }}>
          <div style={{ width: isMobile ? "100%" : 400, maxHeight: isMobile ? "86vh" : "100%", display:"flex", flexDirection:"column",
            background:`radial-gradient(80% 40% at 100% 0%, ${luz(0.16)}, transparent 70%), rgba(12,13,24,0.94)`,
            backdropFilter:"blur(24px) saturate(150%)", WebkitBackdropFilter:"blur(24px) saturate(150%)",
            borderLeft: isMobile ? "none" : `1px solid ${LINEA_FUERTE}`, borderTop: isMobile ? `1px solid ${LINEA_FUERTE}` : "none",
            borderRadius: isMobile ? "22px 22px 0 0" : 0, boxShadow:"0 0 60px rgba(0,0,0,0.6)", color:T }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 22px 14px", borderBottom:`1px solid ${LINEA}` }}>
              <p style={{ margin:0, fontSize:11, letterSpacing:4, textTransform:"uppercase", fontWeight:700 }}>Filtros</p>
              <button onClick={() => setPanelAbierto(false)} aria-label="Cerrar filtros" style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${LINEA_FUERTE}`, color:T, width:34, height:34, borderRadius:999, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", overscrollBehavior:"contain", padding:"18px 22px 22px", display:"flex", flexDirection:"column", gap:26 }}>
              {isMobile && (
                <section>
                  <p style={rotulo(GT)}>Ordenar</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {ORDENES.map(o => (
                      <button key={o.valor} onClick={() => { f.setSortBy(o.valor); f.setPage(1); }} aria-pressed={f.sortBy === o.valor} style={capsula(f.sortBy === o.valor)}>{o.label}</button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <p style={rotulo(GT)}>Mostrar</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {f.hayOfertas && <Interruptor texto="Sólo ofertas" activo={f.onlyOfertas} onClick={() => { f.setOnlyOfertas(!f.onlyOfertas); f.setPage(1); }} escena={escena} />}
                  {hayPromos && <Interruptor texto="Sólo en promoción" activo={f.onlyPromos} onClick={() => { f.setOnlyPromos(!f.onlyPromos); f.setPage(1); }} escena={escena} />}
                  <Interruptor texto="Lo más buscado primero" activo={f.onlyDestacados} onClick={() => { f.setOnlyDestacados(!f.onlyDestacados); f.setPage(1); }} escena={escena} />
                </div>
              </section>
              {!ocultarPrecios && f.priceBounds[1] > f.priceBounds[0] && (
                <section>
                  <p style={rotulo(GT)}>Precio</p>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <CampoPrecio etiqueta="Desde" valor={f.effectivePriceRange[0]} estilo={campo}
                      onCambio={v => { f.setPriceRange([Math.min(v, f.effectivePriceRange[1]), f.effectivePriceRange[1]]); f.setPage(1); }} />
                    <span style={{ opacity:0.4 }}>—</span>
                    <CampoPrecio etiqueta="Hasta" valor={f.effectivePriceRange[1]} estilo={campo}
                      onCambio={v => { f.setPriceRange([f.effectivePriceRange[0], Math.max(v, f.effectivePriceRange[0])]); f.setPage(1); }} />
                  </div>
                  <p style={{ margin:"8px 2px 0", fontSize:11, opacity:0.45 }}>De {fmt(f.priceBounds[0])} a {fmt(f.priceBounds[1])}</p>
                </section>
              )}
              {f.availableAttrFilters.map(({ key, values }) => (
                <section key={key}>
                  <p style={rotulo(GT)}>{key}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {values.map(v => {
                      const activo = (f.activeAttrFilters[key] ?? []).includes(v);
                      return <button key={v} onClick={() => f.toggleAttrFilter(key, v)} aria-pressed={activo} style={capsula(activo)}>{v}</button>;
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, padding:"14px 22px 20px", borderTop:`1px solid ${LINEA}`, background:BG + "cc" }}>
              <button onClick={limpiarTodo} style={{ ...capsula(false), flex:1 }}>Limpiar</button>
              <button onClick={() => setPanelAbierto(false)} style={{ ...capsula(true), flex:1.4 }}>
                Ver {total} {total === 1 ? "pieza" : "piezas"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.au-cat-pista::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

function rotulo(color: string): React.CSSProperties {
  return { margin:"0 0 12px", fontSize:10, letterSpacing:3.5, textTransform:"uppercase", fontWeight:700, color };
}

/** Un sí/no de vidrio: la perilla se enciende con el acento. */
function Interruptor({ texto, activo, onClick, escena }: { texto: string; activo: boolean; onClick: () => void; escena: EscenaCatalogo }) {
  const { G, T, LINEA_FUERTE, luz } = escena;
  return (
    <button onClick={onClick} role="switch" aria-checked={activo}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, width:"100%", background: activo ? luz(0.1) : "rgba(255,255,255,0.03)", border:`1px solid ${activo ? luz(0.45) : LINEA_FUERTE}`, borderRadius:14, padding:"12px 14px", color:T, fontSize:13, cursor:"pointer", textAlign:"left", transition:"background .2s, border-color .2s" }}>
      {texto}
      <span aria-hidden style={{ position:"relative", width:38, height:22, borderRadius:999, flexShrink:0, background: activo ? G : "rgba(255,255,255,0.12)", boxShadow: activo ? `0 0 16px ${luz(0.55)}` : "none", transition:"background .2s" }}>
        <span style={{ position:"absolute", top:3, left: activo ? 19 : 3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s cubic-bezier(.22,.9,.28,1)" }} />
      </span>
    </button>
  );
}

/** Un precio que se escribe. Guarda lo tipeado y recién lo aplica al salir o con Enter:
 *  aplicarlo por tecla filtraba con "1" mientras se escribía "15000". */
function CampoPrecio({ etiqueta, valor, onCambio, estilo }: { etiqueta: string; valor: number; onCambio: (v: number) => void; estilo: React.CSSProperties }) {
  const [texto, setTexto] = useState<string | null>(null);
  const aplicar = () => {
    if (texto == null) return;
    const n = Number(texto.replace(/\D/g, ""));
    if (Number.isFinite(n) && texto.trim() !== "") onCambio(n);
    setTexto(null);
  };
  return (
    <label style={{ flex:1, minWidth:0 }}>
      <span style={{ display:"block", fontSize:10, letterSpacing:2, textTransform:"uppercase", opacity:0.5, margin:"0 0 6px 4px" }}>{etiqueta}</span>
      <input inputMode="numeric" value={texto ?? String(Math.round(valor))}
        onChange={e => setTexto(e.target.value)} onBlur={aplicar} onKeyDown={e => { if (e.key === "Enter") aplicar(); }}
        style={{ ...estilo, width:"100%", boxSizing:"border-box", fontVariantNumeric:"tabular-nums" }} />
    </label>
  );
}
