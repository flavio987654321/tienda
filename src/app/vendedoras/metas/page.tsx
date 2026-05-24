"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Target, Trophy, Zap, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface GoalResult {
  storeId: string;
  storeName: string;
  goal: {
    targetAmount: number;
    bonusRate: number;
    month: string;
  };
  earned: number;
  progress: number;
  month: string;
}

function monthLabel(m: string) {
  const [year, month] = m.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function ProgressBar({ progress, color = "#6366f1" }: { progress: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export default function MetasPage() {
  const { status: sessionStatus } = useAuth();
  const [goals, setGoals] = useState<GoalResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/metas")
      .then((r) => r.json())
      .then((d) => { setGoals(d.goals ?? []); setLoading(false); });
  }, [sessionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/vendedoras" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis metas</h1>
            <p className="text-sm text-gray-500">Objetivos mensuales y bonus de comisión</p>
          </div>
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <Target className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Ninguna tienda tiene metas activas</p>
            <p className="text-gray-400 text-sm mt-1">
              Cuando una tienda configure una meta mensual, la verás acá con tu progreso actual.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((g, i) => {
              const reached = g.progress >= 100;
              return (
                <motion.div
                  key={g.storeId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-white dark:bg-gray-900/80 rounded-2xl border p-6 shadow-sm ${reached ? "border-amber-300 dark:border-amber-500/40" : "border-gray-100 dark:border-white/10"}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{monthLabel(g.month)}</p>
                      <h3 className="font-bold text-gray-900 dark:text-white">{g.storeName}</h3>
                    </div>
                    {reached ? (
                      <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold">
                        <Trophy className="h-3.5 w-3.5" /> ¡Meta cumplida!
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-medium">
                        <Zap className="h-3.5 w-3.5" /> +{g.goal.bonusRate}% bonus
                      </div>
                    )}
                  </div>

                  {/* Progreso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Comisiones: <strong className="text-gray-900 dark:text-white">${g.earned.toLocaleString("es-AR")}</strong>
                      </span>
                      <span className="text-sm font-bold" style={{ color: reached ? "#f59e0b" : "#6366f1" }}>
                        {g.progress}%
                      </span>
                    </div>
                    <ProgressBar progress={g.progress} color={reached ? "#f59e0b" : "#6366f1"} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400">$0</span>
                      <span className="text-xs text-gray-400">Meta: ${g.goal.targetAmount.toLocaleString("es-AR")}</span>
                    </div>
                  </div>

                  {/* Info */}
                  {reached ? (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3">
                      <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ¡Superaste la meta! Vas a recibir un <strong>+{g.goal.bonusRate}%</strong> adicional en tus próximas comisiones.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/30 rounded-xl p-3">
                      <Target className="h-4 w-4 text-indigo-500 shrink-0" />
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Te faltan <strong>${(g.goal.targetAmount - g.earned).toLocaleString("es-AR")}</strong> en comisiones para ganar el bonus de +{g.goal.bonusRate}%.
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
