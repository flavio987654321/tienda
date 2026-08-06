"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Coverflow: paneles en perspectiva real.
//
// Cinco paneles en fila. El del centro de frente, grande y nítido; los de los
// costados girados sobre su eje vertical, más chicos y más lejos, hasta salirse
// de la pantalla.
//
// EL DETALLE QUE LO HACE FUNCIONAR
//
// El título va DENTRO del espacio 3D, no encima. Con `transform-style:
// preserve-3d` el navegador ordena por profundidad de verdad, así que poniendo
// el título en un Z intermedio queda POR DETRÁS del panel central y POR DELANTE
// de los laterales. Eso es lo que convence al ojo de que hay volumen — más que
// la inclinación de las tarjetas, que sola se lee como un truco.
//
// EL BARAJADO
//
// Al cambiar, el bloque no se desliza: baja, se desenfoca, y vuelve a subir ya
// reordenado. Como barajar cartas. Es medio segundo y es lo que separa esto de
// un carrusel común.
//
// Y es lo primero que se apaga si molesta: con `prefers-reduced-motion` el
// cambio es directo, sin caída ni desenfoque. Un movimiento vertical grande
// mientras alguien scrollea es exactamente lo que marea.
// ─────────────────────────────────────────────────────────────────────────────

export type PiezaCoverflow = {
  id: string;
  imagen: string;
  titulo: string;
  /** Segunda línea: el precio, la bajada, lo que sea. */
  subtitulo?: string;
  /** Etiqueta chica sobre el panel central (la categoría, por ejemplo). */
  etiqueta?: string;
};

/**
 * Un mazo: un conjunto de piezas con su etiqueta.
 *
 * La misma pista 3D sostiene VARIOS mazos —productos destacados y categorías— y
 * el barajado los intercambia. No se duplica el bloque: cae, y vuelve a subir
 * con otra cosa.
 *
 * Cada mazo lleva su propio `onElegir` porque van a lugares distintos: un
 * producto abre la ficha, una categoría lleva al catálogo filtrado.
 */
export type MazoCoverflow = {
  id: string;
  etiqueta: string;
  piezas: PiezaCoverflow[];
  onElegir?: (id: string) => void;
};

/** Mínimo de piezas para que el coverflow se vea como corresponde. */
export const MIN_COVERFLOW = 5;

const MS_BAJADA = 260;

export function Coverflow({
  mazos,
  acento,
  base,
  tinta,
  alturaMovil = 430,
  altura = 620,
  fundido = false,
}: {
  mazos: MazoCoverflow[];
  acento: string;
  base: string;
  tinta: string;
  alturaMovil?: number;
  altura?: number;
  /**
   * Va adentro de la portada y comparte su luz: no pinta fondo propio y el
   * teñido de la foto entra de a poco desde arriba en vez de arrancar de golpe.
   */
  fundido?: boolean;
}) {
  const [mazoIdx, setMazoIdx] = useState(0);
  const [activo, setActivo] = useState(0);
  const [barajando, setBarajando] = useState(false);
  const [chico, setChico] = useState(false);
  const [quieto, setQuieto] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pistaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mqChico = window.matchMedia("(max-width: 720px)");
    const mqQuieto = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => { setChico(mqChico.matches); setQuieto(mqQuieto.matches); };
    leer();
    mqChico.addEventListener("change", leer);
    mqQuieto.addEventListener("change", leer);
    return () => {
      mqChico.removeEventListener("change", leer);
      mqQuieto.removeEventListener("change", leer);
    };
  }, []);

  // Se limpia al desmontar: sin esto, cambiar de página en mitad del barajado
  // deja un setState apuntando a un componente que ya no existe.
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const mazo = mazos[mazoIdx];
  const piezas = mazo?.piezas ?? [];

  const mover = useCallback((paso: number) => {
    const n = mazos[mazoIdx]?.piezas.length ?? 0;
    if (!n) return;
    const siguiente = (i: number) => (i + paso + n) % n;
    if (quieto) { setActivo(siguiente); return; }
    if (timerRef.current) return; // ya hay un barajado en curso
    setBarajando(true);
    timerRef.current = window.setTimeout(() => {
      setActivo(siguiente);
      setBarajando(false);
      timerRef.current = null;
    }, MS_BAJADA);
  }, [mazos, mazoIdx, quieto]);

  /**
   * Cambiar de mazo. Usa EL MISMO barajado que avanzar de pieza: el bloque cae,
   * se desenfoca, y vuelve a subir con el otro mazo. Que sea el mismo movimiento
   * es lo que hace que se lea como un solo objeto con dos caras, y no como dos
   * carruseles pegados.
   */
  const cambiarMazo = useCallback((i: number) => {
    if (i === mazoIdx) return;
    if (quieto) { setMazoIdx(i); setActivo(0); return; }
    if (timerRef.current) return;
    setBarajando(true);
    timerRef.current = window.setTimeout(() => {
      setMazoIdx(i);
      // Vuelve al principio: el índice de un mazo no significa nada en el otro.
      setActivo(0);
      setBarajando(false);
      timerRef.current = null;
    }, MS_BAJADA);
  }, [mazoIdx, quieto]);

  // Swipe. En celular no hay flechas cómodas, y arrastrar es el gesto que la
  // gente ya prueba sola con algo que se ve como un carrusel.
  const tocoX = useRef<number | null>(null);
  const tocoY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    tocoX.current = e.touches[0].clientX;
    tocoY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (tocoX.current === null || tocoY.current === null) return;
    const dx = e.changedTouches[0].clientX - tocoX.current;
    const dy = e.changedTouches[0].clientY - tocoY.current;
    tocoX.current = null; tocoY.current = null;
    // Sólo si el gesto fue claramente horizontal: si no, le robamos el scroll
    // vertical de la página, que es el gesto más importante de todos.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) mover(dx < 0 ? 1 : -1);
  };

  if (!mazo || !piezas.length) return null;

  const visibles = chico ? 1 : 2; // cuántas a cada lado
  const alto = chico ? alturaMovil : altura;
  const actual = piezas[activo];

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "relative",
        width: "100%",
        height: alto,
        overflow: "hidden",
        // Fundido: el bloque no pinta su propio fondo, se apoya en la luz de la
        // portada. Sin esto quedaba una línea horizontal dura justo donde
        // arrancaba el coverflow, y la "escena única" se leía como dos bloques
        // pegados.
        background: fundido ? "transparent" : base,
      }}
    >
      {/* El fondo es LA MISMA foto, borroneada y oscurecida. Cambia junto con la
          pieza, así que la pantalla entera se tiñe del color de lo que estás
          mirando. Es la mitad del efecto y no cuesta nada: es la imagen que ya
          bajamos, con un blur encima. */}
      {piezas.map((p, i) => (
        <div
          key={`fondo-${p.id}`}
          aria-hidden="true"
          style={{
            position: "absolute", inset: -40,
            backgroundImage: `url(${p.imagen})`, backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(38px) saturate(130%) brightness(.42)",
            opacity: i === activo ? 1 : 0,
            transition: "opacity .7s ease",
            // Fundido: el teñido de la foto no empieza en el borde de arriba,
            // aparece de a poco. El corte lo hace la máscara y no un degradado
            // encima, porque encima habría que pintarlo del color del fondo — y
            // el color del fondo acá es la luz de la portada, que se mueve.
            ...(fundido
              ? {
                  maskImage: "linear-gradient(to bottom, transparent 0%, #000 26%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 26%)",
                }
              : null),
          }}
        />
      ))}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: fundido
            ? `linear-gradient(180deg, transparent 18%, ${base}26 45%, ${base}c4)`
            : `linear-gradient(180deg, ${base}cc, ${base}33 40%, ${base}dd)`,
        }}
      />

      {/* TRES CAPAS, y el orden importa:
            1. el barajado  → mueve y desenfoca
            2. la perspectiva
            3. el espacio 3D → acá el navegador ordena por profundidad

          Al principio el barajado y el preserve-3d estaban en el MISMO elemento
          y no funcionaba: un `filter` aplana el espacio 3D de ese elemento, así
          que se perdía el orden por profundidad y las tarjetas se pintaban en
          orden del HTML — las de los costados terminaban tapando a la del
          centro, justo al revés de lo que tiene que pasar.

          Separado en capas, el filtro queda por ENCIMA del contexto 3D y no lo
          toca: mueve el bloque entero como una foto, y adentro la profundidad
          sigue siendo real. */}
      <div
        ref={pistaRef}
        style={{
          position: "absolute", inset: 0,
          transform: barajando ? "translateY(58px)" : "translateY(0)",
          filter: barajando ? "blur(9px)" : "blur(0px)",
          opacity: barajando ? 0.45 : 1,
          transition: quieto ? "none" : `transform ${MS_BAJADA}ms cubic-bezier(.4,0,.6,1), filter ${MS_BAJADA}ms ease, opacity ${MS_BAJADA}ms ease`,
        }}
      >
      <div
        style={{
          position: "absolute", inset: 0,
          perspective: chico ? "900px" : "1500px",
          display: "grid", placeItems: "center",
        }}
      >
        <div
          style={{
            position: "relative", width: "100%", height: "100%",
            transformStyle: "preserve-3d",
            display: "grid", placeItems: "center",
          }}
        >
          {piezas.map((p, i) => {
            // Distancia circular: con 6 piezas, la 5 está a -1 de la 0, no a +5.
            let d = i - activo;
            const n = piezas.length;
            if (d > n / 2) d -= n;
            if (d < -n / 2) d += n;
            const fuera = Math.abs(d) > visibles;
            const centro = d === 0;
            const signo = Math.sign(d);
            const abs = Math.abs(d);

            // Separación NO lineal: la primera vecina se corre bastante y las de
            // afuera todavía más. Con un paso parejo y chico las tarjetas se
            // encimaban y no se distinguía cuál era la elegida.
            const x = centro ? 0 : signo * (chico ? 60 : 74 + (abs - 1) * 60);
            const z = centro ? 120 : -80 - (abs - 1) * 140;
            const rot = centro ? 0 : -signo * (27 + (abs - 1) * 8);
            const escala = centro ? 1 : 0.8 - (abs - 1) * 0.15;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { if (centro) mazo.onElegir?.(p.id); else mover(d); }}
                aria-label={centro ? `Ver ${p.titulo}` : `Ir a ${p.titulo}`}
                aria-hidden={fuera}
                tabIndex={fuera ? -1 : 0}
                style={{
                  position: "absolute",
                  width: chico ? 190 : 260,
                  height: chico ? 240 : 330,
                  border: "none", padding: 0, cursor: "pointer", borderRadius: 10,
                  overflow: "hidden", background: "#000",
                  transform: `translateX(${x}%) translateZ(${z}px) rotateY(${rot}deg) scale(${escala})`,
                  opacity: fuera ? 0 : 1,
                  pointerEvents: fuera ? "none" : "auto",
                  transition: quieto ? "none" : "transform .62s cubic-bezier(.22,.9,.24,1), opacity .5s ease",
                  boxShadow: centro
                    ? "0 30px 70px rgba(0,0,0,.62), 0 2px 10px rgba(0,0,0,.4)"
                    : "0 16px 40px rgba(0,0,0,.5)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fondo decorativo del carrusel, ya viene optimizado del storefront */}
                <img src={p.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {/* Las de los costados van apagadas: sin esto compiten con la del
                    centro y la fila se lee como cinco cosas, no como una elegida. */}
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: base, opacity: centro ? 0 : 0.42 + (abs - 1) * 0.16, transition: "opacity .62s ease" }} />
                {centro && p.etiqueta && (
                  <span style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,.14)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {p.etiqueta}
                  </span>
                )}
              </button>
            );
          })}

          {/* EL TÍTULO, dentro del espacio 3D pero DELANTE de todo.
              `translateZ(190px)` lo pone por delante del panel central (Z=120).

              Primero estuvo en un Z intermedio, para que el panel central lo
              cortara al medio. Se veía espectacular y estaba mal: el panel es
              ancho y el nombre de un producto es corto, así que tapaba más de la
              mitad —"Ve⋯no" en vez de "Vestido de lino"—. En una web de viajes el
              destino ya se sabe; acá el nombre del producto es la información,
              y ninguna profundidad vale perderla.

              Sigue viviendo adentro del espacio 3D y no encima: así la
              perspectiva lo escala junto con la escena en vez de flotar plano. */}
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: chico ? "17%" : "13%",
              transform: "translateZ(190px)", textAlign: "center", pointerEvents: "none", padding: "0 16px",
            }}
          >
            <h2 style={{
              margin: 0, color: tinta, fontWeight: 300,
              fontSize: chico ? "clamp(26px,8vw,38px)" : "clamp(40px,4.6vw,68px)",
              letterSpacing: "-0.02em", lineHeight: 1.05,
              textShadow: "0 4px 30px rgba(0,0,0,.85), 0 1px 3px rgba(0,0,0,.7)",
            }}>
              {actual.titulo}
            </h2>
            {actual.subtitulo && (
              <p style={{ margin: "10px 0 0", color: tinta, opacity: 0.72, fontSize: chico ? 13 : 15, letterSpacing: ".01em", textShadow: "0 2px 14px rgba(0,0,0,.6)" }}>
                {actual.subtitulo}
              </p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* EL CONTROL DE MAZOS.
          Con un solo mazo no aparece: no hay nada que elegir, y un control que
          no puede cambiar nada es la misma clase de ruido que el selector de
          "Talle: Único" que sacamos de las fichas.

          Va afuera de la capa del barajado a propósito: mientras el bloque cae
          y se desenfoca, el control queda nítido y en su lugar. Es lo que dice
          "esto sigue siendo el mismo bloque, cambió lo que muestra". */}
      {mazos.length > 1 && (
        <div style={{ position: "absolute", top: chico ? 14 : 22, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, zIndex: 4, padding: "0 12px" }}>
          {mazos.map((m, i) => {
            const activoMazo = i === mazoIdx;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => cambiarMazo(i)}
                aria-pressed={activoMazo}
                style={{
                  border: activoMazo ? "1px solid rgba(255,255,255,.2)" : "1px solid transparent",
                  background: activoMazo ? "rgba(255,255,255,.1)" : "transparent",
                  backdropFilter: activoMazo ? "blur(10px)" : undefined,
                  WebkitBackdropFilter: activoMazo ? "blur(10px)" : undefined,
                  color: activoMazo ? tinta : "rgba(255,255,255,.5)",
                  fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 500,
                  padding: "7px 16px", borderRadius: 999, cursor: "pointer",
                  transition: "color .3s ease, background .3s ease, border-color .3s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {m.etiqueta}
              </button>
            );
          })}
        </div>
      )}

      {/* Flechas */}
      {([-1, 1] as const).map(dir => (
        <button
          key={dir}
          type="button"
          onClick={() => mover(dir)}
          aria-label={dir === -1 ? "Anterior" : "Siguiente"}
          style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            [dir === -1 ? "left" : "right"]: chico ? 8 : 26,
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,.08)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,.16)", color: tinta,
            cursor: "pointer", display: "grid", placeItems: "center", zIndex: 3,
          }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            {dir === -1 ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
          </svg>
        </button>
      ))}

      {/* Puntitos */}
      <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 7, zIndex: 3 }}>
        {piezas.map((p, i) => (
          <button
            key={`punto-${p.id}`}
            type="button"
            onClick={() => mover(i - activo)}
            aria-label={`Ir a ${p.titulo}`}
            style={{
              width: i === activo ? 20 : 6, height: 6, borderRadius: 999, border: "none", padding: 0, cursor: "pointer",
              background: i === activo ? acento : "rgba(255,255,255,.32)",
              transition: "width .4s ease, background .4s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default Coverflow;
