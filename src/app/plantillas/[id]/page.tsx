"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Store, Lock } from "lucide-react";
import StorefrontTemplateRenderer from "@/components/store/StorefrontTemplateRenderer";
import { getTemplateInfo } from "@/lib/templateRegistry";
import { DEFAULT_CONFIG, TEMPLATE_TIPO_TIENDA } from "@/types/store-config";
import type { StoreConfig } from "@/types/store-config";

// Demo pública y de solo lectura: sin slug, así useStorefront() rellena la
// tienda con el pool de productos demo del rubro en vez de buscar una tienda
// real. No requiere login ni datos en la base.
export default function PlantillaDemoPage() {
  const params = useParams<{ id: string }>();
  const [bannerClosed, setBannerClosed] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const info = getTemplateInfo(params.id);

  const showToast = useCallback(() => {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2800);
  }, []);

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center px-6">
        <div>
          <p className="text-gray-900 font-bold text-lg mb-2">No encontramos ese diseño</p>
          <Link href="/#como-funciona" className="text-orange-600 font-semibold hover:text-orange-700">Volver a TiendaApps</Link>
        </div>
      </div>
    );
  }

  const tipoTienda = TEMPLATE_TIPO_TIENDA[info.id]?.[0] ?? "GENERAL";
  const config: StoreConfig = {
    ...DEFAULT_CONFIG,
    template: info.id,
    storeName: info.name,
    storeTagline: info.desc,
    tipoTienda,
    previewFill: true,
    // Los productos y reseñas de ejemplo sí, los avisos para la dueña no: acá
    // mira gente que todavía no tiene tienda.
    demoPublica: true,
    isOwner: false,
  };

  return (
    <div className="min-h-screen">
      {/* Banner superior */}
      {!bannerClosed && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-950 text-white text-sm flex items-center gap-3 px-4 py-2.5 shadow-lg">
          <Link href="/#como-funciona" className="flex items-center gap-1.5 font-medium hover:text-orange-300 transition-colors flex-shrink-0">
            <ArrowLeft className="h-4 w-4" /> Volver a TiendaApps
          </Link>
          <span className="hidden sm:block flex-1 text-center text-gray-300 truncate">
            Estás viendo solo el diseño de <strong className="text-white">{info.name}</strong>, no es una tienda real ni se puede comprar.
          </span>
          <button onClick={() => setBannerClosed(true)} aria-label="Cerrar aviso" className="text-gray-400 hover:text-white flex-shrink-0 ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toast "Es una demo" */}
      <div
        className="fixed bottom-24 sm:bottom-6 left-1/2 z-[300] pointer-events-none"
        style={{
          transition: "opacity 0.25s ease, transform 0.25s ease",
          opacity: toast ? 1 : 0,
          transform: toast ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(12px)",
        }}
      >
        <div className="flex items-center gap-3 bg-gray-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 whitespace-nowrap">
          <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Lock className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Esto es una demo</p>
            <p className="text-xs text-gray-400 leading-tight">Creá tu tienda gratis para explorar</p>
          </div>
          <Link
            href="/registro"
            className="pointer-events-auto ml-2 flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
          >
            <Store className="h-3 w-3" /> Crear tienda
          </Link>
        </div>
      </div>

      {/* Demo de solo vista: hover, carruseles por drag/swipe y dropdowns funcionan.
          Se bloquean todos los clicks para evitar modales, navegación por <a>
          y navegación programática (window.location.href en botones de categoría). */}
      <div
        className={bannerClosed ? "" : "pt-10"}
        onClickCapture={(e) => {
          // Flechas de carrusel (< >) deben funcionar normalmente en la demo
          const btn = (e.target as Element).closest("button");
          if (btn) {
            const label = (btn.getAttribute("aria-label") ?? "").toLowerCase();
            if (label === "anterior" || label === "siguiente") return;
          }
          e.preventDefault();
          e.stopPropagation();
          showToast();
        }}
      >
        <StorefrontTemplateRenderer config={config} />
      </div>
    </div>
  );
}
