import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { createNotificationMany } from "@/lib/notifications";
import { getClientIp } from "@/lib/request-ip";
import { getClosureBlockers, isBlocked } from "@/lib/store-closure";

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
  const isBanned = Boolean(banned);

  const user = await prisma.user.update({
    where: { id },
    data: { banned: isBanned },
    select: { id: true, banned: true, name: true, email: true },
  });

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: isBanned ? "BAN" : "UNBAN",
    targetId: id,
    targetType: "USER",
    details: { banned: isBanned },
    ip: getClientIp(req),
  });

  // Si la cuenta afectada es afiliado, avisar a los dueños de las tiendas donde está afiliado
  if (target.role === "SELLER") {
    const affiliations = await prisma.affiliate.findMany({
      where: { userId: id },
      select: { ownerId: true, store: { select: { name: true } } },
    });
    const affiliateName = user.name ?? user.email;
    await createNotificationMany(
      affiliations.map((a) => ({
        userId: a.ownerId,
        type: isBanned ? "AFFILIATE_ADMIN_BANNED" : "AFFILIATE_ADMIN_UNBANNED",
        title: isBanned
          ? `Tu afiliado ${affiliateName} fue suspendida por TiendaApps`
          : `Tu afiliado ${affiliateName} fue reactivada por TiendaApps`,
        body: isBanned
          ? `El equipo de TiendaApps suspendió la cuenta de tu afiliado en ${a.store.name}. Su link de afiliado dejó de funcionar.`
          : `El equipo de TiendaApps reactivó la cuenta de tu afiliado en ${a.store.name}.`,
        link: "/dashboard/vendedoras",
      }))
    );
  }

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
  req: NextRequest,
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

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "No podés eliminar otra cuenta admin" }, { status: 400 });
  }

  // El modal pide tipear el email, pero hasta ahora esta ruta ni leía el body: la
  // confirmación era puro teatro y un fetch directo borraba la cuenta sin más. El
  // endpoint de la dueña sí valida server-side; éste ahora también.
  const body = await req.json().catch(() => ({}));
  const { confirm } = body as { confirm?: unknown };
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== target.email.toLowerCase()) {
    return NextResponse.json(
      { error: "El email ingresado no coincide con el de la cuenta" },
      { status: 400 }
    );
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
      termsAcceptedAt: true,
      termsVersion: true,
      termsAcceptedIp: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          banner: true,
          tcOwnerAcceptedAt: true,
          tcOwnerVersion: true,
          tcOwnerAcceptedIp: true,
          products: { select: { id: true, images: true, reelUrls: true } },
          // Para avisarles antes de desactivarlas: después del update ya no son
          // isActive y no habría a quién notificar.
          affiliates: { where: { isActive: true }, select: { userId: true } },
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
          wallet: { select: { balance: true } },
        },
      },
    },
  });

  // No se puede eliminar (de forma irreversible) un afiliado con saldo pendiente en su
  // panel de comisiones: esa plata quedaría huérfana, sin forma de cobrarse ni rastro de qué pasó con ella.
  const affiliationsWithBalance = (userData?.asAffiliate ?? []).filter(
    (a) => (a.wallet?.balance ?? 0) > 0
  );
  if (affiliationsWithBalance.length > 0) {
    const detail = affiliationsWithBalance
      .map((a) => `${a.store.name}: $${(a.wallet?.balance ?? 0).toLocaleString("es-AR")}`)
      .join(", ");
    return NextResponse.json(
      {
        error: `No se puede eliminar: la cuenta tiene saldo pendiente en su panel de comisiones (${detail}). Liquidá el saldo con el/la dueño/a de la tienda antes de eliminar la cuenta.`,
      },
      { status: 400 }
    );
  }

  // Si es dueña de tienda, los mismos bloqueadores que se aplica ella a sí misma
  // desde su panel. Antes esta ruta no los tenía, así que desde el admin se podía
  // borrar una cuenta con pedidos en curso (dejando compradores esperando algo que
  // ya no va a llegar) y debiéndole comisiones a sus afiliados (dejando esa plata
  // huérfana) — cosas que su propia dueña no puede hacer. Mismo helper, así no se
  // vuelven a desincronizar.
  if (userData?.store) {
    const blockers = await getClosureBlockers(prisma, userData.store.id);
    if (isBlocked(blockers)) {
      const partes: string[] = [];
      if (blockers.pendingOrders > 0) {
        partes.push(`${blockers.pendingOrders} pedido${blockers.pendingOrders !== 1 ? "s" : ""} en curso`);
      }
      if (blockers.pendingBalances > 0) {
        partes.push(`$${blockers.pendingBalances.toLocaleString("es-AR")} sin pagar a sus afiliados`);
      }
      return NextResponse.json(
        {
          error: `No se puede eliminar: la tienda tiene ${partes.join(" y ")}. Hay que resolver eso antes de borrar la cuenta.`,
          ...blockers,
        },
        { status: 409 }
      );
    }
  }

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
    ip: getClientIp(req),
  });

  // Si era afiliado, avisar a los dueños de las tiendas donde estaba afiliado
  if (userData?.role === "SELLER" && userData.asAffiliate.length > 0) {
    const affiliateName = userData.name ?? userData.email;
    await createNotificationMany(
      userData.asAffiliate.map((a) => ({
        userId: a.ownerId,
        type: "AFFILIATE_ADMIN_DELETED",
        title: `Tu afiliado ${affiliateName} eliminó su cuenta`,
        body: `La cuenta de tu afiliado en ${a.store.name} fue eliminada. Su link de afiliado dejó de funcionar.`,
        link: "/dashboard/vendedoras",
      }))
    );
  }

  // Si era dueña de tienda, avisarle a SUS afiliados que la tienda ya no existe.
  // Antes esta ruta solo notificaba cuando la borrada era un afiliado: si el
  // admin borraba a una dueña, sus afiliados se quedaban con un link muerto y sin
  // enterarse. El endpoint de la propia dueña sí las avisa (STORE_CLOSED).
  const ownStoreAffiliates = userData?.store?.affiliates ?? [];
  if (ownStoreAffiliates.length > 0 && userData?.store) {
    await createNotificationMany(
      ownStoreAffiliates.map((a) => ({
        userId: a.userId,
        type: "STORE_CLOSED",
        title: `${userData.store!.name} cerró su tienda`,
        body: "Tu link de afiliado fue desactivado. Los saldos ya acreditados en tu panel de comisiones siguen disponibles para retirar.",
        link: "/afiliados",
      }))
    );
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
