"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SubscriptionRealtimeRefresher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel("sub-refresh-" + userId);

    channel.on(
      "postgres_changes" as Parameters<typeof channel.on>[0],
      { event: "*", schema: "public", table: "Subscription", filter: `userId=eq.${userId}` },
      () => router.refresh()
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, router]);

  return null;
}
