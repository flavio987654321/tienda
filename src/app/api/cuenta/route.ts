import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNotificationMany } from "@/lib/notifications";
import { getClosureBlockers, getAffiliateOwnBalance, isBlocked } from "@/lib/store-closure";

// ── helpers de storage ────────────────────────────────────────────────────────

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

// ── GET — devuelve bloqueadores, rol y valor de confirmación ─────────────────

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const target = new URL(req.url).searchParams.get("target");

  // Para reset de diseño no hay bloqueadores — solo necesitamos el nombre de la tienda
  if (target === "store") {
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { name: true },
    });
    return NextResponse.json({
      role: user.role,
      email: user.email,
      storeName: store?.name ?? "",
      pendingOrders: 0,
      pendingBalances: 0,
    });
  }

  if (user.role === "OWNER") {
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true, name: true },
    });

    const blockers = store
      ? await getClosureBlockers(prisma, store.id)
      : { pendingOrders: 0, pendingBalances: 0 };

    return NextResponse.json({
      role: user.role,
      email: user.email,
      storeName: store?.name ?? "",
      ...blockers,
    });
  }

  // Afiliada (u otro rol sin tienda): el saldo a revisar es el propio, en cada tienda donde está afiliada
  const pendingBalances = await getAffiliateOwnBalance(prisma, user.id);

  return NextResponse.json({
    role: user.role,
    email: user.email,
    storeName: "",
    pendingOrders: 0,
    pendingBalances,
  });
}

// ── DELETE — elimina tienda y/o cuenta ───────────────────────────────────────
//
// Estrategia: anonimizar en lugar de borrar.
// Los registros fiscales (órdenes, pagos, comisiones) quedan anonimizados
// para cumplimiento de AFIP y Ley 24.240.
// Las aceptaciones de T&C se preservan en DeletedAccountAudit.
// Supabase Auth se elimina para liberar el email y permitir re-registro.

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { target, confirm } = await req.json() as { target: "store" | "account"; confirm: string };

  if (!["store", "account"].includes(target)) {
    return NextResponse.json({ error: "Target inválido" }, { status: 400 });
  }

  const isOwner = user.role === "OWNER";

  // ── Validar confirmación según rol ───────────────────────────────────────
  if (isOwner) {
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { name: true },
    });
    if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    if (confirm !== store.name) {
      return NextResponse.json({ error: "El nombre ingresado no coincide con el de tu tienda" }, { status: 400 });
    }
  } else {
    // BUYER / SELLER confirman con su email
    if (confirm !== user.email) {
      return NextResponse.json({ error: "El email ingresado no es correcto" }, { status: 400 });
    }
    // No-owners solo pueden eliminar su cuenta, no una tienda
    if (target === "store") {
      return NextResponse.json({ error: "No tenés una tienda para eliminar" }, { status: 400 });
    }
  }

  // ── Para OWNER eliminando cuenta: verificar bloqueadores ────────────────
  if (isOwner && target === "account") {
    const storeData = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true, name: true, affiliates: { where: { isActive: true }, select: { userId: true } } },
    });

    if (storeData) {
      const blockers = await getClosureBlockers(prisma, storeData.id);
      if (isBlocked(blockers)) {
        return NextResponse.json({ error: "Bloqueado", ...blockers }, { status: 409 });
      }

      // Notificar a afiliados activos
      const affiliateUserIds = storeData.affiliates.map(a => a.userId);
      if (affiliateUserIds.length > 0) {
        await createNotificationMany(
          affiliateUserIds.map(userId => ({
            userId,
            type: "STORE_CLOSED",
            title: `${storeData.name} cerró su tienda`,
            body: "Tu link de afiliado fue desactivado. Los saldos ya acreditados en tu panel de comisiones siguen disponibles para retirar.",
            link: "/afiliados",
          }))
        );
      }
    }
  }

  // ── Para afiliada eliminando su cuenta: verificar saldo pendiente propio ──
  if (!isOwner && target === "account") {
    const pendingBalances = await getAffiliateOwnBalance(prisma, user.id);
    if (pendingBalances > 0) {
      return NextResponse.json({ error: "Bloqueado", pendingOrders: 0, pendingBalances }, { status: 409 });
    }
  }

  // ── Recolectar archivos ANTES de modificar la BD ─────────────────────────
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      subscription: true,
      termsAcceptedAt: true,
      termsVersion: true,
      termsAcceptedIp: true,
      store: {
        select: {
          id: true,
          logo: true,
          banner: true,
          tcOwnerAcceptedAt: true,
          tcOwnerVersion: true,
          tcOwnerAcceptedIp: true,
          products: { select: { images: true, reelUrls: true } },
        },
      },
      asAffiliate: {
        select: {
          id: true,
          cvUrl: true,
          tcAcceptedAt: true,
          tcVersion: true,
          tcAcceptedIp: true,
          ownerId: true,
          store: { select: { name: true } },
        },
      },
    },
  });

  // Solo recolectar archivos si se elimina cuenta completa
  const allFileUrls: (string | null | undefined)[] = target === "account" ? [
    userData?.image,
    userData?.store?.logo,
    userData?.store?.banner,
    ...(userData?.store?.products.flatMap(p => [
      ...parseJsonUrls(p.images),
      ...parseJsonUrls(p.reelUrls),
    ]) ?? []),
    ...(userData?.asAffiliate.map(a => a.cvUrl) ?? []),
  ] : [];

  const affiliateTc = userData?.asAffiliate.find(a => a.tcAcceptedAt);

  // ── Transacción principal ─────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    if (isOwner && userData?.store) {
      const storeId = userData.store.id;

      // Desactivar afiliados de la tienda
      await tx.affiliate.updateMany({
        where: { storeId, isActive: true },
        data: { isActive: false, status: "REMOVED" },
      });

      if (target === "account") {
        // Anonimizar productos
        const productIds = (await tx.product.findMany({ where: { storeId }, select: { id: true } })).map(p => p.id);
        if (productIds.length) {
          await tx.product.updateMany({
            where: { id: { in: productIds } },
            data: { name: "Producto eliminado", description: null, images: "[]", reelUrls: "[]" },
          });
        }

        // Nullificar couponId en órdenes antes de borrar cupones
        const couponIds = (await tx.coupon.findMany({ where: { storeId }, select: { id: true } })).map(c => c.id);
        if (couponIds.length) {
          await tx.order.updateMany({ where: { couponId: { in: couponIds } }, data: { couponId: null } });
          await tx.coupon.deleteMany({ where: { storeId } });
        }

        // Anonimizar tienda
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
      } else {
        // Solo resetea el diseño: template y bloques de página
        // Productos, afiliados, pedidos y configuración base quedan intactos
        await tx.store.update({
          where: { id: storeId },
          data: { storeConfig: "{}", pageBlocks: "[]" },
        });
      }
    }

    if (target === "account") {
      // Audit log legal
      await tx.deletedAccountAudit.create({
        data: {
          deletedByAdminId: user.id, // self-deletion
          originalUserId: user.id,
          originalEmail: userData?.email ?? null,
          originalName: userData?.name ?? null,
          accountType: user.role,
          accountCreatedAt: userData?.createdAt ?? new Date(),
          generalTermsAcceptedAt: userData?.termsAcceptedAt ?? null,
          generalTermsVersion: userData?.termsVersion ?? null,
          generalTermsAcceptedIp: userData?.termsAcceptedIp ?? null,
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

      // Anonimizar usuario
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `deleted-${user.id}@deleted.invalid`,
          name: null,
          image: null,
          bio: null,
          phone: null,
          city: null,
          instagramHandle: null,
          password: null,
          banned: true,
        },
      });

      // Anonimizar shippingAddress en pedidos como comprador
      const buyerOrderIds = (await tx.order.findMany({ where: { buyerId: user.id }, select: { id: true } })).map(o => o.id);
      if (buyerOrderIds.length) {
        await tx.order.updateMany({
          where: { id: { in: buyerOrderIds } },
          data: { shippingAddress: JSON.stringify({ anonymized: true }) },
        });
      }

      // Null out cvUrl y T&C en afiliaciones a otras tiendas, y desactivarlas (ya no puede operar como afiliada)
      await tx.affiliate.updateMany({
        where: { userId: user.id },
        data: { cvUrl: null, tcAcceptedAt: null, tcVersion: null, tcAcceptedIp: null, isActive: false, status: "REMOVED" },
      });

      // Eliminar datos sin valor fiscal
      await tx.favorite.deleteMany({ where: { userId: user.id } });
      await tx.review.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.account.deleteMany({ where: { userId: user.id } });
      await tx.affiliateRewardCoupon.deleteMany({ where: { userId: user.id } });
      await tx.subscription.deleteMany({ where: { userId: user.id } });
    }
  }, { timeout: 30_000 });

  // Si era afiliada, avisar a los dueños de las tiendas donde estaba afiliada
  if (!isOwner && target === "account" && userData?.asAffiliate.length) {
    const affiliateName = userData.name ?? userData.email;
    await createNotificationMany(
      userData.asAffiliate.map((a) => ({
        userId: a.ownerId,
        type: "AFFILIATE_LEFT",
        title: `Tu afiliada ${affiliateName} eliminó su cuenta`,
        body: `La cuenta de tu afiliada en ${a.store.name} fue eliminada. Su link de afiliado dejó de funcionar.`,
        link: "/dashboard/vendedoras",
      }))
    );
  }

  // ── Eliminar de Supabase Auth — libera email para re-registro ─────────────
  if (target === "account") {
    const supabase = createSupabaseAdminClient();

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error("DELETE CUENTA: error eliminando de Supabase Auth", user.id, authDeleteError.message);
    }

    // Borrar archivos de Storage (best-effort)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    if (supabaseUrl) {
      const paths = extractStoragePaths(allFileUrls, supabaseUrl, bucket);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
        if (storageError) {
          console.error("DELETE CUENTA: error eliminando archivos de storage", storageError.message);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, target });
}
