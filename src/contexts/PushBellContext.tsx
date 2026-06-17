"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  isPushSupported,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/push-client";

export type FollowState = "checking" | "following" | "not_following" | "loading";

export type Campaign = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type FollowResult = "ok" | "unauthorized" | "error";

type PushBellCtx = {
  followState: FollowState;
  hasNew: boolean;
  campaigns: Campaign[];
  loadingCampaigns: boolean;
  drawerOpen: boolean;
  pushSupported: boolean;
  needsPushActivation: boolean;
  activatePushOnDevice: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  handleFollow: () => Promise<FollowResult>;
  handleUnfollow: () => Promise<void>;
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
  const [followState, setFollowState] = useState<FollowState>("checking");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [needsPushActivation, setNeedsPushActivation] = useState(false);
  const supported = useRef(false);
  const drawerOpenRef = useRef(false);
  const followingRef = useRef(false);

  useEffect(() => { drawerOpenRef.current = drawerOpen; }, [drawerOpen]);

  // Verificar estado inicial de follow (API + localStorage como fallback)
  useEffect(() => {
    if (!enabled) return;
    supported.current = isPushSupported();

    async function checkFollowState() {
      try {
        const res = await fetch(`/api/store/follow?storeId=${storeId}`);
        if (res.ok) {
          const data = await res.json();
          followingRef.current = !!data.following;
          setFollowState(data.following ? "following" : "not_following");

          if (data.following && supported.current) {
            if (Notification.permission === "granted") {
              // Registrar este dispositivo silenciosamente (ej: seguido en PC, ahora en celular)
              subscribeToStore(storeId, storeSlug).catch(() => {});
            } else if (Notification.permission === "default") {
              // Sigue en DB pero nunca activó push en este dispositivo
              setNeedsPushActivation(true);
            }
          }
          return;
        }
      } catch { /* noop */ }
      setFollowState("not_following");
    }

    checkFollowState();
  }, [storeId, storeSlug, enabled]);

  // Cargar campañas al montar
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

  // Actualizar campañas cuando llega un push en tiempo real
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
    fetch(`/api/push/campaigns/${storeSlug}`)
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
  }, [storeId, storeSlug]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Seguir tienda: crea StoreFollow en DB + suscribe push si soportado
  const handleFollow = useCallback(async (): Promise<FollowResult> => {
    if (followingRef.current) return "ok";
    setFollowState("loading");

    let followRes: Response;
    try {
      followRes = await fetch("/api/store/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
    } catch {
      setFollowState("not_following");
      return "error";
    }

    if (followRes.status === 401) {
      setFollowState("not_following");
      return "unauthorized";
    }
    if (!followRes.ok) {
      setFollowState("not_following");
      return "error";
    }

    // Suscribir push si el browser lo soporta
    if (supported.current && Notification.permission !== "denied") {
      const pushOk = await subscribeToStore(storeId, storeSlug);
      // Si el usuario canceló el diálogo de permiso push, marcar que necesita activarlo
      if (!pushOk && Notification.permission !== "granted") {
        setNeedsPushActivation(true);
      }
    }

    followingRef.current = true;
    setFollowState("following");
    return "ok";
  }, [storeId, storeSlug]);

  // Dejar de seguir: elimina StoreFollow en DB + cancela push
  const handleUnfollow = useCallback(async () => {
    if (!followingRef.current) return;
    setFollowState("loading");

    await fetch("/api/store/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });

    await unsubscribeFromStore(storeId, storeSlug);

    localStorage.removeItem(LAST_SEEN_KEY(storeId));
    followingRef.current = false;
    setHasNew(false);
    setFollowState("not_following");
  }, [storeId, storeSlug]);

  const activatePushOnDevice = useCallback(async () => {
    if (!supported.current) return;
    // Pedir permiso explícitamente primero (requerido por Safari y más claro en todos los browsers)
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    if (Notification.permission !== "granted") return;
    const ok = await subscribeToStore(storeId, storeSlug);
    if (ok) setNeedsPushActivation(false);
  }, [storeId, storeSlug]);

  return (
    <PushBellContext.Provider value={{
      followState,
      hasNew,
      campaigns,
      loadingCampaigns,
      drawerOpen,
      pushSupported: supported.current,
      needsPushActivation,
      activatePushOnDevice,
      openDrawer,
      closeDrawer,
      handleFollow,
      handleUnfollow,
    }}>
      {children}
    </PushBellContext.Provider>
  );
}
