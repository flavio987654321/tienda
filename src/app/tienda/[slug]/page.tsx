import { prisma } from "@/lib/prisma";
import StorefrontTemplateRenderer from "@/components/store/StorefrontTemplateRenderer";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { StoreConfig } from "@/types/store-config";
import { DEFAULT_CONFIG } from "@/types/store-config";
import ComingSoonPage from "./ComingSoonPage";
import OwnerPreviewBadge from "./OwnerPreviewBadge";
import VisitorBackButton from "./VisitorBackButton";
import PwaInstallBanner from "@/components/store/PwaInstallBanner";
import StorePushBanner from "@/components/store/StorePushBanner";
import PwaFadeIn from "@/components/store/PwaFadeIn";
import PWAManager from "@/components/PWAManager";
import { STORE_VERSION } from "@/lib/app-versions";
import { getCurrentUser } from "@/lib/auth-session";
import { isSubscriptionActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
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

  let config: Partial<StoreConfig> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* noop */ }

  const baseName = store.name ?? "Tienda";
  const title = store.isPublished ? baseName : `${baseName} — Próximamente`;
  const description = store.isPublished
    ? (store.description || store.tagline || `Comprá en ${baseName}`)
    : `${baseName} está preparando algo especial. ¡Volvé pronto!`;

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

export default async function TiendaPage({ params }: TiendaPageProps) {
  noStore();
  const { slug } = await params;

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

  let config: StoreConfig;
  try {
    const parsed = JSON.parse(store.storeConfig || "{}");
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
    config = {
      ...DEFAULT_CONFIG,
      ...parsed,
      storeName: store.name,
      storeId: store.id,
      slug,
      tipoTienda: store.tipoTienda ?? "GENERAL",
      tieneVentaMayorista: store.tieneVentaMayorista ?? false,
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
  } catch {
    notFound();
  }

  const splashColor = store.logoColor || store.primaryColor || "#6366f1";

  return (
    <>
      <PWAManager appVersion={STORE_VERSION} versionKey="pwa_store_version" />
      <PwaFadeIn />
      {ownerIsPremium && !isOwner && (
        <PwaInstallBanner
          logo={store.logo ?? null}
          name={store.name ?? "Tienda"}
          color={splashColor}
          slug={slug}
        />
      )}
      {ownerIsPremium && !isOwner && (
        <StorePushBanner storeId={store.id} storeName={store.name ?? "la tienda"} storeSlug={slug} />
      )}
      <StorefrontTemplateRenderer config={config} />
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
