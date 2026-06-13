"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isPwa } from "@/lib/pwa";

interface Props {
  logo: string | null;
  color: string;
  name: string;
}

export default function PwaSplashScreen({ logo, color, name }: Props) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isPwa()) return;
    if (sessionStorage.getItem("splash_shown")) return;
    sessionStorage.setItem("splash_shown", "1");
    setVisible(true);

    const exitTimer = setTimeout(() => setExiting(true), 1400);
    const hideTimer = setTimeout(() => setVisible(false), 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const bgStyle = { backgroundColor: color };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={bgStyle}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="h-24 w-auto max-w-[220px] object-contain drop-shadow-xl"
                draggable={false}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur-sm shadow-2xl">
                <span className="text-4xl font-black text-white drop-shadow-lg select-none">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
