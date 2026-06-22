"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HeartHandshake } from "lucide-react";

type Donor = { donorName: string; createdAt: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DonorsModal({
  trigger,
  triggerClassName,
  type = "CANASTA",
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  type?: "CANASTA" | "LIBRE";
}) {
  const [open, setOpen] = useState(false);
  const [donors, setDonors] = useState<Donor[] | null>(null);

  useEffect(() => {
    if (!open || donors) return;
    fetch(`/api/canasta/participants?type=${type}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDonors(d.donors ?? []))
      .catch(() => setDonors([]));
  }, [open, donors, type]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-amber-900/10 shadow-xl w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-amber-900/10 bg-amber-50">
                <HeartHandshake className="h-4.5 w-4.5 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900 flex-1">Quiénes van donando</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="text-amber-700 hover:text-amber-900"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-2.5">
                {donors === null ? (
                  <p className="text-sm text-gray-400 text-center py-6">Cargando...</p>
                ) : donors.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Todavía no hay donaciones confirmadas.</p>
                ) : (
                  donors.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate pr-3">{d.donorName}</span>
                      <span className="text-gray-400 text-xs shrink-0">{formatDate(d.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
