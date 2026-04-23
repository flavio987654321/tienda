"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

interface Props {
  isDirty: boolean;
}

export function UnsavedChangesGuard({ isDirty }: Props) {
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Block browser close / refresh / URL bar navigation
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app link clicks before Next.js navigates
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isDirty) return;
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Ignore external, hash-only, and new-tab links
      if (
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        href.startsWith("#") ||
        anchor.target === "_blank"
      ) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingUrl(href);
    },
    [isDirty]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  if (!pendingUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setPendingUrl(null)}
      />

      {/* Modal */}
      <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base mb-1">Cambios sin guardar</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Tenés cambios que no guardaste todavía. Si salís ahora los perdés.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPendingUrl(null)}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Quedarme
          </button>
          <button
            onClick={() => { router.push(pendingUrl!); setPendingUrl(null); }}
            className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}
