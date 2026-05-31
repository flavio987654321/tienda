import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, boolean> = {};
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const store = await prisma.store.update({
    where: { id },
    data,
    select: { id: true, isPublished: true, isActive: true },
  });

  const action = data.isPublished !== undefined
    ? (data.isPublished ? "PUBLISH_STORE" : "UNPUBLISH_STORE")
    : (data.isActive ? "ACTIVATE_STORE" : "DEACTIVATE_STORE");

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action,
    targetId: id,
    targetType: "STORE",
    details: data as Record<string, unknown>,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json(store);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { confirmSlug } = await req.json() as { confirmSlug: string };

  if (!confirmSlug || typeof confirmSlug !== "string" || confirmSlug.trim().length === 0) {
    return NextResponse.json({ error: "Confirmación requerida" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      ownerId: true,
      products: { select: { images: true, reelUrls: true } },
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  if (store.slug.startsWith("deleted-")) {
    return NextResponse.json({ error: "La tienda ya está eliminada" }, { status: 409 });
  }

  if (confirmSlug.trim() !== store.slug) {
    return NextResponse.json({ error: "El slug ingresado no coincide" }, { status: 400 });
  }

  const deletedSlug = `deleted-${Date.now()}-${store.slug}`;

  await prisma.$transaction(async (tx) => {
    // Desactivar afiliados
    await tx.affiliate.updateMany({
      where: { storeId: id, isActive: true },
      data: { isActive: false, status: "REMOVED" },
    });

    // Anonimizar productos
    const productIds = (await tx.product.findMany({ where: { storeId: id }, select: { id: true } })).map(p => p.id);
    if (productIds.length) {
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { name: "Producto eliminado", description: null, images: "[]", reelUrls: "[]" },
      });
    }

    // Nullificar cupones en órdenes antes de borrarlos
    const couponIds = (await tx.coupon.findMany({ where: { storeId: id }, select: { id: true } })).map(c => c.id);
    if (couponIds.length) {
      await tx.order.updateMany({ where: { couponId: { in: couponIds } }, data: { couponId: null } });
      await tx.coupon.deleteMany({ where: { storeId: id } });
    }

    // Soft-delete de la tienda
    await tx.store.update({
      where: { id },
      data: {
        slug: deletedSlug,
        customDomain: null,
        name: "Tienda eliminada",
        description: null,
        logo: null,
        banner: null,
        tagline: null,
        announcementBar: null,
        whatsappNumber: null,
        instagramUrl: null,
        facebookUrl: null,
        tiktokUrl: null,
        footerText: null,
        footerDescription: null,
        seoTitle: null,
        seoDescription: null,
        policyReturns: null,
        policyShipping: null,
        policyTerms: null,
        pageBlocks: "[]",
        navLinks: "[]",
        isActive: false,
        isPublished: false,
      },
    });

    // Degradar al dueño de OWNER a BUYER
    await tx.user.update({
      where: { id: store.ownerId },
      data: { role: "BUYER" },
    });
  }, { timeout: 20_000 });

  // Borrar archivos de Storage (best-effort)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    if (supabaseUrl) {
      const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
      const paths = store.products
        .flatMap(p => {
          const imgs: string[] = (() => { try { return JSON.parse(p.images); } catch { return []; } })();
          const reels: string[] = (() => { try { return JSON.parse(p.reelUrls); } catch { return []; } })();
          return [...imgs, ...reels];
        })
        .filter((u): u is string => typeof u === "string" && u.startsWith(prefix))
        .map(u => u.slice(prefix.length));
      if (paths.length) {
        const supabase = createSupabaseAdminClient();
        await supabase.storage.from(bucket).remove(paths);
      }
    }
  } catch (e) {
    console.error("[admin/tiendas DELETE] Error borrando archivos:", e);
  }

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: "DELETE_STORE",
    targetId: id,
    targetType: "STORE",
    details: { originalSlug: store.slug, deletedSlug, storeName: store.name },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json({ ok: true, deletedSlug });
}
