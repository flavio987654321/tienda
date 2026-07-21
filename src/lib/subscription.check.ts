// Verificación ejecutable de la cuenta que decide CUÁNTA PLATA se le cobra a
// alguien que cambia de plan. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/subscription.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Esto se testea y no otras cosas porque es lo único acá que mueve dinero real:
// un error de un factor de 10 en el crédito regala una suscripción entera, y no
// se nota hasta que aparece en la facturación.

import { cotizarCambioDePlan, PRICES } from "./subscription";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(7)} ${desc}`);
}

const DIA = 86_400_000;
const HOY = new Date("2026-07-20T12:00:00Z");
const hace = (dias: number) => new Date(HOY.getTime() - dias * DIA);
const dentro = (dias: number) => new Date(HOY.getTime() + dias * DIA);

/** Una suscripción activa que arrancó hace `usados` días y dura `total`. */
function sub(tier: "BASIC" | "PREMIUM", plan: "MONTHLY" | "ANNUAL", usados: number, total: number) {
  return {
    tier,
    plan,
    status: "ACTIVE",
    trialEndsAt: hace(usados + 1),
    currentPeriodStart: hace(usados),
    currentPeriodEnd: dentro(total - usados),
    gracePeriodEndsAt: dentro(total - usados + 4),
  };
}

const aPremiumMensual = { plan: "OWNER_PREMIUM", billing: "MONTHLY" } as const;
const aProAnual = { plan: "OWNER_BASIC", billing: "ANNUAL" } as const;
const aPremiumAnual = { plan: "OWNER_PREMIUM", billing: "ANNUAL" } as const;
const aProMensual = { plan: "OWNER_BASIC", billing: "MONTHLY" } as const;

// ── El caso que preguntó Flavio ────────────────────────────────────────────
{
  // Pagó $20.000 el día 1. El día 5 quiere Premium. Le quedan 25 de 30 días.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aPremiumMensual, HOY);
  check("PAGO-A", q.credito === 16667 && q.aPagar === 8333,
    `Pro mensual día 5 → Premium: descuenta $${q.credito} y cobra $${q.aPagar}`);
}
{
  // El desglose que se muestra en pantalla tiene que cerrar exacto, siempre.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aPremiumMensual, HOY);
  check("PAGO-B", q.precioLista - q.credito === q.aPagar,
    "precio de lista − descuento = total, sin diferencias de redondeo");
}

// ── El error que hubiera regalado plata ────────────────────────────────────
{
  // Un ANUAL con 300 días por delante. La cuenta vieja dividía por 30 fijo:
  // (300/30) × 25.000 = $250.000 de crédito → Premium anual gratis.
  const q = cotizarCambioDePlan(sub("BASIC", "ANNUAL", 65, 365), aPremiumAnual, HOY);
  check("PAGO-C", q.aPagar > 0 && q.credito < PRICES.OWNER_BASIC.ANNUAL,
    `anual con 300 días: cobra $${q.aPagar}, no lo regala`);
}
{
  // El crédito sale de lo que pagó, no del precio del plan al que va: un mes de
  // Pro cuesta $20.000 y no puede acreditar como si hubiera pagado Premium.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 0, 30), aPremiumMensual, HOY);
  check("PAGO-D", q.credito <= PRICES.OWNER_BASIC.MONTHLY,
    "el descuento nunca supera lo que la persona realmente pagó");
}

// ── Cuándo NO corresponde descontar ────────────────────────────────────────
{
  const enPrueba = { ...sub("BASIC", "MONTHLY", 2, 30), status: "TRIAL", trialEndsAt: dentro(5) };
  const q = cotizarCambioDePlan(enPrueba, aPremiumMensual, HOY);
  check("PAGO-E", q.credito === 0 && q.motivoSinCredito === "TRIAL",
    "en período de prueba no hay descuento: todavía no pagó nada");
}
{
  const vencida = { ...sub("BASIC", "MONTHLY", 40, 30), gracePeriodEndsAt: hace(6) };
  const q = cotizarCambioDePlan(vencida, aPremiumMensual, HOY);
  check("PAGO-F", q.credito === 0 && q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY,
    "una suscripción vencida no acredita: ese período ya se consumió");
}
{
  // Renovar lo mismo extiende, no cambia. Sin esto se podría renovar todos los
  // días acreditando el período entero cada vez.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aProMensual, HOY);
  check("PAGO-G", q.credito === 0 && q.motivoSinCredito === "MISMA_SUSCRIPCION",
    "renovar el mismo plan no descuenta nada");
}
{
  const q = cotizarCambioDePlan(null, aPremiumMensual, HOY);
  check("PAGO-H", q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY && q.credito === 0,
    "sin suscripción se cobra el precio de lista");
}
{
  // Datos incompletos: se falla cerrado, cobrando de más y no de menos.
  const rota = { ...sub("BASIC", "MONTHLY", 5, 30), currentPeriodStart: null };
  const q = cotizarCambioDePlan(rota, aPremiumMensual, HOY);
  check("PAGO-I", q.credito === 0,
    "sin fecha de inicio no se inventa un descuento");
}

// ── Bordes ────────────────────────────────────────────────────────────────
{
  // Último día: casi no queda nada sin usar.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 30, 30), aPremiumMensual, HOY);
  check("PAGO-J", q.credito === 0 && q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY,
    "el último día del período no queda nada para descontar");
}
{
  // Bajar de plan puede dar más crédito que el precio nuevo: eso es un período
  // sin cargo, nunca un total negativo ni una devolución.
  const q = cotizarCambioDePlan(sub("PREMIUM", "MONTHLY", 1, 30), aProMensual, HOY);
  check("PAGO-K", q.aPagar === 0 && q.credito === PRICES.OWNER_BASIC.MONTHLY,
    "al bajar de plan el total queda en cero, nunca en negativo");
}
{
  // El otro cambio que ya estaba roto en producción: mensual → anual.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aProAnual, HOY);
  check("PAGO-L", q.credito === 16667 && q.aPagar === PRICES.OWNER_BASIC.ANNUAL - 16667,
    `Pro mensual → Pro anual: cobra $${q.aPagar}`);
}
{
  // Todas las combinaciones: nunca negativo, nunca más caro que la lista.
  const combos = [aProMensual, aProAnual, aPremiumMensual, aPremiumAnual];
  const subs = [
    sub("BASIC", "MONTHLY", 5, 30), sub("BASIC", "ANNUAL", 100, 365),
    sub("PREMIUM", "MONTHLY", 15, 30), sub("PREMIUM", "ANNUAL", 200, 365),
  ];
  const malos = subs.flatMap((s) =>
    combos.map((c) => cotizarCambioDePlan(s, c, HOY))
  ).filter((q) => q.aPagar < 0 || q.aPagar > q.precioLista || q.credito < 0);
  check("PAGO-M", malos.length === 0,
    "en las 16 combinaciones el total siempre queda entre cero y el precio de lista");
}

console.log(failed === 0 ? "\n✅ La cuenta da bien en todos los casos." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
