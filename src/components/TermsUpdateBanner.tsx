"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, X, Loader2 } from "lucide-react";

export default function TermsUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  /* Este cartel vive en los DOS paneles, y cada uno tiene su propio `scope`.
     Cuál es se le pasa al documento legal para que se dibuje sin el encabezado
     que lleva a la home y al registro: sin eso, tocar "Términos" desde la app
     instalada abría el sitio comercial entero. Ver `desde-el-panel`.

     Pero también vive en `/mi-cuenta`, que NO es un panel instalable: ahí no va
     ningún parámetro. Con un `else` que asumía "dashboard", el cliente terminaba
     en un documento con un "Volver al panel" que lo mandaba a `/dashboard` —una
     pantalla que le dice que su cuenta no es de tienda—, y de paso perdía el
     link a la home estando en una pestaña común, donde nunca hubo problema. */
  const pathname = usePathname() ?? "";
  const panel = pathname.startsWith("/afiliados")
    ? "afiliados"
    : pathname.startsWith("/dashboard")
      ? "dashboard"
      : null;
  const desdePanel = panel ? `?panel=${panel}` : "";

  useEffect(() => {
    // El mail de aviso linkea con ?terminos=1. Sin esto, quien cerró el cartel
    // con la ✕ volvía desde el mail y no lo encontraba: se quedaba sin forma de
    // aceptar, y el cron le seguía escribiendo porque nunca aceptaba.
    const forzado = new URLSearchParams(window.location.search).get("terminos") === "1";
    if (!forzado && sessionStorage.getItem("termsBannerDismissed") === "1") return;
    if (forzado) sessionStorage.removeItem("termsBannerDismissed");

    fetch("/api/auth/terms-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.needsAcceptance) setVisible(true); })
      .catch(() => {});
  }, []);

  async function accept() {
    if (accepting) return; // guard síncrono anti doble-click
    setAccepting(true);
    try {
      const res = await fetch("/api/auth/terms-status", { method: "POST" });
      if (res.ok) setVisible(false);
    } finally {
      setAccepting(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("termsBannerDismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl mb-4 text-sm">
      <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
      <p className="flex-1 min-w-[200px]">
        Actualizamos nuestros{" "}
        <Link href={`/terminos${desdePanel}`} target="_blank" className="font-semibold underline">Términos y Condiciones</Link>{" "}
        y{" "}
        <Link href={`/privacidad${desdePanel}`} target="_blank" className="font-semibold underline">Política de Privacidad</Link>.
      </p>
      <button
        type="button"
        onClick={accept}
        disabled={accepting}
        className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {accepting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Entendido, acepto
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="text-indigo-400 hover:text-indigo-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
