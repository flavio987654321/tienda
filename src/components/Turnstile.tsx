"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        action?: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

type TurnstileHandle = { reset: () => void };

// Widget de verificación "soy una persona" de Cloudflare Turnstile. Modo managed:
// la mayoría de las veces no le pide nada al visitante, solo interviene si Cloudflare
// sospecha que es un bot. Llama a onVerify(token) cuando se resuelve, y onVerify("")
// si expira o falla — el formulario debe tratar ambos como "todavía no verificado".
// El script de Cloudflare recién se descarga cuando el widget entra al viewport,
// así los formularios al pie de página no le cuestan nada a quien nunca llega ahí.
export function Turnstile({ onVerify, apiRef, action }: {
  onVerify: (token: string) => void;
  apiRef?: MutableRefObject<TurnstileHandle | null>;
  action?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const [inView, setInView] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (inView || !siteKey) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting)) { setInView(true); obs.disconnect(); } },
      { rootMargin: "200px" } // arranca a cargar un poco antes de que se vea
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, siteKey]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || widgetIdRef.current) return;
    const id = window.turnstile!.render(containerRef.current, {
      sitekey: siteKey,
      ...(action ? { action } : {}),
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => onVerifyRef.current(""),
      "error-callback": () => onVerifyRef.current(""),
    });
    widgetIdRef.current = id;
    if (apiRef) {
      apiRef.current = {
        reset: () => { try { window.turnstile?.reset(id); } catch { /* widget ya desmontado */ } },
      };
    }
    return () => {
      try { window.turnstile?.remove?.(id); } catch { /* ya no existe */ }
      widgetIdRef.current = null;
      if (apiRef) apiRef.current = null;
    };
  }, [scriptReady, siteKey, apiRef, action]);

  // Sin clave pública configurada (ej. desarrollo local) no se muestra nada —
  // el backend igual deja pasar si TURNSTILE_SECRET_KEY tampoco está configurada.
  if (!siteKey) return null;

  return (
    <>
      {inView && (
        <Script
          id="cf-turnstile-script"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          // onReady (y no onLoad) porque corre también cuando el script ya estaba
          // cargado y este widget monta después — ej. dos formularios en la misma página
          onReady={() => setScriptReady(true)}
          onError={() => setScriptFailed(true)}
        />
      )}
      {scriptFailed ? (
        <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>
          No pudimos cargar la verificación de seguridad. Recargá la página o desactivá el bloqueador de anuncios para este sitio.
        </p>
      ) : (
        <div ref={containerRef} />
      )}
    </>
  );
}

// Estado + widget + reset en un solo lugar, para no repetir las mismas cinco piezas
// en cada formulario:
//   const captcha = useTurnstile("registro");
//   body del fetch    → turnstileToken: captcha.token
//   al volver el fetch → captcha.reset()   (el token muere al verificarse una vez;
//                        sin reset, el reintento viaja con un token ya usado y falla)
//   en el JSX          → {captcha.widget}
//   en el botón        → disabled={... || !captcha.ready}
// El `action` viaja dentro del token y el endpoint lo exige con el mismo nombre —
// así un token resuelto en un formulario no sirve para ningún otro.
export function useTurnstile(action?: string) {
  const [token, setToken] = useState("");
  const apiRef = useRef<TurnstileHandle | null>(null);
  const configured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const reset = useCallback(() => {
    apiRef.current?.reset();
    setToken("");
  }, []);

  return {
    token,
    configured,
    // Listo para enviar: siempre si el captcha no está configurado; con token si lo está.
    ready: !configured || !!token,
    reset,
    widget: <Turnstile onVerify={setToken} apiRef={apiRef} action={action} />,
  };
}
