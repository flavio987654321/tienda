"use client";

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import Tip from "@/components/Tip";
import CampoAuto from "@/components/CampoAuto";
import {
  Plus, Trash2, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
  X, Star, ShoppingCart, Heart, Tag, Package, Calendar, Film,
  Search, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getStoreType, etiquetaCategoria, camposActivos, camposPropios, ejemploNombre, ejemploTags } from "@/lib/storeTypes";
import { sugerirOpcion, opcionesIniciales, nombresDeOpciones, renombrarOpcion, agregarOpcion, quitarOpcion, estadoDelBuilder, opcionesQueNoEntranEnElBuilder, filasIncompletas, claveDeCombinacion, MAX_OPCIONES } from "@/lib/opcionSugerida";
import { esOpcionDeColor } from "@/lib/opciones";
import { calcMargin, calcVehicleCostTotal, formatFechaGasto } from "@/lib/margin";
import StockHistoryPanel from "../StockHistoryPanel";
import RichTextEditor from "@/components/RichTextEditor";
import { VariantBuilder } from "@/components/dashboard/VariantBuilder";
import { NombreOpcion } from "@/components/dashboard/NombreOpcion";
import { OfferBadge, OfferBadgePreview, type OfferBadgeKey } from "@/components/store/OfferBadge";
import { parseReel, isSafeReelUrl, playableReels, ReelPlayerModal } from "@/components/store/ProductReels";
import { deepestFixedOnProduct, DEEP_DISCOUNT_PCT, MAX_FIXED_DISCOUNT_PCT } from "@/lib/promotions";

type ImageItem = { url: string; variantValue?: string };

// Lo que devuelve /api/dashboard/promociones/vigentes: solo lo que decide alcance.
type PromoFijaVigente = { name: string; type: string; value: number | null; scope: string; categories: string[]; productIds: string[] };

const GASTO_CONCEPTOS = ["Compra", "Lavado", "Pulido/Detailing", "Service", "Cambio de cubiertas", "Otro"];

const AUTO_SERVICES = [
  { key: "aceite",      label: "Aceite y filtros" },
  { key: "frenos",      label: "Frenos" },
  { key: "distribucion",label: "DistribuciÃ³n" },
  { key: "cubiertas",   label: "Cubiertas" },
  { key: "suspension",  label: "SuspensiÃ³n" },
  { key: "electrico",   label: "Sist. elÃ©ctrico" },
  { key: "ac",          label: "Aire acondicionado" },
  { key: "caja",        label: "Caja de cambios" },
];

// `getVariantOptions` vivÃ­a acÃ¡: una tabla fija de nombres por rubro, con un
// "Otro" que los tres lugares que la llamaban filtraban. O sea que en Moda
// siempre eran "Talle" y "Color", y no habÃ­a forma de escribir otra cosa.
// Ahora los nombres arrancan sugeridos por la CATEGORÃA (`opcionesIniciales`) y
// son editables. Ver `lib/opcionSugerida.ts`.

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
  // El GET de /api/configuracion devuelve la fila entera de la tienda, asÃ­ que el
  // nombre ya venÃ­a â€” faltaba declararlo. Lo usa la vista previa de Google, que
  // arma el tÃ­tulo automÃ¡tico como "<producto> â€” <tienda>".
  name?: string;
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
const MAX_PRODUCT_IMAGES = 8;
// Debe coincidir con MAX_PRODUCT_REELS de lib/products.ts, que lo valida en el
// server. Antes el formulario no lo miraba: podÃ­as subir un 4to video de 50 MB y
// reciÃ©n al guardar la API lo rechazaba, con el archivo ya subido y huerfano.
const MAX_PRODUCT_REELS = 3;
// Debe coincidir con MAX_VIDEO_SIZE_MB de api/upload/route.ts
const MAX_VIDEO_SIZE_MB = 50;
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

// El ejemplo y la ayuda de variantes salÃ­an de dos tablas fijas por rubro que
// decÃ­an "Talle S + Color Negro" aunque el dueÃ±o hubiera renombrado la opciÃ³n.
// Ahora se arman con los nombres que estÃ¡n puestos de verdad.
function variantExample(dims: string[]): string {
  if (dims.length === 0) return "ej: una fila por combinaciÃ³n";
  return "ej: " + dims.map(d => `${d} ${variantEjemploValor(d)}`).join(" + ");
}

function variantTip(dims: string[]): string {
  if (dims.length === 0) return "Una fila por combinaciÃ³n de variantes. Cada fila tiene su propio stock.";
  const ej = dims.map(d => `${d} ${variantEjemploValor(d)}`).join(" + ");
  return `Una fila por combinaciÃ³n. Ej: ${ej} â†’ fila 1. Cada fila tiene su propio stock.`;
}

function variantEjemploValor(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n === "color" || n === "tono") return "Negro";
  if (n === "talle") return "S";
  if (n === "largo") return "45cm";
  if (n === "tamaÃ±o" || n === "tamano") return "Grande";
  if (n === "material") return "AlgodÃ³n";
  if (n === "sabor") return "Vainilla";
  if (n === "versiÃ³n" || n === "version") return "Full";
  if (n === "peso/tamaÃ±o") return "500g";
  return "1";
}

function tagsTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "Palabras clave para bÃºsqueda. Ej: negro, oversize, algodÃ³n. No afectan el precio ni el stock.",
    HOGAR_TECH: "Palabras clave para bÃºsqueda. Ej: liberado, sin cargador, inverter, escandinavo.",
    GASTRONOMIA: "Palabras clave para bÃºsqueda. Ej: sin tacc, vegano, artesanal.",
    GENERAL:   "Palabras clave para bÃºsqueda separadas por coma. Ayudan a tus clientes a encontrar el producto.",
  };
  return tips[tipoTienda] || "Palabras clave separadas por coma para que tus clientes encuentren el producto.";
}

function extraFieldsTip(tipoTienda: string): string {
  const tips: Record<string, string> = {
    ROPA:      "InformaciÃ³n extra sin stock. Ej: Material â†’ AlgodÃ³n, GÃ©nero â†’ Unisex. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.",
    AUTOS:     "InformaciÃ³n extra sin stock. Ej: Marca â†’ Toyota, AÃ±o â†’ 2022, Combustible â†’ Nafta. Son datos descriptivos del vehÃ­culo, no afectan precio ni stock.",
    HOGAR_TECH: "InformaciÃ³n extra sin stock. Ej: Marca â†’ Samsung, Pulgadas â†’ 55, RAM â†’ 8GB. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.",
    GASTRONOMIA: "InformaciÃ³n extra sin stock. Ej: Ingredientes â†’ Harina, azÃºcar, manteca.",
    GENERAL:   "InformaciÃ³n extra sin stock. Datos descriptivos que no afectan precio ni stock.",
  };
  return tips[tipoTienda] || "InformaciÃ³n extra sin stock. A diferencia de las variantes, los atributos son datos descriptivos que no tienen stock propio.";
}

// Sugerencias de quÃ© fotografiar, al estilo Tienda Nube â€” guÃ­an al vendedor
// sobre quÃ© Ã¡ngulos/tomas suelen convertir mÃ¡s, en vez de una zona de drop vacÃ­a.
// Cada tip es la etiqueta de un cuadro libre: se van consumiendo a medida que
// sube fotos, y la foto queda en el mismo cuadro donde estaba su consejo.
function photoTips(hideVariants: boolean): string[] {
  return [
    "SubÃ­ una foto del producto de frente",
    "ProbÃ¡ diferentes Ã¡ngulos",
    hideVariants ? "MostrÃ¡ detalles o el interior" : "MostrÃ¡ sus variantes",
    "SugerÃ­ cÃ³mo usarlo",
  ];
}

// QuÃ© grabar, segÃºn el rubro. El video es lo que mÃ¡s convence de comprar, pero
// nadie sabe quÃ© filmar si no se lo decÃ­s.
function reelTips(tipoTienda: string): string {
  if (tipoTienda === "AUTOS") return "MostrÃ¡ el interior, el motor, el baÃºl y una vuelta alrededor.";
  if (tipoTienda === "ROPA") return "MostrÃ¡ la prenda puesta, cÃ³mo cae y cÃ³mo se mueve.";
  if (tipoTienda === "GASTRONOMIA") return "MostrÃ¡ la textura, el corte o el plato ya servido.";
  return "MostrÃ¡ el producto en uso, de cerca y desde varios Ã¡ngulos.";
}

// Tarjeta de un reel en el formulario. Usa el mismo parseReel y el mismo recorte
// que la tienda: lo que ves acÃ¡ es lo que ve tu cliente. Antes el panel mostraba
// el video entero (contain) y la tienda lo recortaba (cover), asÃ­ que nunca te
// enterabas de que un video horizontal le llegaba mutilado al comprador.
function ReelCard({ url, onRemove, onPlay }: { url: string; onRemove: () => void; onPlay: () => void }) {
  const reel = parseReel(url);

  // Un link invÃ¡lido igual se muestra (con la X): si lo escondiÃ©ramos, el vendedor
  // no tendrÃ­a cÃ³mo sacarlo y el guardado seguirÃ­a arrastrÃ¡ndolo.
  if (!reel) {
    return (
      <div className="relative w-[116px] aspect-[9/16] rounded-xl overflow-hidden bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-1.5 px-2 flex-shrink-0">
        <X className="h-5 w-5 text-red-400" />
        <span className="text-[10px] font-medium text-red-600 text-center leading-snug">Link invÃ¡lido</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] text-red-500 underline underline-offset-2"
        >
          Quitar
        </button>
      </div>
    );
  }

  const isLink = reel.kind === "link";
  return (
    <div className="relative w-[116px] aspect-[9/16] rounded-xl overflow-hidden bg-black border border-gray-200 group flex-shrink-0">
      {/* Instagram y TikTok no se pueden reproducir acÃ¡: se abren en su app, igual
          que le va a pasar al comprador. Los demÃ¡s abren el mismo modal de la tienda. */}
      {isLink ? (
        <a
          href={reel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Film className="h-5 w-5 text-gray-400" />
          <span className="text-[10px] font-medium">{reel.platform}</span>
        </a>
      ) : (
        <button type="button" onClick={onPlay} className="w-full h-full block cursor-pointer" aria-label="Reproducir video">
          {reel.kind === "video" ? (
            <video src={reel.url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura del CDN de YouTube, no pasa por el optimizador
            <img src={`https://img.youtube.com/vi/${reel.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          )}
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-8 h-8 rounded-full bg-black/55 group-hover:bg-black/75 transition-colors flex items-center justify-center">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </span>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar video"
        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md z-10 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Cuadro vacÃ­o del grid de fotos. Mide igual que una foto para que el lugar que
// ocupa ahora sea el que va a ocupar la imagen.
function PhotoAddCell({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group flex flex-col items-center justify-center gap-2.5"
    >
      <span className="w-9 h-9 rounded-full border-2 border-indigo-200 text-indigo-400 group-hover:border-indigo-400 group-hover:bg-indigo-50 flex items-center justify-center transition-colors flex-shrink-0">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-xs font-medium text-gray-600 leading-snug text-center">{label}</span>
    </button>
  );
}

function variantPlaceholder(name: string): string {
  const n = name.toLowerCase();
  if (n === "color" || n === "tono") return "ej: Rojo o #FF0000";
  if (n === "talle" || n === "size") return "ej: S";
  if (n === "material") return "ej: AlgodÃ³n";
  if (n === "sabor") return "ej: Vainilla";
  if (n === "almacenamiento" || n === "ram") return "ej: 128GB";
  return "ej: Valor";
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
        Object.entries(v.attrs)
          // Una opciÃ³n sin nombre no se puede guardar: la tienda la lee por
          // nombre, asÃ­ que `{"": "S"}` se dibujarÃ­a como nada y el comprador
          // verÃ­a un talle menos. La UI ya no deja dejarlo vacÃ­o; esto es la red
          // por si alguna vez entra por otro lado.
          .filter(([k]) => k.trim())
          .map(([k, val]) => [k.trim(), val.trim()])
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

// Delega en `etiquetaCategoria` (storeTypes) para que el formulario, la tienda y
// cualquier otra pantalla escriban las categorÃ­as igual. La versiÃ³n que estaba acÃ¡
// capitalizaba TODAS las palabras y no tenÃ­a forma de arreglar los slugs sin Ã±:
// mostraba "Ropa Ninos", "Ropa Bebe" y "Short De BaÃ±o".
const formatCategoryLabel = etiquetaCategoria;

/* â”€â”€ OptimizaciÃ³n para Google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Dos pares de nÃºmeros distintos, y la diferencia importa:

   Â· Los VISIBLE son cuÃ¡nto muestra Google antes de cortar con "â€¦". Pasarse no es
     un error â€”la pÃ¡gina sigue siendo vÃ¡lidaâ€”, solo se lee menos. Por eso el aviso
     es Ã¡mbar, informativo, y nunca frena el guardado.
   Â· Los MAX son el tope duro del campo, para que nadie use estos casilleros como
     depÃ³sito de texto. Coinciden con los de `validateProductBody` en el servidor;
     si se cambia uno, cambiar el otro.                                          */
const SEO_TITULO_VISIBLE = 60;
const SEO_DESC_VISIBLE = 160;
const SEO_TITULO_MAX = 200;
const SEO_DESC_MAX = 500;

/** Corta en el lÃ­mite sin partir una palabra al medio. */
function recortar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  const cortado = texto.slice(0, limite);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  // Si la Ãºltima palabra es larguÃ­sima y el espacio quedÃ³ muy atrÃ¡s, se corta
  // seco: mejor eso que devolver dos palabras cuando entraban diez.
  return (ultimoEspacio > limite * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd() + "â€¦";
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
    costPrice: "",
    offerBadge: "",
    offerNote: "",
    offerEndsAt: "",
    category: "ropa",
    subcategory: "",
    tags: "",
    // VacÃ­o = "armalo solo". Ver la secciÃ³n "OptimizaciÃ³n para Google" mÃ¡s abajo.
    seoTitle: "",
    seoDescription: "",
  });
  const [isOnSale, setIsOnSale] = useState(false);
  const [seoAbierto, setSeoAbierto] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<Record<string, string[]>>({});
  const [gender, setGender] = useState<"mujer" | "hombre" | "unisex">("unisex");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  // Lo que se estÃ¡ tipeando en Tags, antes de convertirse en fichita.
  const [tagInput, setTagInput] = useState("");
  const [variants, setVariants] = useState<Variant[]>([{ attrs: { Talle: "" }, stock: "0", price: "", sku: "", lowStockThreshold: "" }]);
  // Builder de variantes (ROPA / HOGAR_TECH)
  const [builderColors, setBuilderColors] = useState<string[]>([]);
  const [builderSizes, setBuilderSizes] = useState<string[]>([]);
  const [useBuilder, setUseBuilder] = useState(false);
  /**
   * El nombre de la segunda dimensiÃ³n del builder: "Talle", "Largo", "TamaÃ±o".
   *
   * Antes salÃ­a de una tabla fija por rubro, asÃ­ que un collar en una tienda de
   * Moda se guardaba como "Talle: 45cm". Ahora arranca sugerido por la categorÃ­a
   * y el dueÃ±o lo puede cambiar.
   */
  const [opcionNombre, setOpcionNombre] = useState("Talle");
  /** Si el dueÃ±o ya escribiÃ³ el nombre a mano, la categorÃ­a deja de pisÃ¡rselo. */
  const nombreTocadoRef = useRef(false);
  const variantStockRef = useRef<Map<string, { stock: string; price: string; sku: string; threshold: string }>>(new Map());
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [condicion, setCondicion] = useState<string>("Usado");
  const [precioMayorista, setPrecioMayorista] = useState("");
  const [cantMinMayorista, setCantMinMayorista] = useState("");
  // Escalones: array de {desde, precio} como strings para los inputs controlados
  const [escalones, setEscalones] = useState<Array<{ desde: string; precio: string }>>([]);
  const [soloMayorista, setSoloMayorista] = useState(false);
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
  const [reelUrlDraft, setReelUrlDraft] = useState("");
  const [showReelUrlInput, setShowReelUrlInput] = useState(false);
  const [previewReelIdx, setPreviewReelIdx] = useState<number | null>(null);
  const [services, setServices] = useState<Record<string, boolean>>({});
  type VehicleExpenseItem = { id: string; concepto: string; monto: number; fecha: string | null };
  const [gastos, setGastos] = useState<VehicleExpenseItem[]>([]);
  const [gastoConcepto, setGastoConcepto] = useState(GASTO_CONCEPTOS[0]);
  const [gastoConceptoOtro, setGastoConceptoOtro] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoFecha, setGastoFecha] = useState("");
  const [savingGasto, setSavingGasto] = useState(false);
  const [gastoError, setGastoError] = useState("");
  const [deletingGastoId, setDeletingGastoId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);
  // Guarda category/subcategory crudos del producto cargado, para poder re-clasificar
  // la subcategorÃ­a si productSubcategories termina de llenarse despuÃ©s de este fetch
  const loadedProductRef = useRef<{ category: string; subcategory: string } | null>(null);

  // Promos de monto fijo corriendo ahora, para avisar si ESTE producto cae bajo
  // una que lo dejarÃ­a gratis o casi (F6-C9). Al crear la promo se chequea el
  // catÃ¡logo del momento; esta es la otra puerta, la que se abre despuÃ©s.
  const [promosFijas, setPromosFijas] = useState<PromoFijaVigente[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/promociones/vigentes")
      .then((r) => r.json())
      .then((d) => setPromosFijas(d.promotions || []))
      .catch(() => {}); // sin promos cargadas simplemente no se avisa nada

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
            setVariants([makeDefaultVariant(opcionesIniciales(d.store.tipoTienda || "ROPA", "", ""))]);
          } else {
            // El builder arranca sin combinaciones: las genera al elegir colores/talles.
            // Sin esto quedarÃ­a viva la variante default del useState y se enviarÃ­a vacÃ­a.
            setVariants([]);
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
    loadedRef.current = false;
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
        if (loadedRef.current) return; // productCategories actualizÃ³ async despuÃ©s de la primera carga â€” no resetear estados del usuario
        const knownCategory = productCategories.includes(product.category);
        loadedProductRef.current = { category: product.category || "", subcategory: product.subcategory || "" };
        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price?.toString() || "",
          comparePrice: product.comparePrice?.toString() || "",
          costPrice: product.costPrice?.toString() || "",
          offerBadge: product.offerBadge || "",
          offerNote: product.offerNote || "",
          offerEndsAt: product.offerEndsAt
            ? (() => { const d = new Date(product.offerEndsAt); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })()
            : "",
          category: knownCategory ? product.category : "otro",
          subcategory: product.subcategory ? (productSubcategories[product.category] || []).includes(product.subcategory) ? product.subcategory : "otro" : "",
          tags: safeJsonArray(product.tags).join(", "),
          seoTitle: product.seoTitle || "",
          seoDescription: product.seoDescription || "",
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
        type RawExpense = { id: string; concepto: string; monto: number; fecha?: string | null };
        setGastos(
          Array.isArray(product.expenses)
            ? product.expenses.map((g: RawExpense) => ({ id: g.id, concepto: g.concepto, monto: g.monto, fecha: g.fecha ?? null }))
            : []
        );
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
          : [makeDefaultVariant(opcionesIniciales(store.tipoTienda || "ROPA", product.category || "", product.subcategory || ""))];
        setVariants(loadedVariants);

        // El nombre de la segunda dimensiÃ³n sale del PRODUCTO, no de una tabla.
        // Antes se asumÃ­a "Talle" para todo ROPA, asÃ­ que al editar un collar
        // guardado como "Largo" el builder leÃ­a `attrs["Talle"]`, no encontraba
        // nada, y los largos desaparecÃ­an de la pantalla al abrir el producto.
        const nombreGuardado = loadedVariants
          .flatMap(v => Object.keys(v.attrs))
          .find(k => k !== "Color" && k !== "Tono");
        const sizeDim = nombreGuardado
          ?? sugerirOpcion(store.tipoTienda || "ROPA", product.category || "", product.subcategory || "").nombre;
        setOpcionNombre(sizeDim);
        // Se respeta lo que ya estÃ¡ guardado: cambiar de categorÃ­a al editar no
        // le puede renombrar las variantes que ya vendiÃ³.
        nombreTocadoRef.current = true;

        // Los colores y los valores que el constructor va a mostrar marcados.
        //
        // Esto estaba detrÃ¡s de `if (["ROPA","HOGAR_TECH"].includes(store.tipoTienda || ""))`,
        // y `store` acÃ¡ es el del closure: el fetch del producto sale ANTES que el
        // de configuraciÃ³n, asÃ­ que `tipoTienda` todavÃ­a no existe, el `includes("")`
        // daba falso y el bloque no corrÃ­a nunca. AbrÃ­as una remera con Negro y
        // Verde y el selector aparecÃ­a en blanco; al tocar un color se rearmaban
        // las combinaciones desde ese vacÃ­o y la remera perdÃ­a las variantes y el
        // stock.
        //
        // Ya no se pregunta de quÃ© rubro es la tienda: se deriva de las filas, que
        // para este punto estÃ¡n cargadas. Si la tienda no usa constructor, el dato
        // queda calculado y nadie lo mira.
        const builder = estadoDelBuilder(loadedVariants, sizeDim);
        variantStockRef.current = builder.stock;
        setBuilderColors(builder.colores);
        setBuilderSizes(builder.valores);
        const allAttrs = safeJsonArray(product.attributes).filter(
          (a: unknown): a is Attribute =>
            !!a && typeof a === "object" && typeof (a as Attribute).key === "string" && typeof (a as Attribute).value === "string"
        );
        const condAttr = allAttrs.find((a) => a.key === "CondiciÃ³n");
        if (condAttr) setCondicion(condAttr.value);
        const svcAttr = allAttrs.find((a) => a.key === "Servicios");
        if (svcAttr) { try { setServices(JSON.parse(svcAttr.value)); } catch {} }
        setAttributes(allAttrs.filter((a) => a.key !== "CondiciÃ³n" && a.key !== "Servicios"));
        setPrecioMayorista(product.precioMayorista?.toString() || "");
        setCantMinMayorista(product.cantMinMayorista?.toString() || "");
        try {
          const rawEsc = product.preciosEscalonados;
          const parsed = typeof rawEsc === "string" ? JSON.parse(rawEsc) : (rawEsc ?? []);
          if (Array.isArray(parsed)) {
            setEscalones(parsed.map((e: { desde: number; precio: number }) => ({ desde: String(e.desde), precio: String(e.precio) })));
          }
        } catch { /* si falla el parse dejamos el estado vacÃ­o inicial */ }
        setSoloMayorista(product.soloMayorista === true);
        setIsOnSale(!!product.comparePrice);
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
    // productSubcategories/store.tipoTienda se leen al vuelo; incluirlas reharÃ­a el fetch del producto
    // en cada actualizaciÃ³n. La reclasificaciÃ³n de subcategorÃ­a por carrera con esos datos la cubre
    // el efecto de abajo, que sÃ­ depende de productSubcategories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, productCategories]);

  // Re-clasifica la subcategorÃ­a si productSubcategories termina de llenarse despuÃ©s
  // de que el producto ya cargÃ³ (evita que quede mal clasificada como "otro" por una carrera
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

  /* â”€â”€ Tags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Se guardan igual que siempre: un solo texto separado por comas. Lo que
     cambia es cÃ³mo se cargan. Era un campo de una lÃ­nea, y un campo de una
     lÃ­nea NO puede pasar a renglÃ³n nuevo â€”es lo que el elemento es, no algo
     que se arregle con CSSâ€”: al sexto tag ya no veÃ­as los primeros. Como
     fichitas, envuelven en varias filas y se ve todo, que es el mismo patrÃ³n
     que ya usan Colores y Talles mÃ¡s abajo en este formulario. */
  const listaTags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

  function agregarTags(crudo: string) {
    // Se acepta pegar "rojo, verano, algodÃ³n" de una: cada coma es un tag.
    const entrantes = crudo.split(",").map((t) => t.trim()).filter(Boolean);
    if (entrantes.length === 0) return;
    const juntos = [...listaTags];
    for (const t of entrantes) {
      if (!juntos.some((x) => x.toLowerCase() === t.toLowerCase())) juntos.push(t);
    }
    updateForm("tags", juntos.join(", "));
    setTagInput("");
  }

  function quitarTag(tag: string) {
    updateForm("tags", listaTags.filter((t) => t !== tag).join(", "));
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
        updated.forEach(v => {
          const key = claveDeCombinacion(v.attrs["Color"] || "", v.attrs[opcionNombre] || "");
          variantStockRef.current.set(key, { stock: v.stock, price: v.price, sku: v.sku, threshold: v.lowStockThreshold });
        });
      }
      return updated;
    });
    markDirty();
  }

  // Combinaciones del builder. La llaman los handlers que cambian colores/talles â€”
  // antes vivÃ­a en un effect, que ademÃ¡s de encadenar renders se disparaba durante la
  // carga y habÃ­a que frenarlo con un flag. AcÃ¡ no corre si nadie la llama.
  // Con colores y talles vacÃ­os devuelve [], que es lo que corresponde.
  function buildVariantsFromBuilder(colors: string[], sizes: string[], nombre = opcionNombre): Variant[] {
    const sd = nombre;
    const get = (key: string) => variantStockRef.current.get(key);
    const newVariants: Variant[] = [];

    if (colors.length > 0 && sizes.length > 0) {
      for (const color of colors) {
        for (const size of sizes) {
          const key = claveDeCombinacion(color, size);
          const prev = get(key);
          newVariants.push({ attrs: { Color: color, [sd]: size }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
        }
      }
    } else if (colors.length > 0) {
      for (const color of colors) {
        const key = claveDeCombinacion(color, "");
        const prev = get(key);
        newVariants.push({ attrs: { Color: color }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
      }
    } else {
      for (const size of sizes) {
        const key = claveDeCombinacion("", size);
        const prev = get(key);
        newVariants.push({ attrs: { [sd]: size }, stock: prev?.stock ?? "0", price: prev?.price ?? "", sku: prev?.sku ?? "", lowStockThreshold: prev?.threshold ?? "" });
      }
    }
    return newVariants;
  }

  // Asignar una foto a un VALOR de opciÃ³n, desde el constructor. No tiene por quÃ©
  // ser un color: en un producto sin colores es el largo, el talle o lo que haya.
  const assignPhotoToValue = useCallback((valor: string, imageUrl: string | undefined) => {
    setImages(prev => prev.map(img => {
      if (img.variantValue === valor) return { ...img, variantValue: undefined };
      if (imageUrl && img.url === imageUrl) return { ...img, variantValue: valor };
      return img;
    }));
    markDirty();
  }, []);

  /** Las opciones que tiene el producto ahora mismo, en orden. */
  const dimsActuales = useMemo(() => nombresDeOpciones(variants), [variants]);

  function addVariant() {
    // La fila nueva lleva las MISMAS opciones que las que ya estÃ¡n. Antes salÃ­a de
    // la tabla por rubro, asÃ­ que si el dueÃ±o habÃ­a renombrado algo, la fila nueva
    // aparecÃ­a con los nombres viejos y se guardaban dos opciones distintas para
    // el mismo producto.
    const dims = dimsActuales.length > 0
      ? dimsActuales
      : opcionesIniciales(store.tipoTienda || "ROPA", form.category, form.subcategory);
    setVariants((p) => [...p, makeDefaultVariant(dims)]);
    markDirty();
  }

  function removeVariant(idx: number) {
    setVariants((p) => p.filter((_, i) => i !== idx));
    markDirty();
  }

  /**
   * Renombrar una opciÃ³n: cambia la clave en TODAS las filas a la vez.
   *
   * Se rearma el objeto en orden en vez de borrar y agregar, para que la opciÃ³n
   * renombrada quede donde estaba. Si se agrega al final, las columnas se
   * reordenan solas mientras el dueÃ±o escribe.
   */
  function renameDim(viejo: string, nuevo: string) {
    setVariants((p) => renombrarOpcion(p, viejo, nuevo));
    markDirty();
  }

  function addDim() {
    setVariants((p) => agregarOpcion(p));
    markDirty();
  }

  function removeDim(nombre: string) {
    setVariants((p) => quitarOpcion(p, nombre));
    markDirty();
  }

  /**
   * A quÃ© se le puede colgar una foto, agrupado por opciÃ³n.
   *
   * Antes esto filtraba por `key.includes("color")`, asÃ­ que sÃ³lo se podÃ­an
   * asignar fotos a los colores. La tienda hace rato que sincroniza la foto con
   * CUALQUIER valor â€”`indiceFotoDe` en useCartLogic ni mira cÃ³mo se llama la
   * opciÃ³n, y el comentario de ahÃ­ lo dice: "si maÃ±ana se asignan fotos por
   * Material, esto ya funciona"â€”. El formulario era lo Ãºnico que faltaba.
   *
   * Concreto: el collar de tiendaapps se vende por `Media` (40/50/70cm) y sus
   * fotos estÃ¡n colgadas de Blanco y Rojo, porque no habÃ­a otra opciÃ³n. Un collar
   * de 40cm y uno de 70cm se ven distinto.
   *
   * El color va primero: es el caso normal â€”98 de 107 productos activos tienen la
   * foto colgada de un colorâ€” y asÃ­ queda arriba en el desplegable.
   */
  const opcionesParaFoto = useMemo(() => {
    const porNombre = new Map<string, string[]>();
    for (const v of variants) {
      for (const [nombre, valor] of Object.entries(v.attrs)) {
        const n = nombre.trim(), val = valor.trim();
        if (!n || !val) continue;
        if (!porNombre.has(n)) porNombre.set(n, []);
        const lista = porNombre.get(n)!;
        if (!lista.includes(val)) lista.push(val);
      }
    }
    return [...porNombre]
      .map(([nombre, valores]) => ({ nombre, valores }))
      .sort((a, b) => Number(esOpcionDeColor(b.nombre)) - Number(esOpcionDeColor(a.nombre)));
  }, [variants]);

  /** Todos los valores sueltos â€” para saber si hay algo a lo que asignarle una foto. */
  const valoresParaFoto = useMemo(
    () => opcionesParaFoto.flatMap((o) => o.valores),
    [opcionesParaFoto],
  );

  /**
   * CÃ³mo nombrar la asignaciÃ³n en los carteles: "su color", "su color o su talle".
   *
   * Se arma con "su" a propÃ³sito: sirve para cualquier gÃ©nero y evita tener que
   * saber si va "un color" o "una medida".
   */
  const etiquetaFoto = useMemo(
    () => opcionesParaFoto.map((o) => `su ${o.nombre.toLowerCase()}`).join(" o "),
    [opcionesParaFoto],
  );

  function assignImageValue(idx: number, variantValue: string | undefined) {
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

  function addReelUrl() {
    const url = reelUrlDraft.trim();
    if (!url) return;
    if (!isSafeReelUrl(url)) {
      setError("PegÃ¡ un link completo que empiece con https:// (Instagram, TikTok o YouTube).");
      return;
    }
    if (reelUrls.length >= MAX_PRODUCT_REELS) {
      setError(`PodÃ©s agregar hasta ${MAX_PRODUCT_REELS} videos por producto.`);
      return;
    }
    // El tope se re-chequea adentro del updater: dos clicks rÃ¡pidos leerÃ­an el
    // mismo largo viejo y meterÃ­an el link dos veces.
    setReelUrls((p) => (p.length >= MAX_PRODUCT_REELS || p.includes(url) ? p : [...p, url]));
    setReelUrlDraft("");
    setShowReelUrlInput(false);
    markDirty();
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // El corte va ANTES de subir: si no, el archivo (hasta 50 MB) ya viajÃ³ al
    // storage y queda huÃ©rfano cuando el server rechaza el cuarto reel.
    if (reelUrls.length >= MAX_PRODUCT_REELS) {
      setError(`PodÃ©s subir hasta ${MAX_PRODUCT_REELS} videos por producto.`);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      return;
    }
    setUploadingVideo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "No se pudo subir el video");
      if (data.url) {
        // Re-chequeo adentro del updater y no contra el largo del render: mientras
        // el video viajaba se pudo haber pegado un link, y sumar acÃ¡ a ciegas
        // dejaba 4 reels que hacÃ­an fallar el guardado entero del producto.
        let overflow = false;
        setReelUrls((p) => {
          if (p.length >= MAX_PRODUCT_REELS) { overflow = true; return p; }
          return [...p, data.url as string];
        });
        if (overflow) setError(`PodÃ©s subir hasta ${MAX_PRODUCT_REELS} videos por producto.`);
        else markDirty();
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
      ? [{ name: "Unidad", value: "Ãšnico", stock: "1", price: "", sku: "" }]
      : prepareVariantsForSubmit(variants);
    if (!category) {
      setError("EscribÃ­ la categorÃ­a personalizada.");
      setLoading(false);
      return;
    }
    if (images.length === 0) {
      setError("AgregÃ¡ al menos una foto del producto.");
      setLoading(false);
      return;
    }
    if (!isHideVariants && preparedVariants.some((variant) => !variant.value)) {
      setError("Cada combinaciÃ³n de variantes debe tener al menos un valor. Si es un producto simple, dejÃ¡ una sola fila.");
      setLoading(false);
      return;
    }
    // Una fila a medio llenar â€”"Talle M" con el color en blancoâ€” pasaba las dos
    // validaciones de arriba y la del servidor, porque `value` queda en "M". Pero
    // en la tienda esa variante no coincide con ninguna selecciÃ³n: el comprador
    // podÃ­a comprar una combinaciÃ³n que no existe y la caja cobraba sin descontar
    // stock, porque sÃ³lo descuenta cuando encontrÃ³ la variante.
    if (!isHideVariants) {
      const incompletas = filasIncompletas(variants);
      if (incompletas.length > 0) {
        const { fila, falta, tiene } = incompletas[0];
        setError(
          `A la fila ${fila} (${tiene}) le falta ${falta.join(" y ")}. ` +
          `Completala o borrÃ¡ la fila â€” si no, esa combinaciÃ³n no se puede vender.`
        );
        setLoading(false);
        return;
      }
    }

    const baseAttrs = attributes.filter((a) => a.key.trim() && a.value.trim());
    const svcList = storeTypeConfig.hideVariants && Object.keys(services).length > 0
      ? [{ key: "Servicios", value: JSON.stringify(services) }]
      : [];
    const finalAttrs = storeTypeConfig.supportsCondicion
      ? [{ key: "CondiciÃ³n", value: condicion }, ...baseAttrs, ...svcList]
      : [...baseAttrs, ...svcList];

    const res = await fetch(isEditing ? `/api/productos/${editingId}` : "/api/productos", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        comparePrice: isOnSale ? (form.comparePrice || null) : null,
        offerBadge: isOnSale ? (form.offerBadge || null) : null,
        offerNote: isOnSale ? (form.offerNote.trim() || null) : null,
        offerEndsAt: isOnSale ? (form.offerEndsAt || null) : null,
        category,
        subcategory,
        gender,
        featured: storeTypeConfig.supportsFeatured ? featured : false,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images: images.map((img) => img.variantValue ? img : img.url),
        reelUrls: reelUrls.map((u) => u.trim()).filter(Boolean),
        variants: preparedVariants,
        attributes: finalAttrs,
        precioMayorista: precioMayorista || null,
        cantMinMayorista: cantMinMayorista || null,
        preciosEscalonados: escalones
          .filter((e) => e.desde.trim() !== "" && e.precio.trim() !== "")
          .map((e) => ({ desde: parseInt(e.desde), precio: parseFloat(e.precio) })),
        soloMayorista,
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
  // La sugerencia sale de la CATEGORÃA elegida, no del rubro: dentro de Moda, un
  // collar se sugiere como "Largo" con valores en centÃ­metros, y una remera como
  // "Talle" con S/M/L. El nombre es sÃ³lo una sugerencia â€” manda `opcionNombre`,
  // que el dueÃ±o puede escribir.
  const sugerida = sugerirOpcion(store.tipoTienda || "ROPA", form.category, form.subcategory);

  /**
   * Cambia el nombre de la opciÃ³n del builder y renombra la clave en las filas
   * que ya estÃ©n armadas. Sin lo segundo, cambiar "Talle" por "Largo" dejaba las
   * combinaciones existentes guardadas con el nombre viejo.
   */
  function cambiarNombreOpcion(nuevo: string) {
    const viejo = opcionNombre;
    setOpcionNombre(nuevo);
    if (viejo && nuevo && viejo !== nuevo) renameDim(viejo, nuevo);
  }

  // Al elegir una categorÃ­a, el nombre sugerido cambia: "collares" sugiere
  // "Largo", "remeras" sugiere "Talle". SÃ³lo se aplica si el dueÃ±o todavÃ­a no
  // escribiÃ³ el nombre a mano â€” lo suyo no se pisa nunca.
  useEffect(() => {
    if (nombreTocadoRef.current) return;
    if (sugerida.nombre === opcionNombre) return;
    // No se pisa una opciÃ³n que ya existe con ese nombre: si el producto ya tiene
    // un "Color" y la categorÃ­a sugiriera "Color", las dos claves se fundirÃ­an en
    // una y se perderÃ­an los valores de la otra.
    if (dimsActuales.some(d => d !== opcionNombre && d.toLowerCase() === sugerida.nombre.toLowerCase())) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de que el dueÃ±o elija una categorÃ­a, no se puede calcular durante el render
    cambiarNombreOpcion(sugerida.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugerida.nombre]);
  // â”€â”€ OptimizaciÃ³n para Google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Lo que se armarÃ­a solo si estos campos quedan vacÃ­os. Va como `placeholder` y
  // como texto de la vista previa, para que se vea quÃ© se estÃ¡ reemplazando ANTES
  // de escribir nada. Replica exactamente lo que hace `tituloParaGoogle` /
  // `descripcionParaGoogle` en la ficha pÃºblica â€” si allÃ¡ cambia, acÃ¡ tambiÃ©n.
  // El nombre de la tienda puede no haber llegado todavÃ­a (la config se pide
  // async). Mientras tanto se muestra un texto neutro en vez de "undefined".
  const nombreTienda = store.name?.trim() || "tu tienda";
  const seoTituloAuto = `${form.name.trim() || "Nombre del producto"} â€” ${nombreTienda}`;
  const seoDescripcionAuto =
    form.description.trim().slice(0, 160) ||
    `ComprÃ¡ ${form.name.trim() || "este producto"} en ${nombreTienda}`;
  const seoTocado = form.seoTitle.trim().length > 0 || form.seoDescription.trim().length > 0;

  const previewCategory = form.category === "otro" ? customCategory.trim() || "otro" : form.category;
  const previewSubcategory = form.subcategory === "otro" ? customSubcategory.trim() : form.subcategory;
  const availableSubcategories = form.category === "otro" ? [] : productSubcategories[form.category] || [];
  // Specs propias de lo que se estÃ¡ cargando (Pulgadas para TVs, Piedra para
  // joyas), sumadas a las genÃ©ricas del rubro. Si comparten nombre, gana la de
  // la categorÃ­a: un collar no pide "Material: AlgodÃ³n, poliÃ©ster...".
  const activeExtraFields = camposActivos(storeTypeConfig, previewCategory, previewSubcategory);
  // Tips que todavÃ­a no consumiÃ³ ninguna foto. Cuando se acaban, el grid sigue
  // con un cuadro genÃ©rico: siempre queda uno libre hasta llegar al mÃ¡ximo.
  const remainingPhotoTips = photoTips(storeTypeConfig.hideVariants).slice(images.length);

  // Al elegir una categorÃ­a con specs propias (ej: "tvs" â†’ Pulgadas, "joyas" â†’
  // Piedra), agregamos esos campos vacÃ­os a la ficha tÃ©cnica para que el vendedor
  // los vea y los complete.
  // No borra nada de lo que ya haya escrito si cambia de categorÃ­a y vuelve.
  useEffect(() => {
    const suggested = camposPropios(storeTypeConfig, previewCategory, previewSubcategory);
    if (suggested.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- agrega los campos sugeridos de la subcategorÃ­a reciÃ©n elegida, no se puede calcular durante el render porque depende de una interacciÃ³n del usuario
    setAttributes((prev) => {
      const missing = suggested.filter((f) => !prev.some((a) => a.key === f.label));
      if (missing.length === 0) return prev;
      return [...prev, ...missing.map((f) => ({ key: f.label, value: "" }))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewCategory, previewSubcategory]);

  const discount =
    form.comparePrice && form.price && parseFloat(form.comparePrice) > parseFloat(form.price)
      ? Math.round((1 - parseFloat(form.price) / parseFloat(form.comparePrice)) * 100)
      : 0;

  const margin = calcMargin(parseFloat(form.price || "0"), form.costPrice ? parseFloat(form.costPrice) : null);

  // F6-C9 â€” Â¿alguna promo de monto fijo vigente le pega fuerte a este producto?
  // Se recalcula al tipear el precio y al cambiar la categorÃ­a, que son las dos
  // cosas que deciden si cae en el alcance. Con `editingId` en el id, tambiÃ©n
  // detecta las promos que apuntan a este producto por nombre propio; en un
  // producto nuevo ese caso no existe todavÃ­a y el id vacÃ­o no matchea nada.
  const promoRiesgo = useMemo(
    () => deepestFixedOnProduct(
      { id: editingId ?? "", price: parseFloat(form.price || "0"), category: form.category || null },
      promosFijas
    ),
    [editingId, form.price, form.category, promosFijas]
  );
  const avisarPromo = promoRiesgo != null && promoRiesgo.pct >= DEEP_DISCOUNT_PCT;

  async function handleAddGasto() {
    if (savingGasto || !editingId) return;
    const concepto = gastoConcepto === "Otro" ? gastoConceptoOtro.trim() : gastoConcepto;
    if (!concepto) { setGastoError("IngresÃ¡ un concepto"); return; }
    const monto = parseFloat(gastoMonto);
    if (isNaN(monto) || monto <= 0) { setGastoError("IngresÃ¡ un monto vÃ¡lido"); return; }

    setSavingGasto(true);
    setGastoError("");
    try {
      const res = await fetch(`/api/productos/${editingId}/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepto, monto, fecha: gastoFecha || null }),
      });
      const data = await res.json();
      if (!res.ok) { setGastoError(data.error || "No se pudo agregar el gasto"); return; }
      setGastos((prev) => [...prev, data.gasto]);
      setGastoConcepto(GASTO_CONCEPTOS[0]);
      setGastoConceptoOtro("");
      setGastoMonto("");
      setGastoFecha("");
    } catch {
      setGastoError("No se pudo agregar el gasto. RevisÃ¡ tu conexiÃ³n e intentÃ¡ de nuevo.");
    } finally {
      setSavingGasto(false);
    }
  }

  async function handleDeleteGasto(gastoId: string) {
    if (deletingGastoId || !editingId) return;
    setDeletingGastoId(gastoId);
    try {
      const res = await fetch(`/api/productos/${editingId}/gastos/${gastoId}`, { method: "DELETE" });
      if (res.ok) setGastos((prev) => prev.filter((g) => g.id !== gastoId));
      else setGastoError("No se pudo borrar el gasto. IntentÃ¡ de nuevo.");
    } catch {
      setGastoError("No se pudo borrar el gasto. RevisÃ¡ tu conexiÃ³n e intentÃ¡ de nuevo.");
    } finally {
      setDeletingGastoId(null);
    }
  }

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
                  placeholder={storeLoaded ? ejemploNombre(storeTypeConfig, previewCategory) : ""}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DescripciÃ³n</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => { updateForm("description", html); markDirty(); }}
                  placeholder="DescribÃ­ tu producto..."
                  maxLength={8000}
                />
              </div>
              {!storeTypeConfig.hideGender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">GÃ©nero</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CategorÃ­a</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{formatCategoryLabel(c)}</option>
                    ))}
                    <option value="otro">Otra categorÃ­a</option>
                  </select>
                  {form.category === "otro" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="EscribÃ­ la categorÃ­a"
                      className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SubcategorÃ­a</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) => updateForm("subcategory", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Sin subcategorÃ­a</option>
                    {availableSubcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>{formatCategoryLabel(subcat)}</option>
                    ))}
                    <option value="otro">Otra subcategorÃ­a</option>
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
                    <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700">
                      Tags
                      <Tip align="left" text={tagsTip(store.tipoTienda || "ROPA")} />
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5 mb-1.5">
                      EscribÃ­ uno y apretÃ¡ Enter. TambiÃ©n podÃ©s pegar varios separados por coma.
                    </p>

                    {listaTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {listaTags.map((t) => (
                          <span
                            key={t}
                            className="flex max-w-full items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                          >
                            <span className="truncate">{t}</span>
                            <button
                              type="button"
                              onClick={() => quitarTag(t)}
                              aria-label={`Quitar el tag ${t}`}
                              className="shrink-0 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div
                        className="min-w-0 flex-1"
                        // Al salir del campo se toma lo tipeado: si no, escribÃ­as
                        // el Ãºltimo tag, tocabas "Guardar" y ese se perdÃ­a.
                        onBlur={() => agregarTags(tagInput)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !tagInput && listaTags.length > 0) {
                            quitarTag(listaTags[listaTags.length - 1]);
                          }
                        }}
                      >
                        <CampoAuto
                          id="tagInput"
                          value={tagInput}
                          // Al pegar "negro, oversize" se cierran los dos de una
                          // en vez de esperar un Enter que quizÃ¡s no llega.
                          onChange={(v) => (v.includes(",") ? agregarTags(v) : setTagInput(v))}
                          onEnter={() => agregarTags(tagInput)}
                          placeholder={ejemploTags(storeTypeConfig, previewCategory)}
                          className="py-3"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarTags(tagInput)}
                        disabled={!tagInput.trim()}
                        aria-label="Agregar tag"
                        className="shrink-0 rounded-xl bg-indigo-50 px-3 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CondiciÃ³n â€” solo para tipos que lo soportan (AUTOS, TECH) */}
            {storeTypeConfig.supportsCondicion && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">{storeTypeConfig.showServiceHistory ? "CondiciÃ³n del vehÃ­culo" : "CondiciÃ³n del producto"}</h2>
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

              {/* Hint arriba del grid: los selects viven adentro de cada cuadro */}
              {images.length > 0 && valoresParaFoto.length > 0 && (
                <div className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5 text-xs text-indigo-700">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {/* El texto nombra las opciones que tiene ESTE producto. DecÃ­a
                      "un color" siempre, aunque el producto se vendiera por largo. */}
                  <span><strong>AsignÃ¡ cada foto a {etiquetaFoto}</strong> para que el cliente vea la imagen correcta al elegir.</span>
                </div>
              )}

              {/* Un solo grid: la foto queda en el mismo cuadro que ocupaba su consejo.
                  El drop de archivos va acÃ¡ y no en cada celda â€” cuando el drop viene de
                  reordenar, dataTransfer.files estÃ¡ vacÃ­o y uploadImages corta solo. */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {images.map((img, i) => (
                  <div key={img.url + i} className="flex flex-col gap-1.5">
                    <div
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i); setDragIdx(null); }}
                      onDragEnd={() => setDragIdx(null)}
                      onClick={() => setCarouselIdx(i)}
                      className={`group relative aspect-square rounded-xl cursor-grab active:cursor-grabbing border-2 transition-all overflow-hidden ${
                        dragIdx === i ? "opacity-40 scale-95" : ""
                      } ${carouselIdx === i ? "border-indigo-500 ring-2 ring-indigo-200" : "border-transparent hover:border-gray-300"}`}
                    >
                      <Image src={img.url} alt="" fill sizes="(max-width: 640px) 45vw, 200px" className="object-cover" />
                      {img.variantValue && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-1">
                          <span className="text-[10px] text-white font-semibold px-1 truncate block">{img.variantValue}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        aria-label="Quitar foto"
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md z-10 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {i === 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-indigo-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">PORTADA</div>
                      )}
                    </div>
                    {valoresParaFoto.length > 0 && (
                      <select
                        value={img.variantValue || ""}
                        onChange={(e) => assignImageValue(i, e.target.value || undefined)}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full text-xs border rounded-lg bg-white py-1.5 px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                          img.variantValue
                            ? "border-indigo-300 text-indigo-700 font-medium bg-indigo-50"
                            : "border-gray-200 text-gray-400"
                        }`}
                      >
                        <option value="">Sin asignar</option>
                        {/* Agrupado por opciÃ³n: con Color y Talle juntos, una lista
                            plana mezclarÃ­a "Negro" con "M" sin decir quÃ© es cada uno.
                            El `optgroup` lo resuelve sin agregar un control nuevo. */}
                        {opcionesParaFoto.map((op) => (
                          <optgroup key={op.nombre} label={op.nombre}>
                            {op.valores.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                {uploadingImg ? (
                  <div className="aspect-square border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                    <span className="text-xs text-gray-500">Subiendo...</span>
                  </div>
                ) : images.length < MAX_PRODUCT_IMAGES ? (
                  remainingPhotoTips.length > 0 ? (
                    remainingPhotoTips.map((tip) => (
                      <PhotoAddCell key={tip} label={tip} onClick={() => fileInputRef.current?.click()} />
                    ))
                  ) : (
                    <PhotoAddCell label="Agregar otra foto" onClick={() => fileInputRef.current?.click()} />
                  )
                ) : null}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Hasta {MAX_PRODUCT_IMAGES} fotos (podÃ©s elegir varias a la vez). JPG, PNG, WEBP - hasta {MAX_SOURCE_IMAGE_SIZE_MB} MB; se optimizan al subir
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* Hint cuando todavÃ­a no hay variantes cargadas */}
              {!storeTypeConfig.hideVariants && valoresParaFoto.length === 0 && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Si tu producto viene en <strong>varias versiones</strong> (colores, talles, largos), primero cargalas en <strong>Variantes y stock</strong> (mÃ¡s abajo) â€” despuÃ©s vas a poder asignarle una foto a cada una.</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Reels / Videos</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Un video muestra el producto en movimiento â€” es lo que mÃ¡s convence de comprar</p>
                </div>
                <span className="text-xs text-gray-400">{reelUrls.length}/{MAX_PRODUCT_REELS}</span>
              </div>

              {/* Ayuda visual: quÃ© grabar y cuÃ¡nto debe durar */}
              <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>
                  GrabÃ¡ <strong>vertical</strong> (como una historia) y de <strong>15 a 30 segundos</strong>. {reelTips(store.tipoTienda || "ROPA")}{" "}
                  Si el video te quedÃ³ horizontal no pasa nada: tu cliente lo abre a pantalla completa y lo ve entero.
                </span>
              </div>

              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                className="hidden"
                onChange={handleVideoFileUpload}
              />
              {/* Igual que las fotos: se ven los 3 lugares desde el arranque, asÃ­ se
                  entiende cuÃ¡ntos videos entran sin tener que contarlos. Centrados para
                  que no queden pegados a la izquierda con un hueco a la derecha; en
                  celular hacen wrap y quedan centrados igual. */}
              <div className="flex flex-wrap justify-center gap-3">
                {reelUrls.map((url, i) => (
                  <ReelCard
                    key={url + i}
                    url={url}
                    onRemove={() => { setReelUrls(p => p.filter((_, j) => j !== i)); markDirty(); }}
                    onPlay={() => setPreviewReelIdx(i)}
                  />
                ))}

                {uploadingVideo && (
                  <div className="w-[116px] aspect-[9/16] border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center gap-2 flex-shrink-0">
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                    <span className="text-[11px] text-gray-500">Subiendo...</span>
                  </div>
                )}

                {Array.from({ length: Math.max(0, MAX_PRODUCT_REELS - reelUrls.length - (uploadingVideo ? 1 : 0)) }).map((_, i) => (
                  <button
                    key={`slot-${i}`}
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="w-[116px] aspect-[9/16] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2.5 p-2 flex-shrink-0 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="w-9 h-9 rounded-full border-2 border-indigo-200 text-indigo-400 group-hover:border-indigo-400 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium text-gray-600 text-center leading-snug">Subir video</span>
                  </button>
                ))}
              </div>

              {/* Se esconde mientras sube un video: si no, se podÃ­a pegar un link
                  durante la subida y terminar con un reel de mÃ¡s. */}
              {!showReelUrlInput && !uploadingVideo && reelUrls.length < MAX_PRODUCT_REELS && (
                <button
                  type="button"
                  onClick={() => setShowReelUrlInput(true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  o pegÃ¡ un link de Instagram, TikTok o YouTube
                </button>
              )}

              {/* El link se agrega reciÃ©n cuando tiene contenido: antes se metia un
                  string vacio en la lista y, si guardabas asi, la tienda mostraba
                  una tarjeta de video rota que no llevaba a ningun lado. */}
              {showReelUrlInput && !uploadingVideo && reelUrls.length < MAX_PRODUCT_REELS && (
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    autoFocus
                    value={reelUrlDraft}
                    onChange={(e) => setReelUrlDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReelUrl(); } }}
                    placeholder="https://www.instagram.com/reel/... o youtube.com/shorts/..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addReelUrl}
                    disabled={!reelUrlDraft.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReelUrlInput(false); setReelUrlDraft(""); }}
                    className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">
                Hasta {MAX_PRODUCT_REELS} videos. MP4, WEBM o MOV de hasta {MAX_VIDEO_SIZE_MB} MB, o un link de Instagram, TikTok o YouTube
              </p>

              {/* El mismo reproductor que ve el comprador, no una imitaciÃ³n */}
              {previewReelIdx !== null && (
                <ReelPlayerModal
                  reelUrls={reelUrls}
                  startIndex={playableReels(reelUrls.slice(0, previewReelIdx)).length}
                  onClose={() => setPreviewReelIdx(null)}
                />
              )}
            </div>

            {/* Historial de servicios â€” solo AUTOS */}
            {storeTypeConfig.showServiceHistory && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Historial de servicios</h2>
                  <p className="text-xs text-gray-400 mt-0.5">MarcÃ¡ los servicios que estÃ¡n al dÃ­a. Se muestran con un tilde verde en la pÃ¡gina del vehÃ­culo.</p>
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
                        {services[svc.key] ? "âœ“" : "âœ•"}
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
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {/* Precio de venta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio de venta *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => updateForm("price", e.target.value)}
                    required min="0" step="0.01" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* F6-C9 â€” el candado del monto fijo protege el momento de CREAR
                    la promo. Este es el otro lado: un producto barato cargado
                    despuÃ©s entra a una promo que ya estÃ¡ corriendo, y hasta acÃ¡
                    nadie revisaba nada. Avisa, no frena: el precio del producto
                    es una decisiÃ³n del dueÃ±o, y la promo se puede arreglar del
                    otro lado. */}
                {avisarPromo && promoRiesgo && (
                  <div className={`mt-2 flex gap-2 items-start rounded-xl border p-3 text-[12.5px] ${
                    promoRiesgo.pct >= MAX_FIXED_DISCOUNT_PCT
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <Tag className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      {promoRiesgo.pct >= MAX_FIXED_DISCOUNT_PCT ? (
                        <>
                          <b>Con este precio, el producto se va a mostrar casi regalado.</b>{" "}
                          La promociÃ³n â€œ{promoRiesgo.promoName}â€ descuenta ${promoRiesgo.value.toLocaleString("es-AR")} y
                          este producto sale ${parseFloat(form.price || "0").toLocaleString("es-AR")} â€” se va a mostrar
                          a <b>${Math.round(promoRiesgo.effective).toLocaleString("es-AR")}</b>, que es el mÃ­nimo que
                          permite el sistema ({100 - MAX_FIXED_DISCOUNT_PCT}% del precio).
                          Subile el precio, o entrÃ¡ a Promociones y sacalo del alcance.
                        </>
                      ) : (
                        <>
                          <b>Ojo:</b> la promociÃ³n â€œ{promoRiesgo.promoName}â€ le descuenta ${promoRiesgo.value.toLocaleString("es-AR")} a
                          este producto â€” se va a mostrar a <b>${Math.round(promoRiesgo.effective).toLocaleString("es-AR")}</b>, un {promoRiesgo.pct}% menos.
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Costo interno + margen â€” todos los rubros excepto Autos/Motos (que usan Gastos del vehÃ­culo) */}
              {!storeTypeConfig.usesVehicleExpenses && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Costo</label>
                    {margin.kind !== "no-cost" && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        margin.kind === "loss" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                      }`}>
                        {margin.kind === "loss" ? "EstÃ¡s vendiendo a pÃ©rdida" : `Margen de ganancia: ${margin.marginPct.toFixed(0)}%`}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.costPrice}
                      onChange={(e) => { updateForm("costPrice", e.target.value); markDirty(); }}
                      min="0" step="0.01" placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {margin.kind === "no-cost"
                      ? "Cargalo para ver tu margen de ganancia. Es de uso interno, tus clientes no lo verÃ¡n en la tienda."
                      : "Es de uso interno, tus clientes no lo verÃ¡n en la tienda."}
                  </p>
                </div>
              )}

              {/* Gastos del vehÃ­culo â€” solo Autos/Motos, reemplaza el campo Costo */}
              {storeTypeConfig.usesVehicleExpenses && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Gastos del vehÃ­culo</label>
                    {gastos.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        Costo total: ${calcVehicleCostTotal(gastos).toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Compra, lavado, service, cubiertas... Es de uso interno, tus clientes no lo verÃ¡n en la tienda.
                  </p>

                  {!isEditing ? (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                      GuardÃ¡ el vehÃ­culo primero para poder cargarle gastos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {gastos.map((g) => (
                        <div key={g.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">{g.concepto}</p>
                            {g.fecha && (
                              <p className="text-xs text-gray-400">{formatFechaGasto(g.fecha)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-gray-700">${g.monto.toLocaleString("es-AR")}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGasto(g.id)}
                              disabled={deletingGastoId === g.id}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <select
                          value={gastoConcepto}
                          onChange={(e) => setGastoConcepto(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {GASTO_CONCEPTOS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {gastoConcepto === "Otro" && (
                          <input
                            value={gastoConceptoOtro}
                            onChange={(e) => setGastoConceptoOtro(e.target.value)}
                            placeholder="Concepto"
                            maxLength={100}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                        <div className="relative w-full sm:w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            value={gastoMonto}
                            onChange={(e) => setGastoMonto(e.target.value)}
                            min="0" step="0.01" placeholder="Monto"
                            className="w-full border border-gray-200 rounded-xl pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <input
                          type="date"
                          value={gastoFecha}
                          onChange={(e) => setGastoFecha(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddGasto}
                          disabled={savingGasto}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {savingGasto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          {savingGasto ? "Agregando..." : "Agregar"}
                        </button>
                      </div>
                      {gastoError && <p className="text-xs text-red-500">{gastoError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle Â¿En oferta? */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Â¿EstÃ¡ en oferta?</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isOnSale
                        ? "Activa â€” el cliente ve el precio original tachado y el badge elegido"
                        : "No â€” se muestra solo el precio de venta"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsOnSale(v => !v); markDirty(); }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isOnSale ? "bg-indigo-600" : "bg-gray-200"}`}
                    role="switch" aria-checked={isOnSale}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isOnSale ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {isOnSale && (
                  <div className="space-y-4">
                    {/* Precio original */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                        <span>Precio original (antes del descuento)</span>
                        {discount > 0 && (
                          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            -{discount}% OFF
                          </span>
                        )}
                      </label>
                      {(() => {
                        const cp = form.comparePrice ? parseFloat(form.comparePrice) : null;
                        const sp = parseFloat(form.price || "0");
                        const cpInvalid = form.comparePrice !== "" && (cp === null || isNaN(cp) || cp <= 0);
                        const cpTooLow = !cpInvalid && cp !== null && cp <= sp;
                        return <>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                            <input
                              type="number"
                              value={form.comparePrice}
                              onChange={(e) => { updateForm("comparePrice", e.target.value); markDirty(); }}
                              min="0" step="0.01" placeholder="ej: 60000"
                              className={`w-full border rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                cpInvalid ? "border-red-400 bg-red-50"
                                : cpTooLow ? "border-amber-400 bg-amber-50"
                                : "border-gray-200"
                              }`}
                            />
                          </div>
                          {cpInvalid && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              IngresÃ¡ un nÃºmero mayor a 0.
                            </p>
                          )}
                          {cpTooLow && (
                            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              El precio original debe ser mayor al precio de venta.
                            </p>
                          )}
                        </>;
                      })()}
                      {discount > 0 && (
                        <div className="mt-2 flex items-center gap-3 text-sm">
                          <span className="text-gray-400 line-through">${parseFloat(form.comparePrice).toLocaleString("es-AR")}</span>
                          <span className="font-semibold text-gray-900">${parseFloat(form.price).toLocaleString("es-AR")}</span>
                          <span className="text-green-600 font-bold">-{discount}%</span>
                        </div>
                      )}
                    </div>

                    {/* Badge picker */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Badge en la imagen <span className="text-xs text-gray-400 font-normal">(opcional)</span></p>
                      <p className="text-xs text-gray-400 mb-2">ElegÃ­ el estilo visual del badge. Si tenÃ©s una promo N llevÃ¡s M pagÃ¡s, el badge se genera automÃ¡ticamente.</p>
                      <div className="flex flex-wrap gap-2">
                        {(["OFERTA", "SALE", "PCT"] as const).map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { updateForm("offerBadge", form.offerBadge === key ? "" : key); markDirty(); }}
                            className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${form.offerBadge === key ? "border-indigo-600 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:border-indigo-200"}`}
                          >
                            {form.offerBadge === key && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px]">âœ“</span>
                            )}
                            <OfferBadgePreview badge={key} pct={key === "PCT" ? discount || null : null} />
                            <span className="text-[10px] text-gray-500 font-medium">{key === "OFERTA" ? "Oferta" : key === "SALE" ? "Sale" : "% Off"}</span>
                          </button>
                        ))}
                        {form.offerBadge && (
                          <button
                            type="button"
                            onClick={() => { updateForm("offerBadge", ""); markDirty(); }}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-red-200 text-xs text-gray-400 hover:text-red-500 transition-all min-w-[48px]"
                          >
                            <span className="text-base">âœ•</span>
                            <span>Ninguno</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nota de oferta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nota de la oferta <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        value={form.offerNote}
                        onChange={(e) => { updateForm("offerNote", e.target.value.slice(0, 200)); markDirty(); }}
                        placeholder="Ej: VÃ¡lida hasta agotar stock Â· Solo talles M y L"
                        rows={2}
                        maxLength={200}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-400 text-right">{form.offerNote.length}/200</p>
                      <p className="text-xs text-gray-400">Se muestra en el detalle del producto junto al precio de oferta.</p>
                    </div>

                    {/* Fecha de vencimiento de la oferta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        VÃ¡lida hasta <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                        <Tip text="Cuando llegue esta fecha/hora la oferta se desactiva automÃ¡ticamente en la tienda: desaparece el precio tachado, el badge y la nota." align="right" />
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={form.offerEndsAt}
                          onChange={(e) => { updateForm("offerEndsAt", e.target.value); markDirty(); }}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {form.offerEndsAt && (
                          <button type="button" onClick={() => { updateForm("offerEndsAt", ""); markDirty(); }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {form.offerEndsAt && (
                        <p className={`mt-1.5 text-xs flex items-center gap-1 ${new Date(form.offerEndsAt) <= new Date() ? "text-red-600" : "text-green-600"}`}>
                          {(() => {
                            const end = new Date(form.offerEndsAt);
                            const now = new Date();
                            if (end <= now) return <><span>âš ï¸</span><span>Esta fecha ya pasÃ³ â€” la oferta no se mostrarÃ¡ en la tienda.</span></>;
                            const diffMs = end.getTime() - now.getTime();
                            const diffH = Math.floor(diffMs / 3600000);
                            const diffD = Math.floor(diffH / 24);
                            if (diffD >= 1) return <><span>â³</span><span>Vence en {diffD} dÃ­a{diffD !== 1 ? "s" : ""} ({end.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })} a las {end.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })})</span></>;
                            return <><span>â³</span><span>Vence en {diffH} hora{diffH !== 1 ? "s" : ""}</span></>;
                          })()}
                        </p>
                      )}
                    </div>

                    {discount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                        <Tag className="h-4 w-4" />
                        Este producto aparecerÃ¡ automÃ¡ticamente en los bloques de <strong>&quot;Ofertas destacadas&quot;</strong> de tu tienda.
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                    <span className="block text-sm font-medium text-gray-800">Destacar en &quot;Lo mÃ¡s buscado&quot;</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      MostrÃ¡ este producto en el bloque &quot;Lo mÃ¡s buscado&quot; de tu tienda. Si no destacÃ¡s ningÃºn producto, ese bloque muestra los mÃ¡s recientes.
                    </span>
                  </span>
                </label>
              )}
            </div>

            {/* Precio mayorista â€” solo rubros que soportan mayorista Y tienda configurada como tal */}
            {store.tieneVentaMayorista && storeTypeConfig.supportsWholesale && (
              <div className="bg-white rounded-2xl border border-indigo-100 p-6 space-y-5">
                {/* Cabecera */}
                <div>
                  <h2 className="font-semibold text-gray-900">Venta mayorista</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Los precios mayoristas aplican automÃ¡ticamente cuando el comprador alcanza la cantidad mÃ­nima</p>
                </div>

                {/* Precio base + cantidad mÃ­nima.
                    Una sola columna en celular: a 360px, dos columnas fijas dejaban
                    cada campo en ~140px y el rÃ³tulo "Precio por mayor base *" se
                    partÃ­a en dos renglones encima de un input donde el "$" ya se
                    come parte del espacio. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label htmlFor="cantMinMayorista" className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad mÃ­nima *</label>
                    <input
                      id="cantMinMayorista"
                      type="number"
                      value={cantMinMayorista}
                      onChange={(e) => { setCantMinMayorista(e.target.value); markDirty(); }}
                      min="1" step="1" placeholder="Ej: 6"
                      aria-label="Cantidad mÃ­nima para precio mayorista"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Escalones de precio â€” solo aparecen si ya hay un precio base cargado */}
                {precioMayorista && cantMinMayorista && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Escalones de precio</p>
                        <p className="text-xs text-gray-400">Precio menor para quien compra mÃ¡s. MÃ¡ximo 3 escalones.</p>
                      </div>
                      {escalones.length < 3 && (
                        <button
                          type="button"
                          onClick={() => { setEscalones([...escalones, { desde: "", precio: "" }]); markDirty(); }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
                          aria-label="Agregar escalÃ³n de precio mayorista"
                        >
                          + Agregar escalÃ³n
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
                                aria-label={`EscalÃ³n ${idx + 1}: cantidad mÃ­nima`}
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
                                  aria-label={`EscalÃ³n ${idx + 1}: precio por unidad`}
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
                              aria-label={`Eliminar escalÃ³n ${idx + 1}`}
                              onClick={() => { setEscalones(escalones.filter((_, i) => i !== idx)); markDirty(); }}
                              className="mt-4 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                            >
                              Ã—
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

            {/* PromociÃ³n por cantidad y Cuotas â€” no aplican a rubros con checkoutMode "inquiry" (ej. AUTOS): no hay compra online de varias unidades ni tarjeta de por medio */}
            {!storeTypeConfig.hidePromotions && <>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl leading-none mt-0.5">ðŸŽ‰</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Promociones</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Los descuentos (por cantidad, %, 3Ã—2, envÃ­o gratis) ahora se crean en la secciÃ³n <strong>Promociones</strong>. Desde ahÃ­ los aplicÃ¡s a este producto, a una categorÃ­a o a toda la tienda, con fechas y todo.
                  </p>
                  <Link href="/dashboard/promociones" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    Ir a Promociones
                    <span aria-hidden>â†’</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Cuotas sin interÃ©s â€” informativo, no conectado a ningÃºn banco ni a Mercado Pago */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">Cuotas sin interÃ©s</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Solo se muestra si tenÃ©s Mercado Pago conectado. Es informaciÃ³n para el comprador, no una conexiÃ³n real con tu banco â€” el cÃ¡lculo es simplemente precio Ã· cuotas. Las cuotas reales y si se aplica interÃ©s se definen en tu cuenta de Mercado Pago al momento del pago. ElegÃ­ solo lo que realmente puedas ofrecer para evitar reclamos.
                </p>
              </div>
              {/* 2Ã—2 en celular, una sola fila de 4 en pantalla ancha.
                  Antes era `flex-wrap` con `flex-1 min-w-[90px]`: a 368px entraban
                  tres arriba y el cuarto quedaba solo, estirado a lo ancho de todo
                  â€”tres botones de 101px y uno de 320â€”. Encima, en 101px con el
                  padding no entraba "Sin cuotas" y se partÃ­a en dos renglones.
                  Con la grilla los cuatro miden igual (~156px) y nada se parte. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 3, 6, 12].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setCuotas(opt); markDirty(); }}
                    aria-pressed={cuotas === opt}
                    className={`py-2.5 px-2 rounded-xl text-sm font-semibold border-2 transition-all text-center ${
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
            </>}

            {/* EnvÃ­o â€” peso y dimensiones, oculto para rubros como AUTOS que no se mandan por correo */}
            {!storeTypeConfig.hideShipping && <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="font-semibold text-gray-900">EnvÃ­o</h2>
                  <Tip align="left" text="Usado para cotizar el costo de envÃ­o real con el correo. Si lo dejÃ¡s vacÃ­o, el envÃ­o se coordina manualmente con el cliente." />
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

            {/* Variantes â€” ocultas para tiendas como AUTOS donde no aplica */}
            {!storeTypeConfig.hideVariants && <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">Variantes y stock</h2>
                    <Tip align="left" text={variantTip(useBuilder ? ["Color", opcionNombre] : dimsActuales)} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {useBuilder
                      ? `ElegÃ­ colores y ${opcionNombre.toLowerCase()} â€” las combinaciones se generan solas.`
                      : `Una fila por combinaciÃ³n â€” ${variantExample(dimsActuales)}`}
                  </p>
                </div>
                {/* Modo manual como escape hatch */}
                {["ROPA", "HOGAR_TECH"].includes(store.tipoTienda || "") && (
                  <button
                    type="button"
                    onClick={() => {
                      const turningOn = !useBuilder;
                      if (turningOn) {
                        // El estado del constructor sale de las filas que hay AHORA.
                        //
                        // Antes se rearmaba desde `builderColors`/`builderSizes`, que el
                        // modo manual nunca toca: quedaban como estaban al cargar la
                        // pantalla â€”vacÃ­os, en un producto nuevoâ€” y volver al constructor
                        // borraba todo lo cargado a mano, sin avisar ni poder deshacer.
                        const perdidas = opcionesQueNoEntranEnElBuilder(variants, opcionNombre);
                        if (perdidas.length > 0) {
                          // Lo Ãºnico que el constructor no puede representar: maneja Color
                          // mÃ¡s UNA opciÃ³n. Antes tambiÃ©n se perdÃ­a, nada mÃ¡s que callado.
                          const cuales = perdidas.join(" y ");
                          const verbo = perdidas.length > 1 ? "se pierden" : "se pierde";
                          if (!confirm(
                            `El constructor sÃ³lo maneja Color y ${opcionNombre}.\n\nSi seguÃ­s, ${verbo} ${cuales}.\n\nÂ¿Seguir?`
                          )) return;
                        }
                        const b = estadoDelBuilder(variants, opcionNombre);
                        variantStockRef.current = b.stock;
                        setBuilderColors(b.colores);
                        setBuilderSizes(b.valores);
                        setVariants(buildVariantsFromBuilder(b.colores, b.valores));
                        markDirty();
                      }
                      // Al pasar a manual las filas quedan como estÃ¡n: el manual sabe
                      // mostrar cualquier cosa que el constructor haya generado.
                      setUseBuilder(turningOn);
                    }}
                    // `whitespace-nowrap` porque a 360 "Modo manual" se partÃ­a en dos
                    // lÃ­neas y quedaba encimado con el texto de la izquierda.
                    className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition-colors whitespace-nowrap shrink-0"
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

              {/* â”€â”€ BUILDER MODE â”€â”€ */}
              {useBuilder ? (
                <VariantBuilder
                  colors={builderColors}
                  sizes={builderSizes}
                  variants={variants}
                  images={images}
                  stdSizes={sugerida.valores}
                  sizeDim={opcionNombre}
                  sizePlaceholder={sugerida.placeholder}
                  sizeHint={sugerida.ayuda}
                  onSizeDimChange={(n) => { nombreTocadoRef.current = true; cambiarNombreOpcion(n); markDirty(); }}
                  onColorsChange={(c) => { setBuilderColors(c); setVariants(buildVariantsFromBuilder(c, builderSizes)); markDirty(); }}
                  onSizesChange={(s) => { setBuilderSizes(s); setVariants(buildVariantsFromBuilder(builderColors, s)); markDirty(); }}
                  onVariantChange={updateVariantField}
                  onAssignPhoto={assignPhotoToValue}
                />
              ) : (
                /* â”€â”€ MANUAL MODE â”€â”€ */
                <>
                  {/* Los NOMBRES de las opciones, una sola vez para todas las filas.
                      Antes salÃ­an de una tabla fija por rubro y no se podÃ­an tocar:
                      en Moda siempre "Talle" y "Color". AcÃ¡ se escriben, y el
                      cambio se aplica a todas las filas de una. */}
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    <span className="text-xs font-medium text-gray-500">Opciones:</span>
                    {/* `key` por POSICIÃ“N, no por nombre: si la clave fuera el nombre,
                        confirmar el cambio remontarÃ­a el input y se perderÃ­a el foco. */}
                    {dimsActuales.map((dim, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1 py-1">
                        <NombreOpcion
                          valor={dim}
                          otros={dimsActuales.filter(d => d !== dim)}
                          onCommit={(nuevo) => renameDim(dim, nuevo)}
                          ariaLabel={`Nombre de la opciÃ³n ${dim}`}
                          className="w-24 bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                        />
                        {dimsActuales.length > 1 && (
                          <button type="button" onClick={() => removeDim(dim)} aria-label={`Quitar la opciÃ³n ${dim}`}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                    {dimsActuales.length < MAX_OPCIONES && (
                      <button type="button" onClick={addDim}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Agregar opciÃ³n
                      </button>
                    )}
                  </div>
                  {variants.map((variant, idx) => (
                    <div key={idx} className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 rounded-xl">
                      {Object.keys(variant.attrs).map(dim => {
                        const isColor = esOpcionDeColor(dim);
                        const val = variant.attrs[dim] || "";
                        const circle = isColor ? colorPreview(val) : null;
                        return (
                          <div key={dim} className="flex-1 min-w-[80px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              {dim}
                              {isColor && (
                                <Tip text="EscribÃ­ el nombre del color (Rojo, Verde, Negro) o un cÃ³digo hex (#FF0000). Se muestra como cÃ­rculo de color en tu tienda." />
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
                                // Las sugerencias van en la opciÃ³n que NO es el color,
                                // sea como sea que se llame. Antes estaba clavado a
                                // "Talle", asÃ­ que renombrarla las hacÃ­a desaparecer.
                                list={!isColor && sugerida.valores.length > 0 ? `sug-${idx}-${dim}` : undefined}
                                className={`w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${circle ? "pl-8 pr-3" : "px-3"}`}
                              />
                              {!isColor && sugerida.valores.length > 0 && (
                                <datalist id={`sug-${idx}-${dim}`}>
                                  {sugerida.valores.map(s => (
                                    <option key={s} value={s} />
                                  ))}
                                </datalist>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* SKU, igual que en el constructor: sÃ³lo de lg para arriba,
                          donde la fila tiene lugar de sobra. Si estuviera acÃ¡ y no
                          allÃ¡, quiÃ©n puede cargarlo dependerÃ­a del modo. */}
                      <div className="hidden lg:block w-28 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                          SKU
                          <Tip align="right" text="Tu cÃ³digo interno para esta variante (ej: COL-40-BL). Es opcional. Sirve para encontrarla en tu depÃ³sito o cruzarla con la lista de tu proveedor, y se lo pasamos a Google para que sepa que la misma prenda vendida en dos lados es un solo producto." />
                        </label>
                        <input type="text" value={variant.sku} onChange={(e) => updateVariantField(idx, "sku", e.target.value)} placeholder="opcional" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="w-20 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                        <input type="number" value={variant.stock} onChange={(e) => updateVariantField(idx, "stock", e.target.value)} min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="w-24 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          Precio propio
                          <Tip align="right" text="Precio de esta variante especÃ­fica. Si lo completÃ¡s, reemplaza al precio base del producto. Dejalo vacÃ­o para usar el precio base." />
                        </label>
                        <input type="number" value={variant.price} onChange={(e) => updateVariantField(idx, "price", e.target.value)} min="0" placeholder="base" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="w-24 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                          Alerta stock
                          <Tip align="right" text="Te avisamos por mail cuando el stock de esta variante baje a este nÃºmero o menos. Dejalo vacÃ­o para usar el valor por defecto (5)." />
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
                  {valoresParaFoto.length > 0 && images.length > 0 && images.some(img => !img.variantValue) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                      <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>TenÃ©s variantes cargadas pero hay fotos sin asignar. ScrolleÃ¡ a <strong>ImÃ¡genes del producto</strong> (arriba) para asignar cada foto a {etiquetaFoto}.</span>
                    </div>
                  )}
                </>
              )}
            </div>}

            {isEditing && editingId && <StockHistoryPanel productId={editingId} />}

            {/* Ficha tÃ©cnica / Atributos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h2 className="font-semibold text-gray-900">
                      {storeTypeConfig.hideVariants ? "Ficha tÃ©cnica" : activeExtraFields.length > 0 ? "Especificaciones" : "Atributos del producto"}
                    </h2>
                    <Tip align="left" text={extraFieldsTip(store.tipoTienda || "ROPA")} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeExtraFields.length > 0
                      ? activeExtraFields.map((f) => f.label).join(", ")
                      : "NÃºmero de serie, peso, material, dimensiones, etc."}
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

              {/* Campos tipados del store type (Marca, AÃ±o, Km, etc.) + specs de la subcategorÃ­a */}
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
                            <option value="">SeleccionÃ¡...</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type && field.type !== "text" ? (
                          // NÃºmeros y fechas se quedan como input: el teclado que
                          // abre el telÃ©fono y los controles propios del tipo valen
                          // mÃ¡s que envolver un valor que nunca es largo.
                          <input
                            type={field.type}
                            value={val}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder || ""}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <CampoAuto
                            value={val}
                            onChange={onChange}
                            placeholder={field.placeholder || ""}
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
                  Sin atributos. UsÃ¡ esto para especificar datos tÃ©cnicos del producto.
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
                        placeholder="Ej: NÃºmero de serie, Peso, Material"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                      <CampoAuto
                        value={attr.value}
                        onChange={(v) => updateAttribute(idx, "value", v)}
                        placeholder="Ej: ABC-123, 2.5 kg, AlgodÃ³n"
                        ariaLabel="Valor del atributo"
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

            {/* â”€â”€ OptimizaciÃ³n para Google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                Plegada y opcional. Si no se toca, el tÃ­tulo y la descripciÃ³n se
                arman solos como siempre â€”el campo vacÃ­o se guarda como null, no
                como ""â€” asÃ­ que abrir esta secciÃ³n y cerrarla sin escribir nada
                no cambia absolutamente nada.

                Los contadores avisan cuÃ¡ndo Google va a CORTAR el texto, que no
                es lo mismo que un error: pasarse no rompe nada, solo se ve menos.
                Por eso el aviso es Ã¡mbar y no rojo, y el guardado nunca se frena
                por esto. */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setSeoAbierto((v) => !v)}
                aria-expanded={seoAbierto}
                className="flex w-full items-center gap-2 p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <Search className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="font-semibold text-gray-900">OptimizaciÃ³n para Google</span>
                <span className="text-xs text-gray-400">(opcional)</span>
                {seoTocado && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Personalizado
                  </span>
                )}
                <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 shrink-0 transition-transform ${seoAbierto ? "rotate-180" : ""}`} />
              </button>

              {seoAbierto && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Esto es lo que se lee en el <strong>resultado de Google</strong>, no en tu tienda.
                    Si lo dejÃ¡s vacÃ­o se arma solo con el nombre y la descripciÃ³n del producto â€” que
                    para la mayorÃ­a alcanza. Sirve cuando el producto se llama distinto de lo que la
                    gente busca: si le pusiste <em>&ldquo;Campera Modelo 47&rdquo;</em>, nadie va a
                    buscar eso.
                  </p>

                  {/* TÃ­tulo */}
                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700">
                        TÃ­tulo en Google
                      </label>
                      <span className={`text-xs tabular-nums ${form.seoTitle.length > SEO_TITULO_VISIBLE ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                        {form.seoTitle.length}/{SEO_TITULO_VISIBLE}
                      </span>
                    </div>
                    {/* Textarea y no input: el campo admite 60 caracteres y en una
                        pantalla de 360 un campo de una lÃ­nea muestra unos 30, asÃ­
                        que la mitad del tÃ­tulo quedaba fuera de vista mientras se
                        escribÃ­a. Dos renglones lo muestran entero.
                        Los saltos de lÃ­nea se sacan â€”siguen sin tener sentido en un
                        tÃ­tuloâ€” y Enter directamente no los inserta. */}
                    <textarea
                      id="seoTitle"
                      value={form.seoTitle}
                      onChange={(e) => { updateForm("seoTitle", e.target.value.replace(/\s*\n+\s*/g, " ")); markDirty(); }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                      placeholder={seoTituloAuto}
                      maxLength={SEO_TITULO_MAX}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    />
                    {form.seoTitle.length > SEO_TITULO_VISIBLE && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        Google muestra unos {SEO_TITULO_VISIBLE} caracteres â€” de acÃ¡ en adelante lo va a cortar con &ldquo;â€¦&rdquo;. Se guarda igual.
                      </p>
                    )}
                  </div>

                  {/* DescripciÃ³n */}
                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700">
                        DescripciÃ³n en Google
                      </label>
                      <span className={`text-xs tabular-nums ${form.seoDescription.length > SEO_DESC_VISIBLE ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                        {form.seoDescription.length}/{SEO_DESC_VISIBLE}
                      </span>
                    </div>
                    <textarea
                      id="seoDescription"
                      value={form.seoDescription}
                      onChange={(e) => { updateForm("seoDescription", e.target.value); markDirty(); }}
                      placeholder={seoDescripcionAuto}
                      maxLength={SEO_DESC_MAX}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    />
                    {form.seoDescription.length > SEO_DESC_VISIBLE && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        Google muestra unos {SEO_DESC_VISIBLE} caracteres â€” el resto no se va a ver. Se guarda igual.
                      </p>
                    )}
                  </div>

                  {/* CÃ³mo se verÃ­a */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">AsÃ­ se verÃ­a en Google</p>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-[13px] text-emerald-700 truncate">
                        tiendaapps.com â€º tienda â€º producto
                      </p>
                      <p className="text-[18px] text-[#1a0dab] leading-snug mt-0.5 break-words">
                        {recortar(form.seoTitle.trim() || seoTituloAuto, SEO_TITULO_VISIBLE)}
                      </p>
                      <p className="text-[13px] text-gray-600 leading-snug mt-1 break-words">
                        {recortar(form.seoDescription.trim() || seoDescripcionAuto, SEO_DESC_VISIBLE)}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                      Es una referencia: Google arma el resultado como quiere y a veces usa otro texto
                      de la pÃ¡gina si le parece que responde mejor a lo que buscaron.
                    </p>
                  </div>

                  {/* Avisos */}
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">Tres cosas para tener en cuenta</p>
                    <ul className="text-xs text-amber-800 space-y-1.5 leading-relaxed">
                      <li>
                        <strong>No es inmediato.</strong> Google tiene que volver a pasar por la pÃ¡gina.
                        Puede tardar de unos dÃ­as a un par de semanas.
                      </li>
                      <li>
                        <strong>Que no prometa lo que la ficha no tiene.</strong> Si el tÃ­tulo dice
                        &ldquo;envÃ­o gratis&rdquo; y en la tienda no lo hay, el que entra se va â€” y a
                        Google eso le baja el producto.
                      </li>
                      <li>
                        <strong>Un tÃ­tulo por producto.</strong> Si dos fichas tienen el mismo, compiten
                        entre sÃ­ y Google elige una sola.
                      </li>
                    </ul>
                  </div>

                  {seoTocado && (
                    <button
                      type="button"
                      onClick={() => {
                        updateForm("seoTitle", "");
                        updateForm("seoDescription", "");
                        markDirty();
                      }}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2"
                    >
                      Volver al automÃ¡tico
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Programar publicaciÃ³n */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Programar publicaciÃ³n</h2>
              </div>
              <p className="text-xs text-gray-400">
                Si elegÃ­s una fecha futura, el producto se guardarÃ¡ oculto y se publicarÃ¡ automÃ¡ticamente en esa fecha y hora.
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
                  Este producto se publicarÃ¡ el {new Date(publishAt).toLocaleString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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

                  {/* Badge de oferta manual (si el producto estÃ¡ en oferta) */}
                  {(() => {
                    const hasOffer = isOnSale && !!form.comparePrice && parseFloat(form.comparePrice) > parseFloat(form.price || "0");
                    if (hasOffer && form.offerBadge) return <OfferBadge badge={form.offerBadge as OfferBadgeKey} pct={discount || null} size="sm" />;
                    return null;
                  })()}

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

                  {/* CondiciÃ³n badge â€” solo para tipos que lo soportan */}
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

                  {/* Attributes preview â€” para hideVariants (AUTOS), mostrar fichas */}
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

                  {/* Variants preview â€” colores como cÃ­rculos, talles como chips */}
                  {!storeTypeConfig.hideVariants && Object.keys(attrPreviewGroups).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(attrPreviewGroups).map(([groupName, values]) => {
                        const isColor = esOpcionDeColor(groupName);
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

                  {/* Stock indicator â€” solo cuando no es hideVariants */}
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
