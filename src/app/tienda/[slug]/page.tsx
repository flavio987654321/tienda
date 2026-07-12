import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import StoreShell from "@/components/store/StoreShell";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { StoreConfig } from "@/types/store-config";
import { DEFAULT_CONFIG } from "@/types/store-config";
import ComingSoonPage from "./ComingSoonPage";
import OwnerPreviewBadge from "./OwnerPreviewBadge";
import VisitorBackButton from "./VisitorBackButton";
import PwaInstallBanner from "@/components/store/PwaInstallBanner";
import PwaFadeIn from "@/components/store/PwaFadeIn";
import PWAManager from "@/components/PWAManager";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import { STORE_VERSION } from "@/lib/app-versions";
import { getCurrentUser } from "@/lib/auth-session";
import { isSubscriptionActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pago?: string; orden?: string }>;
};

export async function generateMetadata({ params }: TiendaPageProps): Promise<Metadata> {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true, description: true, logo: true, tagline: true, storeConfig: true, isPublished: true,
      owner: { select: { subscription: { select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } } } },
    },
  });

  if (!store) return {};

  let seo: StoreConfig["seo"] | undefined;
  try {
    seo = (JSON.parse(store.storeConfig || "{}") as Partial<StoreConfig>).seo;
  } catch { /* config inválida, seguir con los valores de la base */ }

  const baseName = store.name ?? "Tienda";
  const customTitle = seo?.enabled ? seo.title?.trim() : "";
  const customDescription = seo?.enabled ? seo.description?.trim() : "";
  const title = !store.isPublished ? `${baseName} — Próximamente` : (customTitle || baseName);
  const description = !store.isPublished
    ? `${baseName} está preparando algo especial. ¡Volvé pronto!`
    : (customDescription || store.description || store.tagline || `Comprá en ${baseName}`);

  const sub = store.owner?.subscription;
  const isPremium = sub?.tier === "PREMIUM" && sub.status != null && isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);

  return {
    title,
    description,
    ...(isPremium ? { manifest: `/api/manifest/${slug}` } : {}),
    openGraph: { title, description, type: "website", siteName: baseName },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TiendaPage({ params, searchParams }: TiendaPageProps) {
  noStore();
  const { slug } = await params;
  const { pago, orden } = await searchParams;

  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        storeConfig: true,
        isPublished: true,
        name: true,
        logo: true,
        logoColor: true,
        primaryColor: true,
        tagline: true,
        tipoTienda: true,
        tieneVentaMayorista: true,
        mpAccessToken: true,
        ownerId: true,
        isVerified: true,
        verifiedShowName: true,
        verifiedShowCity: true,
        verifiedShowPhone: true,
        verifiedShowSince: true,
        owner: {
          select: {
            name: true,
            city: true,
            phone: true,
            createdAt: true,
            subscription: { select: { tier: true } },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!store) notFound();

  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  const ownerIsPremium = store.owner?.subscription?.tier === "PREMIUM";

  if (!store.isPublished && !isOwner) {
    return (
      <ComingSoonPage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
        tagline={store.tagline ?? null}
      />
    );
  }

  const memberSince = store.owner?.createdAt
    ? new Date(store.owner.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;

  // El try/catch solo protege el parseo del JSON — el JSX de ComingSoonPage
  // se construye después, afuera, para que un eventual error de render no
  // quede (falsamente) capturado por este catch.
  let parsed;
  try {
    parsed = JSON.parse(store.storeConfig || "{}");
  } catch {
    notFound();
  }

  if (!parsed?.template) {
    return (
      <ComingSoonPage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
        tagline={store.tagline ?? null}
      />
    );
  }

  const config: StoreConfig = {
    ...DEFAULT_CONFIG,
    ...parsed,
    storeName: store.name,
    storeId: store.id,
    slug,
    tipoTienda: store.tipoTienda ?? "GENERAL",
    tieneVentaMayorista: store.tieneVentaMayorista ?? false,
    hasMercadoPago: !!store.mpAccessToken,
    isOwner,
    isVerified: store.isVerified,
    verifiedInfo: {
      showName: store.verifiedShowName, name: store.owner?.name ?? null,
      showCity: store.verifiedShowCity, city: store.owner?.city ?? null,
      showPhone: store.verifiedShowPhone, phone: store.owner?.phone ?? null,
      showSince: store.verifiedShowSince, memberSince,
    },
    // Solo mostrar el flyer si el dueño tiene Premium
    flyerConfig: ownerIsPremium ? parsed.flyerConfig : undefined,
  };

  const splashColor = store.logoColor || store.primaryColor || "#6366f1";

  // Compra recién confirmada (vuelta de MercadoPago o transferencia con
  // donación) — se recalcula acá el monto y el email del comprador desde la
  // base (nunca se confía en datos de la URL), y se verifica que la orden sea
  // de ESTA tienda, para que no se pueda inflar el Pixel de otra tienda
  // pasando cualquier "orden" ajena en la URL.
  let purchase: { eventId: string; value: number; currency: string; emHash?: string } | undefined;
  if (pago === "ok" && orden) {
    const order = await prisma.order.findFirst({
      where: { id: orden, storeId: store.id },
      select: { total: true, buyer: { select: { email: true } } },
    });
    if (order) {
      const emHash = order.buyer.email
        ? createHash("sha256").update(order.buyer.email.trim().toLowerCase()).digest("hex")
        : undefined;
      purchase = { eventId: orden, value: order.total, currency: config.currency, emHash };
    }
  }

  return (
    <>
      <StoreTrackingScripts
        googleAnalyticsId={config.analytics?.googleAnalyticsId}
        facebookPixelId={config.analytics?.facebookPixelId}
        purchase={purchase}
      />
      <PWAManager appVersion={STORE_VERSION} versionKey="pwa_store_version" disableNotifPrompt />
      <PwaFadeIn />
      {ownerIsPremium && !isOwner && (
        <PwaInstallBanner
          logo={store.logo ?? null}
          name={store.name ?? "Tienda"}
          color={splashColor}
          slug={slug}
        />
      )}
      <StoreShell
        config={{ ...config, showPushBell: ownerIsPremium && !isOwner }}
        storeId={store.id}
        storeName={store.name ?? "la tienda"}
        storeSlug={slug}
        showPushBell={ownerIsPremium && !isOwner}
      />
      {!isOwner && <VisitorBackButton />}
      {!store.isPublished && isOwner && (
        <OwnerPreviewBadge
          name={store.name}
          logo={store.logo ?? null}
          color={store.logoColor || store.primaryColor || "#6366f1"}
          tagline={store.tagline ?? null}
        />
      )}
    </>
  );
}
