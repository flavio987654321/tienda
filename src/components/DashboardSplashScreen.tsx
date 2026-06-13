"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { isPwa } from "@/lib/pwa";

export default function DashboardSplashScreen() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isPwa()) return;
    setVisible(true);
    const exitTimer = setTimeout(() => setExiting(true), 1400);
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    return () => { clearTimeout(exitTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="dashboard-splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 60%, #3730a3 100%)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/15 shadow-2xl ring-1 ring-white/20">
              <ShoppingBag className="h-11 w-11 text-white" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-white font-bold text-xl tracking-tight">TiendaApps</p>
              <p className="text-indigo-200 text-sm font-medium">Panel de administración</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
