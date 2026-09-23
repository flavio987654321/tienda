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
  ecosistemaDeRol,
  COMISION_DIGITAL,
  type DefinicionPlan,
} from "@/lib/planLimits";
import type { TierDigital } from "@/lib/planes-digitales";
import { despublicarLasDeMas } from "@/lib/caida-a-free";

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

  // ⚠️ EN DIGITALES EL PLAN NO SE VENCE NI SE CANCELA: SE BAJA A FREE.
  //
  // Y no es una diferencia de nombre, son dos hechos del sistema:
  //
  //   1. El panel de Productos Digitales decide qué funciones prender mirando
  //      SÓLO el tier (`digitales/layout`), sin el estado. Con el tier en Pro,
  //      la cuenta tiene Pro, diga lo que diga el estado.
  //   2. El cron revisa las digitales en ACTIVE, TRIAL o GRACE. Una que quede
  //      guardada en EXPIRED o en CANCELLED no entra en esa consulta, así que
  //      no la mira nunca más.
  //
  // Juntas dan lo mismo en los dos casos: el plan más caro, gratis, para
  // siempre, sin nada en el sistema que lo corrija. Y ninguno de los dos
  // estados lo produce nada de digitales —ni el cron, que en vez de dejarlas
  // vencidas las baja a Free; ni el pago; ni cerrar la cuenta, que ni toca la
  // suscripción—: sólo podían llegar desde estos botones.
  //
  // Lo que el admin quiere hacer con ellos —sacarle el plan pago— es bajarla a
  // Free, y eso sí está: apaga las funciones, sube la comisión, apaga las
  // páginas de más y deja la cuenta donde el cron la sigue viendo.
  const ESTADOS_QUE_ESTACIONAN = ["EXPIRED", "CANCELLED"];
  if (ecosistemaDeRol(sub.role) === "DIGITAL" && ESTADOS_QUE_ESTACIONAN.includes(status)) {
    return NextResponse.json(
      { error: "En Productos Digitales el plan no se vence ni se cancela desde acá: se baja a Free. Dejarla así le deja el plan pago prendido y sin nada que lo corrija." },
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

  // ⚠️ SUBIR DESDE FREE ES UNA ACTIVACIÓN, aunque el pedido no diga "activar".
  //
  // Free no tiene período: `caidaAFree` lo deja en null a propósito. Entonces
  // darle Starter o Pro escribiendo sólo el tier dejaba la cuenta con un plan
  // pago y `currentPeriodEnd` en null, y eso NO es un estado raro pero
  // inofensivo: `getSubscriptionStatus` lo lee como EXPIRED —un plan que se
  // cobra y no tiene vencimiento no lo pudo producir ningún pago— y esa misma
  // noche el cron la devolvía a Free.
  //
  // O sea: el admin le daba Pro, la persona lo veía, y al día siguiente ya no
  // lo tenía. Sin ningún error en el medio.
  const subeDesdeFree =
    destino?.ecosistema === "DIGITAL" && sub.tier === "FREE" && destino.tier !== "FREE";

  if (activating || rebilling || subeDesdeFree) {
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

  /* ══════════════════════════════════════════════════════════════════════
     LAS PÁGINAS DE MÁS SE APAGAN, IGUAL QUE CUANDO CAE SOLA
     ══════════════════════════════════════════════════════════════════════

     Bajar de plan a mano dejaba publicadas las páginas que el plan nuevo ya no
     permite: una cuenta que tenía Pro con cinco páginas quedaba con las cinco
     prendidas en Free. Y la fila quedaba ACTIVE/FREE, que es justo lo que el
     cron NO vuelve a mirar —él sólo agarra las que se le vencen—, así que eso
     no se arreglaba nunca. Era el plan de arriba gratis para siempre.

     Se llama a la MISMA función que usan el cron y la reapertura, no a una
     copia: lo que se apaga primero (lo que menos vendió) y lo que se respeta
     es una decisión que ya está tomada en `caida-a-free`.

     ⚠️ Se corre SIEMPRE que se escriba un tier digital, y no sólo cuando baja.
     Es idempotente —si nada pasa el tope, no toca nada— y así se arregla sola
     la cuenta que quedó a medias por un error en el medio. Con un `if` de
     "sólo cuando baja", reintentar después de una falla ya no hacía nada: el
     tier ya estaba escrito y el pedido dejaba de verse como una bajada. */
  let apagadas: string[] = [];
  if (destino?.ecosistema === "DIGITAL") {
    const tienda = await prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } });
    if (tienda) {
      const r = await despublicarLasDeMas(tienda.id, destino.tier as TierDigital);
      apagadas = r.despublicadas.map((d) => d.name);
    }
  }

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
      /* Bajar en digitales usa el MISMO tipo que cuando la cuenta se cae sola
         (el cron): para la persona es lo mismo que le pasó, y si algún día se
         filtran los avisos por tipo, los de este producto tienen que quedar
         juntos y no repartidos entre dos nombres para el mismo hecho. */
      type: subio ? "PLAN_UPGRADED" : esDigital ? "DIGITAL_DOWNGRADE" : "PLAN_DOWNGRADED",
      title: `Tu plan pasó a ${destino.label}`,
      body: esDigital
        ? subio
          ? `Ya lo tenés activo. La comisión de tus ventas pasa a ser del ${comision}%.`
          /* ⚠️ Si se le apagaron páginas hay que NOMBRARLAS, igual que hace el
             cron cuando la cuenta se cae sola. Enterarse de que tu página de
             venta dejó de estar publicada porque dejaron de entrarte ventas es
             la peor forma posible de enterarse; y con el nombre, la persona
             sabe cuál prender de nuevo sin tener que adivinar. */
          : `Tus productos, tus ventas y tus clientes siguen donde estaban. La comisión de tus ventas pasa a ser del ${comision}%, y las funciones del plan anterior quedan apagadas.${
              apagadas.length > 0
                ? ` Pasaron a borrador ${apagadas.length === 1 ? "esta página" : "estas páginas"} de venta: ${apagadas.join(", ")}. No se borró nada; podés cambiar cuál queda publicada desde Productos.`
                : ""
            }`
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
