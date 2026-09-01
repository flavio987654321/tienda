import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { altaDigitalConPrueba, pruebaYaUsada, TRIAL_DAYS } from "@/lib/subscription";
import { PLANES, planCerrado } from "@/lib/planLimits";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Los dos planes que se pueden probar. Free no se prueba —ya es gratis— y
   cualquier otra cosa que llegue en el cuerpo no existe. */
const PROBABLES = { STARTER: "DIGITAL_STARTER", PRO: "DIGITAL_PRO" } as const;
type TierProbable = keyof typeof PROBABLES;

/**
 * Arrancar los 7 días de prueba de un plan pago, desde adentro del panel.
 *
 * Es la otra puerta de `altaDigitalConPrueba`: la primera es el registro, donde
 * se elige el plan antes de que la cuenta exista. Ésta es para quien entró en
 * Free y después se decide.
 *
 * ⚠️ Esta ruta REGALA un plan pago. No cobra nada, así que no pasa por Mercado
 * Pago ni por el webhook, y por eso todos los frenos viven acá:
 *
 *   1. Sesión.
 *   2. Tope de intentos, por si alguien la golpea en loop.
 *   3. El tier sale de una tabla con `hasOwnProperty`, nunca de un cast: llega
 *      del navegador y elige qué plan se regala.
 *   4. El producto tiene que estar abierto. Si Productos Digitales está apagado,
 *      sus planes no se venden — y tampoco se regalan.
 *   5. La suscripción tiene que ser DIGITAL. Es el candado de ecosistema de
 *      siempre: sin esto, una dueña de tienda que le pegara a esta ruta se
 *      quedaba con `role: "DIGITAL"` y el cron le cerraba la tienda sola.
 *   6. Tiene que estar en Free. Probar desde un plan pago sería bajarse de
 *      categoría sin querer.
 *   7. La prueba tiene que estar sin usar (`pruebaYaUsada`). Una prueba
 *      repetible es Starter gratis para siempre, de a siete días.
 *
 * El estado que queda es TRIAL y nunca ACTIVE: el tier lo elige el navegador, y
 * un ACTIVE acá sería el plan más caro de arriba sin pagar un peso.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const permitido = await checkRateLimit(`digital-prueba:${user.id}`, 5, 60 * 60 * 1000);
    if (!permitido) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un momento e intentá de nuevo." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /digitales/prueba");
  }

  const { tier } = await req.json().catch(() => ({ tier: null }));

  // `hasOwnProperty` y no `in`: `PROBABLES["constructor"]` existe en el prototipo
  // de cualquier objeto y devolvería algo. Mismo criterio que `planDe`.
  if (typeof tier !== "string" || !Object.prototype.hasOwnProperty.call(PROBABLES, tier)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }
  const tierProbable = tier as TierProbable;
  const defPlan = PLANES[PROBABLES[tierProbable]];

  if (planCerrado(defPlan)) {
    return NextResponse.json({ error: "Ese plan todavía no está disponible." }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { role: true, tier: true, plan: true, trialEndsAt: true, createdAt: true },
  });

  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json(
      { error: "Tu cuenta no es de Productos Digitales." },
      { status: 403 }
    );
  }

  if (sub.tier !== "FREE") {
    return NextResponse.json(
      { error: "Ya tenés un plan activo. La prueba es para pasar de Free." },
      { status: 409 }
    );
  }

  if (pruebaYaUsada(sub)) {
    return NextResponse.json(
      { error: "Ya usaste tus días de prueba. Podés suscribirte cuando quieras." },
      { status: 409 }
    );
  }

  /* El ciclo que ya tenía elegido. No se cobra nada todavía, pero queda puesto
     para cuando llegue el momento de pagar: quien vino con "Anual" desde la
     pantalla de precios no tiene por qué perder el descuento en el camino. */
  const billing = sub.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY";

  /* `updateMany` con la condición adentro del `where`, y no un `update` por id:
     así el segundo pedido de un doble click no encuentra ninguna fila —el tier
     ya no es FREE— en vez de volver a empujar `trialEndsAt` siete días más. */
  const { count } = await prisma.subscription.updateMany({
    where: { userId: user.id, role: "DIGITAL", tier: "FREE" },
    data: altaDigitalConPrueba(tierProbable, billing),
  });

  if (count === 0) {
    return NextResponse.json(
      { error: "Ya tenés un plan activo. La prueba es para pasar de Free." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, tier: tierProbable, dias: TRIAL_DAYS });
}
