"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import {
  Edit, Eye, EyeOff, Package, Search, X, Percent, ChevronDown,
  Trash2, Copy, LayoutGrid, List, ChevronLeft, ChevronRight, QrCode,
} from "lucide-react";

interface Variant { id: string; stock: number }

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  price: number;
  comparePrice: number | null;
  images: string;
  isActive: boolean;
  variants: Variant[];
}

interface Props { products: Product[]; storeSlug?: string; storeName?: string; storeType?: string }

const PAGE_SIZE = 20;

function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return (parsed as (string | { url: string })[])
      .map(img => typeof img === "string" ? img : img?.url ?? "")
      .filter(Boolean);
  } catch { return []; }
}

export default function ProductsTable({ products: initialProducts, storeSlug = "", storeName = "", storeType = "" }: Props) {
  const showStock = storeType !== "AUTOS";
  const [products,      setProducts]      = useState(initialProducts);
  const [search,        setSearch]        = useState("");
  const [categoryFilter,setCategoryFilter]= useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [stockFilter,   setStockFilter]   = useState("all");
  const [sortBy,        setSortBy]        = useState("newest");
  const [viewMode,      setViewMode]      = useState<"table" | "grid">("table");
  const [page,          setPage]          = useState(1);
  const [showBulk,      setShowBulk]      = useState(false);
  const [bulkCategory,  setBulkCategory]  = useState("all");
  const [bulkPct,       setBulkPct]       = useState("");
  const [bulkLoading,   setBulkLoading]   = useState(false);
  const [bulkError,     setBulkError]     = useState("");
  const [bulkSuccess,   setBulkSuccess]   = useState("");
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [deleteError,   setDeleteError]   = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [qrProduct,     setQrProduct]     = useState<{ id: string; name: string; price: number; year?: string; km?: string } | null>(null);
  const [qrLoading,     setQrLoading]     = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tiendaapps.com";

  async function openQr(product: Product) {
    setQrLoading(true);
    let year: string | undefined;
    let km: string | undefined;
    try {
      const res = await fetch(`/api/productos/${product.id}`);
      if (res.ok) {
        const data = await res.json();
        const attrs: { key: string; value: string }[] = JSON.parse(data.product?.attributes || "[]");
        const find = (keys: string[]) => attrs.find(a => keys.some(k => a.key.toLowerCase().includes(k)))?.value;
        year = find(["año", "anio", "year"]);
        km   = find(["km", "kilom", "millaje", "mileage"]);
      }
    } catch { /* noop */ }
    setQrProduct({ id: product.id, name: product.name, price: product.price, year, km });
    setQrLoading(false);
  }

  function downloadQr() {
    if (!qrProduct) return;
    const qrCanvas = document.getElementById("qr-hd-canvas") as HTMLCanvasElement | null;
    if (!qrCanvas) return;

    const year = qrProduct.year ?? null;
    const km   = qrProduct.km   ?? null;
    const nameClean = qrProduct.name;

    // Canvas sized so QR + text fit comfortably — no overflow
    const W = 700;
    // Figure out how many info lines we'll need so canvas height is exact
    const qs = qrCanvas.width;
    const qrDraw = 500; // QR takes most of the width

    // Measure vehicle name lines upfront
    const tmpCtx = document.createElement("canvas").getContext("2d")!;
    const maxNameW = W - 80;
    const fs = nameClean.length > 38 ? 26 : nameClean.length > 24 ? 30 : 36;
    tmpCtx.font = `bold ${fs}px Arial, sans-serif`;
    const words = nameClean.split(" ");
    let line = "", lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (tmpCtx.measureText(test).width > maxNameW && line) { lines.push(line); line = w; }
      else line = test;
    }
    lines.push(line);

    // Calculate total height needed
    const headerH = 110;
    const qrPad   = 16;
    const qrBlock = qrPad + qrDraw + qrPad;
    const divH    = 32;
    const pillH   = (year || km) ? 44 : 0;
    const nameH   = lines.length * (fs + 8) + 10;
    const footerH = 56;
    const bottomMargin = 24;
    const H = headerH + qrBlock + divH + pillH + nameH + bottomMargin + footerH;

    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d")!;

    // ── White background ────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // ── Top header (dark band) ──────────────────────────────
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, headerH);
    // Accent stripe bottom of header
    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(0, headerH - 4, W, 4);

    // Header text — measured to never overflow
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.fillText("ESCANEÁ Y VE TODOS LOS DETALLES", W / 2, 52);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px Arial, sans-serif";
    ctx.fillText("Apuntá la cámara al código · Abre directo en tu celular", W / 2, 82);

    // ── QR code — centered ──────────────────────────────────
    const qrX = (W - qrDraw) / 2;
    const qrY = headerH + qrPad;

    // Rounded white box with border
    const r = 14;
    const bx = qrX - 2, by = qrY - 2, bw = qrDraw + 4, bh = qrDraw + 4;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.drawImage(qrCanvas, 0, 0, qs, qs, qrX, qrY, qrDraw, qrDraw);

    // ── Divider ─────────────────────────────────────────────
    const divY = headerH + qrBlock;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, divY + 12); ctx.lineTo(W - 40, divY + 12);
    ctx.stroke();

    // ── Year + KM pills ──────────────────────────────────────
    let infoY = divY + divH;
    if (year || km) {
      const tags = [year ? `AÑO ${year}` : null, km ? `${parseInt(km).toLocaleString("es-AR")} KM` : null].filter(Boolean) as string[];
      ctx.font = "bold 15px Arial, sans-serif";
      const totalW = tags.reduce((acc, t) => acc + ctx.measureText(t).width + 28, 0) + (tags.length - 1) * 12;
      let px = (W - totalW) / 2;
      tags.forEach(tag => {
        const tw = ctx.measureText(tag).width + 28;
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(px, infoY, tw, 30, 15);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(tag, px + 14, infoY + 20);
        px += tw + 12;
      });
      infoY += 44;
    }

    // ── Vehicle name ─────────────────────────────────────────
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, infoY + i * (fs + 8) + fs));

    // ── Bottom footer ────────────────────────────────────────
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, H - footerH, W, footerH);

    ctx.textAlign = "center";
    if (storeName) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(storeName.toUpperCase(), W / 2, H - footerH + 20);
    }
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(appUrl.replace("https://", ""), W / 2, H - footerH + (storeName ? 40 : 30));

    const link = document.createElement("a");
    link.download = `qr-${qrProduct.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 40)}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = products.filter(p => {
      const stock = p.variants.reduce((s, v) => s + v.stock, 0);
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !(p.subcategory || "").toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "hidden" && p.isActive) return false;
      if (stockFilter === "out" && stock !== 0) return false;
      if (stockFilter === "low" && (stock === 0 || stock > 4)) return false;
      if (stockFilter === "critical" && stock >= 5) return false;
      return true;
    });
    if (sortBy === "price_asc")  result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")    result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "stock_asc")  result = [...result].sort((a, b) =>
      a.variants.reduce((s, v) => s + v.stock, 0) - b.variants.reduce((s, v) => s + v.stock, 0)
    );
    return result;
  }, [products, search, categoryFilter, statusFilter, stockFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";

  function clearFilters() {
    setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setStockFilter("all");
    setPage(1);
  }

  function goPage(n: number) { setPage(Math.max(1, Math.min(totalPages, n))); }

  const bulkAffected = products.filter(p => bulkCategory === "all" || p.category === bulkCategory).length;

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setDeletingId(id);
    setDeleteError("");
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) { setDeleteError(data.error || "Error al eliminar"); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function duplicateProduct(product: Product) {
    setDuplicatingId(product.id);
    const res = await fetch(`/api/productos/${product.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    setDuplicatingId(null);
    if (!res.ok) return;
    const copy: Product = {
      id:           data.product.id,
      name:         data.product.name,
      category:     data.product.category,
      subcategory:  data.product.subcategory ?? null,
      price:        data.product.price,
      comparePrice: data.product.comparePrice ?? null,
      images:       data.product.images,
      isActive:     data.product.isActive,
      variants:     data.product.variants,
    };
    setProducts(prev => [copy, ...prev]);
    setPage(1);
  }

  async function applyBulkPrice() {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct === 0) { setBulkError("Ingresá un porcentaje válido distinto de 0"); return; }
    const label = pct > 0 ? `+${pct}%` : `${pct}%`;
    if (!confirm(`¿Actualizar precios de ${bulkAffected} producto${bulkAffected !== 1 ? "s" : ""} en ${label}?`)) return;
    setBulkLoading(true); setBulkError(""); setBulkSuccess("");
    const res = await fetch("/api/productos/bulk-precio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percentage: pct, category: bulkCategory }),
    });
    const data = await res.json();
    setBulkLoading(false);
    if (!res.ok) { setBulkError(data.error || "Error al actualizar"); return; }
    setBulkSuccess(`${data.updated} producto${data.updated !== 1 ? "s" : ""} actualizados`);
    setBulkPct("");
    const factor = 1 + pct / 100;
    setProducts(prev => prev.map(p => {
      if (bulkCategory !== "all" && p.category !== bulkCategory) return p;
      return { ...p, price: Math.max(1, Math.round(p.price * factor)), comparePrice: p.comparePrice ? Math.max(1, Math.round(p.comparePrice * factor)) : null };
    }));
  }

  const stockDot = (stock: number) =>
    stock === 0 ? "bg-red-500" : stock < 5 ? "bg-yellow-400" : "bg-green-500";

  const stockLabel = (stock: number) => (
    <span className={`text-sm font-medium ${stock === 0 ? "text-red-500" : stock < 5 ? "text-yellow-500" : "text-green-600"}`}>
      {stock} u.
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Confirm delete modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mt-3 text-base font-bold text-gray-900">¿Eliminar producto?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Vas a eliminar <strong className="text-gray-800">{pendingDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setPendingDelete(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 self-stretch">
              <QrCode className="h-5 w-5 text-indigo-500 shrink-0" />
              <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{qrProduct.name}</p>
              <button onClick={() => setQrProduct(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <QRCodeCanvas
                id="qr-dl-canvas"
                value={`${appUrl}/tienda/${storeSlug}?producto=${qrProduct.id}`}
                size={220}
                level="H"
                marginSize={1}
              />
            </div>
            {/* Hidden HD canvas for download */}
            <div style={{ position: "absolute", left: -9999, top: -9999, pointerEvents: "none" }}>
              <QRCodeCanvas
                id="qr-hd-canvas"
                value={`${appUrl}/tienda/${storeSlug}?producto=${qrProduct.id}`}
                size={400}
                level="H"
                marginSize={2}
              />
            </div>
            <p className="text-xs text-gray-400 text-center -mt-1">
              Escanear abre la publicación directamente en la tienda
            </p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setQrProduct(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cerrar
              </button>
              <button onClick={downloadQr}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 flex items-center justify-center gap-1.5">
                <QrCode className="h-4 w-4" /> Descargar PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="space-y-2">
        {/* Fila 1: búsqueda + limpiar + vista */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o categoría..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 px-2 shrink-0">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
          <div className="shrink-0 flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`p-2.5 transition-colors ${viewMode === "table" ? "bg-indigo-50 text-indigo-600" : "bg-white text-gray-400 hover:text-gray-600"}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "bg-white text-gray-400 hover:text-gray-600"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fila 2: selects — 2 columnas en mobile, flex en desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="hidden">Ocultos</option>
          </select>

          {showStock && (
            <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
              <option value="all">Todo el stock</option>
              <option value="out">Sin stock (0 u.)</option>
              <option value="low">Stock bajo (1–4 u.)</option>
              <option value="critical">Stock crítico (0–4 u.)</option>
            </select>
          )}

          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
            <option value="newest">Más recientes</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
            <option value="name_az">Nombre A→Z</option>
            <option value="stock_asc">Stock ↑</option>
          </select>
        </div>
      </div>

      {/* Bulk price update */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <button type="button" onClick={() => { setShowBulk(v => !v); setBulkError(""); setBulkSuccess(""); }}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          <Percent className="h-4 w-4 text-indigo-500" />
          Actualizar precios en masa
          <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${showBulk ? "rotate-180" : ""}`} />
        </button>
        {showBulk && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="mb-1 block text-xs font-semibold text-gray-500">Categoría</label>
                <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Todos los productos ({products.length})</option>
                  {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)} ({products.filter(p => p.category === c).length})</option>)}
                </select>
              </div>
              <div className="w-44">
                <label className="mb-1 block text-xs font-semibold text-gray-500">Porcentaje (ej: 20 o -15)</label>
                <div className="relative">
                  <input type="number" value={bulkPct} onChange={e => { setBulkPct(e.target.value); setBulkError(""); setBulkSuccess(""); }}
                    placeholder="ej: 20" min={-99} max={1000}
                    className="w-full rounded-xl border border-gray-200 pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
              <button type="button" onClick={applyBulkPrice} disabled={bulkLoading || !bulkPct}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {bulkLoading ? "Aplicando..." : `Aplicar a ${bulkAffected} producto${bulkAffected !== 1 ? "s" : ""}`}
              </button>
            </div>
            {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}
            {bulkSuccess && <p className="text-xs text-green-600 font-semibold">{bulkSuccess}</p>}
          </div>
        )}
      </div>

      {/* Stock legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {showStock && <>
          <span className="font-medium text-gray-500">Stock:</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Sin stock</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Bajo (1–4 u.)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Normal (5+ u.)</span>
        </>}
        <span className="ml-auto text-gray-400">
          {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? " encontrados" : ""}
          {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin resultados</p>
          <p className="text-gray-400 text-sm mt-1">Probá con otros filtros de búsqueda</p>
        </div>
      ) : viewMode === "grid" ? (
        /* ── VISTA GRILLA ─────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginated.map(product => {
            const stock = product.variants.reduce((s, v) => s + v.stock, 0);
            const images = parseImages(product.images);
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-50">
                  {images[0] ? (
                    <img src={images[0]} alt={product.name} className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.opacity = "0"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-200" />
                    </div>
                  )}
                  {showStock && <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white ${stockDot(stock)}`} />}
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-400 bg-white/80 px-2 py-1 rounded-lg">Oculto</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-400 capitalize truncate">{product.category}{product.subcategory ? ` › ${product.subcategory}` : ""}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2 leading-tight">{product.name}</p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">${product.price.toLocaleString("es-AR")}</p>
                  <div className="mt-3 flex gap-1.5">
                    <Link href={`/dashboard/productos/nuevo?edit=${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                      <Edit className="h-3 w-3" /> Editar
                    </Link>
                    <button onClick={() => openQr(product)} disabled={qrLoading}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-500 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-40"
                      title="Código QR">
                      <QrCode className="h-3 w-3" />
                    </button>
                    <button onClick={() => duplicateProduct(product)} disabled={duplicatingId === product.id}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                      title="Duplicar">
                      <Copy className="h-3 w-3" />
                    </button>
                    <button onClick={() => setPendingDelete({ id: product.id, name: product.name })} disabled={deletingId === product.id}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-400 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                      title="Eliminar">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VISTA TABLA ──────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Producto</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Precio</th>
                {showStock && <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>}
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(product => {
                const stock = product.variants.reduce((s, v) => s + v.stock, 0);
                const images = parseImages(product.images);
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                          {images[0] && (
                            <img src={images[0]} alt={product.name} className="relative w-full h-full object-cover z-10"
                              onError={e => { e.currentTarget.style.opacity = "0"; }} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{product.variants.length} variante{product.variants.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 capitalize">{product.category}</span>
                      {product.subcategory && <p className="text-xs text-gray-400 capitalize">{product.subcategory}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-sm">${product.price.toLocaleString("es-AR")}</p>
                      {product.comparePrice && <p className="text-xs text-gray-400 line-through">${product.comparePrice.toLocaleString("es-AR")}</p>}
                    </td>
                    {showStock && <td className="px-6 py-4">{stockLabel(stock)}</td>}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {product.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {product.isActive ? "Activo" : "Oculto"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/dashboard/productos/nuevo?edit=${product.id}`}
                          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                          <Edit className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <button onClick={() => openQr(product)} disabled={qrLoading}
                          className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 font-medium disabled:opacity-40" title="Código QR">
                          <QrCode className="h-3.5 w-3.5" /> QR
                        </button>
                        <button onClick={() => duplicateProduct(product)} disabled={duplicatingId === product.id}
                          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-medium disabled:opacity-40" title="Duplicar producto">
                          <Copy className="h-3.5 w-3.5" />
                          {duplicatingId === product.id ? "..." : "Duplicar"}
                        </button>
                        <button onClick={() => setPendingDelete({ id: product.id, name: product.name })} disabled={deletingId === product.id}
                          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 font-medium disabled:opacity-40">
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === product.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => goPage(page - 1)} disabled={page === 1}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
              if (n !== 1 && n !== totalPages && Math.abs(n - page) > 2) return null;
              return (
                <button key={n} onClick={() => goPage(n)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${n === page ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {n}
                </button>
              );
            })}
          </div>
          <button onClick={() => goPage(page + 1)} disabled={page === totalPages}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default">
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
