"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useHomeReviews, type EjemplosDeResenas, type HomeReview } from "@/hooks/useHomeReviews";
import { EditableZone } from "@/contexts/EditContext";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { COMENTARIO_MAX, RESENADOR_MAX } from "@/lib/reviews";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE DICEN (B-4 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Las reseñas de TODA la tienda en la portada. Aurora tenía un bloque de
   "prueba social" y se sacó para acortar la página; desde ahí las reseñas
   sólo estaban adentro de cada ficha, que es justo donde no las ve el que
   todavía no se decidió a abrir nada.

   La FUNCIÓN es la de todos (`useHomeReviews`): de dónde salen, cuáles suben
   (4★ y 5★ con comentario, y las de tienda que la dueña aprobó), el promedio
   real, borrar, y el formulario de reseña de TIENDA — el único lugar de la
   tienda desde donde se deja una.

   La CARA es de Aurora:
     · un medidor de luz que se llena con el promedio;
     · las reseñas como piezas de vidrio en una pista que gira: la del centro
       de frente, las de los costados inclinadas hacia adentro;
     · la de un producto lleva su foto (y abre su ficha); la de la tienda, la
       marca "Sobre la tienda" — sin inventarle una foto.
   El bloque se dibuja SIEMPRE, aunque no haya ninguna: adentro está el botón
   para dejar la primera. */

const EJEMPLOS: EjemplosDeResenas = {
  producto: [
    { id:"au-h1", rating:5, reviewer:"Lucía M.", verified:true, verifiedBy:"auto",
      comment:"Las fotos no le hacen justicia. La tela tiene peso y la caída es perfecta. Ya estoy mirando el próximo." },
    { id:"au-h2", rating:5, reviewer:"Tomás R.", verified:false, verifiedBy:null,
      comment:"Pedí mi talle de siempre y calzó exacto. Llegó antes de lo que decían y muy bien presentado." },
    { id:"au-h3", rating:4, reviewer:"Paula G.", verified:true, verifiedBy:"owner",
      comment:"Hermoso y muy cómodo. Le pongo cuatro porque lo quería en otro color y no había." },
  ],
  tienda: [
    { id:"au-h4", rating:5, reviewer:"Martina S.", verified:true, verifiedBy:"auto",
      comment:"Escribí un domingo a la noche y me respondieron igual. Me ayudaron a elegir y acerté de una." },
    { id:"au-h5", rating:5, reviewer:"Diego A.", verified:false, verifiedBy:null,
      comment:"Tuve que cambiar un talle y fue sin vueltas. Así da gusto comprar online." },
  ],
};

export function ResenasAurora({
  slug, isPreview, enEditor, isOwner, products, onAbrirProducto, escena, isMobile, capa,
}: {
  slug: string | undefined;
  isPreview: boolean;
  enEditor: boolean;
  isOwner: boolean;
  products: StorefrontProduct[];
  onAbrirProducto: (p: StorefrontProduct) => void;
  escena: EscenaCatalogo;
  isMobile: boolean;
  /** Capa del formulario. La decide Aurora, igual que la de su ficha. */
  capa: number;
}) {
  const { BG, T, G, GT, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const productosMin = useMemo(() => products.map(p => ({ id: p.id, name: p.name, images: p.images })), [products]);
  const r = useHomeReviews({ slug, isPreview, isOwner, productos: productosMin, ejemplos: EJEMPLOS });

  /* De producto y de tienda, intercaladas: la pista alterna entre una con foto
     y una de texto, en vez de amontonar todas las de un tipo de un lado. */
  const tarjetas = useMemo(() => {
    const a = r.deProducto, b = r.deTienda, out: HomeReview[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
    return out;
  }, [r.deProducto, r.deTienda]);

  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  /* ── La pista que gira ────────────────────────────────────────────────
     Al deslizar, cada tarjeta se inclina según qué tan lejos está del centro.
     Se escribe directo en el estilo de cada nodo (no con estado): el scroll
     dispara decenas de eventos por segundo. Con "menos movimiento" pedido por
     el sistema, quietas. */
  const pista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cuadro = 0;
    const acomodar = () => {
      cuadro = 0;
      const centro = el.scrollLeft + el.clientWidth / 2;
      for (const hijo of Array.from(el.children) as HTMLElement[]) {
        const medio = hijo.offsetLeft + hijo.offsetWidth / 2;
        const d = Math.max(-1, Math.min(1, (medio - centro) / el.clientWidth));
        hijo.style.transform = `rotateY(${d * -22}deg) scale(${1 - Math.abs(d) * 0.08})`;
        hijo.style.opacity = String(1 - Math.abs(d) * 0.45);
      }
    };
    const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(acomodar); };
    acomodar();
    el.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { el.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); cancelAnimationFrame(cuadro); };
  }, [tarjetas.length, isMobile]);

  const mover = (dir: 1 | -1) => pista.current?.scrollBy({ left: dir * (pista.current.clientWidth * 0.6), behavior: "smooth" });

  /* ── El medidor ── */
  const promedio = r.promedioMostrado;
  const R = 52, C = 2 * Math.PI * R;
  const lleno = r.sinNada ? 0 : Math.max(0, Math.min(1, promedio / 5));

  const campo: React.CSSProperties = {
    background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:14, color:T,
    padding:"12px 14px", fontSize:13.5, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box",
  };
  const pastilla = (llena: boolean): React.CSSProperties => ({
    background: llena ? G : "rgba(255,255,255,0.05)", color: llena ? textoSobreAcento : T,
    border:`1px solid ${llena ? G : LINEA_FUERTE}`, borderRadius:999, padding:"13px 26px",
    fontSize:11, fontWeight:700, letterSpacing:2.2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
    boxShadow: llena ? `0 0 30px ${luz(0.45)}` : "none",
  });

  return (
    <section data-reveal style={{ position:"relative", overflow:"hidden", background:BG, borderTop:`1px solid ${LINEA_FUERTE}` }}>
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none",
        background:`radial-gradient(40% 60% at 12% 50%, ${luz(0.2)}, transparent 70%), radial-gradient(30% 50% at 90% 30%, ${luz(0.1)}, transparent 70%)` }} />

      <div style={{ position:"relative", maxWidth:1320, margin:"0 auto", padding: isMobile ? "60px 0 50px" : "96px 40px",
        display:"grid", gridTemplateColumns: isMobile ? "1fr" : "300px minmax(0,1fr)", gap: isMobile ? 34 : 56, alignItems:"center" }}>

        {/* ── El medidor y la invitación ── */}
        <div style={{ padding: isMobile ? "0 20px" : 0, display:"flex", flexDirection:"column", alignItems: isMobile ? "center" : "flex-start", textAlign: isMobile ? "center" : "left" }}>
          <p style={{ margin:"0 0 18px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="resenasKicker" label="Etiqueta de reseñas">Lo que dicen</EditableZone>
          </p>
          <div style={{ position:"relative", width:140, height:140, marginBottom:20 }}>
            <svg width={140} height={140} viewBox="0 0 140 140" aria-hidden style={{ transform:"rotate(-90deg)", overflow:"visible" }}>
              <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
              <circle cx={70} cy={70} r={R} fill="none" stroke={G} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - lleno)}
                style={{ filter:`drop-shadow(0 0 8px ${luz(0.8)})`, transition:"stroke-dashoffset 1.2s cubic-bezier(.22,.9,.28,1)" }} />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontFamily:TITULO, fontSize:36, fontWeight:400, lineHeight:1, color:T }}>
                {r.sinNada ? "—" : promedio.toFixed(1).replace(".", ",")}
              </span>
              <span style={{ fontSize:10, letterSpacing:2, opacity:0.65, marginTop:6 }}>DE 5</span>
            </div>
          </div>
          <h2 style={{ margin:"0 0 10px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.15, fontSize: isMobile ? 26 : 30, color:T }}>
            {r.sinNada ? "¿Ya compraste? Contanos" : <EditableZone field="resenasTitulo" label="Título de reseñas">Así nos ven</EditableZone>}
          </h2>
          <p style={{ margin:"0 0 24px", fontSize:13.5, lineHeight:1.65, color:"rgba(242,242,247,0.6)", maxWidth:280 }}>
            {r.sinNada
              ? "Todavía nadie dejó su opinión. Es lo primero que mira quien está por comprar acá por primera vez."
              : `${r.totalMostrado} ${r.totalMostrado === 1 ? "opinión" : "opiniones"} de quienes ya compraron.`}
          </p>
          <button type="button" onClick={r.abrirModal} style={pastilla(r.sinNada)}>Dejá tu opinión</button>

          {enEditor && (
            <div style={{ marginTop:18, display:"flex", gap:9, padding:"11px 13px", borderRadius:14, background:"rgba(253,230,138,0.08)", border:"1px solid rgba(253,230,138,0.28)", textAlign:"left" }}>
              <span aria-hidden style={{ flexShrink:0 }}>⚠️</span>
              <p style={{ margin:0, fontSize:11.5, color:"#fde68a", lineHeight:1.55 }}>
                {r.totalReal === 0
                  ? <><strong>Son de ejemplo.</strong> Tu tienda todavía no tiene reseñas: están para que veas cómo queda. No se publican y desaparecen solas con la primera de verdad.</>
                  : <>Hoy tenés <strong>{r.totalReal} {r.totalReal === 1 ? "reseña" : "reseñas"}</strong> y {r.enPortadaReal === 1 ? "aparece" : "aparecen"} <strong>{r.enPortadaReal}</strong> acá: las de 4★ y 5★ con comentario, más las de tu tienda que hayas aprobado. Las que ves ahora son de ejemplo.</>}
              </p>
            </div>
          )}
        </div>

        {/* ── La pista ── */}
        {tarjetas.length > 0 && (
          <div style={{ position:"relative", minWidth:0 }}>
            <div ref={pista} className="au-resenas-pista"
              style={{ display:"flex", gap: isMobile ? 14 : 22, overflowX:"auto", scrollSnapType:"x mandatory", scrollbarWidth:"none",
                padding: isMobile ? "10px 20px 18px" : "16px 6px 22px", perspective:"1200px",
                maskImage:"linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%)",
                WebkitMaskImage:"linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%)" }}>
              {tarjetas.map(t => {
                const prod = t.product ? products.find(p => p.id === t.product!.id) : undefined;
                const foto = t.product?.image ?? null;
                const abierta = !!abiertas[t.id];
                return (
                  <article key={t.id}
                    style={{ flex:`0 0 ${isMobile ? "80%" : "340px"}`, scrollSnapAlign:"center", display:"flex", flexDirection:"column", gap:16,
                      background:"linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))", border:`1px solid ${LINEA_FUERTE}`,
                      borderRadius:22, padding: isMobile ? "20px 18px" : "24px 24px", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
                      boxShadow:"0 24px 50px rgba(0,0,0,0.35)", transition:"transform .25s ease-out, opacity .25s", transformStyle:"preserve-3d" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                      <span style={{ fontSize:13, color:GT, letterSpacing:2, textShadow:`0 0 12px ${luz(0.6)}` }} aria-label={`${t.rating} de 5`}>
                        {"★".repeat(t.rating)}<span style={{ opacity:0.2 }}>{"★".repeat(5 - t.rating)}</span>
                      </span>
                      {foto ? (
                        <button type="button" onClick={() => prod && onAbrirProducto(prod)} title={t.product?.name}
                          style={{ display:"flex", alignItems:"center", gap:8, maxWidth:"60%", background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:999, padding:"3px 10px 3px 3px", color:T, cursor: prod ? "pointer" : "default" }}>
                          <span style={{ position:"relative", width:26, height:26, borderRadius:"50%", overflow:"hidden", flexShrink:0 }}>
                            <FadeImage src={foto} alt="" fill sizes="26px" style={{ objectFit:"cover" }} />
                          </span>
                          <span style={{ fontSize:10.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.product?.name}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize:9.5, letterSpacing:2, textTransform:"uppercase", color:GT, border:`1px solid ${luz(0.4)}`, borderRadius:999, padding:"5px 10px" }}>Sobre la tienda</span>
                      )}
                    </div>
                    <p style={{ margin:0, fontSize: isMobile ? 14 : 15, lineHeight:1.65, color:"rgba(242,242,247,0.86)",
                      ...(abierta ? {} : { display:"-webkit-box", WebkitLineClamp:5, WebkitBoxOrient:"vertical" as const, overflow:"hidden" }) }}>
                      “{t.comment}”
                    </p>
                    {(t.comment?.length ?? 0) > 180 && (
                      <button type="button" onClick={() => setAbiertas(a => ({ ...a, [t.id]: !abierta }))}
                        style={{ alignSelf:"flex-start", background:"none", border:"none", padding:0, color:GT, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", marginTop:-6 }}>
                        {abierta ? "Ver menos" : "Leer todo"}
                      </button>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:11, marginTop:"auto" }}>
                      <span aria-hidden style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, display:"grid", placeItems:"center", fontSize:13, fontWeight:700, color:GT, background:luz(0.16), border:`1px solid ${luz(0.4)}`, boxShadow:`0 0 14px ${luz(0.3)}` }}>
                        {t.reviewer.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.reviewer}</p>
                        {t.verified && <p style={{ margin:"2px 0 0", fontSize:10.5, color:"#34d399" }}>✓ Compra verificada</p>}
                      </div>
                      {/* Borrar: sólo la dueña y sólo en la tienda de verdad. */}
                      {isOwner && !isPreview && (
                        <button type="button" onClick={() => r.borrar(t.id)} title="Eliminar reseña" aria-label="Eliminar reseña"
                          style={{ width:30, height:30, borderRadius:"50%", background:"none", border:`1px solid ${LINEA_FUERTE}`, color:T, opacity:0.6, cursor:"pointer", flexShrink:0 }}>×</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {!isMobile && tarjetas.length > 2 && (
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8, paddingRight:6 }}>
                {([[-1, "Anterior", "15 18 9 12 15 6"], [1, "Siguiente", "9 18 15 12 9 6"]] as const).map(([d, nombre, puntos]) => (
                  <button key={nombre} type="button" onClick={() => mover(d)} aria-label={nombre}
                    style={{ width:44, height:44, borderRadius:999, background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, color:T, cursor:"pointer", display:"grid", placeItems:"center" }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points={puntos}/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`.au-resenas-pista::-webkit-scrollbar{display:none}`}</style>

      {/* ── El formulario de reseña de TIENDA ───────────────────────────────
          Un paso de confirmación antes de mandar: una reseña no se edita
          después, así que se le repite con qué nombre y cuántas estrellas sale. */}
      {r.modalAbierto && (
        <div onClick={r.cerrarModal} role="dialog" aria-modal="true" aria-label="Dejá tu opinión"
          style={{ position:"fixed", inset:0, zIndex:capa, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
            background:"rgba(4,5,10,0.72)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto", position:"relative", color:T,
              background:`radial-gradient(80% 50% at 0% 0%, ${luz(0.18)}, transparent 70%), linear-gradient(160deg, rgba(22,23,38,0.95), rgba(10,11,20,0.96))`,
              border:`1px solid ${LINEA_FUERTE}`, borderRadius:26, padding: isMobile ? "26px 20px" : "32px 30px", boxShadow:"0 40px 100px rgba(0,0,0,0.6)" }}>
            <button onClick={r.cerrarModal} aria-label="Cerrar"
              style={{ position:"absolute", top:14, right:14, width:38, height:38, borderRadius:999, background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, color:T, cursor:"pointer", fontSize:16 }}>×</button>

            {r.listo ? (
              /* No se agrega a la lista: nace pendiente hasta que la tienda la apruebe. */
              <div style={{ textAlign:"center", padding:"10px 0 4px" }}>
                <div aria-hidden style={{ width:60, height:60, borderRadius:"50%", margin:"0 auto 18px", display:"grid", placeItems:"center", background:G, color:textoSobreAcento, fontSize:26, boxShadow:`0 0 40px ${luz(0.6)}` }}>✓</div>
                <h3 style={{ margin:"0 0 8px", fontFamily:TITULO, fontWeight:400, fontSize:22 }}>¡Gracias!</h3>
                <p style={{ margin:"0 0 22px", fontSize:13.5, lineHeight:1.6, opacity:0.65 }}>Tu reseña le llegó a la tienda. Se publica en cuanto la revisen.</p>
                <button type="button" onClick={r.cerrarModal} style={pastilla(true)}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={r.enviar} style={{ display:"flex", flexDirection:"column", gap:13 }}>
                <div>
                  <h3 style={{ margin:"0 0 6px", fontFamily:TITULO, fontWeight:300, fontSize:24, letterSpacing:"-0.02em", paddingRight:40 }}>Contanos cómo te fue</h3>
                  <p style={{ margin:0, fontSize:12.5, lineHeight:1.55, opacity:0.6 }}>De la tienda en general: la atención, el envío, cómo llegó.</p>
                </div>
                {r.error && <p style={{ margin:0, fontSize:12, color:"#fca5a5", background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.35)", borderRadius:12, padding:"10px 13px" }}>⚠ {r.error}</p>}
                <input value={r.honeypot} onChange={e => r.setHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                <div style={{ display:"flex", gap:6 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => r.setForm(p => ({ ...p, rating: s }))} aria-label={`${s} de 5`}
                      style={{ background:"none", border:"none", padding:2, cursor:"pointer", fontSize:28, lineHeight:1, color: s <= r.form.rating ? G : "rgba(242,242,247,0.18)", textShadow: s <= r.form.rating ? `0 0 14px ${luz(0.7)}` : "none" }}>★</button>
                  ))}
                </div>
                <input value={r.form.reviewer} maxLength={RESENADOR_MAX} required placeholder="Tu nombre"
                  onChange={e => r.setForm(p => ({ ...p, reviewer: e.target.value }))} style={campo} />
                <div>
                  <input value={r.form.email} type="email" maxLength={120} autoComplete="email" placeholder="Tu email (opcional)"
                    onChange={e => r.setForm(p => ({ ...p, email: e.target.value }))} style={campo} />
                  <p style={{ margin:"6px 4px 0", fontSize:11, lineHeight:1.5, opacity:0.62 }}>Si compraste acá, sale con el sello &ldquo;Compra verificada&rdquo;. El email no se muestra.</p>
                </div>
                <textarea value={r.form.comment} rows={3} maxLength={COMENTARIO_MAX} placeholder="Contá tu experiencia (opcional)"
                  onChange={e => r.setForm(p => ({ ...p, comment: e.target.value }))} style={{ ...campo, resize:"none" }} />
                {r.form.comment.length > COMENTARIO_MAX - 80 && (
                  <p style={{ margin:"-8px 4px 0", fontSize:11, textAlign:"right", color: r.form.comment.length >= COMENTARIO_MAX ? "#fca5a5" : "rgba(242,242,247,0.45)" }}>{r.form.comment.length} / {COMENTARIO_MAX}</p>
                )}
                {!isPreview && r.captcha.widget}
                {r.confirmando ? (
                  <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:16, padding:"14px 16px" }}>
                    <p style={{ margin:"0 0 12px", fontSize:12.5, lineHeight:1.6 }}>Se publica con tu nombre, <strong>{r.form.reviewer.trim()}</strong>, y {r.form.rating} de 5 estrellas. ¿La mandamos?</p>
                    <div style={{ display:"flex", gap:9 }}>
                      <button type="submit" disabled={r.enviando || !r.captcha.ready} style={{ ...pastilla(true), flex:1, opacity: r.enviando ? 0.6 : 1 }}>{r.enviando ? "Enviando…" : "Sí, enviar"}</button>
                      <button type="button" onClick={() => r.setConfirmando(false)} disabled={r.enviando} style={{ ...pastilla(false), flex:1 }}>Volver</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={!r.puedeEnviar} onClick={() => r.setConfirmando(true)}
                    title={r.bloqueo ? undefined : r.valida ? undefined : "Escribí tu nombre y elegí cuántas estrellas"}
                    style={{ ...pastilla(r.puedeEnviar), cursor: r.puedeEnviar ? "pointer" : "default", opacity: r.puedeEnviar ? 1 : 0.55 }}>
                    Enviar mi reseña
                  </button>
                )}
                {r.bloqueo && (
                  <p style={{ margin:0, fontSize:11.5, lineHeight:1.55, textAlign:"center", opacity:0.68 }}>
                    {r.bloqueo === "preview" ? "Vista previa: el formulario funciona en tu tienda publicada." : "Es tu tienda: desde tu propia cuenta no podés dejarle una reseña."}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
