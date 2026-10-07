"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleCard, AM_MODAL_CSS } from "@/components/store/auto/AutoVehicleShared";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { getContrastColor } from "@/contexts/EditContext";
import { linksLegales, type ClaveLegal } from "@/lib/politicas-tienda";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { CAPAS } from "@/lib/capas-tienda";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { monedaDeTienda, precioEn, conPuntos, sinPuntos } from "@/lib/monedaVehiculo";
import { usaHoras } from "@/lib/fichaVehiculo";
import {
  filtrarVehiculos, opcionesDeFiltro, filtroDesdeUrl, filtroAUrl, filtroVacio, cuantosFiltros,
  ORDENES, linkAVehiculo, type FiltroVehiculos, type OrdenVehiculos,
} from "@/lib/filtroVehiculos";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";

type RawVehicle = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  category?: string;
  description?: string | null;
  images?: string;
  attributes?: string;
  reelUrls?: string;
  variants?: StorefrontProduct["variants"];
  badge?: string;
  vehicleStatus?: string | null;
};

function mapVehicle(raw: RawVehicle): StorefrontProduct {
  let images: string[] = [];
  let imageItems: { url: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed.map((img: string | { url?: string }) => typeof img === "string" ? { url: img } : { url: img?.url ?? "" }).filter((x: { url: string }) => x.url);
    images = imageItems.map(x => x.url);
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: { key?: string }) => a?.key) : [];
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false,
    category: raw.category ?? "general",
    gender: "unisex",
    description: raw.description ?? null,
    images, imageItems,
    reelUrls, opciones: [],
    variants: raw.variants ?? [],
    attributes,
    badge: raw.badge ?? undefined,
    // Sin esto, /vehiculos no mostraba la etiqueta de "Reservado" (06/10/26).
    vehicleStatus: raw.vehicleStatus ?? null,
  };
}

// Brand characteristic colors for the logo row
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  toyota:          { bg: "#eb0a1e", text: "#fff" },
  ford:            { bg: "#003478", text: "#fff" },
  chevrolet:       { bg: "#c9a84c", text: "#000" },
  honda:           { bg: "#cc0000", text: "#fff" },
  volkswagen:      { bg: "#001e50", text: "#fff" },
  vw:              { bg: "#001e50", text: "#fff" },
  renault:         { bg: "#efdf00", text: "#000" },
  fiat:            { bg: "#cc0000", text: "#fff" },
  peugeot:         { bg: "#0055a4", text: "#fff" },
  citroen:         { bg: "#ef0000", text: "#fff" },
  "citroën":       { bg: "#ef0000", text: "#fff" },
  nissan:          { bg: "#c3002f", text: "#fff" },
  hyundai:         { bg: "#002c5f", text: "#fff" },
  kia:             { bg: "#05141f", text: "#fff" },
  jeep:            { bg: "#006241", text: "#fff" },
  mercedes:        { bg: "#222", text: "#fff" },
  "mercedes-benz": { bg: "#222", text: "#fff" },
  bmw:             { bg: "#1c69d4", text: "#fff" },
  audi:            { bg: "#bb0a14", text: "#fff" },
  yamaha:          { bg: "#003087", text: "#fff" },
  kawasaki:        { bg: "#4f9f1f", text: "#fff" },
  suzuki:          { bg: "#204399", text: "#fff" },
  harley:          { bg: "#ff6600", text: "#fff" },
  "harley-davidson": { bg: "#ff6600", text: "#fff" },
  ram:             { bg: "#1a1a1a", text: "#fff" },
  dodge:           { bg: "#cc0000", text: "#fff" },
  mitsubishi:      { bg: "#c00", text: "#fff" },
  subaru:          { bg: "#003087", text: "#fff" },
  mazda:           { bg: "#910a0c", text: "#fff" },
  volvo:           { bg: "#003057", text: "#fff" },
  chery:           { bg: "#c00", text: "#fff" },
  geely:           { bg: "#1a3f6e", text: "#fff" },
  byd:             { bg: "#1565c0", text: "#fff" },
  mg:              { bg: "#c00", text: "#fff" },
  lifan:           { bg: "#0055a4", text: "#fff" },
};

// Simple Icons CDN — SVGs con fondo transparente, shadow sigue el contorno real del logo
const SIMPLE_ICONS: Record<string, { slug: string; hex: string }> = {
  toyota:            { slug: "toyota",         hex: "EB0A1E" },
  ford:              { slug: "ford",           hex: "003478" },
  chevrolet:         { slug: "chevrolet",      hex: "C9A84C" },
  honda:             { slug: "honda",          hex: "CC0000" },
  volkswagen:        { slug: "volkswagen",     hex: "001E50" },
  vw:                { slug: "volkswagen",     hex: "001E50" },
  renault:           { slug: "renault",        hex: "EFDF00" },
  fiat:              { slug: "fiat",           hex: "CC0000" },
  peugeot:           { slug: "peugeot",        hex: "0055A4" },
  citroen:           { slug: "citroen",        hex: "EF0000" },
  "citroën":         { slug: "citroen",        hex: "EF0000" },
  nissan:            { slug: "nissan",         hex: "C3002F" },
  hyundai:           { slug: "hyundai",        hex: "002C5F" },
  kia:               { slug: "kia",            hex: "05141F" },
  jeep:              { slug: "jeep",           hex: "006241" },
  "mercedes-benz":   { slug: "mercedesbenz",   hex: "222222" },
  mercedes:          { slug: "mercedesbenz",   hex: "222222" },
  bmw:               { slug: "bmw",            hex: "1C69D4" },
  audi:              { slug: "audi",           hex: "BB0A14" },
  yamaha:            { slug: "yamaha",         hex: "003087" },
  kawasaki:          { slug: "kawasaki",       hex: "4F9F1F" },
  suzuki:            { slug: "suzuki",         hex: "204399" },
  "harley-davidson": { slug: "harleydavidson", hex: "FF6600" },
  harley:            { slug: "harleydavidson", hex: "FF6600" },
  mitsubishi:        { slug: "mitsubishi",     hex: "CC0000" },
  subaru:            { slug: "subaru",         hex: "003087" },
  mazda:             { slug: "mazda",          hex: "910A0C" },
  volvo:             { slug: "volvo",          hex: "003057" },
  byd:               { slug: "byd",            hex: "1565C0" },
  dodge:             { slug: "dodge",          hex: "CC0000" },
};

const BRAND_DOMAINS: Record<string, string> = {
  ram:    "ramtrucks.com",
  chery:  "chery.com",
  geely:  "geely.com",
  mg:     "mgmotor.com",
  lifan:  "lifan.com",
};

/** De una tabla de marcas: igual, o la marca empieza con ella ("Ford Motor" → ford).
    Antes alcanzaba con que una CONTUVIERA a la otra: "Ram" encontraba a "Ramírez
    Motos" y una marca de una letra encontraba cualquiera. */
function deTabla<T>(tabla: Record<string, T>, brand: string): T | undefined {
  const key = brand.toLowerCase().trim().replace(/\s+/g, " ");
  if (tabla[key]) return tabla[key];
  const conGuion = key.replace(/ /g, "-");
  if (tabla[conGuion]) return tabla[conGuion];
  return Object.entries(tabla).find(([k]) => k.length > 1 && (key.startsWith(k + " ") || key.startsWith(k + "-")))?.[1];
}

/** El logo, sólo de las marcas conocidas. Antes, a una desconocida se le pedía el
    ícono a Google con "<marca>.com" y volvía el globo genérico (5.5 de la
    auditoría): sin logo conocido va el círculo con la sigla. */
function getBrandLogoUrl(brand: string): string | null {
  const si = deTabla(SIMPLE_ICONS, brand);
  if (si) return `https://cdn.simpleicons.org/${si.slug}/${si.hex}`;
  const domain = deTabla(BRAND_DOMAINS, brand);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

function getBrandStyle(brand: string, accent: string): { bg: string; text: string } {
  return deTabla(BRAND_COLORS, brand) ?? { bg: accent, text: getContrastColor(accent) === "dark" ? "#111" : "#fff" };
}

function brandAbbr(name: string): string {
  if (name.length <= 3) return name.toUpperCase();
  // "Mercedes-Benz" → "MB", "Volkswagen" → "VW" style
  const specials: Record<string, string> = {
    "volkswagen": "VW", "mercedes-benz": "MB", "mercedes": "MB",
    "harley-davidson": "HD", "harley": "HD",
  };
  const key = name.toLowerCase().trim();
  if (specials[key]) return specials[key];
  // "John Deere" → "JD", "Can-Am" → "CA"; una sola palabra, las tres primeras.
  const palabras = name.trim().split(/[\s-]+/).filter(Boolean);
  if (palabras.length > 1) return palabras.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return name.trim().substring(0, 3).toUpperCase();
}

const NAVY = "#0d1f3c";

/** Los topes que se ofrecen en "hasta cuántos km / horas". */
const TOPES_KM = [0, 10_000, 30_000, 50_000, 80_000, 120_000, 200_000, 300_000];
const TOPES_HORAS = [500, 1_000, 2_000, 3_000, 5_000, 8_000];
/** Si la dirección trajo un tope que no está en la lista, se suma (si no, el select no lo muestra). */
const conActual = (topes: number[], actual: number | null) =>
  actual == null || topes.includes(actual) ? topes : [...topes, actual].sort((a, b) => a - b);

/** Montado mientras la ventana de tasar / avisame está abierta: "atrás" la cierra. */
function AtrasCierra({ cerrar }: { cerrar: () => void }) {
  useCerrarConAtras(cerrar);
  return null;
}

function VehiculosPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const slug         = params?.slug as string;
  const fromEditor   = searchParams?.get("from") === "editor";

  const [products,    setProducts]    = useState<StorefrontProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [storeName,   setStoreName]   = useState("Tienda");
  const [accent,      setAccent]      = useState("#c9a227");
  const [currency,    setCurrency]    = useState("ARS");
  const [templateId,  setTemplateId]  = useState("");
  const [navBgColor,  setNavBgColor]  = useState<string | null>(null);
  const [storeId,     setStoreId]     = useState<string | undefined>(undefined);
  const [isOwner,     setIsOwner]     = useState(false);
  const [imgErrors,    setImgErrors]    = useState<Record<string, boolean>>({});
  const [hoveredMarca, setHoveredMarca] = useState<string | null>(null);
  // Qué políticas legales linkea el pie. Ver `lib/politicas-tienda`.
  const [legales,    setLegales]    = useState<ClaveLegal[] | undefined>(undefined);
  const [showReport, setShowReport] = useState(false);

  // Un solo filtro (ver lib/filtroVehiculos), que viaja en la dirección: los
  // templates linkean acá con `?tipo=camiones` y el comprador lo puede compartir.
  const [filtro, setFiltro] = useState<FiltroVehiculos>(() => filtroDesdeUrl(searchParams, "ARS"));
  const cambiar = useCallback((c: Partial<FiltroVehiculos>) => setFiltro(f => ({ ...f, ...c })), []);
  const [errorCarga, setErrorCarga] = useState(false);
  const [noEsDeAutos, setNoEsDeAutos] = useState(false);
  const [intento, setIntento] = useState(0);
  // En el celular el panel de filtros se abre con un botón; en la compu está siempre.
  const [verFiltros, setVerFiltros] = useState(false);
  // "Tasá tu usado" (ver lib/tasaciones) y "Avisame si entra" (ver lib/busquedas),
  // en la misma ventana (06/10/26).
  const [dialogo,        setDialogo]     = useState<null | "tasar" | "avisame">(null);
  // Igual que el modal del vehículo: el fondo no se mueve detrás, Escape cierra
  // (escribiendo, primero suelta el campo) y el fondo cierra sólo si el toque
  // EMPEZÓ ahí (seleccionar texto y soltar afuera no pierde lo escrito).
  const tocoElFondo = useRef(false);
  const cerrarDialogo = useCallback(() => setDialogo(null), []);
  useEffect(() => {
    if (!dialogo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) t.blur();
      else setDialogo(null);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [dialogo]);

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!vivo) return;
        if (!data?.store) { setErrorCarga(true); return; }
        // Esta pantalla es sólo del rubro autos (5.5 de la auditoría): en una
        // tienda de ropa mostraba "Catálogo de vehículos" con remeras adentro.
        if (data.store.tipoTienda && data.store.tipoTienda !== "AUTOS") { setNoEsDeAutos(true); return; }
        setErrorCarga(false);
        setStoreName(data.store.name ?? "Tienda");
        setStoreId(data.store.id);
        setIsOwner(!!data.isOwner);
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.colors?.accent)          setAccent(cfg.colors.accent);
          if (cfg.currency) {
            setCurrency(cfg.currency);
            // El "precio hasta" arranca en la moneda principal, salvo que la dirección diga otra.
            if (!searchParams?.get("moneda")) cambiar({ moneda: monedaDeTienda(cfg) });
          }
          if (cfg.templateId ?? cfg.template) setTemplateId(cfg.templateId ?? cfg.template);
          if (cfg.sectionColors?.navBg)    setNavBgColor(cfg.sectionColors.navBg);
        } catch {}
        if (Array.isArray(data.legales)) setLegales(data.legales);
        setProducts((data.store.products ?? []).map(mapVehicle));
      })
      // Antes un error de carga terminaba en "Sin resultados": el comprador
      // creía que la tienda no tenía nada.
      .catch(() => { if (vivo) setErrorCarga(true); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams sólo se mira al cargar
  }, [slug, intento, cambiar]);

  useEffect(() => {
    if (!loading) document.title = `${storeName} — Catálogo de vehículos`;
  }, [loading, storeName]);

  // El filtro a la dirección, sin sumar al historial (atrás vuelve a la tienda).
  useEffect(() => {
    const sp = filtroAUrl(filtro, monedaDeTienda({ currency }));
    if (fromEditor) sp.set("from", "editor");
    const s = sp.toString();
    const nueva = `${window.location.pathname}${s ? `?${s}` : ""}`;
    if (nueva !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", nueva);
  }, [filtro, currency, fromEditor]);

  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  const filtered = useMemo(() => filtrarVehiculos(products, filtro, currency), [products, filtro, currency]);
  const hasActiveFilter = cuantosFiltros(filtro) > 0;
  const tipoActivo = opciones.tipos.find(t => t.valor === filtro.tipo);
  const marcaActiva = opciones.marcas.find(m => m.valor === filtro.marca);
  const conHoras = filtro.tipo ? usaHoras(filtro.tipo) : false;
  // Los años que se ofrecen: de la tienda, del más nuevo al más viejo.
  const anios = opciones.anioMin != null && opciones.anioMax != null
    ? Array.from({ length: opciones.anioMax - opciones.anioMin + 1 }, (_, i) => opciones.anioMax! - i)
    : [];
  // Lo que está puesto, como chips para sacar de a uno.
  type Puesto = { id: string; label: string; sacar: Partial<FiltroVehiculos> };
  const puestos = ([
    filtro.q.trim() && { id: "q", label: `"${filtro.q.trim()}"`, sacar: { q: "" } },
    filtro.tipo && { id: "tipo", label: tipoActivo?.label ?? filtro.tipo, sacar: { tipo: null, horasHasta: null } },
    filtro.marca && { id: "marca", label: marcaActiva?.label ?? filtro.marca, sacar: { marca: null } },
    filtro.anioDesde != null && { id: "desde", label: `Desde ${filtro.anioDesde}`, sacar: { anioDesde: null } },
    filtro.anioHasta != null && { id: "hasta", label: `Hasta ${filtro.anioHasta}`, sacar: { anioHasta: null } },
    filtro.kmHasta != null && { id: "km", label: `Hasta ${filtro.kmHasta.toLocaleString("es-AR")} km`, sacar: { kmHasta: null } },
    filtro.horasHasta != null && { id: "horas", label: `Hasta ${filtro.horasHasta.toLocaleString("es-AR")} h`, sacar: { horasHasta: null } },
    filtro.precioHasta != null && { id: "precio", label: `Hasta ${precioEn(filtro.precioHasta, filtro.moneda)}`, sacar: { precioHasta: null } },
    filtro.combustible && { id: "comb", label: filtro.combustible, sacar: { combustible: null } },
    filtro.transmision && { id: "trans", label: filtro.transmision, sacar: { transmision: null } },
    filtro.ciudad && { id: "ciudad", label: filtro.ciudad, sacar: { ciudad: null } },
  ] as (Puesto | false | null | "")[]).filter((x): x is Puesto => !!x);
  const limpiar = () => setFiltro(f => ({ ...filtroVacio(f.moneda), orden: f.orden }));

  const isAD = templateId === "auto-drive";

  const S   = "#ffffff";
  const T   = isAD ? "#111827" : "#1a2744";
  const MID = isAD ? "#6b7280" : "#7a8fa6";
  const BG  = "#ffffff";
  const borderFaint = isAD ? "rgba(0,0,0,0.04)" : "rgba(27,63,110,0.07)";
  const border      = isAD ? "#e5e7eb" : "rgba(27,63,110,0.15)";

  // Header: si el usuario configuró un navBg, se usa ese; si no, según el template
  const headerBg       = navBgColor ?? (isAD ? "#ffffff" : NAVY);
  const headerIsDark   = getContrastColor(headerBg) === "light";
  const headerLinkColor  = headerIsDark ? "rgba(255,255,255,0.55)" : "#9ca3af";
  const headerLinkHover  = headerIsDark ? "#ffffff"                : "#374151";
  const headerCountColor = headerIsDark ? "rgba(255,255,255,0.4)"  : "#6b7280";
  const headerBorderLine = headerIsDark ? "none"                   : "1px solid #e5e7eb";
  const headerBoxShadow  = headerIsDark ? "0 2px 16px rgba(0,0,0,0.25)" : "0 1px 12px rgba(0,0,0,0.07)";
  const activeTabBg      = isAD ? accent : NAVY;
  const activeTabBorder  = isAD ? accent : NAVY;

  // Campos y botones de 44 px de alto: se tocan bien con el dedo (5.7).
  const campoStyle: React.CSSProperties = { background:S, border:`1px solid ${border}`, color:T, minHeight:44, width:"100%",
    padding:"0 12px", fontSize:13, borderRadius:4, boxSizing:"border-box", fontFamily:"inherit" };
  const botonSecundario: React.CSSProperties = { background:S, border:`1px solid ${border}`, color:T, padding:"0 16px", minHeight:44,
    fontSize:12, fontWeight:700, cursor:"pointer", borderRadius:4, fontFamily:"inherit" };
  const botonPrincipal: React.CSSProperties = { background:accent, color: getContrastColor(accent) === "dark" ? "#111" : "#fff", border:"none",
    padding:"0 18px", minHeight:44, fontSize:13, fontWeight:700, cursor:"pointer", borderRadius:6, fontFamily:"inherit" };
  // Cuántos filtros del panel hay puestos (para el botón "Filtros (2)" del celular).
  const cuantosPanel = puestos.filter(x => !["q", "tipo", "marca"].includes(x.id)).length;

  const campo = (label: string, id: string, control: React.ReactNode) => (
    <div key={id} style={{ display:"flex", flexDirection:"column", gap:6, minWidth:0 }}>
      <label htmlFor={id} style={{ fontSize:10, letterSpacing:2, color:MID, textTransform:"uppercase", fontWeight:600 }}>{label}</label>
      {control}
    </div>
  );
  const vacio = (titulo: string, texto: string, acciones: React.ReactNode) => (
    <div style={{ textAlign:"center", padding:"64px 16px", background:S, borderRadius:8, border:`1px solid ${borderFaint}` }}>
      <p style={{ fontSize:22, fontWeight:700, color:T, margin:"0 0 8px", overflowWrap:"anywhere" }}>{titulo}</p>
      <p style={{ fontSize:13, color:MID, margin:0 }}>{texto}</p>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginTop:18 }}>{acciones}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: T, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Un solo hijo, no dos.
          Estaba escrito `<style>{AM_MODAL_CSS}{`…`}</style>`: dos expresiones
          hermanas adentro del mismo <style>. React trata cada una como un nodo de
          texto distinto y en el HTML del servidor las separa con un comentario
          `<!-- -->`; al hidratar, el navegador ya había fundido el contenido del
          <style> en uno solo, así que no coincidían y toda la página se volvía a
          renderizar del lado del cliente ("Hydration failed").
          Era el único de los tres pantallas públicas de la tienda con este error
          —el listado y la portada arman su CSS en un solo literal— y venía de
          antes de esta rama. */}
      <style>{`${AM_MODAL_CSS}
        .st-scroll::-webkit-scrollbar{display:none}.st-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .av-grid { display:grid; gap:20px; grid-template-columns:1fr }
        @media(min-width:560px){ .av-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:900px){ .av-grid { grid-template-columns:repeat(3,1fr) } }
        @media(min-width:1200px){ .av-grid { grid-template-columns:repeat(4,1fr) } }
        .av-oculto { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap }
        .av-solo-ancho { display:none }
        @media(min-width:640px){ .av-solo-ancho { display:inline } .av-solo-celu { display:none !important } }
        .av-panel { display:none; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:20px }
        .av-panel.abierto { display:grid }
        @media(min-width:640px){ .av-panel { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) } }
        @media(min-width:1024px){ .av-panel { grid-template-columns:repeat(6,minmax(0,1fr)) } }
      `}</style>

      {/* ── HEADER ──
          A 360 no entraban "← VOLVER A LA TIENDA", el nombre y la cuenta en una
          fila de 64 px (5.5 de la auditoría): en el celular queda la flecha sola
          (con su nombre para el lector de pantalla) y la cuenta pasa al título. */}
      <div style={{ background: headerBg, boxShadow: headerBoxShadow,
        borderBottom: headerBorderLine, position:"sticky", top:0, zIndex:CAPAS.encabezadoListado }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 clamp(12px,4vw,32px)", height:60,
          display:"flex", alignItems:"center", gap:12 }}>
          <Link href={fromEditor ? "/dashboard/configuracion" : `/tienda/${slug}`}
            aria-label={fromEditor ? "Volver al editor" : "Volver a la tienda"}
            style={{ color: headerLinkColor, textDecoration:"none", fontSize:11, letterSpacing:2,
              textTransform:"uppercase", display:"flex", alignItems:"center", gap:8, minHeight:44, minWidth:44,
              flexShrink:0, transition:"color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color=headerLinkHover)}
            onMouseLeave={e => (e.currentTarget.style.color=headerLinkColor)}>
            <span aria-hidden="true" style={{ fontSize:16 }}>←</span>
            <span className="av-solo-ancho" aria-hidden="true">{fromEditor ? "Volver al editor" : "Volver a la tienda"}</span>
          </Link>
          <span style={{ flex:1, minWidth:0, textAlign:"center", fontSize:17, fontWeight:900,
            letterSpacing: headerIsDark ? 3 : -0.5, textTransform: headerIsDark ? "uppercase" : "none", color: accent,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {storeName}
          </span>
          <span className="av-solo-ancho" style={{ fontSize:12, color: headerCountColor, letterSpacing:1, flexShrink:0 }}>
            {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
          </span>
          {/* En el celular, del mismo ancho que la flecha: el nombre queda centrado. */}
          <span className="av-solo-celu" aria-hidden="true" style={{ width:44, flexShrink:0 }} />
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(24px,4vw,44px) clamp(16px,4vw,32px)" }}>

        {/* ── TÍTULO + ACCIONES ── */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
          marginBottom:24, flexWrap:"wrap", gap:16 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:10, letterSpacing:5, color:accent,
              textTransform:"uppercase", margin:"0 0 10px", fontWeight:700 }}>
              Catálogo completo
            </p>
            <h1 style={{ fontSize:"clamp(26px,4vw,40px)", margin:"0 0 6px", color:T,
              lineHeight:1.1, fontWeight:900, letterSpacing:-0.5, overflowWrap:"anywhere" }}>
              {tipoActivo ? `${tipoActivo.label}${marcaActiva ? ` ${marcaActiva.label}` : ""}` : marcaActiva ? `Vehículos ${marcaActiva.label}` : "Todos los vehículos"}
            </h1>
            <p role="status" style={{ fontSize:12, color:MID, margin:0, letterSpacing:1 }}>
              {loading ? "Cargando…" : hasActiveFilter
                ? `${filtered.length} de ${products.length} vehículo${products.length !== 1 ? "s" : ""}`
                : `${filtered.length} vehículo${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <button type="button" onClick={() => setDialogo("avisame")} style={botonSecundario}>
              Avisame si entra
            </button>
            <button type="button" onClick={() => setDialogo("tasar")} style={botonSecundario}>
              Tasá tu usado
            </button>
          </div>
        </div>

        {/* ── BUSCAR + ORDENAR ── */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:20 }}>
          <div style={{ position:"relative", flex:"1 1 240px", minWidth:0 }}>
            <label htmlFor="av-buscar" className="av-oculto">Buscar vehículo</label>
            <input id="av-buscar" type="search" value={filtro.q} maxLength={80}
              onChange={e => cambiar({ q: e.target.value })}
              onKeyDown={e => { if (e.key === "Escape") { if (filtro.q) cambiar({ q: "" }); else e.currentTarget.blur(); } }}
              placeholder="Buscar marca, modelo, año…"
              style={{ ...campoStyle, width:"100%", padding:"11px 40px", fontSize:14 }}
              onFocus={e => (e.target.style.borderColor=accent)}
              onBlur={e => (e.target.style.borderColor=border)} />
            <svg aria-hidden="true" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
              opacity:0.4, pointerEvents:"none" }}
              width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {filtro.q && (
              <button type="button" onClick={() => cambiar({ q: "" })} aria-label="Borrar la búsqueda"
                style={{ position:"absolute", right:2, top:"50%", transform:"translateY(-50%)", width:40, height:40,
                  background:"none", border:"none", color:MID, cursor:"pointer", fontSize:18, padding:0 }}>
                ×
              </button>
            )}
          </div>
          <label htmlFor="av-orden" className="av-oculto">Ordenar por</label>
          <select id="av-orden" value={filtro.orden} onChange={e => cambiar({ orden: e.target.value as OrdenVehiculos })}
            style={{ ...campoStyle, flex:"1 1 160px", width:"auto", cursor:"pointer" }}>
            {ORDENES.map(o => (
              <option key={o.id} value={o.id}>
                {o.id === "km_asc" ? (conHoras ? "Menos horas de uso" : "Menos kilómetros") : o.label}
              </option>
            ))}
          </select>
          <button type="button" className="av-solo-celu" aria-expanded={verFiltros} aria-controls="av-panel"
            onClick={() => setVerFiltros(v => !v)}
            style={{ ...botonSecundario, borderColor: verFiltros ? accent : border }}>
            {verFiltros ? "Ocultar filtros" : `Filtros${cuantosPanel ? ` (${cuantosPanel})` : ""}`}
          </button>
        </div>

        {/* ── TIPO ── sólo los que la tienda tiene, con cuántos hay. */}
        {opciones.tipos.length > 1 && (
          <div role="group" aria-label="Tipo de vehículo" className="st-scroll"
            style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:20, paddingBottom:2,
              WebkitOverflowScrolling:"touch" } as React.CSSProperties}>
            {[{ valor: "", label: "Todos", cuantos: products.length }, ...opciones.tipos].map(t => {
              const activo = (filtro.tipo ?? "") === t.valor;
              return (
                <button key={t.valor || "todos"} type="button" aria-pressed={activo}
                  onClick={() => cambiar(t.valor
                    ? { tipo: t.valor, ...(usaHoras(t.valor) ? { kmHasta: null } : { horasHasta: null }) }
                    : { tipo: null, horasHasta: null })}
                  style={{ background: activo ? activeTabBg : S, color: activo ? getContrastColor(activeTabBg) === "dark" ? "#111" : "#fff" : T,
                    border:`1px solid ${activo ? activeTabBorder : border}`, minHeight:44,
                    padding:"9px 18px", fontSize:12, letterSpacing:0.5, cursor:"pointer",
                    fontWeight:600, transition:"all 0.2s", borderRadius:4, flexShrink:0, whiteSpace:"nowrap", fontFamily:"inherit" }}>
                  {t.label} <span style={{ opacity:0.6, fontWeight:500 }}>{t.cuantos}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── LOGOS DE MARCAS ── agrupadas sin distinguir mayúsculas ("Ford" = "FORD "). */}
        {opciones.marcas.length > 1 && (
          <div style={{ marginBottom:24 }}>
            <p id="av-marcas" style={{ fontSize:10, letterSpacing:3, color:MID, textTransform:"uppercase",
              margin:"0 0 12px", fontWeight:600 }}>
              Filtrar por marca
            </p>
            <div role="group" aria-labelledby="av-marcas" className="st-scroll" style={{ display:"flex", gap:20, overflowX:"auto",
              paddingBottom:12, paddingTop:12, paddingLeft:4, paddingRight:4,
              WebkitOverflowScrolling:"touch", scrollSnapType:"x mandatory" } as React.CSSProperties}>
              {/* Chip "Todas" — círculo de color con drop-shadow flotante */}
              {(() => {
                const isTodas = !filtro.marca;
                const isHov   = hoveredMarca === "__todas__";
                const shadow  = isTodas
                  ? `drop-shadow(0 8px 20px ${accent}80) drop-shadow(0 2px 6px rgba(0,0,0,0.18))`
                  : isHov
                    ? "drop-shadow(0 10px 22px rgba(0,0,0,0.22)) drop-shadow(0 3px 8px rgba(0,0,0,0.12))"
                    : "drop-shadow(0 5px 14px rgba(0,0,0,0.16)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))";
                const tf = isTodas ? "scale(1.15) translateY(-5px)" : isHov ? "translateY(-4px)" : "translateY(0)";
                return (
                  <button type="button" className="brand-chip" aria-pressed={isTodas} onClick={() => cambiar({ marca: null })}
                    onMouseEnter={() => setHoveredMarca("__todas__")}
                    onMouseLeave={() => setHoveredMarca(null)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0,
                      scrollSnapAlign:"start", fontFamily:"inherit" }}>
                    <svg aria-hidden="true" width={52} height={52} viewBox="0 0 52 52" fill="none"
                      style={{ display:"block", filter: shadow, transform: tf,
                        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                      <rect x="6"  y="6"  width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="30" y="6"  width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="6"  y="30" width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                      <rect x="30" y="30" width="16" height="16" rx="3" fill={isTodas ? accent : "#a0b4cc"}/>
                    </svg>
                    <span style={{ fontSize:10, fontWeight: isTodas ? 700 : 400,
                      color: isTodas ? accent : MID, letterSpacing:0.5 }}>
                      Todas
                    </span>
                  </button>
                );
              })()}

              {opciones.marcas.map(({ valor, label: marca, cuantos }) => {
                const bc      = getBrandStyle(marca, accent);
                const isActive = filtro.marca === valor;
                const abbr    = brandAbbr(marca);
                const isHov   = hoveredMarca === valor;
                const logo    = imgErrors[valor] ? null : getBrandLogoUrl(marca);
                const shadow  = isActive
                  ? `drop-shadow(0 8px 22px ${accent}90) drop-shadow(0 2px 6px rgba(0,0,0,0.18))`
                  : isHov
                    ? "drop-shadow(0 10px 22px rgba(0,0,0,0.22)) drop-shadow(0 3px 8px rgba(0,0,0,0.12))"
                    : "drop-shadow(0 5px 14px rgba(0,0,0,0.16)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))";
                const tf = isActive ? "scale(1.15) translateY(-5px)" : isHov ? "translateY(-4px)" : "translateY(0)";
                return (
                  <button key={valor} type="button" className="brand-chip" aria-pressed={isActive}
                    aria-label={`${marca} (${cuantos})`} title={marca}
                    onClick={() => cambiar({ marca: isActive ? null : valor })}
                    onMouseEnter={() => setHoveredMarca(valor)}
                    onMouseLeave={() => setHoveredMarca(null)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0,
                      scrollSnapAlign:"start", fontFamily:"inherit" }}>
                    {logo ? (
                      /* Logo flotando sin fondo — drop-shadow sigue el contorno */
                      // eslint-disable-next-line @next/next/no-img-element -- logos de un CDN externo, chicos
                      <img src={logo} alt="" width={56} height={56}
                        style={{ objectFit:"contain", display:"block", borderRadius:10,
                          filter: shadow, transform: tf,
                          transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
                        onError={() => setImgErrors(prev => ({...prev, [valor]: true}))}
                      />
                    ) : (
                      /* Sin logo conocido: círculo de color con la sigla */
                      <div aria-hidden="true" style={{ width:56, height:56, borderRadius:"50%", background:bc.bg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        filter: shadow, transform: tf,
                        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                        <span style={{ fontSize:13, fontWeight:900, color:bc.text,
                          letterSpacing:0.5, lineHeight:1 }}>{abbr}</span>
                      </div>
                    )}
                    <span aria-hidden="true" style={{ fontSize:10, fontWeight: isActive ? 700 : 400,
                      color: isActive ? accent : MID, letterSpacing:0.3,
                      maxWidth:68, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", textAlign:"center" }}>
                      {marca}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MÁS FILTROS ── año, km u horas, precio en su moneda, combustible,
            transmisión y zona. Cada uno aparece sólo si hay de dónde elegir. */}
        <div id="av-panel" className={`av-panel${verFiltros ? " abierto" : ""}`}>
          {anios.length > 1 && campo("Año desde", "av-desde",
            <select id="av-desde" value={filtro.anioDesde ?? ""} style={campoStyle}
              onChange={e => cambiar({ anioDesde: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Cualquiera</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>)}
          {anios.length > 1 && campo("Año hasta", "av-hasta",
            <select id="av-hasta" value={filtro.anioHasta ?? ""} style={campoStyle}
              onChange={e => cambiar({ anioHasta: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Cualquiera</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>)}
          {conHoras
            ? campo("Horas de uso hasta", "av-horas",
              <select id="av-horas" value={filtro.horasHasta ?? ""} style={campoStyle}
                onChange={e => cambiar({ horasHasta: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Cualquiera</option>
                {conActual(TOPES_HORAS, filtro.horasHasta).map(h => <option key={h} value={h}>{h.toLocaleString("es-AR")} h</option>)}
              </select>)
            : campo("Kilómetros hasta", "av-km",
              <select id="av-km" value={filtro.kmHasta ?? ""} style={campoStyle}
                onChange={e => cambiar({ kmHasta: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Cualquiera</option>
                {conActual(TOPES_KM, filtro.kmHasta).map(k => <option key={k} value={k}>{k === 0 ? "0 km" : `${k.toLocaleString("es-AR")} km`}</option>)}
              </select>)}
          {campo("Precio hasta", "av-precio",
            <div style={{ display:"flex", gap:6 }}>
              {opciones.monedas.length > 1 ? (
                <select aria-label="Moneda del precio" value={filtro.moneda} style={{ ...campoStyle, width:"auto", flexShrink:0, padding:"0 8px" }}
                  onChange={e => cambiar({ moneda: e.target.value === "USD" ? "USD" : "ARS" })}>
                  <option value="ARS">$</option>
                  <option value="USD">USD</option>
                </select>
              ) : (
                <span aria-hidden="true" style={{ alignSelf:"center", fontSize:13, color:MID, flexShrink:0 }}>
                  {filtro.moneda === "USD" ? "USD" : "$"}
                </span>
              )}
              <input id="av-precio" inputMode="numeric" autoComplete="off" placeholder="Sin tope"
                value={filtro.precioHasta != null ? conPuntos(String(filtro.precioHasta)) : ""}
                onChange={e => { const d = sinPuntos(e.target.value).slice(0, 12); cambiar({ precioHasta: d && Number(d) > 0 ? Number(d) : null }); }}
                style={{ ...campoStyle, minWidth:0 }} />
            </div>)}
          {opciones.combustibles.length > 1 && campo("Combustible", "av-comb",
            <select id="av-comb" value={filtro.combustible ?? ""} style={campoStyle}
              onChange={e => cambiar({ combustible: e.target.value || null })}>
              <option value="">Cualquiera</option>
              {opciones.combustibles.map(o => <option key={o.valor} value={o.label}>{o.label} ({o.cuantos})</option>)}
            </select>)}
          {opciones.transmisiones.length > 1 && campo("Transmisión", "av-trans",
            <select id="av-trans" value={filtro.transmision ?? ""} style={campoStyle}
              onChange={e => cambiar({ transmision: e.target.value || null })}>
              <option value="">Cualquiera</option>
              {opciones.transmisiones.map(o => <option key={o.valor} value={o.valor}>{o.label} ({o.cuantos})</option>)}
            </select>)}
          {opciones.ciudades.length > 1 && campo("Zona", "av-zona",
            <select id="av-zona" value={filtro.ciudad ?? ""} style={campoStyle}
              onChange={e => cambiar({ ciudad: e.target.value || null })}>
              <option value="">Todas las zonas</option>
              {opciones.ciudades.map(o => <option key={o.valor} value={o.label}>{o.label} ({o.cuantos})</option>)}
            </select>)}
        </div>

        {/* ── LO QUE ESTÁ PUESTO ── se saca de a uno. */}
        {puestos.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:24 }}>
            {puestos.map(p => (
              <button key={p.id} type="button" onClick={() => cambiar(p.sacar)} aria-label={`Sacar el filtro ${p.label}`}
                style={{ display:"inline-flex", alignItems:"center", gap:8, minHeight:36, maxWidth:"100%",
                  padding:"6px 8px 6px 12px", borderRadius:100, border:`1px solid ${accent}55`, background:`${accent}12`,
                  color:T, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.label}</span>
                <span aria-hidden="true" style={{ fontSize:14, lineHeight:1, opacity:0.6 }}>×</span>
              </button>
            ))}
            <button type="button" onClick={limpiar}
              style={{ background:"none", border:"none", color:MID, fontSize:12, cursor:"pointer",
                minHeight:36, padding:"6px 8px", textDecoration:"underline", fontFamily:"inherit" }}>
              Limpiar todo
            </button>
          </div>
        )}

        {/* ── GRILLA ── un error de carga y "no hay nada" son cosas distintas. */}
        {loading ? (
          <div role="status" style={{ textAlign:"center", padding:"80px 0", color:MID, fontSize:14 }}>
            Cargando vehículos…
          </div>
        ) : noEsDeAutos ? (
          vacio("Esta tienda no tiene catálogo de vehículos", "Lo que vende está en su página principal.",
            <Link href={`/tienda/${slug}`} style={{ ...botonPrincipal, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>Ir a la tienda</Link>)
        ) : errorCarga ? (
          vacio("No pudimos cargar los vehículos", "Revisá la conexión y probá de nuevo.",
            <button type="button" style={botonPrincipal}
              onClick={() => { setLoading(true); setErrorCarga(false); setIntento(i => i + 1); }}>
              Reintentar
            </button>)
        ) : filtered.length === 0 ? (
          vacio(products.length === 0 ? "Todavía no hay vehículos publicados" : "Ningún vehículo con esos filtros",
            products.length === 0 ? "Dejanos lo que buscás y te avisamos cuando entre." : "Probá sacando alguno, o dejanos lo que buscás.",
            <>
              {hasActiveFilter && (
                <button type="button" onClick={limpiar} style={botonSecundario}>Limpiar filtros</button>
              )}
              {/* El mejor momento para "Avisame si entra": buscó y no estaba. */}
              <button type="button" onClick={() => setDialogo("avisame")} style={{ ...botonPrincipal, maxWidth:"100%", overflowWrap:"anywhere" }}>
                {marcaActiva || filtro.q.trim() ? `Avisame si entra un ${marcaActiva?.label ?? filtro.q.trim()}` : "Avisame si entra lo que busco"}
              </button>
            </>)
        ) : (
          <div className="av-grid">
            {filtered.map(p => (
              <VehicleCard key={p.id} product={p} accent={accent} currency={currency}
                theme="light" href={linkAVehiculo(slug, p.id, fromEditor)} />
            ))}
          </div>
        )}

      </div>

      {/* ── PIE LEGAL ──
          Era la única pantalla pública de una tienda sin políticas a la vista: la
          portada, el listado y la ficha ya las linkeaban, y acá —donde se mira el
          precio de un auto— no había nada. Los títulos van en versión autos
          ("Condiciones de la operación", "Cómo se coordina la entrega"): esta
          pantalla existe solo para tiendas de vehículos, que no envían ni aceptan
          devoluciones, y prometer "Política de envíos" sería mentirle al que
          compra. */}
      <footer style={{ borderTop:`1px solid ${borderFaint}`, background:S,
        padding:"28px clamp(16px,4vw,32px)", marginTop:8 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", flexWrap:"wrap",
          justifyContent:"center", alignItems:"center", gap:"8px 18px" }}>
          {linksLegales(slug, legales, { esAutos: true, enEditor: fromEditor }).map(({ clave, label, href }) => (
            <a key={clave} href={href}
              style={{ fontSize:11, color:MID, textDecoration:"none", letterSpacing:0.3 }}>
              {label}
            </a>
          ))}
          <button onClick={() => setShowReport(true)}
            style={{ fontSize:11, color:MID, background:"none", border:"none",
              cursor:"pointer", padding:0, textDecoration:"underline", letterSpacing:0.3 }}>
            Reportar tienda
          </button>
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}

      {dialogo && <AtrasCierra cerrar={cerrarDialogo} />}
      {dialogo && (
        <div role="dialog" aria-modal="true" aria-label={dialogo === "tasar" ? "Tasá tu usado" : "Avisame si entra"} onMouseDown={e => { tocoElFondo.current = e.target === e.currentTarget; }}
          onClick={e => { if (tocoElFondo.current && e.target === e.currentTarget) setDialogo(null); tocoElFondo.current = false; }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:CAPAS.critico, display:"flex",
            alignItems:"flex-start", justifyContent:"center", padding:"20px 16px", overflowY:"auto" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, width:"100%", maxWidth:480, margin:"auto 0", padding:16, position:"relative" }}>
            <button type="button" onClick={() => setDialogo(null)} aria-label="Cerrar"
              style={{ position:"absolute", top:10, right:10, width:32, height:32, borderRadius:"50%", border:"none",
                background:"#f5f5f5", color:"#666", fontSize:18, cursor:"pointer", zIndex:1 }}>×</button>
            {dialogo === "tasar"
              ? <TasacionVehiculo storeId={storeId} accent={accent} isOwner={isOwner} abiertoDeEntrada />
              : <BusquedaVehiculo storeId={storeId} accent={accent} isOwner={isOwner} marcaInicial={marcaActiva?.label ?? filtro.q.trim()} />}
          </div>
        </div>
      )}

    </div>
  );
}

export default function VehiculosPage() {
  return (
    <Suspense>
      <VehiculosPageInner />
    </Suspense>
  );
}
