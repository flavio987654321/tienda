"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// El hero: una foto a sangre, el texto a la izquierda.
//
// La versión anterior ponía el nombre centrado sobre un campo de luz abstracto.
// Se veía bien, pero no vendía nada: la luz no muestra el producto. Una tienda
// de ropa tiene fotos, y la foto es el argumento.
//
// TRES COSAS QUE HACEN QUE SE VEA CARO Y NO A PLANTILLA
//
//   · La foto se mueve. Un acercamiento lentísimo, veinte segundos por
//     diapositiva. No se percibe como movimiento; se percibe como que la imagen
//     está viva. Quieta, la misma foto se lee como un fondo pegado.
//   · El texto no va sobre la foto pelada. Va sobre un velo que se apaga hacia
//     la derecha: la izquierda queda legible sin ensuciar la foto entera, que es
//     lo que pasa cuando se le tira una capa negra pareja encima.
//   · El titulo va en serif y el resto en sans. Es el contraste que separa una
//     portada de revista de una plantilla — y no cuesta una fuente nueva: la
//     serif del sistema alcanza.
//
// LO QUE NO PUEDE PASAR
//
//   · Que la foto tape el texto. Si la tienda sube una foto clara, el velo
//     igual sostiene el contraste porque va de color base y no de negro puro.
//   · Que rote sola si alguien pidio menos movimiento. Con
//     `prefers-reduced-motion` no hay acercamiento ni cambio automatico: las
//     flechas siguen funcionando, la decision es de la persona.
//   · Que las flechas aparezcan con una sola diapositiva. Un control que no
//     controla nada es ruido.
// ─────────────────────────────────────────────────────────────────────────────

export type Diapositiva = {
  id: string;
  imagen: string;
  /** La linea chica de arriba, en mayusculas espaciadas. */
  kicker?: string;
  titulo: string;
  texto?: string;
  cta?: { texto: string; href: string };
};

const MS_AUTO = 7000;

export function HeroFoto({
  nav,
  diapositivas,
  base,
  tinta,
  acento,
  alto = "min(78vh, 720px)",
}: {
  nav?: React.ReactNode;
  diapositivas: Diapositiva[];
  base: string;
  tinta: string;
  acento: string;
  alto?: string;
}) {
  const [activa, setActiva] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const total = diapositivas.length;
  const pausa = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const leer = () => setQuieto(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);

  const ir = useCallback(
    (paso: number) => setActiva((i) => (i + paso + total) % total),
    [total],
  );

  useEffect(() => {
    if (quieto || total < 2) return;
    const t = setInterval(() => {
      // Si el mouse está encima, no se cambia sola: nada peor que estar leyendo
      // y que el texto se te vaya solo.
      if (!pausa.current) setActiva((i) => (i + 1) % total);
    }, MS_AUTO);
    return () => clearInterval(t);
  }, [quieto, total]);

  const d = diapositivas[activa];

  return (
    <header
      onPointerEnter={() => (pausa.current = true)}
      onPointerLeave={() => (pausa.current = false)}
      style={{ position: "relative", height: alto, minHeight: 520, background: base, overflow: "hidden" }}
    >
      {/* Las fotos: todas montadas, se cruzan por opacidad. Montarlas y
          desmontarlas haria que cada cambio empiece con la imagen sin cargar. */}
      {diapositivas.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== activa}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${s.imagen})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === activa ? 1 : 0,
            // El acercamiento corre sólo en la que se ve, así arranca de cero
            // cada vez que le toca y no llega ya terminado.
            transform: quieto || i !== activa ? "scale(1)" : "scale(1.08)",
            transition: quieto
              ? "opacity 1s ease"
              : "opacity 1.1s ease, transform 20s linear",
            willChange: "opacity, transform",
          }}
        />
      ))}

      {/* El velo. De izquierda a derecha y de abajo hacia arriba, del color de
          la tienda y no de negro: sobre una foto clara el negro se ve como una
          mancha, el color base se ve como parte del diseño. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(100deg, ${base}f2 0%, ${base}d9 28%, ${base}59 58%, transparent 82%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, ${base}b3 0%, transparent 30%, transparent 62%, ${base}e6 92%, ${base} 100%)`,
        }}
      />

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* El nav va envuelto y no suelto. Como hijo directo de una columna
            flex, cualquier nav que traiga `margin: 0 auto` deja de estirarse y
            se encoge al ancho de su contenido: la barra entera queda apelotonada
            en el medio. El envoltorio absorbe eso, venga el nav que venga. */}
        <div style={{ flexShrink: 0, width: "100%" }}>{nav}</div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            maxWidth: 1180,
            width: "100%",
            margin: "0 auto",
            padding: "0 26px",
            gap: 24,
            // Sin `wrap`, en un celular las flechas se meten adentro del párrafo
            // y le comen dos palabras por renglón. Con la base de 340 en el
            // texto, cuando no hay lugar para los dos las flechas bajan solas.
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 340px", maxWidth: 560, minWidth: 0 }}>
            {d.kicker && (
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 10,
                  // El espaciado también escala: con 7px fijos, "Otoño invierno
                  // 2026" se parte en dos renglones en un celular.
                  letterSpacing: "clamp(3px, 1vw, 7px)",
                  textTransform: "uppercase",
                  color: "rgba(242,242,247,.72)",
                }}
              >
                {d.kicker}
              </p>
            )}
            <h1
              style={{
                margin: 0,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(42px, 7vw, 86px)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
                fontWeight: 400,
                color: tinta,
                // La sombra no es un efecto: es el seguro de que el titulo se
                // lea aunque la tienda suba una foto clara justo detras.
                textShadow: "0 2px 30px rgba(0,0,0,.45)",
              }}
            >
              {d.titulo}
            </h1>
            {d.texto && (
              <p
                style={{
                  margin: "22px 0 0",
                  maxWidth: 420,
                  fontSize: "clamp(13px, 1.4vw, 15px)",
                  lineHeight: 1.75,
                  color: "rgba(242,242,247,.78)",
                }}
              >
                {d.texto}
              </p>
            )}
            {d.cta && (
              <a
                href={d.cta.href}
                style={{
                  display: "inline-block",
                  marginTop: 28,
                  padding: "13px 26px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  textDecoration: "none",
                  background: acento,
                  boxShadow: `0 10px 30px ${acento}4d`,
                }}
              >
                {d.cta.texto}
              </a>
            )}
          </div>

          {/* Las flechas sólo existen si hay algo entre lo que moverse. */}
          {total > 1 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexShrink: 0 }}>
              {([["Anterior", -1], ["Siguiente", 1]] as const).map(([etiqueta, paso]) => (
                <button
                  key={etiqueta}
                  type="button"
                  aria-label={etiqueta}
                  onClick={() => ir(paso)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    color: tinta,
                    background: "rgba(255,255,255,.07)",
                    border: "1px solid rgba(255,255,255,.22)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={paso < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {total > 1 && (
          <div style={{ display: "flex", gap: 7, justifyContent: "center", paddingBottom: 26 }}>
            {diapositivas.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Ver ${s.titulo}`}
                aria-current={i === activa}
                onClick={() => setActiva(i)}
                style={{
                  width: i === activa ? 26 : 7,
                  height: 7,
                  padding: 0,
                  borderRadius: 999,
                  border: 0,
                  cursor: "pointer",
                  background: i === activa ? acento : "rgba(255,255,255,.28)",
                  transition: "width .35s ease, background .35s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
