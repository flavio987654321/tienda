"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, Play } from "lucide-react";

export default function HelpButton({ onStartTour }: { onStartTour: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Ayuda"
        title="Ayuda"
      >
        <HelpCircle className="h-5 w-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-gray-100 bg-white shadow-xl p-2">
          <button
            onClick={() => {
              setOpen(false);
              onStartTour();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 shrink-0">
              <Play className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tour guiado</p>
              <p className="text-[11px] text-gray-400 leading-tight">Ver cómo usar el panel</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
