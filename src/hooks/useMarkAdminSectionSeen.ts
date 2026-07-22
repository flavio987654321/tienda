"use client";

import { useEffect, useRef } from "react";
import type { AdminSection } from "@/lib/adminSections";

// Marca una sección del admin como vista al montar: apaga su badge de "nuevo" y
// avisa al sidebar (evento) para que refetchee sin esperar al próximo poll. El
// ref evita mandarlo dos veces si el componente re-renderiza.
export function useMarkAdminSectionSeen(section: AdminSection) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch("/api/admin/section-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section }),
    })
      .then(() => window.dispatchEvent(new Event("admin-section-seen")))
      .catch(() => {});
  }, [section]);
}
