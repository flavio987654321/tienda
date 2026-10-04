"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { EditableZone } from "@/contexts/EditContext";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   RECIÉN LLEGADO (B-3 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Lo último que entró, solo: el cliente que vuelve ve lo nuevo sin buscarlo.
   Es una LÍNEA DE TIEMPO de luz: los productos cuelgan sobre una línea que los
   une, cada uno con su punto y cuándo entró ("Hoy", "Hace 3 días"). Se desliza
   de costado —con el dedo, o con las flechas en la compu— y las piezas giran
   apenas hacia el centro según dónde están, así la franja tiene profundidad.

   Automático: los últimos que entraron con foto. Si hay menos de tres, no se
   dibuja (una línea de tiempo de dos puntos no cuenta nada). */

const CUANTOS = 8;
const MINIMO = 3;
const DIA = 86_400_000;

/* El día de hoy, para decir "hace 3 días". Va por `useSyncExternalStore` con
   `null` en el servidor: el servidor y el navegador no tienen la misma hora, y
   un texto distinto en cada uno rompe la hidratación. Se lee al montar. */
const sinSuscripcion = () => () => {};
const hoyEnDias = () => Math.floor(Date.now() / DIA);

function cuando(creado: string | undefined, hoy: number | null): string | null {
  if (!creado || hoy === null) return null;
  const t = Date.parse(creado);
  if (Number.isNaN(t)) return null;
  const dias = hoy - Math.floor(t / DIA);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 14) return "Hace una semana";
  if (dias < 31) return `Hace ${Math.floor(dias / 7)} semanas`;
  // Más viejo: la fecha ("18 ago"). Una línea de tiempo sin marcas no es una línea de tiempo.
  return new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
}

export function RecienLlegado({ products, fmt, ocultarPrecios, onAbrir, escena, isMobile }: {
  products: StorefrontProduct[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, G, GT, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const pistaRef = useRef<HTMLDivElement>(null);
  const hoy = useSyncExternalStore(sinSuscripcion, hoyEnDias, () => null);

  const nuevos = useMemo(() => {
    const conFoto = products.filter(p => p.images[0]);
    // La API ya los manda del más nuevo al más viejo; se ordena igual por si
    // alguno llega sin fecha o de otra fuente.
    return [...conFoto].sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0)).slice(0, CUANTOS);
  }, [products]);

  /* La profundidad: cada tarjeta gira según su distancia al centro de la
     pista. Va por variables CSS escritas en el nodo, no por estado: el scroll
     dispara decenas de eventos por segundo. */
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      const r = pista.getBoundingClientRect();
      const centro = r.left + r.width / 2;
      pista.querySelectorAll<HTMLElement>("[data-pieza]").forEach(el => {
        const c = el.getBoundingClientRect();
        const d = Math.max(-1, Math.min(1, (c.left + c.width / 2 - centro) / (r.width / 2)));
        el.style.setProperty("--au-d", d.toFixed(3));
        el.style.setProperty("--au-s", (1 - Math.abs(d) * 0.07).toFixed(3));
      });
    };
    const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(medir); };
    medir();
    pista.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { pista.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); cancelAnimationFrame(cuadro); };
  }, [nuevos.length]);

  if (nuevos.length < MINIMO) return null;

  const mover = (lado: 1 | -1) => {
    const pista = pistaRef.current;
    if (pista) pista.scrollBy({ left: lado * pista.clientWidth * 0.7, behavior: "smooth" });
  };
  const flecha: React.CSSProperties = {
    width:44, height:44, borderRadius:999, display:"grid", placeItems:"center", cursor:"pointer", color:T,
    background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
  };
  const ancho = isMobile ? 210 : 270;

  return (
    <section data-reveal className="au-recien" style={{ position:"relative", overflow:"hidden", background:BG, padding: isMobile ? "56px 0 48px" : "96px 0 80px" }}>
      <style>{`
        .au-recien-pista { scrollbar-width: none }
        .au-recien-pista::-webkit-scrollbar { display: none }
        .au-recien [data-pieza] > .au-cara { transform: perspective(900px) rotateY(calc(var(--au-d, 0) * -16deg)) scale(var(--au-s, 1)); transition: transform .12s linear }
        @media (hover: hover) { .au-recien [data-pieza]:hover .au-foto-img { transform: scale(1.06) } }
      `}</style>
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(50% 60% at 15% 20%, ${luz(0.14)}, transparent 70%)` }} />

      <div style={{ position:"relative", maxWidth:1240, margin:"0 auto", padding: isMobile ? "0 20px" : "0 40px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:20, marginBottom: isMobile ? 26 : 40 }}>
        <div style={{ minWidth:0 }}>
          <p style={{ margin:"0 0 14px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="recienKicker" label="Etiqueta de recién llegado">Recién llegado</EditableZone>
          </p>
          <h2 style={{ margin:0, fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.08, color:T,
            fontSize: isMobile ? "clamp(28px,8vw,36px)" : "clamp(32px,3.6vw,52px)" }}>
            <EditableZone field="recienTitulo" label="Título de recién llegado">Lo último que entró</EditableZone>
          </h2>
        </div>
        {!isMobile && (
          <div style={{ display:"flex", gap:10, flexShrink:0 }}>
            <button type="button" onClick={() => mover(-1)} aria-label="Ver los anteriores" style={flecha}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" onClick={() => mover(1)} aria-label="Ver los siguientes" style={flecha}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}
      </div>

      <div ref={pistaRef} className="au-recien-pista"
        style={{ position:"relative", display:"flex", gap: isMobile ? 16 : 26, overflowX:"auto", scrollSnapType:"x mandatory",
          padding: isMobile ? "10px 20px 0" : "14px max(40px, calc((100vw - 1240px) / 2 + 40px)) 0", scrollPaddingInline: isMobile ? 20 : 40 }}>
        {nuevos.map((p, i) => {
          const etiqueta = cuando(p.createdAt, hoy);
          return (
            <div key={p.id} data-pieza style={{ flex:`0 0 ${ancho}px`, scrollSnapAlign:"start", position:"relative", paddingBottom:64 }}>
              <div className="au-cara" onClick={e => onAbrir(p, e)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(p, e as unknown as React.MouseEvent); } }}
                aria-label={`Ver ${p.name}`}
                style={{ cursor:"pointer", borderRadius:20, overflow:"hidden", border:`1px solid ${LINEA_FUERTE}`, background:"rgba(255,255,255,0.04)",
                  boxShadow: i === 0 ? `0 26px 60px rgba(0,0,0,0.5), 0 0 50px ${luz(0.25)}` : "0 22px 50px rgba(0,0,0,0.45)" }}>
                <div data-foto style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:"#0e0f1a" }}>
                  <FadeImage className="au-foto-img" src={p.images[0]} alt={p.name} fill sizes={`${ancho}px`}
                    style={{ objectFit:"cover", transition:"transform .6s cubic-bezier(.2,.8,.2,1)" }} />
                  {i === 0 && (
                    <span style={{ position:"absolute", top:12, left:12, background:G, color:textoSobreAcento, borderRadius:999, padding:"5px 11px",
                      fontSize:9.5, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", boxShadow:`0 0 20px ${luz(0.6)}` }}>Lo más nuevo</span>
                  )}
                </div>
                <div style={{ padding:"14px 16px 16px" }}>
                  <p style={{ margin:"0 0 6px", fontSize:14, color:T, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                  <p style={{ margin:0, fontSize:15, fontWeight:600, color: ocultarPrecios ? GT : T }}>{ocultarPrecios ? "Consultá precio" : fmt(p.price)}</p>
                </div>
              </div>
              {/* Su punto en la línea de tiempo, y cuándo entró. */}
              <span aria-hidden style={{ position:"absolute", left:"50%", bottom:31, width: i === 0 ? 11 : 8, height: i === 0 ? 11 : 8, transform:"translate(-50%, 50%)",
                borderRadius:999, background: i === 0 ? G : "rgba(242,242,247,0.85)", boxShadow:`0 0 ${i === 0 ? 18 : 10}px ${luz(i === 0 ? 0.9 : 0.5)}`, zIndex:1 }} />
              <span style={{ position:"absolute", left:0, right:0, bottom:0, textAlign:"center", fontSize:10, letterSpacing:2, textTransform:"uppercase",
                color: i === 0 ? GT : "rgba(242,242,247,0.5)", fontWeight:600, minHeight:14 }}>{etiqueta ?? ""}</span>
            </div>
          );
        })}
        {/* La línea de tiempo: cruza la pista entera por debajo de las piezas. */}
        <div aria-hidden style={{ position:"absolute", left:0, bottom:31, height:1, pointerEvents:"none",
          width:`calc(${nuevos.length} * (${ancho}px + ${isMobile ? 16 : 26}px) + 200px)`,
          background:`linear-gradient(90deg, ${luz(0.9)}, ${luz(0.35)} 60%, transparent)` }} />
      </div>
    </section>
  );
}
