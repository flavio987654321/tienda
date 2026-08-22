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
  // Mantener la callback más reciente en el ref sin asignarla durante el render
  // (lo usan los callbacks de Turnstile, que corren siempre después del commit).
  useEffect(() => { onVerifyRef.current = onVerify; });
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

  /* ── No esperar el aviso del <Script>: mirar si Turnstile ya está ───────────
   *
   * `onReady` es un aviso que da next/script cuando terminó de cargar. Medido en
   * producción el 22/08/2026: el `<script>` estaba en la página y `window.turnstile`
   * cargado, pero ese aviso NUNCA llegó — así que `scriptReady` se quedaba en false,
   * el efecto de abajo nunca dibujaba el widget, y sin widget no hay token. En
   * pantalla eso es el botón clavado en "Verificando…" para siempre, sin un error
   * que lo explique. El ingreso a la plataforma estaba caído por esto.
   *
   * La causa del aviso perdido no importa acá, y ese es justamente el punto: lo que
   * el widget necesita para dibujarse no es que alguien avise, es que
   * `window.turnstile.render` exista. Preguntarlo directamente no puede fallar por
   * un aviso que no llegó. Si `onReady` igual llega, mejor: pone `scriptReady` antes
   * y este efecto sale por la primera línea.
   *
   * La primera consulta va en un timeout de 0 y no acá derecho: llamar a setState en
   * el cuerpo de un efecto es lo que el lint del repo marca (`set-state-in-effect`).
   *
   * Y a los 15 segundos se corta. Antes, un script que no cargaba dejaba el
   * formulario colgado en silencio; ahora dice que no se pudo verificar y que
   * recargue, que es lo mismo que ya hacía cuando el script fallaba con error. */
  useEffect(() => {
    if (!inView || !siteKey || scriptReady) return;
    let vivo = true;
    let reintento: number | undefined;
    const buscar = () => {
      if (!vivo) return;
      if (window.turnstile?.render) { setScriptReady(true); return; }
      reintento = window.setTimeout(buscar, 150);
    };
    reintento = window.setTimeout(buscar, 0);
    const corte = window.setTimeout(() => {
      vivo = false;
      window.clearTimeout(reintento);
      setScriptFailed(true);
    }, 15_000);
    return () => { vivo = false; window.clearTimeout(reintento); window.clearTimeout(corte); };
  }, [inView, siteKey, scriptReady]);

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
