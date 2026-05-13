"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isUserTyping() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable);
}

export default function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;   // tab en segundo plano
      if (isUserTyping()) return;    // usuario escribiendo en un campo
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
