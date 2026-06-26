"use client";
import Link from "next/link";
import { ChevronLeft, Heart, ShoppingBag, User } from "lucide-react";
import { ProductDetailBody, ProductDetailFooter, ProductDetailOverlays, resolveDetailTheme, editorParam, type DetailTheme, type ProductDetailViewProps } from "./shared";

const themeBase: DetailTheme = {
  pageBg: "#ffffff", text: "#0f0f1a", muted: "#6b6b80",
  accent: "#7c3aed", accentText: "#ffffff",
  cardBorder: "#ececf5", font: "'Inter','Segoe UI',system-ui,sans-serif", headingFont: "inherit", radius: 14,
};

export default function TechNovaDetail({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, cartCount, catalogHref, whatsapp, product, cart, isPreview, accentOverride } = view;
  const theme = resolveDetailTheme(themeBase, accentOverride);
  const homeHref = `/tienda/${slug}${editorParam(isPreview)}`;
  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, fontFamily: theme.font, color: theme.text }}>
      <nav style={{ borderBottom: `1px solid ${theme.cardBorder}`, padding: "0 24px", position: "sticky", top: 0, background: theme.pageBg, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href={homeHref} style={{ fontWeight: 900, fontSize: 18, color: theme.text, textDecoration: "none", letterSpacing: -0.5 }}>{storeName}</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button onClick={() => { cart.setFavoritesOpen(true); cart.setCartOpen(false); }} style={{ color: theme.muted, display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }} aria-label="Favoritos"><Heart size={20} /></button>
            <Link href={homeHref} style={{ color: theme.muted, display: "flex" }} aria-label="Mi cuenta"><User size={20} /></Link>
            <button onClick={() => { cart.setCartOpen(true); cart.setFavoritesOpen(false); }} style={{ color: theme.muted, display: "flex", position: "relative", background: "none", border: "none", cursor: "pointer", padding: 0 }} aria-label="Carrito">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: theme.accent, color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px 0" }}>
        <Link href={catalogHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: theme.muted, textDecoration: "none" }}>
          <ChevronLeft size={16} /> Volver al catálogo
        </Link>
      </div>

      <ProductDetailBody theme={theme} view={view} />

      <ProductDetailFooter theme={theme} bg="#0f0f1a" view={view} />

      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, background: "#25d366", color: "white", width: 56, height: 56,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}

      <ProductDetailOverlays theme={theme} view={view} />
    </div>
  );
}
