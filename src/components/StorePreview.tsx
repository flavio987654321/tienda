"use client";

import type { ReactElement } from "react";
import { Package, ShoppingBag, Search, Star, Heart, MessageCircle, Truck, Shield, RotateCcw, Zap, ChevronRight } from "lucide-react";

const IgIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const TkIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/></svg>;

export interface StoreConfig {
  name: string; slug?: string; tagline: string; description: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  fontFamily: string; templateId: string;
  logo: string; banner: string;
  productLayout: string; showPrices: boolean; showStock: boolean; showRatings: boolean;
  heroStyle: string; navbarStyle: string; buttonStyle: string;
  cardRadius: string; cardShadow: string; cardHover: string;
  backgroundStyle: string;
  announcementBar: string; announcementBarColor: string;
  instagramUrl: string; facebookUrl: string; tiktokUrl: string;
  whatsappNumber: string; showWhatsappButton: boolean;
  footerText: string; currency: string;
  affiliatesEnabled?: boolean; commissionRate?: string | number;
  seoTitle?: string; seoDescription?: string;
}

const DEMO = [
  { name: "Remera oversize", price: 8500, old: 12000, tag: "OFERTA", stock: 5, rating: 4.5, cat: "Ropa" },
  { name: "Jeans wide leg", price: 15900, old: null, tag: null, stock: 3, rating: 4.2, cat: "Ropa" },
  { name: "Collar dorado", price: 4200, old: null, tag: "NUEVO", stock: 10, rating: 5, cat: "Joyas" },
  { name: "Vestido floral", price: 22000, old: 28000, tag: "OFERTA", stock: 0, rating: 4.8, cat: "Ropa" },
  { name: "Pulsera plata", price: 3800, old: null, tag: null, stock: 7, rating: 4.3, cat: "Joyas" },
  { name: "Bolso bucket", price: 18500, old: null, tag: "NUEVO", stock: 2, rating: 4.7, cat: "Accesorios" },
];

const RADIUS: Record<string,string> = { none:"0px", sm:"6px", md:"12px", lg:"16px", xl:"24px" };
const SHADOW: Record<string,string> = { none:"none", sm:"0 1px 4px rgba(0,0,0,.08)", md:"0 4px 12px rgba(0,0,0,.12)", lg:"0 8px 24px rgba(0,0,0,.16)" };

function fmt(n: number, cur: string) {
  return cur === "USD" ? `U$D ${(n/1000).toFixed(0)}` : `$${n.toLocaleString("es-AR")}`;
}

function Stars({ rating, dark }: { rating: number; dark?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : dark ? "text-white/20" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function AnnouncementBar({ text, color }: { text: string; color: string }) {
  if (!text) return null;
  return <div className="text-white text-center py-1.5 text-xs font-medium" style={{ backgroundColor: color }}>{text}</div>;
}

function SocialBar({ config, dark }: { config: StoreConfig; dark?: boolean }) {
  const hasAny = config.instagramUrl || config.facebookUrl || config.tiktokUrl;
  if (!hasAny) return null;
  return (
    <div className={`flex items-center gap-2 ${dark ? "text-white/40" : "text-gray-400"}`}>
      {config.instagramUrl && <IgIcon />}
      {config.facebookUrl && <FbIcon />}
      {config.tiktokUrl && <TkIcon />}
    </div>
  );
}

function WhatsappButton({ number }: { number: string }) {
  if (!number) return null;
  return (
    <div className="absolute bottom-3 right-3 bg-green-500 text-white rounded-full p-2 shadow-lg cursor-pointer z-20">
      <MessageCircle className="h-4 w-4" />
    </div>
  );
}

// ─── MINIMAL (default) ─── Clean magazine style with large image focus
function MinimalTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      {/* Nav: centered logo, thin */}
      <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <Search className="h-3.5 w-3.5 text-gray-300" />
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <span className="text-sm font-light tracking-[.12em] text-gray-800 uppercase">{config.name || "Tienda"}</span>
        </div>
        <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="relative overflow-hidden" style={{ height: config.heroStyle === "full" ? "200px" : "110px" }}>
          <div className="absolute inset-0"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg, ${p}15, ${config.accentColor}25)` }} />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-xs tracking-[.2em] text-gray-400 uppercase mb-2">{config.tagline || "Nueva temporada"}</p>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{config.name || "Mi Tienda"}</h1>
            {config.description && config.heroStyle === "full" && <p className="text-xs text-gray-400 mt-2 max-w-xs">{config.description}</p>}
            <button className="mt-4 px-6 py-1.5 text-xs font-semibold text-white rounded-full" style={{ backgroundColor: p }}>
              Ver colección →
            </button>
          </div>
        </section>
      )}

      {/* Featured product + grid */}
      <div className="p-3">
        {/* Featured row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-[2] bg-gray-50 rounded-2xl overflow-hidden relative" style={{ minHeight: "120px" }}>
            <div className="h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-200" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
              <p className="text-white text-xs font-bold">{DEMO[0].name}</p>
              {config.showPrices && <p className="text-white/80 text-xs">{fmt(DEMO[0].price, config.currency)}</p>}
            </div>
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontSize: "9px" }}>OFERTA</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {DEMO.slice(1,3).map(item => (
              <div key={item.name} className="flex-1 bg-gray-50 rounded-2xl overflow-hidden relative flex items-center justify-center" style={{ minHeight: "57px" }}>
                <Package className="h-5 w-5 text-gray-200" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/40 to-transparent">
                  <p className="text-white font-bold leading-tight" style={{ fontSize: "9px" }}>{item.name}</p>
                  {config.showPrices && <p className="text-white/70" style={{ fontSize: "8px" }}>{fmt(item.price, config.currency)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Small grid */}
        <div className="grid grid-cols-3 gap-2">
          {DEMO.slice(3).map(item => (
            <div key={item.name} className="bg-white border border-gray-100 rounded-xl overflow-hidden" style={{ boxShadow: SHADOW[config.cardShadow] }}>
              <div className="aspect-square bg-gray-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-200" />
              </div>
              <div className="p-1.5">
                <p className="text-xs text-gray-900 font-medium leading-tight truncate">{item.name}</p>
                {config.showPrices && <p className="text-xs font-bold mt-0.5" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{config.name || "Mi Tienda"}</span>
        <SocialBar config={config} />
        <div className="flex gap-3 text-gray-300 text-xs">
          <Truck className="h-3 w-3" /><Shield className="h-3 w-3" /><RotateCcw className="h-3 w-3" />
        </div>
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── EDITORIAL (fashion) ─── High-fashion magazine, text overlays, portrait cards
function EditorialTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-5 py-3">
        <div className="flex gap-3 text-xs font-medium text-gray-400 tracking-widest uppercase">
          <span>Nueva</span><span>Edit</span>
        </div>
        <span className="text-xs font-black tracking-[.25em] uppercase text-gray-900">{config.name || "FASHION"}</span>
        <div className="flex gap-2 text-gray-400">
          <Heart className="h-3.5 w-3.5" /><ShoppingBag className="h-3.5 w-3.5" />
        </div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-5 gap-0" style={{ minHeight: config.heroStyle === "full" ? "200px" : "120px" }}>
          <div className="col-span-3 relative overflow-hidden"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(160deg,${p},${config.accentColor})` }}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-4 right-2">
              <p className="text-white/60 text-xs tracking-widest uppercase mb-1">SS 2025</p>
              <h1 className="text-white font-black text-2xl italic leading-none">{config.tagline || "Drop Exclusivo"}</h1>
            </div>
          </div>
          <div className="col-span-2 flex flex-col justify-center px-4 py-4 bg-gray-950">
            <p className="text-gray-500 text-xs tracking-widest uppercase">TEMPORADA</p>
            <p className="text-white font-light text-sm mt-1 leading-relaxed">{config.description || "Piezas cuidadosamente seleccionadas"}</p>
            <button className="mt-3 self-start text-xs font-bold uppercase tracking-wider px-4 py-1.5" style={{ backgroundColor: p, color: "#fff" }}>
              VER TODO
            </button>
          </div>
        </section>
      )}

      {/* Category tabs */}
      <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
        {["TODAS","ROPA","JOYAS","ACCES"].map((c,i) => (
          <span key={c} className="text-xs font-bold px-4 py-2.5 shrink-0 tracking-widest transition-colors"
            style={i===0 ? { borderBottom: `2px solid ${p}`, color: p } : { color: "#bbb" }}>
            {c}
          </span>
        ))}
      </div>

      {/* Portrait cards — editorial style */}
      <div className="grid grid-cols-2 gap-0.5 bg-gray-100">
        {DEMO.map((item, i) => (
          <div key={item.name} className={`relative overflow-hidden bg-white ${i === 0 ? "col-span-2" : ""}`}
            style={{ height: i === 0 ? "150px" : "180px" }}>
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Package className={`${i===0?"h-14 w-14":"h-8 w-8"} text-gray-200`} />
            </div>
            {item.tag && <span className="absolute top-2 left-2 text-xs font-black px-2 py-0.5 text-white" style={{ backgroundColor: item.tag==="OFERTA"?"#ef4444":config.accentColor, fontSize: "9px" }}>{item.tag}</span>}
            <button className="absolute top-2 right-2 bg-white/80 p-1 rounded-full">
              <Heart className="h-3 w-3 text-gray-400" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <p className="text-white text-xs font-bold leading-tight">{item.name}</p>
              {config.showPrices && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white font-black" style={{ fontSize: "11px" }}>{fmt(item.price, config.currency)}</span>
                  {item.old && <span className="text-white/50 line-through" style={{ fontSize: "9px" }}>{fmt(item.old, config.currency)}</span>}
                </div>
              )}
            </div>
            {item.stock === 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs tracking-widest font-light">AGOTADO</span></div>}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase text-gray-400">{config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── BOUTIQUE ─── Mosaic asymmetric, color-accent categories
function BoutiqueTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const CARD_COLORS = [p, accent, "#f1f5f9", p+"bb", accent+"bb", "#e2e8f0"];
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="px-4 py-3 flex flex-col items-center border-b border-gray-100">
        <div className="flex items-center justify-between w-full mb-2">
          <Search className="h-3.5 w-3.5 text-gray-300" />
          <div className="flex items-center gap-1.5">
            {config.logo && <img src={config.logo} className="h-6 w-6 rounded-full object-cover" alt="" />}
            <span className="font-black text-sm text-gray-900 tracking-tight">{config.name || "Boutique"}</span>
          </div>
          <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <div className="flex gap-1.5">
          {["Nueva","Bestsellers","Ofertas","Premium"].map((c,i) => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
              style={i===0 ? { backgroundColor: p, color: "#fff" } : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
              {c}
            </span>
          ))}
        </div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-3 gap-1.5 p-2" style={{ height: config.heroStyle === "full" ? "160px" : "100px" }}>
          <div className="col-span-2 rounded-2xl overflow-hidden relative flex items-end p-3"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})` }}>
            <div>
              <p className="text-white/70 text-xs tracking-widest uppercase">Selección</p>
              <h1 className="text-white font-black text-xl leading-tight">{config.tagline || config.name}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent+"33" }}>
              <span className="text-xs font-bold" style={{ color: accent }}>NUEVO</span>
            </div>
            <div className="flex-1 rounded-xl flex items-center justify-center bg-gray-900">
              <span className="text-xs font-bold text-white">TOP</span>
            </div>
          </div>
        </section>
      )}

      {/* Asymmetric mosaic product grid */}
      <div className="p-2">
        <div className="grid grid-cols-6 grid-rows-3 gap-1.5" style={{ height: "240px" }}>
          {/* Big featured card */}
          <div className="col-span-3 row-span-2 rounded-2xl overflow-hidden relative" style={{ backgroundColor: CARD_COLORS[0]+"22" }}>
            <div className="h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-xs font-bold">{DEMO[0].name}</p>
              {config.showPrices && <p style={{ color: "#fff", fontSize: "11px", fontWeight: 900 }}>{fmt(DEMO[0].price, config.currency)}</p>}
            </div>
            <span className="absolute top-2 left-2 text-white font-bold px-1.5 py-0.5 rounded-lg" style={{ fontSize: "9px", backgroundColor: "#ef4444" }}>OFERTA</span>
          </div>
          {/* Two small cards top right */}
          {DEMO.slice(1,3).map((item,i) => (
            <div key={item.name} className="col-span-3 row-span-1 rounded-xl overflow-hidden flex gap-2 items-center p-2"
              style={{ backgroundColor: i===0 ? "#f8fafc" : p+"11", border: "1px solid #f0f0f0" }}>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-gray-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                {config.showPrices && <p className="text-xs font-black" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              </div>
            </div>
          ))}
          {/* Bottom row 3 small */}
          {DEMO.slice(3).map((item,i) => (
            <div key={item.name} className="col-span-2 row-span-1 rounded-xl overflow-hidden relative" style={{ backgroundColor: CARD_COLORS[i+3]+"22" }}>
              <div className="h-full flex items-center justify-center">
                <Package className="h-4 w-4 text-gray-300" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="font-bold text-gray-900 leading-tight truncate" style={{ fontSize: "9px" }}>{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-black text-xs text-gray-900">{config.name}</span>
        <SocialBar config={config} />
        <span className="text-xs text-gray-400">{config.footerText || "©2025"}</span>
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── COLOR POP ─── Bold colored blocks, NO gray cards
function ColorBlocksTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const bg = config.secondaryColor || "#f0f4ff";
  const COLORS = [p, accent, "#0f172a", p+"cc", accent+"cc", "#1e293b"];
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, backgroundColor: bg }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-4 py-3">
        <span className="font-black text-lg text-gray-900 leading-none">{config.name || "Color\nPop"}</span>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm">
            <Search className="h-3 w-3 text-gray-400" /><span className="text-xs text-gray-400">Buscar</span>
          </div>
          <ShoppingBag className="h-4 w-4 text-gray-700" />
        </div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="px-3 mb-3">
          <div className="rounded-3xl overflow-hidden" style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})`, minHeight: config.heroStyle==="full"?"160px":"90px" }}>
            <div className="h-full p-5 flex flex-col justify-center">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Hoy destacado 🔥</p>
              <h1 className="text-white font-black text-2xl leading-tight mt-1">{config.tagline || "Ofertas increíbles"}</h1>
              {config.description && config.heroStyle==="full" && <p className="text-white/70 text-xs mt-1">{config.description}</p>}
              <button className="mt-3 self-start bg-white font-black text-xs px-5 py-2 rounded-full" style={{ color: p }}>Ver todo →</button>
            </div>
          </div>
        </section>
      )}

      {/* Bold colored product cards */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((item, i) => {
            const cardColor = COLORS[i % COLORS.length];
            const isLight = i === 2;
            const textColor = isLight ? "#1f2937" : "#ffffff";
            return (
              <div key={item.name} className="rounded-2xl overflow-hidden relative" style={{ backgroundColor: cardColor, minHeight: "130px" }}>
                <div className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      {item.tag && <span className="text-xs font-black px-2 py-0.5 rounded-full mb-1 inline-block"
                        style={{ backgroundColor: isLight ? cardColor+"44" : "rgba(255,255,255,0.25)", color: isLight ? "#374151" : "#fff", fontSize: "9px" }}>
                        {item.tag}
                      </span>}
                      <p className="font-bold leading-tight" style={{ color: textColor, fontSize: "12px" }}>{item.name}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isLight ? "#f3f4f6" : "rgba(255,255,255,0.15)" }}>
                      <Package className="h-6 w-6" style={{ color: isLight ? "#d1d5db" : "rgba(255,255,255,0.4)" }} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    {config.showPrices && (
                      <div>
                        <p className="font-black text-sm" style={{ color: textColor }}>{fmt(item.price, config.currency)}</p>
                        {item.old && <p className="line-through opacity-50 font-medium" style={{ color: textColor, fontSize: "9px" }}>{fmt(item.old, config.currency)}</p>}
                      </div>
                    )}
                    <button className="text-xs font-black w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: isLight ? cardColor : "rgba(255,255,255,0.2)", color: isLight ? "#374151" : "#fff" }}>
                      +
                    </button>
                  </div>
                </div>
                {item.stock === 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl"><span className="text-white font-black text-xs">AGOTADO</span></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        <span className="font-black text-sm text-gray-900">{config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── LUXURY ─── Ultra dark, horizontal product catalog, gold accents
function LuxurySplitTemplate({ config }: { config: StoreConfig }) {
  const gold = config.accentColor || "#d4af37";
  return (
    <div className="min-h-full relative" style={{ fontFamily: "'Georgia',serif", backgroundColor: "#080808", color: "#e8e0d0" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || gold} />
      <nav className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${gold}22` }}>
        <div className="h-px w-8" style={{ backgroundColor: gold }} />
        <div className="text-center">
          <p className="text-white text-xs font-light tracking-[.35em] uppercase">{config.name || "LUXE"}</p>
          {config.tagline && <p className="text-xs tracking-widest" style={{ color: gold, fontSize: "8px" }}>{config.tagline}</p>}
        </div>
        <ShoppingBag className="h-4 w-4" style={{ color: gold }} />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-2 gap-0" style={{ minHeight: config.heroStyle==="full"?"180px":"100px" }}>
          <div className="relative overflow-hidden"
            style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)) url(${config.banner}) center/cover` : "linear-gradient(135deg,#1a1a1a,#2a2020)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-12 w-12 text-white/5" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
          </div>
          <div className="flex flex-col justify-center px-5 py-6 bg-black">
            <div className="w-6 h-px mb-3" style={{ backgroundColor: gold }} />
            <p className="text-xs tracking-[.25em] uppercase mb-1" style={{ color: gold }}>Exclusivo</p>
            <h1 className="text-white font-light text-xl leading-tight">{config.tagline || config.name}</h1>
            {config.description && config.heroStyle==="full" && <p className="text-white/40 text-xs mt-2 leading-relaxed">{config.description}</p>}
            <button className="mt-4 self-start text-xs tracking-widest uppercase px-5 py-1.5" style={{ border: `1px solid ${gold}`, color: gold }}>
              Descubrir
            </button>
          </div>
        </section>
      )}

      {/* Horizontal list — like a luxury catalog */}
      <div className="px-4 py-3">
        <p className="text-xs tracking-[.2em] uppercase mb-3" style={{ color: gold }}>Colección</p>
        {DEMO.map((item, i) => (
          <div key={item.name} className="flex items-center gap-4 py-3" style={{ borderBottom: `1px solid ${gold}11` }}>
            <span className="text-xs font-light w-4 shrink-0" style={{ color: gold + "60" }}>0{i+1}</span>
            <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "#1a1a1a" }}>
              <Package className="h-4 w-4 text-white/10" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-light text-white/80 tracking-wider uppercase leading-tight truncate">{item.name}</p>
              <p className="text-xs mt-0.5" style={{ color: `${gold}60`, fontSize: "9px" }}>{item.cat}</p>
            </div>
            <div className="text-right shrink-0">
              {config.showPrices && <p className="text-xs font-light" style={{ color: gold }}>{fmt(item.price, config.currency)}</p>}
              {item.stock === 0 && <p className="text-xs text-white/30 tracking-widest" style={{ fontSize: "8px" }}>AGOTADO</p>}
            </div>
            <button className="w-6 h-6 flex items-center justify-center shrink-0 rounded-full" style={{ border: `1px solid ${gold}44` }}>
              <span style={{ color: gold, fontSize: "10px" }}>+</span>
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 text-center" style={{ borderTop: `1px solid ${gold}11` }}>
        <p className="tracking-[.3em] text-xs uppercase" style={{ color: `${gold}60` }}>{config.name}</p>
        {config.footerText && <p className="mt-1 text-white/20" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── VINTAGE ─── Newspaper masthead, warm cream, ornamental
function VintageTemplate({ config }: { config: StoreConfig }) {
  const ink = config.primaryColor;
  return (
    <div className="min-h-full relative" style={{ fontFamily: "'Georgia',serif", backgroundColor: "#fdf8f0" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || ink} />

      {/* Newspaper masthead */}
      <div className="px-4 pt-3 pb-2 text-center" style={{ borderBottom: `3px double ${ink}` }}>
        <p className="text-xs tracking-widest uppercase" style={{ color: ink, fontFamily: "Georgia,serif" }}>✦ Colección especial ✦</p>
        <h1 className="text-2xl font-black text-gray-900 leading-none mt-1" style={{ fontFamily: "Georgia,serif" }}>{config.name || "La Boutique"}</h1>
        <p className="text-xs text-gray-500 mt-0.5 italic">{config.tagline || "Piezas únicas con alma"}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400" style={{ fontSize: "9px" }}>Est. 2025</span>
          <div className="flex items-center gap-2 text-gray-400">
            <Search className="h-3 w-3" /><ShoppingBag className="h-3 w-3" />
          </div>
          <span className="text-gray-400" style={{ fontSize: "9px" }}>Envíos gratis</span>
        </div>
      </div>

      {config.heroStyle !== "minimal" && (
        <section className={`${config.heroStyle==="full"?"py-6":"py-3"} px-4 border-b`} style={{ borderColor: `${ink}30` }}>
          {config.banner
            ? <img src={config.banner} className="w-full rounded-sm object-cover" style={{ height: config.heroStyle==="full"?"120px":"60px" }} alt="" />
            : <div className="flex items-center gap-4">
                <div className="text-4xl">🌸</div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{config.tagline || "Nueva temporada"}</h2>
                  {config.description && <p className="text-gray-500 text-xs mt-1 italic leading-relaxed">{config.description}</p>}
                  <button className="mt-2 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 border-2" style={{ borderColor: ink, color: ink }}>
                    Ver catálogo
                  </button>
                </div>
              </div>
          }
        </section>
      )}

      {/* 3-column newspaper style */}
      <div className="grid grid-cols-3 gap-0 px-2 py-3">
        {DEMO.slice(0,3).map((item,i) => (
          <div key={item.name} className="px-2" style={{ borderRight: i<2 ? `1px solid ${ink}20` : "none" }}>
            <div className="aspect-square bg-amber-50 flex items-center justify-center rounded-sm border" style={{ borderColor: `${ink}20` }}>
              <Package className="h-6 w-6 text-amber-200" />
            </div>
            <p className="text-xs italic text-gray-700 mt-1.5 leading-tight">{item.name}</p>
            {config.showRatings && <Stars rating={item.rating} />}
            {config.showPrices && <p className="font-bold text-sm mt-0.5" style={{ color: ink }}>{fmt(item.price, config.currency)}</p>}
            <button className="w-full mt-1.5 text-xs py-1 font-semibold tracking-wider border" style={{ borderColor: ink, color: ink, fontSize: "9px" }}>
              Agregar
            </button>
          </div>
        ))}
      </div>

      {/* Divider ornamental */}
      <div className="flex items-center gap-2 px-4 py-1" style={{ borderTop: `1px solid ${ink}20`, borderBottom: `1px solid ${ink}20` }}>
        <div className="flex-1 h-px" style={{ backgroundColor: `${ink}20` }} />
        <span style={{ color: ink, fontSize: "10px" }}>✦ Más productos ✦</span>
        <div className="flex-1 h-px" style={{ backgroundColor: `${ink}20` }} />
      </div>

      <div className="grid grid-cols-3 gap-0 px-2 py-3">
        {DEMO.slice(3).map((item,i) => (
          <div key={item.name} className="px-2" style={{ borderRight: i<2 ? `1px solid ${ink}20` : "none" }}>
            <div className="aspect-square bg-amber-50 flex items-center justify-center rounded-sm border" style={{ borderColor: `${ink}20` }}>
              <Package className="h-6 w-6 text-amber-200" />
            </div>
            <p className="text-xs italic text-gray-700 mt-1.5 leading-tight">{item.name}</p>
            {config.showPrices && <p className="font-bold text-sm mt-0.5" style={{ color: ink }}>{fmt(item.price, config.currency)}</p>}
          </div>
        ))}
      </div>

      <div className="border-t-2 border-double px-4 py-3 text-center" style={{ borderColor: `${ink}40` }}>
        <SocialBar config={config} />
        {config.footerText && <p className="text-gray-400 mt-1 italic" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── SPORT ─── Dark diagonal cuts, energetic, landscape cards
function SportTemplate({ config }: { config: StoreConfig }) {
  const neon = config.primaryColor;
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, backgroundColor: "#080808", color: "white" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || neon} />
      <nav className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${neon}` }}>
        <span className="font-black text-base tracking-tight uppercase">{config.name || "SPORT"}</span>
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4" style={{ color: neon }} />
        </div>
        <div className="flex gap-2">
          <Search className="h-4 w-4 text-white/40" /><ShoppingBag className="h-4 w-4 text-white/40" />
        </div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="relative overflow-hidden" style={{ minHeight: config.heroStyle==="full"?"180px":"100px" }}>
          {/* Diagonal background */}
          <div className="absolute inset-0"
            style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)) url(${config.banner}) center/cover` : `linear-gradient(135deg,#111,${neon}44)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right,#000,transparent 60%)` }} />
          {/* Diagonal accent stripe */}
          <div className="absolute top-0 right-0 w-32 h-full" style={{ background: neon, clipPath: "polygon(40% 0,100% 0,100% 100%,0% 100%)", opacity: 0.15 }} />
          <div className="relative px-5 py-6 flex flex-col justify-center" style={{ minHeight: "inherit" }}>
            <p className="text-xs tracking-widest font-black uppercase" style={{ color: neon }}>⚡ NEW SEASON</p>
            <h1 className="font-black text-3xl uppercase leading-none mt-1">{config.tagline || "JUGÁ EN GRANDE"}</h1>
            {config.description && config.heroStyle==="full" && <p className="text-white/50 text-xs mt-2 max-w-xs">{config.description}</p>}
            <button className="mt-3 self-start text-black text-xs font-black px-5 py-2 uppercase tracking-widest"
              style={{ backgroundColor: neon, borderRadius: "4px" }}>
              SHOP NOW →
            </button>
          </div>
        </section>
      )}

      {/* Horizontal scrollable category chips */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ borderBottom: `1px solid rgba(255,255,255,.08)` }}>
        {["TODO","RUNNING","TRAINING","OUTDOOR","ACC"].map((c,i) => (
          <span key={c} className="text-xs font-black px-3 py-1.5 shrink-0 rounded-sm"
            style={i===0 ? { backgroundColor: neon, color: "#000" } : { backgroundColor: "#1a1a1a", color: "#666" }}>
            {c}
          </span>
        ))}
      </div>

      {/* Landscape cards with number badges */}
      <div className="p-3 space-y-2">
        {DEMO.map((item, i) => (
          <div key={item.name} className="flex gap-3 overflow-hidden" style={{ backgroundColor: "#111", borderRadius: "8px", border: `1px solid ${neon}22` }}>
            <div className="relative w-16 shrink-0 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
              <Package className="h-6 w-6 text-white/10" />
              <span className="absolute top-1 left-1 text-xs font-black" style={{ color: neon, fontSize: "9px" }}>#{String(i+1).padStart(2,"0")}</span>
              {item.stock === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white/60 font-black" style={{ fontSize: "8px" }}>OUT</span></div>}
            </div>
            <div className="flex-1 py-2.5 pr-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">{item.name}</p>
                {item.tag && <span className="font-black text-black px-1.5 py-0.5 inline-block" style={{ fontSize: "8px", backgroundColor: item.tag==="OFERTA"?"#ef4444":neon, borderRadius: "3px" }}>{item.tag}</span>}
              </div>
              <div className="text-right">
                {config.showPrices && <p className="font-black text-sm" style={{ color: neon }}>{fmt(item.price, config.currency)}</p>}
                {item.old && <p className="text-white/30 line-through" style={{ fontSize: "9px" }}>{fmt(item.old, config.currency)}</p>}
                <button className="text-black text-xs font-black mt-1 px-2 py-0.5" style={{ backgroundColor: neon, borderRadius: "3px", fontSize: "8px" }}>ADD</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: `1px solid rgba(255,255,255,.06)` }}>
        <span className="font-black text-xs uppercase tracking-widest text-white/30">{config.name}</span>
        <SocialBar config={config} dark />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── TECH ─── Terminal/data-table aesthetic, dark matrix
function TechTemplate({ config }: { config: StoreConfig }) {
  const neon = config.primaryColor;
  return (
    <div className="min-h-full relative" style={{ fontFamily: "'Courier New',monospace", backgroundColor: "#030712", color: "#e0e0ff" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || neon} />
      <nav className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${neon}33` }}>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs" style={{ color: neon, textShadow: `0 0 8px ${neon}` }}>{config.name || "TECH_STORE"}</span>
          <span className="text-white/20 text-xs">v2.0</span>
        </div>
        <div className="flex-1 mx-3 border px-2 py-0.5 flex items-center gap-1" style={{ borderColor: `${neon}33` }}>
          <span style={{ color: neon, fontSize: "9px" }}>$&gt;</span>
          <span className="text-white/30 text-xs">buscar productos...</span>
        </div>
        <ShoppingBag className="h-3.5 w-3.5" style={{ color: neon }} />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className={`${config.heroStyle==="full"?"py-8":"py-4"} px-4 text-center`}
          style={{ background: `radial-gradient(ellipse at center, ${neon}18 0%, transparent 65%)` }}>
          <p className="text-xs font-mono mb-1" style={{ color: neon }}>{"// "}{config.tagline || "NEXT GEN STORE"}</p>
          <h1 className="font-bold text-2xl" style={{ color: "#fff", textShadow: `0 0 30px ${neon}66` }}>{config.name || "TECH"}</h1>
          {config.description && config.heroStyle==="full" && <p className="text-white/30 text-xs mt-2 font-mono">{config.description}</p>}
          <button className="mt-4 text-xs font-bold px-6 py-2 font-mono" style={{ backgroundColor: "transparent", border: `1px solid ${neon}`, color: neon, boxShadow: `0 0 12px ${neon}33` }}>
            INIT_CATALOG.EXE →
          </button>
        </section>
      )}

      {/* Data table layout */}
      <div className="px-3 pb-3">
        <div className="text-xs mb-2 flex gap-4" style={{ borderBottom: `1px solid ${neon}22`, paddingBottom: "6px" }}>
          <span style={{ color: neon }}>ID</span>
          <span className="flex-1" style={{ color: neon }}>PRODUCTO</span>
          <span style={{ color: neon }}>PRECIO</span>
          <span style={{ color: neon }}>ST</span>
        </div>
        {DEMO.map((item, i) => (
          <div key={item.name} className="flex items-center gap-4 py-2.5" style={{ borderBottom: `1px solid ${neon}11` }}>
            <span className="text-xs w-6 shrink-0 font-mono" style={{ color: `${neon}50` }}>#{String(i+1).padStart(2,"0")}</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center" style={{ border: `1px solid ${neon}33`, borderRadius: "4px" }}>
                <Package className="h-3.5 w-3.5" style={{ color: `${neon}60` }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/80 font-mono truncate">{item.name}</p>
                {item.tag && <span className="font-bold text-black" style={{ fontSize: "8px", backgroundColor: neon, padding: "1px 4px", borderRadius: "2px" }}>{item.tag}</span>}
              </div>
            </div>
            {config.showPrices && <span className="text-xs font-bold shrink-0" style={{ color: neon }}>{fmt(item.price, config.currency)}</span>}
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: item.stock===0?"#ef444440":item.stock<4?"#f59e0b40":"#22c55e40", border: `1px solid ${item.stock===0?"#ef4444":item.stock<4?"#f59e0b":"#22c55e"}` }} />
          </div>
        ))}
      </div>

      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${neon}11` }}>
        <span className="text-xs font-mono" style={{ color: `${neon}50` }}>© {config.name || "TECH"}</span>
        <SocialBar config={config} dark />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── KIDS ─── Bubble layout, bright emoji badges, super playful
function KidsTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const EMOJIS = ["🦄","⭐","🎀","🌈","🎉","🍭"];
  const CARD_BG = [`${p}20`,`${accent}20`,"#fce7f320","#ede9fe20","#dcfce720","#fff7ed20"];
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, background: `linear-gradient(160deg,${p}15,${accent}15,white)` }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="flex items-center justify-between px-4 py-3 bg-white rounded-b-3xl shadow-sm">
        <span className="text-lg">🌟</span>
        <div className="flex items-center gap-1.5">
          {config.logo && <img src={config.logo} className="h-7 w-7 rounded-full object-cover" alt="" />}
          <span className="font-black text-sm" style={{ color: p }}>{config.name || "KidsStore"}</span>
        </div>
        <ShoppingBag className="h-4 w-4" style={{ color: p }} />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="mx-3 mt-3 rounded-3xl overflow-hidden relative flex flex-col items-center justify-center text-center text-white"
          style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})`, minHeight: config.heroStyle==="full"?"140px":"80px" }}>
          <span className="text-4xl mb-1 drop-shadow-lg">🎀</span>
          <h1 className="font-black text-xl drop-shadow">{config.tagline || "¡Para los más peques!"}</h1>
          {config.description && config.heroStyle==="full" && <p className="text-white/80 text-xs mt-1">{config.description}</p>}
          <button className="mt-2 bg-white font-black text-xs px-5 py-1.5 rounded-full shadow-lg" style={{ color: p }}>
            ¡Ver todo! 🛍️
          </button>
          {/* Floating bubbles */}
          <div className="absolute top-2 left-3 text-xl opacity-60">✨</div>
          <div className="absolute top-3 right-4 text-lg opacity-50">🌈</div>
        </section>
      )}

      {/* Category bubbles */}
      <div className="flex gap-2 px-3 mt-3 overflow-x-auto pb-1">
        {["Todo 🎁","Ropa 👗","Juguetes 🧸","Accesorios 💍"].map((c,i) => (
          <span key={c} className="text-xs font-black px-3 py-1.5 rounded-full shrink-0"
            style={i===0 ? { backgroundColor: p, color: "#fff" } : { backgroundColor: "white", color: "#9ca3af", border: "2px solid #f3f4f6" }}>
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {DEMO.map((item, i) => (
          <div key={item.name} className="rounded-3xl overflow-hidden relative" style={{ backgroundColor: CARD_BG[i % CARD_BG.length] }}>
            <div className="aspect-square flex items-center justify-center relative">
              <span className="text-4xl opacity-30">{EMOJIS[i % EMOJIS.length]}</span>
              <Package className="absolute h-8 w-8 text-gray-300" />
              {item.tag && <span className="absolute top-2 left-2 text-white font-black px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: item.tag==="OFERTA"?"#ef4444":accent, fontSize: "9px" }}>
                {item.tag} ✨
              </span>}
            </div>
            <div className="p-2.5 text-center">
              <p className="font-bold text-xs text-gray-900 leading-tight">{item.name}</p>
              {config.showRatings && <div className="flex justify-center mt-0.5"><Stars rating={item.rating} /></div>}
              {config.showPrices && <p className="font-black text-sm mt-0.5" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              <button className="w-full mt-1.5 text-white text-xs py-1.5 rounded-full font-black" style={{ backgroundColor: p }}>
                ¡Lo quiero! 💖
              </button>
            </div>
            {item.stock === 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-3xl"><span className="text-gray-500 font-black text-xs">😢 Sin stock</span></div>}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 text-center border-t-2 border-dashed" style={{ borderColor: `${p}30` }}>
        <SocialBar config={config} />
        {config.footerText && <p className="text-gray-400 text-xs mt-1">{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── MARKET ─── Dense marketplace, sidebar, Amazon vibe
function MarketSidebarTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  return (
    <div className="min-h-full bg-gray-100 relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      {/* Top bar: brand + search */}
      <nav className="sticky top-0 z-10 px-3 py-2" style={{ backgroundColor: p }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm shrink-0">{config.name || "Market"}</span>
          <div className="flex-1 bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5">
            <Search className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">Buscar en {config.name || "Market"}...</span>
          </div>
          <ShoppingBag className="h-4 w-4 text-white shrink-0" />
        </div>
      </nav>

      {/* Sub-nav categories */}
      <div className="bg-white border-b border-gray-200 px-2 py-1.5 flex gap-1 overflow-x-auto">
        {["Todo","Ofertas 🔥","Nuevo","Ropa","Joyas","Acces"].map((c,i) => (
          <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded shrink-0 whitespace-nowrap"
            style={i===0 ? { backgroundColor: p+"15", color: p } : { color: "#6b7280" }}>
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-[72px_1fr] gap-0 min-h-full">
        {/* Sidebar */}
        <aside className="bg-white border-r border-gray-200 p-2 space-y-0.5">
          <p className="text-xs font-bold text-gray-500 px-1 mb-1">Filtrar</p>
          {["Todo","Ropa","Joyas","Acces","Ofertas","Top ⭐"].map((c,idx) => (
            <div key={c} className="rounded-lg px-2 py-1.5 text-xs font-semibold cursor-pointer"
              style={idx===0 ? { backgroundColor: p, color: "white" } : { color: "#6b7280" }}>
              {c}
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <p className="text-xs font-bold text-gray-500 px-1 mb-1">Precio</p>
            <div className="text-xs text-gray-400 px-1 space-y-0.5">
              <div>$0 - $5k</div><div>$5k - $15k</div><div>$15k+</div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <main className="p-1.5">
          {/* Flash sale banner */}
          {config.tagline && (
            <div className="mb-1.5 rounded-xl p-2 flex items-center gap-2" style={{ backgroundColor: p+"15" }}>
              <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: p }} />
              <span className="text-xs font-bold" style={{ color: p }}>{config.tagline}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO.map((item) => (
              <div key={item.name} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  <Package className="h-5 w-5 text-gray-200" />
                  {item.tag && <span className="absolute top-1 left-1 text-white font-bold px-1.5 py-0.5 rounded-md"
                    style={{ fontSize: "8px", backgroundColor: item.tag==="OFERTA"?"#ef4444":config.accentColor }}>
                    {item.tag}
                  </span>}
                  {item.stock === 0 && <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded"><span className="text-white font-bold bg-black/50 px-1 rounded" style={{ fontSize: "8px" }}>SIN STOCK</span></div>}
                </div>
                <div className="p-1.5">
                  <p className="text-gray-800 line-clamp-2 leading-tight" style={{ fontSize: "10px" }}>{item.name}</p>
                  {config.showRatings && <div className="flex items-center gap-0.5 mt-0.5"><Stars rating={item.rating} /><span className="text-gray-400" style={{ fontSize: "8px" }}>({item.rating})</span></div>}
                  {config.showPrices && (
                    <div className="mt-0.5">
                      <span className="font-black" style={{ color: p, fontSize: "12px" }}>{fmt(item.price, config.currency)}</span>
                      {item.old && <span className="text-gray-400 line-through ml-1" style={{ fontSize: "9px" }}>{fmt(item.old, config.currency)}</span>}
                    </div>
                  )}
                  <button className="w-full mt-1 text-white font-bold rounded-lg py-1" style={{ backgroundColor: p, fontSize: "9px" }}>
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-3 text-gray-400 text-xs">
          <div className="flex items-center gap-1"><Truck className="h-3 w-3" /><span>Envíos</span></div>
          <div className="flex items-center gap-1"><Shield className="h-3 w-3" /><span>Seguro</span></div>
        </div>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

const TEMPLATES: Record<string, (c: StoreConfig) => ReactElement> = {
  default:  (c) => <MinimalTemplate config={c} />,
  fashion:  (c) => <EditorialTemplate config={c} />,
  boutique: (c) => <BoutiqueTemplate config={c} />,
  colorful: (c) => <ColorBlocksTemplate config={c} />,
  luxury:   (c) => <LuxurySplitTemplate config={c} />,
  vintage:  (c) => <VintageTemplate config={c} />,
  sport:    (c) => <SportTemplate config={c} />,
  tech:     (c) => <TechTemplate config={c} />,
  kids:     (c) => <KidsTemplate config={c} />,
  market:   (c) => <MarketSidebarTemplate config={c} />,
};

export default function StorePreview({ config }: { config: StoreConfig }) {
  const render = TEMPLATES[config.templateId] ?? TEMPLATES["default"];
  return render(config);
}
