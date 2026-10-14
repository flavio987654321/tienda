"use client";
/**
 * Piezas compartidas de la página "La agencia" (13/10/26). Ver lib/agencia.
 *
 * Se comparte la LÓGICA y los editores; el aspecto de la página es de cada
 * template (Volt la arma como tablero, Motor y Drive a su manera). Por eso las
 * piezas reciben una paleta y no traen fondo ni tipografía propios.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CAPAS } from "@/lib/capas-tienda";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { useEditContext } from "@/contexts/EditContext";
import {
  agenciaLimpia, estadoAhora, hayDireccion, horariosResumidos, direccionCompleta, urlMapaEmbebido, urlComoLlegar,
  PAGOS, NOMBRE_PAGO, TOPE, type Agencia, type Miembro, type Pago, type Ubicacion,
} from "@/lib/agencia";
import { subirImagenDeDiseno } from "@/lib/subir-imagen-diseno";
import { fotoLiviana } from "@/lib/foto-liviana";

export type PaletaAgencia = { tinta: string; tenue: string; linea: string; campo: string; acento: string; sobreAcento: string };

const EJEMPLO: { ubicacion: Ubicacion; agencia: Agencia } = {
  ubicacion: {
    calle: "Av. del Libertador 1234", localidad: "Vicente López", provincia: "Buenos Aires",
    horarios: {
      lun: [{ abre: "09:00", cierra: "19:00" }], mar: [{ abre: "09:00", cierra: "19:00" }], mie: [{ abre: "09:00", cierra: "19:00" }],
      jue: [{ abre: "09:00", cierra: "19:00" }], vie: [{ abre: "09:00", cierra: "19:00" }], sab: [{ abre: "09:00", cierra: "13:00" }],
    },
  },
  agencia: {
    pagos: ["contado", "financiacion", "permuta", "dolares"],
    pagosNota: "Financiación en hasta 48 cuotas con DNI y recibo de sueldo.",
    equipo: [
      { nombre: "Martín", rol: "Ventas", foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80",
        bio: "10 años vendiendo autos. Te ayudo a encontrar el que entra en tu presupuesto." },
      { nombre: "Laura", rol: "Usados y permutas", foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80",
        bio: "Tasamos tu usado en el momento y te decimos cuánto te lo tomamos." },
      { nombre: "Diego", rol: "Gestoría", foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80",
        bio: "Me ocupo de la transferencia y los papeles: vos te llevás el auto." },
    ],
    garantia: "3 meses o 3.000 km de garantía mecánica en todos los usados. Los 0 km, con la garantía oficial de fábrica.",
    salon: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

function tieneAlgo(u: Ubicacion | undefined, a: Agencia | undefined) {
  const l = agenciaLimpia(a);
  return hayDireccion(u) || horariosResumidos(u?.horarios).length > 0 || l.pagos.length > 0 || l.equipo.length > 0 || !!l.garantia || l.salon.length > 0;
}

/** Todo lo que la página necesita, ya limpio, más si se está editando. */
export function useAgencia() {
  const config = useStoreConfig();
  const { editMode, setAgencia } = useEditContext();
  const enEdicion = !!(editMode && config?.previewFill && setAgencia);
  /* En la vista de muestra (galería de Diseño, demo pública) y sin nada
     cargado, la página se veía como una portada sola: no se entendía qué
     ofrece. Se muestra un ejemplo completo, como los vehículos de muestra.
     Editando no: ahí se ve lo propio con sus editores. */
  const deMuestra = !!config?.previewFill && !enEdicion && !tieneAlgo(config?.ubicacion, config?.agencia);
  const ubicacion = deMuestra ? EJEMPLO.ubicacion : (config?.ubicacion ?? {});
  const crudo = deMuestra ? EJEMPLO.agencia : (config?.agencia ?? {});
  const agencia = agenciaLimpia(crudo);
  const cambiar = (parcial: Partial<Agencia>) => setAgencia?.({ ...crudo, ...parcial });
  return {
    enEdicion, ubicacion, agencia, crudo, cambiar,
    conDireccion: hayDireccion(ubicacion),
    direccion: direccionCompleta(ubicacion),
    horarios: horariosResumidos(ubicacion.horarios),
    /** Sin nada de esto la página sólo muestra la presentación: no se dibujan tarjetas vacías. */
    hayAlgo: tieneAlgo(ubicacion, crudo),
    /** Se está mostrando el ejemplo, no datos de la tienda. */
    deMuestra,
  };
}

/* "Abierto ahora" cambia con el reloj: se recalcula cada minuto y SÓLO en el
   navegador (el servidor no sabe a qué hora lo van a mirar; si lo calculara,
   la página llegaría con un estado y se dibujaría con otro). */
const suscribirMinuto = (avisar: () => void) => { const id = setInterval(avisar, 60_000); return () => clearInterval(id); };
const minutoActual = () => Math.floor(Date.now() / 60_000);
export function useEstadoAhora(horarios: Parameters<typeof estadoAhora>[0]) {
  const minuto = useSyncExternalStore(suscribirMinuto, minutoActual, () => null);
  return minuto === null ? null : estadoAhora(horarios, new Date(minuto * 60_000));
}

export function MapaAgencia({ ubicacion, alto = 220, radio = 14, oscuro = false }: { ubicacion: Parameters<typeof urlMapaEmbebido>[0]; alto?: number; radio?: number; oscuro?: boolean }) {
  return (
    <iframe title={`Mapa: ${direccionCompleta(ubicacion)}`} src={urlMapaEmbebido(ubicacion)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
      style={{ display: "block", width: "100%", height: alto, border: 0, borderRadius: radio,
        // Volt y Motor son oscuros: el mapa blanco encandila. Se oscurece sin perder los colores de las calles.
        filter: oscuro ? "invert(0.9) hue-rotate(180deg) saturate(0.7)" : undefined }} />
  );
}

export { urlComoLlegar };

/** En el editor, cuando falta lo que se carga en Configuración. */
export function FaltaEnConfiguracion({ que, p }: { que: string; p: PaletaAgencia }) {
  return (
    <p style={{ margin: 0, padding: "12px 14px", borderRadius: 12, border: `1px dashed ${p.linea}`, color: p.tenue, fontSize: 13, lineHeight: 1.55 }}>
      Cargá {que} en <strong style={{ color: p.tinta }}>Configuración → Contacto y redes → La agencia</strong>. Mientras falte, en la tienda esta parte no se muestra.
    </p>
  );
}

const etiqueta = (p: PaletaAgencia): React.CSSProperties => ({ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: p.tenue, margin: "0 0 4px" });
const campo = (p: PaletaAgencia): React.CSSProperties => ({ width: "100%", boxSizing: "border-box", borderRadius: 10, border: `1px solid ${p.linea}`, background: p.campo, color: p.tinta, padding: "9px 11px", fontSize: 14, fontFamily: "inherit" });
const botonChico = (p: PaletaAgencia, lleno = false): React.CSSProperties => ({ minHeight: 34, padding: "0 12px", borderRadius: 9, border: lleno ? "none" : `1px solid ${p.linea}`, background: lleno ? p.acento : "transparent", color: lleno ? p.sobreAcento : p.tinta, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

/* ── Pagos ─────────────────────────────────────────────────────────────────── */
export function EditorPagos({ p }: { p: PaletaAgencia }) {
  const { crudo, cambiar } = useAgencia();
  const elegidos = crudo.pagos ?? [];
  const alternar = (x: Pago) => cambiar({ pagos: elegidos.includes(x) ? elegidos.filter((y) => y !== x) : PAGOS.filter((y) => y === x || elegidos.includes(y)) });
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PAGOS.map((x) => {
          const on = elegidos.includes(x);
          return (
            <button key={x} type="button" aria-pressed={on} onClick={() => alternar(x)}
              style={{ ...botonChico(p, on), opacity: on ? 1 : 0.75 }}>{on ? "✓ " : "+ "}{NOMBRE_PAGO[x]}</button>
          );
        })}
      </div>
      <label>
        <span style={etiqueta(p)}>Detalle (opcional)</span>
        <input style={campo(p)} maxLength={TOPE.nota} value={crudo.pagosNota ?? ""} placeholder="Ej.: hasta 48 cuotas con DNI y recibo de sueldo"
          onChange={(e) => cambiar({ pagosNota: e.target.value })} />
      </label>
    </div>
  );
}

/* ── Garantía ──────────────────────────────────────────────────────────────── */
export function EditorGarantia({ p }: { p: PaletaAgencia }) {
  const { crudo, cambiar } = useAgencia();
  return (
    <label>
      <span style={etiqueta(p)}>Qué garantía das ({(crudo.garantia ?? "").length}/{TOPE.garantia})</span>
      <textarea style={{ ...campo(p), minHeight: 92, resize: "vertical" }} maxLength={TOPE.garantia} value={crudo.garantia ?? ""}
        placeholder="Ej.: 3 meses o 3.000 km de garantía mecánica en todos los usados. Los 0 km, con la garantía de fábrica."
        onChange={(e) => cambiar({ garantia: e.target.value })} />
    </label>
  );
}

/* ── Subir una foto, con candado ───────────────────────────────────────────── */
function useSubida() {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  // Sincrónico: dos elecciones seguidas subían las dos y quedaba la que llegara última.
  const enCurso = useRef(false);
  async function subir(file: File | undefined, listo: (url: string) => void) {
    if (!file || enCurso.current) return;
    enCurso.current = true; setSubiendo(true); setError("");
    try { listo(await subirImagenDeDiseno(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo subir la foto."); }
    finally { enCurso.current = false; setSubiendo(false); }
  }
  return { subir, subiendo, error };
}

function BotonFoto({ p, texto, onArchivo, subiendo }: { p: PaletaAgencia; texto: string; onArchivo: (f: File | undefined) => void; subiendo: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { onArchivo(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" disabled={subiendo} onClick={() => ref.current?.click()} style={{ ...botonChico(p), opacity: subiendo ? 0.6 : 1, cursor: subiendo ? "wait" : "pointer" }}>
        {subiendo ? "Subiendo…" : texto}
      </button>
    </>
  );
}

/* ── Equipo ────────────────────────────────────────────────────────────────── */
export function EditorEquipo({ p }: { p: PaletaAgencia }) {
  const { crudo, cambiar } = useAgencia();
  const equipo = crudo.equipo ?? [];
  const { subir, subiendo, error } = useSubida();
  const [subiendoEn, setSubiendoEn] = useState<number | null>(null);
  const set = (i: number, m: Partial<Miembro>) => cambiar({ equipo: equipo.map((x, k) => (k === i ? { ...x, ...m } : x)) });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {equipo.map((m, i) => (
        <div key={i} style={{ display: "grid", gap: 8, padding: 12, borderRadius: 12, border: `1px solid ${p.linea}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
            {m.foto ? <img src={fotoLiviana(m.foto, 128)} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              : <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", border: `1px dashed ${p.linea}`, display: "grid", placeItems: "center", color: p.tenue }}>?</span>}
            <BotonFoto p={p} texto={m.foto ? "Cambiar foto" : "Subir foto"} subiendo={subiendo && subiendoEn === i}
              onArchivo={(f) => { setSubiendoEn(i); subir(f, (url) => set(i, { foto: url })); }} />
            {m.foto && <button type="button" style={botonChico(p)} onClick={() => set(i, { foto: undefined })}>Sacar foto</button>}
            <button type="button" style={{ ...botonChico(p), marginLeft: "auto" }} onClick={() => cambiar({ equipo: equipo.filter((_, k) => k !== i) })}>Quitar</button>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            <label><span style={etiqueta(p)}>Nombre</span><input style={campo(p)} maxLength={TOPE.texto} value={m.nombre} onChange={(e) => set(i, { nombre: e.target.value })} /></label>
            <label><span style={etiqueta(p)}>Qué hace</span><input style={campo(p)} maxLength={TOPE.texto} value={m.rol ?? ""} placeholder="Ventas, usados, gestoría…" onChange={(e) => set(i, { rol: e.target.value })} /></label>
            <label><span style={etiqueta(p)}>WhatsApp (opcional)</span><input style={campo(p)} maxLength={30} inputMode="tel" value={m.whatsapp ?? ""} placeholder="+54 9 2254 44-7183"
              onChange={(e) => set(i, { whatsapp: e.target.value })} /></label>
          </div>
          <label>
            <span style={etiqueta(p)}>Sobre {m.nombre.trim() ? m.nombre.trim().split(" ")[0] : "esta persona"} (opcional · {(m.bio ?? "").length}/{TOPE.bio})</span>
            <textarea style={{ ...campo(p), minHeight: 56, resize: "vertical" }} maxLength={TOPE.bio} value={m.bio ?? ""}
              placeholder="Ej.: 10 años vendiendo usados. Te ayudo a encontrar el que entra en tu presupuesto."
              onChange={(e) => set(i, { bio: e.target.value })} />
          </label>
          {m.whatsapp && m.whatsapp.replace(/\D/g, "").length < 11 && (
            <p style={{ margin: 0, fontSize: 12, color: "#f59e0b" }}>Poné el número con +54 9 adelante, si no el botón no abre ninguna conversación.</p>
          )}
        </div>
      ))}
      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "#fb7185" }}>{error}</p>}
      {equipo.length < TOPE.equipo && (
        <button type="button" style={{ ...botonChico(p, true), justifySelf: "start" }} onClick={() => cambiar({ equipo: [...equipo, { nombre: "" }] })}>+ Sumar una persona</button>
      )}
    </div>
  );
}

/* ── Fotos del salón ───────────────────────────────────────────────────────── */
export function EditorSalon({ p }: { p: PaletaAgencia }) {
  const { crudo, cambiar } = useAgencia();
  const fotos = crudo.salon ?? [];
  const { subir, subiendo, error } = useSubida();
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))" }}>
        {fotos.map((f, i) => (
          <div key={f + i} style={{ position: "relative", aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", border: `1px solid ${p.linea}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
            <img src={fotoLiviana(f, 320)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" aria-label="Quitar esta foto" onClick={() => cambiar({ salon: fotos.filter((_, k) => k !== i) })}
              style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "#fb7185" }}>{error}</p>}
      {fotos.length < TOPE.salon
        ? <div><BotonFoto p={p} texto={`+ Sumar foto (${fotos.length}/${TOPE.salon})`} subiendo={subiendo} onArchivo={(f) => subir(f, (url) => cambiar({ salon: [...fotos, url] }))} /></div>
        : <p style={{ margin: 0, fontSize: 12.5, color: p.tenue }}>Llegaste a las {TOPE.salon} fotos. Quitá una para sumar otra.</p>}
    </div>
  );
}

/** El link de WhatsApp de una persona del equipo, o null si el número no sirve. */
export function waDeMiembro(m: Miembro, tienda: string): string | null {
  const d = m.whatsapp?.replace(/\D/g, "") ?? "";
  if (d.length < 11) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(`Hola ${m.nombre.split(" ")[0]}! Te escribo desde la página de ${tienda}.`)}`;
}

/* ── Visor de fotos del salón ────────────────────────────────────────────────
   En la grilla las fotos se ven chicas y recortadas: tocar una la abre entera.
   Flechas, teclado (← → Esc) y deslizar con el dedo. Mientras está abierto,
   la página de atrás no se mueve. */
export function useVisorFotos() {
  const [abierta, setAbierta] = useState<number | null>(null);
  return { abierta, abrir: (i: number) => setAbierta(i), cerrar: () => setAbierta(null), mover: (i: number) => setAbierta(i) };
}

export function VisorFotos({ fotos, indice, onCerrar, onMover, titulo, enPrevia }: {
  fotos: string[];
  indice: number | null;
  onCerrar: () => void;
  onMover: (i: number) => void;
  titulo: string;
  enPrevia: boolean;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const toque = useRef<number | null>(null);
  const abierto = indice !== null && fotos.length > 0;
  const n = fotos.length;
  const ir = (d: number) => { if (indice !== null) onMover((indice + d + n) % n); };

  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    };
    const antes = document.body.style.overflow;
    if (!enPrevia) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = antes; };
  });

  if (!abierto || indice === null) return null;
  const flecha = (lado: "izq" | "der"): React.CSSProperties => ({
    position: "absolute", top: "50%", [lado === "izq" ? "left" : "right"]: "clamp(8px,2vw,24px)", transform: "translateY(-50%)",
    width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.45)", color: "#fff",
    fontSize: 22, cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(6px)",
  });
  return (
    <div role="dialog" aria-modal="true" aria-label={`${titulo}: foto ${indice + 1} de ${n}`}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (toque.current === null) return; const dx = e.changedTouches[0].clientX - toque.current; toque.current = null; if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1); }}
      style={{ position: "fixed", inset: 0, zIndex: enPrevia ? CAPAS.previaModal : CAPAS.pantallaCompleta, background: "rgba(5,6,10,0.94)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(56px,8vh,80px) clamp(12px,6vw,96px)", boxSizing: "border-box" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
      <img src={fotoLiviana(fotos[indice], 1920)} alt={`${titulo}, foto ${indice + 1}`}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
      <p style={{ position: "absolute", top: 18, left: 20, margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 13, letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>{indice + 1} / {n}</p>
      <button ref={cerrarRef} type="button" onClick={onCerrar} aria-label="Cerrar"
        style={{ position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
      {n > 1 && <>
        <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" style={flecha("izq")}>‹</button>
        <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente" style={flecha("der")}>›</button>
      </>}
    </div>
  );
}
