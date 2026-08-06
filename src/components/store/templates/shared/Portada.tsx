"use client";
import { CampoDeLuz } from "./CampoDeLuz";

// ─────────────────────────────────────────────────────────────────────────────
// La portada: el nombre y el coverflow en la misma escena.
//
// El coverflow es una herramienta para ELEGIR, y nadie puede elegir antes de
// saber dónde está. Si es lo primero que aparece, le estás pidiendo una decisión
// —"destacados o categorías"— a alguien que todavía no sabe qué vendés.
//
// Pero la solución tampoco es una portada de pantalla completa y después el
// coverflow de pantalla completa: son dos pantallas enteras antes del primer
// producto, y en un celular eso es mucho scroll para llegar a lo que la persona
// vino a ver.
//
// Entonces: una sola escena. El nombre arriba, el coverflow abajo, la misma luz
// de punta a punta y sin corte entre uno y otro. Al entrar se ve el nombre, la
// frase, y el BORDE DE ARRIBA de las tarjetas asomando — que es lo que dice
// "esto sigue" sin tener que escribirlo.
//
// POR QUÉ EL TEXTO NO LLEVA ALTURA FIJA
//
// Un `height: 40vh` se ve bien en la pantalla donde se probó y mal en todas las
// demás: en un monitor alto deja un pozo vacío, y en un celular apaisado tapa el
// coverflow entero. Acá el alto sale del contenido más aire, así que la tienda
// que escribe una frase larga y la que no escribe ninguna se ven las dos bien.
// ─────────────────────────────────────────────────────────────────────────────

export function Portada({
  nav,
  marca,
  frase,
  kicker,
  children,
  colores,
  base,
  tinta,
  acento,
}: {
  /** La barra de navegación del template. Va adentro de la escena, sin fondo propio. */
  nav?: React.ReactNode;
  marca: string;
  frase?: string;
  kicker?: string;
  /** El coverflow. Comparte la luz con el título en vez de tener la suya. */
  children: React.ReactNode;
  colores: [string, string, string];
  base: string;
  tinta: string;
  acento: string;
}) {
  return (
    <header style={{ position: "relative", background: base, overflow: "hidden" }}>
      <CampoDeLuz
        modo="oscuro"
        colores={colores}
        base={base}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Dos velos, no uno. El de arriba oscurece el centro para que el título se
          lea sobre cualquier cosa que haga la luz; el de abajo apaga la escena
          contra el color de fondo, así el catálogo que sigue no arranca con un
          borde. Un solo degradado no puede hacer las dos cosas. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(80% 55% at 50% 26%, ${base}b3, transparent 72%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(to bottom, transparent 72%, ${base}d9 92%, ${base} 100%)`,
        }}
      />

      <div style={{ position: "relative" }}>
        {nav}

        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(34px, 6vh, 72px) 26px clamp(26px, 4vh, 46px)",
            textAlign: "center",
          }}
        >
          {kicker && (
            <p style={{ margin: "0 0 16px", fontSize: 9.5, letterSpacing: 5, textTransform: "uppercase", color: acento }}>
              {kicker}
            </p>
          )}
          <h1
            style={{
              margin: 0,
              // Escala con el ancho pero con techo y piso: sin el `clamp`, en un
              // monitor ancho el nombre se come la pantalla y en un celular queda
              // ilegible.
              fontSize: "clamp(30px, 5.2vw, 62px)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 600,
              color: tinta,
            }}
          >
            {marca}
          </h1>
          {frase && (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 520,
                fontSize: "clamp(13px, 1.5vw, 15.5px)",
                lineHeight: 1.7,
                color: "rgba(242,242,247,.62)",
              }}
            >
              {frase}
            </p>
          )}
        </div>

        {children}
      </div>
    </header>
  );
}
