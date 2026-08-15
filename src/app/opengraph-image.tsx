import { ImageResponse } from "next/og";

/* La placa que se ve cuando alguien pega el link de TiendaApps en WhatsApp,
 * Instagram, Facebook o Telegram.
 *
 * Antes se ofrecía `/icon.png`, el ícono cuadrado de 512×512, con la tarjeta de
 * Twitter en modo `summary`: salía un cuadradito con el logo al costado de un
 * texto. Para un negocio que se difunde justamente por link compartido, esa es
 * la primera impresión de la marca y estaba desaprovechada.
 *
 * 1200×630 es la medida que piden Facebook y WhatsApp; la misma sirve para X en
 * modo `summary_large_image`.
 *
 * Sin fuente de marca a propósito: `ImageResponse` necesita un archivo de fuente
 * leído del disco, y meter Figtree acá obligaría a versionar un .ttf en el repo
 * solo para esto. La placa usa la que trae el generador. Si algún día se quiere
 * con la tipografía de la marca, hay que commitear el archivo y pasarlo en
 * `fonts`, como muestra el doc de `opengraph-image`.
 */

export const alt =
  "TiendaApps — Creá tu tienda online, cobrá con Mercado Pago y sumá afiliados que venden por vos";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

const NARANJA = "#ea580c";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fff1f2 100%)",
        }}
      >
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: NARANJA,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            TA
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#0a0a0a", letterSpacing: -0.5 }}>
            TiendaApps
          </div>
        </div>

        {/* Mensaje */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#0a0a0a",
              lineHeight: 1.05,
              letterSpacing: -2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Tu marca.</span>
            <span style={{ color: NARANJA }}>Lista para vender.</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#52525b", lineHeight: 1.35 }}>
            Tienda online, Mercado Pago y afiliados que venden por vos.
          </div>
        </div>

        {/* Pie */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {["7 días gratis", "Sin tarjeta", "Sin comisiones extra"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                color: NARANJA,
                background: "#ffedd5",
                padding: "12px 24px",
                borderRadius: 999,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
