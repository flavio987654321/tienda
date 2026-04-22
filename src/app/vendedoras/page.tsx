"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import {
  CheckCircle, Clock, Loader2, Send, Store, TrendingUp, Users, Wallet,
  XCircle, Share2, Copy, Check, ExternalLink, LogOut, ShoppingBag,
  Star, Package, ArrowRight, Eye, Edit3, MapPin, Phone, Save,
  DollarSign, ShoppingCart, Award,
} from "lucide-react";

const IgIconLg = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;

/* ── Social share icons ── */
const WaIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.608L0 24l6.534-1.376A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.361-.214-3.741.981.999-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const TwIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const TgIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;

/* ── Share Modal ── */
interface ShareProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string;
  category: string;
}
interface ShareTarget { storeSlug: string; storeName: string; affiliateId: string; commissionRate: number; }

function parseImages(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

function ShareModal({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [products, setProducts] = useState<ShareProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tab, setTab] = useState<"tienda" | "productos">("tienda");
  const [cardLoading, setCardLoading] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = `${origin}/tienda/${target.storeSlug}?ref=${target.affiliateId}`;

  useEffect(() => {
    fetch(`/api/public/${target.storeSlug}`)
      .then((r) => r.json())
      .then((d) => { setProducts(d.store?.products ?? []); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));
  }, [target.storeSlug]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function productUrl(productId: string) {
    return `${origin}/tienda/${target.storeSlug}?ref=${target.affiliateId}&producto=${productId}`;
  }

  function productShareText(product: ShareProduct, url: string) {
    return [
      `Mira este producto de ${target.storeName}`,
      product.name,
      money(product.price),
      product.description ? product.description : "",
      url,
    ].filter(Boolean).join("\n");
  }

  async function loadCardImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function makeProductCard(product: ShareProduct) {
    const url = productUrl(product.id);
    const imageUrl = parseImages(product.images)[0];
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear la placa");

    ctx.fillStyle = "#070b18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageUrl) {
      try {
        const image = await loadCardImage(imageUrl);
        const scale = Math.max(1080 / image.width, 760 / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (1080 - width) / 2, 0, width, height);
      } catch {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, 1080, 760);
      }
    }

    const gradient = ctx.createLinearGradient(0, 520, 0, 1350);
    gradient.addColorStop(0, "rgba(7,11,24,0)");
    gradient.addColorStop(0.24, "rgba(7,11,24,.86)");
    gradient.addColorStop(1, "#070b18");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 420, 1080, 930);

    ctx.fillStyle = "#a5b4fc";
    ctx.font = "700 34px Arial";
    ctx.fillText(target.storeName.toUpperCase(), 72, 785);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 76px Arial";
    wrapCanvasText(ctx, product.name, 72, 875, 930, 84, 3);

    ctx.fillStyle = "#34d399";
    ctx.font = "900 68px Arial";
    ctx.fillText(money(product.price), 72, 1120);

    if (product.description) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "400 30px Arial";
      wrapCanvasText(ctx, product.description, 72, 1180, 780, 40, 2);
    }

    ctx.fillStyle = "#4f46e5";
    ctx.roundRect(72, 1245, 430, 62, 31);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 26px Arial";
    ctx.fillText(`${target.commissionRate}% comision`, 108, 1285);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 24px Arial";
    ctx.fillText("Link en la publicacion", 650, 1285);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo exportar la placa"))), "image/png", 0.92);
    });
  }

  async function shareCard(product: ShareProduct) {
    setCardLoading(product.id);
    try {
      const blob = await makeProductCard(product);
      const file = new File([blob], `${product.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-placa.png`, { type: "image/png" });
      const text = productShareText(product, productUrl(product.id));

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: product.name, text, files: [file] });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } finally {
      setCardLoading(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#0d0f1a] border border-white/8 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-black text-white">{target.storeName}</h3>
            <p className="text-xs text-gray-600 mt-0.5">Comisión: <span className="text-emerald-400 font-bold">{target.commissionRate}%</span> por venta confirmada</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-3 border-b border-white/5 gap-2 flex-shrink-0">
          {(["tienda", "productos"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-600 hover:text-gray-400 hover:bg-white/5"}`}>
              {t === "tienda" ? "Tienda completa" : "Por producto"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "tienda" ? (
            <div className="p-5 space-y-4">
              {/* Link box */}
              <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Tu link de afiliado</p>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-xs text-indigo-300 font-mono break-all leading-relaxed">{storeUrl}</p>
                  <button onClick={() => copy(storeUrl, "store")}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all">
                    {copied === "store" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "store" ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* WhatsApp — hero */}
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mirá esta tienda! 🛍️\n${target.storeName}\n${storeUrl}`)}`, "_blank")}
                className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20b85a] text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-[#25D366]/20"
              >
                <WaIcon /> Compartir por WhatsApp
              </button>

              {/* Other networks */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`, "_blank")}
                  className="flex items-center justify-center gap-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 text-[#1877F2] font-bold py-3 rounded-xl text-sm transition-all">
                  <FbIcon /> Facebook
                </button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Mirá ${target.storeName}! 🛍️`)}&url=${encodeURIComponent(storeUrl)}`, "_blank")}
                  className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold py-3 rounded-xl text-sm transition-all">
                  <TwIcon /> X
                </button>
                <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(`¡Mirá ${target.storeName}!`)}`, "_blank")}
                  className="flex items-center justify-center gap-2 bg-[#0088CC]/10 hover:bg-[#0088CC]/20 border border-[#0088CC]/20 text-[#0088CC] font-bold py-3 rounded-xl text-sm transition-all">
                  <TgIcon /> Telegram
                </button>
              </div>

              {/* Instagram & TikTok — paso a paso */}
              <div className="bg-gradient-to-br from-purple-950/60 to-pink-950/40 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IgIconLg />
                  <p className="text-sm font-black text-white">Instagram & TikTok</p>
                </div>
                <ol className="space-y-2">
                  {["Copiá tu link de afiliado (arriba ↑)", "Abrí Instagram → Stories → sticker de link", "Pegá el link y publicá la historia"].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500/30 text-purple-300 font-black text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <button onClick={() => copy(storeUrl, "ig")}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600/25 to-pink-600/25 hover:from-purple-600/40 hover:to-pink-600/40 border border-purple-500/25 text-purple-300 font-bold py-2.5 rounded-xl text-sm transition-all">
                  {copied === "ig" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "ig" ? "¡Link copiado!" : "Copiar link"}
                </button>
              </div>

              <Link href={storeUrl} target="_blank"
                className="flex items-center justify-center gap-2 border border-white/8 hover:border-white/15 text-gray-500 hover:text-gray-300 py-3 rounded-2xl text-sm font-medium transition-all hover:bg-white/4">
                <Eye className="h-4 w-4" /> Ver cómo queda la tienda
              </Link>
            </div>
          ) : (
            <div className="p-5">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-10 w-10 text-gray-800 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Esta tienda aún no tiene productos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Instagram tip sticky */}
                  <div className="flex items-start gap-3 bg-purple-950/40 border border-purple-500/15 rounded-2xl px-4 py-3">
                    <span className="text-lg mt-0.5">💡</span>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      <span className="text-purple-300 font-bold">Para Instagram/TikTok:</span> generá la placa de cada producto, descargala y subila a tus stories con el sticker de link.
                    </p>
                  </div>

                  {products.map((p) => {
                    const pUrl = productUrl(p.id);
                    const imgs = parseImages(p.images);
                    const isLoading = cardLoading === p.id;
                    return (
                      <div key={p.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                        {/* Product info row */}
                        <div className="flex items-center gap-4 p-4 pb-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800/60 flex-shrink-0 border border-white/5">
                            {imgs[0]
                              ? <img src={imgs[0]} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-gray-700" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold truncate">{p.name}</p>
                            {p.description && <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">{p.description}</p>}
                            <p className="text-emerald-400 text-sm font-black mt-1">{money(p.price)}</p>
                          </div>
                        </div>

                        {/* CTA principal: Placa */}
                        <div className="px-4 pb-3">
                          <button onClick={() => shareCard(p)} disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20">
                            {isLoading
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando placa...</>
                              : <><Star className="h-4 w-4" /> Generar placa para Instagram / TikTok</>
                            }
                          </button>
                        </div>

                        {/* Acciones secundarias */}
                        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mirá este producto! 🛍️\n${p.name} — ${money(p.price)}\n${pUrl}`)}`, "_blank")}
                            className="flex flex-col items-center gap-1 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/15 text-[#25D366] rounded-xl text-[10px] font-bold transition-all">
                            <WaIcon /> WhatsApp
                          </button>
                          <button onClick={() => copy(pUrl, p.id)}
                            className="flex flex-col items-center gap-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white rounded-xl text-[10px] font-bold transition-all">
                            {copied === p.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            {copied === p.id ? "¡Listo!" : "Copiar link"}
                          </button>
                          <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pUrl)}`, "_blank")}
                            className="flex flex-col items-center gap-1 py-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/15 text-[#1877F2] rounded-xl text-[10px] font-bold transition-all">
                            <FbIcon /> Facebook
                          </button>
                          <Link href={pUrl} target="_blank"
                            className="flex flex-col items-center gap-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white rounded-xl text-[10px] font-bold transition-all">
                            <ExternalLink className="h-4 w-4" /> Ver
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Application Modal ── */
interface StoreItem { id: string; name: string; slug: string; description: string | null; commissionRate: number; primaryColor: string; _count: { products: number }; owner: { name: string | null }; affiliates: { id: string; status: string; isActive: boolean }[]; }

function ApplyModal({ store, onClose, onSuccess }: { store: StoreItem; onClose: () => void; onSuccess: (id: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ applicationMessage: "", experience: "", socialUrl: "", cvUrl: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/vendedoras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, ...form }),
    });
    if (res.ok) {
      const data = await res.json();
      onSuccess(data.affiliate.id);
    }
    setSubmitting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.form
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-950 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5">
          <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Solicitud de afiliado</p>
          <h3 className="text-xl font-black text-white">{store.name}</h3>
          <p className="text-gray-500 text-sm mt-0.5">Comisión ofrecida: <span className="text-emerald-400 font-semibold">{store.commissionRate}%</span> por venta confirmada</p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">¿Por qué querés vender esta tienda? *</label>
            <textarea
              required rows={4} value={form.applicationMessage}
              onChange={(e) => setForm((p) => ({ ...p, applicationMessage: e.target.value }))}
              placeholder="Contale a la dueña tu motivación, tu alcance en redes, cómo vas a vender..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Experiencia vendiendo</label>
            <textarea
              rows={3} value={form.experience}
              onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
              placeholder="Redes que manejo, zona donde vendo, disponibilidad horaria..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Instagram / TikTok / Portfolio</label>
            <input
              value={form.socialUrl} onChange={(e) => setForm((p) => ({ ...p, socialUrl: e.target.value }))}
              placeholder="@tuusuario o https://..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">CV o presentación (opcional)</label>
            <input
              value={form.cvUrl} onChange={(e) => setForm((p) => ({ ...p, cvUrl: e.target.value }))}
              placeholder="Link a Google Drive, Notion, LinkedIn..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 border border-white/10 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:border-white/20 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-50 transition-all">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ── Profile types ── */
interface UserProfile {
  id: string; name: string | null; email: string; image: string | null;
  bio: string | null; city: string | null; instagramHandle: string | null; phone: string | null;
}
interface VendedoraStats {
  totalOrders: number; totalEarned: number; pendingBalance: number; pendingCommissions: number;
}

/* ── Profile Edit Modal ── */
function ProfileEditModal({ profile, onClose, onSave }: { profile: UserProfile; onClose: () => void; onSave: (p: UserProfile) => void }) {
  const [form, setForm] = useState({ name: profile.name ?? "", bio: profile.bio ?? "", city: profile.city ?? "", instagramHandle: profile.instagramHandle ?? "", phone: profile.phone ?? "", image: profile.image ?? "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) upd("image", data.url);
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/vendedoras/perfil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { const { user } = await res.json(); onSave(user); }
    setSaving(false);
  }

  const initial = (form.name || profile.email).charAt(0).toUpperCase();

  const inp = (label: string, key: keyof typeof form, ph: string, icon: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600">{icon}</div>
        <input value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={ph}
          className="w-full bg-gray-900 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 text-sm transition-all" />
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <motion.form initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onSubmit={submit} onClick={e => e.stopPropagation()}
        className="relative bg-[#0d0f1a] border border-white/8 rounded-3xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Editá tu perfil</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 hover:border-indigo-500/50 transition-all shadow-xl focus:outline-none">
              {form.image ? (
                <img src={form.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black">
                  {initial}
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading
                  ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                  : <><Edit3 className="h-5 w-5 text-white" /><span className="text-white text-[10px] font-bold">Cambiar foto</span></>
                }
              </div>
            </button>
            <p className="text-xs text-gray-600">Tocá la foto para cambiarla</p>
          </div>

          {inp("Nombre completo", "name", "Tu nombre", <Edit3 className="h-3.5 w-3.5" />)}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bio / Presentación</label>
            <textarea value={form.bio} onChange={e => upd("bio", e.target.value)} placeholder="Contá quién sos, qué vendés, cuál es tu zona..." rows={3}
              className="w-full bg-gray-900 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 text-sm resize-none transition-all" />
          </div>

          {inp("Ciudad / Zona", "city", "Buenos Aires, Córdoba...", <MapPin className="h-3.5 w-3.5" />)}
          {inp("Instagram", "instagramHandle", "@tuusuario", <IgIconLg />)}
          {inp("Teléfono / WhatsApp", "phone", "+54 9 11 ...", <Phone className="h-3.5 w-3.5" />)}
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-white/5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-white/8 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:border-white/20 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ── Profile Card ── */
function ProfileCard({ profile, stats, onEdit }: { profile: UserProfile; stats: VendedoraStats | null; onEdit: () => void }) {
  const initial = (profile.name || profile.email).charAt(0).toUpperCase();
  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toLocaleString("es-AR")}`;

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-indigo-950/40 to-gray-900 border border-white/10 rounded-3xl p-6 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.image ? (
            <img src={profile.image} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/20">
              {initial}
            </div>
          )}
          <button onClick={onEdit} className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center transition-colors shadow-lg">
            <Edit3 className="h-3 w-3 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">{profile.name || "Sin nombre"}</h2>
              <p className="text-gray-400 text-sm">{profile.email}</p>
            </div>
            <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all font-semibold shrink-0">
              <Edit3 className="h-3 w-3" /> Editar
            </button>
          </div>

          {profile.bio && <p className="text-gray-400 text-sm mt-2 leading-relaxed line-clamp-2">{profile.bio}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {profile.city && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" /> {profile.city}
              </span>
            )}
            {profile.instagramHandle && (
              <span className="flex items-center gap-1 text-xs text-pink-400">
                <IgIconLg /> {profile.instagramHandle}
              </span>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="h-3 w-3" /> {profile.phone}
              </span>
            )}
            {!profile.bio && !profile.city && !profile.instagramHandle && (
              <button onClick={onEdit} className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
                + Completá tu perfil para generar más confianza
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats reales */}
      {stats && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-white/5">
          {[
            { label: "Pedidos generados", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-400" },
            { label: "Total ganado", value: fmt(stats.totalEarned), icon: Award, color: "text-emerald-400" },
            { label: "Comisiones pend.", value: fmt(stats.pendingCommissions), icon: DollarSign, color: "text-yellow-400" },
            { label: "Saldo disponible", value: fmt(stats.pendingBalance), icon: Wallet, color: "text-purple-400", link: "/vendedoras/billetera" },
          ].map(({ label, value, icon: Icon, color, link }) =>
            link ? (
              <a key={label} href={link} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-3 transition-all group cursor-pointer">
                <Icon className={`h-4 w-4 ${color} mb-2`} />
                <p className={`text-lg font-black ${color}`}>{value}</p>
                <p className="text-gray-600 text-xs mt-0.5 group-hover:text-gray-400 transition-colors">{label} →</p>
              </a>
            ) : (
              <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-3">
                <Icon className={`h-4 w-4 ${color} mb-2`} />
                <p className={`text-lg font-black ${color}`}>{value}</p>
                <p className="text-gray-600 text-xs mt-0.5">{label}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Status badge ── */
const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Pendiente de aprobación", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
  APPROVED: { label: "Aprobada ✓", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  REJECTED: { label: "Rechazada", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  PAUSED: { label: "Pausada", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20", dot: "bg-gray-400" },
};

export default function VendedorasPage() {
  const { user, status: sessionStatus, signOut } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [applyStore, setApplyStore] = useState<StoreItem | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<VendedoraStats | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    fetch("/api/vendedoras?mode=tiendas-disponibles")
      .then((r) => r.json())
      .then(({ stores }) => { setStores(stores ?? []); setLoadingStores(false); });
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/perfil").then(r => r.json()).then(d => { if (d.user) setProfile(d.user); });
    fetch("/api/vendedoras?mode=stats").then(r => r.json()).then(d => { setStats(d); });
  }, [sessionStatus]);

  const isLoggedIn = sessionStatus === "authenticated";
  const myAffiliations = stores.filter((s) => s.affiliates.length > 0);
  const approvedStores = myAffiliations.filter((s) => s.affiliates[0]?.status === "APPROVED");
  const pendingStores = myAffiliations.filter((s) => s.affiliates[0]?.status === "PENDING");
  const availableStores = stores.filter((s) => s.affiliates.length === 0);

  function handleApplySuccess(storeId: string, affiliateId: string) {
    setStores((prev) =>
      prev.map((s) => s.id === storeId ? { ...s, affiliates: [{ id: affiliateId, status: "PENDING", isActive: false }] } : s)
    );
    setApplyStore(null);
  }

  const userName = user?.name ?? "Afiliado";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#030712]">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px); background-size: 48px 48px; }
        @keyframes gs { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gt { background: linear-gradient(135deg,#818cf8,#a78bfa,#f472b6,#818cf8); background-size:300% 300%; animation:gs 4s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/vendedoras/billetera" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors px-3 py-2">
                  <Wallet className="h-4 w-4" /> Mi billetera
                </Link>
                <div className="flex items-center gap-2.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {userInitial}
                  </div>
                  <span className="text-sm text-gray-300 font-medium hidden sm:block">{userName}</span>
                </div>
                <button
                  onClick={() => signOut("/")}
                  className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-sm px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:block">Salir</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                  Iniciar sesión
                </Link>
                <Link href="/registro?tipo=vendedora" className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/20">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO / DASHBOARD ── */}
      {isLoggedIn ? (
        /* LOGGED IN: Dashboard */
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          {/* Profile + Stats header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {profile && (
              <ProfileCard profile={profile} stats={stats} onEdit={() => setShowProfileEdit(true)} />
            )}
            {/* Quick counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Tiendas activas", value: approvedStores.length, icon: CheckCircle, color: "text-emerald-400" },
                { label: "Solicitudes pendientes", value: pendingStores.length, icon: Clock, color: "text-yellow-400" },
                { label: "Tiendas disponibles", value: availableStores.length, icon: Store, color: "text-indigo-400" },
                { label: "Mi billetera", value: "Ver →", icon: Wallet, color: "text-purple-400", link: "/vendedoras/billetera" },
              ].map(({ label, value, icon: Icon, color, link }) => (
                link ? (
                  <Link key={label} href={link} className="bg-gray-900/80 hover:bg-gray-900 border border-white/10 rounded-2xl p-4 transition-all group">
                    <Icon className={`h-5 w-5 ${color} mb-3`} />
                    <p className={`text-lg font-black ${color} group-hover:underline`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </Link>
                ) : (
                  <div key={label} className="bg-gray-900/80 border border-white/10 rounded-2xl p-4">
                    <Icon className={`h-5 w-5 ${color} mb-3`} />
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </div>
                )
              ))}
            </div>
          </motion.div>

          {/* Approved stores */}
          {approvedStores.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold text-white">Mis tiendas activas</h2>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{approvedStores.length} activas</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedStores.map((store) => {
                  const aff = store.affiliates[0];
                  return (
                    <motion.div key={store.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/80 border border-white/10 rounded-3xl overflow-hidden">
                      <div className="h-20 relative flex items-center px-5 gap-3" style={{ backgroundColor: store.primaryColor + "30", borderBottom: `1px solid ${store.primaryColor}30` }}>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: store.primaryColor }}>
                          <Store className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{store.name}</h3>
                          <p className="text-xs text-gray-400">por {store.owner.name ?? "Anónimo"}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                            {store.commissionRate}% comisión
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="bg-white/5 border border-white/8 rounded-2xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Tu link de venta</p>
                          <p className="text-xs text-indigo-300 font-mono break-all">
                            {typeof window !== "undefined" ? window.location.origin : ""}/tienda/{store.slug}?ref={aff.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShareTarget({ storeSlug: store.slug, storeName: store.name, affiliateId: aff.id, commissionRate: store.commissionRate })}
                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-semibold text-sm transition-all"
                          >
                            <Share2 className="h-4 w-4" /> Ver productos y compartir
                          </button>
                          <Link
                            href={`/tienda/${store.slug}?ref=${aff.id}`}
                            target="_blank"
                            className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white px-4 py-3 rounded-2xl text-sm transition-all hover:bg-white/5"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          {store._count.products} productos disponibles para compartir
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pending applications */}
          {pendingStores.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <h2 className="text-lg font-bold text-white">Solicitudes en revisión</h2>
              </div>
              <div className="space-y-3">
                {pendingStores.map((store) => (
                  <div key={store.id} className="bg-gray-900/60 border border-yellow-500/10 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: store.primaryColor + "30" }}>
                      <Store className="h-5 w-5" style={{ color: store.primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm">{store.name}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Comisión ofrecida: {store.commissionRate}%</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Pendiente
                      </div>
                      <Link href={`/tienda/${store.slug}`} target="_blank" className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Available stores */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {availableStores.length > 0 ? "Descubrí más tiendas" : "Tiendas disponibles"}
              </h2>
              <span className="text-sm text-gray-500">{availableStores.length} para postularte</span>
            </div>
            {availableStores.length === 0 ? (
              <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-12 text-center">
                <CheckCircle className="h-10 w-10 text-indigo-400/30 mx-auto mb-3" />
                <p className="text-gray-400">Ya te postulaste a todas las tiendas disponibles.</p>
                <p className="text-gray-600 text-sm mt-1">Volvé más tarde para ver nuevas oportunidades.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableStores.map((store) => (
                  <StoreCard key={store.id} store={store} onApply={() => setApplyStore(store)} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* NOT LOGGED IN: Marketing page */
        <>
          <section className="relative min-h-[70vh] flex items-center grid-bg">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-900/20 rounded-full blur-3xl" />
            <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                  <TrendingUp className="h-4 w-4" />
                  Vendé para marcas activas y cobrá comisiones
                </div>
                <h1 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
                  Postulate como<br /><span className="gt">afiliado</span>
                </h1>
                <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                  Elegí tiendas, mandá tu presentación y esperá la aprobación de la dueña. Cuando te acepten, vas a tener tu link propio y cobrar comisiones automáticas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
                  <Link href="/registro" className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-purple-500/25 hover:scale-105">
                    Crear cuenta gratis <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link href="/login" className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/5">
                    Ya tengo cuenta
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
                  {[["$0", "Inversión inicial"], ["10-25%", "Comisión por venta"], ["24hs", "Primer pago"]].map(([v, l]) => (
                    <div key={l} className="border-l border-purple-500/30 pl-4 text-left">
                      <p className="text-2xl font-black text-purple-400">{v}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* How it works */}
          <section className="bg-gray-900/50 py-16">
            <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Users, label: "Solicitudes con aprobación", desc: "La dueña revisa tu perfil antes de darte permiso. Así sabés que trabajás con marcas serias.", color: "#6366f1" },
                { icon: Share2, label: "Compartí por redes", desc: "WhatsApp, Facebook, Instagram. Compartís tu link y cada venta te genera comisión automática.", color: "#a855f7" },
                { icon: Wallet, label: "Cobrás cuando querés", desc: "Tu billetera acumula tus ganancias y pedís el retiro cuando lo necesitás.", color: "#10b981" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="bg-gray-900 border border-white/5 rounded-3xl p-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: color + "20" }}>
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <h3 className="font-bold text-white mb-2">{label}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Available stores preview */}
          <section className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl font-black text-white mb-8">Tiendas que buscan afiliados</h2>
              {loadingStores ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
              ) : stores.length === 0 ? (
                <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-16 text-center">
                  <Store className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No hay tiendas disponibles por ahora.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {stores.slice(0, 6).map((store) => (
                    <StoreCard key={store.id} store={store} onApply={() => router.push("/login")} requiresLogin />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {applyStore && (
          <ApplyModal
            store={applyStore}
            onClose={() => setApplyStore(null)}
            onSuccess={(affiliateId) => handleApplySuccess(applyStore.id, affiliateId)}
          />
        )}
        {shareTarget && (
          <ShareModal target={shareTarget} onClose={() => setShareTarget(null)} />
        )}
        {showProfileEdit && profile && (
          <ProfileEditModal
            profile={profile}
            onClose={() => setShowProfileEdit(false)}
            onSave={(p) => { setProfile(p); setShowProfileEdit(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Store Card ── */
function StoreCard({ store, onApply, requiresLogin }: { store: StoreItem; onApply: () => void; requiresLogin?: boolean }) {
  const aff = store.affiliates[0];
  const status = aff ? STATUS[aff.status] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/80 border border-white/8 rounded-3xl overflow-hidden hover:border-white/15 transition-all group">
      <div className="h-20 flex items-center justify-center relative" style={{ backgroundColor: store.primaryColor + "25" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: store.primaryColor }}>
          <Store className="h-6 w-6 text-white" />
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">{store.commissionRate}%</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-white mb-0.5">{store.name}</h3>
        <p className="text-xs text-gray-500 mb-3">por {store.owner.name ?? "Anónimo"} · {store._count.products} productos</p>
        {store.description && <p className="text-xs text-gray-400 line-clamp-2 mb-4">{store.description}</p>}

        {status && (
          <div className={`mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${status.cls}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        )}

        <div className="flex gap-2">
          <Link href={`/tienda/${store.slug}`} target="_blank" className="flex-1 text-center py-2.5 border border-white/10 hover:border-white/20 rounded-xl text-xs text-gray-400 hover:text-white transition-all font-medium">
            Ver tienda
          </Link>
          {!aff && (
            <button
              onClick={onApply}
              className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all"
            >
              <Send className="h-3 w-3" />
              {requiresLogin ? "Postularme" : "Postularme"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
