"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import {
  Plus, Trash2, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, X, Star, ShoppingCart, Heart, Tag, Package, HelpCircle, Calendar, Film,
} from "lucide-react";
import Link from "next/link";
import { getStoreType } from "@/lib/storeTypes";

type ImageItem = { url: string; variantValue?: string };

function getVariantOptions(storeType: string): string[] {
  const map: Record<string, string[]> = {
    ROPA:      ["Talle", "Color"],
    AUTOS:     ["Color", "Versión"],
    TECH:      ["Almacenamiento", "Color", "RAM"],
    HOGAR:     ["Tamaño", "Color", "Material"],
    ALIMENTOS: ["Peso/Tamaño", "Sabor"],
    BELLEZA:   ["Tono", "Tamaño"],
    DEPORTE:   ["Talle", "Color"],
    MASCOTAS:  ["Tamaño", "Sabor"],
    LIBROS:    ["Formato"],
    GENERAL:   ["Variante", "Color", "Tamaño"],
  };
  const options = map[storeType] || ["Variante"];
  return [...new Set([...options, "Otro"])];
}

interface Variant {
  attrs: Record<string, string>;
  stock: string;
  price: string;
  sku: string;
}

interface Attribute {
  key: string;
  value: string;
}

interface StoreConfig {
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  buttonStyle: string;
  cardRadius: string;
  cardShadow: string;
  showPrices: boolean;
  showRatings: boolean;
  currency: string;
  tipoTienda?: string;
  tieneVentaMayorista?: boolean;
}

const SHADOW_MAP: Record<string, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};
const RADIUS_MAP: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-3xl",
};

const MAX_SOURCE_IMAGE_SIZE_MB = 20;
const MAX_SOURCE_IMAGE_SIZE_BYTES = MAX_SOURCE_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_UPLOAD_IMAGE_SIZE_MB = 4;
const MAX_UPLOAD_IMAGE_SIZE_BYTES = MAX_UPLOAD_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIDE = 2400;
const MAX_PRODUCT_IMAGES = 5;
function makeDefaultVariant(dimensions: string[]): Variant {
  const attrs: Record<string, string> = {};
  dimensions.forEach(d => { attrs[d] = ""; });
  return { attrs, stock: "0", price: "", sku: "" };
}
const SINGLE_VARIANT_FALLBACK_VALUE = "Unico";

const COLOR_PREVIEW: Record<string, string> = {
  rojo:"#ef4444",red:"#ef4444",azul:"#3b82f6",blue:"#3b82f6",verde:"#22c55e",green:"#22c55e",
  negro:"#111827",black:"#111827",blanco:"#f9fafb",white:"#f9fafb",amarillo:"#eab308",yellow:"#eab308",
  naranja:"#f97316",orange:"#f97316",rosa:"#ec4899",pink:"#ec4899",violeta:"#8b5cf6",purple:"#8b5cf6",
  lila:"#c084fc",gris:"#9ca3af",gray:"#9ca3af",grey:"#9ca3af",marron:"#92400e",brown:"#92400e",
  beige:"#d4b896",celeste:"#67e8f9",turquesa:"#2dd4bf",dorado:"#d97706",gold:"#d97706",
  plateado:"#e2e8f0",silver:"#e2e8f0",bordo:"#881337",coral:"#fb7185",mostaza:"#ca8a04",nude:"#f5d5ba",
};
function colorPreview(val: string): string | null {
  const v = val.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  return COLOR_PREVIEW[v.toLowerCase()] ?? null;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip ml-1 cursor-help align-middle">
      <HelpCircle className="h-3.5 w-3.5 text-indigo-400 hover:text-indigo-600 transition-colors" />
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 leading-relaxed shadow-lg">
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function variantTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "Una fila por combinación. Ej: Talle S + Color Negro → fila 1, Talle M + Color Blanco → fila 2. Cada fila tiene su propio stock.",
    TECH:      "Una fila por combinación. Ej: 128GB + Azul → fila 1, 256GB + Negro → fila 2. Cada fila tiene su propio stock.",
    BELLEZA:   "Una fila por combinación. Ej: Tono Claro + Tamaño Grande → fila 1, Tono Oscuro + Tamaño Chico → fila 2.",
    HOGAR:     "Una fila por combinación. Ej: Color Blanco + Material Madera → fila 1. Cada fila tiene su propio stock.",
    DEPORTE:   "Una fila por combinación. Ej: Talle S + Color Rojo → fila 1, Talle M + Color Azul → fila 2.",
    ALIMENTOS: "Una fila por combinación. Ej: 500g + Vainilla → fila 1, 1kg + Chocolate → fila 2.",
    MASCOTAS:  "Una fila por combinación. Ej: Tamaño Pequeño + Sabor Pollo → fila 1. Cada fila tiene su propio stock.",
    LIBROS:    "Una fila por formato. Ej: Físico → fila 1, Digital → fila 2. Cada fila tiene su propio stock.",
    GENERAL:   "Una fila por combinación. Ej: Color Rojo + Tamaño Grande → fila 1. Cada fila tiene su propio stock.",
  };
  return tips[tipoTienda] || "Una fila por combinación de variantes. Cada fila tiene su propio stock.";
}

function tagsTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "Palabras clave para búsqueda. Ej: negro, oversize, algodón. No afectan el precio ni el stock.",
    TECH:      "Palabras clave para búsqueda. Ej: liberado, sin cargador, 5G.",
    BELLEZA:   "Palabras clave para búsqueda. Ej: vegano, sin parabenos, hidratante.",
    HOGAR:     "Palabras clave para búsqueda. Ej: madera, escandinavo, minimalista.",
    ALIMENTOS: "Palabras clave para búsqueda. Ej: sin tacc, vegano, artesanal.",
    DEPORTE:   "Palabras clave para búsqueda. Ej: running, gym, impermeable.",
    MASCOTAS:  "Palabras clave para búsqueda. Ej: perro, gato, natural, sin conservantes.",
    LIBROS:    "Palabras clave para búsqueda. Ej: ficción, bestseller, regalo, tapa dura.",
    GENERAL:   "Palabras clave para búsqueda separadas por coma. Ayudan a tus clientes a encontrar el producto.",
  };
  return tips[tipoTienda] || "Palabras clave separadas por coma para que tus clientes encuentren el producto.";
}

function variantPlaceholder(name: string): string {
  const n = name.toLowerCase();
  if (n === "color" || n === "tono") return "ej: Rojo o #FF0000";
  if (n === "talle" || n === "size") return "ej: S";
  if (n === "material") return "ej: Algodón";
  if (n === "sabor") return "ej: Vainilla";
  if (n === "almacenamiento" || n === "ram") return "ej: 128GB";
  return "ej: Valor";
}

function getTalleSuggestions(category: string, subcategory: string): string[] {
  const c = category.toLowerCase().replace(/-/g, "");
  const s = subcategory.toLowerCase().replace(/-/g, "");
  const shoeSubcats = ["zapatillas", "botas", "sandalias", "zapatos", "ojotas", "running", "futbol", "basquet", "training", "trekking"];
  const pantSubcats = ["jeans", "wideleg", "cargo", "legging", "short", "pantalon"];
  if (c === "ropabebe") {
    return ["0-3m", "3-6m", "6-9m", "9-12m", "12-18m", "18-24m"];
  }
  if (c === "ropaninos") {
    return ["2", "3", "4", "5", "6", "7", "8", "10", "12", "14", "16"];
  }
  if (c === "joyas" || s === "anillos") {
    if (s === "collares") return ["40cm", "45cm", "50cm", "55cm", "60cm", "70cm"];
    if (s === "pulseras") return ["16cm", "17cm", "18cm", "19cm", "20cm"];
    if (s === "anillos") return ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];
    return ["Unitalla", "XS", "S", "M", "L", "XL"];
  }
  if (c === "calzado" || shoeSubcats.includes(s)) {
    return ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
  }
  if (c === "pantalones" || pantSubcats.includes(s)) {
    return ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44"];
  }
  return ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);
}

function safeJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function prepareVariantsForSubmit(variants: Variant[]) {
  const prepared = variants
    .map((v) => {
      const cleanAttrs = Object.fromEntries(
        Object.entries(v.attrs).map(([k, val]) => [k, val.trim()])
      );
      return {
        name: JSON.stringify(cleanAttrs),
        value: Object.values(cleanAttrs).filter(Boolean).join(" / "),
        stock: v.stock.trim(),
        price: v.price.trim(),
        sku: v.sku.trim(),
      };
    })
    .filter((v) => v.value || v.stock || v.price || v.sku);

  if (prepared.length === 1 && !prepared[0].value) {
    prepared[0] = { ...prepared[0], value: SINGLE_VARIANT_FALLBACK_VALUE };
  }

  return prepared;
}

function formatCategoryLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// optimizeImageForUpload usa la utilidad compartida con las mismas limitaciones de antes
async function optimizeImageForUpload(file: File) {
  const { optimizeImage } = await import("@/lib/image-optimizer");
  return optimizeImage(file, {
    maxSidePx: MAX_IMAGE_SIDE,
    maxBytes: MAX_UPLOAD_IMAGE_SIZE_BYTES,
    startQuality: 0.92,
  });
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return { error: text };
  }
}

function ProductoFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("edit");
  const isEditing = Boolean(editingId);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [error, setError] = useState("");
  const [store, setStore] = useState<StoreConfig>({
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
    secondaryColor: "#f1f5f9",
    fontFamily: "Inter",
    buttonStyle: "rounded",
    cardRadius: "md",
    cardShadow: "sm",
    showPrices: true,
    showRatings: false,
    currency: "ARS",
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    category: "ropa",
    subcategory: "",
    tags: "",
  });
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<Record<string, string[]>>({});
  const [gender, setGender] = useState<"mujer" | "hombre" | "unisex">("unisex");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [variants, setVariants] = useState<Variant[]>([{ attrs: { Talle: "" }, stock: "0", price: "", sku: "" }]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [condicion, setCondicion] = useState<"Nuevo" | "Usado">("Usado");
  const [precioMayorista, setPrecioMayorista] = useState("");
  const [cantMinMayorista, setCantMinMayorista] = useState("");
  const [publishAt, setPublishAt] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [reelUrls, setReelUrls] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((d) => {
        if (!d.store) return;
        setStore((p) => ({ ...p, ...d.store }));
        setStoreLoaded(true);
        const typeConfig = getStoreType(d.store.tipoTienda || "ROPA");
        setProductCategories(typeConfig.categorias);
        setProductSubcategories(typeConfig.subcategorias);
        if (!editingId) {
          setForm((p) => ({ ...p, category: typeConfig.categorias[0] || "general" }));
          if (typeConfig.extraFields.length > 0) {
            setAttributes(typeConfig.extraFields.map((f) => ({ key: f.label, value: "" })));
          }
          const dims = getVariantOptions(d.store.tipoTienda || "ROPA").filter(o => o !== "Otro");
          setVariants([makeDefaultVariant(dims)]);
        }
      })
      .catch(() => {});

    fetch("/api/productos")
      .then((r) => r.json())
      .then((d) => {
        const extraCats = (d.products || []).map((p: any) => p.category).filter(Boolean) as string[];
        setProductCategories((prev) => Array.from(new Set([...prev, ...extraCats])));
        const grouped = (d.products || []).reduce((acc: Record<string, string[]>, product: any) => {
          if (!product.category || !product.subcategory) return acc;
          acc[product.category] = Array.from(new Set([...(acc[product.category] || []), product.subcategory]));
          return acc;
        }, {});
        setProductSubcategories((prev) => {
          const merged = { ...prev };
          for (const [cat, subs] of Object.entries(grouped)) {
            merged[cat] = Array.from(new Set([...(merged[cat] || []), ...(subs as string[])]));
          }
          return merged;
        });
      })
      .catch(() => {});
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;

    setLoadingProduct(true);
    setError("");
    fetch(`/api/productos/${editingId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el producto");
        return data.product;
      })
      .then((product) => {
        const knownCategory = productCategories.includes(product.category);
        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price?.toString() || "",
          comparePrice: product.comparePrice?.toString() || "",
          category: knownCategory ? product.category : "otro",
          subcategory: product.subcategory ? (productSubcategories[product.category] || []).includes(product.subcategory) ? product.subcategory : "otro" : "",
          tags: safeJsonArray(product.tags).join(", "),
        });
        setGender((product.gender as "mujer" | "hombre" | "unisex") || "unisex");
        setCustomCategory(knownCategory ? "" : product.category || "");
        setCustomSubcategory(product.subcategory && !((productSubcategories[product.category] || []).includes(product.subcategory)) ? product.subcategory : "");
        setImages(
          safeJsonArray(product.images)
            .map((item: any) =>
              typeof item === "string" ? { url: item } : { url: item?.url || "", variantValue: item?.variantValue }
            )
            .filter((img: ImageItem) => img.url)
        );
        setReelUrls(safeJsonArray(product.reelUrls || "[]").filter((url) => typeof url === "string") as string[]);
        setCarouselIdx(0);
        setVariants(
          product.variants?.length
            ? product.variants.map((v: any) => {
                let attrs: Record<string, string> = {};
                if (typeof v.name === "string" && v.name.startsWith("{")) {
                  try { attrs = JSON.parse(v.name); } catch {}
                }
                if (Object.keys(attrs).length === 0) {
                  attrs = { [v.name || "Variante"]: v.value || (product.variants.length === 1 ? SINGLE_VARIANT_FALLBACK_VALUE : "") };
                }
                return { attrs, stock: v.stock?.toString() || "0", price: v.price?.toString() || "", sku: v.sku || "" };
              })
            : [makeDefaultVariant(getVariantOptions(store.tipoTienda || "ROPA").filter(o => o !== "Otro"))]
        );
        const allAttrs = safeJsonArray(product.attributes).filter(
          (a: any) => a && typeof a.key === "string" && typeof a.value === "string"
        ) as Attribute[];
        const condAttr = allAttrs.find((a) => a.key === "Condición");
        if (condAttr) setCondicion(condAttr.value as "Nuevo" | "Usado");
        setAttributes(allAttrs.filter((a) => a.key !== "Condición"));
        setPrecioMayorista(product.precioMayorista?.toString() || "");
        setCantMinMayorista(product.cantMinMayorista?.toString() || "");
        if (product.publishAt) {
          const d = new Date(product.publishAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          setPublishAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el producto"))
      .finally(() => { setLoadingProduct(false); loadedRef.current = true; });
  }, [editingId, productCategories]);

  // For new products (no editingId), mark as loaded immediately after mount
  useEffect(() => { if (!editingId) loadedRef.current = true; }, [editingId]);

  function markDirty() { if (loadedRef.current) setIsDirty(true); }

  function updateForm(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    markDirty();
  }

  function updateVariantAttr(idx: number, attrName: string, value: string) {
    setVariants((p) => p.map((v, i) => i === idx ? { ...v, attrs: { ...v.attrs, [attrName]: value } } : v));
    markDirty();
  }

  function updateVariantField(idx: number, field: "stock" | "price" | "sku", value: string) {
    setVariants((p) => p.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
    markDirty();
  }

  function addVariant() {
    const dims = getVariantOptions(store.tipoTienda || "ROPA").filter(o => o !== "Otro");
    setVariants((p) => [...p, makeDefaultVariant(dims)]);
    markDirty();
  }

  function removeVariant(idx: number) {
    setVariants((p) => p.filter((_, i) => i !== idx));
    markDirty();
  }

  const colorValues = useMemo(() => {
    const values = new Set<string>();
    variants.forEach((v) => {
      Object.entries(v.attrs).forEach(([key, val]) => {
        if ((key.toLowerCase().includes("color") || key.toLowerCase().includes("tono")) && val.trim()) {
          values.add(val.trim());
        }
      });
    });
    return Array.from(values);
  }, [variants]);

  function assignImageColor(idx: number, variantValue: string | undefined) {
    setImages((p) => p.map((img, i) => i === idx ? { ...img, variantValue: variantValue || undefined } : img));
    markDirty();
  }

  function addAttribute() {
    setAttributes((p) => [...p, { key: "", value: "" }]);
    markDirty();
  }

  function updateAttribute(idx: number, field: keyof Attribute, value: string) {
    setAttributes((p) => p.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
    markDirty();
  }

  function removeAttribute(idx: number) {
    setAttributes((p) => p.filter((_, i) => i !== idx));
    markDirty();
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
    const validFiles = files
      .filter((file) => file.type.startsWith("image/") && file.size <= MAX_SOURCE_IMAGE_SIZE_BYTES)
      .slice(0, availableSlots);

    if (!availableSlots) {
      setError(`Podes subir hasta ${MAX_PRODUCT_IMAGES} imagenes por producto.`);
      return;
    }

    if (!validFiles.length) {
      setError(`Subi imagenes JPG, PNG o WEBP de hasta ${MAX_SOURCE_IMAGE_SIZE_MB} MB.`);
      return;
    }

    setError("");
    setUploadingImg(true);
    try {
      const urls: string[] = [];
      for (const file of validFiles) {
        const uploadFile = await optimizeImageForUpload(file);
        const fd = new FormData();
        fd.append("file", uploadFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await readJsonResponse(res);
        if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
        if (data.url) urls.push(data.url);
      }
      setImages((p) => {
        const next = [...p, ...urls.map((u) => ({ url: u }))];
        setCarouselIdx(next.length - urls.length);
        return next;
      });
      markDirty();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron subir las imagenes");
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    uploadImages(Array.from(e.target.files || []));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    uploadImages(Array.from(e.dataTransfer.files || []));
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "No se pudo subir el video");
      if (data.url) {
        setReelUrls(p => [...p, data.url as string]);
        markDirty();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el video");
    } finally {
      setUploadingVideo(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    }
  }

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function moveImage(from: number, to: number) {
    setImages((p) => {
      const next = [...p];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setCarouselIdx(to);
  }

  function removeImage(idx: number) {
    setImages((p) => {
      const next = p.filter((_, i) => i !== idx);
      setCarouselIdx((c) => Math.min(c, Math.max(0, next.length - 1)));
      return next;
    });
  }

  function prevImg() {
    setCarouselIdx((c) => (c - 1 + images.length) % images.length);
  }

  function nextImg() {
    setCarouselIdx((c) => (c + 1) % images.length);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");

    const category = form.category === "otro" ? customCategory.trim() : form.category;
    const subcategory = form.subcategory === "otro" ? customSubcategory.trim() : form.subcategory;
    const isHideVariants = storeTypeConfig.hideVariants;
    const preparedVariants = isHideVariants
      ? [{ name: "Unidad", value: "Único", stock: "1", price: "", sku: "" }]
      : prepareVariantsForSubmit(variants);
    if (!category) {
      setError("Escribi la categoria personalizada.");
      setLoading(false);
      return;
    }
    if (!isHideVariants && preparedVariants.some((variant) => !variant.value)) {
      setError("Cada combinación de variantes debe tener al menos un valor. Si es un producto simple, dejá una sola fila.");
      setLoading(false);
      return;
    }

    const baseAttrs = attributes.filter((a) => a.key.trim() && a.value.trim());
    const finalAttrs = storeTypeConfig.supportsCondicion
      ? [{ key: "Condición", value: condicion }, ...baseAttrs]
      : baseAttrs;

    const res = await fetch(isEditing ? `/api/productos/${editingId}` : "/api/productos", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        category,
        subcategory,
        gender,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images: images.map((img) => img.variantValue ? img : img.url),
        reelUrls,
        variants: preparedVariants,
        attributes: finalAttrs,
        precioMayorista: precioMayorista || null,
        cantMinMayorista: cantMinMayorista || null,
        publishAt: publishAt || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al guardar");
      setLoading(false);
    } else {
      setIsDirty(false);
      router.push("/dashboard/productos");
    }
  }

  const btnRadius =
    store.buttonStyle === "square" ? "rounded-lg" :
    store.buttonStyle === "pill" ? "rounded-full" : "rounded-xl";

  const cardRadius = RADIUS_MAP[store.cardRadius] || "rounded-xl";
  const cardShadow = SHADOW_MAP[store.cardShadow] || "shadow-sm";
  const storeTypeConfig = getStoreType(store.tipoTienda || "ROPA");
  const variantOptions = getVariantOptions(store.tipoTienda || "ROPA");
  const variantDimensions = variantOptions.filter(o => o !== "Otro");
  const previewCategory = form.category === "otro" ? customCategory.trim() || "otro" : form.category;
  const previewSubcategory = form.subcategory === "otro" ? customSubcategory.trim() : form.subcategory;
  const availableSubcategories = form.category === "otro" ? [] : productSubcategories[form.category] || [];

  const discount =
    form.comparePrice && form.price && parseFloat(form.comparePrice) > parseFloat(form.price)
      ? Math.round((1 - parseFloat(form.price) / parseFloat(form.comparePrice)) * 100)
      : 0;

  const totalStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);

  const attrPreviewGroups: Record<string, string[]> = {};
  variants.forEach(v => {
    Object.entries(v.attrs).forEach(([key, val]) => {
      if (!val.trim()) return;
      if (!attrPreviewGroups[key]) attrPreviewGroups[key] = [];
      if (!attrPreviewGroups[key].includes(val)) attrPreviewGroups[key].push(val);
    });
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/productos" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? "Editar producto" : "Nuevo producto"}</h1>
            <p className="text-gray-500 mt-0.5">
              {isEditing ? "Actualiza los datos y guarda los cambios" : "Completa los datos y mira la vista previa en tiempo real"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5 pb-6">
            {loadingProduct && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando producto...
              </div>
            )}

            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Imagenes del producto</h2>
                <span className="text-xs text-gray-400">{images.length}/{MAX_PRODUCT_IMAGES}</span>
              </div>

              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
              >
                {uploadingImg ? (
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                )}
                <p className="text-sm text-gray-500">
                  {uploadingImg ? "Subiendo..." : "Hace clic o arrastra imagenes aqui"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Hasta {MAX_PRODUCT_IMAGES} fotos. JPG, PNG, WEBP - hasta {MAX_SOURCE_IMAGE_SIZE_MB} MB; se optimizan al subir
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Hint cuando no hay colores definidos */}
              {!storeTypeConfig.hideVariants && colorValues.length === 0 && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Si tu producto tiene <strong>diferentes colores</strong>, primero agregá las variantes de color en <strong>Variantes y stock</strong> (más abajo) — después podrás asignar cada foto a su color.</span>
                </div>
              )}

              {/* Thumbnails con asignación de color */}
              {images.length > 0 && (
                <div className="space-y-3">
                  {colorValues.length > 0 && (
                    <div className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5 text-xs text-indigo-700">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span><strong>Asigná un color a cada foto</strong> para que el cliente vea la imagen correcta al elegir el color del producto.</span>
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {images.map((img, i) => (
                      <div key={img.url + i} className="flex flex-col gap-1.5" style={{ width: colorValues.length > 0 ? 88 : 64 }}>
                        <div
                          draggable
                          onDragStart={() => setDragIdx(i)}
                          onDragOver={(e) => { e.preventDefault(); }}
                          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i); setDragIdx(null); }}
                          onDragEnd={() => setDragIdx(null)}
                          onClick={() => setCarouselIdx(i)}
                          className={`group relative rounded-xl cursor-grab active:cursor-grabbing border-2 transition-all flex-shrink-0 overflow-hidden ${
                            dragIdx === i ? "opacity-40 scale-95" : ""
                          } ${carouselIdx === i ? "border-indigo-500 scale-105" : "border-transparent hover:border-gray-300"}`}
                          style={{ width: colorValues.length > 0 ? 88 : 64, height: colorValues.length > 0 ? 88 : 64 }}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {img.variantValue && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-1">
                              <span className="text-[9px] text-white font-semibold px-1 truncate block">{img.variantValue}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {i === 0 && (
                            <div className="absolute top-1 left-1 bg-indigo-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">PORTADA</div>
                          )}
                        </div>
                        {colorValues.length > 0 && (
                          <div>
                            <select
                              value={img.variantValue || ""}
                              onChange={(e) => assignImageColor(i, e.target.value || undefined)}
                              onClick={(e) => e.stopPropagation()}
                              className={`w-full text-xs border rounded-lg bg-white py-1.5 px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                                img.variantValue
                                  ? "border-indigo-300 text-indigo-700 font-medium bg-indigo-50"
                                  : "border-gray-200 text-gray-400"
                              }`}
                            >
                              <option value="">Sin color</option>
                              {colorValues.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Reels / Videos</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Subí tu propio video (MP4, MOV) o pegá una URL de Instagram, TikTok o YouTube</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors disabled:opacity-50"
                  >
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                    {uploadingVideo ? "Subiendo..." : "Subir video"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => { setReelUrls(p => [...p, ""]); markDirty(); }}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar URL
                  </button>
                </div>
              </div>
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                className="hidden"
                onChange={handleVideoFileUpload}
              />
              {reelUrls.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">
                  Sin videos. Subí un MP4 propio o pegá un link de Instagram, TikTok o YouTube.
                </p>
              )}
              {reelUrls.map((url, i) => {
                const isDirect = isDirectVideoUrl(url);
                return isDirect ? (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-black">
                    <video src={url} controls className="w-full max-h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => { setReelUrls(p => p.filter((_, j) => j !== i)); markDirty(); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => { setReelUrls(p => p.map((u, j) => j === i ? e.target.value : u)); markDirty(); }}
                      placeholder="https://www.instagram.com/reel/... o tiktok.com/..."
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => { setReelUrls(p => p.filter((_, j) => j !== i)); markDirty(); }}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Informacion basica</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del producto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                  placeholder={storeLoaded ? storeTypeConfig.namePlaceholder : ""}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                  placeholder="Describi tu producto..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              {!storeTypeConfig.hideGender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Género</label>
                  <div className="flex gap-2">
                    {(["mujer", "hombre", "unisex"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          gender === g
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {g === "mujer" ? "Mujer" : g === "hombre" ? "Hombre" : "Unisex"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{formatCategoryLabel(c)}</option>
                    ))}
                    <option value="otro">Otra categoria</option>
                  </select>
                  {form.category === "otro" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Escribi la categoria"
                      className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subcategoria</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) => updateForm("subcategory", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Sin subcategoria</option>
                    {availableSubcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>{formatCategoryLabel(subcat)}</option>
                    ))}
                    <option value="otro">Otra subcategoria</option>
                  </select>
                  {form.subcategory === "otro" && (
                    <input
                      type="text"
                      value={customSubcategory}
                      onChange={(e) => setCustomSubcategory(e.target.value)}
                      placeholder="Ej: remeras, pantalones, camperas"
                      className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
                {!storeTypeConfig.hideTags && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tags (separados por coma)
                      <Tip text={tagsTip(store.tipoTienda || "ROPA")} />
                    </label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => updateForm("tags", e.target.value)}
                      placeholder={storeTypeConfig.tagsPlaceholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Condición — solo para tipos que lo soportan (AUTOS, TECH) */}
            {storeTypeConfig.supportsCondicion && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Condición</h2>
                <div className="flex gap-3">
                  {(["Nuevo", "Usado"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setCondicion(opt); markDirty(); }}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        condicion === opt
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt === "Nuevo" ? "✨ Nuevo" : "🔄 Usado"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Precio */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Precio</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => updateForm("price", e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Precio tachado (opcional)
                  <Tip text="Precio original antes del descuento. Se muestra tachado junto al precio de venta y el cliente ve el % de ahorro automáticamente." />
                </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.comparePrice}
                      onChange={(e) => updateForm("comparePrice", e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                  <Tag className="h-4 w-4" />
                  El cliente vera un descuento del <strong>{discount}%</strong>
                </div>
              )}
            </div>

            {/* Precio mayorista */}
            {store.tieneVentaMayorista && (
              <div className="bg-white rounded-2xl border border-indigo-100 p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Precio mayorista</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Solo visible para compradores que cumplan la cantidad mínima</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio por mayor *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                      <input
                        type="number"
                        value={precioMayorista}
                        onChange={(e) => { setPrecioMayorista(e.target.value); markDirty(); }}
                        min="0" step="0.01" placeholder="0"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad mínima</label>
                    <input
                      type="number"
                      value={cantMinMayorista}
                      onChange={(e) => { setCantMinMayorista(e.target.value); markDirty(); }}
                      min="1" placeholder="Ej: 10"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Variantes — ocultas para tiendas como AUTOS donde no aplica */}
            {!storeTypeConfig.hideVariants && <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">Variantes y stock</h2>
                    <Tip text={variantTip(store.tipoTienda || "ROPA")} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Una fila por combinación — ej: Talle S + Color Negro</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              {variants.map((variant, idx) => (
                <div key={idx} className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 rounded-xl">
                  {Object.keys(variant.attrs).map(dim => {
                    const isColor = dim === "Color" || dim === "Tono";
                    const val = variant.attrs[dim] || "";
                    const circle = isColor ? colorPreview(val) : null;
                    return (
                      <div key={dim} className="flex-1 min-w-[80px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {dim}
                          {isColor && (
                            <Tip text="Escribí el nombre del color (Rojo, Verde, Negro) o un código hex (#FF0000). Se muestra como círculo de color en tu tienda." />
                          )}
                        </label>
                        <div className="relative">
                          {circle && (
                            <span
                              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: circle }}
                            />
                          )}
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => updateVariantAttr(idx, dim, e.target.value)}
                            placeholder={variantPlaceholder(dim)}
                            list={dim === "Talle" ? `talle-list-${idx}` : undefined}
                            className={`w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${circle ? "pl-8 pr-3" : "px-3"}`}
                          />
                          {dim === "Talle" && (
                            <datalist id={`talle-list-${idx}`}>
                              {getTalleSuggestions(form.category, form.subcategory).map(s => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="w-20 shrink-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariantField(idx, "stock", e.target.value)}
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio extra</label>
                    <input
                      type="number"
                      value={variant.price}
                      onChange={(e) => updateVariantField(idx, "price", e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-end pb-1 shrink-0">
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Hint: tenés colores definidos pero hay fotos sin asignar */}
              {colorValues.length > 0 && images.length > 0 && images.some(img => !img.variantValue) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>Tenés colores definidos pero tus fotos no tienen color asignado. Scrolleá a <strong>Imágenes del producto</strong> (arriba) para asignar cada foto a su color — así el cliente ve la foto correcta al elegir un color.</span>
                </div>
              )}
            </div>}

            {/* Ficha técnica / Atributos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">
                      {storeTypeConfig.hideVariants ? "Ficha técnica" : storeTypeConfig.extraFields.length > 0 ? "Especificaciones" : "Atributos del producto"}
                    </h2>
                    <Tip text="Información extra sin stock. Ej: Material → Algodón, Género → Unisex, Peso → 250g. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio." />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {storeTypeConfig.extraFields.length > 0
                      ? storeTypeConfig.extraFields.map((f) => f.label).join(", ")
                      : "Número de serie, peso, material, dimensiones, etc."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAttribute}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              {/* Campos tipados del store type (Marca, Año, Km, etc.) */}
              {storeTypeConfig.extraFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {storeTypeConfig.extraFields.map((field) => {
                    const attrIdx = attributes.findIndex((a) => a.key === field.label);
                    const val = attrIdx >= 0 ? attributes[attrIdx].value : "";
                    const onChange = (v: string) => {
                      if (attrIdx >= 0) {
                        updateAttribute(attrIdx, "value", v);
                      } else {
                        setAttributes((p) => [...p, { key: field.label, value: v }]);
                        markDirty();
                      }
                    };
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                        {field.options ? (
                          <select
                            value={val}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">Seleccioná...</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={val}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder || ""}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Atributos personalizados (Agregar) */}
              {storeTypeConfig.extraFields.length === 0 && attributes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin atributos. Usá esto para especificar datos técnicos del producto.
                </p>
              )}

              {attributes
                .map((attr, idx) => ({ attr, idx }))
                .filter(({ attr }) => !storeTypeConfig.extraFields.some((f) => f.label === attr.key))
                .map(({ attr, idx }) => (
                  <div key={idx} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del atributo</label>
                      <input
                        type="text"
                        value={attr.key}
                        onChange={(e) => updateAttribute(idx, "key", e.target.value)}
                        placeholder="Ej: Número de serie, Peso, Material"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                        placeholder="Ej: ABC-123, 2.5 kg, Algodón"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttribute(idx)}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors mb-0.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>

            {/* Programar publicación */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Programar publicación</h2>
              </div>
              <p className="text-xs text-gray-400">
                Si elegís una fecha futura, el producto se guardará oculto y se publicará automáticamente en esa fecha y hora.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={publishAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => { setPublishAt(e.target.value); markDirty(); }}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {publishAt && (
                  <button
                    type="button"
                    onClick={() => { setPublishAt(""); markDirty(); }}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Quitar fecha programada"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {publishAt && new Date(publishAt) > new Date() && (
                <p className="text-xs text-indigo-600 font-medium">
                  Este producto se publicará el {new Date(publishAt).toLocaleString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-2">
              <Link
                href="/dashboard/productos"
                className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar producto"}
              </button>
            </div>
          </form>

          {/* Preview */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Vista previa</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Tu tienda</span>
              </div>

              {/* Product Card Preview */}
              <div
                className={`bg-white overflow-hidden ${cardRadius} ${cardShadow} border border-gray-100`}
                style={{ fontFamily: store.fontFamily }}
              >
                {/* Image carousel */}
                <div className="relative bg-gray-100 aspect-square overflow-hidden">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[carouselIdx]?.url || ""}
                        alt=""
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={prevImg}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-all"
                          >
                            <ChevronLeft className="h-4 w-4 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            onClick={nextImg}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-all"
                          >
                            <ChevronRight className="h-4 w-4 text-gray-700" />
                          </button>
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setCarouselIdx(i)}
                                aria-label={`Ver imagen ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === carouselIdx ? "w-5 bg-white" : "w-1.5 bg-white/60"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <Package className="h-12 w-12 mb-2" />
                      <p className="text-xs">Sin imagen</p>
                    </div>
                  )}

                  {/* Discount badge */}
                  {discount > 0 && (
                    <div
                      className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: store.accentColor }}
                    >
                      -{discount}%
                    </div>
                  )}

                  {/* Wishlist */}
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:scale-110 transition-all"
                  >
                    <Heart className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  {images.length > 1 && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {images.map((img, i) => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => setCarouselIdx(i)}
                          className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                            i === carouselIdx ? "border-indigo-500" : "border-gray-100 opacity-70 hover:opacity-100"
                          }`}
                          aria-label={`Seleccionar imagen ${i + 1}`}
                        >
                          <img src={img.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category */}
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: store.primaryColor }}>
                    {previewSubcategory ? `${previewCategory} / ${previewSubcategory}` : previewCategory}
                  </p>

                  {/* Name */}
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                    {form.name || "Nombre del producto"}
                  </h3>

                  {/* Ratings */}
                  {store.showRatings && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">(12)</span>
                    </div>
                  )}

                  {/* Price */}
                  {store.showPrices && (
                    <div className="flex items-baseline gap-2">
                      {form.price ? (
                        <>
                          <span className="text-lg font-bold" style={{ color: store.primaryColor }}>
                            {store.currency} {parseFloat(form.price).toLocaleString("es-AR")}
                          </span>
                          {form.comparePrice && parseFloat(form.comparePrice) > parseFloat(form.price) && (
                            <span className="text-sm text-gray-400 line-through">
                              {store.currency} {parseFloat(form.comparePrice).toLocaleString("es-AR")}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-300">$ -</span>
                      )}
                    </div>
                  )}

                  {/* Condición badge — solo para tipos que lo soportan */}
                  {storeTypeConfig.supportsCondicion && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                      condicion === "Nuevo"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {condicion === "Nuevo" ? "✨ Nuevo" : "🔄 Usado"}
                    </span>
                  )}

                  {/* Attributes preview — para hideVariants (AUTOS), mostrar fichas */}
                  {storeTypeConfig.hideVariants && attributes.filter((a) => a.key && a.value).length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {attributes.filter((a) => a.key && a.value).slice(0, 6).map((a, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <p className="text-xs text-gray-400">{a.key}</p>
                          <p className="text-xs font-semibold text-gray-700">{a.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Variants preview — colores como círculos, talles como chips */}
                  {!storeTypeConfig.hideVariants && Object.keys(attrPreviewGroups).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(attrPreviewGroups).map(([groupName, values]) => {
                        const isColor = groupName === "Color" || groupName === "Tono";
                        return (
                          <div key={groupName} className="flex flex-wrap gap-1 items-center">
                            {isColor ? (
                              values.slice(0, 8).map((val, i) => {
                                const bg = colorPreview(val);
                                return bg ? (
                                  <span key={i} title={val}
                                    className="h-5 w-5 rounded-full border-2 border-gray-200"
                                    style={{ backgroundColor: bg }} />
                                ) : (
                                  <span key={i} className="text-xs border px-2 py-0.5 rounded-md"
                                    style={{ borderColor: store.primaryColor + "40", color: store.primaryColor }}>
                                    {val}
                                  </span>
                                );
                              })
                            ) : (
                              values.slice(0, 4).map((val, i) => (
                                <span key={i} className="text-xs border px-2 py-0.5 rounded-md"
                                  style={{ borderColor: store.primaryColor + "40", color: store.primaryColor }}>
                                  {val}
                                </span>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Stock indicator — solo cuando no es hideVariants */}
                  {!storeTypeConfig.hideVariants && totalStock > 0 && totalStock <= 5 && (
                    <p className="text-xs text-orange-500 font-medium">Ultimas {totalStock} unidades!</p>
                  )}

                  {/* CTA */}
                  <button
                    type="button"
                    className={`w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${btnRadius}`}
                    style={{ backgroundColor: store.primaryColor, color: "#fff" }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </button>
                </div>
              </div>

              {/* Tags preview */}
              {form.tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Info footer */}
              <div className="mt-4 bg-indigo-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-700">Resumen del producto</p>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>Imagenes</span>
                  <span>{images.length} subidas</span>
                </div>
                {storeTypeConfig.hideVariants ? (
                  <div className="flex justify-between text-xs text-indigo-600">
                    <span>Atributos</span>
                    <span>{attributes.filter((a) => a.key && a.value).length} cargados</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-indigo-600">
                      <span>Variantes</span>
                      <span>{variants.filter((v) => Object.values(v.attrs).some(Boolean)).length} cargadas</span>
                    </div>
                    <div className="flex justify-between text-xs text-indigo-600">
                      <span>Stock total</span>
                      <span>{totalStock} unidades</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <UnsavedChangesGuard isDirty={isDirty} />
    </DashboardLayout>
  );
}

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="p-6 text-sm text-gray-500">Cargando...</div></DashboardLayout>}>
      <ProductoFormPage />
    </Suspense>
  );
}
