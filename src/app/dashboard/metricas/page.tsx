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
  resumirCarritos, resumirCupones, resumirPromos, compararCompra, MINIMO_PARA_COMPARAR,
  resumirJuego, elegirCampanas,
  type CarritoCrudo, type CuponCrudo, type GiroCrudo,
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
import { aggregateProfitability, calcVehicleProfit, gananciaPorPedido, type ProfitOrderItem } from "@/lib/margin";
import { resumirDias, diaDeLaSemana, fechaCorta, type DiaCrudo } from "@/lib/dia-a-dia";
import { ordenarOrigenes, ORIGENES, NOMBRE_ORIGEN, type Origen } from "@/lib/origen-visita";
import { armarEmbudo, MINIMO_PARA_SENALAR } from "@/lib/embudo";

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

/* ── Cuánto entra en pantalla y cuánto en el papel ────────────────────────────
   En pantalla los rankings son un podio: cinco filas, y para el resto hay un
   link a la pantalla de esa función. En una tarjeta de 296px en un teléfono no
   hay otra.

   En papel esa salida no existe. No hay adónde hacer clic ni dónde scrollear, y
   un "y 12 más →" impreso es tinta muerta: el informe nombra doce campañas que
   después no se pueden mirar. Peor todavía, el recorte es por ranking, así que
   lo primero que se cae del PDF es lo que menos rindió — justo lo único sobre lo
   que hay algo para hacer.

   Por eso el papel se expande. No hasta el infinito: hasta TOPE_PAPEL, y después
   se dice cuántas quedaron afuera. Un PDF de ochenta páginas tampoco lo lee
   nadie. */
const TOPE_PANTALLA = 5;
const TOPE_PAPEL = 30;

/** El de Rentabilidad por producto, que en pantalla siempre mostró 8. */
const TOPE_PANTALLA_RENTABILIDAD = 8;

/**
 * Desde cuándo el "día" de una visita es el día argentino y no el UTC.
 *
 * Las filas de `StoreView` anteriores no se pueden reclasificar —guardan fecha y
 * cantidad, sin hora, así que repartirlas sería inventar a qué hora pasó cada
 * visita—. En pantalla no hace falta decirlo porque casi nadie mira tan atrás;
 * en un PDF archivado sí, porque ahí el número queda solo y se lo va a comparar
 * contra otro. Está documentado en METRICAS.md, sección 6.
 */
const INICIO_DIA_ARGENTINO = "2026-07-29";

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
  // El lienzo se achicó de 580 a 440 de ancho.
  //
  // Un `viewBox` no es un tamaño, es una proporción: el SVG entero se estira o
  // se encoge para entrar en el ancho que le dé el contenedor, y el texto se
  // achica con él. Con 580 metidos en la tarjeta de un teléfono —unos 296px—
  // todo quedaba a poco más de la MITAD de tamaño, y por eso las fechas del eje
  // se leían como motas por más que se les subiera la tipografía.
  //
  // Con 440 la reducción es mucho menor y el texto sobrevive. La única
  // consecuencia es que el gráfico queda un poco menos apaisado en pantalla
  // grande, que para una curva no cambia nada.
  const W = 440, H = 180;
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
    /* Sin `min-w` y sin scroll lateral. El `min-w-[320px]` obligaba al SVG a
       medir 320 dentro de una tarjeta de ~296 en un teléfono, así que el
       gráfico se pasaba del ancho y había que arrastrarlo para ver la parte
       derecha. Un gráfico que no entra en su tarjeta se lee como algo roto, y
       arrastrarlo de costado es lo último que alguien va a intentar. Con
       `w-full` a secas el SVG se adapta al ancho que haya, siempre. */
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
   etiqueta, el número, una barra proporcional y —abajo— lo que trajo y lo que
   costó.

   Un solo color para todas las filas, no uno por fila. Acá se compara CUÁNTO
   —una magnitud— entre cosas de la misma lista; darle a cada cupón su propio
   color sugeriría que el color significa algo, y no significa nada. La longitud
   de la barra ya es la comparación.

   La barra se mide contra el MÁXIMO de la lista y no contra el total: con cinco
   filas parejas, medir contra el total deja cinco barras de 20% que no se
   distinguen entre sí. Contra el máximo, la primera llena y el resto se lee en
   proporción a ella, que es la pregunta real ("¿cuánto más que el que le sigue?").

   El número va SIEMPRE escrito al lado, no sólo en la barra: es lo que hace que
   la tarjeta se pueda leer sin depender del color ni del largo.

   Los montos van en un renglón propio abajo de la barra, y no apretados a su
   derecha como estaba antes. Antes ahí iba un solo número —lo que el cupón
   costó— y entraba justo; con tres, en una tarjeta de ~296px de un teléfono, la
   barra se quedaba sin lugar y los montos se partían. En su propio renglón usan
   todo el ancho y de paso la barra queda entera, que es lo que se compara de un
   vistazo.

   Y son TRES montos porque uno solo no responde nada, y dos tampoco alcanzan:

     - "te costó $12.000" puede ser el mejor cupón del mes o el peor;
     - "trajo $180.000" tampoco cierra, porque facturar mucho con margen chico
       deja menos que facturar poco con margen grande.

   El que decide es "te dejó", y por eso va primero y es el único en negro. Los
   otros dos quedan al lado en gris: explican de dónde sale, sin competirle.

   Cuando falta el costo de los productos, "te dejó" NO se muestra como cero: se
   dice que falta el dato. Un cero se lee como "no ganaste nada", que es una
   afirmación, y acá lo cierto es que no se sabe. */
function BarrasRanking({
  filas, color, unidad, href, cta, medida,
}: {
  filas: {
    clave: string; titulo: string; sub: string | null; valor: number;
    /** Lo que facturaron los pedidos donde entró. */
    trajo: number;
    /** Lo que resignaste para que entrara. */
    costo: number;
    /** Lo que quedó después del costo de los productos. `null` = no se sabe. */
    dejo: number | null;
    /** Pedidos del grupo sin costo cargado: con esto > 0, `dejo` se queda corto. */
    pedidosSinCosto: number;
  }[];
  color: string;
  unidad: string;
  /**
   * Qué mide la barra. Tiene que ser lo MISMO por lo que está ordenada la lista.
   *
   * Antes la barra medía siempre la cantidad de usos mientras el número en
   * negrita de abajo era la ganancia: dos magnitudes distintas en la misma fila.
   * La fila más larga no era la que más dejó, y la barra —que es lo que se lee
   * de un vistazo— apuntaba al lado equivocado.
   */
  medida: "ganancia" | "usos";
  /** A dónde mandar cuando la lista no entra. Sin esto el "y N más" es un callejón. */
  href: string;
  cta: string;
}) {
  // La barra mide lo mismo por lo que está ordenada la lista. Con ganancia
  // desconocida o negativa la barra queda vacía y no en algún largo inventado:
  // la fila igual muestra su texto, que es donde dice qué pasó.
  const magnitud = (f: { valor: number; dejo: number | null }) =>
    medida === "ganancia" ? Math.max(0, f.dejo ?? 0) : f.valor;
  const maximo = Math.max(...filas.map(magnitud), 1);
  return (
    <div className="space-y-4">
      {/* Cinco en pantalla, hasta TOPE_PAPEL al imprimir. El máximo de la barra
          sale de la lista entera, así que las filas que sólo salen en el PDF
          quedan a la misma escala que las de arriba y se pueden comparar. */}
      {filas.slice(0, TOPE_PAPEL).map((f, i) => {
        const pct = Math.round((magnitud(f) / maximo) * 100);
        return (
          <div key={f.clave} className={i >= TOPE_PANTALLA ? "hidden print:block" : undefined}>
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
            <div className="h-1.5 rounded-full bg-gray-100">
              <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400 tabular-nums">
              {f.dejo !== null ? (
                <>
                  Te dejó <span className="font-bold text-gray-900">{money(f.dejo)}</span>
                  {f.pedidosSinCosto > 0 && (
                    <span className="text-amber-600">
                      {" "}(de {f.valor - f.pedidosSinCosto} de {f.valor} — al resto le falta el costo)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-600">Sin el costo cargado no se puede saber la ganancia</span>
              )}
              <br />
              Trajo {money(f.trajo)} · descontaste {money(f.costo)}
            </p>
          </div>
        );
      })}
      {/* El podio son 5 y el resto se ve en su pantalla. Antes acá decía "y N más"
          y no llevaba a ningún lado: la tarjeta mide unos 296px en un teléfono,
          así que meterle cuarenta filas no es una opción — pero dejar el número
          suelto sin salida es peor, porque nombra algo que después no se puede
          mirar.

          El `print:hidden` va en el párrafo entero y no sólo en el link: si se
          escondía nada más el link, el papel terminaba en "y 12 más ·" colgando
          de un separador que no separa nada. */}
      {filas.length > TOPE_PANTALLA && (
        <p className="pt-1 text-xs text-gray-400 print:hidden">
          y {filas.length - TOPE_PANTALLA} más ·{" "}
          <Link href={href} className="font-semibold text-indigo-600 hover:text-indigo-700">
            {cta} →
          </Link>
        </p>
      )}
      {filas.length > TOPE_PAPEL && (
        <p className="hidden print:block pt-1 text-xs text-gray-400">
          y {filas.length - TOPE_PAPEL} más, que no entraron en el informe.
        </p>
      )}
    </div>
  );
}

/* ── Las tres palabras ───────────────────────────────────────────────────────
   La aclaración de qué es cada monto, arriba del ranking y SIEMPRE visible.

   No va como globito de ayuda: los tooltips de este panel se abren con el mouse
   encima, y en un teléfono eso no existe. Una explicación que en el celular no
   se puede abrir es una explicación que no está.

   Es corta a propósito. Tres renglones que se leen una vez y no se vuelven a
   mirar valen más que un párrafo que se saltea siempre. */
function QueEsCada({ unidad }: { unidad: string }) {
  return (
    <div className="mb-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-500">
      <p><span className="font-semibold text-gray-700">Trajo</span> — lo que facturaron esos {unidad}.</p>
      <p><span className="font-semibold text-gray-700">Descontaste</span> — lo que resignaste para que entraran.</p>
      <p><span className="font-semibold text-gray-700">Te dejó</span> — lo que quedó después del costo de los productos y del descuento. Es el que decide.</p>
    </div>
  );
}

/* ── Lo que no se usó ────────────────────────────────────────────────────────
   El bloque que va al pie de Cupones y Promociones con lo que estuvo disponible
   y no entró en ningún pedido.

   Es la mitad que faltaba. El ranking de arriba sólo puede mostrar lo que se
   usó, o sea que sólo sabe felicitar: la campaña que no funcionó desaparecía de
   la pantalla justo cuando había que decidir si apagarla o cambiarla. Y esa es
   la única de las dos sobre la que hay algo para hacer.

   Gris y en letra chica a propósito: es un dato para revisar, no una alarma.
   Pintarlo de rojo trataría a un cupón recién creado como si fuera un problema. */
function SinUsar({ titulo, items, href, cta }: {
  titulo: string; items: string[]; href: string; cta: string;
}) {
  if (items.length === 0) return null;
  const MOSTRAR = 4;
  return (
    <div className="mt-5 border-t border-gray-100 pt-3.5">
      <p className="text-xs font-semibold text-gray-500">{titulo}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-400 break-words">
        <span className="print:hidden">
          {items.slice(0, MOSTRAR).join(" · ")}
          {items.length > MOSTRAR && ` · y ${items.length - MOSTRAR} más`}
        </span>
        {/* En papel la lista entera: acá lo que importa es justamente lo que
            está de más, y "y 9 más" sin el link es un dato que no se puede usar. */}
        <span className="hidden print:inline">
          {items.slice(0, TOPE_PAPEL).join(" · ")}
          {items.length > TOPE_PAPEL && ` · y ${items.length - TOPE_PAPEL} más`}
        </span>
      </p>
      <Link href={href} className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700 print:hidden">
        {cta} →
      </Link>
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
  // `couponId` y `subtotal` son para comparar el tamaño de la compra con cupón
  // contra sin cupón. Van acá y no en una query nueva: es la misma lista de
  // pedidos del período que ya se estaba trayendo.
  let ordersPeriod: { total: number; subtotal: number; couponId: string | null; status: string; createdAt: Date }[] = [];
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
  // En crudo: la ganancia de cada pedido no viene de estas queries sino de los
  // ítems, así que se junta más abajo y recién ahí se arman los tipos finales.
  let pedidosConCuponRaw: {
    id: string; couponId: string | null; discountAmount: number; total: number;
    coupon: { winnerEmail: string | null } | null;
  }[] = [];
  let pedidosConPromoRaw: { id: string; promoSummary: string | null; total: number }[] = [];
  let promosActivasRaw: { name: string }[] = [];
  // Los giros de la ruleta del período. `GamificationSpin` se venía guardando en
  // cada jugada y no se leía en ninguna pantalla: la ruleta era la única función
  // del panel sin una sola medición.
  let girosRaw: GiroCrudo[] = [];
  let juegoWidget: { type: string; isActive: boolean } | null = null;

  if (!isAutos) {
    [
      ordersPeriod, revenuePrevAgg, ordersPrevCount, topProducts, ordersByStatus,
      carritosRaw, cuponesRaw, pedidosConCuponRaw, pedidosConPromoRaw, promosActivasRaw,
      girosRaw, juegoWidget,
      ordersPrevConfirmedCount, sinDespacharAgg,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, createdAt: { gte: periodStart, lt: periodEndExclusive }, status: { not: "CANCELLED" } },
        select: { total: true, subtotal: true, couponId: true, status: true, createdAt: true },
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
        // Se traen los del papel, no los de la pantalla: el PDF muestra la lista
        // larga y con `take: 5` no había de dónde sacarla. Son 30 filas de un
        // groupBy que ya se estaba haciendo, no una query más.
        take: TOPE_PAPEL,
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

      // `isActive` y `winnerEmail` no son decorado: el primero decide si un cupón
      // sin usar es "una campaña que no funcionó" o "una que ya apagaste", y el
      // segundo separa tus cupones de los premios que entregó la ruleta.
      // Sólo los cupones PROPIOS. Antes se traían todos, y los premios de la
      // ruleta son uno por ganador y no vencen del listado nunca: una tienda con
      // la ruleta andando junta miles, y se leían enteros en cada carga de esta
      // pantalla. El plan acota los propios; los premios no los acota nadie.
      //
      // Lo único que hacía falta de ellos —si el pedido usó un premio— ahora
      // viene marcado desde el pedido, que ya se estaba trayendo igual.
      prisma.coupon.findMany({
        where: { storeId: store.id, winnerEmail: null },
        select: {
          id: true, code: true, label: true, discountType: true, discountValue: true,
          expiresAt: true, isActive: true, createdAt: true,
        },
      }),

      // Sólo pedidos CONFIRMADOS: un cupón usado en un pedido que después se cayó
      // no descontó plata de verdad, y el resto de la pantalla también mide sobre
      // confirmados. Si contáramos los pendientes, el bloque diría que resignaste
      // plata que nunca resignaste.
      //
      // `total` es lo que hace que el bloque pueda comparar: sin él sólo se sabe
      // lo que cada cupón COSTÓ, y un cupón caro que trae mucho se ve idéntico a
      // uno caro que no trae nada.
      prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: periodStart, lt: periodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
          couponId: { not: null },
        },
        select: { id: true, couponId: true, discountAmount: true, total: true, coupon: { select: { winnerEmail: true } } },
      }),

      prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: periodStart, lt: periodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
          promoSummary: { not: null },
        },
        select: { id: true, promoSummary: true, total: true },
      }),

      // Las promos que estuvieron vivas en el período — para saber cuáles NO se
      // aplicaron nunca. Se filtra por solapamiento con la ventana y no por
      // "activa hoy": una programada para el mes que viene todavía no falló, y
      // una que terminó antes del período no tiene por qué aparecer.
      prisma.storePromotion.findMany({
        where: {
          storeId: store.id,
          isActive: true,
          archivedAt: null,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lt: periodEndExclusive } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: periodStart } }] },
          ],
        },
        select: { name: true },
      }),

      // Se filtra por la tienda a través de la relación, así no hace falta
      // buscar antes el id del widget: una query en vez de dos.
      prisma.gamificationSpin.findMany({
        where: {
          widget: { storeId: store.id },
          createdAt: { gte: periodStart, lt: periodEndExclusive },
        },
        select: { email: true, prizeLabel: true, isNoPrize: true, couponId: true },
      }),
      prisma.gamificationWidget.findUnique({
        where: { storeId: store.id },
        select: { type: true, isActive: true },
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

  // Los de cupones y promos van más abajo, después de la rentabilidad: necesitan
  // la ganancia de cada pedido, y esa sale de los ítems.

  // ── Rentabilidad (no-AUTOS) ── Una sola query que cubre período actual + anterior
  // (misma ventana doble que ya usa el resto de la página) para no duplicar el pedido a la DB.
  let profitCurrentAgg = aggregateProfitability([]);
  let profitPrevTotalProfit = 0;
  // Ganancia real de cada pedido, para poder decir cuánto DEJÓ cada cupón y cada
  // promo y no sólo cuánto facturaron. Sale de los mismos ítems que ya se traen
  // acá: no hay una query más por esto.
  let gananciaDePedido = new Map<string, number | null>();
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
        orderId: true,
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
    gananciaDePedido = gananciaPorPedido(
      rawProfitItems.map((it) => ({
        orderId: it.orderId, quantity: it.quantity, price: it.price,
        lineTotal: it.lineTotal, costAtSale: it.costAtSale,
        orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount,
      }))
    );
  }

  // ── Marketing, ahora sí: cupones y promociones con su ganancia ──
  const resumenCupones = resumirCupones(
    cuponesRaw,
    pedidosConCuponRaw.map((o) => ({
      couponId: o.couponId,
      discountAmount: o.discountAmount,
      total: o.total,
      ganancia: gananciaDePedido.get(o.id) ?? null,
      esPremio: o.coupon?.winnerEmail != null,
    })),
    now,
    periodStart
  );
  const resumenPromos = resumirPromos(
    pedidosConPromoRaw.map((o) => {
      const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(o.promoSummary);
      return {
        applied: appliedPromos,
        freeShipping: freeShippingPromo,
        total: o.total,
        ganancia: gananciaDePedido.get(o.id) ?? null,
      };
    }),
    promosActivasRaw.map((p) => p.name)
  );

  // La ruleta. Se pregunta SÓLO por los cupones de los giros de este período, no
  // por todos los premios que la tienda entregó en su vida: así la consulta queda
  // acotada por la cantidad de jugadas y no crece para siempre.
  //
  // `usedCount` es histórico y acá está bien que lo sea: un premio ganado el día
  // 28 se puede canjear el 32, y recortarlo al período lo contaría como no
  // canjeado para siempre.
  const idsPremiados = girosRaw.map((g) => g.couponId).filter((id): id is string => id !== null);
  const premiosCanjeados = idsPremiados.length
    ? await prisma.coupon.findMany({
        where: { id: { in: idsPremiados }, usedCount: { gt: 0 } },
        select: { id: true },
      })
    : [];
  const resumenJuego = resumirJuego(girosRaw, new Set(premiosCanjeados.map((c) => c.id)));

  // ¿La gente que usa cupón compra más que la que no? Sobre pedidos CONFIRMADOS,
  // los mismos que cuenta el resto de la pantalla.
  const comparacionCompra = compararCompra(
    ordersPeriod
      .filter((o) => CONFIRMED_ORDER_STATUSES.includes(o.status))
      .map((o) => ({ couponId: o.couponId, subtotal: o.subtotal }))
  );

  // El bloque entero se esconde si no hay NADA que contar. Tres tarjetas vacías
  // seguidas no informan: sólo hacen scrollear.
  //
  // "Nada que contar" ahora incluye lo que NO pasó: un cupón vigente que nadie
  // usó y una promo que no se aplicó nunca son motivo suficiente para mostrar el
  // bloque. Antes, una tienda con tres campañas fallidas y cero usos veía la
  // pantalla como si no tuviera marketing — justo el caso donde más hacía falta.
  const hayMarketing =
    resumenCarritos.cantidad > 0 ||
    resumenCupones.filas.length > 0 || resumenCupones.sinUsar.length > 0 ||
    resumenCupones.ruleta.usos > 0 ||
    resumenPromos.filas.length > 0 || resumenPromos.sinUsar.length > 0 ||
    juegoWidget !== null;

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
  /** De dónde vinieron, del período. Vacío hasta que corra la migración. */
  let origenesRaw: { source: string; _sum: { count: number | null } }[] = [];
  /** Los dos pasos del embudo que se registran desde el navegador. */
  let pasosRaw: { step: string; _sum: { count: number | null } }[] = [];
  try {
    [viewsPrevAgg, viewsPeriodRaw, origenesRaw, pasosRaw] = await Promise.all([
      prisma.storeView.aggregate({
        where: { storeId: store.id, date: { gte: prevPeriodStartStr, lte: prevPeriodEndStr } },
        _sum: { count: true },
      }),
      prisma.storeView.findMany({
        where: { storeId: store.id, date: { gte: periodStartStr } },
        select: { date: true, count: true },
        orderBy: { date: "asc" },
      }),
      // ── Las dos tablas nuevas, cada una con SU PROPIO catch ──
      // No es prolijidad: `Promise.all` se cae entero si una sola promesa falla,
      // así que sin esto una tabla que todavía no existe —entre que se mergea y
      // que corre la migración— también se llevaba puestas las dos queries de
      // arriba, y el gráfico de visitas y la comparación contra el período
      // anterior aparecían en CERO. Un error de una función nueva apagando un
      // número viejo que funcionaba bien, y sin nada en pantalla que lo dijera.
      //
      // Con el catch propio, lo único que falta es la tarjeta nueva.

      // Diez filas como mucho: `source` sale de una lista cerrada de diez
      // etiquetas, así que el groupBy no puede crecer con el volumen.
      prisma.storeViewSource
        .groupBy({
          by: ["source"],
          where: { storeId: store.id, date: { gte: periodStartStr } },
          _sum: { count: true },
        })
        .catch(() => [] as typeof origenesRaw),
      // Dos filas: los pasos también salen de una lista cerrada.
      prisma.storeFunnelStep
        .groupBy({
          by: ["step"],
          where: { storeId: store.id, date: { gte: periodStartStr } },
          _sum: { count: true },
        })
        .catch(() => [] as typeof pasosRaw),
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

  // ── El día a día ──
  // Vivía sólo en el CSV. En pantalla estaban las curvas, que muestran la forma
  // pero no dejan responder "¿cuánto vendí el 14?".
  const pedidosPorDia = new Map<string, number>();
  const ingresosPorDia = new Map<string, number>();
  for (const o of ordersPeriod) {
    const d = diaArgentino(o.createdAt);
    pedidosPorDia.set(d, (pedidosPorDia.get(d) ?? 0) + 1);
    if (CONFIRMED_ORDER_STATUSES.includes(o.status)) {
      ingresosPorDia.set(d, (ingresosPorDia.get(d) ?? 0) + o.total);
    }
  }
  const visitasPorDia = new Map(viewsPeriodRaw.map((v) => [v.date, v.count]));
  const diasDelPeriodo: DiaCrudo[] = Array.from({ length: rangeDays }, (_, i) => {
    const d = sumarDiasCalendario(periodStartStr, i);
    return {
      dia: d,
      ingresos: ingresosPorDia.get(d) ?? 0,
      pedidos: pedidosPorDia.get(d) ?? 0,
      visitas: visitasPorDia.get(d) ?? 0,
      // `has` y no `?? null`: un día con costo cargado y ganancia 0 es un dato,
      // y tratarlo como "no se sabe" sería perderlo.
      ganancia: profitCurrentAgg.dailyProfit.has(d) ? profitCurrentAgg.dailyProfit.get(d)! : null,
    };
  });
  const resumenDias = resumirDias(diasDelPeriodo);


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

  // ── De dónde vino la gente ──
  // Los porcentajes van sobre las visitas CON origen conocido y no sobre el
  // total: durante el primer período después de este cambio, y en cualquier día
  // en que la escritura del origen falle, el total es más grande. Dividir por él
  // achicaría todos los canales a la vez y daría la impresión de que la tienda
  // se cayó, cuando lo único que falta es la etiqueta.
  //
  // La diferencia entre los dos números no se esconde: la tarjeta la dice.
  const origenes = ordenarOrigenes(
    origenesRaw
      .filter((o): o is typeof o & { source: Origen } => (ORIGENES as readonly string[]).includes(o.source))
      .map((o) => ({ origen: o.source as Origen, visitas: o._sum.count ?? 0 }))
      .filter((o) => o.visitas > 0)
  );
  const visitasConOrigen = origenes.reduce((s, o) => s + o.visitas, 0);
  /**
   * El canal más grande que se puede mover. "Directo" suele ser el más grande de
   * todos y no sirve de titular: nadie decide invertir más en directo, y con el
   * agujero de WhatsApp encima está inflado a propósito.
   */
  const canalPrincipal = origenes.find((o) => o.origen !== "directo" && o.origen !== "otro") ?? null;
  const visitasDirectas = origenes.find((o) => o.origen === "directo")?.visitas ?? 0;

  // ── El embudo ──
  // Cuatro de los seis escalones ya estaban en la base y nadie los había puesto
  // uno abajo del otro: las visitas, los carritos con email, los pedidos y los
  // pedidos confirmados. Los dos del medio son los nuevos.
  const pasoCarrito = pasosRaw.find((p) => p.step === "carrito")?._sum.count ?? 0;
  const pasoCheckout = pasosRaw.find((p) => p.step === "checkout")?._sum.count ?? 0;
  const embudo = armarEmbudo(
    {
      entro: totalViewsPeriod,
      carrito: pasoCarrito,
      checkout: pasoCheckout,
      // `AbandonedCart` no es sólo "los que abandonaron": la fila se crea apenas
      // escriben un email válido en el checkout y se le marca `recoveredAt` si
      // después compran. O sea que son todos los que llegaron a dejar sus datos,
      // que es justo el escalón que hace falta acá.
      datos: carritosRaw.length,
      pedido: totalOrdersPeriod,
      pago: confirmedOrdersPeriod.length,
    },
    // Sin ninguno de los dos pasos nuevos el embudo tiene un agujero en el medio
    // y hay que decirlo, en vez de mostrar un salto de visitas a datos como si
    // fuera el recorrido completo.
    pasoCarrito === 0 && pasoCheckout === 0
  );

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
  // Se cortan los del papel; la pantalla después esconde del 9 en adelante.
  const profitByProductRanked = [...profitCurrentAgg.byProduct.entries()]
    .filter(([, p]) => p.profit !== null)
    .sort((a, b) => (b[1].profit ?? 0) - (a[1].profit ?? 0))
    .slice(0, TOPE_PAPEL);
  /** Cuántos quedaron con ganancia conocida, cortados o no: para poder avisarlo. */
  const profitByProductTotal = [...profitCurrentAgg.byProduct.values()].filter((p) => p.profit !== null).length;
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
    // El resumen hablaba de cómo te fue VENDIENDO y no decía nada de lo que
    // hiciste para vender: la conclusión de las tarjetas de marketing había que
    // sacarla a ojo, bajando y comparando. Ahora la dice.
    marketing: {
      ...elegirCampanas(resumenCupones.filas, resumenPromos.filas),
      cuponesSinUsar: resumenCupones.sinUsar.length,
      promosSinUsar: resumenPromos.sinUsar.length,
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

        {/* ── El embudo ───────────────────────────────────────────────────────
            Hasta acá el panel tenía los dos extremos —visitas arriba, pedidos
            abajo— y una división entre los dos llamada "conversión". Con eso se
            sabe que de cada cien compran dos, y nada sobre las otras noventa y
            ocho: si no encontraron nada, si el envío las espantó, o si llenaron
            todo el formulario y se cayeron al pagar. Son tres problemas
            distintos y ninguno se arregla igual.

            La conclusión va arriba y sólo cuando hay con qué. En un embudo
            siempre hay un escalón que pierde más que los otros: nombrarlo
            porque sí manda a la dueña a arreglar algo que no está roto. */}
        {!isAutos && totalViewsPeriod > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
            <h2 className="font-bold text-gray-900">Dónde se te cae la gente</h2>

            {embudo.peorCaida ? (
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                El escalón donde más gente se te cae de más es{" "}
                <span className="font-bold text-gray-900">
                  &quot;{embudo.peorCaida.titulo.toLowerCase()}&quot;
                </span>
                : llegaron{" "}
                {(embudo.peorCaida.cantidad + embudo.peorCaida.perdidos).toLocaleString("es-AR")} y
                siguieron <span className="font-bold text-gray-900">{embudo.peorCaida.cantidad.toLocaleString("es-AR")}</span>.
                {" "}En una tienda parecida pasarían más o menos el {100 - embudo.peorCaida.caidaNormalPct}%,
                {" "}y acá pasa el {embudo.peorCaida.pctDelAnterior}%.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {totalViewsPeriod < MINIMO_PARA_SENALAR
                  ? `Con ${totalViewsPeriod} visitas todavía no alcanza para decir dónde se cae la gente: cualquier diferencia de dos personas da un porcentaje enorme y no quiere decir nada.`
                  : "Ningún escalón se cae mucho más de lo normal. El recorrido de abajo es el detalle."}
              </p>
            )}

            <div className="mt-5 space-y-3">
              {embudo.escalones.map((e) => {
                const ancho = embudo.escalones[0].cantidad > 0
                  ? Math.round((e.cantidad / embudo.escalones[0].cantidad) * 100)
                  : 0;
                const señalado = embudo.peorCaida?.clave === e.clave;
                return (
                  <div key={e.clave}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className={señalado ? "font-bold text-gray-900" : "font-medium text-gray-700"}>
                        {e.titulo}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                        <span className="font-bold text-gray-900">{e.cantidad.toLocaleString("es-AR")}</span>
                        {e.pctDelAnterior !== null && ` · ${e.pctDelAnterior}% de los de arriba`}
                      </span>
                    </div>
                    {/* La barra se ve aunque sea diminuta: un escalón en 0,2% con
                        ancho 0 se lee como que no existe, y existe. */}
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${señalado ? "bg-rose-500" : "bg-indigo-500"}`}
                        style={{ width: e.cantidad > 0 ? `${Math.max(ancho, 1)}%` : "0%" }}
                      />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {e.detalle}
                      {e.perdidos > 0 && (
                        <span className={señalado ? "font-semibold text-rose-600" : ""}>
                          {" "}Se cayeron {e.perdidos.toLocaleString("es-AR")}.
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Las dos cosas que cambian cómo se lee todo lo de arriba. */}
            <div className="mt-5 space-y-2 border-t border-gray-100 pt-3.5 text-xs leading-relaxed text-gray-500">
              {embudo.faltanPasosNuevos && (
                <p>
                  <span className="font-semibold text-gray-700">Los dos escalones del medio recién empezaron a medirse.</span>{" "}
                  Hasta que pase gente nueva por la tienda van a estar en cero, y el salto de
                  las visitas a los datos va a parecer más grande de lo que es.
                </p>
              )}
              <p>
                <span className="font-semibold text-gray-700">Los porcentajes son aproximados.</span>{" "}
                Los tres primeros escalones cuentan una vez por navegador por día, los datos
                una vez por persona, y los dos últimos una vez por pedido. Alguien que entra
                el lunes y compra el jueves suma arriba un día y abajo otro. Sirve para ver
                dónde está el problema, no para hacer cuentas exactas.
              </p>
            </div>
          </div>
        )}

        {/* ── De dónde viene la gente ─────────────────────────────────────────
            La tarjeta que faltaba desde siempre. Hasta acá el panel sabía
            cuántas visitas hubo y ninguna otra cosa: "¿esto lo trajo Instagram
            o el WhatsApp que mandé?" no se podía contestar, y es la primera
            pregunta que hace cualquiera que vende por internet.

            Empieza a medir el día que se prende, así que los primeros días la
            tarjeta va a estar casi vacía. Eso se dice, no se disimula: un
            desglose de tres visitas presentado como si fuera el mapa de la
            tienda hace tomar decisiones sobre nada. */}
        {!isAutos && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
            <div className="flex items-center justify-between gap-3 mb-0.5">
              <h2 className="font-bold text-gray-900">De dónde viene la gente</h2>
              {visitasConOrigen > 0 && (
                <p className="shrink-0 text-xl font-black text-blue-600">
                  {visitasConOrigen.toLocaleString("es-AR")}
                </p>
              )}
            </div>

            {visitasConOrigen === 0 ? (
              <>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  Todavía no hay ninguna visita con origen. Esto se empezó a medir hace poco:
                  las visitas anteriores quedaron sin etiqueta y no se pueden recuperar.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-gray-400">
                  Va a llenarse solo a medida que entre gente. No hay nada para configurar.
                </p>
              </>
            ) : (
              <>
                {/* La conclusión primero. El canal más grande que se puede mover,
                    no el más grande a secas: "directo" casi siempre gana y no se
                    puede hacer nada con eso. */}
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  {canalPrincipal ? (
                    <>
                      Lo que más gente te trae es{" "}
                      <span className="font-bold text-gray-900">{NOMBRE_ORIGEN[canalPrincipal.origen]}</span>
                      {": "}
                      <span className="font-bold text-gray-900">{canalPrincipal.visitas.toLocaleString("es-AR")}</span>
                      {" "}de {visitasConOrigen.toLocaleString("es-AR")} visitas
                      {" "}({Math.round((canalPrincipal.visitas / visitasConOrigen) * 100)}%).
                    </>
                  ) : (
                    <>
                      Toda la gente que entró llegó directo, sin pasar por ninguna red.
                      Abajo está por qué eso casi nunca es del todo cierto.
                    </>
                  )}
                </p>

                <div className="mt-4 space-y-3">
                  {origenes.map((o) => {
                    const pct = Math.round((o.visitas / visitasConOrigen) * 100);
                    const bolsa = o.origen === "directo" || o.origen === "otro";
                    return (
                      <div key={o.origen}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                          <span className={bolsa ? "text-gray-500" : "font-medium text-gray-700"}>
                            {NOMBRE_ORIGEN[o.origen]}
                          </span>
                          <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                            <span className="font-bold text-gray-900">{o.visitas.toLocaleString("es-AR")}</span> · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full ${bolsa ? "bg-gray-300" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Los dos avisos que cambian cómo se lee todo lo de arriba. Van
                    siempre visibles y no en un globito: en un teléfono el hover
                    no existe, y una aclaración que no se puede abrir no está. */}
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-3.5 text-xs leading-relaxed text-gray-500">
                  {totalViewsPeriod > visitasConOrigen && (
                    <p>
                      De las <span className="font-semibold text-gray-700">{totalViewsPeriod.toLocaleString("es-AR")}</span> visitas
                      del período se sabe de dónde vinieron{" "}
                      <span className="font-semibold text-gray-700">{visitasConOrigen.toLocaleString("es-AR")}</span>.
                      Los porcentajes de arriba son sobre esas, no sobre el total.
                    </p>
                  )}
                  {visitasDirectas > 0 && (
                    <p>
                      <span className="font-semibold text-gray-700">&quot;Directo&quot; está inflado, y conviene saberlo.</span>{" "}
                      WhatsApp abre los links en un navegador que en la mayoría de los teléfonos
                      no dice de dónde viene, así que buena parte de esas {visitasDirectas.toLocaleString("es-AR")} visitas
                      salieron en realidad de un WhatsApp tuyo. Para que se cuenten bien, mandá
                      el link de tu tienda con <span className="font-mono text-gray-600">?utm_source=whatsapp</span> al
                      final. Lo mismo sirve para cualquier campaña.
                    </p>
                  )}
                  <p>
                    Esto cuenta <span className="font-semibold text-gray-700">visitas, no ventas</span>.
                    Que un canal traiga más gente no quiere decir que traiga más plata.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

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
            <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
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
                        <div key={p.productId} className={i >= TOPE_PANTALLA ? "hidden print:block" : undefined}>
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
              {/* El corte hay que decirlo. "Productos más vendidos" con cinco
                  filas y nada más se lee como que sólo se vendieron cinco: el
                  sexto no aparece y parece que no existió. En el PDF salen
                  todos y este aviso se va. */}
              {topProducts.length > TOPE_PANTALLA && (
                <p className="mt-4 text-xs text-gray-400 print:hidden">
                  Se muestran los {TOPE_PANTALLA} que más unidades vendieron.
                </p>
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
        {/* Dos columnas y no tres. Entró una tarjeta más —la ruleta— y con tres
            quedaba una huérfana en la segunda fila. Además las de cupones y
            promos crecieron: ahora cada fila lleva la ganancia y de dónde sale,
            y a un tercio de 1152px eso se parte en demasiados renglones. */}
        {!isAutos && hayMarketing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
            <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
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
                    Acá vas a ver cuáles se usaron, cuánto trajeron y cuánta plata resignaste con cada uno.
                  </p>
                </div>
              ) : (
                <>
                  {/* El titular es la GANANCIA, no lo facturado y mucho menos el
                      descuento. Era el descuento, y un número grande en negativo
                      hace leer la tarjeta como una pérdida: un cupón no es un
                      gasto, es plata que dejás para que entre otra. Facturado y
                      descuento pasan abajo, que es donde explican de dónde sale
                      el de arriba en vez de competirle. */}
                  <div className="mb-4">
                    {resumenCupones.gananciaTotal !== null ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900">
                          Te dejó {money(resumenCupones.gananciaTotal)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          de {money(resumenCupones.facturadoTotal)} facturados en {resumenCupones.usosTotales} pedido{resumenCupones.usosTotales !== 1 ? "s" : ""},
                          {" "}descontando {money(resumenCupones.descuentoTotal)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900">{money(resumenCupones.facturadoTotal)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          facturado en {resumenCupones.usosTotales} pedido{resumenCupones.usosTotales !== 1 ? "s" : ""} con cupón
                          {" · descontaste "}{money(resumenCupones.descuentoTotal)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
                          Cargá el costo de tus productos y acá vas a ver cuánto te dejaron de verdad.{" "}
                          <Link href="/dashboard/productos" className="font-semibold underline print:hidden">Ir a Productos</Link>
                        </p>
                      </>
                    )}
                  </div>
                  <QueEsCada unidad="pedidos" />
                  <BarrasRanking
                    filas={resumenCupones.filas.map((f) => ({
                      clave: f.id,
                      titulo: f.code,
                      sub: f.vencido ? `${f.etiqueta} · vencido` : f.etiqueta,
                      valor: f.usos,
                      trajo: f.facturado,
                      costo: f.descuento,
                      dejo: f.ganancia,
                      pedidosSinCosto: f.pedidosSinCosto,
                    }))}
                    color="bg-indigo-500"
                    unidad="uso"
                    href="/dashboard/cupones"
                    cta="Ver todos los cupones"
                    medida={resumenCupones.gananciaTotal !== null ? "ganancia" : "usos"}
                  />
                </>
              )}

              {/* ¿El cupón hace que compren más, o se lo lleva quien ya compraba?
                  Es lo más cerca que se puede estar de "vendí GRACIAS al cupón"
                  sin hacer un experimento, y la única de las dos lecturas sobre
                  la que se puede hacer algo. Sólo aparece con base suficiente de
                  los dos lados: ver `MINIMO_PARA_COMPARAR`. */}
              {comparacionCompra.diferenciaPct !== null && (
                <div className="mt-5 border-t border-gray-100 pt-3.5">
                  <p className="text-xs font-semibold text-gray-500">¿Compran más con cupón?</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600 tabular-nums">
                    <span className="font-bold text-gray-900">{money(comparacionCompra.conCupon.promedio)}</span> con cupón
                    {" contra "}
                    <span className="font-bold text-gray-900">{money(comparacionCompra.sinCupon.promedio)}</span> sin cupón
                    {" — "}
                    <span className={comparacionCompra.diferenciaPct >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                      {comparacionCompra.diferenciaPct >= 0 ? "+" : ""}{comparacionCompra.diferenciaPct}%
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    {comparacionCompra.diferenciaPct >= MINIMO_PARA_COMPARAR
                      ? "Quien usa cupón se lleva más que el resto: el cupón está empujando la compra."
                      : comparacionCompra.diferenciaPct <= -MINIMO_PARA_COMPARAR
                        ? "Quien usa cupón se lleva menos que el resto: le estás descontando a gente que ya iba a comprar."
                        : "Compran casi lo mismo con cupón que sin cupón."}
                    {" "}Es el promedio de lo que se llevaron, sin contar el envío y antes del descuento — no es el ticket promedio de arriba, que va sobre el total del pedido.
                  </p>
                </div>
              )}

              {/* Los premios de la ruleta, aparte. Iban mezclados en el ranking de
                  arriba, y ahí ensuciaban dos cosas: cada ganador tiene su propio
                  código de un solo uso, así que llenaban la lista de filas de "1
                  uso" que empujaban afuera a los cupones de verdad; y el total
                  sumaba las dos cosas, así que no se podía saber cuánto costó la
                  ruleta y cuánto costaron tus cupones. */}
              {/* Un puntero, no los números otra vez: ahora tienen su tarjeta al
                  lado y repetirlos acá sería invitar a que un día no coincidan.
                  Pero la línea tiene que estar igual, porque si no nadie entiende
                  por qué los códigos WIN- no aparecen en el ranking de arriba. */}
              {resumenCupones.ruleta.usos > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-3.5">
                  <p className="text-xs leading-relaxed text-gray-400">
                    🎡 Los {resumenCupones.ruleta.usos} premio{resumenCupones.ruleta.usos !== 1 ? "s" : ""} de la ruleta
                    {" "}que se canjearon van aparte y no entran en estos totales.
                  </p>
                </div>
              )}

              <SinUsar
                titulo={`Vigentes sin un solo uso en estos ${rangeDays} días`}
                items={resumenCupones.sinUsar.map((c) => c.code)}
                href="/dashboard/cupones"
                cta="Ver cupones"
              />
            </div>

            {/* Promociones */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
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
                    Cuando una promo entre en un pedido vas a ver acá cuál fue, cuánto trajo y cuánto te costó.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mismo criterio que en Cupones: arriba la ganancia, y de dónde
                      sale abajo. Una promo tampoco es un gasto. */}
                  <div className="mb-4">
                    {resumenPromos.gananciaTotal !== null ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900">
                          Te dejó {money(resumenPromos.gananciaTotal)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          de {money(resumenPromos.facturadoTotal)} facturados en {resumenPromos.pedidosConPromo} pedido{resumenPromos.pedidosConPromo !== 1 ? "s" : ""},
                          {" "}resignando {money(resumenPromos.ahorroTotal)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900">{money(resumenPromos.facturadoTotal)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          facturado en {resumenPromos.pedidosConPromo} pedido{resumenPromos.pedidosConPromo !== 1 ? "s" : ""} con promo
                          {" · resignaste "}{money(resumenPromos.ahorroTotal)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
                          Cargá el costo de tus productos y acá vas a ver cuánto te dejaron de verdad.{" "}
                          <Link href="/dashboard/productos" className="font-semibold underline print:hidden">Ir a Productos</Link>
                        </p>
                      </>
                    )}
                  </div>
                  <QueEsCada unidad="pedidos" />
                  <BarrasRanking
                    filas={resumenPromos.filas.map((f) => ({
                      clave: f.clave,
                      titulo: f.etiqueta,
                      sub: null,
                      valor: f.pedidos,
                      trajo: f.facturado,
                      costo: f.ahorro,
                      dejo: f.ganancia,
                      pedidosSinCosto: f.pedidosSinCosto,
                    }))}
                    color="bg-emerald-500"
                    unidad="pedido"
                    href="/dashboard/promociones"
                    cta="Ver todas las promos"
                    medida={resumenPromos.gananciaTotal !== null ? "ganancia" : "usos"}
                  />
                  {/* Un pedido con dos promos aparece en dos filas y suma su plata
                      en las dos: sin este aviso, alguien suma la columna a mano y
                      cree que la pantalla está mal. */}
                  {resumenPromos.filas.reduce((s, f) => s + f.pedidos, 0) > resumenPromos.pedidosConPromo && (
                    <p className="mt-3 text-xs leading-relaxed text-gray-400">
                      Un pedido puede llevar dos promos: ahí aparece en las dos filas, así que la lista suma más que el total de arriba.
                    </p>
                  )}
                </>
              )}

              <SinUsar
                titulo="Activas que no entraron en ningún pedido"
                items={resumenPromos.sinUsar}
                href="/dashboard/promociones"
                cta="Ver promociones"
              />
            </div>

            {/* ── La ruleta / raspadita ──
                Hasta acá no tenía una sola medición: cada jugada se venía
                guardando y no se leía en ninguna pantalla. Lo único visible era
                el contador de "Gamificación" en Cupones, que cuenta los que
                GANARON — sin el denominador, no dice nada.

                El número grande es la tasa de canje y no las jugadas, porque es
                el único que contesta si el juego sirve. Jugadas y premios miden
                entusiasmo; canjes mide si alguno volvió a comprar, que es todo
                el negocio: estás cambiando un descuento por un email. */}
            {juegoWidget && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden className="shrink-0">{juegoWidget.type === "SCRATCH" ? "🪙" : "🎡"}</span>
                    <h2 className="font-bold text-gray-900 truncate">
                      {juegoWidget.type === "SCRATCH" ? "Raspadita" : "Ruleta"}
                    </h2>
                    {!juegoWidget.isActive && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        Apagada
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-400">
                    {resumenJuego.jugadas} jugada{resumenJuego.jugadas !== 1 ? "s" : ""}
                  </span>
                </div>

                {resumenJuego.jugadas === 0 ? (
                  <div className="py-2">
                    <p className="text-sm font-medium text-gray-600 mb-1">Nadie jugó en el período</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {juegoWidget.isActive
                        ? "Cuando alguien juegue vas a ver acá cuántos ganaron y —lo que importa— cuántos volvieron a comprar con el premio."
                        : "Está apagada, así que no aparece en tu tienda. Prendela desde Cupones para que empiece a juntar emails."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {resumenJuego.canjeados} de {resumenJuego.ganaron} usaron su premio
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {resumenJuego.ganaron > 0
                          ? `${Math.round((resumenJuego.canjeados / resumenJuego.ganaron) * 100)}% de los que ganaron volvió a comprar`
                          : "Todavía nadie ganó un premio"}
                        {" · "}{resumenJuego.emails} email{resumenJuego.emails !== 1 ? "s" : ""} que dejaron
                      </p>
                    </div>

                    {/* Lo que costó sale del lado de los cupones, no de acá: el
                        premio es un cupón, y esa cuenta ya está hecha. Repetirla
                        con otra fuente sería invitar a que un día no coincidan. */}
                    {resumenCupones.ruleta.usos > 0 && (
                      <p className="mb-4 text-xs leading-relaxed text-gray-400 tabular-nums">
                        {resumenCupones.ruleta.ganancia !== null ? (
                          <>Te dejó <span className="font-bold text-gray-900">{money(resumenCupones.ruleta.ganancia)}</span>{" · "}</>
                        ) : null}
                        trajo {money(resumenCupones.ruleta.facturado)} · descontaste {money(resumenCupones.ruleta.descuento)}
                      </p>
                    )}

                    <p className="mb-2 text-xs font-semibold text-gray-500">Qué salió</p>
                    <div className="space-y-2">
                      {resumenJuego.premios.slice(0, TOPE_PAPEL).map((p, i) => {
                        const pct = Math.round((p.veces / resumenJuego.jugadas) * 100);
                        const nada = p.etiqueta === "Sin premio";
                        return (
                          <div key={p.etiqueta} className={i >= TOPE_PANTALLA ? "hidden print:block" : undefined}>
                            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                              <span className={`min-w-0 break-words ${nada ? "text-gray-400" : "text-gray-700 font-medium"}`}>
                                {p.etiqueta}
                              </span>
                              <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                                <span className="font-bold text-gray-900">{p.veces}</span> · {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100">
                              <div
                                className={`h-1.5 rounded-full ${nada ? "bg-gray-300" : "bg-fuchsia-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Se corta en 5, y hay que decirlo. Sin esto los porcentajes
                        que quedan a la vista no suman 100 y parece una cuenta
                        mal hecha, cuando en realidad faltan filas. En el PDF
                        salen todos, así que ahí el aviso sólo aparece si la
                        ruleta tiene más de TOPE_PAPEL premios distintos. */}
                    {resumenJuego.premios.length > TOPE_PANTALLA && (
                      <p className="mt-2 text-xs text-gray-400 print:hidden">
                        y {resumenJuego.premios.length - TOPE_PANTALLA} premio{resumenJuego.premios.length - TOPE_PANTALLA !== 1 ? "s" : ""} más
                      </p>
                    )}
                    {resumenJuego.premios.length > TOPE_PAPEL && (
                      <p className="mt-2 hidden print:block text-xs text-gray-400">
                        y {resumenJuego.premios.length - TOPE_PAPEL} premio{resumenJuego.premios.length - TOPE_PAPEL !== 1 ? "s" : ""} más, que no entraron en el informe.
                      </p>
                    )}

                    <Link
                      href="/dashboard/cupones"
                      className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700 print:hidden"
                    >
                      Ver los premios entregados →
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Día a día ──
            La conclusión ARRIBA y la tabla abajo, no la tabla sola. Treinta
            filas puestas y listo son honestas y no las lee nadie; y el que las
            lee saca la conclusión equivocada porque no sabe qué mirar. Primero
            se le dice cuál fue el mejor día, y después se le deja verificarlo.

            La tabla scrollea adentro de la tarjeta para no empujar media
            pantalla, pero al imprimir se suelta entera: el PDF es el informe y
            ahí no hay dónde scrollear. */}
        {!isAutos && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
            <h2 className="font-bold text-gray-900">Día a día</h2>

            {resumenDias.mejor ? (
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Tu mejor día fue el{" "}
                <span className="font-bold text-gray-900">
                  {diaDeLaSemana(resumenDias.mejor.dia)} {fechaCorta(resumenDias.mejor.dia)}
                </span>
                {" con "}
                <span className="font-bold text-gray-900">{money(resumenDias.mejor.ingresos)}</span>.
                {" "}Promediás {money(resumenDias.promedio)} por día
                {resumenDias.sinVentas > 0 && (
                  <> y {resumenDias.sinVentas} de estos {rangeDays} días cerraron sin ninguna venta</>
                )}.
                {resumenDias.mejorDiaSemana && (
                  <>
                    {" "}Los <span className="font-bold text-gray-900">{resumenDias.mejorDiaSemana.nombre}s</span>
                    {" "}son tu mejor día: promedian {money(resumenDias.mejorDiaSemana.promedio)} sobre
                    {" "}{resumenDias.mejorDiaSemana.veces} que cayeron en el período.
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Sin ventas en estos {rangeDays} días. Abajo quedan igual las visitas de cada día.
              </p>
            )}

            <div className="mt-4 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-2 text-left font-semibold">Día</th>
                    <th className="py-2 px-1 text-right font-semibold">Ingresos</th>
                    <th className="py-2 px-1 text-right font-semibold">Ped.</th>
                    <th className="py-2 px-1 text-right font-semibold">Vis.</th>
                    {profitCurrentAgg.totalNetRevenueKnownCost > 0 && (
                      <th className="py-2 pl-1 text-right font-semibold">Ganancia</th>
                    )}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {diasDelPeriodo.map((d) => {
                    const esMejor = d.dia === resumenDias.mejor?.dia;
                    return (
                      <tr key={d.dia} className={`border-b border-gray-50 ${esMejor ? "bg-emerald-50/60" : ""}`}>
                        <td className="py-1.5 pr-2 text-left text-gray-500 whitespace-nowrap">
                          {fechaCorta(d.dia)}
                          <span className="ml-1 text-xs text-gray-400">{diaDeLaSemana(d.dia).slice(0, 3)}</span>
                        </td>
                        <td className={`py-1.5 px-1 text-right ${d.ingresos > 0 ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                          {d.ingresos > 0 ? money(d.ingresos) : "—"}
                        </td>
                        <td className={`py-1.5 px-1 text-right ${d.pedidos > 0 ? "text-gray-700" : "text-gray-300"}`}>
                          {d.pedidos || "—"}
                        </td>
                        <td className={`py-1.5 px-1 text-right ${d.visitas > 0 ? "text-gray-700" : "text-gray-300"}`}>
                          {d.visitas || "—"}
                        </td>
                        {profitCurrentAgg.totalNetRevenueKnownCost > 0 && (
                          <td className="py-1.5 pl-1 text-right text-gray-700">
                            {d.ganancia !== null ? money(d.ganancia) : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* El guion no es cero: es "no pasó nada ese día". La columna de
                ganancia además tiene su propio "no se sabe", que es distinto. */}
            <p className="mt-3 text-xs leading-relaxed text-gray-400">
              El guion quiere decir que ese día no hubo nada.
              {profitCurrentAgg.totalNetRevenueKnownCost > 0 &&
                " En Ganancia, que ese día no se vendió nada con el costo cargado."}
            </p>
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

              <div className="rounded-2xl border border-gray-100 bg-white p-6" data-print="largo">
                <h2 className="font-bold text-gray-900 mb-5">Rentabilidad por producto</h2>
                {profitByProductRanked.length === 0 ? (
                  <p className="text-sm text-gray-500">Ningún producto vendido en el período tiene costo cargado todavía.</p>
                ) : (
                  <div className="space-y-3">
                    {profitByProductRanked.map(([productId, p], i) => (
                      <div
                        key={productId}
                        className={`${
                          i >= TOPE_PANTALLA_RENTABILIDAD ? "hidden print:flex" : "flex"
                        } items-center justify-between gap-2 text-sm`}
                      >
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
                {/* El título dice "por producto", así que si la lista está
                    cortada hay que avisarlo: si no, un producto que no aparece
                    se lee como que no dejó nada. Son dos cortes distintos —el de
                    la pantalla y el del papel— y cada uno tiene que decir el
                    suyo, porque el número que sigue no es el mismo. */}
                {profitByProductTotal > TOPE_PANTALLA_RENTABILIDAD && (
                  <p className="mt-4 text-xs text-gray-400 print:hidden">
                    Se muestran los {TOPE_PANTALLA_RENTABILIDAD} que más ganancia dejaron, de {profitByProductTotal}.
                  </p>
                )}
                {profitByProductTotal > TOPE_PAPEL && (
                  <p className="mt-4 hidden print:block text-xs text-gray-400">
                    Se muestran los {TOPE_PAPEL} que más ganancia dejaron, de {profitByProductTotal}.
                  </p>
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

        {/* ── El pie del informe, sólo en papel ───────────────────────────────
            Un PDF se manda por mail, se archiva y se abre tres meses después
            sin nadie al lado para explicarlo. En pantalla cada aclaración está
            pegada al número que corrige y alcanza con eso; suelto en un
            archivo, el que lo lee no tiene de dónde agarrarse y las cuatro
            cosas de acá abajo son justo las que, mal entendidas, hacen sacar la
            conclusión equivocada — sobre todo la de la ganancia, que si cubre
            el 40% de lo facturado no es "lo que ganaste" sino "lo que ganaste
            en la parte que se puede medir". */}
        <div className="hidden print:block rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Cómo se calcularon estos números
          </h2>
          <dl className="mt-3 space-y-2.5 text-xs leading-relaxed text-gray-600">
            <div>
              <dt className="inline font-semibold text-gray-800">Venta confirmada. </dt>
              <dd className="inline">
                Sólo los pedidos en estado Confirmado, Enviado o Entregado. Los pendientes
                de pago no suman a los ingresos ni a la ganancia: es plata que puede no
                llegar nunca.
              </dd>
            </div>
            {!isAutos && (
              <div>
                <dt className="inline font-semibold text-gray-800">Ganancia. </dt>
                <dd className="inline">
                  Lo que se cobró por el producto menos lo que costó, con el descuento del
                  pedido repartido entre sus renglones. Sólo entran los productos que tienen
                  el costo cargado
                  {costCoveragePct > 0
                    ? <>, que son el <strong>{costCoveragePct}%</strong> de lo facturado en el período. El {100 - costCoveragePct}% restante no está en ninguna cuenta de ganancia de este informe.</>
                    : <>. En este período no hay ninguno, así que las cuentas de ganancia quedaron vacías.</>}
                </dd>
              </div>
            )}
            <div>
              <dt className="inline font-semibold text-gray-800">Las comparaciones. </dt>
              <dd className="inline">
                Contra los {rangeDays} días inmediatamente anteriores, cortados a la misma
                hora del día para que un período a medias no compita contra uno completo.
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold text-gray-800">Las visitas. </dt>
              <dd className="inline">
                Se guardan por día entero y no por hora, así que el día de hoy entra a
                medias y su comparación es aproximada. Los pedidos sí tienen hora exacta.
                {periodStartStr < INICIO_DIA_ARGENTINO && (
                  <> Además, las visitas anteriores al 29/07/2026 se registraron en horario
                  UTC: las de ese tramo pueden estar corridas hasta tres horas y caer en el
                  día de al lado.</>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-400">
            {store.name} · Período {periodStartStr} a {hoyDia} · Generado el{" "}
            {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
