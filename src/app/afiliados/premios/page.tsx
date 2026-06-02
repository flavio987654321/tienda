"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Moon, Sun, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

interface RewardCoupon {
  id: string;
  code: string;
  type: "STORE" | "SUBSCRIPTION";
  level: string;
  plan: string;
  discountValue: number;
  earnedMonth: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  usedAt: string | null;
  usedStoreName: string | null;
  expiresAt: string;
  createdAt: string;
}

interface PageData {
  cupones: RewardCoupon[];
  nivelActual: string;
  nivelLabel: string;
  nivelColor: string;
  plan: string;
  rachaDiamante: number;
  esMayorista: boolean;
  categoria: "RETAIL" | "MAYORISTA" | "ALTO_VALOR";
  categoriaLabel: string;
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const LEVEL_ORDER = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];
const LEVEL_META: Record<string, { label: string; color: string; bar: string }> = {
  BRONZE:  { label: "Bronce",   color: "#a8835a", bar: "bg-amber-700" },
  SILVER:  { label: "Plata",    color: "#9ca3af", bar: "bg-gray-400" },
  GOLD:    { label: "Oro",      color: "#d97706", bar: "bg-amber-500" },
  DIAMOND: { label: "Diamante", color: "#6366f1", bar: "bg-indigo-500" },
};

function LevelDot({ nivel, active }: { nivel: string; active: boolean }) {
  const meta = LEVEL_META[nivel];
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full transition-all ${active ? "scale-125" : "opacity-40"}`}
      style={{ backgroundColor: meta.color }}
    />
  );
}

function ProgressBar({ nivelActual }: { nivelActual: string }) {
  const idx = LEVEL_ORDER.indexOf(nivelActual);
  const pct = ((idx + 1) / LEVEL_ORDER.length) * 100;
  const meta = LEVEL_META[nivelActual];
  return (
    <div className="relative h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CouponRow({ c }: { c: RewardCoupon }) {
  const isAvailable = c.status === "AVAILABLE";
  const isUsed = c.status === "USED";
  const levelMeta = LEVEL_META[c.level] ?? LEVEL_META.BRONZE;

  return (
    <div className={`group border rounded-xl transition-all ${
      isAvailable
        ? "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3 hover:border-gray-300 dark:hover:border-white/20"
        : "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2 opacity-50"
    }`}>
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Indicador de nivel */}
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: isAvailable ? levelMeta.color : "#9ca3af" }} />

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {c.type === "STORE"
                ? `${c.discountValue}% off en tiendas`
                : c.discountValue === 100
                ? "Mes de suscripción gratis"
                : `${c.discountValue}% off en suscripción`}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ color: levelMeta.color, backgroundColor: `${levelMeta.color}18` }}
            >
              {levelMeta.label}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {c.type === "STORE" ? "Tiendas" : "Suscripción"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{formatMonth(c.earnedMonth)}</p>
        </div>

        {/* Código */}
        <code className={`hidden sm:block text-xs font-mono tracking-widest px-3 py-1.5 rounded-lg shrink-0 ${
          isAvailable
            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 line-through"
        }`}>
          {c.code}
        </code>

        {/* Estado */}
        <div className="shrink-0 text-right min-w-[90px]">
          {isAvailable && (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />
                Disponible
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" /> {formatDate(c.expiresAt)}
              </p>
            </>
          )}
          {isUsed && (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                <CheckCircle className="h-3 w-3" /> Usado
              </span>
              {c.usedAt && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{formatDate(c.usedAt)}</p>}
            </>
          )}
          {c.status === "EXPIRED" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-600">
              <XCircle className="h-3 w-3" /> Vencido
            </span>
          )}
        </div>
      </div>

      {/* Código en mobile */}
      {isAvailable && (
        <div className="sm:hidden px-5 pb-4">
          <code className="text-xs font-mono tracking-widest bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-lg block text-center">
            {c.code}
          </code>
        </div>
      )}
    </div>
  );
}

export default function PremiosPage() {
  const { theme, setTheme } = useTheme();
  const { user, status } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/vendedoras/premios")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const disponibles = data?.cupones.filter((c) => c.status === "AVAILABLE") ?? [];
  const historial   = data?.cupones.filter((c) => c.status !== "AVAILABLE") ?? [];
  const nivelIdx    = LEVEL_ORDER.indexOf(data?.nivelActual ?? "BRONZE");
  const nextLevel   = LEVEL_ORDER[nivelIdx + 1];
  const nextMeta    = nextLevel ? LEVEL_META[nextLevel] : null;

  const NEXT_THRESHOLDS: Record<string, Record<string, string>> = {
    RETAIL:     { BRONZE: "$15.000",  SILVER: "$50.000",    GOLD: "$150.000" },
    MAYORISTA:  { BRONZE: "$75.000",  SILVER: "$250.000",   GOLD: "$750.000" },
    ALTO_VALOR: { BRONZE: "$500.000", SILVER: "$1.500.000", GOLD: "$5.000.000" },
  };
  const nextThresholds = NEXT_THRESHOLDS[data?.categoria ?? "RETAIL"];

  const racha = data?.rachaDiamante ?? 0;
  const nextStreakNeeded = racha > 0 ? (3 - (racha % 3)) % 3 : 3;
  const currentMeta = LEVEL_META[data?.nivelActual ?? "BRONZE"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/afiliados" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Programa de premios</span>
            {data?.categoria && data.categoria !== "RETAIL" && (
              <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full border font-medium ${
                data.categoria === "ALTO_VALOR"
                  ? "text-violet-600 dark:text-violet-400/80 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20"
                  : "text-amber-600 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
              }`}>
                {data.categoriaLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user?.id && <NotificationBell userId={user.id} />}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Layout principal: 2 columnas en desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Columna izquierda: estado + tabla de niveles */}
          <div className="lg:col-span-1 space-y-6">

            {/* Card de nivel actual */}
            {data && (
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
                {/* Banda de color del nivel */}
                <div className="h-1" style={{ backgroundColor: currentMeta.color }} />
                <div className="p-6">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-4">Tu nivel · {data.plan === "ANNUAL" ? "Plan anual" : "Plan mensual"}</p>

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold tracking-tight" style={{ color: currentMeta.color }}>
                        {currentMeta.label}
                      </p>
                      {nextMeta && (
                        <p className="text-xs text-gray-500 mt-1">
                          Próximo nivel: <span className="font-medium" style={{ color: nextMeta.color }}>{nextMeta.label}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {LEVEL_ORDER.map((l) => (
                        <LevelDot key={l} nivel={l} active={LEVEL_ORDER.indexOf(l) <= nivelIdx} />
                      ))}
                    </div>
                  </div>

                  <ProgressBar nivelActual={data.nivelActual} />

                  {nextMeta && nextThresholds[data.nivelActual] && (
                    <p className="text-xs text-gray-500 mt-3">
                      Necesitás {nextThresholds[data.nivelActual]} en comisiones este mes para alcanzar {nextMeta.label}.
                    </p>
                  )}

                  {data.nivelActual === "DIAMOND" && (
                    <div className="mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Racha Diamante</p>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${racha % 3 >= i ? "bg-indigo-500" : "bg-gray-200 dark:bg-white/10"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {racha > 0
                          ? nextStreakNeeded === 0
                            ? "¡Bonus de racha activo!"
                            : `${racha % 3 === 0 ? 3 : racha % 3}/3 meses — ${nextStreakNeeded} más para el bonus`
                          : "Mantené Diamante 3 meses para ganar un bonus extra"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabla de niveles */}
            {data && (
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">Estructura de niveles</p>
                  {data.categoria !== "RETAIL" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      data.categoria === "ALTO_VALOR"
                        ? "text-violet-600 dark:text-violet-400/80 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20"
                        : "text-amber-600 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                    }`}>
                      {data.categoriaLabel}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {((): { level: string; range: string; premios: string[] }[] => {
                    const c = data.categoria;
                    const isAnnual = data.plan === "ANNUAL";
                    return [
                      {
                        level: "BRONZE",
                        range: c === "ALTO_VALOR" ? "Hasta $499.999" : c === "MAYORISTA" ? "Hasta $74.999" : "Hasta $14.999",
                        premios: ["Solo insignia — seguí generando comisiones"],
                      },
                      {
                        level: "SILVER",
                        range: c === "ALTO_VALOR" ? "$500.000 – $1.499.999" : c === "MAYORISTA" ? "$75.000 – $249.999" : "$15.000 – $49.999",
                        premios: isAnnual ? ["15% off en tiendas"] : ["10% off en suscripción", "10% off en tiendas"],
                      },
                      {
                        level: "GOLD",
                        range: c === "ALTO_VALOR" ? "$1.500.000 – $4.999.999" : c === "MAYORISTA" ? "$250.000 – $749.999" : "$50.000 – $149.999",
                        premios: isAnnual ? ["20% off en tiendas"] : ["20% off en suscripción", "15% off en tiendas"],
                      },
                      {
                        level: "DIAMOND",
                        range: c === "ALTO_VALOR" ? "$5.000.000+" : c === "MAYORISTA" ? "$750.000+" : "$150.000+",
                        premios: isAnnual
                          ? ["25% off en tiendas", "Bonus racha: +40% off"]
                          : ["Mes de suscripción gratis", "20% off en tiendas", "Bonus racha: +30% off"],
                      },
                    ];
                  })().map((row) => {
                    const meta = LEVEL_META[row.level];
                    const isActive = data.nivelActual === row.level;
                    return (
                      <div key={row.level} className={`flex items-start gap-3 px-5 py-4 ${isActive ? "bg-gray-100 dark:bg-white/3" : ""}`}>
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: meta.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                            {isActive && (
                              <span className="text-xs text-gray-500 bg-gray-200 dark:bg-white/5 px-1.5 py-0.5 rounded">Actual</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{row.range}</p>
                          <ul className="space-y-0.5">
                            {row.premios.map((p, i) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-600 shrink-0" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5">
                  <p className="text-xs text-gray-400 dark:text-gray-600">Los premios se generan al cierre de cada mes.</p>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: cupones */}
          <div className="lg:col-span-2 space-y-6">

            {/* Cupones disponibles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Cupones disponibles
                  {disponibles.length > 0 && (
                    <span className="ml-2 text-xs font-normal bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                      {disponibles.length}
                    </span>
                  )}
                </h2>
              </div>

              {disponibles.length > 0 ? (
                <div className="space-y-2">
                  {disponibles.map((c) => <CouponRow key={c.id} c={c} />)}
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-white/5 rounded-xl px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">Sin cupones disponibles</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 max-w-xs mx-auto">
                    Al cierre del mes recibís tus cupones si alcanzás nivel Plata o superior.
                  </p>
                </div>
              )}
            </div>

            {/* Historial */}
            {historial.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-3">Historial</h2>
                <div className="space-y-2">
                  {historial.map((c) => <CouponRow key={c.id} c={c} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
