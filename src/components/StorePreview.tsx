"use client";

import type { ReactElement } from "react";
import { Package, ShoppingBag, Search, Star, Heart, MessageCircle, Truck, Shield, RotateCcw } from "lucide-react";

const IgIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const TkIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/></svg>;

export interface StoreConfig {
  name: string; tagline: string; description: string;
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
  { name: "Remera oversize", price: 8500, old: 12000, tag: "OFERTA", stock: 5, rating: 4.5 },
  { name: "Jeans wide leg", price: 15900, old: null, tag: null, stock: 3, rating: 4.2 },
  { name: "Collar dorado", price: 4200, old: null, tag: "NUEVO", stock: 10, rating: 5 },
  { name: "Vestido floral", price: 22000, old: 28000, tag: "OFERTA", stock: 0, rating: 4.8 },
  { name: "Pulsera plata", price: 3800, old: null, tag: null, stock: 7, rating: 4.3 },
  { name: "Bolso bucket", price: 18500, old: null, tag: "NUEVO", stock: 2, rating: 4.7 },
];

const RADIUS: Record<string,string> = { none:"0px", sm:"6px", md:"12px", lg:"16px", xl:"24px" };
const SHADOW: Record<string,string> = { none:"none", sm:"0 1px 4px rgba(0,0,0,.08)", md:"0 4px 12px rgba(0,0,0,.12)", lg:"0 8px 24px rgba(0,0,0,.16)" };
const COLS: Record<string,string> = { grid2:"grid-cols-2", grid3:"grid-cols-3", grid4:"grid-cols-4", list:"grid-cols-1" };

function fmt(n: number, cur: string) {
  return cur === "USD" ? `U$D ${(n/1000).toFixed(0)}` : `$${n.toLocaleString("es-AR")}`;
}

function btnClass(style: string) {
  return style === "square" ? "rounded-none" : style === "pill" ? "rounded-full" : style === "outline" ? "rounded-lg border-2 bg-transparent" : "rounded-lg";
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function AnnouncementBar({ text, color }: { text: string; color: string }) {
  if (!text) return null;
  return (
    <div className="text-white text-center py-1.5 text-xs font-medium" style={{ backgroundColor: color }}>
      {text}
    </div>
  );
}

function SocialBar({ config }: { config: StoreConfig }) {
  const hasAny = config.instagramUrl || config.facebookUrl || config.tiktokUrl;
  if (!hasAny) return null;
  return (
    <div className="flex items-center gap-2 text-gray-400">
      {config.instagramUrl && <IgIcon />}
      {config.facebookUrl && <FbIcon />}
      {config.tiktokUrl && <TkIcon />}
    </div>
  );
}

function WhatsappButton({ number }: { number: string }) {
  if (!number) return null;
  return (
    <div className="absolute bottom-3 right-3 bg-green-500 text-white rounded-full p-2 shadow-lg cursor-pointer">
      <MessageCircle className="h-4 w-4" />
    </div>
  );
}

function ProductCard({ p, config, isList }: { p: typeof DEMO[0]; config: StoreConfig; isList: boolean }) {
  const r = RADIUS[config.cardRadius] ?? "12px";
  const s = SHADOW[config.cardShadow] ?? "none";
  const bc = btnClass(config.buttonStyle);
  const isOutline = config.buttonStyle === "outline";

  if (isList) return (
    <div className="bg-white flex gap-3 items-center p-2.5" style={{ borderRadius: r, boxShadow: s, border: "1px solid #f0f0f0" }}>
      <div className="w-14 h-14 bg-gray-50 flex items-center justify-center shrink-0 relative" style={{ borderRadius: `calc(${r} - 4px)` }}>
        <Package className="h-5 w-5 text-gray-200" />
        {p.stock === 0 && <div className="absolute inset-0 bg-black/20" style={{ borderRadius: `calc(${r} - 4px)` }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs text-gray-900 truncate">{p.name}</p>
        {config.showRatings && <Stars rating={p.rating} />}
        {config.showPrices && <p className="font-bold text-xs mt-0.5" style={{ color: config.primaryColor }}>{fmt(p.price, config.currency)}</p>}
      </div>
      <button
        className={`text-white text-xs px-2.5 py-1.5 font-semibold shrink-0 ${bc}`}
        style={isOutline ? { color: config.primaryColor, borderColor: config.primaryColor } : { backgroundColor: config.primaryColor }}
      >
        Comprar
      </button>
    </div>
  );

  return (
    <div className="bg-white overflow-hidden" style={{ borderRadius: r, boxShadow: s, border: "1px solid #f0f0f0" }}>
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
        <Package className="h-7 w-7 text-gray-200" />
        {p.tag && (
          <span className="absolute top-1.5 left-1.5 text-white font-bold px-1.5 py-0.5 rounded-md"
            style={{ fontSize: "9px", backgroundColor: p.tag === "OFERTA" ? "#ef4444" : config.accentColor }}>
            {p.tag}
          </span>
        )}
        <button className="absolute top-1.5 right-1.5 bg-white/80 p-1 rounded-full">
          <Heart className="h-3 w-3 text-gray-400" />
        </button>
        {p.stock === 0 && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 font-semibold px-2 py-0.5 rounded-full" style={{ fontSize: "9px" }}>Sin stock</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs text-gray-900 line-clamp-1">{p.name}</p>
        {config.showRatings && <div className="mt-0.5"><Stars rating={p.rating} /></div>}
        {config.showPrices && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-bold text-xs" style={{ color: config.primaryColor }}>{fmt(p.price, config.currency)}</span>
            {p.old && <span className="text-gray-300 line-through" style={{ fontSize: "9px" }}>{fmt(p.old, config.currency)}</span>}
          </div>
        )}
        <button
          className={`w-full mt-2 text-xs py-1.5 font-semibold transition-colors ${bc}`}
          style={isOutline ? { color: config.primaryColor, borderColor: config.primaryColor, border: `2px solid ${config.primaryColor}` } : { backgroundColor: config.primaryColor, color: "white" }}
        >
          Comprar
        </button>
      </div>
    </div>
  );
}

function ProductGrid({ config }: { config: StoreConfig }) {
  const isList = config.productLayout === "list";
  const cols = COLS[config.productLayout] ?? "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-2 p-3`}>
      {DEMO.map(p => <ProductCard key={p.name} p={p} config={config} isList={isList} />)}
    </div>
  );
}

function ProductMini({ p, config }: { p: typeof DEMO[0]; config: StoreConfig }) {
  return (
    <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-xl border border-black/5 shadow-sm">
      <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Package className="h-4 w-4 text-gray-200" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
        {config.showPrices && <p className="font-bold" style={{ color: config.primaryColor, fontSize: "10px" }}>{fmt(p.price, config.currency)}</p>}
      </div>
    </div>
  );
}

function MosaicVisual({ config, dark = false }: { config: StoreConfig; dark?: boolean }) {
  if (config.banner) {
    return (
      <div className="h-full w-full overflow-hidden rounded-2xl">
        <img src={config.banner} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 gap-2">
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          className={`flex items-center justify-center ${idx === 0 ? "row-span-2" : ""}`}
          style={{
            borderRadius: idx === 0 ? "18px" : "14px",
            background: idx % 2 === 0
              ? `linear-gradient(135deg, ${config.primaryColor}22, ${config.accentColor}44)`
              : dark ? "#1f1f1f" : "#f8fafc",
          }}
        >
          <Package className={`h-6 w-6 ${dark ? "text-white/20" : "text-gray-300"}`} />
        </div>
      ))}
    </div>
  );
}

function Footer({ config }: { config: StoreConfig }) {
  return (
    <div className="border-t border-gray-100 px-4 py-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-xs text-gray-700">{config.name || "Mi Tienda"}</span>
        <SocialBar config={config} />
      </div>
      <div className="flex gap-4 text-gray-400 mb-2">
        {[
          { icon: Truck, text: "Envíos" },
          { icon: Shield, text: "Seguro" },
          { icon: RotateCcw, text: "Cambios" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span style={{ fontSize: "9px" }}>{text}</span>
          </div>
        ))}
      </div>
      {config.footerText && <p className="text-gray-400" style={{ fontSize: "9px" }}>{config.footerText}</p>}
    </div>
  );
}

// ─────────── TEMPLATES ───────────

function MinimalTemplate({ config }: { config: StoreConfig }) {
  const bg = config.backgroundStyle === "gradient"
    ? `linear-gradient(135deg, ${config.secondaryColor}, white)`
    : config.backgroundStyle === "pattern"
    ? `radial-gradient(circle, ${config.primaryColor}15 1px, transparent 1px) 0 0 / 16px 16px`
    : config.secondaryColor;

  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: config.fontFamily, background: bg }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {config.logo && <img src={config.logo} className="h-6 w-6 rounded object-cover" alt="" />}
          <span className="font-bold text-gray-900 text-sm">{config.name || "Mi Tienda"}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <Search className="h-3.5 w-3.5" />
          <ShoppingBag className="h-3.5 w-3.5" />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`flex flex-col items-center justify-center text-center text-white ${config.heroStyle === "full" ? "py-12" : "py-6"}`}
          style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)) url(${config.banner}) center/cover` : config.primaryColor }}>
          <h1 className="font-extrabold text-lg drop-shadow">{config.tagline || config.name || "Bienvenida"}</h1>
          {config.description && config.heroStyle === "full" && <p className="text-white/80 text-xs mt-1 max-w-xs">{config.description}</p>}
          <button className={`mt-3 px-5 py-1.5 bg-white text-xs font-semibold ${btnClass(config.buttonStyle)}`} style={{ color: config.primaryColor }}>
            Ver colección →
          </button>
        </div>
      )}
      <ProductGrid config={config} />
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function FashionTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className={`flex items-center justify-between px-4 py-3 ${config.navbarStyle === "transparent" ? "absolute w-full z-10" : "border-b border-gray-100"}`}>
        <span className="font-light tracking-[0.15em] text-xs uppercase text-gray-800">{config.name || "FASHION"}</span>
        <div className="flex gap-3 text-gray-500">
          <Search className="h-3.5 w-3.5" /><Heart className="h-3.5 w-3.5" /><ShoppingBag className="h-3.5 w-3.5" />
        </div>
      </nav>
      <div className="relative" style={{ height: config.heroStyle === "full" ? "180px" : config.heroStyle === "compact" ? "100px" : "0px" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)) url(${config.banner}) center/cover` : `linear-gradient(160deg,${config.primaryColor},${config.accentColor})` }}>
          <p className="text-white/70 text-xs tracking-widest uppercase">Nueva temporada</p>
          <h1 className="text-white text-2xl font-black italic mt-1">{config.tagline || "NUEVA COLECCIÓN"}</h1>
          <button className="mt-3 bg-white text-xs font-bold px-6 py-1.5 tracking-wider uppercase" style={{ color: config.primaryColor }}>
            COMPRAR AHORA
          </button>
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
          {["TODAS","ROPA","JOYAS","ACCESORIOS"].map((c,i) => (
            <span key={c} className="text-xs font-bold tracking-widest shrink-0 px-3 py-1 border-b-2 cursor-pointer transition-colors"
              style={i===0 ? { borderColor: config.primaryColor, color: config.primaryColor } : { borderColor: "transparent", color: "#999" }}>
              {c}
            </span>
          ))}
        </div>
        <ProductGrid config={config} />
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function KidsTemplate({ config }: { config: StoreConfig }) {
  const bg = `linear-gradient(135deg, ${config.primaryColor}20, ${config.accentColor}20)`;
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: config.fontFamily, background: bg }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-4 py-3 bg-white rounded-b-2xl shadow-sm">
        <div className="flex items-center gap-1.5">
          {config.logo && <img src={config.logo} className="h-7 w-7 rounded-full object-cover" alt="" />}
          <span className="font-extrabold text-sm" style={{ color: config.primaryColor }}>{config.name || "🌟 KidStore"}</span>
        </div>
        <ShoppingBag className="h-4 w-4" style={{ color: config.primaryColor }} />
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`mx-3 mt-3 rounded-3xl flex flex-col items-center justify-center text-center text-white ${config.heroStyle === "full" ? "py-8" : "py-4"}`}
          style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,${config.primaryColor},${config.accentColor})` }}>
          <span className="text-3xl mb-1">🎀</span>
          <h1 className="font-extrabold text-xl drop-shadow">{config.tagline || "¡Para los más peques!"}</h1>
          {config.description && config.heroStyle === "full" && <p className="text-white/80 text-xs mt-1">{config.description}</p>}
          <button className="mt-3 bg-white font-extrabold text-xs px-5 py-2 rounded-full shadow-lg" style={{ color: config.primaryColor }}>
            ¡Ver todo! 🛍️
          </button>
        </div>
      )}
      <div className="p-3">
        <div className={`grid ${COLS[config.productLayout] ?? "grid-cols-3"} gap-2`}>
          {DEMO.map(p => (
            <div key={p.name} className="bg-white overflow-hidden shadow-sm" style={{ borderRadius: "20px" }}>
              <div className="aspect-square flex items-center justify-center relative" style={{ background: `${config.primaryColor}15` }}>
                <Package className="h-8 w-8" style={{ color: config.primaryColor, opacity: 0.4 }} />
                {p.tag && <span className="absolute top-1.5 left-1.5 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: p.tag === "OFERTA" ? "#ef4444" : config.accentColor, fontSize: "9px" }}>{p.tag} ✨</span>}
              </div>
              <div className="p-2 text-center">
                <p className="font-bold text-xs text-gray-900">{p.name}</p>
                {config.showPrices && <p className="font-extrabold text-sm mt-0.5" style={{ color: config.primaryColor }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-1.5 text-white text-xs py-1.5 rounded-full font-bold" style={{ backgroundColor: config.primaryColor }}>
                  ¡Lo quiero! 💖
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function SportTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: config.fontFamily, backgroundColor: "#0a0a0a", color: "white" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || config.primaryColor} />
      <nav className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="font-black text-base tracking-tight uppercase">{config.name || "SPORT"}</span>
        <div className="flex gap-3">
          <Search className="h-4 w-4 text-white/60" /><ShoppingBag className="h-4 w-4 text-white/60" />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`relative overflow-hidden ${config.heroStyle === "full" ? "py-10" : "py-5"}`}
          style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(135deg,#1a1a1a,${config.primaryColor}88)` }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, #000000cc, transparent)` }} />
          <div className="relative px-4">
            <p className="text-xs tracking-widest uppercase font-bold" style={{ color: config.primaryColor }}>NEW SEASON</p>
            <h1 className="font-black text-2xl uppercase leading-tight mt-1">{config.tagline || "JUGÁ EN GRANDE"}</h1>
            {config.description && config.heroStyle === "full" && <p className="text-white/60 text-xs mt-1 max-w-xs">{config.description}</p>}
            <button className="mt-3 text-black text-xs font-black px-5 py-2 uppercase tracking-widest" style={{ backgroundColor: config.primaryColor, borderRadius: btnClass(config.buttonStyle).includes("full") ? "999px" : btnClass(config.buttonStyle).includes("none") ? "0" : "6px" }}>
              SHOP NOW →
            </button>
          </div>
        </div>
      )}
      <div className="p-3">
        <div className={`grid ${COLS[config.productLayout] ?? "grid-cols-3"} gap-2`}>
          {DEMO.map(p => (
            <div key={p.name} className="overflow-hidden" style={{ backgroundColor: "#1a1a1a", borderRadius: RADIUS[config.cardRadius], border: `1px solid ${config.primaryColor}33` }}>
              <div className="aspect-square flex items-center justify-center relative" style={{ background: "#222" }}>
                <Package className="h-7 w-7 text-white/10" />
                {p.tag && <span className="absolute top-1.5 left-1.5 font-black text-black px-2 py-0.5" style={{ fontSize: "9px", backgroundColor: config.primaryColor, borderRadius: "4px" }}>{p.tag}</span>}
                {p.stock === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white/80 font-bold" style={{ fontSize: "9px" }}>AGOTADO</span></div>}
              </div>
              <div className="p-2">
                <p className="font-black text-xs text-white uppercase tracking-tight">{p.name}</p>
                {config.showPrices && <p className="font-black text-sm mt-0.5" style={{ color: config.primaryColor }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-2 text-black text-xs py-1.5 font-black uppercase" style={{ backgroundColor: config.primaryColor, borderRadius: "4px" }}>COMPRAR</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-black text-xs uppercase tracking-widest text-white/40">{config.name || "SPORT"}</span>
          <SocialBar config={config} />
        </div>
        {config.footerText && <p className="text-white/30 mt-1" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function VintageTemplate({ config }: { config: StoreConfig }) {
  const warmBg = "#fdf6ec";
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: "'Georgia', serif", backgroundColor: warmBg }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || "#8b5e3c"} />
      <nav className="flex flex-col items-center py-4 border-b-2" style={{ borderColor: config.primaryColor }}>
        <div className="flex items-center gap-3 w-full px-4 justify-between">
          <div className="flex gap-2 text-gray-500 text-xs">Inicio · Tienda · Sobre mí</div>
          <div className="text-center">
            <p className="text-xs tracking-widest uppercase" style={{ color: config.primaryColor }}>✦ {config.tagline || "Colección"} ✦</p>
            <h1 className="font-bold text-lg text-gray-800" style={{ fontFamily: "Georgia, serif" }}>{config.name || "La Boutique"}</h1>
          </div>
          <div className="flex gap-2"><Search className="h-3.5 w-3.5 text-gray-400" /><ShoppingBag className="h-3.5 w-3.5 text-gray-400" /></div>
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`text-center border-b ${config.heroStyle === "full" ? "py-8" : "py-4"}`} style={{ borderColor: `${config.primaryColor}40` }}>
          {config.banner
            ? <img src={config.banner} className="w-full object-cover" style={{ height: config.heroStyle === "full" ? "120px" : "60px" }} alt="" />
            : <div className={`${config.heroStyle === "full" ? "py-6" : "py-2"}`}>
                <div className="text-4xl mb-2">🌸</div>
                <h2 className="text-xl font-bold text-gray-700" style={{ fontFamily: "Georgia, serif" }}>
                  {config.tagline || "Piezas únicas con alma"}
                </h2>
                {config.description && config.heroStyle === "full" && <p className="text-gray-500 text-xs mt-2 max-w-xs mx-auto">{config.description}</p>}
                <button className="mt-3 border-2 px-6 py-1.5 text-xs font-semibold tracking-widest" style={{ borderColor: config.primaryColor, color: config.primaryColor }}>
                  VER COLECCIÓN
                </button>
              </div>
          }
        </div>
      )}
      <div className="p-3">
        <div className={`grid ${COLS[config.productLayout] ?? "grid-cols-3"} gap-3`}>
          {DEMO.map(p => (
            <div key={p.name} className="overflow-hidden" style={{ backgroundColor: "#fffdf8", border: `1px solid ${config.primaryColor}40`, borderRadius: "4px" }}>
              <div className="aspect-square flex items-center justify-center bg-amber-50">
                <Package className="h-7 w-7 text-amber-200" />
              </div>
              <div className="p-2 text-center border-t" style={{ borderColor: `${config.primaryColor}30` }}>
                <p className="text-xs text-gray-700 italic">{p.name}</p>
                {config.showRatings && <Stars rating={p.rating} />}
                {config.showPrices && <p className="font-bold text-sm mt-0.5" style={{ color: config.primaryColor }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-2 text-xs py-1.5 font-semibold tracking-wider" style={{ backgroundColor: config.primaryColor, color: "white", borderRadius: "2px" }}>
                  Agregar al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t-2 px-4 py-4 text-center" style={{ borderColor: `${config.primaryColor}40` }}>
        <p className="font-bold text-sm text-gray-700" style={{ fontFamily: "Georgia,serif" }}>{config.name}</p>
        <SocialBar config={config} />
        {config.footerText && <p className="text-gray-400 mt-1" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function TechTemplate({ config }: { config: StoreConfig }) {
  const neon = config.primaryColor;
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: "'Courier New', monospace", backgroundColor: "#050510", color: "#e0e0ff" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || neon} />
      <nav className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${neon}44` }}>
        <span className="font-bold text-sm" style={{ color: neon, textShadow: `0 0 10px ${neon}` }}>{config.name || "TECH_STORE"}</span>
        <div className="flex gap-3">
          <Search className="h-3.5 w-3.5" style={{ color: neon }} /><ShoppingBag className="h-3.5 w-3.5" style={{ color: neon }} />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`text-center ${config.heroStyle === "full" ? "py-10" : "py-5"}`}
          style={{ background: config.banner ? `linear-gradient(rgba(5,5,16,.8),rgba(5,5,16,.8)) url(${config.banner}) center/cover` : `radial-gradient(ellipse at center, ${neon}22 0%, transparent 70%)` }}>
          <p className="text-xs font-mono mb-1" style={{ color: neon }}>{"// "}{config.tagline || "NEXT GEN PRODUCTS"}</p>
          <h1 className="font-bold text-xl" style={{ color: "#fff", textShadow: `0 0 20px ${neon}` }}>{config.name || "TECH STORE"}</h1>
          {config.description && config.heroStyle === "full" && <p className="text-white/40 text-xs mt-2">{config.description}</p>}
          <button className="mt-4 text-xs font-bold px-6 py-2 font-mono" style={{ backgroundColor: "transparent", border: `1px solid ${neon}`, color: neon, borderRadius: "4px", boxShadow: `0 0 10px ${neon}44` }}>
            EXPLORAR →
          </button>
        </div>
      )}
      <div className="p-3">
        <div className={`grid ${COLS[config.productLayout] ?? "grid-cols-3"} gap-2`}>
          {DEMO.map(p => (
            <div key={p.name} className="overflow-hidden" style={{ backgroundColor: "#0d0d20", border: `1px solid ${neon}44`, borderRadius: RADIUS[config.cardRadius] }}>
              <div className="aspect-square flex items-center justify-center relative" style={{ background: `radial-gradient(ellipse, ${neon}15, transparent)` }}>
                <Package className="h-7 w-7" style={{ color: `${neon}60` }} />
                {p.tag && <span className="absolute top-1.5 left-1.5 font-bold text-black px-1.5 py-0.5" style={{ fontSize: "9px", backgroundColor: neon, borderRadius: "3px" }}>{p.tag}</span>}
              </div>
              <div className="p-2" style={{ borderTop: `1px solid ${neon}22` }}>
                <p className="text-xs text-white/80 font-mono truncate">{p.name}</p>
                {config.showPrices && <p className="font-bold text-xs mt-0.5" style={{ color: neon }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-2 text-black text-xs py-1.5 font-bold font-mono" style={{ backgroundColor: neon, borderRadius: "3px" }}>
                  BUY →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3" style={{ borderTop: `1px solid ${neon}22` }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: `${neon}80` }}>© {config.name || "TECH"}</span>
          <SocialBar config={config} />
        </div>
        {config.footerText && <p className="text-white/30 mt-1" style={{ fontSize: "9px", fontFamily: "monospace" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function BoutiqueTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm relative bg-white" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex gap-4 text-xs text-gray-400 font-medium">Nueva · Bestsellers</div>
        <div className="text-center">
          {config.logo && <img src={config.logo} className="h-8 w-8 rounded-full object-cover mx-auto mb-0.5" alt="" />}
          <span className="font-black text-base tracking-tight text-gray-900">{config.name || "BOUTIQUE"}</span>
        </div>
        <div className="flex gap-3 text-gray-400">
          <Heart className="h-3.5 w-3.5" /><ShoppingBag className="h-3.5 w-3.5" />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`relative mx-3 mb-4 overflow-hidden ${config.heroStyle === "full" ? "h-40" : "h-20"}`} style={{ borderRadius: "16px" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center"
            style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)) url(${config.banner}) center/cover` : `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})` }}>
            <p className="text-white/70 text-xs tracking-widest uppercase">Temporada</p>
            <h2 className="text-white font-black text-xl">{config.tagline || config.name}</h2>
            <button className="mt-2 bg-white text-xs font-semibold px-4 py-1 rounded-full" style={{ color: config.primaryColor }}>
              Explorar →
            </button>
          </div>
        </div>
      )}
      <div className="px-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
          {["Todo","Nuevo","Ofertas","Premium"].map((c,i) => (
            <span key={c} className="text-xs font-semibold px-3 py-1.5 shrink-0 cursor-pointer transition-colors"
              style={i===0 ? { backgroundColor: config.primaryColor, color: "white", borderRadius: "999px" } : { backgroundColor: "#f5f5f5", color: "#666", borderRadius: "999px" }}>
              {c}
            </span>
          ))}
        </div>
        <ProductGrid config={config} />
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function LuxuryTemplate({ config }: { config: StoreConfig }) {
  const gold = config.accentColor || "#d4af37";
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: "'Georgia',serif", backgroundColor: "#0f0f0f", color: "#e8e0d0" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || gold} />
      <nav className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${gold}33` }}>
        <div className="w-6 h-6" />
        <div className="text-center">
          <p className="text-white font-light tracking-[0.3em] text-sm uppercase">{config.name || "LUXE"}</p>
        </div>
        <ShoppingBag className="h-4 w-4" style={{ color: gold }} />
      </nav>
      {config.heroStyle !== "minimal" && (
        <div className={`flex flex-col items-center justify-center text-center ${config.heroStyle === "full" ? "py-12" : "py-6"}`}
          style={{ background: config.banner ? `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)) url(${config.banner}) center/cover` : "linear-gradient(135deg,#1a1a1a,#2a2a2a)" }}>
          <div className="w-12 h-px mb-4" style={{ backgroundColor: gold }} />
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: gold }}>{config.tagline || "Colección exclusiva"}</p>
          <h1 className="font-light text-white text-2xl mt-2 tracking-widest">{config.name || "LUXE"}</h1>
          {config.description && config.heroStyle === "full" && <p className="text-white/40 text-xs mt-3 max-w-48">{config.description}</p>}
          <div className="w-12 h-px mt-4" style={{ backgroundColor: gold }} />
          <button className="mt-4 text-xs tracking-widest uppercase px-6 py-2" style={{ border: `1px solid ${gold}`, color: gold }}>
            DESCUBRIR
          </button>
        </div>
      )}
      <div className="p-3">
        <div className={`grid ${COLS[config.productLayout] ?? "grid-cols-3"} gap-3`}>
          {DEMO.map(p => (
            <div key={p.name} style={{ border: `1px solid ${gold}22` }}>
              <div className="aspect-square bg-white/5 flex items-center justify-center relative">
                <Package className="h-6 w-6 text-white/10" />
                {p.tag && <span className="absolute top-1.5 left-1.5 font-light text-black px-2 py-0.5" style={{ fontSize: "9px", backgroundColor: gold }}>OFERTA</span>}
                {p.stock === 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white/60 text-xs tracking-widest">AGOTADO</span></div>}
              </div>
              <div className="p-2 text-center" style={{ borderTop: `1px solid ${gold}22` }}>
                <p className="text-xs tracking-wider text-white/60 uppercase font-light">{p.name}</p>
                {config.showPrices && <p className="text-xs mt-1 font-light" style={{ color: gold }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-2 text-xs py-1.5 font-light tracking-widest uppercase" style={{ border: `1px solid ${gold}`, color: gold }}>
                  Reservar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-4 text-center" style={{ borderTop: `1px solid ${gold}22` }}>
        <p className="tracking-widest text-xs uppercase" style={{ color: gold }}>{config.name}</p>
        {config.footerText && <p className="text-white/30 mt-1" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function MarketTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm bg-gray-100 relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="px-3 py-2 flex items-center gap-2 sticky top-0 z-10" style={{ backgroundColor: config.primaryColor }}>
        <span className="text-white font-bold text-sm flex-1">{config.name || "Market"}</span>
        <div className="flex-1 bg-white/90 rounded-lg px-2 py-1 flex items-center gap-1">
          <Search className="h-3 w-3 text-gray-400" /><span className="text-xs text-gray-400">Buscar...</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-white" />
      </nav>
      {config.announcementBar === "" && config.tagline && (
        <div className="text-center py-1.5 text-white text-xs font-medium" style={{ backgroundColor: `${config.primaryColor}cc` }}>
          🔥 {config.tagline}
        </div>
      )}
      <div className="p-1.5">
        <div className="grid grid-cols-3 gap-1">
          {DEMO.map(p => (
            <div key={p.name} className="bg-white overflow-hidden" style={{ borderRadius: RADIUS[config.cardRadius] }}>
              <div className="aspect-square flex items-center justify-center bg-gray-50 relative">
                <Package className="h-5 w-5 text-gray-200" />
                {p.tag && <span className="absolute top-1 left-1 text-white font-bold px-1 rounded" style={{ fontSize: "8px", backgroundColor: p.tag === "OFERTA" ? "#ef4444" : config.accentColor }}>{p.tag}</span>}
                {p.stock === 0 && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="text-white font-bold" style={{ fontSize: "8px" }}>SIN STOCK</span></div>}
              </div>
              <div className="p-1">
                <p className="text-gray-800 line-clamp-1 leading-tight" style={{ fontSize: "10px" }}>{p.name}</p>
                {config.showRatings && <Stars rating={p.rating} />}
                {config.showPrices && <p className="font-bold mt-0.5" style={{ color: config.primaryColor, fontSize: "11px" }}>{fmt(p.price, config.currency)}</p>}
                <button className="w-full mt-1 text-white font-bold" style={{ backgroundColor: config.primaryColor, fontSize: "9px", padding: "3px", borderRadius: "4px" }}>
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function EditorialTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm bg-white relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <span className="text-xs uppercase tracking-[0.22em] text-gray-900">{config.name || "Editorial"}</span>
        <div className="flex gap-3 text-gray-400">
          <Search className="h-3.5 w-3.5" />
          <ShoppingBag className="h-3.5 w-3.5" />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-5 min-h-52">
          <div className="col-span-2 flex flex-col justify-center px-5 py-8">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Nueva temporada</p>
            <h1 className="mt-2 text-3xl font-black italic leading-none text-gray-950">{config.tagline || "Nueva coleccion"}</h1>
            {config.description && config.heroStyle === "full" && <p className="mt-3 text-xs leading-relaxed text-gray-500">{config.description}</p>}
            <button className="mt-4 self-start px-5 py-2 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: config.primaryColor }}>
              Comprar ahora
            </button>
          </div>
          <div className="col-span-3 p-3">
            <div className="relative h-full min-h-44 overflow-hidden" style={{ background: config.banner ? `url(${config.banner}) center/cover` : `linear-gradient(160deg, ${config.primaryColor}, ${config.accentColor})` }}>
              <div className="absolute bottom-3 left-3 bg-white px-3 py-2">
                <p className="text-xs font-black text-gray-900">Drop 01</p>
                <p className="text-gray-400" style={{ fontSize: "9px" }}>looks seleccionados</p>
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="px-3 py-3">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          {["TODAS", "ROPA", "JOYAS", "ACCESORIOS"].map((c, i) => (
            <span
              key={c}
              className="shrink-0 border-b-2 px-3 py-1 text-xs font-bold tracking-widest"
              style={i === 0 ? { borderColor: config.primaryColor, color: config.primaryColor } : { borderColor: "transparent", color: "#999" }}
            >
              {c}
            </span>
          ))}
        </div>
        <ProductGrid config={config} />
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function BoutiqueMosaicTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full bg-white text-sm relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-5 py-4">
        <span className="text-xs font-semibold text-gray-400">Novedades</span>
        <div className="text-center">
          {config.logo && <img src={config.logo} className="mx-auto mb-1 h-8 w-8 rounded-full object-cover" alt="" />}
          <span className="text-base font-black text-gray-900">{config.name || "Boutique"}</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-gray-400" />
      </nav>
      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-2 gap-3 px-3 pb-4">
          <div className="flex min-h-48 flex-col justify-between rounded-2xl p-4 text-white" style={{ backgroundColor: config.primaryColor }}>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70">Seleccion especial</p>
              <h1 className="mt-2 text-2xl font-black leading-tight">{config.tagline || config.name || "Nueva seleccion"}</h1>
            </div>
            {config.description && <p className="text-xs leading-relaxed text-white/75">{config.description}</p>}
          </div>
          <div className="min-h-48">
            <MosaicVisual config={config} />
          </div>
        </section>
      )}
      <div className="grid grid-cols-3 gap-2 px-3 pb-2">
        {DEMO.slice(0, 3).map((p) => <ProductMini key={p.name} p={p} config={config} />)}
      </div>
      <ProductGrid config={config} />
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function ColorBlocksTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: config.fontFamily, background: config.secondaryColor }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="flex items-center justify-between px-4 py-3">
        <span className="font-black text-gray-900">{config.name || "Color Pop"}</span>
        <div className="flex gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <ShoppingBag className="h-4 w-4 text-gray-500" />
        </div>
      </nav>
      {config.heroStyle !== "minimal" && (
        <section className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 min-h-36 rounded-2xl p-4 text-white" style={{ backgroundColor: config.primaryColor }}>
              <p className="text-xs font-bold uppercase text-white/70">Hoy destacado</p>
              <h1 className="mt-2 text-2xl font-black leading-tight">{config.tagline || "Ofertas con color"}</h1>
              <button className="mt-4 rounded-full bg-white px-4 py-1.5 text-xs font-bold" style={{ color: config.primaryColor }}>Ver todo</button>
            </div>
            <div className="grid gap-2">
              <div className="rounded-2xl p-3 text-xs font-bold text-white" style={{ backgroundColor: config.accentColor }}>Nuevos</div>
              <div className="rounded-2xl bg-white p-3 text-xs font-bold text-gray-700">Top ventas</div>
            </div>
          </div>
        </section>
      )}
      <ProductGrid config={config} />
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function LuxurySplitTemplate({ config }: { config: StoreConfig }) {
  const gold = config.accentColor || "#d4af37";
  return (
    <div className="min-h-full text-sm relative" style={{ fontFamily: "'Georgia',serif", backgroundColor: "#0f0f0f", color: "#e8e0d0" }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor || gold} />
      <nav className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${gold}33` }}>
        <div className="h-px w-10" style={{ backgroundColor: gold }} />
        <span className="text-sm uppercase tracking-[0.3em] text-white">{config.name || "Luxe"}</span>
        <ShoppingBag className="h-4 w-4" style={{ color: gold }} />
      </nav>
      {config.heroStyle !== "minimal" && (
        <section className="grid grid-cols-2 gap-4 px-4 py-6">
          <div className="min-h-48">
            <MosaicVisual config={config} dark />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.28em]" style={{ color: gold }}>{config.tagline || "Edicion limitada"}</p>
            <h1 className="mt-3 text-3xl font-light leading-tight text-white">{config.name || "Luxury edit"}</h1>
            {config.description && <p className="mt-3 text-xs leading-relaxed text-white/45">{config.description}</p>}
            <button className="mt-5 self-start px-5 py-2 text-xs uppercase tracking-widest" style={{ border: `1px solid ${gold}`, color: gold }}>
              Descubrir
            </button>
          </div>
        </section>
      )}
      <div className="px-3">
        <ProductGrid config={config} />
      </div>
      <div className="px-4 py-4 text-center" style={{ borderTop: `1px solid ${gold}22` }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: gold }}>{config.name}</p>
        {config.footerText && <p className="mt-1 text-white/30" style={{ fontSize: "9px" }}>{config.footerText}</p>}
      </div>
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

function MarketSidebarTemplate({ config }: { config: StoreConfig }) {
  return (
    <div className="min-h-full bg-gray-100 text-sm relative" style={{ fontFamily: config.fontFamily }}>
      <AnnouncementBar text={config.announcementBar} color={config.announcementBarColor} />
      <nav className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: config.primaryColor }}>
        <span className="flex-1 text-sm font-bold text-white">{config.name || "Market"}</span>
        <div className="flex flex-1 items-center gap-1 rounded-lg bg-white/90 px-2 py-1">
          <Search className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">Buscar...</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-white" />
      </nav>
      <div className="grid grid-cols-[84px_1fr] gap-2 p-2">
        <aside className="space-y-1">
          {["Todo", "Ofertas", "Nuevo", "Joyas", "Ropa"].map((cat, idx) => (
            <div key={cat} className="rounded-xl px-2 py-2 text-xs font-bold" style={idx === 0 ? { backgroundColor: config.primaryColor, color: "white" } : { backgroundColor: "white", color: "#6b7280" }}>
              {cat}
            </div>
          ))}
        </aside>
        <main className="grid grid-cols-2 gap-1.5">
          {DEMO.map((p) => (
            <div key={p.name} className="overflow-hidden bg-white" style={{ borderRadius: RADIUS[config.cardRadius] }}>
              <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                <Package className="h-5 w-5 text-gray-200" />
                {p.tag && <span className="absolute left-1 top-1 rounded px-1 font-bold text-white" style={{ fontSize: "8px", backgroundColor: p.tag === "OFERTA" ? "#ef4444" : config.accentColor }}>{p.tag}</span>}
              </div>
              <div className="p-1.5">
                <p className="line-clamp-1 text-gray-800" style={{ fontSize: "10px" }}>{p.name}</p>
                {config.showPrices && <p className="font-bold" style={{ color: config.primaryColor, fontSize: "11px" }}>{fmt(p.price, config.currency)}</p>}
              </div>
            </div>
          ))}
        </main>
      </div>
      <Footer config={config} />
      {config.showWhatsappButton && <WhatsappButton number={config.whatsappNumber} />}
    </div>
  );
}

const TEMPLATES: Record<string, (c: StoreConfig) => ReactElement> = {
  default: (c) => <MinimalTemplate config={c} />,
  fashion: (c) => <EditorialTemplate config={c} />,
  kids: (c) => <KidsTemplate config={c} />,
  sport: (c) => <SportTemplate config={c} />,
  vintage: (c) => <VintageTemplate config={c} />,
  tech: (c) => <TechTemplate config={c} />,
  boutique: (c) => <BoutiqueMosaicTemplate config={c} />,
  luxury: (c) => <LuxurySplitTemplate config={c} />,
  colorful: (c) => <ColorBlocksTemplate config={c} />,
  market: (c) => <MarketSidebarTemplate config={c} />,
};

export default function StorePreview({ config }: { config: StoreConfig }) {
  const render = TEMPLATES[config.templateId] ?? TEMPLATES["default"];
  return render(config);
}
