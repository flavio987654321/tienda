"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
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
  const info = getTemplateInfo(params.id);

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
    isOwner: false,
  };

  return (
    <div className="min-h-screen">
      {!bannerClosed && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-950 text-white text-sm flex items-center justify-between gap-3 px-4 py-2.5 shadow-lg">
          <Link href="/#como-funciona" className="flex items-center gap-1.5 font-medium hover:text-orange-300 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver a TiendaApps
          </Link>
          <span className="text-gray-300 truncate">
            Estás viendo solo el diseño de <strong className="text-white">{info.name}</strong>, no es una tienda real ni se puede comprar.
          </span>
          <button onClick={() => setBannerClosed(true)} aria-label="Cerrar aviso" className="text-gray-400 hover:text-white flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* pointer-events-none: es una demo de "solo mirar" — se puede scrollear
          para recorrer el diseño, pero no clickear productos, catálogo, etc. */}
      <div className={bannerClosed ? "" : "pt-10"} style={{ pointerEvents: "none" }}>
        <StorefrontTemplateRenderer config={config} />
      </div>
    </div>
  );
}
