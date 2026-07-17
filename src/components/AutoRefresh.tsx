"use client";

import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Fuera del componente: si viviera en el default del parámetro sería un array nuevo
// por render, y al estar en las dependencias del effect volvería a suscribir el canal.
const DEFAULT_TABLES = ["Affiliate", "Order"];

/**
 * Rearma la pantalla del server cuando cambia una tabla escuchada.
 * Solo sirve para tablas publicadas en `supabase_realtime` (hoy: Affiliate,
 * Notification, Order, Store, StoreActivityEvent, StoreMilestone, Subscription,
 * Testimonial, User). Con una tabla que no esté publicada, no llega ningún evento.
 */
export default function AutoRefresh({ tables = DEFAULT_TABLES }: { tables?: string[] }) {
  const router = useRouter();
  const instanceId = useId();
  // Comparamos por contenido y no por identidad del array, así un caller que pase
  // tables={["Order"]} en línea tampoco resuscribe en cada render.
  const tablesKey = tables.join(",");
  // Un cambio que llega con la pestaña en segundo plano no se refresca en el momento
  // (sería trabajo tirado), pero queda anotado para aplicarlo cuando el usuario vuelve.
  const missedWhileHiddenRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`autorefresh:${instanceId}`);

    for (const table of tablesKey.split(",")) {
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        { event: "*", schema: "public", table },
        () => {
          if (document.hidden) {
            missedWhileHiddenRef.current = true;
            return;
          }
          router.refresh();
        }
      );
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router, tablesKey, instanceId]);

  useEffect(() => {
    function applyPendingRefresh() {
      if (document.hidden || !missedWhileHiddenRef.current) return;
      missedWhileHiddenRef.current = false;
      router.refresh();
    }
    document.addEventListener("visibilitychange", applyPendingRefresh);
    return () => { document.removeEventListener("visibilitychange", applyPendingRefresh); };
  }, [router]);

  return null;
}
