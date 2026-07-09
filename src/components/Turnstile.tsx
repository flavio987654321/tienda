"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

// Se comparte entre todos los formularios de la página — si ya se cargó una vez
// (en otra pantalla, durante la misma sesión), no hace falta esperar el onLoad de nuevo.
let scriptLoaded = false;

// Widget de verificación "soy una persona" de Cloudflare Turnstile. Modo managed:
// la mayoría de las veces no le pide nada al visitante, solo interviene si Cloudflare
// sospecha que es un bot. Llama a onVerify(token) cuando se resuelve, y onVerify("")
// si expira o falla — el formulario debe tratar ambos como "todavía no verificado".
export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const [scriptReady, setScriptReady] = useState(scriptLoaded);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile!.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => onVerifyRef.current(""),
      "error-callback": () => onVerifyRef.current(""),
    });
  }, [scriptReady, siteKey]);

  // Sin clave pública configurada (ej. desarrollo local) no se muestra nada —
  // el backend igual deja pasar si TURNSTILE_SECRET_KEY tampoco está configurada.
  if (!siteKey) return null;

  return (
    <>
      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => { scriptLoaded = true; setScriptReady(true); }}
      />
      <div ref={containerRef} />
    </>
  );
}
