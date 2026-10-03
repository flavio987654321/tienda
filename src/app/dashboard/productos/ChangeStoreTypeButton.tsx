"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import StoreTypeModal from "./StoreTypeModal";

export default function ChangeStoreTypeButton({
  currentType,
  currentLabel,
  currentEmoji,
  className = "",
}: {
  currentType: string;
  currentLabel: string;
  currentEmoji: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const prevType = useRef(currentType);

  useEffect(() => {
    if (prevType.current !== currentType) {
      prevType.current = currentType;
      setJustChanged(true);
      const t = setTimeout(() => setJustChanged(false), 700);
      return () => clearTimeout(t);
    }
  }, [currentType]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 text-sm border rounded-xl px-3 py-2.5 transition-colors ${
          justChanged
            ? "animate-badge-changed text-indigo-700 panel-oscuro:text-indigo-300 border-indigo-400 bg-indigo-50 panel-oscuro:bg-indigo-500/10"
            : "text-gray-500 panel-oscuro:text-gray-400 border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/50"
        } ${className}`}
      >
        <span className="shrink-0">{currentEmoji}</span>
        <span className="font-medium truncate">{currentLabel}</span>
        <Pencil className="h-3.5 w-3.5 text-gray-400 panel-oscuro:text-gray-500 shrink-0" />
      </button>

      {open && (
        <StoreTypeModal
          isEditing
          currentType={currentType}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
