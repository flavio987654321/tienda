"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Loader2, X } from "lucide-react";
import { usePushBell } from "@/contexts/PushBellContext";
import { pedirTurno } from "@/lib/interrupcion-tienda";
import { CAPAS } from "@/lib/capas-tienda";

type AlertType = "follow" | "unfollow" | "login" | "ios" | "activate_push" | null;

interface Props {
  storeSlug: string;
  color?: string;
  size?: number;
}

const HINT_SHOWN_KEY = (slug: string) => `push_activate_hint_${slug}`;
const HINT_WIDTH = 220;
const VIEWPORT_MARGIN = 12;

export default function StoreFollowButton({ storeSlug, color = "currentColor", size = 20 }: Props) {
  const bell = usePushBell();
  const [alert, setAlert] = useState<AlertType>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintPos, setHintPos] = useState({ top: 0, left: 0, arrowLeft: HINT_WIDTH - 20 });
  const pendingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const liberarHint = useRef<(() => void) | null>(null);

  const needsPushActivation = bell?.needsPushActivation ?? false;

  // Globo de aviso: solo la primera vez que abre la app instalada (PWA) en
  // este dispositivo y todavía no activó las notificaciones acá. Posición
  // calculada en base al botón real para no salirse de la pantalla en mobile.
  //
  // Pide turno como el resto de lo que aparece solo: es el último de la fila
  // —solo lo ve quien YA sigue la tienda, así que es el que menos se pierde si
  // espera— y sin esto salía encima del flyer o del cartel de instalar. Ver
  // `lib/interrupcion-tienda`.
  useEffect(() => {
    if (!needsPushActivation) return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;
    if (localStorage.getItem(HINT_SHOWN_KEY(storeSlug))) return;
    if (!wrapRef.current) return;

    let t: ReturnType<typeof setTimeout> | undefined;
    // La posición se mide cuando le toca aparecer, no ahora: entre el pedido y el
    // turno el visitante pudo haber scrolleado, y el globo apunta a un botón que
    // para entonces está en otro lado.
    //
    // `soltar` llega POR PARÁMETRO y no de la variable de afuera: cuando la
    // pantalla está libre este callback corre de forma sincrónica, o sea antes de
    // que `const liberar` termine de asignarse. Leerla acá adentro tiraba
    // `ReferenceError` justo en el camino más común (tienda sin flyer).
    //
    // El tercer argumento dice que a este globo SE LO PUEDE SACAR si llega algo
    // más importante: es un aviso pasivo que se va solo, y no tiene por qué
    // hacerle esperar 7 segundos a la oferta del comerciante.
    const liberar = pedirTurno("activar-push", (soltar) => {
      liberarHint.current = soltar;
      const wrap = wrapRef.current;
      // Sin el botón en pantalla no hay dónde apuntar. Hay que soltar el turno
      // igual: si no, la cola queda trabada por el resto de la sesión y no vuelve
      // a aparecer ninguna otra interrupción.
      if (!wrap) { soltar(); return; }
      const rect = wrap.getBoundingClientRect();
      const idealLeft = rect.right - HINT_WIDTH;
      const left = Math.min(
        Math.max(idealLeft, VIEWPORT_MARGIN),
        window.innerWidth - HINT_WIDTH - VIEWPORT_MARGIN
      );
      const buttonCenter = rect.left + rect.width / 2;
      const arrowLeft = Math.min(Math.max(buttonCenter - left - 6, 14), HINT_WIDTH - 26);

      localStorage.setItem(HINT_SHOWN_KEY(storeSlug), "1");
      setHintPos({ top: rect.bottom + 10, left, arrowLeft });
      setShowHint(true);
      t = setTimeout(() => { setShowHint(false); soltar(); }, 7000);
    }, () => {
      // Lo desaloja algo más importante: se esconde y vuelve a la cola solo.
      clearTimeout(t);
      setShowHint(false);
    });

    return () => { clearTimeout(t); liberar(); liberarHint.current = null; };
  }, [needsPushActivation, storeSlug]);

  /* Esconder el globo tiene que soltar el turno siempre, se haya ido solo a los
     7 s o lo haya cerrado el visitante. Si un camino se olvida de liberar, la
     cola queda trabada y no vuelve a aparecer ninguna interrupción en toda la
     sesión — el tipo de bug que no se nota hasta que alguien pregunta por qué el
     flyer dejó de salir. */
  const cerrarHint = useCallback(() => {
    setShowHint(false);
    liberarHint.current?.();
    liberarHint.current = null;
  }, []);

  if (!bell) return null;

  const { followState, handleFollow, handleUnfollow, pushSupported, activatePushOnDevice } = bell;
  const isLoading = followState === "loading" || followState === "checking";
  const isFollowing = followState === "following";
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  function onClickButton() {
    cerrarHint();
    if (pendingRef.current || isLoading) return;
    if (isFollowing) {
      if (needsPushActivation) { setAlert("activate_push"); return; }
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
      <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
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

      </div>

      {showHint && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: hintPos.top,
            left: hintPos.left,
            zIndex: CAPAS.entradaApp,
            width: HINT_WIDTH,
            maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
            background: "#111827",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
            animation: "fadeSlideDown 0.25s ease-out",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -6,
              left: hintPos.arrowLeft,
              width: 12,
              height: 12,
              background: "#111827",
              transform: "rotate(45deg)",
            }}
          />
          <button
            onClick={cerrarHint}
            aria-label="Cerrar"
            style={{
              position: "absolute", top: 4, right: 4,
              background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", display: "flex", padding: 4,
            }}
          >
            <X width={12} height={12} />
          </button>
          <p style={{ fontSize: 12, lineHeight: 1.4, paddingRight: 14, margin: 0 }}>
            👆 Tocá aquí para activar las notificaciones y no perderte las novedades de esta tienda
          </p>
        </div>
      )}

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

      {alert === "activate_push" && (
        <FollowAlert
          title="Notificaciones desactivadas"
          description="Ya seguís esta tienda pero las notificaciones no están activas en este dispositivo. ¿Querés activarlas ahora?"
          confirmLabel="Activar notificaciones"
          confirmColor="#4f46e5"
          onConfirm={async () => {
            setAlert(null);
            await activatePushOnDevice();
          }}
          onCancel={() => setAlert("unfollow")}
          cancelLabel="Dejar de seguir"
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
  cancelLabel = "Cancelar",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: (() => void) | null;
  cancelLabel?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: CAPAS.critico,
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
              {cancelLabel}
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
