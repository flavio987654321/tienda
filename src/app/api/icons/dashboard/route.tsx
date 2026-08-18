import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * El ícono del panel instalado.
 *
 * Dibujaba una bolsita blanca sobre un degradado violeta: no era el logo de
 * TiendaApps ni se le parecía. El comerciante instalaba el panel y le quedaba en
 * el teléfono un cuadrado violeta genérico, al lado del ícono naranja de la
 * tienda que sí es de la marca. Acá se dibuja la marca de verdad, con las mismas
 * formas y el mismo degradado que `src/app/icon.svg`.
 *
 * Se dibuja en vez de servir `icon.png` porque ese archivo pesa 1,3 MB y hay que
 * entregarlo en varias medidas; dibujarlo sale nítido en cualquier tamaño y pesa
 * unos pocos kilobytes.
 *
 * ── Por qué el maskable va distinto ──────────────────────────────────────────
 * Android le aplica su propia máscara al ícono maskable —en la mayoría de los
 * teléfonos, un círculo— y recorta lo que sobra. Dos consecuencias:
 *
 *   1. Las esquinas redondeadas se dibujan al pedo: la máscara ya redondea, y
 *      redondear dos veces deja un borde raro. Por eso el maskable va cuadrado.
 *   2. Lo que esté fuera del círculo se pierde. El círculo de recorte mide 80%
 *      del lado.
 *
 * El dibujo se entrega a tamaño completo, con las proporciones tal cual están en
 * `icon.svg`, y no hace falta achicarlo para el maskable: adentro del lienzo la
 * bolsa va de 32 a 75 sobre 100, o sea que su esquina más lejana queda a 31 del
 * centro —un círculo de 62%— y entra holgada en el 80% de la zona segura.
 *
 * Encogerlo "por las dudas" fue justamente el primer error acá: dibujado al 46%,
 * la bolsa terminaba ocupando un sexto del cuadrado y el ícono se veía casi
 * vacío al lado del logo de verdad.
 */
export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("size") ?? "512");
  const size = Math.min(Math.max(raw, 16), 1024);
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  // La máscara de Android ya redondea; redondear también acá deja doble borde.
  const radio = maskable ? 0 : Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          // El mismo degradado del logo: naranja a rojo.
          background: "linear-gradient(135deg, #FF6B00 0%, #FF1744 100%)",
          borderRadius: radio,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* La bolsa con la etiqueta de precio, igual que en `icon.svg`. */}
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <path d="M32 42 L36 75 L64 75 L68 42 Z" fill="white" fillOpacity="0.95" />
          <path
            d="M40 42 C40 32 60 32 60 42"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeOpacity="0.95"
          />
          <rect x="42" y="51" width="22" height="17" rx="3" fill="#FF1744" />
          <circle cx="53" cy="57" r="3" fill="white" />
          <path d="M53 57 L53 65" stroke="white" strokeWidth="2" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
