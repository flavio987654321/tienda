export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import AutoRefresh from "@/components/AutoRefresh";
import type { LucideIcon } from "lucide-react";
import { statusLabel } from "@/lib/utils";
import { parseOrderPromoSummary } from "@/lib/email";
import {
  resumirCarritos, resumirCupones, resumirPromos,
  type CarritoCrudo, type CuponCrudo, type PedidoConCupon,
} from "@/lib/metricas-marketing";
import { armarResumen } from "@/lib/resumen-mes";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import {
  getArgentinaDayKey, diaArgentino, inicioDiaArgentino, sumarDiasCalendario,
} from "@/lib/fechas-comerciales";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Eye,
  MousePointerClick,
  MessageSquare,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  Ticket,
  Percent,
} from "lucide-react";
import { ExportButtons } from "./ExportButtons";
import ShareStatsButton from "./ShareStatsButton";
import { aggregateProfitability, calcVehicleProfit, type ProfitOrderItem } from "@/lib/margin";

// ─── Rango de fechas ──────────────────────────────────────────────────────────
// Todas las comparaciones usan ventanas de igual longitud (período actual vs.
// el período inmediatamente anterior de la misma cantidad de días). Así se evita
// comparar un mes a medias contra un mes anterior completo.

const RANGE_OPTIONS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];
const RANGE_LABELS: Record<RangeDays, string> = { 7: "7 días", 30: "30 días", 90: "90 días" };

/**
 * A partir de cuántos días un pedido cobrado y sin despachar deja de ser "lo
 * estoy preparando" y pasa a ser un problema. 5 deja pasar el fin de semana
 * largo sin llenar el resumen de avisos.
 */
const DIAS_SIN_DESPACHAR = 5;

function dayLabel(dateStr: string) {
  const [, m, day] = dateStr.split("-");
  return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
}

// Construye una serie diaria para cualquier colección con fecha + valor. Se usa
// para ingresos, consultas, ganancia y visitas — así los cuatro gráficos quedan
// alineados al mismo eje de fechas.
//
// Las claves son días ARGENTINOS ("YYYY-MM-DD" del calendario de acá), no UTC.
// Quien llame tiene que traer `dateStr` calculado con `diaArgentino()`, o el
// valor cae en un día que no existe en el eje y se pierde en silencio.
function buildDailySeries(
  rangeStartDia: string,
  rangeDays: number,
  entries: { dateStr: string; value: number }[]
) {
  const map = new Map<string, number>();
  for (let i = 0; i < rangeDays; i++) {
    map.set(sumarDiasCalendario(rangeStartDia, i), 0);
  }
  for (const { dateStr, value } of entries) {
    if (map.has(dateStr)) map.set(dateStr, (map.get(dateStr) ?? 0) + value);
  }
  return [...map.entries()].map(([dateStr, value]) => ({ label: dayLabel(dateStr), value }));
}

function pctDiff(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-400",
    CONFIRMED: "bg-green-500",
    SHIPPED: "bg-blue-500",
    DELIVERED: "bg-indigo-600",
    CANCELLED: "bg-red-400",
  };
  return map[status] ?? "bg-gray-400";
}

// ─── UI Components ────────────────────────────────────────────────────────────

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

/* Techo y paso "lindos" para el eje vertical: el paso siempre es 1, 2, 2.5 o 5
   por una potencia de diez, y el techo el primer múltiplo que cubra el pico.
   Apunta a unos 4 escalones, pero deja que sean 3 o 5 antes que ensuciar los
   números. Con el pico en 0 —una tienda sin ventas todavía— devuelve 0-1-2-3-4,
   que es una escala honesta y legible en vez de cinco ceros. */
function escalaLinda(pico: number): { max: number; paso: number } {
  const OBJETIVO = 4;
  if (!(pico > 0)) return { max: OBJETIVO, paso: 1 };

  const bruto = pico / OBJETIVO;
  const magnitud = Math.pow(10, Math.floor(Math.log10(bruto)));
  const normalizado = bruto / magnitud;
  const lindo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10;
  // Piso de 1: todo lo que se grafica acá son pesos y cantidades, o sea números
  // enteros. Sin este piso, un pico de 1 daba un paso de 0,25 y el eje volvía a
  // mostrar "0 · 0 · 1 · 1 · 1" — el mismo problema, por el otro lado.
  const paso = Math.max(1, lindo * magnitud);

  return { max: Math.ceil(pico / paso) * paso, paso };
}

function LineChart({
  data,
  color = "#6366f1",
  gradId,
  formatter = shortNum,
}: {
  data: { label: string; value: number }[];
  color?: string;
  gradId: string;
  formatter?: (n: number) => string;
}) {
  const W = 580, H = 180;
  const padL = 46, padR = 12, padT = 24, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // El eje arranca de un PASO redondo y el techo sale de ahí, en vez de partir
  // el pico crudo en cuatro.
  //
  // Antes el techo era el pico y los cuatro escalones caían donde cayeran, así
  // que el formateador los redondeaba y salían repetidos o desparejos: un mes
  // sin ventas mostraba "$0 · $0 · $1 · $1 · $1" —cinco marcas, tres textos
  // iguales y ninguno cierto— y un pico de 7 visitas daba "0 · 2 · 4 · 5 · 7".
  // Un eje que repite valores o que no se puede leer de un vistazo es peor que
  // no tener eje.
  //
  // El paso se elige entre 1, 2, 2.5 y 5 por la potencia de diez que
  // corresponda, que son los saltos que la gente lee sin pensar. Después el
  // techo es el primer múltiplo de ese paso que cubra el pico — por eso la
  // cantidad de líneas varía entre 3 y 5, en vez de ser fija: forzar cinco es
  // lo que obligaba a inventar escalones.
  const { max, paso } = escalaLinda(Math.max(...data.map((d) => d.value), 0));
  const lineas = Math.round(max / paso);

  const xs = data.map((_, i) =>
    data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW
  );
  const ys = data.map((d) => padT + (1 - d.value / max) * innerH);

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${(padT + innerH).toFixed(1)} L${xs[0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // Menos fechas en el eje de abajo. El SVG tiene 580 de ancho y en un teléfono
  // se dibuja en unos 320, o sea que todo se achica a poco más de la mitad: con
  // nueve fechas quedaban pegadas y de un tamaño ilegible. Con seis se separan y
  // el texto respira; en pantalla grande tampoco se extraña ninguna.
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const peakIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px]">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {Array.from({ length: lineas + 1 }, (_, i) => {
          const v = paso * i;
          const y = padT + (1 - v / max) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y}
                stroke={i === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={i === 0 ? 1 : 0.5} />
              <text x={padL - 5} y={y + 3.5} textAnchor="end" fontSize={10.5} fill="#9ca3af">
                {formatter(v)}
              </text>
            </g>
          );
        })}

        {/* Área rellena */}
        {hasData && <path d={areaPath} fill={`url(#${gradId})`} />}

        {/* Línea */}
        <path d={linePath} fill="none" stroke={hasData ? color : "#e5e7eb"}
          strokeWidth={hasData ? 2 : 1} strokeLinejoin="round" strokeLinecap="round" />

        {/* Punto pico con etiqueta */}
        {hasData && (
          <g>
            <circle cx={xs[peakIdx]} cy={ys[peakIdx]} r={4} fill={color} />
            <text x={xs[peakIdx]} y={ys[peakIdx] - 9} textAnchor="middle"
              fontSize={9} fontWeight="700" fill={color}>
              {formatter(data[peakIdx].value)}
            </text>
          </g>
        )}

        {/* Etiquetas eje X */}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={xs[i]} y={H - 3} textAnchor="middle" fontSize={10.5} fill="#9ca3af">
              {d.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number | null;
  icon: LucideIcon;
  iconBg: string;
}

/* ── Ranking con barras ──────────────────────────────────────────────────────
   La lista corta ordenada que usan Cupones y Promociones: cada fila con su
   etiqueta, el número, la plata y una barra proporcional.

   Un solo color para todas las filas, no uno por fila. Acá se compara CUÁNTO
   —una magnitud— entre cosas de la misma lista; darle a cada cupón su propio
   color sugeriría que el color significa algo, y no significa nada. La longitud
   de la barra ya es la comparación.

   La barra se mide contra el MÁXIMO de la lista y no contra el total: con cinco
   filas parejas, medir contra el total deja cinco barras de 20% que no se
   distinguen entre sí. Contra el máximo, la primera llena y el resto se lee en
   proporción a ella, que es la pregunta real ("¿cuánto más que el que le sigue?").

   El número va SIEMPRE escrito al lado, no sólo en la barra: es lo que hace que
   la tarjeta se pueda leer sin depender del color ni del largo. */
function BarrasRanking({
  filas, color, unidad,
}: {
  filas: { clave: string; titulo: string; sub: string | null; valor: number; pie: string }[];
  color: string;
  unidad: string;
}) {
  const maximo = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <div className="space-y-3">
      {filas.slice(0, 5).map((f) => {
        const pct = Math.round((f.valor / maximo) * 100);
        return (
          <div key={f.clave}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-gray-700 font-medium break-words">{f.titulo}</span>
                {f.sub && <span className="text-xs text-gray-400 ml-1.5">{f.sub}</span>}
              </div>
              <div className="shrink-0 text-right">
                <span className="font-bold text-gray-900">{f.valor}</span>
                <span className="text-xs text-gray-400 ml-1">
                  {unidad}{f.valor !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 shrink-0 tabular-nums">{f.pie}</span>
            </div>
          </div>
        );
      })}
      {filas.length > 5 && (
        <p className="text-xs text-gray-400 pt-1">y {filas.length - 5} más</p>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, trend, icon: Icon, iconBg }: KPICardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== null && trend !== undefined && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              trend >= 0
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}
            title="vs. el período anterior de igual duración"
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RangeSelector({ active }: { active: RangeDays }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
      {RANGE_OPTIONS.map((r) => (
        <Link
          key={r}
          href={r === 30 ? "/dashboard/metricas" : `/dashboard/metricas?range=${r}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            r === active ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {RANGE_LABELS[r]}
        </Link>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, tipoTienda: true },
  });
  if (!store) redirect("/dashboard");

  const isAutos = store.tipoTienda === "AUTOS";

  const { range } = await searchParams;
  const parsedRange = Number(range);
  const rangeDays: RangeDays = (RANGE_OPTIONS as readonly number[]).includes(parsedRange)
    ? (parsedRange as RangeDays)
    : 30;

  const now = new Date();

  // ── Ventanas de comparación ──
  // Los días son ARGENTINOS, no UTC. Calculados en UTC, cada "día" iba de las
  // 21:00 a las 21:00 hora de acá: una venta de las 22:00 de un martes contaba
  // como del miércoles, y son las horas en que más se vende.
  const hoyDia = getArgentinaDayKey();
  const periodStartStr = sumarDiasCalendario(hoyDia, -(rangeDays - 1));
  const prevPeriodStartStr = sumarDiasCalendario(periodStartStr, -rangeDays);
  const prevPeriodEndStr = sumarDiasCalendario(periodStartStr, -1);

  const periodStart = inicioDiaArgentino(periodStartStr);
  const periodEndExclusive = inicioDiaArgentino(sumarDiasCalendario(hoyDia, 1));
  const prevPeriodStart = inicioDiaArgentino(prevPeriodStartStr);

  // El período actual llega hasta AHORA: hoy va por la mitad. El anterior estaba
  // completo, así que la comparación siempre le jugaba en contra al presente —en
  // el rango de 7 días, hasta un 7% de castigo, de sobra para dar vuelta el
  // veredicto del resumen—. Se corta el período anterior en el mismo punto: si
  // hoy son las 15:00, el anterior también llega hasta las 15:00 de su último día.
  const transcurrido = now.getTime() - periodStart.getTime();
  const prevPeriodEndExclusive = new Date(prevPeriodStart.getTime() + transcurrido);

  const CONFIRMED_ORDER_STATUSES = ESTADOS_VENTA_CONFIRMADA_LISTA;

  // (queries compartidas eliminadas — Push/Reseñas/Afiliados tienen sus propios paneles)

  // ── Queries AUTOS ──
  let leadsPeriodRaw: { createdAt: Date }[] = [];
  let leadsTotal = 0, leadsConfirmedTotal = 0, leadsPrevCount = 0;
  let leadsConfirmedCurrent = 0, leadsConfirmedPrev = 0;
  let vehiculosDisponibles = 0, vehiculosVendidos = 0, vehiculosReservados = 0;
  let soldPriceAvg: { _avg: { soldPrice: number | null } } = { _avg: { soldPrice: null } };

  if (isAutos) {
    [
      leadsPeriodRaw,
      leadsTotal,
      leadsConfirmedTotal,
      leadsPrevCount,
      leadsConfirmedCurrent,
      leadsConfirmedPrev,
      vehiculosDisponibles,
      vehiculosVendidos,
      vehiculosReservados,
      soldPriceAvg,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { storeId: store.id, createdAt: { gte: periodStart, lt: periodEndExclusive } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lead.count({ where: { storeId: store.id } }),
      prisma.lead.count({ where: { storeId: store.id, status: "CONFIRMED" } }),
      prisma.lead.count({
        where: { storeId: store.id, createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive } },
      }),
      // "Confirmada" = se marcó como venta confirmada dentro del período (no cuándo se creó la consulta)
      prisma.lead.count({
        where: { storeId: store.id, confirmedAt: { gte: periodStart, lt: periodEndExclusive } },
      }),
      prisma.lead.count({
        where: { storeId: store.id, confirmedAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive } },
      }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "AVAILABLE" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "RESERVED" } }),
      prisma.product.aggregate({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" }, _avg: { soldPrice: true } }),
    ]);
  }

  // ── Queries tienda normal (no AUTOS) ──
  let ordersPeriod: { total: number; status: string; createdAt: Date }[] = [];
  let revenuePrevAgg: { _sum: { total: number | null } } = { _sum: { total: null } };
  let ordersPrevCount = 0;
  let topProducts: { productId: string; _sum: { quantity: number | null } }[] = [];
  let ordersByStatus: { status: string; _count: number }[] = [];
  // Los dos de abajo son sólo para el resumen en texto.
  // `ordersPrevConfirmedCount` es el divisor del ticket promedio del período
  // anterior: `ordersPrevCount` no sirve porque cuenta todos los no cancelados
  // mientras que `revenuePrevAgg` suma sólo los confirmados —arriba unos, abajo
  // otros, el mismo error que ya se había corregido en el período actual.
  let ordersPrevConfirmedCount = 0;
  let sinDespacharAgg: { _count: number; _sum: { total: number | null } } =
    { _count: 0, _sum: { total: null } };

  // ── Marketing: carritos abandonados, cupones y promociones ──
  // Las cuentas viven en `lib/metricas-marketing` porque tienen trampas que se
  // equivocan calladas (etapas que se pisan, pedidos con dos promas contados dos
  // veces) y porque el CSV va a necesitar exactamente los mismos números.
  let carritosRaw: CarritoCrudo[] = [];
  let cuponesRaw: CuponCrudo[] = [];
  let pedidosConCupon: PedidoConCupon[] = [];
  let pedidosConPromoRaw: { promoSummary: string | null }[] = [];

  if (!isAutos) {
    [
      ordersPeriod, revenuePrevAgg, ordersPrevCount, topProducts, ordersByStatus,
      carritosRaw, cuponesRaw, pedidosConCupon, pedidosConPromoRaw,
      ordersPrevConfirmedCount, sinDespacharAgg,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, createdAt: { gte: periodStart, lt: periodEndExclusive }, status: { not: "CANCELLED" } },
        select: { total: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.aggregate({
        where: {
          storeId: store.id,
          createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { storeId: store.id, createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive }, status: { not: "CANCELLED" } },
      }),
      // Los dos de acá abajo NO filtraban por fecha: en una pantalla que dice
      // "últimos N días" mostraban toda la historia de la tienda. Se notaba
      // cambiando el selector de rango — eran los únicos dos bloques que no se
      // movían. El más engañoso era el ranking: un producto que vendió mucho hace
      // ocho meses y hoy no vende nada seguía apareciendo primero.
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            storeId: store.id,
            status: { in: CONFIRMED_ORDER_STATUSES },
            createdAt: { gte: periodStart, lt: periodEndExclusive },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: {
          storeId: store.id,
          createdAt: { gte: periodStart, lt: periodEndExclusive },
        },
        _count: true,
      }),

      // Carritos abandonados del período. Se filtra por `lastActivityAt` y no por
      // `createdAt`: la fila se crea la primera vez que esa persona deja algo en el
      // carrito y después se va actualizando, así que `createdAt` puede ser de hace
      // meses aunque el abandono sea de ayer.
      prisma.abandonedCart.findMany({
        where: { storeId: store.id, lastActivityAt: { gte: periodStart, lt: periodEndExclusive } },
        select: { total: true, reminderSentAt: true, recoveredAt: true },
      }),

      prisma.coupon.findMany({
        where: { storeId: store.id },
        select: { id: true, code: true, label: true, discountType: true, discountValue: true, expiresAt: true },
      }),

      // Sólo pedidos CONFIRMADOS: un cupón usado en un pedido que después se cayó
      // no descontó plata de verdad, y el resto de la pantalla también mide sobre
      // confirmados. Si contáramos los pendientes, el bloque diría que resignaste
      // plata que nunca resignaste.
      prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: periodStart, lt: periodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
          couponId: { not: null },
        },
        select: { couponId: true, discountAmount: true },
      }),

      prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: periodStart, lt: periodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
          promoSummary: { not: null },
        },
        select: { promoSummary: true },
      }),

      // ── Sólo para el resumen en texto ──
      prisma.order.count({
        where: {
          storeId: store.id,
          createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
        },
      }),
      // Pedidos que ya se cobraron y siguen sin despacharse. A propósito NO se
      // filtra por período: un pedido trabado hace dos meses es peor que uno de
      // esta semana, y si sólo mirara la ventana elegida desaparecería del aviso
      // justo cuando más viejo se pone.
      prisma.order.aggregate({
        where: {
          storeId: store.id,
          status: "CONFIRMED",
          createdAt: { lt: inicioDiaArgentino(sumarDiasCalendario(hoyDia, -DIAS_SIN_DESPACHAR)) },
        },
        _count: true,
        _sum: { total: true },
      }),
    ]);
  }

  const resumenCarritos = resumirCarritos(carritosRaw);
  const resumenCupones = resumirCupones(cuponesRaw, pedidosConCupon);
  const resumenPromos = resumirPromos(
    pedidosConPromoRaw.map((o) => {
      const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(o.promoSummary);
      return { applied: appliedPromos, freeShipping: freeShippingPromo };
    })
  );
  // El bloque entero se esconde si no hay NADA que contar. Tres tarjetas vacías
  // seguidas no informan: sólo hacen scrollear.
  const hayMarketing =
    resumenCarritos.cantidad > 0 || resumenCupones.filas.length > 0 || resumenPromos.filas.length > 0;

  // ── Rentabilidad (no-AUTOS) ── Una sola query que cubre período actual + anterior
  // (misma ventana doble que ya usa el resto de la página) para no duplicar el pedido a la DB.
  let profitCurrentAgg = aggregateProfitability([]);
  let profitPrevTotalProfit = 0;
  if (!isAutos) {
    const rawProfitItems = await prisma.orderItem.findMany({
      where: {
        order: {
          storeId: store.id,
          status: { in: CONFIRMED_ORDER_STATUSES },
          createdAt: { gte: prevPeriodStart, lt: periodEndExclusive },
        },
      },
      select: {
        productId: true, quantity: true, price: true, lineTotal: true, costAtSale: true,
        order: { select: { subtotal: true, discountAmount: true, createdAt: true } },
      },
    });
    const currentItems: ProfitOrderItem[] = [];
    const prevItems: ProfitOrderItem[] = [];
    for (const it of rawProfitItems) {
      const dateStr = diaArgentino(it.order.createdAt);
      const mapped: ProfitOrderItem = {
        productId: it.productId, quantity: it.quantity, price: it.price, lineTotal: it.lineTotal, costAtSale: it.costAtSale,
        orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount, dateStr,
      };
      (dateStr >= periodStartStr ? currentItems : prevItems).push(mapped);
    }
    profitCurrentAgg = aggregateProfitability(currentItems);
    profitPrevTotalProfit = aggregateProfitability(prevItems).totalProfit;
  }

  // ── #7c — el envío que la tienda regaló en el período ──
  // Va APARTE de la ganancia por producto a propósito: es un costo por PEDIDO, y
  // repartirlo entre los productos del carrito sería inventar un número que
  // después aparecería en "Rentabilidad por producto" como si fuera real.
  // Hasta acá este costo no existía en ningún lado y esa plata se contaba como
  // ganancia — una promo de envío gratis mejoraba las métricas en vez de costar.
  let shippingWaivedPeriod = 0;
  if (!isAutos) {
    const waived = await prisma.order.aggregate({
      where: {
        storeId: store.id,
        status: { in: CONFIRMED_ORDER_STATUSES },
        createdAt: { gte: periodStart, lt: periodEndExclusive },
      },
      _sum: { shippingWaived: true },
    });
    shippingWaivedPeriod = waived._sum.shippingWaived ?? 0;
  }

  // ── Rentabilidad de vehículos vendidos en el período (AUTOS) ──
  // Un vehículo solo cuenta para la ganancia si tiene al menos un gasto cargado —
  // si nunca se cargó ni la "Compra", sumar soldPrice - 0 mostraría el 100% del
  // precio de venta como ganancia, lo cual sería falso.
  let soldVehiclesPeriod: { id: string; soldPrice: number | null; expenses: { monto: number }[] }[] = [];
  if (isAutos) {
    soldVehiclesPeriod = await prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD", soldAt: { gte: periodStart, lt: periodEndExclusive } },
      select: { id: true, soldPrice: true, expenses: { select: { monto: true } } },
    });
  }
  const soldVehiclesWithGastos = soldVehiclesPeriod.filter((v) => v.expenses.length > 0);
  const vehicleProfits = soldVehiclesWithGastos
    .map((v) => calcVehicleProfit(v.soldPrice, v.expenses))
    .filter((p): p is number => p != null);
  const totalVehicleProfit = vehicleProfits.reduce((s, p) => s + p, 0);
  const avgVehicleProfit = vehicleProfits.length > 0 ? totalVehicleProfit / vehicleProfits.length : null;

  // ── Queries de StoreView (requieren migración SQL — fallan silenciosamente si la tabla no existe) ──
  let viewsPrevAgg: { _sum: { count: number | null } } = { _sum: { count: null } };
  let viewsPeriodRaw: { date: string; count: number }[] = [];
  try {
    [viewsPrevAgg, viewsPeriodRaw] = await Promise.all([
      prisma.storeView.aggregate({
        where: { storeId: store.id, date: { gte: prevPeriodStartStr, lte: prevPeriodEndStr } },
        _sum: { count: true },
      }),
      prisma.storeView.findMany({
        where: { storeId: store.id, date: { gte: periodStartStr } },
        select: { date: true, count: true },
        orderBy: { date: "asc" },
      }),
    ]);
  } catch (err) {
    console.error("[metricas] StoreView aggregate falló — ¿falta la migración?", err);
  }

  // ── Nombres de productos para el top y para la tabla de rentabilidad ──
  const productIds = Array.from(new Set([...topProducts.map((p) => p.productId), ...profitCurrentAgg.byProduct.keys()]));
  const productNames = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

  // ── Series diarias (todas en UTC, mismo eje de fechas) ──
  // El gráfico se llama "Ingresos confirmados" y arriba muestra el total
  // confirmado, pero la curva sumaba `ordersPeriod` entero —que incluye los
  // PENDIENTES—. O sea que el número del título y la línea de abajo no eran la
  // misma cuenta: la curva siempre iba por arriba, y cuanto más pedidos sin
  // confirmar hubiera, más se separaban. El CSV ya filtraba bien, así que el
  // archivo y la pantalla tampoco coincidían.
  const revenueChartData = buildDailySeries(
    periodStartStr,
    rangeDays,
    ordersPeriod
      .filter((o) => CONFIRMED_ORDER_STATUSES.includes(o.status))
      .map((o) => ({ dateStr: diaArgentino(o.createdAt), value: o.total }))
  );
  const leadsChartData = buildDailySeries(
    periodStartStr,
    rangeDays,
    leadsPeriodRaw.map((l) => ({ dateStr: diaArgentino(l.createdAt), value: 1 }))
  );
  // Las visitas ya vienen guardadas con la fecha hecha (`StoreView.date`), así que
  // acá no hay nada que convertir. Las filas escritas antes del 29/07/2026 tienen
  // el día calculado en UTC; de ahí en adelante, argentino. Ver METRICAS.md.
  const visitsChartData = buildDailySeries(
    periodStartStr,
    rangeDays,
    viewsPeriodRaw.map((v) => ({ dateStr: v.date, value: v.count }))
  );

  // ── Métricas calculadas — tienda normal ──
  const totalOrdersPeriod = ordersPeriod.length;
  const confirmedOrdersPeriod = ordersPeriod.filter((o) => CONFIRMED_ORDER_STATUSES.includes(o.status));
  const totalRevenuePeriod = confirmedOrdersPeriod.reduce((s, o) => s + o.total, 0);
  const totalRevenuePrev = revenuePrevAgg._sum.total ?? 0;
  const revDiff = pctDiff(totalRevenuePeriod, totalRevenuePrev);
  const ordersDiff = pctDiff(totalOrdersPeriod, ordersPrevCount);

  // El ticket promedio divide plata confirmada por pedidos CONFIRMADOS. Antes el
  // divisor eran todos los pedidos no cancelados —pendientes incluidos—, o sea que
  // arriba se sumaba la plata de unos y abajo se contaban otros: con 10 pedidos de
  // los cuales 5 confirmados, un ticket real de $100.000 se mostraba como $50.000.
  // Y empeoraba solo: cuantos más pedidos pendientes hubiera, más se hundía.
  const avgTicket = confirmedOrdersPeriod.length > 0
    ? totalRevenuePeriod / confirmedOrdersPeriod.length
    : 0;

  const totalViewsPeriod = visitsChartData.reduce((s, v) => s + v.value, 0);
  const totalViewsPrev = viewsPrevAgg._sum.count ?? 0;
  const viewsDiff = pctDiff(totalViewsPeriod, totalViewsPrev);

  const conversionRate =
    totalViewsPeriod > 0 ? ((totalOrdersPeriod / totalViewsPeriod) * 100).toFixed(1) : null;

  // Este total NO es el mismo que el KPI "Pedidos": el KPI excluye los
  // cancelados y este bloque los muestra, porque cancelado es un estado y verlo
  // sirve. Los dos números son correctos, pero puestos en la misma pantalla sin
  // aclarar nada parecen un error — por eso el bloque dice de dónde sale.
  const totalOrdersAllStatuses = ordersByStatus.reduce((s, o) => s + o._count, 0);
  const cancelledInPeriod = ordersByStatus.find((o) => o.status === "CANCELLED")?._count ?? 0;

  // ── Rentabilidad — tienda normal ──
  const profitChartData = buildDailySeries(
    periodStartStr,
    rangeDays,
    [...profitCurrentAgg.dailyProfit.entries()].map(([dateStr, value]) => ({ dateStr, value }))
  );
  const profitDiff = pctDiff(profitCurrentAgg.totalProfit, profitPrevTotalProfit);
  const marginPctPeriod = profitCurrentAgg.totalNetRevenueKnownCost > 0
    ? (profitCurrentAgg.totalProfit / profitCurrentAgg.totalNetRevenueKnownCost) * 100
    : null;
  const costCoveragePct = profitCurrentAgg.totalNetRevenueAll > 0
    ? Math.round((profitCurrentAgg.totalNetRevenueKnownCost / profitCurrentAgg.totalNetRevenueAll) * 100)
    : 0;
  const profitByProductRanked = [...profitCurrentAgg.byProduct.entries()]
    .filter(([, p]) => p.profit !== null)
    .sort((a, b) => (b[1].profit ?? 0) - (a[1].profit ?? 0))
    .slice(0, 8);
  const productsWithoutCostCount = [...profitCurrentAgg.byProduct.values()].filter((p) => p.profit === null).length;

  // ── El resumen en texto ──
  // Se arma acá abajo de todo, a propósito: recibe los números ya calculados y no
  // vuelve a calcular ninguno. Si mañana se ajusta el ticket promedio o qué
  // cuenta como venta confirmada, el texto se mueve solo y no puede quedar
  // contradiciendo a las tarjetas de arriba.
  const pedidosPendientesPeriodo = ordersPeriod.filter((o) => o.status === "PENDING");

  // Cuánto del día de hoy todavía no pasó, medido en puntos porcentuales sobre el
  // período. Los pedidos se comparan contra el mismo momento del período anterior
  // —exacto—, pero las visitas se guardan por día entero y ahí hoy entra a medias
  // contra un día completo. Este es el tamaño de esa diferencia; abajo de eso el
  // resumen no habla de visitas.
  const fraccionDiaSinTranscurrir =
    1 - (now.getTime() - inicioDiaArgentino(hoyDia).getTime()) / 86_400_000;
  const incertidumbreVisitasPct = (fraccionDiaSinTranscurrir / rangeDays) * 100;

  const resumen = armarResumen({
    dias: rangeDays,
    incertidumbreVisitasPct,
    actual: {
      ingresos: totalRevenuePeriod,
      pedidosConfirmados: confirmedOrdersPeriod.length,
      visitas: totalViewsPeriod,
    },
    previo: {
      ingresos: totalRevenuePrev,
      pedidosConfirmados: ordersPrevConfirmedCount,
      visitas: totalViewsPrev,
    },
    senales: {
      carritosSinContactar: {
        cantidad: resumenCarritos.sinContactar.cantidad,
        monto: resumenCarritos.sinContactar.monto,
      },
      pedidosPendientes: {
        cantidad: pedidosPendientesPeriodo.length,
        monto: pedidosPendientesPeriodo.reduce((s, o) => s + o.total, 0),
      },
      confirmadosSinDespachar: {
        cantidad: sinDespacharAgg._count,
        dias: DIAS_SIN_DESPACHAR,
        monto: sinDespacharAgg._sum.total ?? 0,
      },
      cuponesVencidos: resumenCupones.filas.filter((f) => f.vencido).length,
      productosSinCosto: productsWithoutCostCount,
      enviosBonificados: shippingWaivedPeriod,
    },
  });

  // ── Métricas calculadas — AUTOS ──
  const totalLeadsPeriod = leadsPeriodRaw.length;
  const leadsDiff = pctDiff(totalLeadsPeriod, leadsPrevCount);
  const leadsConfirmedDiff = pctDiff(leadsConfirmedCurrent, leadsConfirmedPrev);
  const leadsConversionRate =
    leadsTotal > 0 ? Math.round((leadsConfirmedTotal / leadsTotal) * 100) : null;
  const avgSoldPrice = soldPriceAvg._avg.soldPrice ?? 0;

  // ── Render ──
  return (
    <DashboardLayout userName={user.name} userId={user.id}>
      {/* Las métricas salen de los pedidos: una venta nueva las recalcula sola */}
      <AutoRefresh tables={["Order"]} />
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
            <p className="mt-1 text-sm text-gray-500">
              <strong>{store.name}</strong> — últimos {rangeDays} días vs. período anterior de igual duración
            </p>
            {/* Sólo en el papel: un PDF que circula por mail o se archiva tiene que
                decir de cuándo es. En pantalla la fecha sobra —es hoy— pero dentro
                de tres meses, en un archivo suelto, es el único dato que lo ubica. */}
            <p className="hidden print:block mt-1 text-xs text-gray-500">
              Informe generado el {new Date().toLocaleDateString("es-AR", {
                day: "2-digit", month: "long", year: "numeric",
              })} · Período: {periodStartStr} a {hoyDia}
            </p>
          </div>
          {/* Los controles no son el informe: al imprimir se van. `data-print` en
              vez de `print:hidden` en cada botón — así alcanza con marcar el
              contenedor y sirve igual si mañana se agrega otro botón acá. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center" data-print="ocultar">
            <RangeSelector active={rangeDays} />
            <div className="flex items-center gap-2">
              <ExportButtons range={rangeDays} storeSlug={store.slug} />
              <ShareStatsButton
                storeName={store.name}
                period={rangeDays}
                revenue={totalRevenuePeriod}
                orders={totalOrdersPeriod}
                visits={totalViewsPeriod}
                isAutos={isAutos}
                leads={totalLeadsPeriod}
                confirmedSales={leadsConfirmedCurrent}
              />
            </div>
          </div>
        </div>

        {/* ── Resumen en texto ──
            Va arriba de todo porque es la respuesta a "¿cómo me fue?"; las
            tarjetas de abajo son el detalle para el que quiere verificarlo.
            Sólo en tiendas con carrito: AUTOS vende por consulta y sus números
            —leads, vehículos vendidos— no entran en esta cuenta. */}
        {!isAutos && (
          <div className={`rounded-2xl border bg-white p-6 border-l-4 ${
            resumen.tono === "bien" ? "border-gray-100 border-l-emerald-500"
            : resumen.tono === "mal" ? "border-gray-100 border-l-rose-500"
            : resumen.tono === "atencion" ? "border-gray-100 border-l-amber-500"
            : "border-gray-100 border-l-gray-300"
          }`}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cómo te fue
            </h2>

            <p className="mt-2 text-lg font-bold leading-snug text-gray-900">
              {resumen.titular}
            </p>

            {resumen.parrafos.map((parrafo) => (
              <p key={parrafo} className="mt-3 text-sm leading-relaxed text-gray-600">
                {parrafo}
              </p>
            ))}

            {resumen.pendientes.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Para revisar
                </p>
                <ul className="mt-2 space-y-2">
                  {resumen.pendientes.map((pendiente) => (
                    <li key={pendiente.texto} className="flex gap-2.5 text-sm leading-relaxed text-gray-600">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      <span>
                        {pendiente.texto}{" "}
                        {pendiente.href && (
                          <Link
                            href={pendiente.href}
                            className="font-semibold text-indigo-600 hover:underline print:hidden"
                          >
                            Ir →
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── KPIs ── */}
        {isAutos ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label={`Consultas (${RANGE_LABELS[rangeDays]})`}
              value={totalLeadsPeriod}
              sub={`${leadsTotal} en total`}
              trend={leadsDiff}
              icon={MessageSquare}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label={`Ventas confirmadas (${RANGE_LABELS[rangeDays]})`}
              value={leadsConfirmedCurrent}
              sub={leadsConversionRate !== null ? `${leadsConversionRate}% de conversión histórica` : "Sin datos"}
              trend={leadsConfirmedDiff}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label="Precio prom. de venta"
              value={avgSoldPrice > 0 ? money(avgSoldPrice) : "—"}
              sub={vehiculosVendidos > 0 ? `${vehiculosVendidos} vehículo${vehiculosVendidos !== 1 ? "s" : ""} vendido${vehiculosVendidos !== 1 ? "s" : ""} en total` : "Sin ventas aún"}
              icon={ShoppingBag}
              iconBg="bg-amber-50 text-amber-600"
            />
            <KPICard
              label={`Visitas (${RANGE_LABELS[rangeDays]})`}
              value={totalViewsPeriod.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del período anterior" : undefined}
              trend={viewsDiff}
              icon={Eye}
              iconBg="bg-blue-50 text-blue-600"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label={`Ingresos (${RANGE_LABELS[rangeDays]})`}
              value={money(totalRevenuePeriod)}
              sub={revDiff === null ? "Sin datos del período anterior" : undefined}
              trend={revDiff}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label={`Pedidos (${RANGE_LABELS[rangeDays]})`}
              value={totalOrdersPeriod}
              sub={`Ticket prom. ${money(avgTicket)}`}
              trend={ordersDiff}
              icon={ShoppingBag}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label={`Visitas (${RANGE_LABELS[rangeDays]})`}
              value={totalViewsPeriod.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del período anterior" : undefined}
              trend={viewsDiff}
              icon={Eye}
              iconBg="bg-blue-50 text-blue-600"
            />
            <KPICard
              label="Conversión"
              value={conversionRate !== null ? `${conversionRate}%` : "—"}
              sub="visitas → pedidos"
              icon={MousePointerClick}
              iconBg="bg-emerald-50 text-emerald-600"
            />
          </div>
        )}

        {/* ── Gráficos ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isAutos ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <h2 className="font-bold text-gray-900">Consultas diarias</h2>
                <p className="shrink-0 text-xl font-black text-indigo-600">{totalLeadsPeriod}</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días</p>
              <LineChart data={leadsChartData} color="#6366f1" gradId="grad-indigo" formatter={shortNum} />
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <h2 className="font-bold text-gray-900">Ingresos confirmados</h2>
                <p className="shrink-0 text-xl font-black text-green-600">{money(totalRevenuePeriod)}</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días</p>
              <LineChart data={revenueChartData} color="#16a34a" gradId="grad-green" formatter={shortMoney} />
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center justify-between gap-3 mb-0.5">
              <h2 className="font-bold text-gray-900">Visitas a tu tienda</h2>
              <p className="shrink-0 text-xl font-black text-blue-600">{totalViewsPeriod.toLocaleString("es-AR")}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {totalViewsPeriod === 0
                ? "Las visitas del propio dueño no se cuentan"
                : `Últimos ${rangeDays} días`}
            </p>
            <LineChart data={visitsChartData} color="#2563eb" gradId="grad-blue" formatter={shortNum} />
          </div>
        </div>

        {/* ── Sección central: AUTOS = estado de flota | resto = productos + pedidos ── */}
        {isAutos ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { label: "Disponibles", count: vehiculosDisponibles, color: "bg-emerald-500", dot: "bg-emerald-100 text-emerald-700" },
              { label: "Reservados",  count: vehiculosReservados,  color: "bg-amber-500",   dot: "bg-amber-100 text-amber-700"   },
              { label: "Vendidos",    count: vehiculosVendidos,    color: "bg-gray-400",    dot: "bg-gray-100 text-gray-600"     },
            ].map(({ label, count, color, dot }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-white p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{count}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dot}`}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="font-bold text-gray-900">Productos más vendidos</h2>
              <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días</p>
              {topProducts.length === 0 ? (
                <div className="py-4">
                  {/* "en estos N días" y no "aún": ahora el bloque mira el período,
                      así que puede estar vacío en 7 días y tener datos en 90. Decir
                      "aún" haría pensar que la tienda nunca vendió nada. */}
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Sin ventas confirmadas en estos {rangeDays} días
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Los productos aparecen acá cuando tenés pedidos en estado Confirmado, Enviado o Entregado. Probá con un período más largo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const maxQty = topProducts[0]._sum.quantity ?? 1;
                    return topProducts.map((p, i) => {
                      const qty = p._sum.quantity ?? 0;
                      const pct = Math.round((qty / maxQty) * 100);
                      return (
                        <div key={p.productId}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 shrink-0 text-xs font-bold text-gray-400">#{i + 1}</span>
                              <span className="font-medium text-gray-800 truncate">{nameMap[p.productId] ?? "Producto eliminado"}</span>
                            </div>
                            <span className="ml-2 shrink-0 font-bold text-gray-700">{qty} u.</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-900">Pedidos por estado</h2>
                  <p className="text-xs text-gray-400">Últimos {rangeDays} días</p>
                </div>
                <span className="text-sm font-semibold text-gray-400">
                  {totalOrdersAllStatuses} total
                  {cancelledInPeriod > 0 && (
                    <span className="block text-right text-xs font-normal">incluye cancelados</span>
                  )}
                </span>
              </div>
              {ordersByStatus.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Sin pedidos en estos {rangeDays} días
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Cuando lleguen pedidos vas a ver acá cómo se distribuyen por estado — cuántos están pendientes, confirmados, enviados y entregados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ordersByStatus.sort((a, b) => b._count - a._count).map((s) => {
                    const pct = totalOrdersAllStatuses > 0 ? Math.round((s._count / totalOrdersAllStatuses) * 100) : 0;
                    return (
                      <div key={s.status}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(s.status)}`} />
                            <span className="text-gray-700">{statusLabel(s.status)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{s._count}</span>
                            <span className="w-8 text-right text-xs text-gray-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div className={`h-1.5 rounded-full transition-all ${statusColor(s.status)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Marketing: carritos, cupones y promociones ─────────────────────
            Tres tarjetas con la misma anatomía que el resto de la pantalla:
            título, número grande a la derecha, y filas con etiqueta + valor +
            barra. No son gráficos de línea porque no son series de tiempo: son
            rankings cortos y un desglose de estados, y para eso la barra
            horizontal con la etiqueta al lado se lee mejor que cualquier torta.

            El color va de a UN tono por tarjeta —no un color por fila—: acá se
            compara MAGNITUD entre filas de la misma tarjeta, no identidades
            distintas. Pintar cada cupón de un color inventaría un significado
            que no existe. La excepción es la de carritos, donde las tres etapas
            sí son estados distintos (bien / a medias / nada) y llevan los colores
            de estado, siempre con su texto al lado. */}
        {!isAutos && hayMarketing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Carritos abandonados */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="h-4 w-4 text-amber-500 shrink-0" />
                  <h2 className="font-bold text-gray-900 truncate">Carritos abandonados</h2>
                </div>
                <span className="text-sm font-semibold text-gray-400 shrink-0">{resumenCarritos.cantidad}</span>
              </div>

              {resumenCarritos.cantidad === 0 ? (
                <div className="py-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Ninguno en el período</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Se registran cuando alguien deja datos y productos en el carrito pero no termina la compra.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">{money(resumenCarritos.montoPerdido)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      sin recuperar, de {money(resumenCarritos.monto)} en total
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { etapa: "Recuperados",   dato: resumenCarritos.recuperados,  color: "bg-emerald-500" },
                      { etapa: "Con recordatorio", dato: resumenCarritos.contactados, color: "bg-amber-500" },
                      { etapa: "Sin contactar",  dato: resumenCarritos.sinContactar, color: "bg-gray-300" },
                    ].map(({ etapa, dato, color }) => {
                      const pct = Math.round((dato.cantidad / resumenCarritos.cantidad) * 100);
                      return (
                        <div key={etapa}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
                              <span className="text-gray-700 truncate">{etapa}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-gray-900">{dato.cantidad}</span>
                              <span className="w-8 text-right text-xs text-gray-400">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100">
                            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {resumenCarritos.sinContactar.cantidad > 0 && (
                    <Link href="/dashboard/carritos-abandonados" className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      Escribirle a los {resumenCarritos.sinContactar.cantidad} sin contactar →
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Cupones */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Ticket className="h-4 w-4 text-indigo-500 shrink-0" />
                  <h2 className="font-bold text-gray-900 truncate">Cupones</h2>
                </div>
                <span className="text-sm font-semibold text-gray-400 shrink-0">
                  {resumenCupones.usosTotales} uso{resumenCupones.usosTotales !== 1 ? "s" : ""}
                </span>
              </div>

              {resumenCupones.filas.length === 0 ? (
                <div className="py-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Sin usos en el período</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Acá vas a ver cuáles se usaron y cuánta plata resignaste con cada uno.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">−{money(resumenCupones.descuentoTotal)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">descontado en pedidos confirmados</p>
                  </div>
                  <BarrasRanking
                    filas={resumenCupones.filas.map((f) => ({
                      clave: f.id,
                      titulo: f.code,
                      sub: f.vencido ? `${f.etiqueta} · vencido` : f.etiqueta,
                      valor: f.usos,
                      pie: `−${money(f.descuento)}`,
                    }))}
                    color="bg-indigo-500"
                    unidad="uso"
                  />
                </>
              )}
            </div>

            {/* Promociones */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Percent className="h-4 w-4 text-emerald-500 shrink-0" />
                  <h2 className="font-bold text-gray-900 truncate">Promociones</h2>
                </div>
                <span className="text-sm font-semibold text-gray-400 shrink-0">
                  {resumenPromos.pedidosConPromo} pedido{resumenPromos.pedidosConPromo !== 1 ? "s" : ""}
                </span>
              </div>

              {resumenPromos.filas.length === 0 ? (
                <div className="py-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Sin promos aplicadas</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Cuando una promo entre en un pedido vas a ver acá cuál fue y cuánto te costó.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">−{money(resumenPromos.ahorroTotal)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      resignado en {resumenPromos.pedidosConPromo} pedido{resumenPromos.pedidosConPromo !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <BarrasRanking
                    filas={resumenPromos.filas.map((f) => ({
                      clave: f.clave,
                      titulo: f.etiqueta,
                      sub: null,
                      valor: f.pedidos,
                      pie: `−${money(f.ahorro)}`,
                    }))}
                    color="bg-emerald-500"
                    unidad="pedido"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Rentabilidad ── */}
        {isAutos ? (
          soldVehiclesPeriod.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
              <p className="text-sm text-gray-500">Sin vehículos vendidos en el período.</p>
            </div>
          ) : soldVehiclesWithGastos.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
              <p className="text-sm text-gray-500">
                Cargá los gastos de tus vehículos vendidos para ver la ganancia acá.{" "}
                <Link href="/dashboard/productos" className="text-indigo-600 font-semibold hover:underline">Ir a Productos</Link>
              </p>
            </div>
          ) : (
            /* Una por renglón en angosto. Estas dos no son como las tarjetas de
               arriba: sus etiquetas son frases enteras ("Ganancia promedio por
               vehículo vendido") y encima llevan una línea de detalle abajo. En
               media pantalla la etiqueta sola se comía cuatro renglones. */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KPICard
                label="Ganancia total del período"
                value={money(totalVehicleProfit)}
                sub={`${soldVehiclesWithGastos.length} de ${soldVehiclesPeriod.length} vehículo${soldVehiclesPeriod.length !== 1 ? "s" : ""} vendido${soldVehiclesPeriod.length !== 1 ? "s" : ""} con gastos cargados`}
                icon={Wallet}
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <KPICard
                label="Ganancia promedio por vehículo vendido"
                value={avgVehicleProfit !== null ? money(avgVehicleProfit) : "—"}
                icon={TrendingUp}
                iconBg="bg-indigo-50 text-indigo-600"
              />
            </div>
          )
        ) : profitCurrentAgg.totalNetRevenueKnownCost === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
            <p className="text-sm text-gray-500">
              Cargá el costo de tus productos para ver tu rentabilidad acá.{" "}
              <Link href="/dashboard/productos" className="text-indigo-600 font-semibold hover:underline">Ir a Productos</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KPICard
                label={`Ganancia bruta (${RANGE_LABELS[rangeDays]})`}
                value={money(profitCurrentAgg.totalProfit)}
                sub={profitDiff === null ? "Sin datos del período anterior" : undefined}
                trend={profitDiff}
                icon={Wallet}
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <KPICard
                label="Margen promedio"
                value={marginPctPeriod !== null ? `${marginPctPeriod.toFixed(0)}%` : "—"}
                sub={`${costCoveragePct}% de tus ventas del período tienen costo cargado`}
                icon={TrendingUp}
                iconBg="bg-indigo-50 text-indigo-600"
              />
            </div>

            {/* #7c — el envío bonificado, restado a la vista. Solo aparece si de
                verdad se regaló algún envío en el período: una tienda sin promos
                de envío no tiene por qué ver una fila en cero. */}
            {shippingWaivedPeriod > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-gray-900">Envíos que regalaste</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Lo que te costaron los envíos bonificados por tus promociones. No se lo cobraste al cliente, pero lo pagaste vos.
                    </p>
                  </div>
                  <p className="text-xl font-black text-rose-600">−{money(shippingWaivedPeriod)}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700">Ganancia después de los envíos</p>
                  <p className="text-xl font-black text-gray-900">{money(profitCurrentAgg.totalProfit - shippingWaivedPeriod)}</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <h2 className="font-bold text-gray-900">Ganancia diaria</h2>
                  <p className="shrink-0 text-xl font-black text-violet-600">{money(profitCurrentAgg.totalProfit)}</p>
                </div>
                <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días — solo ventas con costo cargado</p>
                <LineChart data={profitChartData} color="#7c3aed" gradId="grad-violet" formatter={shortMoney} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h2 className="font-bold text-gray-900 mb-5">Rentabilidad por producto</h2>
                {profitByProductRanked.length === 0 ? (
                  <p className="text-sm text-gray-500">Ningún producto vendido en el período tiene costo cargado todavía.</p>
                ) : (
                  <div className="space-y-3">
                    {profitByProductRanked.map(([productId, p]) => (
                      <div key={productId} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-gray-800 truncate">{nameMap[productId] ?? "Producto eliminado"}</span>
                          {p.hasCoupon && (
                            <span title="Incluye pedidos con cupón — ganancia parcialmente estimada">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-600 shrink-0">{money(p.profit ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {productsWithoutCostCount > 0 && (
                  <p className="mt-4 text-xs text-gray-400">
                    {productsWithoutCostCount} producto{productsWithoutCostCount !== 1 ? "s" : ""} vendido{productsWithoutCostCount !== 1 ? "s" : ""} sin costo cargado no aparece{productsWithoutCostCount === 1 ? "" : "n"} en el ranking.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
