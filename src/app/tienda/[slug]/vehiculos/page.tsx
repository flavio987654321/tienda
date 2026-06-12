"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VehicleCard, VehicleModal, AM_MODAL_CSS, attr } from "@/components/store/auto/AutoVehicleShared";
import type { StorefrontProduct } from "@/hooks/useStorefront";

function mapVehicle(raw: any): StorefrontProduct {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    images = parsed.map((img: any) => typeof img === "string" ? img : img?.url ?? "").filter(Boolean);
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: any) => a?.key) : [];
  } catch {}
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: null, cantMinMayorista: null,
    category: raw.category ?? "general",
    gender: "unisex",
    description: raw.description ?? null,
    images,
    imageItems: images.map(url => ({ url })),
    reelUrls: [], sizes: [], colors: [],
    variants: raw.variants ?? [],
    attributes,
    badge: raw.badge ?? undefined,
  };
}

export default function VehiculosPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [products,    setProducts]    = useState<StorefrontProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [storeName,   setStoreName]   = useState("Tienda");
  const [accent,      setAccent]      = useState("#c9a227");
  const [currency,    setCurrency]    = useState("ARS");
  const [whatsapp,    setWhatsapp]    = useState<{ enabled: boolean; number: string }>({ enabled: false, number: "" });
  const [selected,    setSelected]    = useState<StorefrontProduct | null>(null);
  const [activeCategory, setActiveCat] = useState("Todos");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data?.store) return;
        setStoreName(data.store.name ?? "Tienda");
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.colors?.accent) setAccent(cfg.colors.accent);
          if (cfg.currency)       setCurrency(cfg.currency);
          if (cfg.whatsapp)       setWhatsapp(cfg.whatsapp);
        } catch {}
        setProducts((data.store.products ?? []).map(mapVehicle));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!loading) document.title = `${storeName} — Todos los vehículos`;
  }, [loading, storeName]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ["Todos", ...cats];
  }, [products]);

  const filtered = useMemo(() =>
    activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory),
    [products, activeCategory]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{AM_MODAL_CSS}{`
        .av-grid { display: grid; gap: 20px; grid-template-columns: 1fr }
        @media(min-width:560px){ .av-grid { grid-template-columns: repeat(2,1fr) } }
        @media(min-width:900px){ .av-grid { grid-template-columns: repeat(3,1fr) } }
        @media(min-width:1200px){ .av-grid { grid-template-columns: repeat(4,1fr) } }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #ebebeb",
        zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href={`/tienda/${slug}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%", background: "#f0f0f0",
                color: "#333", textDecoration: "none", flexShrink: 0,
                transition: "background 0.2s" }}
              title="Volver a la tienda">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111", letterSpacing: 0.5 }}>
                {storeName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#999" }}>Catálogo completo</p>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#999" }}>
            {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Filtros por categoría */}
        {categories.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                style={{ background: activeCategory === cat ? accent : "transparent",
                  color: activeCategory === cat ? "#fff" : "#666",
                  border: `1px solid ${activeCategory === cat ? accent : "#d0d0d0"}`,
                  padding: "7px 18px", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  borderRadius: 4, transition: "all 0.15s" }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa", fontSize: 14 }}>
            Cargando vehículos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa", fontSize: 14 }}>
            No hay vehículos en esta categoría.
          </div>
        ) : (
          <div className="av-grid">
            {filtered.map(p => (
              <VehicleCard key={p.id} product={p} accent={accent} currency={currency}
                theme="light" onClick={() => setSelected(p)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <VehicleModal
          product={selected}
          accent={accent}
          currency={currency}
          whatsapp={whatsapp}
          products={products}
          onClose={() => setSelected(null)}
          onSelect={p => setSelected(p)}
        />
      )}
    </div>
  );
}
