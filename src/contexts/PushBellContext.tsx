"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  isPushSupported,
  isSubscribedToStore,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/push-client";

type SubState = "checking" | "prompt" | "subscribed" | "loading" | "error";

export type Campaign = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type PushBellCtx = {
  subState: SubState;
  hasNew: boolean;
  campaigns: Campaign[];
  loadingCampaigns: boolean;
  drawerOpen: boolean;
  pushSupported: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  handleSubscribe: () => Promise<void>;
  handleUnsubscribe: () => Promise<void>;
};

const PushBellContext = createContext<PushBellCtx | null>(null);

export function usePushBell() {
  return useContext(PushBellContext);
}

const LAST_SEEN_KEY = (id: string) => `push_last_seen_${id}`;

export function PushBellProvider({
  children,
  storeId,
  storeSlug,
  enabled,
}: {
  children: React.ReactNode;
  storeId: string;
  storeSlug: string;
  enabled: boolean;
}) {
  const [subState, setSubState] = useState<SubState>("checking");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const supported = useRef(false);
  const drawerOpenRef = useRef(false);

  useEffect(() => { drawerOpenRef.current = drawerOpen; }, [drawerOpen]);

  useEffect(() => {
    if (!enabled) return;
    supported.current = isPushSupported();
    isSubscribedToStore(storeId, storeSlug).then((subscribed) => {
      setSubState(subscribed ? "subscribed" : "prompt");
    });
  }, [storeId, storeSlug, enabled]);

  useEffect(() => {
    if (!enabled) return;
    setLoadingCampaigns(true);
    fetch(`/api/push/campaigns/${storeSlug}`)
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((data) => {
        const list: Campaign[] = data.campaigns ?? [];
        setCampaigns(list);
        if (list.length > 0) {
          const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY(storeId)) ?? 0);
          setHasNew(new Date(list[0].createdAt).getTime() > lastSeen);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false));
  }, [storeId, storeSlug, enabled]);

  // Escucha mensajes del SW para actualizar badge y campañas en tiempo real
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;

    function onSWMessage(event: MessageEvent) {
      if (event.data?.type !== "PUSH_RECEIVED") return;
      fetch(`/api/push/campaigns/${storeSlug}`)
        .then((r) => (r.ok ? r.json() : { campaigns: [] }))
        .then((data) => {
          const list: Campaign[] = data.campaigns ?? [];
          setCampaigns(list);
          if (!drawerOpenRef.current) setHasNew(true);
        })
        .catch(() => {});
    }

    navigator.serviceWorker.addEventListener("message", onSWMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSWMessage);
  }, [storeSlug, enabled]);

  const openDrawer = useCallback(() => {
    localStorage.setItem(LAST_SEEN_KEY(storeId), String(Date.now()));
    setHasNew(false);
    setDrawerOpen(true);
    // Refetch campaigns every time the drawer opens so the list is always fresh,
    // even when the push arrived while the app was in background/closed (SW can't
    // deliver PUSH_RECEIVED to inactive clients).
    fetch(`/api/push/campaigns/${storeSlug}`)
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
  }, [storeId, storeSlug]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleSubscribe = useCallback(async () => {
    if (!supported.current) return;
    if (Notification.permission === "denied") { setSubState("error"); return; }
    setSubState("loading");
    const ok = await subscribeToStore(storeId, storeSlug);
    setSubState(ok ? "subscribed" : "error");
    // No cerramos el panel: el usuario ve el estado "activo" como confirmación
  }, [storeId, storeSlug]);

  const handleUnsubscribe = useCallback(async () => {
    setSubState("loading");
    const ok = await unsubscribeFromStore(storeId, storeSlug);
    if (ok) {
      localStorage.removeItem(LAST_SEEN_KEY(storeId));
      setHasNew(false);
      setSubState("prompt");
      closeDrawer();
    } else {
      setSubState("subscribed");
    }
  }, [storeId, storeSlug, closeDrawer]);

  return (
    <PushBellContext.Provider value={{
      subState,
      hasNew,
      campaigns,
      loadingCampaigns,
      drawerOpen,
      pushSupported: supported.current,
      openDrawer,
      closeDrawer,
      handleSubscribe,
      handleUnsubscribe,
    }}>
      {children}
    </PushBellContext.Provider>
  );
}
