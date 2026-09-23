import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-log";
import { revalidatePath } from "next/cache";
import { getClientIp } from "@/lib/request-ip";
import { periodFor, getSubscriptionStatus, caidaAFree } from "@/lib/subscription";
import { createNotification } from "@/lib/notifications";
import {
  myActiveCouponsWhere,
  livePromotionsWhere,
  PRO_MAX_ACTIVE_COUPONS,
  PRO_MAX_LIVE_PROMOTIONS,
  PRO_MAX_AFFILIATES,
  planesDelEcosistema,
  tierDelMismoEcosistema,
  COMISION_DIGITAL,
  type DefinicionPlan,
} from "@/lib/planLimits";
import type { TierDigital } from "@/lib/planes-digitales";

const VALID_STATUSES = ["TRIAL", "ACTIVE", "GRACE", "EXPIRED", "CANCELLED"];

/**
 * Cuánto tiene cargado esta tienda de lo que el plan Pro limita.
 *
 * Sirve para que el admin no baje de plan a ciegas: bajar a Pro a alguien con 30
 * cupones no rompe nada —los existentes siguen andando y no puede crear más— pero
 * es una sorpresa evitable si se ve el número antes de apretar.
 *
 * Se cuenta con las mismas condiciones que aplican los topes (planLimits), no con
 * un count crudo: si acá contara distinto, el aviso diría un número y el sistema
 * después haría cumplir otro.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId } = await params;
  const store = await prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!store) return NextResponse.json({ uso: null });

  const [cupones, promociones, afiliados] = await Promise.all([
    prisma.coupon.count({ where: myActiveCouponsWhere(store.id) }),
    prisma.storePromotion.count({ where: livePromotionsWhere(store.id) }),
    prisma.affiliate.count({ where: { ownerId: userId, status: "APPROVED", isActive: true } }),
  ]);

  return NextResponse.json({
    uso: { cupones, promociones, afiliados },
    topesPro: {
      cupones: PRO_MAX_ACTIVE_COUPONS,
      promociones: PRO_MAX_LIVE_PROMOTIONS,
      afiliados: PRO_MAX_AFFILIATES,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId } = await params;
  const { status, extendDays, tier, plan } = await req.json();

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return NextResponse.json({ error: "Sin suscripción" }, { status: 404 });

  if (sub.role === "AFFILIATE") {
    return NextResponse.json(
      { error: "Las cuentas de afiliado son gratuitas, no tienen suscripción para gestionar" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};

  if (status && VALID_STATUSES.includes(status)) {
    data.status = status;
    // Un cambio de estado desde el panel es explícito y manda: se limpia el
    // "no renovar" que pudo dejar un cierre de tienda anterior. Sin esto,
    // cancelar a alguien que ya había cerrado su tienda no hacía nada —la marca
    // sobrevivía y `getSubscriptionStatus` la seguía leyendo como ACTIVE hasta
    // el vencimiento—, o sea que el botón Cancelar mentía.
    data.cancelAtPeriodEnd = false;
  }

  if (typeof extendDays === "number" && extendDays > 0) {
    const base = sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    data.trialEndsAt = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000);
    data.status = "TRIAL";
    data.cancelAtPeriodEnd = false;
  }

  // ⚠️ EL TIER SE VALIDA CONTRA EL ECOSISTEMA DE ESTA SUSCRIPCIÓN, NO CONTRA UNA
  // LISTA ESCRITA ACÁ.
  //
  // Antes este bloque aceptaba los dos tiers de tienda y de paso escribía el rol
  // de dueña. Eso fue correcto mientras el único producto con planes fue la
  // tienda; con Productos Digitales pasó a ser una puerta: mandarle el tier
  // grande de tienda a una cuenta digital la CONVERTÍA en una tienda —hay una
  // sola suscripción por persona, así que no se le agrega nada, se le reemplaza
  // lo que tenía—. Cambiaba de panel, perdía su plan y el cron empezaba a
  // tratarla con las reglas del otro producto.
  //
  // Ahora el tier sale de `PLANES` filtrado por el ecosistema que la cuenta ya
  // tiene, o no sale. Ver `tierDelMismoEcosistema`.
  let destino: DefinicionPlan | null = null;
  if (tier !== undefined && tier !== null) {
    destino = tierDelMismoEcosistema(sub, tier);
    if (!destino) {
      return NextResponse.json(
        { error: "Ese plan no es de este producto. Una cuenta no se muda de producto cambiándole el plan." },
        { status: 400 }
      );
    }
    data.tier = destino.tier;
    /* El mismo rol que ya tenía —salió de su propio ecosistema—, escrito
       igual: deja normalizada cualquier fila vieja sin poder mudarla. */
    data.role = destino.role;
  }

  if (plan === "MONTHLY" || plan === "ANNUAL") {
    data.plan = plan;
  }

  // `plan` sin fecha es media verdad: define cuánto dura el período, así que el
  // vencimiento tiene que recalcularse con él. Antes esto escribía solo la
  // etiqueta y "Activar ahora" ni siquiera tocaba la fecha, dejando ACTIVE sin
  // vencimiento. Se reprograma el período —igual que un pago real— cuando se
  // activa la suscripción o cuando cambia la facturación de una activa.
  const effectivePlan = (data.plan as string) ?? sub.plan;
  const activating = data.status === "ACTIVE";
  const rebilling = data.plan !== undefined && (data.status ?? sub.status) === "ACTIVE";

  if (activating || rebilling) {
    Object.assign(data, periodFor(effectivePlan));
    data.status = "ACTIVE";
  }

  /* ⚠️ LO DE FREE VA AL FINAL, Y NO ES ORDEN: ES QUE TIENE LA ÚLTIMA PALABRA.
     En digitales, Free no es un plan con vencimiento: es dónde queda la cuenta
     cuando no paga. `caidaAFree` apaga el período y anota la fecha de la caída
     —la lee el cron para soltar el dominio propio de quien lleva mucho sin
     Pro—. Puesto más arriba, el bloque de acá encima le volvía a escribir un
     período a una cuenta que por definición no tiene ninguno.
     Y al revés: quien sube a un plan pago dejó de estar cayendo, así que la
     fecha se borra y su dominio no se suelta. Es lo mismo que hacen el alta
     con prueba y el cron; acá sólo se repite el criterio, no se inventa otro. */
  // El `!==` importa: sólo es una caída si el plan CAMBIA. Volver a apretar
  // "Free" en una cuenta que ya está en Free le reescribiría la fecha de la
  // caída con la de hoy, y eso corre para adelante el día en que el cron le
  // suelta el dominio propio. Un botón que no cambia nada no puede regalar
  // tiempo sin que nadie se entere.
  if (destino?.ecosistema === "DIGITAL" && destino.tier !== sub.tier) {
    if (destino.tier === "FREE") Object.assign(data, caidaAFree());
    else data.freeDesde = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios válidos" }, { status: 400 });
  }

  const updated = await prisma.subscription.update({ where: { userId }, data });

  // Avisarle a la dueña que le cambiaron el plan. Es un cambio que le hicimos
  // nosotros a su cuenta y que le cambia lo que puede hacer: sin aviso, se entera
  // recién cuando algo deja de funcionarle. Solo cuando el tier cambia de verdad
  // —tocar el estado o extender el trial no altera qué funciones tiene—.
  if (destino && destino.tier !== sub.tier) {
    /* Subir o bajar sale del ORDEN de la tabla de planes, no de comparar el
       nombre del tier: con tres ecosistemas, "PREMIUM es arriba" era una regla
       que sólo valía para uno. Un tier viejo que ningún plan define queda en
       -1, o sea abajo de todo, que es lo que corresponde: una fila así no
       tiene funciones de ninguna parte. */
    const escalera = planesDelEcosistema(destino.ecosistema);
    const puesto = (t: string) => escalera.findIndex((p) => p.tier === t);
    const subio = puesto(destino.tier) > puesto(sub.tier);
    const esDigital = destino.ecosistema === "DIGITAL";

    /* Lo que SIEMPRE cambia en digitales es la comisión, así que eso es lo que
       dice el aviso. Las funciones de cada plan se mueven; el porcentaje que
       se le descuenta de cada venta es lo que la persona necesita saber hoy, y
       sale del mismo lugar del que lo toma el cobro. */
    const comision = esDigital ? COMISION_DIGITAL[destino.tier as TierDigital] : 0;

    await createNotification({
      userId,
      type: subio ? "PLAN_UPGRADED" : "PLAN_DOWNGRADED",
      title: `Tu plan pasó a ${destino.label}`,
      body: esDigital
        ? subio
          ? `Ya lo tenés activo. La comisión de tus ventas pasa a ser del ${comision}%.`
          : `Tus productos, tus ventas y tus clientes siguen donde estaban. La comisión de tus ventas pasa a ser del ${comision}%, y las funciones del plan anterior quedan apagadas.`
        : destino.tier === "PREMIUM"
          ? "Ya tenés cupones, promociones y afiliados sin límite, notificaciones, dominio propio y tu tienda instalable como app."
          : `Tienda Pro incluye hasta ${PRO_MAX_ACTIVE_COUPONS} cupones, ${PRO_MAX_LIVE_PROMOTIONS} promociones y ${PRO_MAX_AFFILIATES} afiliados. Lo que ya tenías creado sigue funcionando.`,
      link: esDigital ? "/digitales/mi-cuenta" : "/dashboard/mi-plan",
    });
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/mi-plan");
  /* El panel de digitales también: es la otra pantalla que cambia sola cuando
     acá se toca un plan, y sin esto la persona seguía viendo el anterior. */
  revalidatePath("/digitales", "layout");
  revalidatePath("/digitales/mi-cuenta");
  revalidatePath("/admin/usuarios");

  const actions: string[] = [];
  if (data.status) actions.push(`CHANGE_STATUS:${data.status}`);
  if (data.tier) actions.push(`CHANGE_TIER:${data.tier}`);
  if (data.plan) actions.push(`CHANGE_PLAN:${data.plan}`);
  if (data.trialEndsAt) actions.push("EXTEND_TRIAL");

  await logAdminAction({
    adminId: current.id,
    adminEmail: current.email,
    action: actions.join("|") || "CHANGE_STATUS",
    targetId: userId,
    targetType: "SUBSCRIPTION",
    details: {
      before: { status: sub.status, tier: sub.tier, plan: sub.plan, role: sub.role },
      after: data,
    },
    ip: getClientIp(req),
  });

  // statusReal para que el panel refresque el estado sin recargar: el modal
  // muestra el estado vivo (getSubscriptionStatus), no el crudo de la columna.
  return NextResponse.json({ ...updated, statusReal: getSubscriptionStatus(updated) });
}
