"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Clock, Loader2, Send, Store, TrendingUp, Users, Wallet,
  XCircle, Share2, Copy, Check, ExternalLink, LogOut, ShoppingBag,
  Star, Package, ArrowRight, BarChart3, Zap, ChevronDown, ChevronUp,
  Bell, Eye,
} from "lucide-react";

/* ── Social share icons ── */
const WaIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.608L0 24l6.534-1.376A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.361-.214-3.741.981.999-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const TwIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const TgIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;

/* ── Share Modal ── */
interface ShareProduct { id: string; name: string; price: number; images: string; category: string; }
interface ShareTarget { storeSlug: string; storeName: string; affiliateId: string; commissionRate: number; }

function ShareModal({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [products, setProducts] = useState<ShareProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tab, setTab] = useState<"tienda" | "productos">("tienda");

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

  const shareButtons = (url: string, label: string) => [
    {
      label: "WhatsApp",
      icon: <WaIcon />,
      color: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/20",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mirá ${label}! 🛍️\n${url}`)}`, "_blank"),
    },
    {
      label: "Facebook",
      icon: <FbIcon />,
      color: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border-[#1877F2]/20",
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank"),
    },
    {
      label: "Twitter / X",
      icon: <TwIcon />,
      color: "bg-gray-800 text-gray-300 hover:bg-gray-700 border-white/10",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Mirá ${label}! 🛍️`)}&url=${encodeURIComponent(url)}`, "_blank"),
    },
    {
      label: "Telegram",
      icon: <TgIcon />,
      color: "bg-[#0088CC]/10 text-[#0088CC] hover:bg-[#0088CC]/20 border-[#0088CC]/20",
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`¡Mirá ${label}!`)}`, "_blank"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-950 border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Compartir · {target.storeName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Comisión: <span className="text-emerald-400 font-semibold">{target.commissionRate}%</span> por venta</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-white/5 flex-shrink-0">
          {[["tienda", "Tienda completa"], ["productos", "Por producto"]].map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t as "tienda" | "productos")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "tienda" ? (
            <>
              {/* Link box */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tu link de afiliado</p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                  <p className="flex-1 text-xs text-indigo-300 break-all font-mono">{storeUrl}</p>
                  <button
                    onClick={() => copy(storeUrl, "store")}
                    className="flex-shrink-0 w-9 h-9 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 transition-all"
                  >
                    {copied === "store" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Social buttons */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compartir en redes</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {shareButtons(storeUrl, target.storeName).map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.action}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border font-semibold text-sm transition-all ${btn.color}`}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instagram / TikTok tip */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📱</span>
                  <p className="text-sm font-bold text-white">Instagram & TikTok</p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Copiá tu link y pegalo en tu bio o en una historia con sticker de link.
                </p>
                <button
                  onClick={() => copy(storeUrl, "ig")}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-xl text-xs font-semibold hover:from-purple-600/50 hover:to-pink-600/50 transition-all"
                >
                  {copied === "ig" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "ig" ? "¡Copiado!" : "Copiar link para bio"}
                </button>
              </div>

              {/* View store */}
              <Link
                href={storeUrl}
                target="_blank"
                className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white py-3 rounded-2xl text-sm font-medium transition-all hover:bg-white/5"
              >
                <Eye className="h-4 w-4" /> Ver cómo queda tu tienda
              </Link>
            </>
          ) : (
            <>
              {loadingProducts ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Esta tienda aún no tiene productos cargados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Elegí un producto para compartir su link con tu comisión incluida.</p>
                  {products.map((p) => {
                    const pUrl = productUrl(p.id);
                    const imgs = (() => { try { return JSON.parse(p.images); } catch { return []; } })();
                    return (
                      <div key={p.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-600 m-auto mt-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-indigo-400 text-xs font-bold">${p.price.toLocaleString("es-AR")}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => copy(pUrl, p.id)}
                            className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            title="Copiar link"
                          >
                            {copied === p.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mirá este producto! 🛍️\n${p.name}\n${pUrl}`)}`, "_blank")}
                            className="w-9 h-9 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl flex items-center justify-center text-[#25D366] transition-all"
                            title="Compartir por WhatsApp"
                          >
                            <WaIcon />
                          </button>
                          <button
                            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pUrl)}`, "_blank")}
                            className="w-9 h-9 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 rounded-xl flex items-center justify-center text-[#1877F2] transition-all"
                            title="Compartir en Facebook"
                          >
                            <FbIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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

/* ── Status badge ── */
const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Pendiente de aprobación", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
  APPROVED: { label: "Aprobada ✓", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  REJECTED: { label: "Rechazada", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  PAUSED: { label: "Pausada", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20", dot: "bg-gray-400" },
};

export default function VendedorasPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [applyStore, setApplyStore] = useState<StoreItem | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  useEffect(() => {
    fetch("/api/vendedoras?mode=tiendas-disponibles")
      .then((r) => r.json())
      .then(({ stores }) => { setStores(stores ?? []); setLoadingStores(false); });
  }, []);

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

  const userName = (session?.user as any)?.name ?? "Afiliado";
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
                  onClick={() => signOut({ callbackUrl: "/" })}
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
          {/* Stats header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative bg-gradient-to-br from-indigo-950 via-purple-950/50 to-gray-950 border border-white/10 rounded-3xl p-8 overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">Panel de afiliado</h1>
                    <p className="text-gray-400 text-sm">Hola, <span className="text-indigo-300 font-semibold">{userName}</span> 👋</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Tiendas activas", value: approvedStores.length, icon: CheckCircle, color: "text-emerald-400" },
                    { label: "Solicitudes pendientes", value: pendingStores.length, icon: Clock, color: "text-yellow-400" },
                    { label: "Tiendas disponibles", value: availableStores.length, icon: Store, color: "text-indigo-400" },
                    { label: "Mi billetera", value: "Ver →", icon: Wallet, color: "text-purple-400", link: "/vendedoras/billetera" },
                  ].map(({ label, value, icon: Icon, color, link }) => (
                    link ? (
                      <Link key={label} href={link} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all group">
                        <Icon className={`h-5 w-5 ${color} mb-3`} />
                        <p className={`text-lg font-black ${color} group-hover:underline`}>{value}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                      </Link>
                    ) : (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <Icon className={`h-5 w-5 ${color} mb-3`} />
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
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
                            <Share2 className="h-4 w-4" /> Compartir
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
