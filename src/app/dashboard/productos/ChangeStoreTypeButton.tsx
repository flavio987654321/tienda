"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import StoreTypeModal from "./StoreTypeModal";

export default function ChangeStoreTypeButton({
  currentType,
  currentLabel,
  currentEmoji,
}: {
  currentType: string;
  currentLabel: string;
  currentEmoji: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <span>{currentEmoji}</span>
        <span className="font-medium text-gray-700">{currentLabel}</span>
        <Pencil className="h-3.5 w-3.5 text-gray-400" />
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
