"use client";

import type { ReactElement } from "react";
import { Package, ShoppingBag, Search, Star, Heart, Truck, Shield, RotateCcw, ChevronRight, Menu } from "lucide-react";

const IgIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const TkIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/></svg>;
const WaIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

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
  productModalSizeChart?: boolean;
  productModalSizeChartTitle?: string;
  productModalSizeChartData?: string;
  productModalShowReels?: boolean;
  productModalReelUrls?: string;
  productModalButtonText?: string;
  productModalAccentColor?: string;
  productModalShowDescription?: boolean;
  tipoTienda?: string;
  tieneVentaMayorista?: boolean;
}

const DEMO = [
  { name: "Remera oversize", price: 8500, old: 12000, tag: "OFERTA", stock: 5, rating: 4.5, cat: "Ropa", img: "https://picsum.photos/seed/moda11/400/400" },
  { name: "Jeans wide leg", price: 15900, old: null, tag: null, stock: 3, rating: 4.2, cat: "Ropa", img: "https://picsum.photos/seed/moda22/400/400" },
  { name: "Collar dorado", price: 4200, old: null, tag: "NUEVO", stock: 10, rating: 5, cat: "Joyas", img: "https://picsum.photos/seed/moda33/400/400" },
  { name: "Vestido floral", price: 22000, old: 28000, tag: "OFERTA", stock: 0, rating: 4.8, cat: "Ropa", img: "https://picsum.photos/seed/moda44/400/400" },
  { name: "Pulsera plata", price: 3800, old: null, tag: null, stock: 7, rating: 4.3, cat: "Joyas", img: "https://picsum.photos/seed/moda55/400/400" },
  { name: "Bolso bucket", price: 18500, old: null, tag: "NUEVO", stock: 2, rating: 4.7, cat: "Accesorios", img: "https://picsum.photos/seed/moda66/400/400" },
];

const RADIUS: Record<string, string> = { none: "0px", sm: "6px", md: "12px", lg: "16px", xl: "24px" };
const SHADOW: Record<string, string> = { none: "none", sm: "0 1px 4px rgba(0,0,0,.08)", md: "0 4px 12px rgba(0,0,0,.12)", lg: "0 8px 24px rgba(0,0,0,.18)" };

function fmt(n: number, cur: string) {
  return cur === "USD" ? `U$D ${(n / 1000).toFixed(0)}` : `$${n.toLocaleString("es-AR")}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function AnnouncementBar({ text, color }: { text: string; color: string }) {
  if (!text) return null;
  return <div className="text-white text-center py-1.5 text-xs font-medium tracking-wide" style={{ backgroundColor: color }}>{text}</div>;
}

function SocialBar({ config, light }: { config: StoreConfig; light?: boolean }) {
  const hasAny = config.instagramUrl || config.facebookUrl || config.tiktokUrl;
  if (!hasAny) return null;
  return (
    <div className={`flex items-center gap-2 ${light ? "text-white/50" : "text-gray-400"}`}>
      {config.instagramUrl && <IgIcon />}
      {config.facebookUrl && <FbIcon />}
      {config.tiktokUrl && <TkIcon />}
    </div>
  );
}

function WhatsappButton({ number }: { number: string }) {
  if (!number) return null;
  return (
    <div className="sticky bottom-3 ml-auto mr-3 w-fit bg-green-500 text-white rounded-full p-2 shadow-lg cursor-pointer z-20">
      <WaIcon />
    </div>
  );
}

// ─── 1. CLEAN (default) ─── Zara/H&M style: white, airy, photo-first
function CleanTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const r = RADIUS[config.cardRadius] ?? RADIUS.md;
  const sh = SHADOW[config.cardShadow] ?? SHADOW.sm;
  const heroH = config.heroStyle === "full" ? "220px" : config.heroStyle === "compact" ? "130px" : "0px";
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <Search className="h-3.5 w-3.5 text-gray-400" />
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <span className="text-sm font-light tracking-[.15em] text-gray-900 uppercase">{config.name || "Mi Tienda"}</span>
        </div>
        <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="relative overflow-hidden" style={{ height: heroH }}>
          <div className="absolute inset-0"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(160deg,${p}18 0%,${config.accentColor}22 100%)` }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <p className="text-xs tracking-[.25em] uppercase text-gray-500 mb-2">{config.tagline || "Nueva temporada"}</p>
            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{config.name || "Mi Tienda"}</h1>
            <button className="px-7 py-2 text-xs font-semibold text-white tracking-widest uppercase" style={{ backgroundColor: p, borderRadius: r }}>
              Ver colección
            </button>
          </div>
        </section>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Productos</h2>
          <span className="text-xs text-gray-400 flex items-center gap-1">Ver todos <ChevronRight className="h-3 w-3" /></span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="col-span-2 relative overflow-hidden bg-gray-50 flex items-center justify-center" style={{ height: "140px", borderRadius: r, boxShadow: sh }}>
            <img src={DEMO[0].img} className="absolute inset-0 w-full h-full object-cover" alt={DEMO[0].name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-3">
              <p className="text-white text-xs font-bold">{DEMO[0].name}</p>
              {config.showPrices && <p className="text-white/80 text-xs mt-0.5">{fmt(DEMO[0].price, config.currency)}</p>}
            </div>
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontSize: "9px" }}>OFERTA</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.slice(1, 4).map(item => (
            <div key={item.name} className="bg-white border border-gray-100 overflow-hidden" style={{ borderRadius: r, boxShadow: sh }}>
              <div className="aspect-square bg-gray-50 overflow-hidden relative">
                <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                {item.tag && <span className="absolute top-1 left-1 text-white font-bold px-1.5 py-0.5 rounded-full" style={{ fontSize: "8px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : config.accentColor }}>{item.tag}</span>}
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-800 font-medium leading-tight truncate">{item.name}</p>
                {config.showRatings && <div className="mt-0.5"><Stars rating={item.rating} /></div>}
                {config.showPrices && <p className="text-xs font-bold mt-1" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400 tracking-wider">{config.name || "Mi Tienda"}</span>
        <SocialBar config={config} />
        <div className="flex gap-2.5 text-gray-300"><Truck className="h-3 w-3" /><Shield className="h-3 w-3" /><RotateCcw className="h-3 w-3" /></div>
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 2. EDITORIAL (fashion) ─── High-fashion magazine: bold type, portrait grid, dark accents
function EditorialTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const r = RADIUS[config.cardRadius] ?? RADIUS.md;
  const heroH = config.heroStyle === "full" ? "200px" : config.heroStyle === "compact" ? "120px" : "0px";
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || "#111"} />
      <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex gap-4 text-xs font-semibold text-gray-400 tracking-widest uppercase">
          <span>Nueva</span><span>Edit.</span>
        </div>
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <span className="text-sm font-black tracking-[.2em] uppercase text-gray-900">{config.name || "FASHION"}</span>
        </div>
        <div className="flex gap-2.5 text-gray-400"><Heart className="h-3.5 w-3.5" /><ShoppingBag className="h-3.5 w-3.5" /></div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-5" style={{ height: heroH }}>
          <div className="col-span-3 relative overflow-hidden"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(145deg,#1a1a1a,${p})` }}>
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute bottom-4 left-4">
              <p className="text-white/60 text-xs tracking-widest uppercase mb-1">SS 2025</p>
              <h1 className="text-white font-black text-2xl leading-none italic">{config.tagline || "Drop Exclusivo"}</h1>
            </div>
          </div>
          <div className="col-span-2 flex flex-col justify-center px-5 py-5 bg-gray-950">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-2">Temporada</p>
            <p className="text-white font-light text-sm leading-relaxed">{config.description || "Piezas seleccionadas"}</p>
            <button className="mt-4 self-start text-xs font-bold uppercase tracking-wider px-4 py-2 text-white" style={{ backgroundColor: p, borderRadius: r }}>
              Ver todo
            </button>
          </div>
        </section>
      )}

      <div className="flex border-b border-gray-100">
        {["Todas", "Ropa", "Joyas", "Accesorios"].map((c, i) => (
          <span key={c} className="text-xs font-bold px-4 py-2.5 tracking-widest uppercase"
            style={i === 0 ? { borderBottom: `2px solid ${p}`, color: p } : { color: "#ccc" }}>
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-0.5 bg-gray-100 m-0.5" style={{ borderRadius: r }}>
        {DEMO.slice(0, 4).map((item, i) => (
          <div key={item.name} className={`relative overflow-hidden bg-white ${i === 0 ? "row-span-2" : ""}`}
            style={{ height: i === 0 ? "200px" : "98px" }}>
            <img src={item.img} className="absolute inset-0 w-full h-full object-cover" alt={item.name} />
            {item.tag && <span className="absolute top-2 left-2 text-white font-black px-2 py-0.5"
              style={{ backgroundColor: item.tag === "OFERTA" ? "#ef4444" : config.accentColor, fontSize: "9px", borderRadius: r }}>
              {item.tag}
            </span>}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/65 via-black/20 to-transparent">
              <p className="text-white text-xs font-bold leading-tight">{item.name}</p>
              {config.showPrices && <p className="text-white/80 font-black mt-0.5" style={{ fontSize: "11px" }}>{fmt(item.price, config.currency)}</p>}
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

// ─── 3. BOUTIQUE ─── Warm elegant: serif-feel, premium cards, soft tones
function BoutiqueTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const bg = config.secondaryColor || "#faf9f7";
  const r = RADIUS[config.cardRadius] ?? RADIUS.md;
  const sh = SHADOW[config.cardShadow] ?? SHADOW.md;
  const heroH = config.heroStyle === "full" ? "180px" : config.heroStyle === "compact" ? "100px" : "0px";
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, backgroundColor: bg }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
        <Search className="h-3.5 w-3.5 text-gray-400" />
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-6 w-6 rounded-full object-cover" alt="" />}
          <span className="font-bold text-sm text-gray-900 tracking-wide">{config.name || "Boutique"}</span>
        </div>
        <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
      </nav>

      <div className="flex gap-1.5 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto">
        {["Novedades", "Ropa", "Joyas", "Accesorios", "Ofertas"].map((c, i) => (
          <span key={c} className="text-xs font-semibold px-3 py-1 shrink-0"
            style={i === 0
              ? { backgroundColor: p, color: "#fff", borderRadius: r }
              : { backgroundColor: "#f3f4f6", color: "#9ca3af", borderRadius: r }}>
            {c}
          </span>
        ))}
      </div>

      {config.heroStyle !== "minimal" && (
        <section className="mx-4 mt-4 overflow-hidden relative flex items-end p-5" style={{
          height: heroH, borderRadius: r,
          background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})`
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative">
            <p className="text-white/70 text-xs tracking-widest uppercase">{config.tagline || "Selección especial"}</p>
            <h1 className="text-white font-black text-xl leading-tight mt-0.5">{config.name}</h1>
            <button className="mt-2 text-white text-xs font-semibold flex items-center gap-1">
              Explorar <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </section>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800">Colección</h2>
          <span className="text-xs font-medium" style={{ color: p }}>Ver todo →</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DEMO.slice(0, 4).map(item => (
            <div key={item.name} className="bg-white overflow-hidden" style={{ borderRadius: r, boxShadow: sh }}>
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                {item.tag && <span className="absolute top-2 left-2 text-white font-bold px-2 py-0.5"
                  style={{ backgroundColor: item.tag === "OFERTA" ? "#ef4444" : accent, fontSize: "9px", borderRadius: "4px" }}>
                  {item.tag}
                </span>}
                {item.stock === 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="text-gray-500 text-xs font-bold">Sin stock</span></div>}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.cat}</p>
                {config.showRatings && <div className="mt-1"><Stars rating={item.rating} /></div>}
                <div className="flex items-center justify-between mt-1.5">
                  {config.showPrices && <p className="text-sm font-black" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
                  <button className="w-6 h-6 flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: p, borderRadius: "50%" }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-5 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{config.footerText || config.name}</span>
        <SocialBar config={config} />
        <div className="flex gap-2 text-gray-300"><Truck className="h-3 w-3" /><RotateCcw className="h-3 w-3" /></div>
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 4. VIVIDO (colorful) ─── Bold, vibrant, modern brand
function VividoTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const r = RADIUS[config.cardRadius] ?? RADIUS.lg;
  const sh = SHADOW[config.cardShadow] ?? SHADOW.md;
  const heroH = config.heroStyle === "full" ? "180px" : config.heroStyle === "compact" ? "110px" : "0px";
  const CARD_COLORS = [p, accent, "#111827", p + "dd", accent + "dd", "#374151"];
  return (
    <div className="min-h-full bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: p }}>
        <Menu className="h-4 w-4 text-white/70" />
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <span className="text-sm font-black text-white tracking-wide">{config.name || "Mi Tienda"}</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-white" />
      </nav>

      <div className="flex gap-2 px-4 py-2.5 border-b border-gray-100 overflow-x-auto">
        {["Todo", "Ropa", "Joyas", "Ofertas"].map((c, i) => (
          <span key={c} className="text-xs font-bold px-3.5 py-1.5 shrink-0"
            style={i === 0
              ? { backgroundColor: p, color: "#fff", borderRadius: r }
              : { border: `1.5px solid ${p}33`, color: p, borderRadius: r }}>
            {c}
          </span>
        ))}
      </div>

      {config.heroStyle !== "minimal" && (
        <section className="mx-4 mt-4 overflow-hidden relative flex flex-col justify-center px-5" style={{
          height: heroH, borderRadius: r,
          background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})`
        }}>
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{config.tagline || "Nuevos ingresos"}</p>
            <h1 className="text-white font-black text-2xl leading-tight mt-1">{config.name || "Mi Tienda"}</h1>
            <button className="mt-3 bg-white font-black text-xs px-5 py-2" style={{ color: p, borderRadius: r }}>
              Ver todo →
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 p-4">
        {DEMO.map((item, i) => {
          const cardColor = CARD_COLORS[i % CARD_COLORS.length];
          const isLight = i === 2 || i === 5;
          const textColor = isLight ? "#1f2937" : "#ffffff";
          return (
            <div key={item.name} className="overflow-hidden relative" style={{ backgroundColor: cardColor, minHeight: "140px", borderRadius: r, boxShadow: sh }}>
              <div className="p-3 h-full flex flex-col justify-between" style={{ minHeight: "140px" }}>
                <div>
                  {item.tag && <span className="text-xs font-black px-2 py-0.5 rounded-full inline-block mb-1"
                    style={{ backgroundColor: isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.2)", color: isLight ? "#374151" : "#fff", fontSize: "9px" }}>
                    {item.tag}
                  </span>}
                  <p className="font-bold leading-tight" style={{ color: textColor, fontSize: "12px" }}>{item.name}</p>
                </div>
                <div className="flex items-end justify-between mt-2">
                  {config.showPrices && <p className="font-black text-sm" style={{ color: textColor }}>{fmt(item.price, config.currency)}</p>}
                  <div className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: isLight ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.25)" }}>
                    <span style={{ color: textColor, fontSize: "14px", lineHeight: 1 }}>+</span>
                  </div>
                </div>
              </div>
              {item.stock === 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center" style={{ borderRadius: r }}><span className="text-white font-black text-xs">AGOTADO</span></div>}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="font-bold text-sm text-gray-800">{config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 5. LUXURY ─── Dark premium: gold accents, numbered catalog
function LuxuryTemplate({ config }: { config: StoreConfig }) {
  const gold = config.accentColor || "#c9a84c";
  const r = RADIUS[config.cardRadius] ?? "0px";
  const heroH = config.heroStyle === "full" ? "190px" : config.heroStyle === "compact" ? "110px" : "0px";
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily || "'Georgia',serif", backgroundColor: "#080808", color: "#e8e0d0" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || gold} />
      <nav className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${gold}20` }}>
        <div className="h-px w-10" style={{ backgroundColor: gold }} />
        <div className="text-center">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover mx-auto mb-1" alt="" />}
          <p className="text-white text-xs font-light tracking-[.4em] uppercase">{config.name || "LUXE"}</p>
          {config.tagline && <p className="tracking-widest mt-0.5" style={{ color: gold, fontSize: "8px" }}>{config.tagline}</p>}
        </div>
        <ShoppingBag className="h-4 w-4" style={{ color: gold }} />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-2" style={{ height: heroH }}>
          <div className="relative overflow-hidden"
            style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)) url(${config.banner}) center/cover` : "linear-gradient(145deg,#141414,#1e1a14)" }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <Package className="h-20 w-20 text-white" />
            </div>
          </div>
          <div className="flex flex-col justify-center px-5 py-6 bg-black">
            <div className="w-8 h-px mb-4" style={{ backgroundColor: gold }} />
            <p className="text-xs tracking-[.3em] uppercase mb-1.5" style={{ color: gold }}>Exclusivo</p>
            <h1 className="text-white font-light text-xl leading-tight">{config.tagline || config.name}</h1>
            {config.description && config.heroStyle === "full" && <p className="text-white/35 text-xs mt-2 leading-relaxed">{config.description}</p>}
            <button className="mt-5 self-start text-xs tracking-widest uppercase px-5 py-2" style={{ border: `1px solid ${gold}`, color: gold, borderRadius: r }}>
              Descubrir
            </button>
          </div>
        </section>
      )}

      <div className="px-5 py-4">
        <p className="text-xs tracking-[.25em] uppercase mb-4" style={{ color: gold }}>Colección</p>
        {DEMO.map((item, i) => (
          <div key={item.name} className="flex items-center gap-4 py-3.5" style={{ borderBottom: `1px solid ${gold}10` }}>
            <span className="text-xs font-light w-5 shrink-0 tabular-nums" style={{ color: gold + "50" }}>0{i + 1}</span>
            <div className="w-10 h-10 shrink-0 overflow-hidden" style={{ backgroundColor: "#141414", borderRadius: r }}>
              <img src={item.img} className="w-full h-full object-cover opacity-70" alt={item.name} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-light text-white/80 tracking-wider uppercase truncate">{item.name}</p>
              <p className="mt-0.5" style={{ color: `${gold}55`, fontSize: "9px" }}>{item.cat}</p>
            </div>
            <div className="text-right shrink-0">
              {config.showPrices && <p className="text-xs font-light" style={{ color: gold }}>{fmt(item.price, config.currency)}</p>}
              {item.stock === 0 && <p className="text-white/25 tracking-widest" style={{ fontSize: "8px" }}>AGOTADO</p>}
            </div>
            <button className="w-6 h-6 flex items-center justify-center shrink-0" style={{ border: `1px solid ${gold}30`, borderRadius: "50%" }}>
              <span style={{ color: gold, fontSize: "11px" }}>+</span>
            </button>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 text-center" style={{ borderTop: `1px solid ${gold}10` }}>
        <p className="tracking-[.35em] text-xs uppercase" style={{ color: `${gold}50` }}>{config.name}</p>
        <SocialBar config={config} light />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 6. CLASICO (vintage) ─── Clean heritage: serif, cream, no kitsch
function ClasicoTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const r = RADIUS[config.cardRadius] ?? "4px";
  const sh = SHADOW[config.cardShadow] ?? SHADOW.sm;
  const heroH = config.heroStyle === "full" ? "160px" : config.heroStyle === "compact" ? "90px" : "0px";
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily || "'Georgia',serif", backgroundColor: "#faf7f2" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />

      <div className="px-5 pt-4 pb-3 text-center border-b-2 border-double border-gray-300">
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-1">{config.tagline || "Colección especial"}</p>
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <h1 className="flex-1 text-2xl font-bold text-gray-900 leading-none">{config.name || "La Boutique"}</h1>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex gap-3 text-xs text-gray-400">
            <span>Nueva temporada</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Search className="h-3 w-3" /><ShoppingBag className="h-3 w-3" />
          </div>
        </div>
      </div>

      {config.heroStyle !== "minimal" && (
        <section className="mx-4 mt-4 overflow-hidden" style={{ height: heroH, borderRadius: r, boxShadow: sh }}>
          {config.banner
            ? <img src={config.banner} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg,${p}18,${config.accentColor}25)` }}>
                <div className="text-center">
                  <p className="text-gray-700 font-bold text-lg">{config.tagline || "Nueva temporada"}</p>
                  {config.description && <p className="text-gray-500 text-xs mt-1 italic">{config.description}</p>}
                  <button className="mt-3 text-xs font-semibold tracking-widest uppercase px-5 py-2 border" style={{ borderColor: p, color: p, borderRadius: r }}>
                    Ver catálogo
                  </button>
                </div>
              </div>
          }
        </section>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs tracking-widest text-gray-400 uppercase">Productos</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DEMO.slice(0, 6).map(item => (
            <div key={item.name} className="bg-white overflow-hidden" style={{ borderRadius: r, boxShadow: sh }}>
              <div className="aspect-square bg-amber-50 overflow-hidden relative">
                <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                {item.tag && <span className="absolute top-1 left-1 font-bold text-white px-1.5 py-0.5"
                  style={{ fontSize: "8px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : config.accentColor, borderRadius: "3px" }}>
                  {item.tag}
                </span>}
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-800 font-medium leading-tight truncate italic">{item.name}</p>
                {config.showRatings && <div className="mt-0.5"><Stars rating={item.rating} /></div>}
                {config.showPrices && <p className="font-bold text-xs mt-1" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-double border-gray-300 px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 italic">{config.footerText || config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 7. SPORT ─── Dark energetic: diagonal hero, bold landscape cards
function SportTemplate({ config }: { config: StoreConfig }) {
  const neon = config.primaryColor;
  const r = RADIUS[config.cardRadius] ?? "6px";
  const heroH = config.heroStyle === "full" ? "190px" : config.heroStyle === "compact" ? "110px" : "0px";
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, backgroundColor: "#080808", color: "white" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || neon} />
      <nav className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `2px solid ${neon}` }}>
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover" alt="" />}
          <span className="font-black text-sm tracking-wider uppercase text-white">{config.name || "SPORT"}</span>
        </div>
        <div className="flex gap-2.5">
          <Search className="h-3.5 w-3.5 text-white/40" /><ShoppingBag className="h-3.5 w-3.5 text-white/40" />
        </div>
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="relative overflow-hidden" style={{ height: heroH }}>
          <div className="absolute inset-0"
            style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)) url(${config.banner}) center/cover` : `linear-gradient(135deg,#111 0%,${neon}33 100%)` }} />
          <div className="absolute top-0 right-0 w-28 h-full opacity-10" style={{ background: neon, clipPath: "polygon(50% 0,100% 0,100% 100%,0% 100%)" }} />
          <div className="relative h-full flex flex-col justify-center px-5">
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: neon }}>New Season</p>
            <h1 className="font-black text-3xl uppercase leading-none text-white">{config.tagline || "Jugá en grande"}</h1>
            {config.description && config.heroStyle === "full" && <p className="text-white/40 text-xs mt-2">{config.description}</p>}
            <button className="mt-4 self-start text-xs font-black px-5 py-2 uppercase tracking-wider"
              style={{ backgroundColor: neon, color: "#000", borderRadius: r }}>
              Shop now →
            </button>
          </div>
        </section>
      )}

      <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-white/8">
        {["Todo", "Training", "Running", "Outdoor"].map((c, i) => (
          <span key={c} className="text-xs font-black px-3 py-1.5 shrink-0"
            style={i === 0 ? { backgroundColor: neon, color: "#000", borderRadius: r } : { backgroundColor: "#1a1a1a", color: "#555", borderRadius: r }}>
            {c}
          </span>
        ))}
      </div>

      <div className="p-3 space-y-2">
        {DEMO.map((item, i) => (
          <div key={item.name} className="flex gap-3 overflow-hidden" style={{ backgroundColor: "#111", borderRadius: r, border: `1px solid ${neon}18` }}>
            <div className="w-16 h-16 shrink-0 relative overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
              <img src={item.img} className="w-full h-full object-cover opacity-60" alt={item.name} />
              <span className="absolute top-1 left-1 font-black tabular-nums" style={{ color: neon, fontSize: "8px" }}>#{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="flex-1 py-2.5 pr-3 flex items-center justify-between min-w-0">
              <div className="min-w-0 mr-2">
                <p className="text-xs font-bold text-white uppercase tracking-tight truncate">{item.name}</p>
                {item.tag && <span className="font-black text-black px-1.5 py-0.5 inline-block mt-0.5"
                  style={{ fontSize: "8px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : neon, borderRadius: "3px" }}>
                  {item.tag}
                </span>}
              </div>
              <div className="text-right shrink-0">
                {config.showPrices && <p className="font-black text-sm" style={{ color: neon }}>{fmt(item.price, config.currency)}</p>}
                {item.stock === 0 && <p className="text-white/30 text-xs">Sin stock</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-white/6 flex items-center justify-between">
        <span className="font-black text-xs uppercase tracking-widest text-white/25">{config.name}</span>
        <SocialBar config={config} light />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 8. MODERNO (tech) ─── Clean modern: light, bold grid, professional
function ModernoTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const r = RADIUS[config.cardRadius] ?? RADIUS.lg;
  const sh = SHADOW[config.cardShadow] ?? SHADOW.md;
  const heroH = config.heroStyle === "full" ? "180px" : config.heroStyle === "compact" ? "110px" : "0px";
  return (
    <div className="min-h-full bg-gray-50 relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="bg-white flex items-center justify-between px-5 py-3.5" style={{ boxShadow: "0 1px 8px rgba(0,0,0,.07)" }}>
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-6 w-6 rounded-lg object-cover" alt="" />}
          <span className="font-black text-sm text-gray-900">{config.name || "Mi Tienda"}</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5">
          <Search className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">Buscar...</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-gray-600" />
      </nav>

      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-5 mx-4 mt-4 overflow-hidden" style={{ height: heroH, borderRadius: r, boxShadow: sh }}>
          <div className="col-span-3 bg-white flex flex-col justify-center px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>{config.tagline || "Nueva temporada"}</p>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{config.name || "Mi Tienda"}</h1>
            {config.description && <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{config.description}</p>}
            <button className="mt-4 self-start text-xs font-bold px-5 py-2 text-white" style={{ backgroundColor: p, borderRadius: r }}>
              Explorar →
            </button>
          </div>
          <div className="col-span-2 relative overflow-hidden"
            style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})` }}>
            <img src={DEMO[0].img} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" alt="" />
          </div>
        </section>
      )}

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-gray-900">Destacados</h2>
          <span className="text-xs font-semibold" style={{ color: p }}>Ver todos →</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {DEMO.map(item => (
            <div key={item.name} className="bg-white overflow-hidden" style={{ borderRadius: r, boxShadow: sh }}>
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                {item.tag && <span className="absolute top-1.5 left-1.5 text-white font-bold px-1.5 py-0.5"
                  style={{ fontSize: "8px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : accent, borderRadius: "4px" }}>
                  {item.tag}
                </span>}
                {item.stock === 0 && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><span className="text-xs font-bold text-gray-500">Sin stock</span></div>}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
                {config.showRatings && <div className="mt-0.5"><Stars rating={item.rating} /></div>}
                {config.showPrices && <p className="text-xs font-black mt-1" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
                <button className="w-full mt-1.5 text-white text-xs font-bold py-1" style={{ backgroundColor: p, borderRadius: r }}>
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-5 py-4 flex items-center justify-between mt-2">
        <div className="flex gap-3 text-gray-300"><Truck className="h-3.5 w-3.5" /><Shield className="h-3.5 w-3.5" /></div>
        <span className="text-xs text-gray-400">{config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 9. COLORFUL (kids) ─── Vibrant & playful but professional
function ColorfulTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const accent = config.accentColor;
  const r = RADIUS[config.cardRadius] ?? "20px";
  const sh = SHADOW[config.cardShadow] ?? SHADOW.md;
  const heroH = config.heroStyle === "full" ? "160px" : config.heroStyle === "compact" ? "90px" : "0px";
const CARD_BORDER = [p, accent, "#ec4899", "#8b5cf6", "#22c55e", "#f97316"];
  return (
    <div className="min-h-full relative" style={{ fontFamily: config.fontFamily, background: `linear-gradient(160deg,${p}12,${accent}10,#fff)` }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="flex items-center justify-between px-4 py-3 bg-white" style={{ borderRadius: "0 0 20px 20px", boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-6 w-6 rounded-full object-cover" alt="" />}
          <span className="font-black text-sm" style={{ color: p }}>{config.name || "Mi Tienda"}</span>
        </div>
        <div className="flex gap-2">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <ShoppingBag className="h-3.5 w-3.5" style={{ color: p }} />
        </div>
      </nav>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {["Todo", "Ropa", "Accesorios", "Ofertas"].map((c, i) => (
          <span key={c} className="text-xs font-black px-3.5 py-1.5 shrink-0"
            style={i === 0
              ? { backgroundColor: p, color: "#fff", borderRadius: r }
              : { backgroundColor: "white", color: "#9ca3af", border: "2px solid #f3f4f6", borderRadius: r }}>
            {c}
          </span>
        ))}
      </div>

      {config.heroStyle !== "minimal" && (
        <section className="mx-4 mt-1 overflow-hidden relative flex flex-col items-center justify-center text-center" style={{
          height: heroH, borderRadius: r, boxShadow: sh,
          background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${p},${accent})`
        }}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <h1 className="font-black text-2xl text-white drop-shadow">{config.tagline || config.name}</h1>
            {config.description && config.heroStyle === "full" && <p className="text-white/80 text-xs mt-1">{config.description}</p>}
            <button className="mt-3 bg-white font-black text-xs px-5 py-2" style={{ color: p, borderRadius: r }}>
              Ver todo
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 p-4">
        {DEMO.map((item, i) => (
          <div key={item.name} className="bg-white overflow-hidden relative" style={{ borderRadius: r, boxShadow: sh, borderTop: `3px solid ${CARD_BORDER[i % CARD_BORDER.length]}` }}>
            <div className="aspect-square overflow-hidden relative">
              <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
              {item.tag && <span className="absolute top-2 left-2 text-white font-black px-2 py-0.5"
                style={{ fontSize: "9px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : accent, borderRadius: "8px" }}>
                {item.tag}
              </span>}
            </div>
            <div className="p-2.5 text-center">
              <p className="font-bold text-xs text-gray-900 leading-tight">{item.name}</p>
              {config.showRatings && <div className="flex justify-center mt-0.5"><Stars rating={item.rating} /></div>}
              {config.showPrices && <p className="font-black text-sm mt-0.5" style={{ color: p }}>{fmt(item.price, config.currency)}</p>}
              <button className="w-full mt-1.5 text-white text-xs font-black py-1.5" style={{ backgroundColor: p, borderRadius: r }}>
                Agregar
              </button>
            </div>
            {item.stock === 0 && <div className="absolute inset-0 bg-white/65 flex items-center justify-center" style={{ borderRadius: r }}><span className="text-gray-500 font-black text-xs">Sin stock</span></div>}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{config.footerText || config.name}</span>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

// ─── 10. MARKET ─── Clean marketplace: sidebar + dense product grid
function MarketTemplate({ config }: { config: StoreConfig }) {
  const p = config.primaryColor;
  const r = RADIUS[config.cardRadius] ?? RADIUS.md;
  const sh = SHADOW[config.cardShadow] ?? SHADOW.sm;
  return (
    <div className="min-h-full bg-gray-100 relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || p} />
      <nav className="px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: p }}>
        {config.logo && <img src={config.logo} className="h-5 w-5 rounded object-cover shrink-0" alt="" />}
        <span className="text-white font-black text-sm shrink-0">{config.name || "Market"}</span>
        <div className="flex-1 bg-white flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderRadius: r }}>
          <Search className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 truncate">Buscar productos...</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-white shrink-0" />
      </nav>

      <div className="bg-white border-b border-gray-200 px-3 py-2 flex gap-1.5 overflow-x-auto">
        {["Todo", "Ofertas", "Nuevo", "Ropa", "Joyas"].map((c, i) => (
          <span key={c} className="text-xs font-semibold px-2.5 py-1 shrink-0 whitespace-nowrap"
            style={i === 0 ? { backgroundColor: `${p}15`, color: p, borderRadius: r } : { color: "#6b7280" }}>
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-[68px_1fr]">
        <aside className="bg-white border-r border-gray-200 p-2.5">
          <p className="text-xs font-bold text-gray-500 mb-2">Filtrar</p>
          {["Todo", "Ropa", "Joyas", "Accesorios", "Ofertas"].map((c, idx) => (
            <div key={c} className="py-1.5 px-2 text-xs font-semibold mb-0.5"
              style={idx === 0 ? { backgroundColor: p, color: "white", borderRadius: r } : { color: "#9ca3af" }}>
              {c}
            </div>
          ))}
          <div className="mt-3 pt-2.5 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-1.5">Precio</p>
            {["$0 - $5k", "$5k - $15k", "$15k+"].map(r2 => (
              <div key={r2} className="text-xs text-gray-400 py-0.5">{r2}</div>
            ))}
          </div>
        </aside>

        <main className="p-2">
          {config.tagline && (
            <div className="mb-2 px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${p}12`, borderRadius: r }}>
              <span className="text-xs font-bold" style={{ color: p }}>{config.tagline}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO.map(item => (
              <div key={item.name} className="bg-white overflow-hidden border border-gray-100" style={{ borderRadius: r, boxShadow: sh }}>
                <div className="aspect-square overflow-hidden relative">
                  <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                  {item.tag && <span className="absolute top-1 left-1 text-white font-bold px-1.5 py-0.5"
                    style={{ fontSize: "8px", backgroundColor: item.tag === "OFERTA" ? "#ef4444" : config.accentColor, borderRadius: "4px" }}>
                    {item.tag}
                  </span>}
                  {item.stock === 0 && <div className="absolute inset-0 bg-black/15 flex items-center justify-center"><span className="bg-black/50 text-white font-bold px-1.5 py-0.5" style={{ fontSize: "8px", borderRadius: "3px" }}>Sin stock</span></div>}
                </div>
                <div className="p-1.5">
                  <p className="text-gray-800 leading-tight truncate" style={{ fontSize: "10px" }}>{item.name}</p>
                  {config.showRatings && <div className="flex items-center gap-0.5 mt-0.5"><Stars rating={item.rating} /><span className="text-gray-400" style={{ fontSize: "8px" }}>({item.rating})</span></div>}
                  {config.showPrices && (
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="font-black" style={{ color: p, fontSize: "12px" }}>{fmt(item.price, config.currency)}</span>
                      {item.old && <span className="text-gray-400 line-through" style={{ fontSize: "9px" }}>{fmt(item.old, config.currency)}</span>}
                    </div>
                  )}
                  <button className="w-full mt-1 text-white font-bold py-1" style={{ backgroundColor: p, fontSize: "9px", borderRadius: r }}>
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-3 text-gray-400">
          <div className="flex items-center gap-1 text-xs"><Truck className="h-3 w-3" /><span>Envíos</span></div>
          <div className="flex items-center gap-1 text-xs"><Shield className="h-3 w-3" /><span>Seguro</span></div>
        </div>
        <SocialBar config={config} />
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

const TEMPLATES: Record<string, (c: StoreConfig) => ReactElement> = {
  default:  (c) => <CleanTemplate config={c} />,
  fashion:  (c) => <EditorialTemplate config={c} />,
  boutique: (c) => <BoutiqueTemplate config={c} />,
  colorful: (c) => <VividoTemplate config={c} />,
  luxury:   (c) => <LuxuryTemplate config={c} />,
  vintage:  (c) => <ClasicoTemplate config={c} />,
  sport:    (c) => <SportTemplate config={c} />,
  tech:     (c) => <ModernoTemplate config={c} />,
  kids:     (c) => <ColorfulTemplate config={c} />,
  market:   (c) => <MarketTemplate config={c} />,
};

export default function StorePreview({ config }: { config: StoreConfig }) {
  const render = TEMPLATES[config.templateId] ?? TEMPLATES["default"];
  return render(config);
}
