import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
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

  return NextResponse.json(user);
}

// ── helpers de storage ───────────────────────────────────────────────────────

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

  // ── 1. Recolectar URLs de archivos ANTES de borrar la BD ─────────────────
  const userData = await prisma.user.findUnique({
    where: { id },
    select: {
      image: true,
      store: {
        select: {
          logo: true,
          banner: true,
          products: { select: { images: true, reelUrls: true } },
        },
      },
      asAffiliate: { select: { cvUrl: true } },
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

  // ── 2. Borrar todo de la BD en una transacción ────────────────────────────
  await prisma.$transaction(async (tx) => {
    // Tienda del usuario (si es OWNER)
    const store = await tx.store.findUnique({ where: { ownerId: id }, select: { id: true } });
    if (store) {
      const storeOrderIds = (
        await tx.order.findMany({ where: { storeId: store.id }, select: { id: true } })
      ).map(o => o.id);

      if (storeOrderIds.length) {
        await tx.review.deleteMany({ where: { orderId: { in: storeOrderIds } } });
        await tx.commission.deleteMany({ where: { orderId: { in: storeOrderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: storeOrderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: storeOrderIds } } });
        await tx.shipping.deleteMany({ where: { orderId: { in: storeOrderIds } } });
        await tx.order.deleteMany({ where: { id: { in: storeOrderIds } } });
      }

      const storeAffiliateIds = (
        await tx.affiliate.findMany({ where: { storeId: store.id }, select: { id: true } })
      ).map(a => a.id);

      if (storeAffiliateIds.length) {
        const walletIds = (
          await tx.wallet.findMany({ where: { affiliateId: { in: storeAffiliateIds } }, select: { id: true } })
        ).map(w => w.id);
        if (walletIds.length) {
          await tx.walletWithdrawal.deleteMany({ where: { walletId: { in: walletIds } } });
          await tx.wallet.deleteMany({ where: { id: { in: walletIds } } });
        }
        await tx.commission.deleteMany({ where: { affiliateId: { in: storeAffiliateIds } } });
        await tx.affiliate.deleteMany({ where: { id: { in: storeAffiliateIds } } });
      }

      const productIds = (
        await tx.product.findMany({ where: { storeId: store.id }, select: { id: true } })
      ).map(p => p.id);
      if (productIds.length) {
        await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } });
      }
    }

    // Pedidos donde el usuario es comprador en tiendas ajenas
    const buyerOrderIds = (
      await tx.order.findMany({ where: { buyerId: id }, select: { id: true } })
    ).map(o => o.id);

    if (buyerOrderIds.length) {
      await tx.review.deleteMany({ where: { orderId: { in: buyerOrderIds } } });
      await tx.commission.deleteMany({ where: { orderId: { in: buyerOrderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: buyerOrderIds } } });
      await tx.payment.deleteMany({ where: { orderId: { in: buyerOrderIds } } });
      await tx.shipping.deleteMany({ where: { orderId: { in: buyerOrderIds } } });
      await tx.order.deleteMany({ where: { id: { in: buyerOrderIds } } });
    }

    // Afiliaciones en tiendas ajenas (el usuario como afiliado)
    const affiliateIds = (
      await tx.affiliate.findMany({ where: { userId: id }, select: { id: true } })
    ).map(a => a.id);

    if (affiliateIds.length) {
      await tx.order.updateMany({ where: { affiliateId: { in: affiliateIds } }, data: { affiliateId: null } });
      const walletIds = (
        await tx.wallet.findMany({ where: { affiliateId: { in: affiliateIds } }, select: { id: true } })
      ).map(w => w.id);
      if (walletIds.length) {
        await tx.walletWithdrawal.deleteMany({ where: { walletId: { in: walletIds } } });
        await tx.wallet.deleteMany({ where: { id: { in: walletIds } } });
      }
      await tx.commission.deleteMany({ where: { affiliateId: { in: affiliateIds } } });
      await tx.affiliate.deleteMany({ where: { id: { in: affiliateIds } } });
    }

    // Eliminar usuario — cascadea: Account, Session, Store→(Products→Variants, Coupons),
    // Subscription, Notification, Favorite, Review, AffiliateRewardCoupon
    await tx.user.delete({ where: { id } });
  }, { timeout: 30_000 });

  // ── 3. Borrar usuario de Supabase Auth (libera el email para re-registro) ─
  const supabase = createSupabaseAdminClient();
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
  if (authDeleteError) {
    console.error("DELETE USER: error eliminando de Supabase Auth", id, authDeleteError.message);
  }

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
