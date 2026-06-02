"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Download, Copy, Check, Search,
  Package, Hash, FileText, Image as ImageIcon, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

interface AffiliateStore {
  id: string;
  storeId: string;
  store: { name: string; slug: string };
}

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  images: string;
  category: string;
}

interface KitData {
  productName: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  affiliateLink: string;
  cardText: string;
  hashtags: string;
  storeName: string;
}

function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : arr[0]?.url ?? null;
  } catch { return null; }
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "¡Copiado!" : label}
    </button>
  );
}

async function addWatermarkAndDownload(imageUrl: string, storeName: string, filename: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = document.createElement("img") as HTMLImageElement;
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  // Watermark
  const fontSize = Math.max(16, Math.round(canvas.width * 0.04));
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "right";
  const padding = Math.round(canvas.width * 0.025);
  const text = storeName;
  const metrics = ctx.measureText(text);
  const textW = metrics.width + padding * 2;
  const textH = fontSize + padding;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(canvas.width - textW - padding, canvas.height - textH - padding, textW, textH);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, canvas.width - padding * 2, canvas.height - padding * 1.5);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function KitPage() {
  const { status: sessionStatus } = useAuth();
  const [affiliates, setAffiliates] = useState<AffiliateStore[]>([]);
  const [selectedAffId, setSelectedAffId] = useState("");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [kit, setKit] = useState<KitData | null>(null);
  const [loadingAff, setLoadingAff] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingKit, setLoadingKit] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        const active: AffiliateStore[] = (d.affiliates ?? [])
          .filter((a: any) => a.isActive && a.status === "APPROVED")
          .map((a: any) => ({ id: a.id, storeId: a.store?.id ?? "", store: a.store }));
        setAffiliates(active);
        setSelectedAffId(active[0]?.id ?? "");
        setLoadingAff(false);
      });
  }, [sessionStatus]);

  const loadProducts = useCallback((affId: string) => {
    if (!affId) return;
    setLoadingProducts(true);
    setKit(null);
    setSelectedProductId("");
    fetch("/api/productos")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        setLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    if (selectedAffId) loadProducts(selectedAffId);
  }, [selectedAffId, loadProducts]);

  async function loadKit(productId: string) {
    if (!productId || !selectedAffId) return;
    setLoadingKit(true);
    const r = await fetch(`/api/vendedoras/kit?affiliateId=${selectedAffId}&productId=${productId}`);
    const d = await r.json();
    setKit(r.ok ? d : null);
    setLoadingKit(false);
  }

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    loadKit(id);
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingAff) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/afiliados" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kit de contenido</h1>
            <p className="text-sm text-gray-500">Imagen con marca + texto listo para copiar por producto</p>
          </div>
        </div>

        {affiliates.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <Package className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenés afiliaciones activas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selector de tienda */}
            {affiliates.length > 1 && (
              <div className="relative">
                <select value={selectedAffId} onChange={(e) => setSelectedAffId(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-10">
                  {affiliates.map((a) => (
                    <option key={a.id} value={a.id}>{a.store.name}</option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Buscador de productos */}
            <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Elegí un producto</p>
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {loadingProducts ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {filteredProducts.map((p) => {
                    const img = parseFirstImage(p.images);
                    const selected = selectedProductId === p.id;
                    return (
                      <button key={p.id} onClick={() => handleSelectProduct(p.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${selected ? "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-500/30" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                        {img ? (
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            <Image src={img} alt={p.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${selected ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>{p.name}</p>
                          <p className="text-xs text-gray-400">${p.price.toLocaleString("es-AR")}</p>
                        </div>
                        {selected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">No se encontraron productos</p>
                  )}
                </div>
              )}
            </div>

            {/* Kit del producto seleccionado */}
            {loadingKit && (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
            )}

            {kit && !loadingKit && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Imágenes */}
                {kit.images.length > 0 && (
                  <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="h-4 w-4 text-indigo-400" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Imágenes con marca de agua</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {kit.images.slice(0, 6).map((img, i) => (
                        <div key={i} className="relative group">
                          <div className="relative h-24 rounded-lg overflow-hidden bg-gray-100">
                            <Image src={img} alt={`${kit.productName} ${i + 1}`} fill className="object-cover" />
                          </div>
                          <button
                            onClick={async () => {
                              setDownloadingImg(i);
                              await addWatermarkAndDownload(img, kit.storeName, `${kit.productName.replace(/\s+/g, "_")}_${i + 1}.jpg`);
                              setDownloadingImg(null);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                          >
                            {downloadingImg === i
                              ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                              : <Download className="h-5 w-5 text-white" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Pasá el mouse sobre una imagen para descargarla con la marca de agua.</p>
                  </div>
                )}

                {/* Texto para publicar */}
                <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Texto de venta</p>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton text={kit.cardText} />
                      <button onClick={() => downloadText(kit.cardText, `${kit.productName.replace(/\s+/g, "_")}_texto.txt`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
                        <Download className="h-3.5 w-3.5" /> .txt
                      </button>
                    </div>
                  </div>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-white/5 rounded-lg p-3 leading-relaxed max-h-48 overflow-y-auto">
                    {kit.cardText}
                  </pre>
                </div>

                {/* Hashtags */}
                <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-indigo-400" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Hashtags sugeridos</p>
                    </div>
                    <CopyButton text={kit.hashtags} label="Copiar hashtags" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.hashtags.split(" ").map((h, i) => (
                      <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
