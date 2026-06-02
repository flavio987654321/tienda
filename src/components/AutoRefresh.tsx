"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AutoRefresh({ tables = ["Affiliate", "Order"] }: { tables?: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel("autorefresh");

    for (const table of tables) {
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        { event: "*", schema: "public", table },
        () => {
          if (!document.hidden) router.refresh();
        }
      );
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router, tables]);

  return null;
}
