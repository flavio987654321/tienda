"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, AlertTriangle, ChevronDown } from "lucide-react";

export type OnboardingStep = {
  done: boolean;
  label: string;
  href: string;
  tip: string;
};

/* ── La lista de pasos del inicio ───────────────────────────────────────────
   Por qué es un componente aparte y del lado del cliente: `dashboard/page.tsx`
   es un Server Component (consulta la base directo), y plegar/desplegar necesita
   estado. Sólo se mueve acá la tarjeta; los pasos se siguen calculando en el
   servidor y llegan armados por props.

   La idea: los pasos YA HECHOS se esconden solos. Con ocho pasos y siete
   tachados, lo único que importa —el que falta— quedaba perdido al final de una
   lista larguísima de cosas que ya no hay que hacer. Ahora arriba va lo
   pendiente, y lo terminado se pliega detrás de una fila con una flecha, por si
   se lo quiere volver a mirar.

   Se pliega, no se borra: sirve de comprobante de lo que uno ya hizo, y la barra
   de progreso sola no dice CUÁLES son.
──────────────────────────────────────────────────────────────────────────── */
export default function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [verHechos, setVerHechos] = useState(false);

  const hechos     = steps.filter((s) => s.done);
  const pendientes = steps.filter((s) => !s.done);

  return (
    <div className="mb-6 bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <h2 className="font-bold text-gray-900 text-sm">Completá la configuración de tu tienda</h2>
        </div>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
          {hechos.length}/{steps.length} pasos
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${(hechos.length / steps.length) * 100}%` }}
        />
      </div>

      {/* ── Lo que falta ── */}
      <div className="space-y-2">
        {pendientes.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex items-center gap-3 p-3 rounded-xl transition-all group hover:bg-indigo-50 hover:border-indigo-100 border border-transparent"
          >
            <Circle className="h-5 w-5 text-gray-300 shrink-0 group-hover:text-indigo-400 transition-colors" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{step.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{step.tip}</p>
            </div>
            <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              Ir →
            </span>
          </Link>
        ))}
      </div>

      {/* ── Lo ya hecho, plegado ──
          Sólo aparece si hay algo hecho: en una tienda recién creada no tiene
          sentido una fila que diga "0 pasos ya completados". */}
      {hechos.length > 0 && (
        <div className={pendientes.length > 0 ? "mt-3 pt-3 border-t border-gray-100" : ""}>
          <button
            type="button"
            onClick={() => setVerHechos((v) => !v)}
            aria-expanded={verHechos}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-left hover:bg-gray-50 transition-colors group"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-gray-500 flex-1 min-w-0">
              {hechos.length === 1 ? "1 paso ya completado" : `${hechos.length} pasos ya completados`}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-gray-600 ${
                verHechos ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {verHechos && (
              <motion.div
                key="hechos"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  {hechos.map((step) => (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 p-3 rounded-xl opacity-60"
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <p className="text-sm font-medium line-through text-gray-400 flex-1 min-w-0">
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
