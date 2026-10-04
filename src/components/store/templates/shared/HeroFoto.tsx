"use client";
import { useCallback, useEffect, useState } from "react";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";

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
//   · El titulo va en la letra de titulos del template (Aurora: Unbounded) y el
//     resto en la de texto. Ese contraste es lo que separa una portada de una
//     plantilla.
//
// LO QUE NO PUEDE PASAR
//
//   · Que la foto tape el texto. Si la tienda sube una foto clara, el velo
//     igual sostiene el contraste porque va de color base y no de negro puro.
//   · Que rote sola si alguien pidio menos movimiento. Con
//     `prefers-reduced-motion` no hay acercamiento ni cambio automatico: los
//     cuadraditos siguen funcionando, la decision es de la persona.
//   · Que los controles aparezcan con una sola diapositiva. Un control que no
//     controla nada es ruido.
//
// LOS CONTROLES (03/10/26)
//
//   Eran dos flechas redondas y unos puntitos: los de cualquier carrusel de la
//   web. A Flavio no lo convencían. Ahora son las fotos mismas: una columna de
//   cuadraditos de vidrio a la derecha (en el celular, una fila abajo). El que
//   se está viendo brilla, y adentro tiene una línea de luz que se llena como
//   una historia de Instagram; cuando se llena, pasa al siguiente. El tiempo lo
//   marca esa misma animación —no un `setInterval` aparte—, así la línea y el
//   cambio nunca se desfasan, y pausarla (mouse encima) pausa las dos cosas.
//
//   Si la foto es de un producto (`piezas`), en la compu aparece además una
//   tarjeta de vidrio con su nombre, precio y "Ver", que entra deslizándose
//   cada vez que cambia: la portada deja de sólo decorar y empieza a vender.
// ─────────────────────────────────────────────────────────────────────────────

const MS_AUTO = 7000;

/** El producto detrás de una foto del hero, si lo hay. */
export type PiezaHero = {
  titulo: string;
  precio?: string;
  /** Recibe el evento de la tarjeta: adentro está la foto (`data-foto`) de la que vuela la ficha. */
  onVer: (e: React.MouseEvent) => void;
} | null;

export function HeroFoto({
  nav,
  imagenes,
  kicker,
  titulo,
  texto,
  acciones,
  base,
  tinta,
  acento,
  alto = "min(78vh, 720px)",
  posicion = "center",
  imagenCelular,
  posicionCelular,
  margenNav = 0,
  piezas,
  celular = false,
}: {
  /** Uno por foto, en el mismo orden. `null` (o sin la lista): esa foto no es de un producto. */
  piezas?: PiezaHero[];
  /** Cambia los cuadraditos de columna a la derecha a fila abajo, y saca la tarjeta. */
  celular?: boolean;
  nav?: React.ReactNode;
  /**
   * Las fotos que rota el hero. Es una lista de imágenes y NO una lista de
   * diapositivas con texto propio, porque así son los datos de verdad: la tienda
   * escribe UN mensaje en el editor y tiene varias fotos. Un texto por foto
   * obligaría a inventar un campo que nadie va a llenar.
   */
  imagenes: string[];
  /** Van como nodo y no como string: el editor los envuelve en su zona editable. */
  kicker?: React.ReactNode;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
  acciones?: React.ReactNode;
  base: string;
  tinta: string;
  acento: string;
  alto?: string;
  /**
   * Encuadre de la foto. Es lo que hace que el arrastre del editor sirva de
   * algo: sin esto la dueña mueve la imagen y no pasa nada.
   */
  posicion?: string;
  /**
   * La primera foto y su encuadre en el CELULAR (menos de 768 px). Van por CSS
   * (`globals.css`, `.hero-foto-capa`) y no eligiéndolos con el ancho de la
   * ventana: el primer dibujo lo hace el servidor, que no sabe el ancho, y
   * decidirlo después hacía aparecer la foto de PC y cambiarla — y el celular
   * bajaba las dos. Con CSS el navegador baja sólo la que va a mostrar.
   */
  imagenCelular?: string;
  posicionCelular?: string;
  /**
   * Alto de la barra de navegación cuando el template la dibuja FUERA del hero y
   * flotando encima. Sin esto el título arranca debajo del logo: en escritorio
   * apenas se rozan, pero en un celular —donde el hero es más bajo y el texto
   * más alto— el nav le cae justo arriba.
   */
  margenNav?: number;
}) {
  const [activa, setActiva] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const total = imagenes.length;
  /* Con el mouse encima no se cambia sola: nada peor que estar leyendo y que el
     texto se te vaya. Es estado (no ref) porque pausa la ANIMACIÓN de la línea. */
  const [pausado, setPausado] = useState(false);

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
  const swipe = useTouchSwipe(() => ir(1), () => ir(-1));

  const pieza = piezas?.[activa] ?? null;

  return (
    <header
      onPointerEnter={e => { if (e.pointerType === "mouse") setPausado(true); }}
      onPointerLeave={() => setPausado(false)}
      {...(total > 1 ? swipe : {})}
      // En el celular el alto es un PISO y no un techo: con un título largo (o
      // con letra grande elegida en el editor) el texto no entraba, y los
      // botones terminaban debajo de los cuadraditos. Ahí crece con el texto.
      style={{ position: "relative", height: celular ? undefined : alto, minHeight: celular ? `max(520px, ${alto})` : 520, background: base, overflow: "hidden" }}
    >
      <style>{`
        @keyframes hf-llenar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes hf-entra { from { opacity: 0; transform: translateX(46px) } to { opacity: 1; transform: none } }
      `}</style>
      {/* Las fotos: todas montadas, se cruzan por opacidad. Montarlas y
          desmontarlas haria que cada cambio empiece con la imagen sin cargar. */}
      {imagenes.map((src, i) => (
        <div
          key={`${i}-${src}`}
          aria-hidden={i !== activa}
          className="hero-foto-capa"
          style={{
            position: "absolute",
            inset: 0,
            // La foto y el encuadre van en variables: la regla de `globals.css`
            // elige entre las de PC y las de celular según el ancho.
            ["--hf-foto" as string]: `url(${src})`,
            // El encuadre elegido es el de la foto propia, que siempre va primera.
            // Las de productos van centradas.
            ["--hf-pos" as string]: i === 0 ? posicion : "center",
            ...(i === 0 && imagenCelular ? { ["--hf-foto-cel" as string]: `url(${imagenCelular})` } : null),
            ...(i === 0 && posicionCelular ? { ["--hf-pos-cel" as string]: posicionCelular } : null),
            backgroundSize: "cover",
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

      {/* Un piso de oscuridad parejo, antes de los velos con dirección.
          Los velos direccionales dejan el lado derecho limpio, y eso funciona
          mientras la foto sea oscura. La tienda sube la que quiere: con una foto
          clara, ese lado quedaba blanco encandilando al lado del texto. Esta capa
          no tiene dirección y por eso no depende de la foto que toque. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `${base}59` }} />

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

      <div style={{ position: "relative", height: celular ? undefined : "100%", minHeight: celular ? "inherit" : undefined, display: "flex", flexDirection: "column" }}>
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
            // En el celular los cuadraditos van abajo, encima de la foto: el texto
            // les deja su lugar (64 de alto + 18 del borde + aire) para no quedar tapado.
            padding: celular
              ? `${margenNav + 36}px 26px ${total > 1 ? 118 : 36}px`
              : `${margenNav}px 26px 0`,
            gap: 24,
            // Sin `wrap`, en un celular las flechas se meten adentro del párrafo
            // y le comen dos palabras por renglón. Con la base de 340 en el
            // texto, cuando no hay lugar para los dos las flechas bajan solas.
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 340px", maxWidth: 560, minWidth: 0 }}>
            {kicker && (
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
                {kicker}
              </p>
            )}
            <h1
              style={{
                margin: 0,
                // La letra la pone el template (Aurora: Unbounded, ver
                // `aurora/fuentes`); Georgia queda de respaldo.
                fontFamily: "var(--au-titulo, Georgia, 'Times New Roman', serif)",
                fontSize: "clamp(36px, 6vw, 76px)",
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                fontWeight: 300,
                color: tinta,
                // La sombra no es un efecto: es el seguro de que el titulo se
                // lea aunque la tienda suba una foto clara justo detras.
                textShadow: "0 2px 30px rgba(0,0,0,.45)",
              }}
            >
              {titulo}
            </h1>
            {texto && (
              <p
                style={{
                  margin: "22px 0 0",
                  maxWidth: 420,
                  fontSize: "clamp(13px, 1.4vw, 15px)",
                  lineHeight: 1.75,
                  color: "rgba(242,242,247,.78)",
                }}
              >
                {texto}
              </p>
            )}
            {/* Los botones los pone el template: cada uno tiene los suyos, con
                sus destinos y su zona editable. Acá sólo se les da el lugar. */}
            {acciones && <div style={{ marginTop: 28, display: "flex", gap: 14, flexWrap: "wrap" }}>{acciones}</div>}
          </div>

        </div>
      </div>

      {/* ── Los cuadraditos ───────────────────────────────────────────────
          Las fotos mismas son el control. En la compu, columna a la derecha;
          en el celular, fila abajo. El activo brilla y su línea de luz marca
          cuánto falta: al terminar de llenarse (`onAnimationEnd`) pasa al
          siguiente. Con menos movimiento pedido, no hay línea ni cambio solo. */}
      {total > 1 && (
        <div role="tablist" aria-label="Fotos de la portada"
          style={celular
            ? { position: "absolute", left: 0, right: 0, bottom: 18, zIndex: 3, display: "flex", justifyContent: "center", gap: 10 }
            : { position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)", zIndex: 3, display: "flex", flexDirection: "column", gap: 12, marginTop: margenNav / 2 }}>
          {imagenes.map((src, i) => {
            const es = i === activa;
            const lado = celular ? 52 : 70;
            return (
              <button key={`${i}-${src}`} type="button" role="tab" aria-selected={es} aria-label={`Ver la foto ${i + 1} de ${total}`}
                onClick={() => setActiva(i)}
                style={{
                  position: "relative", width: lado, height: celular ? 64 : 88, padding: 0, borderRadius: 14, overflow: "hidden", cursor: "pointer",
                  border: `1.5px solid ${es ? acento : "rgba(255,255,255,.18)"}`,
                  boxShadow: es ? `0 0 26px ${acento}88, 0 10px 24px rgba(0,0,0,.45)` : "0 8px 20px rgba(0,0,0,.35)",
                  opacity: es ? 1 : 0.55,
                  transform: es ? "scale(1.06)" : "scale(1)",
                  transition: "opacity .35s, transform .35s, box-shadow .35s, border-color .35s",
                  background: base,
                }}>
                <span aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                {/* La línea de luz. La `key` la reinicia cada vez que le toca. */}
                {es && !quieto && (
                  <span key={`${activa}`} aria-hidden onAnimationEnd={() => ir(1)}
                    style={{ position: "absolute", left: 6, right: 6, bottom: 6, height: 3, borderRadius: 3, background: acento,
                      boxShadow: `0 0 10px ${acento}`, transformOrigin: "left center",
                      animation: `hf-llenar ${MS_AUTO}ms linear forwards`, animationPlayState: pausado ? "paused" : "running" }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── La tarjeta del producto (sólo compu) ─────────────────────────
          Entra deslizándose cada vez que cambia la foto (`key`). Se toca entera:
          abre la ficha, que vuela desde la foto chiquita de la tarjeta. */}
      {pieza && !celular && (
        <div key={`tarjeta-${activa}`} role="button" tabIndex={0} onClick={pieza.onVer}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pieza.onVer(e as unknown as React.MouseEvent); } }}
          style={{
            position: "absolute", right: total > 1 ? 130 : 32, bottom: 64, zIndex: 3, width: 300,
            display: "flex", alignItems: "center", gap: 14, padding: 10, paddingRight: 18, cursor: "pointer",
            borderRadius: 20, background: "rgba(10,11,20,.55)", border: "1px solid rgba(255,255,255,.16)",
            backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)",
            boxShadow: "0 24px 50px rgba(0,0,0,.45)", color: tinta,
            animation: quieto ? undefined : "hf-entra .7s cubic-bezier(.16,.84,.32,1) both",
          }}>
          <div data-foto style={{ position: "relative", width: 60, height: 80, flexShrink: 0, borderRadius: 12, overflow: "hidden",
            backgroundImage: `url(${imagenes[activa]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: acento, fontWeight: 700 }}>En portada</p>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pieza.titulo}</p>
            {pieza.precio && <p style={{ margin: 0, fontFamily: "var(--au-titulo, inherit)", fontSize: 16 }}>{pieza.precio}</p>}
          </div>
          <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, display: "grid", placeItems: "center", background: acento, color: base, boxShadow: `0 0 18px ${acento}99` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      )}
    </header>
  );
}
