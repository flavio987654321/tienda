"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { EditableZone, EditableImageButton, useEditContext } from "@/contexts/EditContext";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import { CampoFecha } from "@/components/CampoFecha";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   LANZAMIENTO (B-6 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Generar expectativa por algo que sale en una fecha. Antes de la fecha la
   imagen está velada —oscura, desenfocada, con una línea de luz que la escanea
   de arriba abajo— y al lado corre la cuenta regresiva en cuatro paneles de
   vidrio. Al llegar la fecha se revela sola y pasa a "Ya disponible", con el
   botón para verlo.

   Lo arma la dueña en el editor (botón "🚀 Lanzamiento"):
   - la fecha y hora (override `lanzamientoFecha`, guardada en ISO: así la hora
     es la misma para todos, esté donde esté quien mira);
   - el producto, si ya está cargado (override `lanzamientoProducto`): su foto
     es la imagen y "Ver ahora" abre su ficha;
   - o una imagen propia (`lanzamientoImagen`), que manda sobre la del producto
     —sirve para anunciar algo que todavía no está cargado—.

   Sin fecha, en la tienda no existe: un lanzamiento sin fecha no anuncia nada.
   En el editor sí se ve, para poder armarlo. */

const sinSuscripcion = () => () => {};
const cadaSegundo = (avisar: () => void) => { const id = setInterval(avisar, 1000); return () => clearInterval(id); };
const ahoraEnSegundos = () => Math.floor(Date.now() / 1000);

/** ISO → el valor que entiende `<input type="datetime-local">`, en la hora local de quien edita. */
function aLocal(iso: string | undefined): string {
  const t = Date.parse(iso ?? "");
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function LanzamientoAurora({ products, imagen, fmt, ocultarPrecios, onAbrir, onVerCatalogo, escena, isMobile }: {
  products: StorefrontProduct[];
  /** La imagen propia que subió la dueña, si subió una. */
  imagen?: string;
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  onVerCatalogo: () => void;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, G, GT, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const { editMode, overrides, setOverride } = useEditContext();
  // Cada segundo, sólo en el navegador: en el servidor es `null` y no se dibuja
  // la cuenta (el servidor y el navegador no tienen la misma hora).
  const ahora = useSyncExternalStore(cadaSegundo, ahoraEnSegundos, () => null);
  // Para que la imagen no aparezca revelada un instante antes de que llegue la hora.
  const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  /* Sólo en el editor: ver cómo queda DESPUÉS de la fecha, para poder escribir
     su título y su texto sin esperar a que llegue. */
  const [verLanzado, setVerLanzado] = useState(false);

  const conFoto = useMemo(() => products.filter(p => p.images[0]), [products]);
  const fechaIso = overrides["lanzamientoFecha"]?.text;
  const fecha = Date.parse(fechaIso ?? "");
  const hayFecha = !Number.isNaN(fecha);
  const producto = conFoto.find(p => p.id === overrides["lanzamientoProducto"]?.text) ?? null;
  const foto = imagen ?? producto?.images[0] ?? null;

  if (!hayFecha && !editMode) return null;

  const falta = hayFecha && ahora !== null ? Math.max(0, Math.floor(fecha / 1000) - ahora) : null;
  const lanzado = (hayFecha && falta === 0) || (editMode && verLanzado);
  const velado = !lanzado;
  const celdas: [string, number | null][] = [
    ["Días", falta === null ? null : Math.floor(falta / 86400)],
    ["Horas", falta === null ? null : Math.floor(falta / 3600) % 24],
    ["Min", falta === null ? null : Math.floor(falta / 60) % 60],
    ["Seg", falta === null ? null : falta % 60],
  ];
  // "6 de octubre, 20:00 hs": armado a mano, porque el formato de fecha y hora
  // junto le agrega "a. m." y queda "04:56 a. m. hs.".
  const cuando = hayFecha && montado
    ? `${new Date(fecha).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}, ${new Date(fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs`
    : null;

  const verAhora = (e: React.MouseEvent) => { if (producto) onAbrir(producto, e); else onVerCatalogo(); };

  return (
    <section data-reveal className="au-lanzamiento" style={{ position:"relative", overflow:"hidden", background:BG, padding: isMobile ? "60px 16px" : "110px 40px" }}>
      <style>{`
        @keyframes au-escaneo { 0% { top: -10% } 100% { top: 110% } }
        @keyframes au-latido { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .au-lanzamiento .au-escaneo, .au-lanzamiento .au-latido { animation: none !important } }
      `}</style>
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(45% 60% at 72% 50%, ${luz(lanzado ? 0.26 : 0.16)}, transparent 70%)` }} />

      {editMode && (
        <div style={{ position:"absolute", top:14, left:14, zIndex:7, display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, maxWidth:"calc(100% - 28px)",
          background:"rgba(14,15,26,0.9)", backdropFilter:"blur(14px)", border:`1px solid ${LINEA_FUERTE}`, color:T, borderRadius:16, padding:"8px 12px", fontSize:11, fontWeight:600 }}>
          🚀 Lanzamiento
          {/* Desplegables en castellano y no el campo del navegador, que en un
              Chrome en inglés sale "mm/dd/yyyy" (ver components/CampoFecha). */}
          <div style={{ flex:"1 1 330px", minWidth:0 }}>
            <CampoFecha conHora etiqueta="Fecha del lanzamiento" valor={aLocal(fechaIso)} estiloOpciones={{ color:"#111" }}
              onCambio={v => setOverride("lanzamientoFecha", { text: v ? new Date(v).toISOString() : "" })}
              estilo={{ background:"rgba(0,0,0,.35)", color:T, border:"1px solid rgba(255,255,255,.2)", borderRadius:999, padding:"5px 8px", fontSize:11, cursor:"pointer" }} />
          </div>
          <select value={producto?.id ?? ""} aria-label="Producto del lanzamiento"
            onChange={e => setOverride("lanzamientoProducto", { text: e.target.value })}
            style={{ background:"rgba(0,0,0,.35)", color:T, border:"1px solid rgba(255,255,255,.2)", borderRadius:999, padding:"5px 10px", fontSize:11, cursor:"pointer", maxWidth:200 }}>
            <option value="" style={{ color:"#111" }}>Sin producto</option>
            {conFoto.map(p => <option key={p.id} value={p.id} style={{ color:"#111" }}>{p.name}</option>)}
          </select>
          <label style={{ display:"flex", alignItems:"center", gap:5, fontWeight:500, cursor:"pointer" }}>
            <input type="checkbox" checked={verLanzado} onChange={e => setVerLanzado(e.target.checked)} /> Ver ya lanzado
          </label>
          {/* Cada elección se valida en el momento, con palabras. */}
          {!hayFecha
            ? <span style={{ color:"#fbbf24", fontWeight:500 }}>Elegí la fecha: sin fecha no se muestra en la tienda.</span>
            : ahora !== null && fecha / 1000 <= ahora
              ? <span style={{ color:"#fbbf24", fontWeight:500 }}>Esa fecha ya pasó: en la tienda se ve como &quot;Ya disponible&quot;.</span>
              : cuando && <span style={{ color:"#4ade80", fontWeight:500 }}>Sale el {cuando}.</span>}
        </div>
      )}

      <div style={{ position:"relative", maxWidth:1200, margin:"0 auto", display:"grid", alignItems:"center", gap: isMobile ? 34 : 70,
        gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1.05fr) minmax(0,0.95fr)", paddingTop: editMode ? 40 : 0 }}>
        {/* ── El texto y la cuenta ── */}
        <div style={{ minWidth:0, order: isMobile ? 2 : 1 }}>
          <p className={lanzado ? undefined : "au-latido"} style={{ margin:"0 0 16px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700,
            animation: lanzado ? undefined : "au-latido 2.4s ease-in-out infinite" }}>
            {lanzado ? "Ya disponible" : <EditableZone field="lanzamientoKicker" label="Etiqueta del lanzamiento">Próximo lanzamiento</EditableZone>}
          </p>
          <h2 style={{ margin:"0 0 18px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.06, color:T,
            fontSize: isMobile ? "clamp(30px,9vw,40px)" : "clamp(36px,4.2vw,62px)" }}>
            {/* Antes y después de la fecha dicen cosas distintas: "está por llegar"
                no puede seguir arriba de "Ya disponible". */}
            {lanzado
              ? <EditableZone field="lanzamientoTituloListo" label="Título del lanzamiento (ya salió)">Ya llegó</EditableZone>
              : <EditableZone field="lanzamientoTitulo" label="Título del lanzamiento">Algo nuevo está por llegar</EditableZone>}
          </h2>
          <p style={{ margin:"0 0 30px", fontSize:14.5, lineHeight:1.75, color:"rgba(242,242,247,0.65)", maxWidth:460 }}>
            {lanzado
              ? <EditableZone field="lanzamientoTextoListo" label="Texto del lanzamiento (ya salió)">Ya está acá. Entrá a verlo antes de que se agote.</EditableZone>
              : <EditableZone field="lanzamientoTexto" label="Texto del lanzamiento">Estamos terminando algo especial. Guardá la fecha: sale en cantidades limitadas.</EditableZone>}
          </p>

          {lanzado ? (
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <button type="button" onClick={verAhora}
                style={{ background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"16px 38px", fontSize:11, fontWeight:700, letterSpacing:3,
                  textTransform:"uppercase", cursor:"pointer", boxShadow:`0 0 40px ${luz(0.55)}` }}>
                <EditableZone field="lanzamientoCta" label="Botón del lanzamiento">Ver ahora</EditableZone>
              </button>
              {producto && !ocultarPrecios && <span style={{ fontFamily:TITULO, fontSize:22, color:T }}>{fmt(producto.price)}</span>}
            </div>
          ) : (
            <>
              <div role="timer" aria-live="off" style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap: isMobile ? 8 : 12, maxWidth:480 }}>
                {celdas.map(([nombre, valor]) => (
                  <div key={nombre} style={{ position:"relative", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px 4px 12px" : "22px 6px 16px", textAlign:"center",
                    background:"rgba(255,255,255,0.045)", border:`1px solid ${LINEA_FUERTE}`, backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", overflow:"hidden" }}>
                    <div aria-hidden style={{ position:"absolute", top:0, left:14, right:14, height:1, background:`linear-gradient(90deg, transparent, ${luz(0.9)}, transparent)` }} />
                    <span style={{ display:"block", fontFamily:TITULO, fontWeight:400, color:T, fontVariantNumeric:"tabular-nums",
                      fontSize: isMobile ? 26 : 38, lineHeight:1, textShadow:`0 0 24px ${luz(0.55)}` }}>
                      {valor === null ? "--" : String(valor).padStart(2, "0")}
                    </span>
                    <span style={{ display:"block", marginTop:10, fontSize:9.5, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(242,242,247,0.5)" }}>{nombre}</span>
                  </div>
                ))}
              </div>
              {cuando && <p style={{ margin:"18px 0 0", fontSize:12.5, color:"rgba(242,242,247,0.55)" }}>Sale el {cuando}.</p>}
            </>
          )}
        </div>

        {/* ── La imagen: velada hasta la fecha ── */}
        <div style={{ order: isMobile ? 1 : 2, position:"relative", maxWidth: isMobile ? 380 : 470, width:"100%", margin:"0 auto" }}>
          <div onClick={lanzado ? verAhora : undefined}
            style={{ position:"relative", aspectRatio:"4/5", borderRadius:"200px 200px 28px 28px", overflow:"hidden", cursor: lanzado ? "pointer" : "default",
              border:`1px solid ${lanzado ? luz(0.6) : LINEA_FUERTE}`, background:"#0e0f1a",
              boxShadow:`0 40px 90px rgba(0,0,0,0.55), 0 0 ${lanzado ? 90 : 60}px ${luz(lanzado ? 0.35 : 0.18)}`, transition:"box-shadow 1s, border-color 1s" }}>
            {foto ? (
              <div data-foto aria-hidden style={{ position:"absolute", inset:0, backgroundImage:`url(${foto})`, backgroundSize:"cover", backgroundPosition:"center",
                filter: velado || !montado ? "blur(22px) brightness(0.45) saturate(0.6)" : "none", transform: velado || !montado ? "scale(1.15)" : "scale(1)",
                transition:"filter 1.6s ease, transform 1.6s cubic-bezier(.2,.8,.2,1)" }} />
            ) : (
              <div aria-hidden style={{ position:"absolute", inset:0, background:`radial-gradient(45% 40% at 50% 45%, ${luz(0.55)}, transparent 70%), radial-gradient(70% 60% at 50% 100%, ${luz(0.25)}, transparent 70%)` }} />
            )}
            {velado && (
              <>
                {/* La línea de luz que escanea lo que todavía no se puede ver. */}
                <div aria-hidden className="au-escaneo" style={{ position:"absolute", left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${luz(1)}, transparent)`,
                  boxShadow:`0 0 24px ${luz(0.9)}`, animation:"au-escaneo 3.6s ease-in-out infinite alternate" }} />
                <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center" }}>
                  <span style={{ fontFamily:TITULO, fontSize: isMobile ? 46 : 64, color:"rgba(242,242,247,0.9)", textShadow:`0 0 30px ${luz(0.8)}` }}>?</span>
                </div>
              </>
            )}
          </div>
          {/* El botón va AFUERA del arco: adentro se apoyaba en la esquina de
              arriba, que en el arco es pura curva, y lo cortaba ("Imagen del la…"). */}
          <EditableImageButton field="lanzamientoImagen" label="Imagen del lanzamiento"
            panelNote="Si elegiste un producto, sin imagen propia se usa la foto del producto." />
        </div>
      </div>
    </section>
  );
}
