import { prisma } from "@/lib/prisma";
import StorefrontTemplateRenderer from "@/components/store/StorefrontTemplateRenderer";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { StoreConfig } from "@/types/store-config";
import { DEFAULT_CONFIG } from "@/types/store-config";
import ComingSoonPage from "./ComingSoonPage";
import OwnerPreviewBadge from "./OwnerPreviewBadge";
import { getCurrentUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TiendaPageProps): Promise<Metadata> {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true, logo: true, tagline: true, storeConfig: true, isPublished: true },
  });

  if (!store) return {};

  let config: Partial<StoreConfig> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* noop */ }

  const baseName = (config.storeName || store.name) ?? "Tienda";
  const title = store.isPublished ? baseName : `${baseName} — Próximamente`;
  const description = store.isPublished
    ? (store.description || store.tagline || `Comprá en ${baseName}`)
    : `${baseName} está preparando algo especial. ¡Volvé pronto!`;

  return {
    title,
    description,
    manifest: `/api/manifest/${slug}`,
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
        owner: { select: { subscription: { select: { tier: true } } } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!store) notFound();

  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  const ownerIsPremium = (store.owner as { subscription?: { tier?: string } } | null)?.subscription?.tier === "PREMIUM";

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

  let config: StoreConfig;
  try {
    const parsed = JSON.parse(store.storeConfig || "{}");
    if (!parsed?.template) notFound();
    config = {
      ...DEFAULT_CONFIG,
      ...parsed,
      storeId: store.id,
      slug,
      tipoTienda: store.tipoTienda ?? "GENERAL",
      tieneVentaMayorista: store.tieneVentaMayorista ?? false,
      isOwner,
      // Solo mostrar el flyer si el dueño tiene Premium
      flyerConfig: ownerIsPremium ? parsed.flyerConfig : undefined,
    };
  } catch {
    notFound();
  }

  return (
    <>
      <StorefrontTemplateRenderer config={config} />
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
