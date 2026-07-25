"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";

// Miniatura + modal de reels, uno solo para toda la tienda. Antes esto estaba
// escrito 6 veces (la pagina de detalle, los 4 modales de Moda y autos), cada
// copia con sus propias reglas: unas recortaban el video, otras lo achicaban, y
// el reproductor media 170px fijos — injugable en un celular.
//
// La miniatura recorta a proposito (es una miniatura, como las de YouTube) y el
// modal muestra el video ENTERO: asi un video horizontal se ve completo sin
// pedirle al vendedor que configure nada.

export type ReelTheme = {
  accent: string;
  text: string;
  border: string;
  radius?: number | string;
};

type Reel =
  | { kind: "video"; url: string }
  | { kind: "youtube"; url: string; id: string }
  | { kind: "link"; url: string; platform: string };

// Solo http/https. Sin este filtro, un reelUrl guardado como "javascript:..."
// se renderiza en la tienda como <a href="javascript:..."> y le ejecuta codigo
// al comprador en el origen de la tienda. El server valida lo mismo, esto es la
// segunda cerradura.
export function isSafeReelUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test((url ?? "").trim());
}

// Una sola lectura de la URL. Cada template tenia su propia version de esto,
// con reglas distintas para el mismo link. Devuelve null si la URL no sirve.
export function parseReel(rawUrl: string): Reel | null {
  const url = (rawUrl ?? "").trim();
  if (!isSafeReelUrl(url)) return null;

  if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)) return { kind: "video", url };

  let id = "";
  if (url.includes("youtube.com/shorts/")) id = url.split("shorts/")[1]?.split(/[?/&#]/)[0] ?? "";
  else if (url.includes("youtu.be/")) id = url.split("youtu.be/")[1]?.split(/[?/&#]/)[0] ?? "";
  else if (url.includes("youtube.com/watch")) {
    try { id = new URL(url).searchParams.get("v") ?? ""; } catch { /* url basura */ }
  }
  // Solo el id que da YouTube (letras, numeros, - y _): asi no se puede colar
  // un ".." que rompa la URL del embed ni de la miniatura.
  if (id && /^[A-Za-z0-9_-]{5,20}$/.test(id)) return { kind: "youtube", url, id };

  // Instagram y TikTok no se pueden embeber sin su API: se abren en su app.
  const platform = url.includes("instagram") ? "Instagram" : url.includes("tiktok") ? "TikTok" : "Ver video";
  return { kind: "link", url, platform };
}

// Ancho por defecto de cada miniatura. Se puede agrandar por template con la prop
// `ancho`: en un modal de producto, 104px deja el reel como una estampilla al lado
// de una foto de 470px y no se llega a distinguir qué se está mostrando.
const THUMB_W = 104;

function PlayBadge() {
  return (
    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </span>
    </span>
  );
}

function ReelThumb({ reel, theme, onOpen, ancho = THUMB_W }: { reel: Reel; theme: ReelTheme; onOpen: () => void; ancho?: number }) {
  const box: React.CSSProperties = {
    position: "relative",
    width: ancho,
    aspectRatio: "9/16",
    borderRadius: theme.radius ?? 10,
    overflow: "hidden",
    background: "#000",
    flexShrink: 0,
    cursor: "pointer",
    border: `1px solid ${theme.border}`,
    padding: 0,
  };

  if (reel.kind === "link") {
    return (
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...box, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", color: theme.text }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill={theme.accent}><polygon points="5 3 19 12 5 21 5 3" /></svg>
        <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", padding: "0 4px" }}>{reel.platform}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onOpen} style={box} aria-label="Ver video del producto">
      {reel.kind === "video" ? (
        // preload=metadata: baja solo el primer fotograma, no el video entero.
        <video src={reel.url} preload="metadata" muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- host externo de YouTube, no pasa por el optimizador
        <img src={`https://img.youtube.com/vi/${reel.id}/hqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <PlayBadge />
    </button>
  );
}

function ReelModal({ reels, index, setIndex, onClose }: {
  reels: Reel[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  // Sin guard de "mounted": esto solo se monta despues de un click del usuario,
  // asi que nunca corre en el server y document.body siempre existe.
  const total = reels.length;
  const go = (delta: number) => setIndex((index + delta + total) % total);
  const swipe = useTouchSwipe(() => go(1), () => go(-1));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // En captura y cortando la propagacion: los templates de Moda abren esto
        // dentro de su propio modal y tambien escuchan Escape. Sin esto, cerrar
        // el video te cerraria tambien la ficha del producto.
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" && total > 1) {
        setIndex((index + 1) % total);
      } else if (e.key === "ArrowLeft" && total > 1) {
        setIndex((index - 1 + total) % total);
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); };
  }, [index, total, onClose, setIndex]);

  useEffect(() => {
    // Guardamos el valor previo en vez de limpiar a "": el modal de producto del
    // template puede tener el scroll bloqueado y no hay que desbloquearselo.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const reel = reels[index];
  const arrow: React.CSSProperties = {
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff",
    width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Video del producto"
      style={{
        position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.93)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: 16,
      }}
      {...(total > 1 ? swipe : {})}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar video"
        style={{ ...arrow, position: "absolute", top: 16, right: 16, zIndex: 1 }}
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: "100%", justifyContent: "center" }}
      >
        {total > 1 && <button type="button" onClick={() => go(-1)} aria-label="Video anterior" style={arrow}>‹</button>}

        {reel.kind === "video" ? (
          // contain + max: el video se ve ENTERO, sea vertical, cuadrado u horizontal.
          <video
            key={reel.url}
            src={reel.url}
            controls
            autoPlay
            playsInline
            style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", background: "#000", borderRadius: 12 }}
          />
        ) : reel.kind === "youtube" ? (
          <iframe
            key={reel.id}
            src={`https://www.youtube.com/embed/${reel.id}?autoplay=1&playsinline=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title="Video del producto"
            style={{ width: "min(86vw, 420px)", aspectRatio: "9/16", maxHeight: "82vh", border: "none", borderRadius: 12, background: "#000" }}
          />
        ) : null}

        {total > 1 && <button type="button" onClick={() => go(1)} aria-label="Video siguiente" style={arrow}>›</button>}
      </div>

      {total > 1 && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
          {reels.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver video ${i + 1}`}
              style={{
                width: 7, height: 7, borderRadius: "50%", padding: 0, border: "none", cursor: "pointer",
                background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

/**
 * El reproductor suelto, para abrirlo desde afuera de la tienda (lo usa el
 * formulario del panel). Asi el vendedor prueba su video con el mismo modal que
 * le va a aparecer al comprador, y no con una imitacion.
 */
export function ReelPlayerModal({ reelUrls, startIndex = 0, onClose }: {
  reelUrls: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const playable = playableReels(reelUrls);
  const [index, setIndex] = useState(startIndex);
  if (playable.length === 0) return null;
  const safeIndex = Math.min(Math.max(index, 0), playable.length - 1);
  return <ReelModal reels={playable} index={safeIndex} setIndex={setIndex} onClose={onClose} />;
}

// Los reels que abren en el modal: los de Instagram/TikTok salen a su app y los
// invalidos no se muestran. Es la misma cuenta que necesita el panel para saber
// en que indice abrir, asi que vive una sola vez.
export function playableReels(reelUrls: string[]): Reel[] {
  return (reelUrls ?? [])
    .map(parseReel)
    .filter((r): r is Reel => r !== null && r.kind !== "link");
}

/**
 * Fila de miniaturas de reels. Cada template pone su propio titulo/marco alrededor;
 * esto resuelve las miniaturas, el reproductor y el swipe.
 */
// Flecha para correr la tira de miniaturas. Va por fuera para no redeclararla en
// cada render del componente de arriba.
function FlechaTira({ lado, theme, onClick }: { lado: "izq" | "der"; theme: ReelTheme; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={lado === "izq" ? "Ver videos anteriores" : "Ver más videos"}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [lado === "izq" ? "left" : "right"]: -6,
        width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
        background: "#fff", border: `1px solid ${theme.border}`, color: theme.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, lineHeight: 1, padding: 0, zIndex: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
      }}>
      {lado === "izq" ? "‹" : "›"}
    </button>
  );
}

export default function ProductReels({ reelUrls, theme, ancho }: { reelUrls: string[]; theme: ReelTheme; ancho?: number }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Identidad estable de la lista. Como dependencia de efectos, `reelUrls` a secas
  // es un array nuevo en cada render y rearmaría los observers todo el tiempo.
  const urlsKey = (reelUrls ?? []).join("|");
  // Qué flechas mostrar. Se mide la tira ya dibujada en vez de contar miniaturas:
  // cuántas entran depende del ancho de la columna, que cambia entre 360 y 1280.
  const tiraRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);
  const medirTira = useCallback(() => {
    const el = tiraRef.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    const el = tiraRef.current;
    if (!el) return;
    // La primera medición en un frame aparte: llamarla acá sería un setState
    // sincrónico dentro del efecto.
    const raf = requestAnimationFrame(medirTira);
    el.addEventListener("scroll", medirTira, { passive: true });
    const ro = new ResizeObserver(medirTira);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", medirTira);
      ro.disconnect();
    };
  }, [medirTira, urlsKey, ancho]);
  const correr = useCallback((dir: 1 | -1) => {
    const el = tiraRef.current;
    if (!el) return;
    // Un "paso" es lo que se ve, para no dejar una miniatura cortada al volver.
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }, []);

  // Los modales de los templates reusan el mismo componente al cambiar de producto:
  // si no reseteamos, el indice del producto anterior queda vivo.
  const [prevUrlsKey, setPrevUrlsKey] = useState(urlsKey);
  if (prevUrlsKey !== urlsKey) {
    setPrevUrlsKey(urlsKey);
    setOpenIdx(null);
  }

  if (!reelUrls || reelUrls.length === 0) return null;

  // Una URL invalida (parseReel null) no se le muestra al comprador.
  const reels = reelUrls.map(parseReel).filter((r): r is Reel => r !== null);
  if (reels.length === 0) return null;

  // El indice del modal se calcula acá y se pasa hecho: buscarlo despues por URL
  // abría siempre el primero cuando el producto tenía dos veces el mismo video.
  const playable = reels.filter((r) => r.kind !== "link");

  return (
    <>
      {/* La tira scrollea de costado, pero el `overflowX` solo no se descubre con
          mouse: en una columna angosta (768px, ~325 de ancho útil) entran dos
          miniaturas de las tres y la tercera quedaba invisible. Las flechas
          aparecen SOLO si de verdad sobra tira para correr — con una o dos
          miniaturas que entran, no molestan. */}
      <div style={{ position: "relative" }}>
        <div ref={tiraRef} className="reels-tira"
          style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
          {reels.map((reel, i) => {
            const playIdx = reel.kind === "link" ? -1 : playable.indexOf(reel);
            return (
              <ReelThumb
                key={reel.url + i}
                reel={reel}
                theme={theme}
                ancho={ancho}
                onOpen={() => setOpenIdx(playIdx)}
              />
            );
          })}
        </div>
        <style>{`.reels-tira::-webkit-scrollbar{display:none}.reels-tira{scrollbar-width:none;-ms-overflow-style:none}`}</style>
        {puedeIzq && <FlechaTira lado="izq" theme={theme} onClick={() => correr(-1)} />}
        {puedeDer && <FlechaTira lado="der" theme={theme} onClick={() => correr(1)} />}
      </div>

      {openIdx !== null && openIdx >= 0 && playable.length > 0 && (
        <ReelModal
          reels={playable}
          index={openIdx}
          setIndex={setOpenIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}
