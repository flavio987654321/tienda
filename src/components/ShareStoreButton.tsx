"use client";

import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ShareStoreButton({
  storeName,
  storeSlug,
  storeLogo,
}: {
  storeName: string;
  storeSlug: string;
  storeLogo: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return `${window.location.origin}/tienda/${storeSlug}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const url = getUrl();
    const text = encodeURIComponent(`¡Mirá mi tienda! 🛍️\n${storeName}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  const initials = storeName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        Compartir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>

            <h3 className="font-bold text-gray-900 mb-1">Compartir tu tienda</h3>
            <p className="text-xs text-gray-400 mb-5">Así aparece el link cuando lo compartís</p>

            {/* Preview card */}
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-5 shadow-sm">
              <div className="h-32 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                {storeLogo ? (
                  <img
                    src={storeLogo}
                    alt={storeName}
                    className="h-20 w-20 rounded-2xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-black text-white">{initials}</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900">{storeName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Comprá en {storeName} — Envíos a todo el país
                </p>
                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">tiendaapps.com</p>
              </div>
            </div>

            {/* Link display */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-4 border border-gray-200">
              <span className="text-xs text-gray-500 truncate flex-1">
                tiendaapps.com/tienda/{storeSlug}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20b85a] text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                <WaIcon />
                Compartir por WhatsApp
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">¡Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
