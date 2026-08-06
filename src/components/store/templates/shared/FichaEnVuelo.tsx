"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { canto, sombra, vidrio } from "./Materia";

// ─────────────────────────────────────────────────────────────────────────────
// La ficha que sale de la tarjeta.
//
// Un modal común aparece de la nada: la tarjeta que tocaste se queda donde
// estaba y encima brota una ventana. El ojo pierde el hilo y hay que volver a
// buscar qué producto era. Acá no aparece nada: la MISMA foto que tocaste crece
// hasta llenar la pantalla. No hay corte, y por eso no hay que reorientarse.
//
// CÓMO SE HACE (y por qué no de la otra forma)
//
// La foto se dibuja directamente en su lugar final, y recién ahí se mide. Con
// esa medida se calcula el `transform` que la lleva de vuelta al lugar exacto de
// la tarjeta, se le aplica de un saque —sin transición— y al cuadro siguiente se
// le saca. El navegador anima el camino.
//
// Lo obvio sería animar `top/left/width/height` desde la tarjeta hasta el final.
// Eso recalcula el layout de la página sesenta veces por segundo. Un `transform`
// no toca el layout: lo resuelve la placa de video.
//
// LO QUE HACE QUE SE VEA CONTINUO Y NO "PARECIDO"
//
//   · La foto de la ficha tiene la MISMA proporción que la de la tarjeta (3/4).
//     Con la misma proporción, la escala es una sola —igual a lo ancho que a lo
//     alto— y la imagen no se estira ni un pixel en el camino. Si fueran
//     distintas habría que deformarla, y se nota.
//   · El redondeo del borde se mide de la tarjeta real y se compensa por la
//     escala. Sin eso, al arrancar achicada el redondeo se ve tres veces más
//     chico que el de la tarjeta y el primer cuadro "salta".
//   · Al cerrar vuelve a la tarjeta. Pero si mientras tanto scrolleaste y la
//     tarjeta ya no está en pantalla, NO vuela hacia afuera: se desvanece. Volar
//     hacia un lugar que no se ve se lee como un error.
//
// LO QUE NO SE VE PERO IMPORTA
//
//   · Se bloquea el scroll de atrás, compensando el ancho de la barra: si no, al
//     abrir la página entera pega un salto lateral.
//   · Escape cierra. El foco entra a la ficha y vuelve a la tarjeta al salir —si
//     no, quien navega con teclado queda tirado arriba de todo.
//   · Con `prefers-reduced-motion` no hay vuelo: aparece y listo. Una foto que
//     crece hasta ocupar la pantalla es justo lo que descompone a alguien
//     sensible al movimiento.
// ─────────────────────────────────────────────────────────────────────────────

export type ValorDeOpcion = {
  valor: string;
  /** Si la opción es un color, su hex. Dibuja un círculo en vez de una pastilla. */
  color?: string;
  agotado?: boolean;
};

export type OpcionDeFicha = { nombre: string; valores: ValorDeOpcion[] };

export type PiezaFicha = {
  id: string;
  foto: string;
  nombre: string;
  precio: string;
  categoria?: string;
  descripcion?: string;
  opciones?: OpcionDeFicha[];
};

/** Qué se abre y desde qué tarjeta. */
export type Apertura = { pieza: PiezaFicha; desde: HTMLElement };

export type Seleccion = Record<string, string>;

const MS_VUELO = 620;
const MS_SALIDA = 300;
const RADIO_FICHA = 22;

export function FichaEnVuelo({
  apertura,
  onCerrar,
  onAgregar,
  stockDe,
  acento,
  tinta,
  panel,
}: {
  apertura: Apertura | null;
  onCerrar: () => void;
  onAgregar?: (pieza: PiezaFicha, seleccion: Seleccion) => void;
  /** Cuánto queda de esta combinación. `null` = el producto no lleva stock por variante. */
  stockDe?: (pieza: PiezaFicha, seleccion: Seleccion) => number | null;
  acento: string;
  tinta: string;
  /** Fondo del panel de texto. Por defecto, vidrio oscuro. */
  panel?: string;
}) {
  // `pintada` es lo que se está mostrando. No es lo mismo que `apertura`: cuando
  // el padre cierra, `apertura` pasa a null pero la ficha tiene que seguir en
  // pantalla hasta terminar de volver a la tarjeta.
  const [pintada, setPintada] = useState<Apertura | null>(null);
  const [vista, setVista] = useState<Apertura | null>(null);
  const [fase, setFase] = useState<"quieta" | "llegando" | "abierta" | "yendose">("quieta");
  const [seleccion, setSeleccion] = useState<Seleccion>({});
  const [aviso, setAviso] = useState("");
  const [chico, setChico] = useState(false);
  const [montado, setMontado] = useState(false);

  const fotoRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el portal necesita `document`, que no existe en el servidor
    setMontado(true);
    const mq = window.matchMedia("(max-width: 899px)");
    const leer = () => setChico(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);

  const quieto = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  // ── Abrir ──────────────────────────────────────────────────────────────────
  //
  // Va en el render y no en un efecto, y la diferencia se ve.
  //
  // Con `useEffect` la secuencia era: se pinta la ficha en su tamaño final, y
  // recién después el efecto la mandaba de vuelta a la tarjeta para que volara.
  // O sea: un cuadro con la foto ya grande antes de arrancar el vuelo — el
  // parpadeo exacto que este bloque existe para evitar.
  //
  // Poniéndolo acá, React vuelve a renderizar antes de tocar la pantalla: para
  // cuando el navegador pinta, la foto ya está achicada sobre la tarjeta.
  if (apertura && apertura !== vista) {
    setVista(apertura);
    setPintada(apertura);
    setSeleccion({});
    setAviso("");
    setFase(quieto() ? "abierta" : "llegando");
  }
  if (!apertura && vista) setVista(null);

  // ── El vuelo de ida ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (fase !== "llegando" || !pintada) return;
    const nodo = fotoRef.current;
    if (!nodo) return;

    const desde = pintada.desde.getBoundingClientRect();
    const hasta = nodo.getBoundingClientRect();
    if (!desde.width || !hasta.width) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no hay de dónde volar; se muestra sin animación
      setFase("abierta");
      return;
    }

    const escala = desde.width / hasta.width;
    const dx = desde.left + desde.width / 2 - (hasta.left + hasta.width / 2);
    const dy = desde.top + desde.height / 2 - (hasta.top + hasta.height / 2);
    const radioOrigen =
      parseFloat(getComputedStyle(pintada.desde).borderTopLeftRadius) || RADIO_FICHA;

    nodo.style.transition = "none";
    nodo.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
    // El redondeo se agranda para que, achicado por la escala, mida lo mismo que
    // el de la tarjeta.
    nodo.style.borderRadius = `${radioOrigen / escala}px`;
    void nodo.getBoundingClientRect(); // fuerza el reflow: sin esto el navegador junta los dos estados y no hay animación

    nodo.style.transition = `transform ${MS_VUELO}ms cubic-bezier(.22,.9,.28,1), border-radius ${MS_VUELO}ms cubic-bezier(.22,.9,.28,1)`;
    nodo.style.transform = "none";
    nodo.style.borderRadius = `${RADIO_FICHA}px`;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- el vuelo ya arrancó; recién ahora puede entrar el panel de texto
    setFase("abierta");
  }, [fase, pintada]);

  // ── El vuelo de vuelta ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (fase !== "yendose" || !pintada) return;
    const nodo = fotoRef.current;
    const vuelve = quieto() ? null : nodo;

    if (vuelve) {
      const destino = pintada.desde.getBoundingClientRect();
      const hasta = nodo!.getBoundingClientRect();
      const enPantalla =
        destino.width > 0 &&
        destino.bottom > 0 &&
        destino.top < window.innerHeight &&
        pintada.desde.isConnected;

      if (enPantalla && hasta.width) {
        const escala = destino.width / hasta.width;
        const dx = destino.left + destino.width / 2 - (hasta.left + hasta.width / 2);
        const dy = destino.top + destino.height / 2 - (hasta.top + hasta.height / 2);
        const radioDestino =
          parseFloat(getComputedStyle(pintada.desde).borderTopLeftRadius) || RADIO_FICHA;
        nodo!.style.transition = `transform ${MS_SALIDA}ms cubic-bezier(.4,0,.7,.2), border-radius ${MS_SALIDA}ms ease, opacity ${MS_SALIDA}ms ease`;
        nodo!.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
        nodo!.style.borderRadius = `${radioDestino / escala}px`;
      } else {
        // La tarjeta ya no está a la vista: se desvanece en el lugar.
        nodo!.style.transition = `opacity ${MS_SALIDA}ms ease, transform ${MS_SALIDA}ms ease`;
        nodo!.style.opacity = "0";
        nodo!.style.transform = "scale(.94)";
      }
    }

    const t = setTimeout(() => {
      setPintada(null);
      setFase("quieta");
      focoPrevio.current?.focus?.();
    }, vuelve ? MS_SALIDA : 0);
    return () => clearTimeout(t);
  }, [fase, pintada]);

  const cerrar = useCallback(() => {
    setFase((f) => (f === "abierta" ? "yendose" : f));
    onCerrar();
  }, [onCerrar]);

  // ── Escape, foco y bloqueo del scroll ──────────────────────────────────────
  useEffect(() => {
    if (!pintada) return;

    // Se anota acá y no al abrir: el foco todavía está en la tarjeta, porque la
    // ficha no se lo lleva hasta que termina de volar.
    focoPrevio.current = document.activeElement as HTMLElement | null;

    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", tecla);

    // La barra de scroll deja de ocupar lugar al bloquear el overflow, y la
    // página de atrás se corre. Se compensa con padding del mismo ancho.
    const barra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = document.body.style.overflow;
    const padPrevio = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;

    const foco = setTimeout(() => cerrarRef.current?.focus(), MS_VUELO);

    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflowPrevio;
      document.body.style.paddingRight = padPrevio;
      clearTimeout(foco);
    };
  }, [pintada, cerrar]);

  if (!montado || !pintada) return null;

  const p = pintada.pieza;
  const opciones = p.opciones ?? [];
  const faltan = opciones.filter((o) => !seleccion[o.nombre]);
  const stock = stockDe ? stockDe(p, seleccion) : null;
  const completa = faltan.length === 0;
  const sinStock = completa && stock === 0;
  const abierta = fase === "abierta";

  const agregar = () => {
    if (!completa) {
      setAviso(`Elegí ${faltan.map((o) => o.nombre.toLowerCase()).join(" y ")}`);
      return;
    }
    if (sinStock) {
      setAviso("Esa combinación no está disponible");
      return;
    }
    setAviso("");
    onAgregar?.(p, seleccion);
  };

  const MID = "rgba(242,242,247,.5)";
  // En el celular la foto va más chica de lo que daría el ancho. Ocupando todo,
  // el precio y el botón de comprar quedan abajo del pliegue y hay que scrollear
  // para enterarse de que se puede comprar. La foto impresiona; el botón vende.
  const anchoFoto = chico ? "min(72vw, 320px)" : "min(46vw, 520px)";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={p.nombre}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: chico ? "0" : "40px 32px",
        // La perspectiva vive acá: el panel de texto entra girado y necesita un
        // punto de fuga compartido con la foto para pertenecer a la misma escena.
        perspective: "1400px",
      }}
    >
      {/* El fondo. Se oscurece y desenfoca lo de atrás, y cierra al tocarlo. */}
      <button
        aria-label="Cerrar"
        onClick={cerrar}
        style={{
          position: "absolute",
          inset: 0,
          border: 0,
          padding: 0,
          cursor: "pointer",
          background: "rgba(4,5,10,.72)",
          backdropFilter: "blur(14px) saturate(120%)",
          WebkitBackdropFilter: "blur(14px) saturate(120%)",
          opacity: abierta ? 1 : 0,
          transition: `opacity ${abierta ? 380 : MS_SALIDA}ms ease`,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: chico ? "column" : "row",
          alignItems: chico ? "stretch" : "center",
          justifyContent: "center",
          gap: chico ? 0 : 34,
          width: "100%",
          // En una columna, el conjunto se limita y se centra. Sin el tope, en
          // una tablet el texto se estiraba a 768px de ancho al lado de una foto
          // de 320: dejaba de leerse como una ficha y parecía una página suelta.
          maxWidth: chico ? 460 : 1060,
          margin: "0 auto",
          maxHeight: chico ? "100dvh" : "none",
          overflowY: chico ? "auto" : "visible",
          padding: chico ? "18px 16px 40px" : 0,
        }}
      >
        {/* ── La foto que voló ── */}
        <div
          ref={fotoRef}
          style={{
            flex: "0 0 auto",
            alignSelf: chico ? "center" : "auto",
            width: anchoFoto,
            aspectRatio: "3 / 4", // la misma que la tarjeta: la escala es una sola y no deforma
            borderRadius: RADIO_FICHA,
            overflow: "hidden",
            background: "#0e0f1a",
            boxShadow: sombra("oscuro", 3),
            willChange: "transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- las fotos vienen de dominios arbitrarios de cada tienda */}
          <img
            src={p.foto}
            alt={p.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* ── El panel de texto ── */}
        <div
          style={{
            // `0 1 440` y no `1 1 0`: con este último el panel se comía todo el
            // sobrante y el par foto+texto quedaba corrido a la izquierda.
            flex: chico ? "0 0 auto" : "0 1 440px",
            minWidth: 0,
            marginTop: chico ? 18 : 0,
            opacity: abierta ? 1 : 0,
            // Entra girado y desde atrás, con una demora: primero se entiende que
            // la foto se agrandó, después llega el texto. Los dos a la vez es un
            // choque de movimientos y no se lee ninguno.
            transform: abierta ? "none" : "translateX(46px) translateZ(-160px) rotateY(16deg)",
            transition: abierta
              ? `opacity .5s ease 200ms, transform .66s cubic-bezier(.2,.85,.3,1) 200ms`
              : `opacity ${MS_SALIDA * 0.5}ms ease, transform ${MS_SALIDA * 0.5}ms ease`,
          }}
        >
          <div
            style={{
              ...(panel ? { background: panel, boxShadow: `${sombra("oscuro", 2)}, ${canto("oscuro")}` } : vidrio("oscuro")),
              borderRadius: 20,
              padding: chico ? "22px 20px 24px" : "30px 30px 32px",
            }}
          >
            {p.categoria && (
              <p style={{ margin: "0 0 10px", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: MID }}>
                {p.categoria}
              </p>
            )}
            <h2 style={{ margin: "0 0 12px", fontSize: chico ? 24 : 30, lineHeight: 1.15, letterSpacing: "-0.02em", color: tinta, fontWeight: 500 }}>
              {p.nombre}
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: chico ? 22 : 26, fontWeight: 600, color: tinta, letterSpacing: "-0.01em" }}>
              {p.precio}
            </p>

            {p.descripcion && (
              <p style={{ margin: "0 0 22px", fontSize: 13.5, lineHeight: 1.75, color: "rgba(242,242,247,.62)" }}>
                {p.descripcion}
              </p>
            )}

            {opciones.map((o) => (
              <div key={o.nombre} style={{ marginBottom: 18 }}>
                <p style={{ margin: "0 0 9px", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: MID }}>
                  {o.nombre}
                  {seleccion[o.nombre] && (
                    <span style={{ color: tinta, letterSpacing: 0, textTransform: "none", fontSize: 12, marginLeft: 8 }}>
                      {seleccion[o.nombre]}
                    </span>
                  )}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {o.valores.map((v) => {
                    const elegido = seleccion[o.nombre] === v.valor;
                    return (
                      <button
                        key={v.valor}
                        type="button"
                        disabled={v.agotado}
                        aria-pressed={elegido}
                        onClick={() => {
                          setSeleccion((s) => ({ ...s, [o.nombre]: v.valor }));
                          setAviso("");
                        }}
                        title={v.color ? v.valor : undefined}
                        style={
                          v.color
                            ? {
                                width: 30,
                                height: 30,
                                borderRadius: 999,
                                background: v.color,
                                border: `2px solid ${elegido ? acento : "rgba(255,255,255,.18)"}`,
                                // El anillo se dibuja separado del borde para que
                                // no tape el color al elegirlo.
                                boxShadow: elegido ? `0 0 0 3px ${acento}44` : canto("oscuro"),
                                cursor: v.agotado ? "not-allowed" : "pointer",
                                opacity: v.agotado ? 0.3 : 1,
                                padding: 0,
                                transition: "box-shadow .2s ease, border-color .2s ease",
                              }
                            : {
                                minWidth: 44,
                                padding: "9px 14px",
                                borderRadius: 11,
                                fontSize: 13,
                                color: elegido ? "#fff" : "rgba(242,242,247,.78)",
                                background: elegido ? acento : "rgba(255,255,255,.05)",
                                border: `1px solid ${elegido ? acento : "rgba(255,255,255,.12)"}`,
                                cursor: v.agotado ? "not-allowed" : "pointer",
                                opacity: v.agotado ? 0.32 : 1,
                                textDecoration: v.agotado ? "line-through" : "none",
                                transition: "background .2s ease, border-color .2s ease, color .2s ease",
                              }
                        }
                      >
                        {v.color ? "" : v.valor}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* El stock sólo se afirma cuando la combinación está completa: con
                media selección, cualquier número que muestre es mentira. */}
            {completa && stock !== null && (
              <p style={{ margin: "0 0 14px", fontSize: 12, color: stock === 0 ? "#f87171" : stock <= 3 ? "#fbbf24" : MID }}>
                {stock === 0 ? "Sin stock en esta combinación" : stock <= 3 ? `Quedan ${stock}` : "Disponible"}
              </p>
            )}

            <button
              type="button"
              onClick={agregar}
              disabled={sinStock}
              style={{
                width: "100%",
                padding: "15px 20px",
                borderRadius: 14,
                border: 0,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: ".01em",
                color: "#fff",
                background: sinStock ? "rgba(255,255,255,.08)" : acento,
                cursor: sinStock ? "not-allowed" : "pointer",
                boxShadow: sinStock ? "none" : `0 10px 30px ${acento}4d, ${canto("oscuro")}`,
                transition: "background .2s ease, box-shadow .2s ease",
              }}
            >
              {sinStock ? "Sin stock" : "Agregar al carrito"}
            </button>

            {/* Se reserva el alto siempre: si el aviso empujara el botón al
                aparecer, el segundo click caería en otro lado. */}
            <p style={{ margin: "10px 0 0", minHeight: 16, fontSize: 12, color: "#fbbf24" }}>{aviso}</p>
          </div>
        </div>

        {/* La cruz. Anclada a la pantalla y no al contenido: así está siempre en
            el mismo lugar, sin importar el ancho ni cuánto scrolleaste adentro. */}
        <button
          ref={cerrarRef}
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          style={{
            position: "fixed",
            top: chico ? 14 : 20,
            right: chico ? 14 : 20,
            width: 40,
            height: 40,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            color: tinta,
            cursor: "pointer",
            opacity: abierta ? 1 : 0,
            transition: "opacity .3s ease 260ms",
            ...vidrio("oscuro"),
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M1 1l13 13M14 1L1 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
