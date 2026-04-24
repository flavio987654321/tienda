import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function money(value: number, currency: string) {
  if (currency === "USD") return `USD ${Math.round(value).toLocaleString("en-US")}`;
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function discountLabel(discountType: string, discountValue: number, currency: string) {
  return discountType === "percentage"
    ? `${discountValue}% OFF`
    : `${money(discountValue, currency)} OFF`;
}

function formatExpiry(value: Date | null) {
  if (!value) return "Sin vencimiento";
  return `Valido hasta ${value.toLocaleDateString("es-AR")}`;
}

function safeColor(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
    ? value
    : fallback;
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          name: true,
          slug: true,
          primaryColor: true,
          accentColor: true,
          footerText: true,
          currency: true,
        },
      },
    },
  });

  if (!coupon) {
    return new Response("Cupon no encontrado", { status: 404 });
  }

  const primary = safeColor(coupon.store.primaryColor, "#6366f1");
  const accent = safeColor(coupon.store.accentColor, "#f59e0b");
  const currency = coupon.store.currency || "ARS";
  const searchParams = new URL(req.url).searchParams;
  const download = searchParams.get("download") === "1";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "42px",
          background: `linear-gradient(135deg, ${primary}, ${accent})`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "28px",
            padding: "36px",
            background: "rgba(15, 23, 42, 0.18)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.9 }}>{coupon.store.name}</div>
              <div style={{ marginTop: 10, fontSize: 54, fontWeight: 800, lineHeight: 1.05 }}>
                {discountLabel(coupon.discountType, coupon.discountValue, currency)}
              </div>
              <div style={{ marginTop: 14, fontSize: 24, opacity: 0.9 }}>
                Usa este codigo al finalizar tu compra
              </div>
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: "999px",
                padding: "10px 18px",
                background: "rgba(255,255,255,0.18)",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {coupon.isActive ? "Activo" : "Inactivo"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "24px",
              border: "2px dashed rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.1)",
              padding: "26px 28px",
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {coupon.code}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.12)",
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.8 }}>Compra minima</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>
                {coupon.minOrderAmount > 0 ? money(coupon.minOrderAmount, currency) : "Sin minimo"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.12)",
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.8 }}>Usos</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>
                {coupon.maxUses ? `${coupon.usedCount}/${coupon.maxUses}` : `${coupon.usedCount} usados`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18 }}>
            <div style={{ display: "flex", opacity: 0.92 }}>{formatExpiry(coupon.expiresAt)}</div>
            <div style={{ display: "flex", opacity: 0.82 }}>
              {coupon.store.footerText || `tienda/${coupon.store.slug}`}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: download
        ? {
            "content-disposition": `attachment; filename=\"cupon-${coupon.code}.png\"`,
          }
        : undefined,
    }
  );
}
