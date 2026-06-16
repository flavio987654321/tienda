"use client";

import { useState, useRef } from "react";
import { ThumbsUp, ThumbsDown, Loader2, X } from "lucide-react";
import { usePushBell } from "@/contexts/PushBellContext";

type AlertType = "follow" | "unfollow" | "login" | "ios" | null;

interface Props {
  storeSlug: string;
  color?: string;
  size?: number;
}

export default function StoreFollowButton({ storeSlug, color = "currentColor", size = 20 }: Props) {
  const bell = usePushBell();
  const [alert, setAlert] = useState<AlertType>(null);
  const pendingRef = useRef(false);

  if (!bell) return null;

  const { followState, handleFollow, handleUnfollow, pushSupported } = bell;
  const isLoading = followState === "loading" || followState === "checking";
  const isFollowing = followState === "following";
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  function onClickButton() {
    if (pendingRef.current || isLoading) return;
    if (isFollowing) {
      setAlert("unfollow");
    } else if (isIOS && !pushSupported) {
      setAlert("ios");
    } else {
      setAlert("follow");
    }
  }

  async function confirmFollow() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setAlert(null);
    const result = await handleFollow();
    if (result === "unauthorized") setAlert("login");
    pendingRef.current = false;
  }

  async function confirmUnfollow() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setAlert(null);
    await handleUnfollow();
    pendingRef.current = false;
  }

  return (
    <>
      <button
        onClick={onClickButton}
        disabled={isLoading}
        aria-label={isFollowing ? "Dejar de seguir tienda" : "Seguir tienda"}
        title={isFollowing ? "Dejar de seguir" : "Seguir tienda"}
        style={{
          background: "none",
          border: "none",
          color,
          cursor: isLoading ? "default" : "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          opacity: isLoading ? 0.5 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isLoading ? (
          <Loader2 width={size} height={size} style={{ animation: "spin 1s linear infinite" }} />
        ) : isFollowing ? (
          <ThumbsDown width={size} height={size} />
        ) : (
          <ThumbsUp width={size} height={size} />
        )}
      </button>

      {alert === "follow" && (
        <FollowAlert
          title="¿Seguir esta tienda?"
          description={
            pushSupported
              ? "Recibirás notificaciones en tu dispositivo cuando la tienda publique novedades u ofertas."
              : "Vas a ver las novedades de esta tienda en tu panel de notificaciones."
          }
          confirmLabel="Sí, seguir"
          confirmColor="#4f46e5"
          onConfirm={confirmFollow}
          onCancel={() => setAlert(null)}
        />
      )}

      {alert === "unfollow" && (
        <FollowAlert
          title="¿Dejar de seguir?"
          description="Ya no recibirás notificaciones ni novedades de esta tienda."
          confirmLabel="Dejar de seguir"
          confirmColor="#dc2626"
          onConfirm={confirmUnfollow}
          onCancel={() => setAlert(null)}
        />
      )}

      {alert === "login" && (
        <FollowAlert
          title="Iniciá sesión para seguir"
          description="Necesitás una cuenta en TiendaApps para seguir tiendas y recibir sus novedades."
          confirmLabel="Iniciar sesión"
          confirmColor="#4f46e5"
          onConfirm={() => {
            setAlert(null);
            window.location.href = `/login?redirect=/tienda/${storeSlug}`;
          }}
          onCancel={() => setAlert(null)}
        />
      )}

      {alert === "ios" && (
        <FollowAlert
          title="Instalá la tienda primero"
          description='En iPhone las notificaciones solo funcionan si instalás la tienda. Tocá "Compartir" en Safari y elegí "Agregar a pantalla de inicio", luego volvé a intentarlo.'
          confirmLabel="Entendido"
          confirmColor="#4f46e5"
          onConfirm={() => setAlert(null)}
          onCancel={null}
        />
      )}
    </>
  );
}

function FollowAlert({
  title,
  description,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: (() => void) | null;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel ?? undefined}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 24px 24px",
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onCancel && (
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            style={{
              position: "absolute", top: 12, right: 12,
              background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", display: "flex", padding: 4,
            }}
          >
            <X width={16} height={16} />
          </button>
        )}
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 8, paddingRight: 20 }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 20 }}>
          {description}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "#fff",
                fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 12,
              border: "none", background: confirmColor,
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
