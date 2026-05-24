import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === current.id) {
    return NextResponse.json({ error: "No podés modificar tu propia cuenta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "No podés modificar otra cuenta admin" }, { status: 400 });
  }

  const { banned } = await req.json();

  const user = await prisma.user.update({
    where: { id },
    data: { banned: Boolean(banned) },
    select: { id: true, banned: true },
  });

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: banned ? "BAN" : "UNBAN",
    targetId: id,
    targetType: "USER",
    details: { banned: Boolean(banned) },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
  });

  return NextResponse.json(user);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseJsonUrls(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function extractStoragePaths(urls: (string | null | undefined)[], supabaseUrl: string, bucket: string): string[] {
  const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  return urls
    .filter((u): u is string => !!u && u.startsWith(prefix))
    .map(u => u.slice(prefix.length));
}

// ── DELETE ───────────────────────────────────────────────────────────────────
//
// Estrategia: anonimizar en lugar de borrar.
// Se elimina toda la PII y los archivos, pero los registros fiscales
// (órdenes, pagos, comisiones) quedan anonimizados para cumplimiento de AFIP
// y la Ley 24.240. Las aceptaciones de T&C se preservan en DeletedAccountAudit.
// El email queda libre en Supabase Auth para que el usuario pueda re-registrarse.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === current.id) {
    return NextResponse.json({ error: "No podés eliminar tu propia cuenta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "No podés eliminar otra cuenta admin" }, { status: 400 });
  }

  // ── 1. Recolectar datos ANTES de modificar la BD ──────────────────────────

  const userData = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      subscription: true,
      store: {
        select: {
          id: true,
          slug: true,
          logo: true,
          banner: true,
          tcOwnerAcceptedAt: true,
          tcOwnerVersion: true,
          tcOwnerAcceptedIp: true,
          products: { select: { id: true, images: true, reelUrls: true } },
        },
      },
      asAffiliate: {
        select: {
          id: true,
          cvUrl: true,
          tcAcceptedAt: true,
          tcVersion: true,
          tcAcceptedIp: true,
        },
      },
    },
  });

  const allFileUrls: (string | null | undefined)[] = [
    userData?.image,
    userData?.store?.logo,
    userData?.store?.banner,
    ...(userData?.store?.products.flatMap(p => [
      ...parseJsonUrls(p.images),
      ...parseJsonUrls(p.reelUrls),
    ]) ?? []),
    ...(userData?.asAffiliate.map(a => a.cvUrl) ?? []),
  ];

  // Tomar el primer registro de afiliado para T&C (el más reciente con datos)
  const affiliateTc = userData?.asAffiliate.find(a => a.tcAcceptedAt);

  // ── 2. Transacción: anonimizar y limpiar ──────────────────────────────────

  await prisma.$transaction(async (tx) => {
    // Guardar registro de auditoría legal
    await tx.deletedAccountAudit.create({
      data: {
        deletedByAdminId: current.id,
        originalUserId: id,
        originalEmail: userData?.email ?? null,
        originalName: userData?.name ?? null,
        accountType: userData?.role ?? "BUYER",
        accountCreatedAt: userData?.createdAt ?? new Date(),
        tcOwnerAcceptedAt: userData?.store?.tcOwnerAcceptedAt ?? null,
        tcOwnerVersion: userData?.store?.tcOwnerVersion ?? null,
        tcOwnerAcceptedIp: userData?.store?.tcOwnerAcceptedIp ?? null,
        tcAffiliateAcceptedAt: affiliateTc?.tcAcceptedAt ?? null,
        tcAffiliateVersion: affiliateTc?.tcVersion ?? null,
        tcAffiliateAcceptedIp: affiliateTc?.tcAcceptedIp ?? null,
        subscriptionRole: userData?.subscription?.role ?? null,
        subscriptionPlan: userData?.subscription?.plan ?? null,
        subscriptionStatus: userData?.subscription?.status ?? null,
        subscriptionCreatedAt: userData?.subscription?.createdAt ?? null,
      },
    });

    // Anonimizar usuario — email único cambiado para liberar el original
    await tx.user.update({
      where: { id },
      data: {
        email: `deleted-${id}@deleted.invalid`,
        name: null,
        image: null,
        bio: null,
        city: null,
        phone: null,
        instagramHandle: null,
        password: null,
        banned: true,
      },
    });

    // Anonimizar tienda (si es OWNER) — se preserva para FK de órdenes
    if (userData?.store) {
      const storeId = userData.store.id;

      // Anonimizar contenido de los productos (imágenes ya se borran de Storage)
      if (userData.store.products.length > 0) {
        const productIds = userData.store.products.map(p => p.id);
        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { name: "Producto eliminado", description: null, images: "[]", reelUrls: "[]" },
        });
      }

      // Nullificar couponId en órdenes antes de borrar cupones (FK nullable)
      const couponIds = (
        await tx.coupon.findMany({ where: { storeId }, select: { id: true } })
      ).map(c => c.id);
      if (couponIds.length) {
        await tx.order.updateMany({ where: { couponId: { in: couponIds } }, data: { couponId: null } });
        await tx.coupon.deleteMany({ where: { storeId } });
      }

      // Anonimizar la tienda — slug liberado, PII y contenido eliminados
      await tx.store.update({
        where: { id: storeId },
        data: {
          slug: `deleted-${storeId}`,
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
          tcOwnerAcceptedAt: null,
          tcOwnerAcceptedIp: null,
          tcOwnerVersion: null,
        },
      });
    }

    // Anonimizar shippingAddress en órdenes donde era comprador
    const buyerOrderIds = (
      await tx.order.findMany({ where: { buyerId: id }, select: { id: true } })
    ).map(o => o.id);
    if (buyerOrderIds.length) {
      await tx.order.updateMany({
        where: { id: { in: buyerOrderIds } },
        data: { shippingAddress: JSON.stringify({ anonymized: true }) },
      });
    }

    // Null out cvUrl en afiliaciones a otras tiendas (archivo se borra de Storage)
    if (userData?.asAffiliate.length) {
      await tx.affiliate.updateMany({
        where: { userId: id },
        data: { cvUrl: null, tcAcceptedAt: null, tcVersion: null, tcAcceptedIp: null },
      });
    }

    // Eliminar datos sin valor fiscal ni legal
    await tx.favorite.deleteMany({ where: { userId: id } });
    await tx.review.deleteMany({ where: { userId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.account.deleteMany({ where: { userId: id } });
    await tx.affiliateRewardCoupon.deleteMany({ where: { userId: id } });
    await tx.subscription.deleteMany({ where: { userId: id } });
  }, { timeout: 30_000 });

  // ── 3. Borrar usuario de Supabase Auth — libera el email para re-registro ─
  const supabase = createSupabaseAdminClient();
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
  if (authDeleteError) {
    console.error("DELETE USER: error eliminando de Supabase Auth", id, authDeleteError.message);
  }

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: "DELETE",
    targetId: id,
    targetType: "USER",
    details: {
      originalRole: userData?.role,
      hadStore: !!userData?.store,
      hadSubscription: !!userData?.subscription,
    },
    ip: _req.headers.get("x-forwarded-for") ?? _req.headers.get("x-real-ip"),
  });

  // ── 4. Borrar archivos de Supabase Storage (best-effort) ─────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  if (supabaseUrl) {
    const paths = extractStoragePaths(allFileUrls, supabaseUrl, bucket);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
      if (storageError) {
        console.error("DELETE USER: error eliminando archivos de storage", storageError.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
