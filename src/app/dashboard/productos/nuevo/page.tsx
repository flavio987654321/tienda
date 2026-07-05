"use client";

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import {
  Plus, Trash2, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, X, Star, ShoppingCart, Heart, Tag, Package, HelpCircle, Calendar, Film,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getStoreType } from "@/lib/storeTypes";
import StockHistoryPanel from "../StockHistoryPanel";
import RichTextEditor from "@/components/RichTextEditor";
import { VariantBuilder } from "@/components/dashboard/VariantBuilder";

type ImageItem = { url: string; variantValue?: string };

const AUTO_SERVICES = [
  { key: "aceite",      label: "Aceite y filtros" },
  { key: "frenos",      label: "Frenos" },
  { key: "distribucion",label: "Distribución" },
  { key: "cubiertas",   label: "Cubiertas" },
  { key: "suspension",  label: "Suspensión" },
  { key: "electrico",   label: "Sist. eléctrico" },
  { key: "ac",          label: "Aire acondicionado" },
  { key: "caja",        label: "Caja de cambios" },
];

function getVariantOptions(storeType: string): string[] {
  const map: Record<string, string[]> = {
    ROPA:      ["Talle", "Color"],
    AUTOS:     ["Color", "Versión"],
    HOGAR_TECH: ["Color", "Tamaño"],
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
  lowStockThreshold: string;
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
  return { attrs, stock: "0", price: "", sku: "", lowStockThreshold: "" };
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

function Tip({ text, align = "center" }: { text: string; align?: "center" | "right" | "left" }) {
  return (
    <span className="relative inline-flex group/tip ml-1 cursor-help align-middle">
      <HelpCircle className="h-3.5 w-3.5 text-indigo-400 hover:text-indigo-600 transition-colors" />
      <span
        className={`pointer-events-none absolute bottom-full mb-2 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 leading-relaxed shadow-lg ${
          align === "right" ? "right-0" : align === "left" ? "left-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {text}
        <span
          className={`absolute top-full border-4 border-transparent border-t-gray-900 ${
            align === "right" ? "right-3" : align === "left" ? "left-3" : "left-1/2 -translate-x-1/2"
          }`}
        />
      </span>
    </span>
  );
}

function variantExample(tipoTienda: string): string {
  const examples: Record<string, string> = {
    ROPA:      "ej: Talle S + Color Negro",
    AUTOS:     "ej: Color Blanco + Versión Full",
    HOGAR_TECH: "ej: Color Blanco + Tamaño Grande",
    BELLEZA:   "ej: Tono Claro + Tamaño Grande",
    DEPORTE:   "ej: Talle S + Color Rojo",
    ALIMENTOS: "ej: 500g + Vainilla",
    MASCOTAS:  "ej: Tamaño Pequeño + Sabor Pollo",
    LIBROS:    "ej: Formato Físico",
    GENERAL:   "ej: Color Rojo + Tamaño Grande",
  };
  return examples[tipoTienda] || "ej: Variante 1 + Variante 2";
}

function variantTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "Una fila por combinación. Ej: Talle S + Color Negro → fila 1, Talle M + Color Blanco → fila 2. Cada fila tiene su propio stock.",
    BELLEZA:   "Una fila por combinación. Ej: Tono Claro + Tamaño Grande → fila 1, Tono Oscuro + Tamaño Chico → fila 2.",
    HOGAR_TECH: "Una fila por combinación. Ej: Color Blanco + Tamaño Grande → fila 1, Color Negro + Tamaño Chico → fila 2. Si el producto varía por capacidad/almacenamiento, usá esos valores en vez de Color/Tamaño. Cada fila tiene su propio stock.",
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
    BELLEZA:   "Palabras clave para búsqueda. Ej: vegano, sin parabenos, hidratante.",
    HOGAR_TECH: "Palabras clave para búsqueda. Ej: liberado, sin cargador, inverter, escandinavo.",
    ALIMENTOS: "Palabras clave para búsqueda. Ej: sin tacc, vegano, artesanal.",
    DEPORTE:   "Palabras clave para búsqueda. Ej: running, gym, impermeable.",
    MASCOTAS:  "Palabras clave para búsqueda. Ej: perro, gato, natural, sin conservantes.",
    LIBROS:    "Palabras clave para búsqueda. Ej: ficción, bestseller, regalo, tapa dura.",
    GENERAL:   "Palabras clave para búsqueda separadas por coma. Ayudan a tus clientes a encontrar el producto.",
  };
  return tips[tipoTienda] || "Palabras clave separadas por coma para que tus clientes encuentren el producto.";
}

function extraFieldsTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "Información extra sin stock. Ej: Material → Algodón, Género → Unisex. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.",
    AUTOS:     "Información extra sin stock. Ej: Marca → Toyota, Año → 2022, Combustible → Nafta. Son datos descriptivos del vehículo, no afectan precio ni stock.",
    HOGAR_TECH: "Información extra sin stock. Ej: Marca → Samsung, Pulgadas → 55, RAM → 8GB. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.",
    BELLEZA:   "Información extra sin stock. Ej: Marca → L'Oréal, Tipo de piel → Mixta. Son datos descriptivos, no afectan precio ni stock.",
    DEPORTE:   "Información extra sin stock. Ej: Deporte → Running, Material → Mesh transpirable.",
    ALIMENTOS: "Información extra sin stock. Ej: Ingredientes → Harina, azúcar, manteca.",
    MASCOTAS:  "Información extra sin stock. Ej: Para mascota → Perro, Edad recomendada → Adulto.",
    LIBROS:    "Información extra sin stock. Ej: Autor → Gabriel García Márquez, Editorial → Sudamericana.",
    GENERAL:   "Información extra sin stock. Datos descriptivos que no afectan precio ni stock.",
  };
  return tips[tipoTienda] || "Información extra sin stock. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.";
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
  return ["Único", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
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

function getBuilderConfig(tipoTienda: string): { sizeDim: string; sizeLabel: string; sizePlaceholder: string; sizeHint: string } {
  const map: Record<string, { sizeDim: string; sizeLabel: string; sizePlaceholder: string; sizeHint: string }> = {
    HOGAR_TECH: {
      sizeDim: "Tamaño",
      sizeLabel: "Tamaños / Capacidades",
      sizePlaceholder: 'ej: 32", 128GB, 8kg',
      sizeHint: "Ingresá el tamaño, capacidad o almacenamiento. Escribilo y apretá Enter.",
    },
  };
  return map[tipoTienda] ?? {
    sizeDim: "Talle",
    sizeLabel: "Talles",
    sizePlaceholder: "ej: 44, 3XL",
    sizeHint: "Si no encontrás el talle podés crearlo. Escribilo y apretá Enter.",
  };
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
        lowStockThreshold: v.lowStockThreshold.trim(),
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
  const [featured, setFeatured] = useState(false);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<Record<string, string[]>>({});
  const [gender, setGender] = useState<"mujer" | "hombre" | "unisex">("unisex");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [variants, setVariants] = useState<Variant[]>([{ attrs: { Talle: "" }, stock: "0", price: "", sku: "", lowStockThreshold: "" }]);
  // Builder de variantes (ROPA / HOGAR_TECH)
  const [builderColors, setBuilderColors] = useState<string[]>([]);
  const [builderSizes, setBuilderSizes] = useState<string[]>([]);
  const [useBuilder, setUseBuilder] = useState(false);
  const variantStockRef = useRef<Map<string, { stock: string; price: string; sku: string; threshold: string }>>(new Map());
  const skipBuilderEffect = useRef(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [condicion, setCondicion] = useState<string>("Usado");
  const [precioMayorista, setPrecioMayorista] = useState("");
  const [cantMinMayorista, setCantMinMayorista] = useState("");
  // Escalones: array de {desde, precio} como strings para los inputs controlados
  const [escalones, setEscalones] = useState<Array<{ desde: string; precio: string }>>([]);
  const [soloMayorista, setSoloMayorista] = useState(false);
  const [promoQtyMin, setPromoQtyMin] = useState("");
  const [promoQtyDiscount, setPromoQtyDiscount] = useState("");
  const [promoType, setPromoType] = useState<"PERCENT" | "N_PAY_M">("PERCENT");
  const [promoPayQty, setPromoPayQty] = useState("");
  const [cuotas, setCuotas] = useState(0);
  const [weightKg, setWeightKg] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [publishAt, setPublishAt] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [reelUrls, setReelUrls] = useState<string[]>([]);
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);
  // Guarda category/subcategory crudos del producto cargado, para poder re-clasificar
  // la subcategoría si productSubcategories termina de llenarse después de este fetch
  const loadedProductRef = useRef<{ category: string; subcategory: string } | null>(null);

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
        const supportsBuilder = ["ROPA", "HOGAR_TECH"].includes(d.store.tipoTienda || "");
        if (supportsBuilder) setUseBuilder(true);
        if (!editingId) {
          setForm((p) => ({ ...p, category: typeConfig.categorias[0] || "general" }));
          if (typeConfig.extraFields.length > 0) {
            setAttributes(typeConfig.extraFields.map((f) => ({ key: f.label, value: "" })));
          }
          if (typeConfig.condicionOptions?.length) {
            setCondicion(typeConfig.condicionOptions[0]);
          }
          if (!supportsBuilder) {
            const dims = getVariantOptions(d.store.tipoTienda || "ROPA").filter(o => o !== "Otro");
            setVariants([makeDefaultVariant(dims)]);
          }
        }
      })
      .catch(() => {});

    fetch("/api/productos")
      .then((r) => r.json())
      .then((d) => {
        type RawCategoryProduct = { category?: string; subcategory?: string };
        const extraCats = (d.products || []).map((p: RawCategoryProduct) => p.category).filter(Boolean) as string[];
        setProductCategories((prev) => Array.from(new Set([...prev, ...extraCats])));
        const grouped = (d.products || []).reduce((acc: Record<string, string[]>, product: RawCategoryProduct) => {
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
    loadedProductRef.current = null;
    if (!editingId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- arranca el loader antes del fetch que dispara este mismo efecto, no se puede calcular durante el render
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
        loadedProductRef.current = { category: product.category || "", subcategory: product.subcategory || "" };
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
        setFeatured(Boolean(product.featured));
        setCustomCategory(knownCategory ? "" : product.category || "");
        setCustomSubcategory(product.subcategory && !((productSubcategories[product.category] || []).includes(product.subcategory)) ? product.subcategory : "");
        setImages(
          safeJsonArray(product.images)
            .map((item: string | { url?: string; variantValue?: string }) =>
              typeof item === "string" ? { url: item } : { url: item?.url || "", variantValue: item?.variantValue }
            )
            .filter((img: ImageItem) => img.url)
        );
        setReelUrls(safeJsonArray(product.reelUrls || "[]").filter((url) => typeof url === "string") as string[]);
        setCarouselIdx(0);
        type RawVariant = { name: string; value: string; stock?: number; price?: number; sku?: string; lowStockThreshold?: number };
        const loadedVariants: Variant[] = product.variants?.length
          ? product.variants.map((v: RawVariant) => {
              let attrs: Record<string, string> = {};
              if (typeof v.name === "string" && v.name.startsWith("{")) {
                try { attrs = JSON.parse(v.name); } catch {}
              }
              if (Object.keys(attrs).length === 0) {
                attrs = { [v.name || "Variante"]: v.value || (product.variants.length === 1 ? SINGLE_VARIANT_FALLBACK_VALUE : "") };
              }
              return {
                attrs,
                stock: v.stock?.toString() || "0",
                price: v.price?.toString() || "",
                sku: v.sku || "",
                lowStockThreshold: v.lowStockThreshold?.toString() || "",
              };
            })
          : [makeDefaultVariant(getVariantOptions(store.tipoTienda || "ROPA").filter(o => o !== "Outro"))];
        setVariants(loadedVariants);

        // Si la tienda usa builder, detectar colores y segunda dimensión de las variantes existentes
        if (["ROPA", "HOGAR_TECH"].includes(store.tipoTienda || "")) {
          const { sizeDim } = getBuilderConfig(store.tipoTienda || "ROPA");
          const stockMap = new Map<string, { stock: string; price: string; sku: string; threshold: string }>();
          const uniqueColors: string[] = [];
          const uniqueSizes: string[] = [];
          for (const v of loadedVariants) {
            const c = v.attrs["Color"] || "";
            const s = v.attrs[sizeDim] || "";
            const key = `${c}|||${s}`;
            stockMap.set(key, { stock: v.stock, price: v.price, sku: v.sku, threshold: v.lowStockThreshold });
            if (c && !uniqueColors.includes(c)) uniqueColors.push(c);
            if (s && !uniqueSizes.includes(s)) uniqueSizes.push(s);
          }
          variantStockRef.current = stockMap;
          // Saltar el effect de regeneración — las variants ya están cargadas correctamente
          skipBuilderEffect.current = true;
          setBuilderColors(uniqueColors);
          setBuilderSizes(uniqueSizes);
        }
        const allAttrs = safeJsonArray(product.attributes).filter(
          (a: unknown): a is Attribute =>
            !!a && typeof a === "object" && typeof (a as Attribute).key === "string" && typeof (a as Attribute).value === "string"
        );
        const condAttr = allAttrs.find((a) => a.key === "Condición");
        if (condAttr) setCondicion(condAttr.value);
        const svcAttr = allAttrs.find((a) => a.key === "Servicios");
        if (svcAttr) { try { setServices(JSON.parse(svcAttr.value)); } catch {} }
        setAttributes(allAttrs.filter((a) => a.key !== "Condición" && a.key !== "Servicios"));
        setPrecioMayorista(product.precioMayorista?.toString() || "");
        setCantMinMayorista(product.cantMinMayorista?.toString() || "");
        try {
          const rawEsc = product.preciosEscalonados;
          const parsed = typeof rawEsc === "string" ? JSON.parse(rawEsc) : (rawEsc ?? []);
          if (Array.isArray(parsed)) {
            setEscalones(parsed.map((e: { desde: number; precio: number }) => ({ desde: String(e.desde), precio: String(e.precio) })));
          }
        } catch { /* si falla el parse dejamos el estado vacío inicial */ }
        setSoloMayorista(product.soloMayorista === true);
        setPromoQtyMin(product.promoQtyMin?.toString() || "");
        setPromoQtyDiscount(product.promoQtyDiscount?.toString() || "");
        setPromoType((product.promoType as "PERCENT" | "N_PAY_M") || "PERCENT");
        setPromoPayQty(product.promoPayQty?.toString() || "");
        setCuotas(product.cuotas || 0);
        setWeightKg(product.weightKg?.toString() || "");
        setWidthCm(product.widthCm?.toString() || "");
        setHeightCm(product.heightCm?.toString() || "");
        setDepthCm(product.depthCm?.toString() || "");
        if (product.publishAt) {
          const d = new Date(product.publishAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          setPublishAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el producto"))
      .finally(() => { setLoadingProduct(false); loadedRef.current = true; });
    // productSubcategories/store.tipoTienda se leen al vuelo; incluirlas reharía el fetch del producto
    // en cada actualización. La reclasificación de subcategoría por carrera con esos datos la cubre
    // el efecto de abajo, que sí depende de productSubcategories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, productCategories]);

  // Re-clasifica la subcategoría si productSubcategories termina de llenarse después
  // de que el producto ya cargó (evita que quede mal clasificada como "otro" por una carrera
  // entre este fetch y el de /api/configuracion + /api/productos)
  useEffect(() => {
    if (isDirty) return;
    const loaded = loadedProductRef.current;
    if (!loaded || !loaded.subcategory) return;
    const known = (productSubcategories[loaded.category] || []).includes(loaded.subcategory);
    setForm((p) => (p.subcategory === (known ? loaded.subcategory : "otro") ? p : { ...p, subcategory: known ? loaded.subcategory : "otro" }));
    setCustomSubcategory(known ? "" : loaded.subcategory);
  }, [productSubcategories, isDirty]);

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

  function updateVariantField(idx: number, field: "stock" | "price" | "sku" | "lowStockThreshold", value: string) {
    setVariants((p) => {
      const updated = p.map((v, i) => (i === idx ? { ...v, [field]: value } : v));
      // Persiste en el ref para que el builder no pierda stock al agregar/quitar colores
      if (useBuilder) {
        const sd = builderCfg.sizeDim;
        updated.forEach(v => {
          const key = `${v.attrs["Color"] || ""}|||${v.attrs[sd] || ""}`;
          variantStockRef.current.set(key, { stock: v.stock, price: v.price, sku: v.sku, threshold: v.lowStockThreshold });
        });
      }
      return updated;
    });
    markDirty();
  }

  // Auto-generación de variantes cuando el builder cambia colores o talles
  useEffect(() => {
    if (!useBuilder) return;
    if (skipBuilderEffect.current) { skipBuilderEffect.current = false; return; }
    if (builderColors.length === 0 && builderSizes.length === 0) { setVariants([]); return; }

    const get = (key: string) => variantStockRef.current.get(key);
    const newVariants: Variant[] = [];

    const sd = builderCfg.sizeDim;
    if (builderColors.length > 0 && builderSizes.length > 0) {
      for (const color of builderColors) {
        for (const size of builderSizes) {
          const key = `${color}|||${size}`;
          const prev = get(key);
          newVariants.push({ attrs: { Color: color, [sd]: size }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
        }
      }
    } else if (builderColors.length > 0) {
      for (const color of builderColors) {
        const key = `${color}|||`;
        const prev = get(key);
        newVariants.push({ attrs: { Color: color }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
      }
    } else {
      for (const size of builderSizes) {
        const key = `|||${size}`;
        const prev = get(key);
        newVariants.push({ attrs: { [sd]: size }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
      }
    }
    setVariants(newVariants);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderColors, builderSizes, useBuilder]);

  // Asignar foto a un color (desde el builder)
  const assignPhotoToColor = useCallback((colorValue: string, imageUrl: string | undefined) => {
    setImages(prev => prev.map(img => {
      if (img.variantValue === colorValue) return { ...img, variantValue: undefined };
      if (imageUrl && img.url === imageUrl) return { ...img, variantValue: colorValue };
      return img;
    }));
    markDirty();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (images.length === 0) {
      setError("Agregá al menos una foto del producto.");
      setLoading(false);
      return;
    }
    if (!isHideVariants && preparedVariants.some((variant) => !variant.value)) {
      setError("Cada combinación de variantes debe tener al menos un valor. Si es un producto simple, dejá una sola fila.");
      setLoading(false);
      return;
    }

    const baseAttrs = attributes.filter((a) => a.key.trim() && a.value.trim());
    const svcList = storeTypeConfig.hideVariants && Object.keys(services).length > 0
      ? [{ key: "Servicios", value: JSON.stringify(services) }]
      : [];
    const finalAttrs = storeTypeConfig.supportsCondicion
      ? [{ key: "Condición", value: condicion }, ...baseAttrs, ...svcList]
      : [...baseAttrs, ...svcList];

    const res = await fetch(isEditing ? `/api/productos/${editingId}` : "/api/productos", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        category,
        subcategory,
        gender,
        featured: storeTypeConfig.supportsFeatured ? featured : false,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images: images.map((img) => img.variantValue ? img : img.url),
        reelUrls,
        variants: preparedVariants,
        attributes: finalAttrs,
        precioMayorista: precioMayorista || null,
        cantMinMayorista: cantMinMayorista || null,
        preciosEscalonados: escalones
          .filter((e) => e.desde.trim() !== "" && e.precio.trim() !== "")
          .map((e) => ({ desde: parseInt(e.desde), precio: parseFloat(e.precio) })),
        soloMayorista,
        promoQtyMin: promoQtyMin || null,
        promoQtyDiscount: promoType === "PERCENT" ? (promoQtyDiscount || null) : null,
        promoType,
        promoPayQty: promoType === "N_PAY_M" ? (promoPayQty || null) : null,
        cuotas,
        publishAt: publishAt || null,
        weightKg: weightKg || null,
        widthCm: widthCm || null,
        heightCm: heightCm || null,
        depthCm: depthCm || null,
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
  const builderCfg = getBuilderConfig(store.tipoTienda || "ROPA");
  const previewCategory = form.category === "otro" ? customCategory.trim() || "otro" : form.category;
  const previewSubcategory = form.subcategory === "otro" ? customSubcategory.trim() : form.subcategory;
  const availableSubcategories = form.category === "otro" ? [] : productSubcategories[form.category] || [];
  // Specs propias de la subcategoría elegida (ej: Pulgadas para TVs, RAM para notebooks),
  // sumadas a las genéricas del tipo de tienda (Marca, Modelo, Garantía).
  const activeExtraFields = [
    ...storeTypeConfig.extraFields,
    ...(storeTypeConfig.extraFieldsByCategory?.[previewSubcategory] ?? []),
  ];

  // Al elegir una subcategoría con specs propias (ej: "tvs" → Pulgadas), agregamos
  // esos campos vacíos a la ficha técnica para que el vendedor los vea y los complete.
  // No borra nada de lo que ya haya escrito si cambia de subcategoría y vuelve.
  useEffect(() => {
    const suggested = storeTypeConfig.extraFieldsByCategory?.[previewSubcategory];
    if (!suggested || suggested.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- agrega los campos sugeridos de la subcategoría recién elegida, no se puede calcular durante el render porque depende de una interacción del usuario
    setAttributes((prev) => {
      const missing = suggested.filter((f) => !prev.some((a) => a.key === f.label));
      if (missing.length === 0) return prev;
      return [...prev, ...missing.map((f) => ({ key: f.label, value: "" }))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSubcategory]);

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

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 lg:overflow-y-auto lg:pr-1 space-y-5 pb-6">
            {loadingProduct && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando producto...
              </div>
            )}

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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => { updateForm("description", html); markDirty(); }}
                  placeholder="Describí tu producto..."
                  maxLength={8000}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Tip align="left" text={tagsTip(store.tipoTienda || "ROPA")} />
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
                <h2 className="font-semibold text-gray-900 mb-3">{storeTypeConfig.showServiceHistory ? "Condición del vehículo" : "Condición del producto"}</h2>
                <div className="flex flex-wrap gap-2">
                  {(storeTypeConfig.condicionOptions ?? ["Nuevo", "Usado"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setCondicion(opt); markDirty(); }}
                      className={`flex-1 min-w-[100px] py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all text-center ${
                        condicion === opt
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Imagenes del producto *</h2>
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
                          <Image src={img.url} alt="" fill className="object-cover" />
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
              <div className="flex flex-wrap gap-3">
              {reelUrls.map((url, i) => {
                const isDirect = isDirectVideoUrl(url);
                return isDirect ? (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-black flex-shrink-0" style={{ width: 140, aspectRatio: "9/16" }}>
                    <video src={url} controls className="w-full h-full object-contain" />
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
            </div>

            {/* Historial de servicios — solo AUTOS */}
            {storeTypeConfig.showServiceHistory && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Historial de servicios</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Marcá los servicios que están al día. Se muestran con un tilde verde en la página del vehículo.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {AUTO_SERVICES.map(svc => (
                    <button
                      key={svc.key}
                      type="button"
                      onClick={() => { setServices(p => ({ ...p, [svc.key]: !p[svc.key] })); markDirty(); }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                        services[svc.key]
                          ? "border-green-400 bg-green-50"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        services[svc.key] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                      }`}>
                        {services[svc.key] ? "✓" : "✕"}
                      </span>
                      <span className={`text-xs font-medium ${services[svc.key] ? "text-green-700" : "text-gray-400"}`}>
                        {svc.label}
                      </span>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <span>Precio tachado (opcional)</span>
                    <Tip text="Precio original antes del descuento. Se muestra tachado junto al precio de venta y el cliente ve el % de ahorro automáticamente." />
                    {discount > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        -{discount}% OFF
                      </span>
                    )}
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
                      className={`w-full border rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        form.comparePrice && parseFloat(form.comparePrice) > 0 && parseFloat(form.comparePrice) <= parseFloat(form.price || "0")
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                  {form.comparePrice && parseFloat(form.comparePrice) > 0 && parseFloat(form.comparePrice) <= parseFloat(form.price || "0") && (
                    <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      El precio tachado debe ser mayor al precio de venta para mostrar descuento.
                    </p>
                  )}
                </div>
              </div>
              {discount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                  <Tag className="h-4 w-4" />
                  El cliente vera un descuento del <strong>{discount}%</strong> y el producto va a aparecer automáticamente en los bloques de <strong>&quot;Ofertas destacadas&quot;</strong> de tu tienda.
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Tip: completá el <strong>precio tachado</strong> con un valor mayor al precio de venta para que este producto aparezca solo, sin tocar nada más, en los bloques de &quot;Ofertas destacadas&quot; de tu tienda.
                </p>
              )}
              {storeTypeConfig.supportsFeatured && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all"
                  style={{ borderColor: featured ? "#6366f1" : "#f3f4f6", background: featured ? "#eef2ff" : "#fafafa" }}>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => { setFeatured(e.target.checked); markDirty(); }}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">Destacar en &quot;Lo más buscado&quot;</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      Mostrá este producto en el bloque &quot;Lo más buscado&quot; de tu tienda. Si no destacás ningún producto, ese bloque muestra los más recientes.
                    </span>
                  </span>
                </label>
              )}
            </div>

            {/* Precio mayorista — solo rubros que soportan mayorista Y tienda configurada como tal */}
            {store.tieneVentaMayorista && storeTypeConfig.supportsWholesale && (
              <div className="bg-white rounded-2xl border border-indigo-100 p-6 space-y-5">
                {/* Cabecera */}
                <div>
                  <h2 className="font-semibold text-gray-900">Venta mayorista</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Los precios mayoristas aplican automáticamente cuando el comprador alcanza la cantidad mínima</p>
                </div>

                {/* Precio base + cantidad mínima */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="precioMayorista" className="block text-sm font-medium text-gray-700 mb-1.5">Precio por mayor base *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                      <input
                        id="precioMayorista"
                        type="number"
                        value={precioMayorista}
                        onChange={(e) => { setPrecioMayorista(e.target.value); markDirty(); }}
                        min="0" step="0.01" placeholder="0"
                        aria-label="Precio mayorista base"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cantMinMayorista" className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad mínima *</label>
                    <input
                      id="cantMinMayorista"
                      type="number"
                      value={cantMinMayorista}
                      onChange={(e) => { setCantMinMayorista(e.target.value); markDirty(); }}
                      min="1" step="1" placeholder="Ej: 6"
                      aria-label="Cantidad mínima para precio mayorista"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Escalones de precio — solo aparecen si ya hay un precio base cargado */}
                {precioMayorista && cantMinMayorista && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Escalones de precio</p>
                        <p className="text-xs text-gray-400">Precio menor para quien compra más. Máximo 3 escalones.</p>
                      </div>
                      {escalones.length < 3 && (
                        <button
                          type="button"
                          onClick={() => { setEscalones([...escalones, { desde: "", precio: "" }]); markDirty(); }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
                          aria-label="Agregar escalón de precio mayorista"
                        >
                          + Agregar escalón
                        </button>
                      )}
                    </div>
                    {escalones.length > 0 && (
                      <div className="space-y-2">
                        {escalones.map((esc, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
                            <div className="flex-1">
                              <label htmlFor={`esc-desde-${idx}`} className="block text-xs text-gray-500 mb-1">Desde (unidades)</label>
                              <input
                                id={`esc-desde-${idx}`}
                                type="number"
                                value={esc.desde}
                                min={parseInt(cantMinMayorista) + 1 || 2}
                                step="1"
                                placeholder={`> ${cantMinMayorista}`}
                                aria-label={`Escalón ${idx + 1}: cantidad mínima`}
                                onChange={(e) => {
                                  const next = [...escalones];
                                  next[idx] = { ...next[idx], desde: e.target.value };
                                  setEscalones(next); markDirty();
                                }}
                                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex-1">
                              <label htmlFor={`esc-precio-${idx}`} className="block text-xs text-gray-500 mb-1">Precio por unidad</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                  id={`esc-precio-${idx}`}
                                  type="number"
                                  value={esc.precio}
                                  min="0" step="0.01"
                                  placeholder={`< $${precioMayorista}`}
                                  aria-label={`Escalón ${idx + 1}: precio por unidad`}
                                  onChange={(e) => {
                                    const next = [...escalones];
                                    next[idx] = { ...next[idx], precio: e.target.value };
                                    setEscalones(next); markDirty();
                                  }}
                                  className="w-full border border-indigo-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              aria-label={`Eliminar escalón ${idx + 1}`}
                              onClick={() => { setEscalones(escalones.filter((_, i) => i !== idx)); markDirty(); }}
                              className="mt-4 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Visibilidad: solo mayorista */}
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={soloMayorista}
                    onChange={(e) => { setSoloMayorista(e.target.checked); markDirty(); }}
                    aria-label="Producto exclusivo para compradores mayoristas"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">Solo visible en tienda mayorista</span>
                    <span className="block text-xs text-gray-400 mt-0.5">Este producto no aparece si la tienda no tiene venta mayorista activada</span>
                  </span>
                </label>
              </div>
            )}

            {/* Promoción por cantidad — descuento automático al comprar N o más unidades */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="font-semibold text-gray-900">Promoción por cantidad</h2>
                  <Tip align="left" text="Elegí el tipo de promoción: «% de descuento» aplica un porcentaje de rebaja al comprar N o más unidades; «Llevá N, pagá M» cobra solo M unidades aunque el cliente lleve N (ej: llevá 3, pagá 2). El descuento se aplica automático en el carrito." />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Opcional — dejá vacío si no querés usar esta función</p>
              </div>

              {/* Tipo de promo */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => { setPromoType("PERCENT"); markDirty(); }}
                  className={`relative px-4 py-4 rounded-xl border-2 text-left transition-all ${promoType === "PERCENT" ? "border-indigo-600 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:border-indigo-200"}`}>
                  {promoType === "PERCENT" && <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px]">✓</span>}
                  <div className="text-xl mb-1.5">🏷️</div>
                  <div className={`text-sm font-semibold ${promoType === "PERCENT" ? "text-indigo-700" : "text-gray-700"}`}>% de descuento</div>
                  <div className="text-xs mt-0.5 text-gray-400">Comprá 3, obtenés 20% off</div>
                </button>
                <button type="button"
                  onClick={() => { setPromoType("N_PAY_M"); markDirty(); }}
                  className={`relative px-4 py-4 rounded-xl border-2 text-left transition-all ${promoType === "N_PAY_M" ? "border-indigo-600 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:border-indigo-200"}`}>
                  {promoType === "N_PAY_M" && <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px]">✓</span>}
                  <div className="text-xl mb-1.5">🎁</div>
                  <div className={`text-sm font-semibold ${promoType === "N_PAY_M" ? "text-indigo-700" : "text-gray-700"}`}>Llevá N, pagá M</div>
                  <div className="text-xs mt-0.5 text-gray-400">Llevá 3, pagá solo 2</div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {promoType === "N_PAY_M" ? "Llevá (N)" : "Cantidad mínima"}
                  </label>
                  <input
                    type="number"
                    value={promoQtyMin}
                    onChange={(e) => { setPromoQtyMin(e.target.value); markDirty(); }}
                    min="2" step="1" placeholder="ej: 3"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-400 mt-1 block">Unidades (entre distintos colores/talles)</span>
                </div>
                <div>
                  {promoType === "PERCENT" ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Descuento (%)</label>
                      <input
                        type="number"
                        value={promoQtyDiscount}
                        onChange={(e) => { setPromoQtyDiscount(e.target.value); markDirty(); }}
                        min="1" max="80" step="1" placeholder="ej: 10"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400 mt-1 block">Máximo 80%</span>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Pagá (M)</label>
                      <input
                        type="number"
                        value={promoPayQty}
                        onChange={(e) => { setPromoPayQty(e.target.value); markDirty(); }}
                        min="1" max={promoQtyMin ? String(parseInt(promoQtyMin) - 1) : undefined} step="1" placeholder="ej: 2"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400 mt-1 block">Debe ser menor que N {promoQtyMin && parseInt(promoQtyMin) > 1 ? `(máx ${parseInt(promoQtyMin) - 1})` : ""}</span>
                    </>
                  )}
                </div>
              </div>

              {promoQtyMin && (promoType === "PERCENT" ? promoQtyDiscount : promoPayQty) && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
                  {promoType === "PERCENT"
                    ? <>Al comprar <strong>{promoQtyMin} o más unidades</strong> de este producto, el cliente obtiene <strong>{promoQtyDiscount}% de descuento</strong> automáticamente.</>
                    : <>Al comprar <strong>{promoQtyMin} unidades</strong>, el cliente paga solo <strong>{promoPayQty}</strong> — {Math.round((Number(promoQtyMin) - Number(promoPayQty)) / Number(promoQtyMin) * 100)}% de ahorro automático.</>
                  }
                </div>
              )}
            </div>

            {/* Cuotas sin interés — informativo, no conectado a ningún banco ni a Mercado Pago */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">Cuotas sin interés</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Solo se muestra si tenés Mercado Pago conectado. Es información para el comprador, no una conexión real con tu banco — el cálculo es simplemente precio ÷ cuotas. Las cuotas reales y si se aplica interés se definen en tu cuenta de Mercado Pago al momento del pago. Elegí solo lo que realmente puedas ofrecer para evitar reclamos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, 3, 6, 12].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setCuotas(opt); markDirty(); }}
                    className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all text-center ${
                      cuotas === opt
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt === 0 ? "Sin cuotas" : `${opt} cuotas`}
                  </button>
                ))}
              </div>
            </div>

            {/* Envío — peso y dimensiones, oculto para rubros como AUTOS que no se mandan por correo */}
            {!storeTypeConfig.hideShipping && <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="font-semibold text-gray-900">Envío</h2>
                  <Tip align="left" text="Usado para cotizar el costo de envío real con el correo. Si lo dejás vacío, el envío se coordina manualmente con el cliente." />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Peso y dimensiones del paquete (opcional)</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => { setWeightKg(e.target.value); markDirty(); }}
                    min="0" step="0.01" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ancho (cm)</label>
                  <input
                    type="number"
                    value={widthCm}
                    onChange={(e) => { setWidthCm(e.target.value); markDirty(); }}
                    min="0" step="0.1" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Alto (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => { setHeightCm(e.target.value); markDirty(); }}
                    min="0" step="0.1" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Profundidad (cm)</label>
                  <input
                    type="number"
                    value={depthCm}
                    onChange={(e) => { setDepthCm(e.target.value); markDirty(); }}
                    min="0" step="0.1" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>}

            {/* Variantes — ocultas para tiendas como AUTOS donde no aplica */}
            {!storeTypeConfig.hideVariants && <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">Variantes y stock</h2>
                    <Tip align="left" text={variantTip(store.tipoTienda || "ROPA")} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {useBuilder ? `Elegí colores y ${builderCfg.sizeLabel.toLowerCase()} — las combinaciones se generan solas.` : `Una fila por combinación — ${variantExample(store.tipoTienda || "ROPA")}`}
                  </p>
                </div>
                {/* Modo manual como escape hatch */}
                {["ROPA", "HOGAR_TECH"].includes(store.tipoTienda || "") && (
                  <button
                    type="button"
                    onClick={() => setUseBuilder(v => !v)}
                    className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition-colors"
                  >
                    {useBuilder ? "Modo manual" : "Modo constructor"}
                  </button>
                )}
                {!useBuilder && (
                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                )}
              </div>

              {/* ── BUILDER MODE ── */}
              {useBuilder ? (
                <VariantBuilder
                  colors={builderColors}
                  sizes={builderSizes}
                  variants={variants}
                  images={images}
                  stdSizes={getTalleSuggestions(form.category, form.subcategory)}
                  sizeDim={builderCfg.sizeDim}
                  sizeLabel={builderCfg.sizeLabel}
                  sizePlaceholder={builderCfg.sizePlaceholder}
                  sizeHint={builderCfg.sizeHint}
                  onColorsChange={(c) => { setBuilderColors(c); markDirty(); }}
                  onSizesChange={(s) => { setBuilderSizes(s); markDirty(); }}
                  onVariantChange={updateVariantField}
                  onAssignPhoto={assignPhotoToColor}
                />
              ) : (
                /* ── MANUAL MODE ── */
                <>
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
                        <input type="number" value={variant.stock} onChange={(e) => updateVariantField(idx, "stock", e.target.value)} min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="w-24 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Precio extra</label>
                        <input type="number" value={variant.price} onChange={(e) => updateVariantField(idx, "price", e.target.value)} min="0" placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="w-24 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                          Alerta stock
                          <Tip align="right" text="Te avisamos por mail cuando el stock de esta variante baje a este número o menos. Dejalo vacío para usar el valor por defecto (5)." />
                        </label>
                        <input type="number" value={variant.lowStockThreshold} onChange={(e) => updateVariantField(idx, "lowStockThreshold", e.target.value)} min="0" placeholder="5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="flex items-end pb-1 shrink-0">
                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Hint: fotos sin color asignado */}
                  {colorValues.length > 0 && images.length > 0 && images.some(img => !img.variantValue) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>Tenés colores definidos pero tus fotos no tienen color asignado. Scrolleá a <strong>Imágenes del producto</strong> (arriba) para asignar cada foto a su color.</span>
                    </div>
                  )}
                </>
              )}
            </div>}

            {isEditing && editingId && <StockHistoryPanel productId={editingId} />}

            {/* Ficha técnica / Atributos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">
                      {storeTypeConfig.hideVariants ? "Ficha técnica" : activeExtraFields.length > 0 ? "Especificaciones" : "Atributos del producto"}
                    </h2>
                    <Tip align="left" text={extraFieldsTip(store.tipoTienda || "ROPA")} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeExtraFields.length > 0
                      ? activeExtraFields.map((f) => f.label).join(", ")
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

              {/* Campos tipados del store type (Marca, Año, Km, etc.) + specs de la subcategoría */}
              {activeExtraFields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeExtraFields.map((field) => {
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {field.label}
                          {field.tip && <Tip align="left" text={field.tip} />}
                        </label>
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
              {activeExtraFields.length === 0 && attributes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin atributos. Usá esto para especificar datos técnicos del producto.
                </p>
              )}

              {attributes
                .map((attr, idx) => ({ attr, idx }))
                .filter(({ attr }) => !activeExtraFields.some((f) => f.label === attr.key))
                .map(({ attr, idx }) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-end">
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
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-0">
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
                      <Image
                        src={images[carouselIdx]?.url || ""}
                        alt=""
                        fill
                        className="object-cover transition-all duration-300"
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
                          className={`relative aspect-square overflow-hidden rounded-md border-2 transition ${
                            i === carouselIdx ? "border-indigo-500" : "border-gray-100 opacity-70 hover:opacity-100"
                          }`}
                          aria-label={`Seleccionar imagen ${i + 1}`}
                        >
                          <Image src={img.url} alt="" fill className="object-cover" />
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
                      condicion === "0 km" || condicion === "Nuevo"
                        ? "bg-green-100 text-green-700"
                        : condicion === "Casi nuevo" || condicion === "Muy bueno"
                        ? "bg-blue-100 text-blue-700"
                        : condicion === "Bueno"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {condicion}
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
