"use client";

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import {
  Edit, Eye, EyeOff, Package, Search, X, Percent, ChevronDown,
  Trash2, Copy, LayoutGrid, List, ChevronLeft, ChevronRight, QrCode, Car,
} from "lucide-react";
import VehicleStatusModal, { VehicleStatusBadge, type VehicleStatus, type VehicleStatusData } from "./VehicleStatusModal";
import StockAdjustModal from "./StockAdjustModal";
import { Boxes } from "lucide-react";
import { calcVehicleCostTotal } from "@/lib/margin";
import { SITE_URL } from "@/lib/site";

interface Variant { id: string; name: string; value: string; stock: number; lowStockThreshold?: number | null }

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
  vehicleStatus?: string | null;
  soldAt?: Date | string | null;
  soldPrice?: number | null;
  soldBuyerName?: string | null;
  expenses?: { monto: number }[];
}

/* Búsqueda, filtros, orden y página viven en la URL y los resuelve el servidor.
   Antes se hacía todo acá: la página mandaba hasta 200 productos y este
   componente los filtraba, ordenaba y paginaba en memoria. Con eso el producto
   201 no existía —ni buscándolo—, y el encabezado igual decía "200 productos en
   tu tienda" aunque hubiera 350. Ahora cada cambio de filtro es una navegación y
   lo que llega es exactamente la página que se ve. */
type Filtros = { q: string; cat: string; estado: string; stock: string; orden: string };
type Agregado = { productos: number; variantes: number; stock: number };

interface Props {
  products: Product[];
  storeSlug?: string;
  storeName?: string;
  storeType?: string;
  promotedIds?: string[];
  highlightIds?: string[];
  /** Todas las categorías de la tienda, no solo las de esta página. */
  categorias: string[];
  /** Resumen de la tienda entera por categoría: es el alcance real de las
      acciones en masa, que no se puede contar sobre la página que se ve. */
  porCategoria: Record<string, Agregado>;
  totales: Agregado;
  totalTienda: number;
  totalFiltrado: number;
  pagina: number;
  totalPaginas: number;
  filtros: Filtros;
}

function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return (parsed as (string | { url: string })[])
      .map(img => typeof img === "string" ? img : img?.url ?? "")
      .filter(Boolean);
  } catch { return []; }
}

const VALID_STOCK_FILTERS = ["all", "out", "low", "critical"];

/* ── Preferencia de vista: tabla o grilla ────────────────────────────────────
   Vive fuera del componente, como un "store" chiquito que se lee con
   `useSyncExternalStore`. Podría parecer mucho para un booleano, pero es la única
   forma limpia de leer algo que SÓLO existe en el navegador —`localStorage` y
   `window.innerWidth`— desde un componente que también se renderiza en el
   servidor:

     · Leerlo en el `useState` haría que el HTML del servidor no coincida con el
       del navegador.
     · Corregirlo con un `setState` dentro de un `useEffect` provoca un render en
       cascada (y React lo desaconseja explícitamente).

   `useSyncExternalStore` resuelve las dos: el servidor recibe "table" y el
   navegador el valor real, sin parpadeo raro ni render de más.                */
const CLAVE_VISTA = "tiendaapps:productos:vista";
// El mismo corte que usa el resto del proyecto para "pantalla angosta".
const ANCHO_ANGOSTO = 768;

let escuchasVista: (() => void)[] = [];
const suscribirVista = (cb: () => void) => {
  escuchasVista.push(cb);
  return () => { escuchasVista = escuchasVista.filter((f) => f !== cb); };
};

// El default por ancho se calcula UNA vez por sesión de página y queda cacheado.
// Sin esto, cualquier re-render posterior a un cambio de tamaño podría devolver
// otro valor y darla vuelta sola mientras se está trabajando.
let vistaPorAncho: "table" | "grid" | null = null;

const leerVista = (): "table" | "grid" => {
  try {
    const guardada = localStorage.getItem(CLAVE_VISTA);
    if (guardada === "table" || guardada === "grid") return guardada;
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se sigue sin preferencia.
  }
  vistaPorAncho ??= window.innerWidth < ANCHO_ANGOSTO ? "grid" : "table";
  return vistaPorAncho;
};

// En el servidor no hay pantalla que medir: siempre "table". El navegador corrige.
const leerVistaEnServidor = (): "table" | "grid" => "table";

const guardarVista = (v: "table" | "grid") => {
  try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* ver arriba */ }
  vistaPorAncho = v;
  escuchasVista.forEach((f) => f());
};

// Conjunto vacío estable: si se creara uno nuevo en cada render, la fila cambiaría
// de identidad todo el tiempo aunque no haya nada destacado.
const SIN_DESTACADOS: ReadonlySet<string> = new Set();

export default function ProductsTable({
  products: initialProducts, storeSlug = "", storeName = "", storeType = "",
  promotedIds = [], highlightIds = [],
  categorias, porCategoria, totales, totalTienda, totalFiltrado, pagina, totalPaginas, filtros,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showStock = storeType !== "AUTOS";
  const promotedSet = useMemo(() => new Set(promotedIds), [promotedIds]);
  const [products,      setProducts]      = useState(initialProducts);

  /* La lista se sigue guardando en estado para poder sacar una fila apenas se
     borra, sin esperar al servidor. Cuando llega una página nueva —otro filtro,
     otra página, un refresh— se vuelve a sembrar. Se ajusta durante el render y
     no con un efecto, para no encadenar un render de más. */
  const [productosPrevios, setProductosPrevios] = useState(initialProducts);
  if (initialProducts !== productosPrevios) {
    setProductosPrevios(initialProducts);
    setProducts(initialProducts);
  }

  /* Arma la URL del listado. Todo lo que no se pasa se mantiene como está, y
     cualquier cambio de filtro vuelve a la página 1: quedarse en la página 7
     después de achicar el resultado a dos productos deja la pantalla vacía sin
     explicación. */
  const urlCon = useCallback((cambios: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }
    if (!("page" in cambios)) params.delete("page");
    // Una marca de notificación no tiene por qué sobrevivir a un filtro nuevo.
    if (!("destacar" in cambios)) params.delete("destacar");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const irA = useCallback((cambios: Record<string, string>) => {
    router.push(urlCon(cambios), { scroll: false });
  }, [router, urlCon]);

  // ── Productos señalados desde una notificación ────────────────────────────
  // Venís de la campanita: el aviso hablaba de UN producto y acá hay una lista.
  // Sin marca no había forma de saber cuál era —peor todavía cuando varios están
  // en cero y se ven todos iguales—.
  //
  // La marca se apaga sola a los 6 segundos: es una ayuda para encontrarlo, no un
  // estado del producto. Si quedara fija, al rato serían dos productos amarillos
  // sin explicación.
  const claveDestacado = highlightIds.join(",");
  const highlightSet = useMemo(
    () => new Set(claveDestacado ? claveDestacado.split(",") : []),
    [claveDestacado]
  );

  // Se guarda cuál marca ya se apagó, en vez de copiar el conjunto al estado. Así
  // `destacados` se deriva y no hace falta sincronizar nada: si llega otra
  // notificación con otros ids, la clave cambia, deja de coincidir con la apagada y
  // la marca vuelve a encenderse sola.
  const [apagado, setApagado] = useState("");
  const destacados = apagado === claveDestacado ? SIN_DESTACADOS : highlightSet;

  useEffect(() => {
    if (highlightSet.size === 0) return;
    // Se busca por atributo en vez de con una ref: la marca la llevan tanto las
    // filas de la lista como las tarjetas de la grilla, y se puede llegar desde la
    // notificación con cualquiera de las dos vistas activa. Una sola consulta
    // encuentra la primera de las dos, sea cual sea.
    // El timeout deja que la tabla termine de pintar antes de medir dónde quedó.
    const irA = setTimeout(() => {
      document.querySelector("[data-destacado]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    const apagar = setTimeout(() => setApagado(claveDestacado), 6000);
    return () => { clearTimeout(irA); clearTimeout(apagar); };
  }, [highlightSet, claveDestacado]);
  /* El texto tipeado es lo único que sigue siendo estado local: navegar en cada
     tecla sería una consulta por letra. Se espera a que la persona deje de
     escribir y recién ahí se cambia la URL. `replace` y no `push` para que el
     historial no quede lleno de búsquedas a medio escribir. */
  const [search, setSearch] = useState(filtros.q);

  // Si la búsqueda cambió desde afuera (atrás del navegador, limpiar filtros),
  // el input se pone al día en vez de quedar mostrando lo viejo.
  const [busquedaPrevia, setBusquedaPrevia] = useState(filtros.q);
  if (filtros.q !== busquedaPrevia) {
    setBusquedaPrevia(filtros.q);
    setSearch(filtros.q);
  }

  useEffect(() => {
    // Comparar contra la URL en vez de llevar la cuenta aparte: cuando la
    // navegación termina, `filtros.q` ya es lo tipeado y el efecto no hace nada.
    if (search.trim() === filtros.q) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("q", search.trim());
      else params.delete("q");
      params.delete("page");
      params.delete("destacar");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [search, filtros.q, router, pathname, searchParams]);

  const categoryFilter = filtros.cat || "all";
  const statusFilter   = filtros.estado || "all";
  const stockFilter    = VALID_STOCK_FILTERS.includes(filtros.stock) ? filtros.stock : "all";
  const sortBy         = filtros.orden || "newest";
  // ── Tabla o grilla ────────────────────────────────────────────────────────
  // Arrancaba SIEMPRE en tabla, en cualquier pantalla. Y la tabla pide 640px de
  // ancho mínimo: en un celular de 360 quedaban 312px escondidos —casi la mitad—,
  // así que precio, stock, estado y todos los botones había que buscarlos
  // arrastrando de costado. La grilla, que ya era responsive (2 columnas en 360),
  // estaba a un toque, pero había que elegirla A MANO cada vez que se entraba.
  //
  // Ahora manda lo último que eligió la dueña; si nunca eligió, decide el ancho.
  // La mecánica está arriba, en el bloque de `CLAVE_VISTA`.
  const viewMode = useSyncExternalStore(suscribirVista, leerVista, leerVistaEnServidor);
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
  const [vehicleModal,  setVehicleModal]  = useState<{ id: string; name: string; status: VehicleStatus; costTotal: number } | null>(null);
  const [stockModal,    setStockModal]    = useState<Product | null>(null);
  const [showBulkStock, setShowBulkStock] = useState(false);
  const [bulkStockCategory, setBulkStockCategory] = useState("all");
  const [bulkStockMode,     setBulkStockMode]     = useState<"add" | "subtract" | "set">("add");
  const [bulkStockValue,    setBulkStockValue]    = useState("");
  const [bulkStockLoading,  setBulkStockLoading]  = useState(false);
  const [bulkStockError,    setBulkStockError]    = useState("");
  const [bulkStockSuccess,  setBulkStockSuccess]  = useState("");
  const [toast,         setToast]         = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;

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
    let line = "";
    const lines: string[] = [];
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

  const categories = categorias;
  const paginated = products;
  const page = pagina;
  const totalPages = totalPaginas;
  const hasFilters = Boolean(filtros.q || filtros.cat || filtros.estado || (filtros.stock && filtros.stock !== "all"));

  function clearFilters() {
    setSearch("");
    irA({ q: "", cat: "", estado: "", stock: "" });
  }

  function goPage(n: number) {
    irA({ page: String(Math.max(1, Math.min(totalPages, n))) });
  }

  /* Cuántos productos toca la acción en masa. Antes se contaba sobre la lista
     cargada; ahora que llegan de a veinte, el número lo manda el servidor —si
     no, "Aplicar a 20 productos" mentiría en una tienda de 300. */
  const bulkAffected = bulkCategory === "all" ? totalTienda : (porCategoria[bulkCategory]?.productos ?? 0);

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
    // Se saca al toque para que la fila desaparezca sin esperar, y se pide la
    // página de nuevo: ahora que vienen de a veinte, borrar uno hace entrar al
    // que estaba primero en la página siguiente, y los totales cambian.
    setProducts(prev => prev.filter(p => p.id !== id));
    router.refresh();
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
    // La copia se muestra ya mismo arriba de todo; el refresh la deja donde
    // realmente corresponde según el orden y los filtros que estén puestos.
    setProducts(prev => [copy, ...prev]);
    router.refresh();
  }

  function handleVehicleStatusSaved(data: VehicleStatusData) {
    setProducts(prev => prev.map(p =>
      p.id === vehicleModal?.id
        ? { ...p, vehicleStatus: data.vehicleStatus, isActive: data.isActive ?? p.isActive, soldAt: data.soldAt ?? null, soldPrice: data.soldPrice ?? null, soldBuyerName: data.soldBuyerName ?? null }
        : p
    ));
    const labels: Record<VehicleStatus, string> = { AVAILABLE: "Disponible", RESERVED: "Reservado", SOLD: "Vendido" };
    setToast(`Estado cambiado a "${labels[data.vehicleStatus]}"`);
    setTimeout(() => setToast(null), 3500);
    setVehicleModal(null);
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

  function handleStockSaved(productId: string, updatedVariants: { id: string; stock: number }[]) {
    const newStockById = new Map(updatedVariants.map(u => [u.id, u.stock]));
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, variants: p.variants.map(v => ({ ...v, stock: newStockById.get(v.id) ?? v.stock })) }
        : p
    ));
    setToast("Stock actualizado");
    setTimeout(() => setToast(null), 3000);
    setStockModal(null);
  }

  // ── Ajuste de stock en masa ───────────────────────────────────────────────
  // El ajuste trabaja por VARIANTE, no por producto: la API le aplica el cambio a
  // cada variante de cada producto que entre en la categoría. Es lo correcto —el
  // stock vive en la variante, no en el producto— pero la pantalla contaba
  // PRODUCTOS y decía "Aplicar a 3 productos" mientras le pegaba a 6 variantes.
  // Con un pantalón de 4 talles, "sumar 10" sumaba 40 unidades y nada lo avisaba.
  //
  // Repartir el valor entre las variantes (que "sumar 10" al pantalón sume 10 en
  // total) se descartó: no hay forma sensata de partir 10 entre 4 talles, y el
  // resto habría que dárselo a alguno por un criterio inventado. Para precisión
  // ya está el modal por producto; esta herramienta es para movidas amplias.
  //
  // Así que la cuenta no cambió: cambió lo que la pantalla dice y lo que valida.
  const MAX_STOCK_BULK = 100_000;

  /* El alcance sale del resumen del servidor, no de la lista que se ve. Al pasar
     a páginas de veinte, contar acá habría dicho "40 variantes" para una
     operación que toca 600 — y es un número que se lee justo antes de confirmar
     algo que no se deshace.
     A cambio se pierde el stock variante por variante, y eso cambia una sola
     cosa: en "restar", el piso en cero que hace el servidor (restar 10 a una
     variante con 5 la deja en 0, no en −5) no se puede replicar con totales. Por
     eso ahí el resultado se marca como estimado y el texto dice "aprox.": es
     preferible a repetir un número exacto que puede no ser cierto. */
  const bulkStockScope = useMemo(() => {
    const alcance = bulkStockCategory === "all"
      ? totales
      : (porCategoria[bulkStockCategory] ?? { productos: 0, variantes: 0, stock: 0 });
    const { productos, variantes, stock: stockActual } = alcance;

    const valor = bulkStockValue.trim() === "" ? NaN : Number(bulkStockValue);
    const valorOk = Number.isInteger(valor) && valor >= 0 && valor <= MAX_STOCK_BULK;

    const stockDespues = !valorOk ? stockActual
      : bulkStockMode === "add"      ? stockActual + valor * variantes
      : bulkStockMode === "set"      ? valor * variantes
      :                                Math.max(0, stockActual - valor * variantes);

    // En "restar" el número es un piso: el real es ese o más alto, según cuántas
    // variantes toquen el cero.
    const estimado = bulkStockMode === "subtract" && valorOk && valor > 0;

    return { productos, variantes, stockActual, stockDespues, estimado, valor, valorOk };
  }, [porCategoria, totales, bulkStockCategory, bulkStockMode, bulkStockValue]);

  // El error se calcula mientras se escribe, no recién al apretar el botón: así el
  // "1.5" avisa en el momento en vez de guardarse como 1 sin decir nada (antes se
  // hacía `parseInt`, que trunca en silencio y el servidor nunca veía el decimal).
  const bulkStockValidacion = (() => {
    if (bulkStockValue.trim() === "") return "";
    const v = Number(bulkStockValue);
    if (!Number.isFinite(v))          return "Escribí un número.";
    if (!Number.isInteger(v))         return "Tiene que ser un número entero: no existe medio talle en stock.";
    if (v < 0)                        return "No puede ser negativo. Para bajar stock usá “Restar”.";
    if (v > MAX_STOCK_BULK)           return `Demasiado alto. El máximo es ${MAX_STOCK_BULK.toLocaleString("es-AR")} por variante.`;
    return "";
  })();

  const bulkStockPuedeAplicar =
    !bulkStockLoading && bulkStockScope.valorOk && bulkStockScope.variantes > 0;

  async function applyBulkStock() {
    const { valor, valorOk, variantes, productos, stockActual, stockDespues, estimado } = bulkStockScope;
    if (!valorOk) { setBulkStockError(bulkStockValidacion || "Ingresá una cantidad válida."); return; }
    if (variantes === 0) { setBulkStockError("No hay variantes en esa categoría."); return; }

    // El aviso dice el número REAL: cuántas variantes se tocan y en cuánto queda el
    // stock. El de antes decía "¿sumar 10 unidades a 3 productos?" para una
    // operación que movía 60 unidades sobre 6 variantes.
    const diferencia = stockDespues - stockActual;
    const acciones: Record<typeof bulkStockMode, string> = {
      add:      `Sumar ${valor} a cada una`,
      subtract: `Restar ${valor} a cada una`,
      set:      `Fijar todas en ${valor}`,
    };
    const alcance = `${variantes} variante${variantes !== 1 ? "s" : ""} de ${productos} producto${productos !== 1 ? "s" : ""}`;
    const resumen = estimado
      ? `Stock total: ${stockActual} → ${stockDespues} u. o más (las variantes que no lleguen quedan en 0)`
      : `Stock total: ${stockActual} → ${stockDespues} u. (${diferencia >= 0 ? "+" : ""}${diferencia})`;
    // Vaciar el stock merece una advertencia aparte: es la única opción de acá que
    // saca de la venta todo lo alcanzado de una, y no se deshace con un botón.
    const aviso = bulkStockMode === "set" && valor === 0
      ? `\n\n⚠ Esto deja SIN STOCK ${alcance} y los saca de la venta.`
      : "";
    if (!confirm(`${acciones[bulkStockMode]}.\n\nAlcance: ${alcance}\n${resumen}${aviso}\n\n¿Confirmás?`)) return;

    setBulkStockLoading(true); setBulkStockError(""); setBulkStockSuccess("");
    const res = await fetch("/api/productos/bulk-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: bulkStockMode, value: valor, category: bulkStockCategory }),
    });
    const data = await res.json();
    setBulkStockLoading(false);
    if (!res.ok) { setBulkStockError(data.error || "Error al actualizar"); return; }
    // `updated` y `skipped` vienen contados en VARIANTES. Antes se los mostraba
    // como "productos": con 3 productos de 6 variantes decía "6 productos
    // actualizados". Y `skipped` ni se miraba: si otra operación tocaba el stock al
    // mismo tiempo, la variante se salteaba y nadie se enteraba.
    const n  = (data.updated   as number) ?? 0;
    const ig = (data.unchanged as number) ?? 0;
    const om = (data.skipped   as number) ?? 0;
    setBulkStockSuccess(
      (n === 0
        ? "Ninguna variante cambió"
        : `${n} variante${n !== 1 ? "s" : ""} actualizada${n !== 1 ? "s" : ""}`) +
      (ig > 0 ? ` · ${ig} ya estaba${ig !== 1 ? "n" : ""} en ese valor` : "") +
      (om > 0 ? ` · ${om} se salteó (la modificaron al mismo tiempo — probá de nuevo)` : "")
    );
    setBulkStockValue("");
    // Recargar para reflejar los nuevos valores de stock con precisión
    const refreshed = await fetch("/api/productos").then(r => r.json()).catch(() => null);
    if (refreshed?.products) setProducts(refreshed.products);
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
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-slide">
          <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {toast}
          </div>
        </div>
      )}

      {/* Stock adjust modal */}
      {stockModal && (
        <StockAdjustModal
          product={stockModal}
          onSave={(updatedVariants) => handleStockSaved(stockModal.id, updatedVariants)}
          onClose={() => setStockModal(null)}
        />
      )}

      {/* Vehicle status modal */}
      {vehicleModal && (
        <VehicleStatusModal
          productId={vehicleModal.id}
          productName={vehicleModal.name}
          currentStatus={vehicleModal.status}
          costTotal={vehicleModal.costTotal}
          onSave={handleVehicleStatusSaved}
          onClose={() => setVehicleModal(null)}
        />
      )}

      {/* Confirm delete modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 px-2 shrink-0">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
          <div className="shrink-0 flex border border-gray-200 rounded-xl overflow-hidden">
            {/* `cambiarVista` y no `setViewMode`: elegir a mano deja la preferencia
                guardada, así no hay que volver a elegirla en cada visita. */}
            <button type="button" onClick={() => guardarVista("table")} aria-pressed={viewMode === "table"} aria-label="Ver como lista"
              className={`p-2.5 transition-colors ${viewMode === "table" ? "bg-indigo-50 text-indigo-600" : "bg-white text-gray-400 hover:text-gray-600"}`}>
              <List className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => guardarVista("grid")} aria-pressed={viewMode === "grid"} aria-label="Ver como grilla"
              className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "bg-white text-gray-400 hover:text-gray-600"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fila 2: selects — 2 columnas en mobile, flex en desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <select value={categoryFilter} onChange={e => irA({ cat: e.target.value === "all" ? "" : e.target.value })}
            className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          <select value={statusFilter} onChange={e => irA({ estado: e.target.value === "all" ? "" : e.target.value })}
            className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
            <option value="all">Todos los estados</option>
            {showStock ? (
              <>
                <option value="active">Activos</option>
                <option value="hidden">Ocultos</option>
              </>
            ) : (
              <>
                <option value="AVAILABLE">Disponibles</option>
                <option value="RESERVED">Reservados</option>
                <option value="SOLD">Vendidos</option>
              </>
            )}
          </select>

          {showStock && (
            <select value={stockFilter} onChange={e => irA({ stock: e.target.value === "all" ? "" : e.target.value })}
              className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600">
              <option value="all">Todo el stock</option>
              <option value="out">Sin stock (0 u.)</option>
              <option value="low">Stock bajo (1–4 u.)</option>
              <option value="critical">Stock crítico (0–4 u.)</option>
            </select>
          )}

          <select value={sortBy} onChange={e => irA({ orden: e.target.value === "newest" ? "" : e.target.value })}
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

      {/* Bulk stock update */}
      {showStock && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <button type="button" onClick={() => { setShowBulkStock(v => !v); setBulkStockError(""); setBulkStockSuccess(""); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <Boxes className="h-4 w-4 text-emerald-500" />
            Ajustar stock en masa
            <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${showBulkStock ? "rotate-180" : ""}`} />
          </button>
          {showBulkStock && (
            <div className="border-t border-gray-100 px-4 py-4 space-y-3">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Categoría</label>
                  <select value={bulkStockCategory} onChange={e => setBulkStockCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">Todos los productos ({products.length})</option>
                    {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)} ({products.filter(p => p.category === c).length})</option>)}
                  </select>
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Acción</label>
                  <select value={bulkStockMode} onChange={e => setBulkStockMode(e.target.value as "add" | "subtract" | "set")}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="add">Sumar</option>
                    <option value="subtract">Restar</option>
                    <option value="set">Fijar en</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Cantidad</label>
                  <input type="number" value={bulkStockValue} onChange={e => { setBulkStockValue(e.target.value); setBulkStockError(""); setBulkStockSuccess(""); }}
                    placeholder="ej: 10" min={0} max={MAX_STOCK_BULK} step={1}
                    aria-invalid={!!bulkStockValidacion}
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      bulkStockValidacion
                        ? "border-red-300 focus:ring-red-400"
                        : "border-gray-200 focus:ring-indigo-500"
                    }`} />
                </div>
                {/* El botón cuenta VARIANTES, que es lo que la operación toca de
                    verdad. Decir "3 productos" para 6 variantes hacía que "sumar
                    10" pareciera +30 cuando eran +60. */}
                <button type="button" onClick={applyBulkStock} disabled={!bulkStockPuedeAplicar}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {bulkStockLoading
                    ? "Aplicando..."
                    : `Aplicar a ${bulkStockScope.variantes} variante${bulkStockScope.variantes !== 1 ? "s" : ""}`}
                </button>
              </div>

              {/* ── Qué va a pasar, antes de que pase ──
                  Se calcula con los datos que la tabla ya tiene en memoria, así que
                  no cuesta una consulta. Es la única forma de que se vea que un
                  producto con 4 talles se lleva 4 veces el valor escrito. */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-xs text-gray-600">
                {bulkStockScope.variantes === 0 ? (
                  <span className="text-gray-400">No hay variantes en esta categoría.</span>
                ) : (
                  <>
                    <span className="font-semibold text-gray-700">
                      {bulkStockScope.variantes} variante{bulkStockScope.variantes !== 1 ? "s" : ""}
                    </span>
                    {" de "}
                    {bulkStockScope.productos} producto{bulkStockScope.productos !== 1 ? "s" : ""}
                    {bulkStockScope.productos !== bulkStockScope.variantes && (
                      <span className="text-gray-400"> · un producto con varios talles o colores recibe el cambio en cada uno</span>
                    )}
                    {bulkStockScope.valorOk && (
                      <span className="block mt-1 text-gray-700">
                        Stock total: <strong>{bulkStockScope.stockActual}</strong>
                        {" → "}
                        <strong className={
                          bulkStockScope.stockDespues > bulkStockScope.stockActual ? "text-emerald-600"
                          : bulkStockScope.stockDespues < bulkStockScope.stockActual ? "text-red-500"
                          : "text-gray-700"
                        }>{bulkStockScope.stockDespues}</strong>
                        {" u. "}
                        <span className="text-gray-400">
                          ({bulkStockScope.stockDespues - bulkStockScope.stockActual >= 0 ? "+" : ""}
                          {bulkStockScope.stockDespues - bulkStockScope.stockActual})
                        </span>
                      </span>
                    )}
                  </>
                )}
              </div>

              {bulkStockValidacion && <p className="text-xs text-red-500">{bulkStockValidacion}</p>}
              {bulkStockError && <p className="text-xs text-red-500">{bulkStockError}</p>}
              {bulkStockSuccess && <p className="text-xs text-green-600 font-semibold">{bulkStockSuccess}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Referencia de stock y cuántos hay ──────────────────────────────
          Era un `flex` sin `flex-wrap`: al no entrar los cuatro textos, cada
          uno se encogía y partía por dentro, y quedaba "Sin / stock" arriba de
          "Bajo (1–4 / u.)". Ahora cada referencia es indivisible
          (`whitespace-nowrap shrink-0`) y el renglón envuelve entre una y otra,
          que es donde tiene que cortar.

          En angosto el conteo se va arriba y solo: es el dato que se mira, y
          con `ml-auto` terminaba empujado al final del renglón que le tocara. */}
      <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <span className="order-first font-medium text-gray-500 sm:order-last sm:font-normal sm:text-gray-400">
          {totalFiltrado} producto{totalFiltrado !== 1 ? "s" : ""}
          {hasFilters ? " encontrados" : ""}
          {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
        </span>
        {showStock && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-gray-500">Stock:</span>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />Sin stock
            </span>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400" />Bajo (1–4 u.)
            </span>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />Normal (5+ u.)
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {totalFiltrado === 0 ? (
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
            const inPromo = promotedSet.has(product.id);
            const inOferta = !!product.comparePrice && product.comparePrice > product.price;
            const destacado = destacados.has(product.id);
            return (
              // La vista de grilla lleva la misma marca que la de lista: se puede
              // llegar desde la notificación con cualquiera de las dos activa.
              <div
                key={product.id}
                data-destacado={destacado ? "" : undefined}
                className={`bg-white rounded-2xl overflow-hidden group transition-shadow ${
                  destacado
                    ? "border-2 border-amber-400 ring-2 ring-amber-200 animate-destacado"
                    : "border border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="relative aspect-square bg-gray-50">
                  {images[0] ? (
                    // Va <img> y no <Image>: la API guarda la URL de la imagen sin
                    // validar de qué host viene, así que puede ser cualquiera. Con
                    // next/image, un host que no esté en remotePatterns tira error y
                    // se cae toda la pantalla de productos. El onError de abajo está
                    // justamente porque acá se cuenta con imágenes rotas.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0]} alt={product.name} className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.opacity = "0"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-200" />
                    </div>
                  )}
                  {/* Marcador de promo/oferta (arriba-izq; en AUTOS ese lugar lo usa el badge del vehículo) */}
                  {showStock && (inPromo || inOferta) && (
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                      {inPromo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-600 text-white shadow-sm">Promo</span>}
                      {inOferta && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500 text-white shadow-sm">Oferta</span>}
                    </div>
                  )}
                  {showStock && <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white ${stockDot(stock)}`} />}
                  {!showStock && (
                    <div className="absolute top-2 left-2">
                      <VehicleStatusBadge status={(product.vehicleStatus ?? "AVAILABLE") as VehicleStatus} />
                    </div>
                  )}
                  {product.isActive === false && showStock && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-400 bg-white/80 px-2 py-1 rounded-lg">Oculto</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-400 capitalize truncate">{product.category}{product.subcategory ? ` › ${product.subcategory}` : ""}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2 leading-tight">{product.name}</p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">${product.price.toLocaleString("es-AR")}</p>
                  {/* Acciones: todos íconos a igual ancho (flex-1) — así ninguno queda
                      apretado ni "perdido" al final de la fila (incluido Eliminar). */}
                  <div className="mt-3 flex gap-1.5">
                    {!showStock && (
                      <button
                        onClick={() => setVehicleModal({ id: product.id, name: product.name, status: (product.vehicleStatus ?? "AVAILABLE") as VehicleStatus, costTotal: calcVehicleCostTotal(product.expenses ?? []) })}
                        className="flex-1 flex items-center justify-center py-2 rounded-lg text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="Cambiar estado">
                        <Car className="h-4 w-4" />
                      </button>
                    )}
                    <Link href={`/dashboard/productos/nuevo?edit=${product.id}`}
                      className="flex-1 flex items-center justify-center py-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      title="Editar">
                      <Edit className="h-4 w-4" />
                    </Link>
                    {storeSlug && product.isActive && (
                      <a href={`/tienda/${storeSlug}?p=${product.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center py-2 rounded-lg text-sky-500 bg-sky-50 hover:bg-sky-100 transition-colors"
                        title="Ver en tienda">
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                    {showStock && (
                      <button onClick={() => setStockModal(product)}
                        className="flex-1 flex items-center justify-center py-2 rounded-lg text-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        title="Ajustar stock">
                        <Boxes className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => openQr(product)} disabled={qrLoading}
                      className="flex-1 flex items-center justify-center py-2 rounded-lg text-violet-500 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-40"
                      title="Código QR">
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button onClick={() => duplicateProduct(product)} disabled={duplicatingId === product.id}
                      className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40"
                      title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => setPendingDelete({ id: product.id, name: product.name })} disabled={deletingId === product.id}
                      className="flex-1 flex items-center justify-center py-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                      title="Eliminar">
                      <Trash2 className="h-4 w-4" />
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
                const inPromo = promotedSet.has(product.id);
                const inOferta = !!product.comparePrice && product.comparePrice > product.price;
                const destacado = destacados.has(product.id);
                return (
                  // OJO: nada de `ring` ni `box-shadow` acá. La tabla hereda
                  // `border-collapse: collapse` de Tailwind, y con eso el navegador
                  // NO pinta la sombra de un <tr> — la primera versión de esto se
                  // veía igual que antes. Fondo y bordes sí se dibujan, así que la
                  // marca es fondo ámbar animado + una barra en el borde izquierdo
                  // de la primera celda.
                  <tr
                    key={product.id}
                    data-destacado={destacado ? "" : undefined}
                    className={destacado ? "bg-amber-50 animate-destacado-fila" : "hover:bg-gray-50/50 transition-colors"}
                  >
                    <td className={`px-6 py-4 ${destacado ? "border-l-4 border-amber-500" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                          {images[0] && (
                            // Mismo motivo que arriba: URL de host no validado.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={images[0]} alt={product.name} className="relative w-full h-full object-cover z-10"
                              onError={e => { e.currentTarget.style.opacity = "0"; }} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                            {inPromo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">Promo</span>}
                            {inOferta && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600">Oferta</span>}
                          </div>
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
                      {!showStock ? (
                        <VehicleStatusBadge status={(product.vehicleStatus ?? "AVAILABLE") as VehicleStatus} />
                      ) : product.isActive && storeSlug ? (
                        <a href={`/tienda/${storeSlug}?p=${product.id}`} target="_blank" rel="noopener noreferrer"
                          title="Ver en tienda"
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          <Eye className="h-3 w-3" /> Activo
                        </a>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {product.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {product.isActive ? "Activo" : "Oculto"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {!showStock && (
                          <button
                            onClick={() => setVehicleModal({ id: product.id, name: product.name, status: (product.vehicleStatus ?? "AVAILABLE") as VehicleStatus, costTotal: calcVehicleCostTotal(product.expenses ?? []) })}
                            className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                            title="Cambiar estado"
                          >
                            <Car className="h-3.5 w-3.5" /> Estado
                          </button>
                        )}
                        <Link href={`/dashboard/productos/nuevo?edit=${product.id}`}
                          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                          <Edit className="h-3.5 w-3.5" /> Editar
                        </Link>
                        {showStock && (
                          <button onClick={() => setStockModal(product)}
                            className="flex items-center gap-1.5 text-sm text-emerald-500 hover:text-emerald-700 font-medium" title="Ajustar stock">
                            <Boxes className="h-3.5 w-3.5" /> Stock
                          </button>
                        )}
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
