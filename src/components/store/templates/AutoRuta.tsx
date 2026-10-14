"use client";
/**
 * AUTO RUTA — creado el 15/10/26 (fase 3 de TEMPLATES-AUTOS.md).
 *
 * El de trabajo: camiones, utilitarios y maquinaria, claro. Flavio eligió la
 * estructura entre tres ("por trabajo"): la portada no tiene buscador ni
 * showroom, pregunta "¿para qué lo necesitás?" y muestra lo que sirve (ver
 * ruta/SelectorRuta y lib/trabajoVehiculo). El catálogo es una planilla de
 * flota (ruta/CatalogoRuta), la página de cada unidad una hoja de trabajo
 * (ruta/FichaRuta) y la agencia una hoja ordenada (ruta/AgenciaRuta).
 *
 * Se comparte la LÓGICA con los otros templates de autos (filtros, favoritos,
 * tasación, búsquedas, videos, novedades por mail, el pie); el aspecto es
 * propio (carpeta `ruta/`). Los campos editables usan los mismos nombres que
 * los otros: lo que la dueña ya escribió aparece igual si cambia de template.
 */
import { ContenidoPieAutos, FRASE_PIE } from "@/components/store/auto/PieDeAutos";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { irASeccion } from "@/components/store/templates/shared/irASeccion";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { barraMs, type ImageOverride } from "@/types/store-config";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useVistaTemplate } from "@/components/store/templates/shared/useVistaTemplate";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { WaIcon, AM_MODAL_CSS, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe, monedaDeTienda, type Moneda } from "@/lib/monedaVehiculo";
import { opcionesDeFiltro, filtrarVehiculos, filtroVacio, filtroDesdeUrl, filtroAUrl, linkAVehiculos, linkAVehiculo, type FiltroVehiculos } from "@/lib/filtroVehiculos";
import { CAPAS } from "@/lib/capas-tienda";
import { videosDeVehiculos } from "@/components/store/auto/videosDeVehiculos";
import { armarPreguntasAutos } from "@/lib/preguntasFrecuentes";
import { fotoLiviana } from "@/lib/foto-liviana";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { esTrabajo, esTamano, type Trabajo, type Tamano } from "@/lib/trabajoVehiculo";
import { hayAgenciaCargada } from "@/components/store/auto/agencia/piezasAgencia";
import { FONDO, PAPEL, TINTA, TENUE, LINEA, ASFALTO, TITULAR, CUERPO, ACENTO_RUTA, rayaDeRuta } from "@/components/store/templates/ruta/estiloRuta";
import { TARJETA_RUTA_CSS } from "@/components/store/templates/ruta/TarjetaRuta";
import { SelectorRuta, SELECTOR_RUTA_CSS, type SeleccionRuta } from "@/components/store/templates/ruta/SelectorRuta";
import { CatalogoRuta, CATALOGO_RUTA_CSS } from "@/components/store/templates/ruta/CatalogoRuta";
import { AgenciaRuta, AGENCIA_RUTA_CSS } from "@/components/store/templates/ruta/AgenciaRuta";
import { VideosRuta, VIDEOS_RUTA_CSS } from "@/components/store/templates/ruta/VideosRuta";

const RT_SECTION_IDS = ["rt-tasar", "rt-videos", "rt-preguntas", "rt-novedades", "rt-nosotros"];
const HERO_DE_FABRICA = "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1920&q=80";
const NOSOTROS_DE_FABRICA = "https://images.unsplash.com/photo-1591768793355-74d04bb6608f?auto=format&fit=crop&w=1200&q=80";

/** El fondo de un bloque: color o foto elegidos por la dueña, y el color de letra que le corresponde. */
function fondoDe(ov: ImageOverride | undefined, color: string) {
  const conFoto = !!ov?.url;
  const oscuro = conFoto ? ov!.overlayType !== "light" : getContrastColor(color) === "light";
  return {
    estilo: conFoto
      ? { backgroundImage: `url(${fotoLiviana(ov!.url, 1920)})`, backgroundSize: "cover", backgroundPosition: `${ov!.posX ?? 50}% ${ov!.posY ?? 50}%` } as React.CSSProperties
      : { background: color } as React.CSSProperties,
    tinta: oscuro ? "#ffffff" : TINTA,
    tenue: oscuro ? "rgba(255,255,255,0.7)" : TENUE,
    linea: oscuro ? "rgba(255,255,255,0.16)" : LINEA,
    oscuro,
  };
}

function Velo({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
    background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.6})` : `rgba(22,25,29,${ov.overlayOpacity ?? 0.6})` }} />;
}

/** El título de cada bloque: número de cartel, título en mayúscula angosta y una raya gruesa. */
function Titulo({ acento, tinta, num, titulo, derecha }: { acento: string; tinta: string; num: string; titulo: React.ReactNode; derecha?: React.ReactNode }) {
  const sobre = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  return (
    <div data-ef="titulo" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap", paddingBottom: 12, borderBottom: `3px solid ${tinta}` }}>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ flexShrink: 0, minWidth: 40, height: 40, padding: "0 6px", boxSizing: "border-box", borderRadius: 3, background: acento, color: sobre, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: TITULAR, fontSize: 20, fontWeight: 700 }}>{num}</span>
        <h2 style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(26px,3.6vw,42px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", color: tinta, minWidth: 0, overflowWrap: "anywhere" }}>{titulo}</h2>
      </div>
      {derecha}
    </div>
  );
}

export default function AutoRuta() {
  const config = useStoreConfig();
  const pushBell = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, hiddenSections } = useEditContext();
  const ocultas = config?.hiddenSections ?? hiddenSections;
  const ocultasCelu = config?.hiddenSectionsCelular ?? [];
  // Sin datos de agencia, "La agencia" baja al bloque de la portada (ver hayAgenciaCargada); si está oculto, no se ofrece.
  const conAgencia = hayAgenciaCargada(config);
  const menuAncho = [["Por trabajo", "trabajo", ""], ["Planilla", "planilla", ""], ["Tomamos tu usado", "tasar", "rt-tasar"], ["La agencia", "nosotros", conAgencia ? "" : "rt-nosotros"], ["Contacto", "contacto", ""]]
    .filter(([, , b]) => !b || !ocultas.includes(b));
  // Ver AutoVolt: el menú desplegable también se usa en tablet; lo oculto sólo en el celular se marca igual que el bloque.
  const menuCelu = menuAncho.map(([lbl, id, b]) => [lbl, id, ocultasCelu.includes(b) ? "si" : ""]);
  const isPreview = !!config?.previewFill;
  useEfectosAlBajar(!editMode);
  const enEditor = isPreview && !config?.demoPublica;
  const isOwner = !!config?.isOwner;
  const accent = config?.colors.accent ?? ACENTO_RUTA;
  const sobreAcento = getContrastColor(accent) === "dark" ? TINTA : "#fff";
  const currency = config?.currency ?? "ARS";
  const principal = monedaDeTienda({ currency });
  const slug = config?.slug ?? "";
  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  const videos = useMemo(() => videosDeVehiculos(products), [products]);
  const storeName = config?.storeName ?? "AUTO RUTA";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "", message: "" };
  const waLink = whatsapp.enabled ? linkWhatsApp(whatsapp.number, whatsapp.message) : null;

  const iovr = config?.imageOverrides ?? {};
  const sc = config?.sectionColors ?? {};
  const fondo = (campo: string, def: string) => ({ ...fondoDe(iovr[`sectionbg_${campo}`], sc[campo] ?? def), ov: iovr[`sectionbg_${campo}`] });
  const fTrabajo = fondo("bgTrabajo", FONDO);
  const fTasar = fondo("bgTasar", PAPEL);
  const fVideos = fondo("bgVideos", FONDO);
  const fPreguntas = fondo("bgPreguntas", PAPEL);
  const fNovedades = fondo("bgNovedades", FONDO);
  const fNosotros = fondo("bgNosotros", PAPEL);
  const fPie = fondo("bgFooter", ASFALTO);
  const heroUrl = iovr["heroBackground"]?.url ?? HERO_DE_FABRICA;
  const nosotrosUrl = iovr["nosotrosImage"]?.url ?? NOSOTROS_DE_FABRICA;

  const navBg = sc["navBg"] ?? PAPEL;
  const navOscura = getContrastColor(navBg) === "light";
  const navTinta = navOscura ? "#ffffff" : TINTA;
  const navTenue = navOscura ? "rgba(255,255,255,0.72)" : TENUE;
  const navLinea = navOscura ? "rgba(255,255,255,0.14)" : LINEA;

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /* La página de la unidad. Desde el editor lleva `t=auto-ruta`: si no, se
     dibujaba con el template GUARDADO y Ruta se mezclaba con otro. */
  const paginaDeId = (id: string) => `${linkAVehiculo(slug, id, isPreview)}${isPreview ? "&t=auto-ruta" : ""}`;
  const paginaDe = (p: StorefrontProduct) => paginaDeId(p.id);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx] = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avisame, setAvisame] = useState(false);
  const cerrarAvisame = useCallback(() => setAvisame(false), []);
  const [abierta, setAbierta] = useState<number | null>(0);

  const DEFAULTS = ["Ficha técnica de cada unidad", "Tomamos tu usado en parte de pago", "Te avisamos si entra lo que buscás"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 32;
  const NAV_H = 64;
  const msBarra = barraMs(config?.promoBanner?.intervalMs);
  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), msBarra);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length, msBarra]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    // Los links viejos (`?producto=`, de WhatsApp, del PDF o del panel) van a la página de la unidad.
    if (id && products.some(pr => pr.id === id)) router.replace(`${linkAVehiculo(slug, id, isPreview)}${isPreview ? "&t=auto-ruta" : ""}`);
  }, [products, router, slug, isPreview]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setCuentaOpen(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const fav = useFavoritosVehiculos(isPreview);
  const favorites = fav.favoritos;
  const toggleFavorite = fav.alternar;
  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const searchResults = searchQuery.trim().length > 0 ? filtrarVehiculos(products, { ...filtroVacio(), q: searchQuery }, currency) : [];

  // Escape cierra el buscador, los favoritos y el menú.
  useEffect(() => {
    if (!searchOpen && !favoritesOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) { setSearchOpen(false); setSearchQuery(""); } else if (favoritesOpen) setFavoritesOpen(false);
      else setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, favoritesOpen, menuOpen]);

  const todos = linkAVehiculos(slug, {}, isPreview);

  /* ── Portada, planilla o agencia ─────────────────────────────────────────────
     La planilla vive en `/vehiculos` y la agencia en `/nosotros`, dibujadas por
     el template entre su barra y su pie (ver useVistaTemplate). */
  const vista = useVistaTemplate({ isPreview, slug, templateId: "auto-ruta", catalogo: "vehiculos" });
  const [pedido, setPedido] = useState<{ filtro: FiltroVehiculos; trabajo: Trabajo | null; tamano: Tamano | null } | null>(null);
  /* Entrando por un link con filtro: se lee UNA vez (ver AutoVolt). */
  const parametros = useSearchParams();
  const [busquedaDeEntrada] = useState(() => isPreview ? "" : parametros?.toString() ?? "");
  const deEntrada = useMemo(() => {
    const sp = new URLSearchParams(busquedaDeEntrada);
    const t = sp.get("trabajo");
    const z = sp.get("tamano");
    return { filtro: filtroDesdeUrl(sp, principal), trabajo: esTrabajo(t) ? t : null, tamano: esTamano(z) ? z : null };
  }, [busquedaDeEntrada, principal]);
  const enPlanilla = pedido ?? deEntrada;
  const abrirPlanilla = (c: { filtro?: Partial<FiltroVehiculos>; trabajo?: Trabajo | null; tamano?: Tamano | null } = {}) => {
    const f = { ...filtroVacio(principal), ...(c.filtro ?? {}) };
    const p = { filtro: f, trabajo: c.trabajo ?? null, tamano: c.tamano ?? null };
    setPedido(p);
    const sp = filtroAUrl(f, principal);
    if (p.trabajo) sp.set("trabajo", p.trabajo);
    if (p.tamano) sp.set("tamano", p.tamano);
    vista.irAlCatalogo(sp.toString());
  };
  const alClicTodos = (e: React.MouseEvent, c?: Partial<FiltroVehiculos>) => { e.preventDefault(); abrirPlanilla({ filtro: c }); };
  const desdeSelector = (s: SeleccionRuta) => abrirPlanilla({ filtro: { precioHasta: s.precioHasta, moneda: s.moneda }, trabajo: s.trabajo, tamano: s.tamano });
  const [seccionPendiente, setSeccionPendiente] = useState<string | null>(null);
  const irA = (id: string) => {
    if (vista.enPortada) { irASeccion(id); return; }
    setSeccionPendiente(id);
    vista.irALaPortada();
  };
  const irDesdeMenu = (id: string) => (id === "nosotros" ? (conAgencia ? vista.irANosotros() : irA("nosotros"))
    : id === "planilla" ? abrirPlanilla()
    : id === "contacto" ? irASeccion("contacto") : irA(id));
  useEffect(() => {
    if (!seccionPendiente || !vista.enPortada) return;
    const t = setTimeout(() => { irASeccion(seccionPendiente); setSeccionPendiente(null); }, 80);
    return () => clearTimeout(t);
  }, [seccionPendiente, vista.enPortada]);

  const deTrabajo = products.filter(p => ["camiones", "utilitarios", "maquinaria"].includes((p.category ?? "").toLowerCase()));
  const masBarato = products.filter(p => p.price > 0 && monedaDe(p, currency) === principal).reduce<number | null>((m, p) => m == null || p.price < m ? p.price : m, null);
  const datosPortada = loadingProducts || !products.length ? [] : [
    { valor: String(products.length), etiqueta: products.length === 1 ? "unidad en stock" : "unidades en stock" },
    ...(deTrabajo.length ? [{ valor: String(deTrabajo.length), etiqueta: "de trabajo pesado" }] : []),
    ...(masBarato != null ? [{ valor: fmtPrice(masBarato, principal), etiqueta: "desde" }] : []),
  ];
  const stats = [
    { fv: "stat1", fl: "statLabel1", n: String(products.length), l: "Unidades en stock", propio: false },
    { fv: "stat2", fl: "statLabel2", n: "15", l: "Años en el rubro", propio: true },
  ];
  const statsVistos = stats.filter(s => !!overrides[s.fv]?.text?.trim() || (s.propio ? editMode : s.n !== "0"));
  const preguntas = armarPreguntasAutos({ monedas: opciones.monedas.length ? opciones.monedas as Moneda[] : [principal], conWhatsapp: !!waLink });

  const iconoBoton: React.CSSProperties = { background: "none", border: "none", color: navTenue, cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, position: "relative" };
  const capa = (campo: string, etiqueta: string, ov: ImageOverride | undefined, nombreBloque?: string) => (
    <><BgDragHandle imgKey={`sectionbg_${campo}`} /><Velo ov={ov} /><EditableSectionBg field={campo} label={etiqueta} {...(nombreBloque ? { nombreBloque } : {})} /></>
  );
  const pad = "clamp(52px,7vw,88px) clamp(16px,4vw,32px)";
  const ancho: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto" };
  const arriba = isPreview ? 0 : (showAnn ? PROMO_H : 0) + NAV_H + 3;

  return (
    <div data-template-raiz style={{ background: FONDO, color: TINTA, fontFamily: CUERPO, minHeight: "100vh",
      // Ver el candado en useVistaTemplate: el segundo toque de un doble clic no cae en la pantalla nueva.
      pointerEvents: vista.cambiandoPantalla ? "none" : undefined }}>
      <style>{`
        ${AM_MODAL_CSS}
        ${TARJETA_RUTA_CSS}
        ${SELECTOR_RUTA_CSS}
        ${CATALOGO_RUTA_CSS}
        ${AGENCIA_RUTA_CSS}
        ${VIDEOS_RUTA_CSS}
        .rt-marca { font-size:16px; letter-spacing:.3px }
        @media(max-width:400px){ .rt-marca { font-size:14px; letter-spacing:0 } .rt-ico { width:34px !important } }
        @media(min-width:640px){ .rt-marca { font-size:21px; letter-spacing:.8px } }
        .rt-links { display:none }
        .rt-solo-ancho { display:none }
        @media(min-width:1100px){ .rt-links { display:flex } .rt-burger { display:none !important } .rt-menu { display:none !important } .rt-solo-ancho { display:inline-flex } }
        .rt-links .rt-link { white-space:nowrap }
        @media(max-width:479px){ .rt-push { display:none !important } }
        .rt-push-menu { display:none }
        @media(max-width:479px){ .rt-push-menu { display:flex; flex-direction:column } }
        .rt-link { transition: color .15s, box-shadow .15s }
        .rt-link:hover { box-shadow: inset 0 -3px 0 ${accent} }
        .rt-btn:focus-visible { outline:3px solid ${accent}; outline-offset:2px }
        .rt-hero { display:grid; grid-template-columns:minmax(0,1fr); gap:24px; align-items:end }
        @media(min-width:900px){ .rt-hero { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) } }
        .rt-datos { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-top:1px solid rgba(255,255,255,0.25) }
        /* A 360 "$2.400.000" se partía en dos renglones: el número achica en vez de cortarse. */
        .rt-dato { font-size:clamp(17px,5.2vw,34px) }
        .rt-aviso { font-size:12px; letter-spacing:1.2px }
        @media(max-width:479px){ .rt-aviso { font-size:10.5px; letter-spacing:.4px } }
        .rt-tasar { display:grid; gap:16px; grid-template-columns:minmax(0,1fr) }
        @media(min-width:900px){ .rt-tasar { grid-template-columns:repeat(2,minmax(0,1fr)) } }
        .rt-about { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(24px,4vw,56px); align-items:center }
        @media(min-width:880px){ .rt-about { grid-template-columns:minmax(0,1fr) minmax(0,1fr) } }
        .rt-faq summary { list-style:none; cursor:pointer }
        .rt-faq summary::-webkit-details-marker { display:none }
        @media(max-width:640px){ .rt-ctas { flex-direction:column } .rt-ctas > * { width:100%; justify-content:center; box-sizing:border-box } }
        @keyframes rt-spin { to { transform:rotate(360deg) } }
        section[id] { scroll-margin-top:${(showAnn ? PROMO_H : 0) + NAV_H + 16}px }
        /* Efectos al bajar (ver shared/efectosAutos): entran de abajo, firmes, sin desenfoque. */
        @keyframes rt-ef { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="sube"].ef-in > *, .ef-listo [data-ef="grilla"].ef-in > * { animation: rt-ef .7s cubic-bezier(.2,.7,.2,1) backwards }
        ${[2, 3, 4, 5, 6, 7, 8].map(n => `.ef-listo [data-ef].ef-in > :nth-child(${n}) { animation-delay:${((n - 1) * 0.06).toFixed(2)}s }`).join("\n        ")}
        .ef-listo [data-ef="titulo"]:not(.ef-in) { opacity:0; transform:translateY(12px) }
        .ef-listo [data-ef="titulo"].ef-in { transition: opacity .6s, transform .6s cubic-bezier(.2,.7,.2,1) }
        .ef-listo [data-ef].ef-ya > *, .ef-listo [data-ef].ef-ya { animation:none !important; transition:none !important }
      `}</style>

      {/* ── BARRA DE AVISOS ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height: PROMO_H, background: TINTA, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 44px" }}>
          <span className="rt-aviso" style={{ fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {annMessages[annIdx % annMessages.length]}
          </span>
          <button type="button" onClick={() => setAnnVisible(false)} aria-label="Cerrar la barra de avisos"
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── BARRA ── fija arriba, con la raya de la ruta abajo. */}
      <div style={{ position: isPreview ? "sticky" : "fixed", top: showAnn ? PROMO_H : 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0, zIndex: isPreview ? CAPAS.previaNav : 100 }}>
        <nav aria-label="Principal" style={{ pointerEvents: vista.cambiandoPantalla ? "none" : "auto", background: navBg, borderBottom: `1px solid ${navLinea}` }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(10px,2.4vw,24px)", height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: navTinta }}>
              <span aria-hidden="true" style={{ width: 8, height: 26, background: accent, flexShrink: 0 }} />
              <span className="rt-marca" style={{ fontFamily: TITULAR, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.05 }}>
                <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
              </span>
              <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navTinta} />
            </div>
            <div className="rt-links" style={{ gap: 2, alignItems: "center", alignSelf: "stretch" }}>
              {menuAncho.map(([lbl, id]) => (
                <button key={id} type="button" onClick={() => irDesdeMenu(id)} className="rt-link rt-btn"
                  aria-current={(id === "nosotros" && vista.enNosotros) || (id === "planilla" && vista.enCatalogo) ? "page" : undefined}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", height: "100%", padding: "0 12px", color: navTinta, fontFamily: "inherit",
                    boxShadow: (id === "nosotros" && vista.enNosotros) || (id === "planilla" && vista.enCatalogo) ? `inset 0 -3px 0 ${accent}` : undefined }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir el buscador" className="rt-ico rt-btn" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button type="button" onClick={() => setFavoritesOpen(true)} aria-label={`Favoritos${favoriteProducts.length ? ` (${favoriteProducts.length})` : ""}`} className="rt-ico rt-btn" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill={favoriteProducts.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favoriteProducts.length > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 3, right: 2, background: accent, color: sobreAcento, borderRadius: 3, minWidth: 16, height: 16, fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{favoriteProducts.length}</span>}
              </button>
              {pushBell && config?.showPushBell && !isPreview && <span className="rt-push"><StoreFollowButton storeSlug={slug} color={navTenue} size={19} /></span>}
              {pushBell && config?.showPushBell && !isPreview && (
                <button type="button" onClick={pushBell.openDrawer} aria-label="Novedades de la tienda" className="rt-ico rt-push rt-btn" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" aria-hidden="true" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {pushBell.hasNew && <span style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, background: "#ef4444", borderRadius: "50%" }} />}
                </button>
              )}
              {/* Maqueta de la campanita: sólo en el editor (en la demo pública no hay tienda que configurar). */}
              {enEditor && (
                <button type="button" onClick={config?.onPreviewBellClick} aria-label="Novedades de la tienda"
                  title={config?.showPushBell ? "Los clientes pueden seguir tu tienda desde acá" : "Solo Plan Plus"}
                  style={{ ...iconoBoton, opacity: config?.showPushBell ? 1 : 0.5 }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
              )}
              <div ref={cuentaRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setCuentaOpen(o => !o)} aria-label="Mi cuenta" aria-expanded={cuentaOpen} className="rt-ico rt-btn" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {cuentaOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, minWidth: 210, zIndex: CAPAS.flotante, background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 20px 40px rgba(22,25,29,0.18)" }}>
                    {cargando ? (<p style={{ padding: "14px 16px", margin: 0, fontSize: 12, color: TENUE }}>Cargando…</p>) : logueado ? (
                      <>
                        <p style={{ padding: "12px 16px 4px", fontSize: 11, color: TENUE, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombreMostrado}</p>
                        <a href={panelHref} onClick={() => setCuentaOpen(false)} style={{ display: "block", padding: "12px 16px", fontSize: 14, color: TINTA, textDecoration: "none", borderBottom: `1px solid ${LINEA}`, fontWeight: 600 }}>{panelLabel}</a>
                        <button type="button" onClick={() => { if (isPreview) return; setCuentaOpen(false); signOut("/"); }}
                          style={{ display: "block", width: "100%", padding: "12px 16px", fontSize: 14, color: "#b91c1c", background: "none", border: "none", textAlign: "left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily: "inherit" }}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <a href={isPreview ? undefined : `/login?redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} style={{ display: "block", padding: "13px 16px", fontSize: 14, color: TINTA, textDecoration: "none", borderBottom: `1px solid ${LINEA}`, cursor: isPreview ? "default" : "pointer", fontWeight: 600 }}>Iniciar sesión</a>
                        <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} style={{ display: "block", padding: "13px 16px", fontSize: 14, color: TINTA, textDecoration: "none", cursor: isPreview ? "default" : "pointer", fontWeight: 600 }}>Registrarse</a>
                      </>
                    )}
                  </div>
                )}
              </div>
              <a href={vista.enCatalogo ? vista.urlTienda : todos} onClick={e => { if (vista.enCatalogo) { e.preventDefault(); vista.irALaPortada(); } else alClicTodos(e); }}
                className="rt-solo-ancho rt-btn" style={{ marginLeft: 8, background: accent, color: sobreAcento, textDecoration: "none", padding: "0 16px", minHeight: 40, alignItems: "center", fontSize: 13, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", borderRadius: 4 }}>
                {vista.enCatalogo ? "Inicio" : "Ver el stock"}
              </a>
              <button className="rt-burger rt-ico rt-btn" type="button" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menuOpen}
                style={{ ...iconoBoton, border: `1.5px solid ${navLinea}`, color: navTinta, marginLeft: 4, fontSize: 18 }}>
                {menuOpen ? "×" : "☰"}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="rt-menu" style={{ maxHeight: "calc(100dvh - 110px)", overflowY: "auto", overscrollBehavior: "contain", borderTop: `1px solid ${navLinea}`, padding: "4px clamp(10px,2.4vw,24px) 14px", background: navBg }}>
              {menuCelu.map(([lbl, id, celu]) => (
                <button key={id} type="button" data-cel-bloque-oculto={celu ? "" : undefined} onClick={() => { irDesdeMenu(id); setMenuOpen(false); }}
                  style={{ display: "block", width: "100%", background: "none", border: "none", color: navTinta, cursor: "pointer", textAlign: "left", minHeight: 50, fontSize: 15, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "inherit", borderBottom: `1px solid ${navLinea}`, padding: "0 4px" }}>
                  {lbl}
                </button>
              ))}
              {pushBell && config?.showPushBell && !isPreview && (
                <div className="rt-push-menu">
                  <StoreFollowButton storeSlug={slug} color={navTinta} size={18} fila={{ minHeight: 50, padding: "0 4px", fontSize: 15, fontWeight: 700, color: navTinta, borderBottom: `1px solid ${navLinea}` }} />
                  <button type="button" onClick={() => { setMenuOpen(false); pushBell.openDrawer(); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", minHeight: 50, padding: "0 4px", fontSize: 15, fontWeight: 700, color: navTinta, borderBottom: `1px solid ${navLinea}` }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Novedades{pushBell.hasNew && <span aria-label="hay novedades" style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />}
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
        <span aria-hidden="true" style={{ display: "block", height: 3, background: rayaDeRuta(accent) }} />
      </div>

      {/* ── LA PLANILLA ── todo el stock (ver ruta/CatalogoRuta). */}
      {vista.enCatalogo && (
        <section aria-label="Todo el stock" style={{ background: FONDO, minHeight: "80vh", paddingTop: arriba + 24 }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px,4vw,32px) clamp(52px,7vw,88px)", boxSizing: "border-box" }}>
            {loadingProducts ? (
              <div role="status" aria-label="Cargando unidades" style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
                <div style={{ width: 38, height: 38, border: `3px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "rt-spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <CatalogoRuta key={JSON.stringify(pedido)} productos={products} opciones={opciones} filtroInicial={enPlanilla.filtro} trabajoInicial={enPlanilla.trabajo} tamanoInicial={enPlanilla.tamano}
                escribirUrl={!isPreview && !!slug} acento={accent} moneda={currency} hrefDe={paginaDe} favoritos={favorites} onFavorito={toggleFavorite}
                onVolver={vista.irALaPortada} whatsapp={whatsapp.enabled ? whatsapp.number : null} storeId={config?.storeId} isOwner={isOwner} isPreview={isPreview} />
            )}
          </div>
        </section>
      )}

      {/* ── LA AGENCIA ── página aparte: /tienda/<slug>/nosotros (ver ruta/AgenciaRuta). */}
      {vista.enNosotros && (
        <section aria-label="La agencia" style={{ background: FONDO, minHeight: "80vh", paddingTop: arriba + 24 }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px,4vw,32px) clamp(52px,7vw,88px)", boxSizing: "border-box" }}>
            <AgenciaRuta acento={accent} nombreTienda={storeName} waLink={waLink} todosHref={todos} onVerStock={e => alClicTodos(e)} enPrevia={isPreview} />
          </div>
        </section>
      )}

      {vista.enPortada && (<>
      {/* ── PORTADA ── la foto de la ruta, el título y los números del stock. */}
      <section aria-label="Portada" style={{ position: "relative", overflow: "hidden", background: ASFALTO, color: "#fff", paddingTop: arriba }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la dueña */}
        <img src={fotoLiviana(heroUrl, 1920)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          objectPosition: `${iovr["heroBackground"]?.posX ?? 50}% ${iovr["heroBackground"]?.posY ?? 50}%` }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(22,25,29,0.92) 0%, rgba(22,25,29,0.55) 50%, rgba(22,25,29,${iovr["heroBackground"]?.overlayOpacity ?? 0.25}) 100%)` }} />
        <EditableImageButton field="heroBackground" label="Foto de portada" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "clamp(80px,14vh,150px) clamp(16px,4vw,32px) 0" }}>
          <div className="rt-hero">
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 14px", display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: accent }}>
                <span aria-hidden="true" style={{ width: 26, height: 3, background: accent }} />
                <EditableZone field="heroKicker" label="Etiqueta de la portada">Unidades de trabajo</EditableZone>
              </p>
              <h1 style={{ margin: "0 0 16px", fontFamily: TITULAR, fontSize: "clamp(42px,7.4vw,96px)", fontWeight: 700, lineHeight: 0.92, textTransform: "uppercase", letterSpacing: -0.5, overflowWrap: "anywhere" }}>
                <EditableZone field="heroTitle" label="Título de la portada">Camiones, utilitarios y maquinaria</EditableZone>
              </h1>
              <p style={{ margin: "0 0 26px", maxWidth: 560, fontSize: "clamp(15px,1.5vw,18px)", lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
                <EditableZone field="heroSubtitle" label="Subtítulo de la portada">Contanos para qué lo necesitás y te mostramos las unidades que sirven, con la ficha completa y el precio a la vista.</EditableZone>
              </p>
              <div className="rt-ctas" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: "clamp(28px,5vw,48px)" }}>
                <button type="button" onClick={() => irASeccion("trabajo")} className="rt-btn"
                  style={{ display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 22px", borderRadius: 4, border: "none", background: accent, color: sobreAcento, fontWeight: 800, fontSize: 15, letterSpacing: 0.4, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
                  Elegir por trabajo ↓
                </button>
                <a href={todos} onClick={e => alClicTodos(e)} className="rt-btn"
                  style={{ display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 22px", borderRadius: 4, border: "1.5px solid rgba(255,255,255,0.55)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Ver la planilla
                </a>
              </div>
            </div>
          </div>
          {datosPortada.length > 0 && (
            <dl className="rt-datos" style={{ margin: 0 }}>
              {datosPortada.map((d, i) => (
                <div key={d.etiqueta} style={{ padding: "16px 12px 20px 0", borderLeft: i ? "1px solid rgba(255,255,255,0.25)" : "none", paddingLeft: i ? 14 : 0, minWidth: 0 }}>
                  <dt style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", order: 2 }}>{d.etiqueta}</dt>
                  <dd className="rt-dato" style={{ margin: "4px 0 0", fontFamily: TITULAR, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <span aria-hidden="true" style={{ position: "relative", zIndex: 1, display: "block", height: 6, background: rayaDeRuta(accent) }} />
      </section>

      {/* ── POR TRABAJO ── el corazón de Ruta (ver ruta/SelectorRuta). */}
      <section id="trabajo" aria-label="Elegí por trabajo" style={{ position: "relative", padding: pad, ...fTrabajo.estilo }}>
        {capa("bgTrabajo", "Fondo de la búsqueda por trabajo", fTrabajo.ov)}
        <div style={ancho}>
          {loadingProducts ? (
            <div role="status" aria-label="Cargando unidades" style={{ minHeight: 320, display: "grid", placeItems: "center" }}>
              <div style={{ width: 38, height: 38, border: `3px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "rt-spin 0.8s linear infinite" }} />
            </div>
          ) : (
            <SelectorRuta productos={products} acento={accent} currency={currency} principal={principal} monedas={opciones.monedas as Moneda[]} hrefDe={paginaDe}
              favoritos={favorites} onFavorito={toggleFavorite} onVerPlanilla={desdeSelector} onAvisame={() => setAvisame(true)}
              pregunta={<EditableZone field="trabajoPregunta" label="Pregunta de la portada">¿Para qué lo necesitás?</EditableZone>} />
          )}
        </div>
      </section>

      <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── TOMAMOS TU USADO / AVISAME SI ENTRA ── */}
      <SectionBlock id="rt-tasar" label="Tomamos tu usado y Avisame si entra" isPreview={isPreview} defaultOrder={RT_SECTION_IDS}>
      <section id="tasar" style={{ padding: pad, position: "relative", ...fTasar.estilo }}>
        {capa("bgTasar", "Fondo de tasación", fTasar.ov)}
        <div data-ef="sube" style={ancho}>
          <Titulo acento={accent} tinta={fTasar.tinta} num="01"
            titulo={<EditableZone field="tasarHeading" label="Título de tasación">Tomamos tu usado</EditableZone>} />
          <div className="rt-tasar">
            <div style={{ background: fTasar.oscuro ? "rgba(255,255,255,0.06)" : FONDO, border: `1px solid ${fTasar.linea}`, borderRadius: 4, padding: "clamp(18px,2.6vw,26px)", minWidth: 0 }}>
              <p style={{ margin: "0 0 6px", fontFamily: TITULAR, fontSize: 24, fontWeight: 700, textTransform: "uppercase", color: fTasar.tinta }}>
                <EditableZone field="tasarTitulo" label="Tasá tu usado — título">¿Tenés una unidad para entregar?</EditableZone>
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.6, color: fTasar.tenue }}>
                <EditableZone field="tasarTexto" label="Tasá tu usado — texto">Contanos qué tenés y te respondemos con una oferta, para tomarla en parte de pago o comprártela.</EditableZone>
              </p>
              <TasacionVehiculo storeId={config?.storeId} accent={accent} isOwner={isOwner} isPreview={isPreview} oscuro={fTasar.oscuro} deTrabajo />
            </div>
            <div style={{ background: fTasar.oscuro ? "rgba(255,255,255,0.06)" : FONDO, border: `1px solid ${fTasar.linea}`, borderRadius: 4, padding: "clamp(18px,2.6vw,26px)", minWidth: 0 }}>
              <p style={{ margin: "0 0 6px", fontFamily: TITULAR, fontSize: 24, fontWeight: 700, textTransform: "uppercase", color: fTasar.tinta }}>
                <EditableZone field="avisameTitulo" label="Avisame si entra — título">¿No está la que buscás?</EditableZone>
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.6, color: fTasar.tenue }}>
                <EditableZone field="avisameTexto" label="Avisame si entra — texto">Dejanos marca, modelo y hasta cuánto querés gastar. Cuando entre, te escribimos primero.</EditableZone>
              </p>
              <button type="button" onClick={() => setAvisame(true)} className="rt-btn"
                style={{ minHeight: 48, padding: "0 20px", borderRadius: 4, border: `1.5px solid ${fTasar.tinta}`, background: "transparent", color: fTasar.tinta, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>
                Avisame si entra
              </button>
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── VIDEOS ── */}
      <SectionBlock id="rt-videos" label="Videos" isPreview={isPreview} defaultOrder={RT_SECTION_IDS}>
      {(videos.length > 0 || enEditor) ? (
        <section style={{ padding: pad, position: "relative", ...fVideos.estilo }}>
          {capa("bgVideos", "Fondo de videos", fVideos.ov)}
          <div data-ef="sube" style={ancho}>
            <Titulo acento={accent} tinta={fVideos.tinta} num="02"
              titulo={<EditableZone field="videosHeading" label="Título de videos">Miralas trabajar</EditableZone>} />
            <VideosRuta videos={videos} acento={accent} moneda={currency} hrefDe={paginaDeId}
              vacio={<p style={{ margin: 0, padding: "22px 20px", border: `1.5px dashed ${fVideos.linea}`, borderRadius: 4, color: fVideos.tenue, fontSize: 14, lineHeight: 1.6 }}>
                Acá aparecen los videos que subas en cada unidad (en Productos → la unidad → Videos). Mientras no haya ninguno, este bloque no se muestra en la tienda.
              </p>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── PREGUNTAS ── */}
      <SectionBlock id="rt-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={RT_SECTION_IDS}>
      <section id="preguntas" style={{ padding: pad, position: "relative", ...fPreguntas.estilo }}>
        {capa("bgPreguntas", "Fondo de preguntas", fPreguntas.ov)}
        <div data-ef="sube" style={{ ...ancho, maxWidth: 920 }}>
          <Titulo acento={accent} tinta={fPreguntas.tinta} num="03"
            titulo={<EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>} />
          <div className="rt-faq" style={{ borderTop: `1px solid ${fPreguntas.linea}` }}>
            {preguntas.map((it, i) => (
              <details key={i} open={abierta === i} onToggle={e => { const ab = (e.currentTarget as HTMLDetailsElement).open; setAbierta(a => ab ? i : a === i ? null : a); }}
                style={{ borderBottom: `1px solid ${fPreguntas.linea}` }}>
                <summary style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 58, padding: "6px 0", color: fPreguntas.tinta }}>
                  <span aria-hidden="true" style={{ fontFamily: TITULAR, fontSize: 16, color: fPreguntas.tenue, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "clamp(15px,1.6vw,17px)", fontWeight: 800, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
                    background: abierta === i ? accent : "transparent", color: abierta === i ? sobreAcento : fPreguntas.tinta, border: `1.5px solid ${abierta === i ? accent : fPreguntas.linea}` }}>{abierta === i ? "−" : "+"}</span>
                </summary>
                <p style={{ margin: "0 0 18px 42px", fontSize: 15, lineHeight: 1.7, color: fPreguntas.tenue, overflowWrap: "anywhere" }}>
                  <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                </p>
              </details>
            ))}
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={isPreview ? e => e.preventDefault() : undefined} className="rt-btn"
              style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 20px", borderRadius: 4, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
              <WaIcon size={17} /> ¿Otra pregunta? Escribinos
            </a>
          )}
        </div>
      </section>
      </SectionBlock>

      {/* ── NOVEDADES POR MAIL ── la lista a la que le escribe Notificaciones (ver NewsletterForm). */}
      <SectionBlock id="rt-novedades" label="Recibí los ingresos por mail" isPreview={isPreview} defaultOrder={RT_SECTION_IDS}>
      <section style={{ padding: "clamp(44px,6vw,72px) clamp(16px,4vw,32px)", position: "relative", ...fNovedades.estilo }}>
        {capa("bgNovedades", "Fondo de novedades", fNovedades.ov)}
        <div data-ef="sube" style={{ ...ancho, maxWidth: 980 }}>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", alignItems: "center", background: ASFALTO, color: "#fff", borderRadius: 4, padding: "clamp(22px,4vw,40px)", borderLeft: `8px solid ${accent}` }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: "0 0 8px", fontFamily: TITULAR, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase" }}>
                <EditableZone field="novedadesHeading" label="Título de novedades">Enterate primero de lo que entra</EditableZone>
              </h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
                <EditableZone field="novedadesTexto" label="Texto de novedades">Dejanos tu mail y te avisamos cuando ingresen unidades nuevas o baje un precio. Sin spam.</EditableZone>
              </p>
            </div>
            <div style={{ minWidth: 0 }}>
              <NewsletterForm slug={slug} isPreview={isPreview} placeholder="tu@email.com" boton="Avisarme"
                theme={{
                  form: { display: "flex", gap: 6, background: "#fff", borderRadius: 4, padding: 5 },
                  input: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: TINTA, fontSize: 15, padding: "12px 10px", fontFamily: "inherit" },
                  boton: { flexShrink: 0, background: accent, color: sobreAcento, border: "none", borderRadius: 3, padding: "0 18px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.5 },
                  colorMensaje: "#ffffff",
                  colorError: "#fca5a5",
                }} />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>Te llega un mail para confirmar. Te das de baja cuando quieras.</p>
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── LA AGENCIA ── en la portada; la página entera está en "La agencia". */}
      <SectionBlock id="rt-nosotros" label="La agencia" isPreview={isPreview} defaultOrder={RT_SECTION_IDS}>
      <section id="nosotros" style={{ padding: pad, position: "relative", ...fNosotros.estilo }}>
        {capa("bgNosotros", "Fondo de la agencia", fNosotros.ov)}
        <div data-ef="sube" className="rt-about" style={ancho}>
          <div style={{ position: "relative", borderRadius: 4, overflow: "hidden", aspectRatio: "4/3", background: "#e7e5df" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la dueña */}
            <img src={fotoLiviana(nosotrosUrl, 1200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {(() => {
              const ov = iovr["nosotrosImage"];
              if (!ov?.overlayType || ov.overlayType === "none") return null;
              return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
            })()}
            <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: rayaDeRuta(accent) }} />
            <EditableImageButton field="nosotrosImage" label="Foto de la agencia" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: fNosotros.tenue }}>
              <EditableZone field="nosotrosKicker" label="Etiqueta de la agencia">La agencia</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 16px", fontFamily: TITULAR, fontSize: "clamp(30px,4.4vw,52px)", fontWeight: 700, lineHeight: 0.98, textTransform: "uppercase", color: fNosotros.tinta }}>
              <EditableZone field="nosotrosHeading" label="Título de la agencia">Unidades que trabajan desde el primer día</EditableZone>
            </h2>
            <p style={{ margin: "0 0 22px", fontSize: 16, lineHeight: 1.75, color: fNosotros.tenue }}>
              <EditableZone field="nosotrosP1" label="Párrafo de la agencia">Unidades de trabajo revisadas y con los papeles al día. Te asesoramos según lo que tenés que mover.</EditableZone>
            </p>
            {statsVistos.length > 0 && (
              <dl style={{ display: "flex", gap: 0, flexWrap: "wrap", margin: "0 0 24px", border: `1.5px solid ${fNosotros.tinta}`, borderRadius: 4, width: "fit-content", maxWidth: "100%" }}>
                {statsVistos.map((s, i) => (
                  <div key={s.fv} style={{ padding: "12px 18px", borderLeft: i ? `1px solid ${fNosotros.linea}` : "none", minWidth: 0 }}>
                    <dd style={{ margin: 0, fontFamily: TITULAR, fontSize: 30, fontWeight: 700, lineHeight: 1, color: fNosotros.tinta }}>
                      <EditableZone field={s.fv} label={`Número ${i + 1}`}>{s.n}</EditableZone>
                    </dd>
                    <dt style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: fNosotros.tenue }}>
                      <EditableZone field={s.fl} label={`Texto del número ${i + 1}`}>{s.l}</EditableZone>
                    </dt>
                  </div>
                ))}
              </dl>
            )}
            <div className="rt-ctas" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="rt-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 50, padding: "0 20px", borderRadius: 4, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
                  <WaIcon size={18} />
                  <EditableZone field="contactWhatsApp" label="Texto del botón de WhatsApp">Escribinos por WhatsApp</EditableZone>
                </a>
              )}
              {conAgencia && <a href={`${vista.urlTienda}/nosotros${vista.sufijoEditor}`} onClick={e => { e.preventDefault(); vista.irANosotros(); }} className="rt-btn"
                style={{ display: "inline-flex", alignItems: "center", minHeight: 50, padding: "0 20px", borderRadius: 4, border: `1.5px solid ${fNosotros.tinta}`, color: fNosotros.tinta, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
                Conocé la agencia →
              </a>}
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>
      </>)}

      {/* ── PIE ── */}
      <footer id="contacto" style={{ position: "relative", padding: "clamp(40px,6vw,64px) clamp(16px,4vw,32px) 24px", scrollMarginTop: (showAnn ? PROMO_H : 0) + NAV_H + 16, ...fPie.estilo }}>
        {capa("bgFooter", "Fondo del pie", fPie.ov, "Pie de la tienda")}
        <span aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: rayaDeRuta(accent) }} />
        <div style={ancho}>
          <ContenidoPieAutos slug={slug} storeName={storeName} products={products} legales={config?.legales} enEditor={isPreview}
            whatsapp={whatsapp.enabled ? whatsapp.number : null} redes={config?.socialLinks} acento={accent} estilo="ruta" onVerVehiculos={tipo => abrirPlanilla({ filtro: tipo ? { tipo } : {} })}
            colores={fPie.oscuro ? { tinta: "#ffffff", suave: fPie.tenue, linea: "rgba(255,255,255,0.12)" } : { tinta: TINTA, suave: fPie.tenue, linea: LINEA }}
            descripcion={<EditableZone field="footerFrase" label="Frase del pie">{FRASE_PIE}</EditableZone>}
            copyright={<EditableZone field="footerCopyright" label="Copyright">{`© ${new Date().getFullYear()} ${storeName}.`}</EditableZone>}
            onReportar={isOwner ? undefined : () => setShowReport(true)} />
        </div>
      </footer>

      <VentanaAuto abierta={avisame} titulo="Avisame si entra" onClose={cerrarAvisame}>
        <BusquedaVehiculo storeId={config?.storeId} accent={accent} isOwner={isOwner} isPreview={isPreview} deTrabajo />
      </VentanaAuto>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 20, zIndex: isPreview ? CAPAS.previaModal : 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: TINTA, color: "#fff", borderRadius: 4, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.3)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── BUSCADOR ── en su capa (CAPAS.buscador). */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Buscar unidades" onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: CAPAS.buscador, background: "rgba(243,242,238,0.98)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "clamp(72px,14vh,128px)" }}>
          <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: 4, background: PAPEL, border: `1.5px solid ${LINEA}`, color: TINTA, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
          <div style={{ width: "100%", maxWidth: 720, padding: "0 clamp(16px,4vw,24px)", boxSizing: "border-box" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, letterSpacing: 2, color: TENUE }}>BUSCAR EN EL STOCK</p>
            <input autoFocus type="search" aria-label="Buscar unidades" maxLength={80} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Marca, modelo, año…"
              style={{ width: "100%", background: "transparent", border: "none", borderBottom: `3px solid ${TINTA}`, color: TINTA, fontFamily: TITULAR, fontSize: "clamp(26px,4.6vw,40px)", fontWeight: 700, padding: "10px 0", outline: "none", boxSizing: "border-box" }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width: "100%", maxWidth: 960, padding: "24px clamp(16px,4vw,24px)", overflowY: "auto", boxSizing: "border-box" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
                {searchResults.slice(0, 24).map(p => (
                  <Link key={p.id} href={paginaDe(p)} style={{ display: "block", background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, textDecoration: "none", color: TINTA, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={fotoLiviana(p.images[0], 640)} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", background: "#e7e5df" }} />
                    <div style={{ padding: "10px 12px 12px" }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px", overflowWrap: "anywhere" }}>{p.name}</p>
                      <p style={{ fontFamily: TITULAR, fontSize: 17, fontWeight: 700, margin: 0 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, currency)) : "Consultar"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {searchResults.length > 24 && (
                <Link href={linkAVehiculos(slug, { q: searchQuery.trim() }, isPreview)}
                  onClick={e => { alClicTodos(e, { q: searchQuery.trim() }); setSearchOpen(false); setSearchQuery(""); }} style={{ display: "block", textAlign: "center", marginTop: 18, color: TINTA, fontWeight: 800, fontSize: 14, textDecoration: "underline" }}>
                  Ver los {searchResults.length} resultados en la planilla →
                </Link>
              )}
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color: TENUE, marginTop: 32, fontSize: 14, padding: "0 16px", textAlign: "center", overflowWrap: "anywhere" }}>
              Nada con &ldquo;{searchQuery}&rdquo;. Probá con otra marca o modelo.
            </p>
          )}
        </div>
      )}

      {/* ── FAVORITOS ── */}
      <div role="dialog" aria-modal="true" aria-label="Favoritos" inert={!favoritesOpen} aria-hidden={!favoritesOpen}
        style={{ position: "fixed", inset: 0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(22,25,29,0.45)", opacity: favoritesOpen ? 1 : 0, transition: "opacity 0.3s" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100vw", background: PAPEL, color: TINTA, transform: favoritesOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", borderLeft: `6px solid ${accent}` }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${LINEA}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: TITULAR, fontWeight: 700, fontSize: 22, textTransform: "uppercase", margin: 0 }}>Guardadas <span style={{ color: TENUE, fontSize: 17 }}>({favoriteProducts.length})</span></p>
            <button type="button" onClick={() => setFavoritesOpen(false)} aria-label="Cerrar favoritos" style={{ background: "none", border: "none", color: TINTA, fontSize: 24, cursor: "pointer", width: 44, height: 44, marginRight: -10 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
            {favoriteProducts.length === 0 ? (
              <p style={{ textAlign: "center", padding: "52px 0", margin: 0, fontSize: 14, lineHeight: 1.8, color: TENUE }}>Todavía no guardaste ninguna.<br />Tocá el corazón de una unidad para tenerla acá.</p>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${LINEA}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={fotoLiviana(product.images[0], 256)} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 3, flexShrink: 0, background: "#e7e5df" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px", overflowWrap: "anywhere" }}>{product.name}</p>
                  <p style={{ fontFamily: TITULAR, fontSize: 17, fontWeight: 700, margin: "0 0 10px" }}>{product.price > 0 ? fmtPrice(product.price, monedaDe(product, currency)) : "Consultar"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={paginaDe(product)} style={{ background: accent, color: sobreAcento, borderRadius: 3, padding: "0 14px", minHeight: 36, fontSize: 13, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ver</Link>
                    <button type="button" onClick={() => toggleFavorite(product.id)} style={{ background: "transparent", color: TINTA, border: `1.5px solid ${LINEA}`, borderRadius: 3, padding: "0 14px", minHeight: 36, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Quitar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Con el buscador abierto no va: tapaba el último resultado. */}
      {!editMode && waLink && !searchOpen && (
        <a href={waLink} aria-label="Escribinos por WhatsApp" target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: CAPAS.panel, background: "#25d366", color: "#fff", width: 56, height: 56, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(37,211,102,0.4)", textDecoration: "none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
