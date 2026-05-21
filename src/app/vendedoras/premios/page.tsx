"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Award, Gift, Clock, CheckCircle, XCircle, ArrowLeft, Loader2, Moon, Sun, Star, Ticket } from "lucide-react";
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
}

const NIVEL_ICONS: Record<string, string> = {
  BRONZE:  "🥉",
  SILVER:  "🥈",
  GOLD:    "🥇",
  DIAMOND: "💎",
};

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function LevelCard({ nivel, nivelLabel, nivelColor, plan }: { nivel: string; nivelLabel: string; nivelColor: string; plan: string }) {
  const icon = NIVEL_ICONS[nivel] ?? "🥉";
  const nextLevels: Record<string, { label: string; amount: number }> = {
    BRONZE:  { label: "Plata", amount: 5000 },
    SILVER:  { label: "Oro", amount: 20000 },
    GOLD:    { label: "Diamante", amount: 50000 },
    DIAMOND: { label: "", amount: 0 },
  };
  const next = nextLevels[nivel];

  return (
    <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className="text-5xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-0.5">Tu nivel este mes</p>
        <p className="text-xl font-bold" style={{ color: nivelColor }}>{nivelLabel}</p>
        {next.label && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Faltán comisiones para llegar a <span className="font-semibold text-gray-600 dark:text-gray-300">{next.label}</span>
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">Plan</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan === "ANNUAL" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"}`}>
          {plan === "ANNUAL" ? "Anual" : "Mensual"}
        </span>
      </div>
    </div>
  );
}

function CouponCard({ c }: { c: RewardCoupon }) {
  const isStore = c.type === "STORE";
  const isAvailable = c.status === "AVAILABLE";
  const isUsed = c.status === "USED";

  const statusColors = {
    AVAILABLE: "border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-gray-900/60",
    USED:      "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-gray-900/30 opacity-60",
    EXPIRED:   "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-gray-900/30 opacity-50",
  };

  return (
    <div className={`border rounded-2xl p-4 transition-all ${statusColors[c.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isAvailable ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-gray-100 dark:bg-white/5"}`}>
            {isStore ? (
              <Ticket className={`h-5 w-5 ${isAvailable ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
            ) : (
              <Star className={`h-5 w-5 ${isAvailable ? "text-amber-500" : "text-gray-400"}`} />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {isStore ? `${c.discountValue}% off en tiendas` : c.discountValue === 100 ? "Mes gratis" : `${c.discountValue}% off en tu suscripción`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {NIVEL_ICONS[c.level]} Premio {c.level === "SILVER" ? "Plata" : c.level === "GOLD" ? "Oro" : "Diamante"} · {formatMonth(c.earnedMonth)}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {isAvailable && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle className="h-3 w-3" /> Disponible
            </span>
          )}
          {isUsed && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              <CheckCircle className="h-3 w-3" /> Usado
            </span>
          )}
          {c.status === "EXPIRED" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              <XCircle className="h-3 w-3" /> Vencido
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
        <code className={`text-xs font-mono font-bold tracking-widest px-3 py-1.5 rounded-lg ${isAvailable ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "bg-gray-100 dark:bg-white/5 text-gray-400 line-through"}`}>
          {c.code}
        </code>
        <div className="text-right">
          {isAvailable ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Vence {formatDate(c.expiresAt)}
            </p>
          ) : isUsed ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Usado el {formatDate(c.usedAt!)}
              {c.usedStoreName && <> en <span className="font-medium">{c.usedStoreName}</span></>}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Venció el {formatDate(c.expiresAt)}</p>
          )}
        </div>
      </div>
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const disponibles = data?.cupones.filter((c) => c.status === "AVAILABLE") ?? [];
  const historial   = data?.cupones.filter((c) => c.status !== "AVAILABLE") ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/vendedoras" className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" />
              <span className="font-bold text-gray-900 dark:text-white">Mis premios</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              {theme === "dark" ? <Sun className="h-4 w-4 text-gray-400" /> : <Moon className="h-4 w-4 text-gray-500" />}
            </button>
            {user?.id && <NotificationBell userId={user.id} />}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Nivel actual */}
        {data && (
          <LevelCard
            nivel={data.nivelActual}
            nivelLabel={data.nivelLabel}
            nivelColor={data.nivelColor}
            plan={data.plan}
          />
        )}

        {/* Cómo funciona */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5" /> ¿Cómo ganás premios?
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            Al cierre de cada mes, según cuánto ganaste en comisiones, subís de nivel y recibís cupones automáticamente. Los cupones de tienda podés usarlos en las tiendas de la plataforma que aceptan premios. Los de suscripción se aplican en tu próximo cobro.
          </p>
        </div>

        {/* Cupones disponibles */}
        {disponibles.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Disponibles ({disponibles.length})</h2>
            <div className="space-y-3">
              {disponibles.map((c) => <CouponCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {/* Sin cupones disponibles */}
        {disponibles.length === 0 && data && (
          <div className="text-center py-10">
            <Award className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Todavía no tenés premios</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Al cierre del mes recibís tus cupones si llegás a nivel Plata o superior.
            </p>
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Historial</h2>
            <div className="space-y-3">
              {historial.map((c) => <CouponCard key={c.id} c={c} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
