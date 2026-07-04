"use client";

import { useState } from "react";
import { Share2, Copy, Check, X, Smartphone } from "lucide-react";

/* ── Platform SVG icons ── */
function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function TkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.16 8.16 0 004.77 1.52V6.82a4.85 4.85 0 01-1-.13z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ── Main component ── */
export default function ShareStoreButton({
  storeName,
  storeSlug,
  storeLogo,
  isPublished,
}: {
  storeName: string;
  storeSlug: string;
  storeLogo: string | null;
  isPublished: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null); // inline tip for IG/TikTok
  const [copied, setCopied] = useState<string | null>(null); // which button triggered copy

  function getUrl() {
    return `${window.location.origin}/tienda/${storeSlug}`;
  }

  async function copyToClipboard(triggerId: string) {
    await navigator.clipboard.writeText(getUrl());
    setCopied(triggerId);
    setTimeout(() => setCopied(null), 2500);
  }

  function openDirect(url: string) {
    window.open(url, "_blank");
  }

  async function handleNativeShare() {
    const url = getUrl();
    if (navigator.share) {
      await navigator.share({ title: storeName, text: `Comprá en ${storeName}`, url });
    }
  }

  async function handlePlatform(id: string) {
    const url = getUrl();
    setHint(null);

    if (id === "whatsapp") {
      openDirect(`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Mirá mi tienda! 🛍️\n${storeName}\n${url}`)}`);
    } else if (id === "facebook") {
      openDirect(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    } else if (id === "telegram") {
      openDirect(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(storeName)}`);
    } else if (id === "twitter") {
      openDirect(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Comprá en ${storeName}`)}&url=${encodeURIComponent(url)}`);
    } else if (id === "instagram") {
      await copyToClipboard("instagram");
      setHint("instagram");
    } else if (id === "tiktok") {
      await copyToClipboard("tiktok");
      setHint("tiktok");
    }
  }

  const initials = storeName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <>
      <button
        onClick={() => { setOpen(true); setHint(null); }}
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
            className="relative bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>

            <h3 className="font-bold text-gray-900 mb-1">Compartir tu tienda</h3>
            <p className="text-xs text-gray-400 mb-3">Así aparece cuando alguien recibe el link</p>

            {!isPublished && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
                <p className="text-xs font-semibold text-amber-800 mb-0.5">Tu tienda no está publicada</p>
                <p className="text-xs text-amber-700 mb-2 leading-relaxed">
                  Solo vos podés ver el link por ahora. Publicala para que tus clientes puedan comprar.
                </p>
                <a
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Publicar ahora →
                </a>
              </div>
            )}

            {/* Preview card */}
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-4 shadow-sm">
              <div className="h-28 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-xl font-black text-white">{initials}</span>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-bold text-gray-900">{storeName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Comprá en {storeName} — Envíos a todo el país</p>
                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">tiendaapps.com</p>
              </div>
            </div>

            {/* Native share (mobile only) */}
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mb-3"
              >
                <Smartphone className="h-4 w-4" />
                Compartir con cualquier app
              </button>
            )}

            {/* Platform grid */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Elegí dónde compartir</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* WhatsApp */}
              <button
                onClick={() => handlePlatform("whatsapp")}
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20b85a] text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors"
              >
                <WaIcon /> WhatsApp
              </button>

              {/* Telegram */}
              <button
                onClick={() => handlePlatform("telegram")}
                className="flex items-center gap-2 bg-[#26A5E4] hover:bg-[#1e8fc7] text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors"
              >
                <TgIcon /> Telegram
              </button>

              {/* Facebook */}
              <button
                onClick={() => handlePlatform("facebook")}
                className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#1667d4] text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors"
              >
                <FbIcon /> Facebook
              </button>

              {/* Twitter/X */}
              <button
                onClick={() => handlePlatform("twitter")}
                className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors"
              >
                <XIcon /> Twitter / X
              </button>

              {/* Instagram */}
              <button
                onClick={() => handlePlatform("instagram")}
                className="flex items-center gap-2 text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-all col-span-1"
                style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
              >
                {copied === "instagram" ? <Check className="h-4 w-4 shrink-0" /> : <IgIcon />}
                Instagram
              </button>

              {/* TikTok */}
              <button
                onClick={() => handlePlatform("tiktok")}
                className="flex items-center gap-2 bg-black hover:bg-gray-900 text-white font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors"
              >
                {copied === "tiktok" ? <Check className="h-4 w-4 shrink-0" /> : <TkIcon />}
                TikTok
              </button>
            </div>

            {/* Instagram / TikTok hint */}
            {hint === "instagram" && (
              <div className="mb-3 rounded-xl bg-pink-50 border border-pink-100 px-3 py-2.5">
                <p className="text-xs font-semibold text-pink-700 mb-0.5">Link copiado ✓</p>
                <p className="text-xs text-pink-600 leading-relaxed">
                  Abrí Instagram → Nueva historia → toca el ícono de link → pegalo. O andá a tu perfil → Editar perfil → Sitio web → pegalo.
                </p>
              </div>
            )}
            {hint === "tiktok" && (
              <div className="mb-3 rounded-xl bg-gray-900/5 border border-gray-200 px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-800 mb-0.5">Link copiado ✓</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Abrí TikTok → Tu perfil → Editar perfil → Sitio web → pegalo. Así tus seguidores pueden comprar directo desde tu bio.
                </p>
              </div>
            )}

            {/* Copy link */}
            <button
              onClick={() => copyToClipboard("main")}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {copied === "main" ? (
                <><Check className="h-4 w-4 text-green-600" /><span className="text-green-600">¡Copiado!</span></>
              ) : (
                <><Copy className="h-4 w-4" />Copiar link</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
