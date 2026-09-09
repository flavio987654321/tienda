"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * La última red: cuando se rompe el armazón mismo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUÉ ATAJA ESTO QUE NO ATAJA NINGÚN OTRO `error.tsx`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los `error.tsx` de cada sección se dibujan ADENTRO del armazón: el `layout`
 * raíz ya corrió, con su `<html>`, su `<body>` y sus proveedores. Si lo que se
 * rompe es justamente eso —el layout raíz, un proveedor, la tipografía— no hay
 * ningún adentro donde dibujar, así que ninguno de ellos aparece.
 *
 * Sin este archivo, ese caso muestra la pantalla en blanco de Next: fondo
 * blanco, "Application error: a client-side exception has occurred" en negro
 * chiquito, y nada más. **Y no llega a Sentry**, así que del lado de acá nadie
 * se entera: quien lo vio no tiene cómo contarlo y nosotros no tenemos cómo
 * verlo.
 *
 * Por eso lo primero que hace es avisar, y recién después dibuja.
 *
 * ── ⚠️ Por qué trae `<html>` y `<body>` propios ────────────────────────────
 *
 * Porque REEMPLAZA al layout raíz, no se mete adentro. Es el único componente
 * de la aplicación que los tiene que declarar, y sin ellos no se dibuja nada.
 *
 * ── ⚠️ Y por qué no usa nada nuestro ───────────────────────────────────────
 *
 * Ni Tailwind, ni el proveedor de tema, ni un ícono, ni un componente
 * compartido. Esto corre cuando algo de todo eso se rompió: cualquier cosa que
 * importe podría ser justamente la que falló, y entonces la pantalla de error
 * también fallaría — y ahí sí no queda nada. Los estilos van escritos a mano,
 * en el elemento, sin depender de que una sola hoja de estilos haya cargado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Primero avisar. Si el dibujo de abajo también fallara, esto ya salió. */
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8f8f7",
            color: "#1f1b16",
          }}
        >
          <div style={{ maxWidth: "420px", textAlign: "center" }}>
            <h1 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 800 }}>
              Se nos rompió algo
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: 1.6, color: "#6b6257" }}>
              No es tu conexión ni algo que hayas hecho mal: falló de nuestro lado y ya nos
              llegó el aviso. Probá de nuevo en un momento.
            </p>

            {/* ⚠️ El `digest` es el único hilo que une lo que vio la persona con
                lo que vemos nosotros. Sin él, un reclamo dice "me tiró error" y
                no hay forma de saber cuál de todos. */}
            {error.digest && (
              <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#9a9186" }}>
                Si escribís, pasanos este código: <strong>{error.digest}</strong>
              </p>
            )}

            <button
              onClick={reset}
              style={{
                border: 0,
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#ffffff",
                background: "#ea580c",
                cursor: "pointer",
              }}
            >
              Probar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
