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

function getTemplate(coupon: { discountType: string; discountValue: number }) {
  if (coupon.discountType === "fixed") return "minimal";
  if (coupon.discountValue >= 30) return "spotlight";
  return "modern";
}

function renderModern(args: {
  primary: string;
  accent: string;
  discount: string;
  code: string;
  storeName: string;
  isActive: boolean;
  minOrderAmount: number;
  uses: string;
  expiry: string;
  footer: string;
  currency: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "42px",
        background: `linear-gradient(135deg, ${args.primary}, ${args.accent})`,
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
            <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.9 }}>{args.storeName}</div>
            <div style={{ marginTop: 10, fontSize: 54, fontWeight: 800, lineHeight: 1.05 }}>{args.discount}</div>
            <div style={{ marginTop: 14, fontSize: 24, opacity: 0.9 }}>Usa este codigo al finalizar tu compra</div>
          </div>
          <div style={{ display: "flex", borderRadius: "999px", padding: "10px 18px", background: "rgba(255,255,255,0.18)", fontSize: 20, fontWeight: 700 }}>
            {args.isActive ? "Activo" : "Inactivo"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "24px", border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.1)", padding: "26px 28px", fontSize: 64, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {args.code}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
          <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "rgba(255,255,255,0.12)", padding: "18px 20px" }}>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Compra minima</div>
            <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>
              {args.minOrderAmount > 0 ? money(args.minOrderAmount, args.currency) : "Sin minimo"}
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "rgba(255,255,255,0.12)", padding: "18px 20px" }}>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Usos</div>
            <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{args.uses}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18 }}>
          <div style={{ display: "flex", opacity: 0.92 }}>{args.expiry}</div>
          <div style={{ display: "flex", opacity: 0.82 }}>{args.footer}</div>
        </div>
      </div>
    </div>
  );
}

function renderSpotlight(args: {
  primary: string;
  accent: string;
  discount: string;
  code: string;
  storeName: string;
  isActive: boolean;
  minOrderAmount: number;
  uses: string;
  expiry: string;
  footer: string;
  currency: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "36px",
        background: `radial-gradient(circle at top left, ${args.accent}, transparent 35%), linear-gradient(135deg, #0f172a, ${args.primary})`,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "30px", padding: "40px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.82 }}>{args.storeName}</div>
            <div style={{ marginTop: 16, fontSize: 84, fontWeight: 900, lineHeight: 0.95 }}>{args.discount}</div>
          </div>
          <div style={{ display: "flex", borderRadius: "999px", padding: "10px 18px", background: "rgba(255,255,255,0.18)", fontSize: 20, fontWeight: 700 }}>
            {args.isActive ? "Activo" : "Inactivo"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 26, opacity: 0.92 }}>Promocion especial para compartir hoy</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "24px", border: "2px dashed rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.1)", padding: "26px 28px", fontSize: 64, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {args.code}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
            <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "rgba(255,255,255,0.12)", padding: "18px 20px" }}>
              <div style={{ fontSize: 18, opacity: 0.8 }}>Compra minima</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>
                {args.minOrderAmount > 0 ? money(args.minOrderAmount, args.currency) : "Sin minimo"}
              </div>
            </div>
            <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "rgba(255,255,255,0.12)", padding: "18px 20px" }}>
              <div style={{ fontSize: 18, opacity: 0.8 }}>Usos</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{args.uses}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18 }}>
          <div style={{ display: "flex", opacity: 0.92 }}>{args.expiry}</div>
          <div style={{ display: "flex", opacity: 0.82 }}>{args.footer}</div>
        </div>
      </div>
    </div>
  );
}

function renderMinimal(args: {
  primary: string;
  accent: string;
  discount: string;
  code: string;
  storeName: string;
  isActive: boolean;
  minOrderAmount: number;
  uses: string;
  expiry: string;
  footer: string;
  currency: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "40px",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "28px", padding: "34px", background: "#ffffff", border: `2px solid ${args.primary}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: args.primary }}>{args.storeName}</div>
            <div style={{ marginTop: 16, fontSize: 60, fontWeight: 900, lineHeight: 1 }}>{args.discount}</div>
            <div style={{ marginTop: 10, fontSize: 24, color: "#475569" }}>Beneficio listo para compartir</div>
          </div>
          <div style={{ display: "flex", borderRadius: "999px", padding: "10px 18px", background: `${args.accent}22`, color: args.primary, fontSize: 20, fontWeight: 700 }}>
            {args.isActive ? "Activo" : "Inactivo"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", borderRadius: "24px", border: `2px solid ${args.primary}55`, padding: "24px 28px", color: args.primary, justifyContent: "center", fontSize: 64, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {args.code}
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "#f8fafc", padding: "18px 20px" }}>
              <div style={{ fontSize: 18, color: "#64748b" }}>Compra minima</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>
                {args.minOrderAmount > 0 ? money(args.minOrderAmount, args.currency) : "Sin minimo"}
              </div>
            </div>
            <div style={{ display: "flex", flex: 1, flexDirection: "column", borderRadius: "20px", background: "#f8fafc", padding: "18px 20px" }}>
              <div style={{ fontSize: 18, color: "#64748b" }}>Usos</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{args.uses}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, color: "#475569" }}>
          <div style={{ display: "flex" }}>{args.expiry}</div>
          <div style={{ display: "flex" }}>{args.footer}</div>
        </div>
      </div>
    </div>
  );
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
  const template = getTemplate(coupon);
  const searchParams = new URL(req.url).searchParams;
  const download = searchParams.get("download") === "1";
  const viewProps = {
    primary,
    accent,
    discount: discountLabel(coupon.discountType, coupon.discountValue, currency),
    code: coupon.code,
    storeName: coupon.store.name,
    isActive: coupon.isActive,
    minOrderAmount: coupon.minOrderAmount,
    uses: coupon.maxUses ? `${coupon.usedCount}/${coupon.maxUses}` : `${coupon.usedCount} usados`,
    expiry: formatExpiry(coupon.expiresAt),
    footer: coupon.store.footerText || `tienda/${coupon.store.slug}`,
    currency,
  };

  const imageMarkup =
    template === "spotlight"
      ? renderSpotlight(viewProps)
      : template === "minimal"
        ? renderMinimal(viewProps)
        : renderModern(viewProps);

  return new ImageResponse(imageMarkup, {
    width: 1200,
    height: 630,
    headers: download
      ? {
          "content-disposition": `attachment; filename=\"cupon-${coupon.code}.png\"`,
        }
      : undefined,
  });
}
