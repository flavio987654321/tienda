import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true, logo: true, logoColor: true, primaryColor: true, description: true, tagline: true,
      owner: { select: { subscription: { select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } } } },
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sub = store.owner?.subscription;
  const isPremium = sub?.tier === "PREMIUM" && sub.status != null && isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);
  if (!isPremium) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shortName = store.name.length > 14 ? store.name.slice(0, 14).trimEnd() + "…" : store.name;

  const icons = store.logo
    ? [
        { src: store.logo, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: store.logo, sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: store.logo, sizes: "180x180", type: "image/png", purpose: "any" },
      ]
    : [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }];

  const effectiveLogoColor = (() => {
    const c = store.logoColor;
    if (!c) return null;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 40 ? null : c;
  })();
  const splashColor = effectiveLogoColor || store.primaryColor || "#6366f1";

  const manifest = {
    name: store.name,
    short_name: shortName,
    description:
      store.description || store.tagline || `Tienda online de ${store.name}`,
    start_url: `/tienda/${slug}?source=pwa`,
    scope: `/tienda/${slug}`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: splashColor,
    theme_color: splashColor,
    icons,
    categories: ["shopping"],
    lang: "es-AR",
    dir: "ltr",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
