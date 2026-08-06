"use client";
import { canto, Inclinable, sombra, vidrio } from "./Materia";
import { PiezaQueLlega } from "./GrillaProfunda";

// ─────────────────────────────────────────────────────────────────────────────
// El cierre: de las garantías al pie, una sola escena.
//
// En el resto de los templates esto son cuatro cajas apiladas, cada una con su
// borde arriba y su fondo distinto: garantías, nosotros, contacto, pie. Se ve
// dónde termina una y empieza la otra, y por eso se lee como una lista de
// secciones en vez de como una página.
//
// Acá no hay bordes de sección ni cambios de fondo. La luz del hero vuelve, más
// tenue, y todo flota encima a distintas profundidades. Lo que separa un bloque
// del otro es el aire y la distancia, no una línea.
//
// POR QUÉ EL CIERRE TRAE SU PROPIA LUZ
//
// El vidrio de `Materia` funciona con `backdrop-filter`: desenfoca lo que hay
// detrás. Sobre negro plano no hay nada que desenfocar, así que el vidrio queda
// gris y muerto — el mismo material que arriba se veía caro, acá se veía barato.
// No era el vidrio: era el fondo.
//
// La luz es CSS, no WebGL. Es un fondo lento y desenfocado detrás de texto: no
// necesita ni un shader ni un segundo contexto de video. Lo caro se reserva para
// donde se mira.
// ─────────────────────────────────────────────────────────────────────────────

export type Garantia = { titulo: string; texto: string; icono?: React.ReactNode };
export type Stat = { numero: string; etiqueta: string };
export type ViaDeContacto = { id: string; nombre: string; detalle: string; href: string; icono?: React.ReactNode };
export type ColumnaDelPie = { titulo: string; links: { texto: string; href: string }[] };

const MID = "rgba(242,242,247,.52)";
const TENUE = "rgba(242,242,247,.38)";

/** Ancho útil compartido: todos los bloques del cierre se alinean al mismo eje. */
const CAJA: React.CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "0 26px" };

// ─────────────────────────────────────────────────────────────────────────────

export function LuzDeFondo({
  children,
  base,
  acento,
}: {
  children: React.ReactNode;
  base: string;
  acento: string;
}) {
  return (
    <div style={{ position: "relative", background: base, overflow: "hidden" }}>
      {/* La animación vive en una hoja de estilos y no en un `style` porque son
          fotogramas: no se pueden expresar inline. Y el `prefers-reduced-motion`
          va acá adentro, en el mismo lugar donde se define el movimiento, para
          que no se pueda agregar un efecto y olvidarse de apagarlo. */}
      <style>{`
        @keyframes cierre-deriva {
          0%   { transform: translate3d(0,0,0)      scale(1);    }
          50%  { transform: translate3d(3%,-2%,0)   scale(1.08); }
          100% { transform: translate3d(-2%,2%,0)   scale(1.03); }
        }
        .cierre-luz { animation: cierre-deriva 34s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .cierre-luz { animation: none; } }
      `}</style>

      <div
        aria-hidden="true"
        className="cierre-luz"
        style={{
          position: "absolute",
          // Se pasa de los bordes: al derivar, el desenfoque no puede dejar ver
          // dónde termina la capa.
          inset: "-25%",
          pointerEvents: "none",
          filter: "blur(80px)",
          opacity: 0.62,
          background: `
            radial-gradient(42% 38% at 22% 16%, ${acento}8c, transparent 70%),
            radial-gradient(38% 42% at 80% 38%, ${acento}5c, transparent 72%),
            radial-gradient(50% 40% at 40% 70%, ${acento}3d, transparent 75%)
          `,
        }}
      />
      {/* La luz se apaga hacia abajo: la página termina en negro, no cortada. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(to bottom, ${base}00 62%, ${base}cc 90%, ${base} 100%)`,
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Garantias({ items, tinta }: { items: Garantia[]; tinta: string }) {
  return (
    <section style={{ ...CAJA, paddingTop: 96, paddingBottom: 30 }}>
      <div
        style={{
          display: "grid",
          // Sin puntos de corte en JS: la grilla se reacomoda sola. El mínimo no
          // es un número lindo, es una cuenta: en 1180 de caja quedan 1128
          // útiles, y cuatro columnas con 18 de hueco dan 268 cada una. Con 280
          // no entraban cuatro y caía en 3 + 1 huérfana. Con 250 entra en 1280,
          // da 2×2 en 768 y una sola columna en 360.
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          gap: 18,
        }}
      >
        {items.map((g, i) => (
          <PiezaQueLlega key={g.titulo} indice={i}>
            <Inclinable grados={4} style={{ borderRadius: 18, height: "100%" }}>
              <div
                style={{
                  ...vidrio("oscuro"),
                  borderRadius: 18,
                  padding: "24px 22px 26px",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* El número va detrás y casi apagado: ordena la lectura sin
                    pedir atención, y le da al vidrio algo que sostener. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: -22,
                    fontSize: 92,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                    color: "rgba(255,255,255,.05)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {g.icono && <div style={{ color: tinta, opacity: 0.9, marginBottom: 14 }}>{g.icono}</div>}
                <p style={{ margin: "0 0 7px", fontSize: 14.5, fontWeight: 600, color: tinta, letterSpacing: "-0.01em" }}>
                  {g.titulo}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: MID, position: "relative" }}>{g.texto}</p>
              </div>
            </Inclinable>
          </PiezaQueLlega>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Nosotros({
  kicker,
  titulo,
  parrafos,
  stats,
  foto,
  tinta,
  acento,
}: {
  kicker?: string;
  titulo: string;
  parrafos: string[];
  stats?: Stat[];
  foto?: string;
  tinta: string;
  acento: string;
}) {
  return (
    <section style={{ ...CAJA, paddingTop: 110, paddingBottom: 40 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: foto ? "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" : "1fr",
          gap: 52,
          alignItems: "center",
        }}
      >
        <div>
          {kicker && (
            <p style={{ margin: "0 0 16px", fontSize: 9.5, letterSpacing: 4.5, textTransform: "uppercase", color: acento }}>
              {kicker}
            </p>
          )}
          {/* El título respira: sin caja, sin vidrio, sin borde. Es el único
              lugar del cierre donde el texto se apoya directo sobre la luz. */}
          <h2
            style={{
              margin: "0 0 26px",
              fontSize: "clamp(26px, 3.4vw, 40px)",
              lineHeight: 1.18,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              color: tinta,
              maxWidth: 620,
            }}
          >
            {titulo}
          </h2>
          {parrafos.map((p, i) => (
            <p key={i} style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.8, color: MID, maxWidth: 560 }}>
              {p}
            </p>
          ))}

          {stats && stats.length > 0 && (
            <div
              style={{
                display: "grid",
                // Dos columnas fijas, no `auto-fit`. Las cuatro estadísticas son
                // siempre cuatro, y en 2×2 el bloque queda siempre lleno: con
                // `auto-fit` daba tres arriba y una huérfana abajo. Además las
                // etiquetas son largas ("Producción local") y en cuatro columnas
                // se parten en dos renglones desparejos.
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 34,
              }}
            >
              {stats.map((s, i) => (
                <PiezaQueLlega key={s.etiqueta} indice={i}>
                  <div style={{ ...vidrio("oscuro", 0.7), borderRadius: 14, padding: "16px 16px 15px" }}>
                    <p style={{ margin: "0 0 5px", fontSize: 25, fontWeight: 700, color: tinta, letterSpacing: "-0.03em" }}>
                      {s.numero}
                    </p>
                    <p style={{ margin: 0, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: TENUE }}>
                      {s.etiqueta}
                    </p>
                  </div>
                </PiezaQueLlega>
              ))}
            </div>
          )}
        </div>

        {foto && (
          <PiezaQueLlega indice={1}>
            <Inclinable grados={6} style={{ borderRadius: 22 }}>
              {/* El tope de alto importa cuando la sección cae a una columna: sin
                  él, en una tablet la foto se estira a 900px y el visitante tiene
                  que scrollear una pantalla entera de foto para llegar al resto. */}
              <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: sombra("oscuro", 3), aspectRatio: "4 / 5", maxHeight: 560 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- la foto la sube cada tienda, el dominio es arbitrario */}
                <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </Inclinable>
          </PiezaQueLlega>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Contacto({
  kicker,
  titulo,
  vias,
  formulario,
  tinta,
  acento,
}: {
  kicker?: string;
  titulo: string;
  vias: ViaDeContacto[];
  /** El formulario real del template. Va al costado, no arriba. */
  formulario?: React.ReactNode;
  tinta: string;
  acento: string;
}) {
  return (
    <section style={{ ...CAJA, paddingTop: 110, paddingBottom: 60 }}>
      {kicker && (
        <p style={{ margin: "0 0 14px", fontSize: 9.5, letterSpacing: 4.5, textTransform: "uppercase", color: acento }}>
          {kicker}
        </p>
      )}
      <h2
        style={{
          margin: "0 0 38px",
          fontSize: "clamp(24px, 3vw, 34px)",
          lineHeight: 1.2,
          letterSpacing: "-0.025em",
          fontWeight: 500,
          color: tinta,
          maxWidth: 560,
        }}
      >
        {titulo}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: formulario ? "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" : "1fr",
          gap: 34,
          alignItems: "start",
        }}
      >
        {/* Las vías directas van PRIMERO y son botones grandes, no un renglón de
            iconitos al pie del formulario. Quien entra a contacto casi siempre
            quiere escribir por WhatsApp, no llenar campos y esperar. */}
        <div
          style={{
            display: "grid",
            // Con formulario al lado, las vías van en una sola columna. En dos
            // quedaban dos arriba y una huérfana abajo, que es peor que una
            // lista prolija.
            gridTemplateColumns: formulario ? "1fr" : "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 12,
          }}
        >
          {vias.map((v, i) => (
            <PiezaQueLlega key={v.id} indice={i}>
              <Inclinable grados={5} style={{ borderRadius: 16, height: "100%" }}>
                <a
                  href={v.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...vidrio("oscuro"),
                    borderRadius: 16,
                    padding: "18px 18px 19px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    height: "100%",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  {v.icono && <span style={{ color: acento, flexShrink: 0, display: "grid", placeItems: "center" }}>{v.icono}</span>}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: tinta, marginBottom: 3 }}>
                      {v.nombre}
                    </span>
                    {/* El detalle puede ser un mail largo: se corta con puntos
                        antes que empujar la tarjeta y desarmar la grilla. */}
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: MID,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.detalle}
                    </span>
                  </span>
                </a>
              </Inclinable>
            </PiezaQueLlega>
          ))}
        </div>

        {formulario && (
          <div style={{ ...vidrio("oscuro", 0.8), borderRadius: 20, padding: "24px 22px 26px" }}>{formulario}</div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function PieDePagina({
  marca,
  bajada,
  columnas,
  redes,
  legal,
  tinta,
}: {
  marca: string;
  bajada?: string;
  columnas: ColumnaDelPie[];
  redes?: { nombre: string; href: string; icono?: React.ReactNode }[];
  legal?: string;
  tinta: string;
}) {
  return (
    // Sin borde arriba. El pie no empieza: la luz se apaga y queda el texto.
    <footer style={{ ...CAJA, paddingTop: 70, paddingBottom: 44 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
          gap: 36,
          marginBottom: 46,
        }}
      >
        <div style={{ gridColumn: "span 1", minWidth: 0 }}>
          <p style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: tinta }}>{marca}</p>
          {bajada && <p style={{ margin: "0 0 18px", fontSize: 12.5, lineHeight: 1.7, color: TENUE, maxWidth: 260 }}>{bajada}</p>}
          {redes && redes.length > 0 && (
            <div style={{ display: "flex", gap: 9 }}>
              {redes.map((r) => (
                <a
                  key={r.nombre}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.nombre}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    color: tinta,
                    textDecoration: "none",
                    fontSize: 10.5,
                    letterSpacing: 0.5,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.10)",
                    boxShadow: canto("oscuro"),
                  }}
                >
                  {r.icono ?? r.nombre.slice(0, 2).toUpperCase()}
                </a>
              ))}
            </div>
          )}
        </div>

        {columnas.map((c) => (
          <div key={c.titulo} style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 14px", fontSize: 9.5, letterSpacing: 2.5, textTransform: "uppercase", color: TENUE }}>
              {c.titulo}
            </p>
            {c.links.map((l) => (
              <a
                key={l.texto}
                href={l.href}
                style={{ display: "block", marginBottom: 9, fontSize: 12.5, color: MID, textDecoration: "none" }}
              >
                {l.texto}
              </a>
            ))}
          </div>
        ))}
      </div>

      {legal && (
        <p style={{ margin: 0, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.07)", fontSize: 11.5, color: TENUE }}>
          {legal}
        </p>
      )}
    </footer>
  );
}
