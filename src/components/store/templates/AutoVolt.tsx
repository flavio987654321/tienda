"use client";
/**
 * AUTO VOLT — creado el 12/10/26 (fase 3 de TEMPLATES-AUTOS.md).
 *
 * El futurista de autos: oscuro, con una escena de luz que sigue al puntero,
 * un piso de grilla en perspectiva, vidrio y datos con letra de tablero. Es uno
 * de los dos oscuros del rubro (el otro es Auto Motor); los tres restantes son
 * claros, a pedido del dueño.
 *
 * Se comparte la LÓGICA con los otros templates de autos (filtros, favoritos,
 * tasación, búsquedas, videos, novedades por mail, el pie); el aspecto es
 * propio (carpeta `volt/`). Los campos editables usan los mismos nombres que
 * Auto Motor: lo que la dueña ya escribió aparece igual si cambia de template.
 */
import { ContenidoPieAutos, FRASE_PIE } from "@/components/store/auto/PieDeAutos";
import { useEfectosAlBajar } from "@/components/store/templates/shared/efectosAutos";
import { irASeccion } from "@/components/store/templates/shared/irASeccion";
import { NewsletterForm } from "@/components/store/templates/shared/NewsletterForm";
import { SectionBlock } from "@/components/store/templates/shared/SectionBlock";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { barraMs, carruselMs, type ImageOverride } from "@/types/store-config";
import { CarteleraVolt } from "@/components/store/templates/volt/CarteleraVolt";
import { hayFotosDeCartelera } from "@/components/store/auto/useCartelera";
import { useState, useEffect, useRef, useMemo } from "react";
import { useVistaTemplate } from "@/components/store/templates/shared/useVistaTemplate";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { usePushBell } from "@/contexts/PushBellContext";
import { useSesion } from "@/components/AuthProvider";
import { useFavoritosVehiculos } from "@/hooks/useFavoritosVehiculos";
import StoreFollowButton from "@/components/store/StoreFollowButton";
import { EditableZone, EditableImageButton, EditableSectionBg, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { SelectorVehiculoFoco } from "@/components/store/auto/SelectorVehiculoFoco";
import { elegirFoco } from "@/lib/vehiculoFoco";
import { useStorefront, type StorefrontProduct } from "@/hooks/useStorefront";
import VerifiedIconButton from "@/components/store/VerifiedIconButton";
import MarcaNav from "@/components/store/templates/shared/MarcaNav";
import ReportStoreModal from "@/components/store/ReportStoreModal";
import { WaIcon, AM_MODAL_CSS, fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe, monedaDeTienda } from "@/lib/monedaVehiculo";
import { opcionesDeFiltro, filtrarVehiculos, filtroVacio, filtroDesdeUrl, filtroAUrl, linkAVehiculos, linkAVehiculo, type FiltroVehiculos } from "@/lib/filtroVehiculos";
import { CAPAS } from "@/lib/capas-tienda";
import { videosDeVehiculos } from "@/components/store/auto/videosDeVehiculos";
import { armarPreguntasAutos } from "@/lib/preguntasFrecuentes";
import { fotoLiviana } from "@/lib/foto-liviana";
import { EscenaVolt, ESCENA_VOLT_CSS, conAlfa, MONO } from "@/components/store/templates/volt/EscenaVolt";
import { EscenarioVolt, ESCENARIO_VOLT_CSS } from "@/components/store/templates/volt/EscenarioVolt";
import { ComparadorVolt, COMPARADOR_VOLT_CSS } from "@/components/store/templates/volt/ComparadorVolt";
import { ServiciosVolt, ChatPreguntasVolt, BLOQUES_VOLT_CSS } from "@/components/store/templates/volt/BloquesVolt";
import { VideosVolt, VIDEOS_VOLT_CSS } from "@/components/store/templates/volt/VideosVolt";
import { CatalogoVolt, CATALOGO_VOLT_CSS } from "@/components/store/templates/volt/CatalogoVolt";
import { PortadaVolt, PORTADA_VOLT_CSS } from "@/components/store/templates/volt/PortadaVolt";
import { TIRA_VOLT_CSS } from "@/components/store/templates/volt/TiraVolt";
import { useDesplazamientoVolt, LineaDeProgreso } from "@/components/store/templates/volt/desplazamientoVolt";
import { AgenciaVolt, AGENCIA_VOLT_CSS } from "@/components/store/templates/volt/AgenciaVolt";
import { hayAgenciaCargada } from "@/components/store/auto/agencia/piezasAgencia";

/** La paleta: casi negro azulado, una superficie apenas más clara, y el acento de la dueña. */
const VACIO = "#05070d";
const SUPERFICIE = "#080b15";
const TINTA = "#e8ecf6";
const TINTA_CLARA = "#0b1020"; // el texto cuando la dueña le pone un fondo claro a un bloque
const LINEA = "rgba(255,255,255,0.08)";

const AV_SECTION_IDS = ["av-cartelera", "av-comparar", "av-tasar", "av-videos", "av-preguntas", "av-novedades", "av-nosotros"];

/** El fondo de un bloque: color o foto elegidos por la dueña, y el color de letra que le corresponde. */
function fondoDe(ov: ImageOverride | undefined, color: string) {
  const conFoto = !!ov?.url;
  const claro = conFoto ? ov!.overlayType === "light" : getContrastColor(color) === "dark";
  return {
    estilo: conFoto
      ? { backgroundImage: `url(${fotoLiviana(ov!.url, 1920)})`, backgroundSize: "cover", backgroundPosition: `${ov!.posX ?? 50}% ${ov!.posY ?? 50}%` } as React.CSSProperties
      : { background: color } as React.CSSProperties,
    tinta: claro ? TINTA_CLARA : TINTA,
    tenue: claro ? "rgba(11,16,32,0.62)" : "rgba(232,236,246,0.62)",
    linea: claro ? "rgba(11,16,32,0.12)" : LINEA,
    claro,
  };
}

function Velo({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || ov.overlayType === "none") return null;
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
    background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.5})` : `rgba(5,7,13,${ov.overlayOpacity ?? 0.6})` }} />;
}

/** El título de cada bloque: código de tablero, título grande y algo a la derecha. */
function Titulo({ acento, tinta, codigo, titulo, derecha }: { acento: string; tinta: string; codigo: React.ReactNode; titulo: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div data-ef="titulo" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" className="ef-raya" style={{ width: 22, height: 1, background: acento, boxShadow: `0 0 8px ${acento}` }} />
          {codigo}
        </p>
        <h2 style={{ margin: 0, fontSize: "clamp(28px,4.4vw,50px)", fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.02, color: tinta }}>{titulo}</h2>
      </div>
      {derecha}
    </div>
  );
}

export default function AutoVolt() {
  const config = useStoreConfig();
  const pushBell = usePushBell();
  const { products, loadingProducts } = useStorefront();
  const { editMode, overrides, hiddenSections, setFeaturedVehicleId } = useEditContext();
  // El menú sólo lleva a bloques que se ven; en el celular, tampoco a los ocultos ahí.
  const ocultas = config?.hiddenSections ?? hiddenSections;
  const ocultasCelu = config?.hiddenSectionsCelular ?? [];
  // Sin datos de agencia, "La agencia" baja al bloque de la portada (ver hayAgenciaCargada); si está oculto, no se ofrece.
  const conAgencia = hayAgenciaCargada(config);
  const menuAncho = [["Showroom", "showroom", ""], ["Comparar", "comparar", "av-comparar"], ["Tasá tu usado", "tasar", "av-tasar"], ["La agencia", "nosotros", conAgencia ? "" : "av-nosotros"], ["Contacto", "contacto", ""]].filter(([, , b]) => !b || !ocultas.includes(b))
    // El comparador sólo se dibuja con dos vehículos o más: con uno, "Comparar" era un botón que no hacía nada.
    .filter(([, id]) => id !== "comparar" || products.length >= 2);
  /* El menú desplegable se usa también en tablet (hasta 900-1100 px), pero un
     bloque oculto "sólo en el celular" se esconde recién por debajo de 768: se
     marca igual que el bloque, así el link se va y vuelve con él. */
  const menuCelu = menuAncho.map(([lbl, id, b]) => [lbl, id, ocultasCelu.includes(b) ? "si" : ""]);
  const isPreview = !!config?.previewFill;
  /* Los efectos al bajar se ven también en la vista previa (para probarlos
     antes de guardar), salvo editando: ahí no se esconde nada. */
  useEfectosAlBajar(!editMode);
  const enEditor = isPreview && !config?.demoPublica;
  const isOwner = !!config?.isOwner;
  const accent = config?.colors.accent ?? "#22d3ee";
  const sobreAcento = getContrastColor(accent) === "dark" ? VACIO : "#fff";
  const currency = config?.currency ?? "ARS";
  const principal = monedaDeTienda({ currency });
  const slug = config?.slug ?? "";
  const opciones = useMemo(() => opcionesDeFiltro(products, currency), [products, currency]);
  const foco = useMemo(() => elegirFoco(products, config?.featuredVehicleId), [products, config?.featuredVehicleId]);
  const videos = useMemo(() => videosDeVehiculos(products), [products]);
  const storeName = config?.storeName ?? "AUTO VOLT";
  const whatsapp = config?.whatsapp ?? { enabled: false, number: "", message: "" };
  const waLink = whatsapp.enabled ? linkWhatsApp(whatsapp.number, whatsapp.message) : null;

  const iovr = config?.imageOverrides ?? {};
  const sc = config?.sectionColors ?? {};
  const fondo = (campo: string, def: string) => ({ ...fondoDe(iovr[`sectionbg_${campo}`], sc[campo] ?? def), ov: iovr[`sectionbg_${campo}`] });
  const fCartelera = fondo("bgCartelera", VACIO);
  const fComparar = fondo("bgComparar", SUPERFICIE);
  const fTasar = fondo("bgTasar", VACIO);
  const fVideos = fondo("bgVideos", SUPERFICIE);
  const fPreguntas = fondo("bgPreguntas", VACIO);
  const fNovedades = fondo("bgNovedades", VACIO);
  const fNosotros = fondo("bgNosotros", SUPERFICIE);
  const fPie = fondo("bgFooter", "#03040a");

  const nosotrosUrl = iovr["nosotrosImage"]?.url ?? "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80";

  const navBg = sc["navBg"] ?? VACIO;
  const navOscura = getContrastColor(navBg) === "light";
  const navTinta = navOscura ? "#ffffff" : TINTA_CLARA;
  const navTenue = navOscura ? "rgba(232,236,246,0.7)" : "rgba(11,16,32,0.6)";
  const navLinea = navOscura ? "rgba(255,255,255,0.12)" : "rgba(11,16,32,0.12)";

  const { cargando, logueado, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /* La página del vehículo. Desde el editor lleva `t=auto-volt`: si no, se
     dibujaba con el template GUARDADO (Motor o Drive) y Volt se mezclaba. */
  const paginaDeId = (id: string) => `${linkAVehiculo(slug, id, isPreview)}${isPreview ? "&t=auto-volt" : ""}`;
  const paginaDe = (p: StorefrontProduct) => paginaDeId(p.id);
  const [showReport, setShowReport] = useState(false);
  const [annIdx, setAnnIdx] = useState(0);
  const [annVisible, setAnnVisible] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /* Bajando se esconde la barra; subiendo vuelve. No con un menú abierto. Ver volt/desplazamientoVolt. */
  const raizRef = useRef<HTMLDivElement>(null);
  const { barraOculta } = useDesplazamientoVolt(raizRef, { activo: !editMode, puedeEsconder: !menuOpen && !cuentaOpen && !searchOpen });

  // Si la dueña no escribió su barra: sólo lo que la tienda HACE, sin prometer nada que no ofrece.
  const DEFAULTS = ["Ficha técnica de cada vehículo", "Tasá tu usado online", "Te avisamos si entra lo que buscás"];
  const promoBannerEnabled = config?.promoBanner?.enabled !== false;
  const annMessages = (config?.promoBanner?.messages?.filter(m => m.trim()) ?? []).length > 0
    ? config!.promoBanner!.messages!.filter(m => m.trim())
    : DEFAULTS;
  const showAnn = promoBannerEnabled && annVisible;
  const PROMO_H = 32;
  const NAV_H = 64;
  const NAV_TOP = 10; // la barra flota: no toca los bordes
  const msBarra = barraMs(config?.promoBanner?.intervalMs);
  useEffect(() => {
    if (!showAnn || annMessages.length <= 1) return;
    const id = setInterval(() => setAnnIdx(i => (i + 1) % annMessages.length), msBarra);
    return () => clearInterval(id);
  }, [showAnn, annMessages.length, msBarra]);

  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    // Los links viejos (`?producto=`, de WhatsApp, del PDF o del panel) van a la página del vehículo.
    if (id && products.some(pr => pr.id === id)) router.replace(`${linkAVehiculo(slug, id, isPreview)}${isPreview ? "&t=auto-volt" : ""}`);
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

  /* Lo que se compara. Mientras el comprador no eligió nada, se muestran los
     dos primeros, así el bloque nunca está vacío; al tocar "Comparar" en el
     showroom pasa a mandar su elección (tres como mucho: el cuarto saca al primero). */
  /* `null` = todavía no tocó nada. Con una lista vacía como "sin elegir", sacar
     el último con la × hacía volver a los dos primeros (parecía que la × no
     andaba), y sacar uno de los dos de entrada dejaba la barra "1 para comparar". */
  const [eleccion, setEleccion] = useState<string[] | null>(null);
  const comparando = eleccion ?? [];
  const idsComparados = (eleccion ?? products.slice(0, 2).map(p => p.id)).filter(id => products.some(p => p.id === id));
  const alternarComparar = (id: string) => setEleccion(c => {
    const antes = c ?? [];
    if (antes.includes(id)) return antes.filter(x => x !== id);
    // El primero que elige va con otro al lado: una tabla de una sola columna no compara nada.
    if (!antes.length) { const otro = products.find(p => p.id !== id); return otro ? [id, otro.id] : [id]; }
    return [...antes, id].slice(-3);
  });
  const todos = linkAVehiculos(slug, {}, isPreview);

  /* ── Portada o catálogo ─────────────────────────────────────────────────────
     El catálogo (ver volt/CatalogoVolt) lo dibuja el template en `/vehiculos`,
     entre su barra y su pie: antes "Ver todos" llevaba a la página genérica,
     clara y con la barra de Auto Motor. Cambiar de pantalla no recarga (ver
     `useVistaTemplate`), y en el editor no se sale de Diseño. */
  const vista = useVistaTemplate({ isPreview, slug, templateId: "auto-volt", catalogo: "vehiculos" });
  const [filtroPedido, setFiltroPedido] = useState<FiltroVehiculos | null>(null);
  /* Entrando por un link con filtro (`/vehiculos?tipo=motos`, del pie o
     compartido). Se lee UNA vez, la de entrada: después la dirección la escribe
     el propio catálogo, y si se la siguiera leyendo cada cambio de filtro lo
     volvía a montar (se perdía el orden recién elegido). De `useSearchParams` y
     no de `window.location`: la trae también el servidor (no hay diferencia al
     hidratar) y, navegando sin recargar, `window.location` todavía puede tener
     la dirección anterior en el primer dibujado. En la previa no cuenta: la
     dirección es la del editor. */
  const parametros = useSearchParams();
  const [busquedaDeEntrada] = useState(() => isPreview ? "" : parametros?.toString() ?? "");
  const filtroCatalogo = filtroPedido ?? filtroDesdeUrl(new URLSearchParams(busquedaDeEntrada), principal);
  const abrirCatalogo = (c: Partial<FiltroVehiculos> = {}) => {
    const f = { ...filtroVacio(principal), ...c };
    setFiltroPedido(f);
    vista.irAlCatalogo(filtroAUrl(f, principal).toString());
  };
  const alClicTodos = (e: React.MouseEvent, c?: Partial<FiltroVehiculos>) => { e.preventDefault(); abrirCatalogo(c); };
  /* Ir a una sección de la portada desde el catálogo: primero vuelve, y la
     sección se busca cuando ya está dibujada. */
  const [seccionPendiente, setSeccionPendiente] = useState<string | null>(null);
  const irA = (id: string) => {
    if (vista.enPortada) { irASeccion(id); return; }
    setSeccionPendiente(id);
    vista.irALaPortada();
  };
  /* "La agencia" es una página aparte (dirección, horarios, pagos, equipo; ver
     volt/AgenciaVolt); el resto del menú son bloques de la portada. */
  const irDesdeMenu = (id: string) => (id === "nosotros" ? (conAgencia ? vista.irANosotros() : irA("nosotros"))
    // El contacto es el pie (WhatsApp y redes): está en todas las pantallas, así que se baja ahí sin cambiar de pantalla.
    : id === "contacto" ? irASeccion("contacto") : irA(id));
  useEffect(() => {
    if (!seccionPendiente || !vista.enPortada) return;
    const t = setTimeout(() => { irASeccion(seccionPendiente); setSeccionPendiente(null); }, 80);
    return () => clearTimeout(t);
  }, [seccionPendiente, vista.enPortada]);

  /* Telemetría: lo que se cuenta sale de los datos; lo que es del negocio (años,
     clientes) se ve sólo si la dueña lo escribió (en el editor, siempre, para
     que lo pueda completar). Nada de "200+" de fábrica. */
  const stats = [
    { fv: "stat1", fl: "statLabel1", n: String(products.length), l: "Vehículos en stock", propio: false },
    { fv: "stat4", fl: "statLabel4", n: String(opciones.marcas.length), l: "Marcas", propio: false },
    { fv: "stat2", fl: "statLabel2", n: "15", l: "Años en el mercado", propio: true },
    { fv: "stat3", fl: "statLabel3", n: "98%", l: "Clientes satisfechos", propio: true },
  ].filter(s => !!overrides[s.fv]?.text?.trim() || (s.propio ? editMode : s.n !== "0"));

  const enEdicion = editMode && isPreview;
  /* Las lecturas de la portada: salen del stock, nada inventado. El "desde" es
     el más barato en la moneda principal (pesos y dólares no se comparan). */
  const masBarato = products.filter(p => p.price > 0 && monedaDe(p, currency) === principal).reduce<number | null>((m, p) => m == null || p.price < m ? p.price : m, null);
  const datosPortada = loadingProducts || !products.length ? [] : [
    { valor: String(products.length), etiqueta: products.length === 1 ? "vehículo" : "vehículos" },
    ...(opciones.marcas.length > 1 ? [{ valor: String(opciones.marcas.length), etiqueta: "marcas" }] : []),
    ...(masBarato != null ? [{ valor: fmtPrice(masBarato, principal), etiqueta: "desde" }] : []),
  ];
  const iconoBoton: React.CSSProperties = { background: "none", border: "none", color: navTenue, cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, position: "relative" };
  const capa = (campo: string, etiqueta: string, ov: ImageOverride | undefined, nombreBloque?: string) => (
    <><BgDragHandle imgKey={`sectionbg_${campo}`} /><Velo ov={ov} /><EditableSectionBg field={campo} label={etiqueta} {...(nombreBloque ? { nombreBloque } : {})} /></>
  );
  const pad = "clamp(56px,8vw,96px) clamp(16px,4vw,32px)";
  const ancho: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto" };

  return (
    <div ref={raizRef} data-template-raiz style={{ background: VACIO, color: TINTA, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", minHeight: "100vh",
      // Ver el candado en useVistaTemplate: el segundo toque de un doble clic no cae en la pantalla nueva.
      pointerEvents: vista.cambiandoPantalla ? "none" : undefined }}>
      <style>{`
        ${AM_MODAL_CSS}
        ${ESCENA_VOLT_CSS}
        ${ESCENARIO_VOLT_CSS}
        ${COMPARADOR_VOLT_CSS}
        ${BLOQUES_VOLT_CSS}
        ${VIDEOS_VOLT_CSS}
        ${CATALOGO_VOLT_CSS}
        ${PORTADA_VOLT_CSS}
        ${TIRA_VOLT_CSS}
        ${AGENCIA_VOLT_CSS}
        /* El nombre: en el celular, más chico y sin espaciado, para que entre entero ("QRDREAMC / AR" se partía al medio). */
        .av-marca { font-size:13px; letter-spacing:.2px; word-break:normal; overflow-wrap:normal }
        @media(max-width:400px){ .av-marca { font-size:12px; letter-spacing:0 } .av-ico { width:34px !important } }
        @media(min-width:640px){ .av-marca { font-size:16px; letter-spacing:1px } }
        .av-links { display:none }
        .av-solo-ancho { display:none }
        /* Con cinco links (Contacto se sumó el 14/10/26) no entran en 920: se partían en dos renglones y cortaban el nombre. */
        @media(min-width:1100px){ .av-links { display:flex } .av-burger { display:none !important } .av-menu { display:none !important } .av-solo-ancho { display:inline-flex } }
        .av-links .av-link { white-space:nowrap }
        /* Seguir y Novedades: en celulares angostos no entraban en la barra junto al nombre (lo dejaban en 0-30 px). Ahí pasan al menú. */
        @media(max-width:479px){ .av-push { display:none !important } }
        .av-push-menu { display:none }
        @media(max-width:479px){ .av-push-menu { display:flex; flex-direction:column } }
        .av-about { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(28px,5vw,64px); align-items:center }
        @media(min-width:880px){ .av-about { grid-template-columns:minmax(0,1fr) minmax(0,1fr) } }
        .av-faq { display:grid; grid-template-columns:minmax(0,1fr); gap:24px clamp(28px,5vw,64px) }
        @media(min-width:960px){ .av-faq { grid-template-columns:minmax(0,0.8fr) minmax(0,1.3fr); align-items:start } .av-faq-lado { position:sticky; top:110px } }
        /* La foto de la agencia se inclina un poco con el mouse, como una pieza en una vitrina. */
        .av-incl { transition: transform .6s cubic-bezier(.2,.8,.2,1) }
        @media (hover:hover) { .av-incl:hover { transform: perspective(900px) rotateY(-5deg) rotateX(2deg) } }
        /* La agencia en el celular: los números en dos columnas parejas y los botones a todo el ancho (quedaban corridos a un costado). */
        @media(max-width:640px){
          .av-stats { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) }
          .av-ctas { flex-direction:column }
          .av-ctas > * { width:100%; justify-content:center; box-sizing:border-box }
        }
        .av-link { transition: color .15s }
        .av-link:hover { color:${accent} !important }
        @keyframes av-spin { to { transform:rotate(360deg) } }
        @keyframes av-latido { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes av-entra { from { opacity:0; transform:translateY(22px); filter:blur(8px) } to { opacity:1; transform:none; filter:none } }
        .av-entra { animation: av-entra 1s cubic-bezier(.16,.84,.3,1) both }
        section[id] { scroll-margin-top:${(showAnn ? PROMO_H : 0) + NAV_H + NAV_TOP + 16}px }
        /* Efectos al bajar (ver shared/efectosAutos): entran desenfocados, como algo que se enfoca. */
        @keyframes av-ef { from { opacity:0; transform:translateY(28px); filter:blur(10px) } to { opacity:1; transform:none; filter:none } }
        .ef-listo [data-ef="sube"]:not(.ef-in) > *, .ef-listo [data-ef="grilla"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="sube"].ef-in > *, .ef-listo [data-ef="grilla"].ef-in > * { animation: av-ef .9s cubic-bezier(.16,.84,.3,1) backwards }
        ${[2, 3, 4, 5, 6, 7, 8].map(n => `.ef-listo [data-ef].ef-in > :nth-child(${n}) { animation-delay:${((n - 1) * 0.07).toFixed(2)}s }`).join("\n        ")}
        .ef-listo [data-ef="titulo"] .ef-raya { transform-origin:left; transition: transform .9s .2s cubic-bezier(.16,.84,.3,1) }
        .ef-listo [data-ef="titulo"]:not(.ef-in) .ef-raya { transform:scaleX(0) }
        /* El showroom entra desde la profundidad; las filas del catálogo, de a una. */
        @keyframes av-profundo { from { opacity:0; transform:perspective(1400px) translateZ(-260px) rotateX(10deg) } to { opacity:1; transform:none } }
        .ef-listo [data-ef="profundo"]:not(.ef-in) > * { opacity:0 }
        .ef-listo [data-ef="profundo"].ef-in > * { animation: av-profundo 1.2s cubic-bezier(.16,.84,.3,1) backwards }
        @keyframes av-fila { from { opacity:0; transform:translateX(-28px); filter:blur(6px) } to { opacity:1; transform:none; filter:none } }
        .ef-listo [data-ef="fila"]:not(.ef-in) { opacity:0 }
        .ef-listo [data-ef="fila"].ef-in { animation: av-fila .7s cubic-bezier(.16,.84,.3,1) backwards }
        .ef-listo [data-ef].ef-ya > *, .ef-listo [data-ef].ef-ya .ef-raya { animation:none !important; transition:none !important }
        .ef-listo [data-ef].ef-ya { animation:none !important }
        @media (prefers-reduced-motion: reduce) { .av-entra { animation:none } .av-latido { animation:none } .av-incl { transition:none } .av-incl:hover { transform:none } }
      `}</style>

      <LineaDeProgreso acento={accent} enPanel={isPreview} capa={isPreview ? CAPAS.previaNavAlto + 1 : 120} />

      {/* ── BARRA DE AVISOS ── */}
      {showAnn && (
        <div style={{ position: isPreview ? "sticky" : "fixed", top: 0, left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
          zIndex: isPreview ? CAPAS.previaNavAlto : 110, height: PROMO_H, background: "#03040a", borderBottom: `1px solid ${conAlfa(accent, 0.3)}`,
          transform: barraOculta ? "translateY(-100%)" : "none", transition: "transform .4s cubic-bezier(.2,.8,.2,1)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 44px", gap: 10 }}>
          <span aria-hidden="true" className="av-latido" style={{ width: 6, height: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}`, animation: "av-latido 1.6s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(232,236,246,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {annMessages[annIdx % annMessages.length]}
          </span>
          <button type="button" onClick={() => setAnnVisible(false)} aria-label="Cerrar la barra de avisos"
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, background: "none", border: "none", color: "rgba(232,236,246,0.6)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── BARRA ── flota sobre la escena, no toca los bordes. Sus clics se prenden a
          mano ("auto") y eso le ganaba al candado de la raíz: con doble clic en "Ver
          vehículos" el segundo caía en "Showroom", que aparece en el mismo lugar, y
          volvía a la portada. Por eso también se apagan acá mientras cambia la pantalla. */}
      <div style={{ position: isPreview ? "sticky" : "fixed", top: (showAnn ? PROMO_H : 0) + (isPreview ? 0 : NAV_TOP), left: isPreview ? undefined : 0, right: isPreview ? undefined : 0,
        zIndex: isPreview ? CAPAS.previaNav : 100, padding: isPreview ? `${NAV_TOP}px clamp(10px,2vw,20px) 0` : "0 clamp(10px,2vw,20px)", pointerEvents: "none",
        transform: barraOculta ? `translateY(-${(showAnn ? PROMO_H : 0) + NAV_TOP + NAV_H + 24}px)` : "none", transition: "transform .4s cubic-bezier(.2,.8,.2,1)" }}>
        <nav aria-label="Principal" style={{ pointerEvents: vista.cambiandoPantalla ? "none" : "auto", maxWidth: 1240, margin: "0 auto", borderRadius: 18,
          /* Sin color elegido, el vidrio oscuro de siempre. Con uno oscuro elegido se lo respeta (antes cualquier oscuro quedaba en el negro de fábrica), con la misma transparencia. */
          background: !sc["navBg"] ? "rgba(8,11,21,0.62)" : navOscura && /^#?[\da-f]{6}$/i.test(navBg.trim()) ? conAlfa(navBg, 0.8) : navBg, backdropFilter: "blur(18px) saturate(1.4)",
          border: `1px solid ${navLinea}`, boxShadow: "0 18px 50px -24px rgba(0,0,0,0.7)", padding: "0 clamp(10px,1.6vw,16px)" }}>
          <div style={{ height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, color: navTinta }}>
              <MarcaNav modo={config?.marcaNav} logo={config?.storeLogo} nombre={storeName} alto="clamp(28px,5vw,36px)" anchoMax="min(160px,38vw)" enFila
                insignia={<span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: accent, boxShadow: `0 0 14px ${accent}`, flexShrink: 0, transform: "rotate(45deg)" }} />}>
                <span className="av-marca" style={{ fontWeight: 800, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.15 }}>
                  <EditableZone field="storeName" label="Nombre de la tienda">{storeName}</EditableZone>
                </span>
              </MarcaNav>
              <VerifiedIconButton isVerified={config?.isVerified} info={config?.verifiedInfo} color={navTinta} />
            </div>
            <div className="av-links" style={{ gap: 4, alignItems: "center" }}>
              {menuAncho.map(([lbl, id]) => (
                <button key={id} type="button" onClick={() => irDesdeMenu(id)} aria-current={id === "nosotros" && vista.enNosotros ? "page" : undefined} className="av-link"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, minHeight: 40, padding: "0 12px", borderRadius: 10, color: navTenue, fontFamily: "inherit" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir el buscador" className="av-ico" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button type="button" onClick={() => setFavoritesOpen(true)} aria-label={`Favoritos${favoriteProducts.length ? ` (${favoriteProducts.length})` : ""}`} className="av-ico" style={iconoBoton}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill={favoriteProducts.length > 0 ? accent : "none"} stroke={favoriteProducts.length > 0 ? accent : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {favoriteProducts.length > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 3, right: 3, background: accent, color: sobreAcento, borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{favoriteProducts.length}</span>}
              </button>
              {pushBell && config?.showPushBell && !isPreview && <span className="av-push"><StoreFollowButton storeSlug={slug} color={navTenue} size={19} /></span>}
              {pushBell && config?.showPushBell && !isPreview && (
                <button type="button" onClick={pushBell.openDrawer} aria-label="Novedades de la tienda" className="av-ico av-push" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" aria-hidden="true" fill={pushBell.followState === "following" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {pushBell.hasNew && <span style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, background: "#f43f5e", borderRadius: "50%" }} />}
                </button>
              )}
              {/* Maquetas de la campanita: sólo en el editor (en la demo pública no hay tienda que configurar). */}
              {enEditor && (
                <button type="button" onClick={config?.onPreviewBellClick} aria-label="Novedades de la tienda"
                  title={config?.showPushBell ? "Los clientes pueden seguir tu tienda desde acá" : "🔒 Solo Plan Plus"}
                  style={{ ...iconoBoton, opacity: config?.showPushBell ? 1 : 0.5 }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {!config?.showPushBell && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 5, width: 12, height: 12, background: "#f59e0b", borderRadius: "50%", fontSize: 8, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>★</span>}
                </button>
              )}
              <div ref={cuentaRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setCuentaOpen(o => !o)} aria-label="Mi cuenta" aria-expanded={cuentaOpen} className="av-ico" style={iconoBoton}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {cuentaOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 14px)", right: 0, minWidth: 210, zIndex: CAPAS.flotante, background: "#0a0e19", border: `1px solid ${LINEA}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.6)" }}>
                    {cargando ? (<p style={{ padding: "14px 16px", margin: 0, fontSize: 12, opacity: 0.6 }}>Cargando…</p>) : logueado ? (
                      <>
                        <p style={{ padding: "12px 16px 4px", fontSize: 11, color: "rgba(232,236,246,0.5)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombreMostrado}</p>
                        <a href={panelHref} onClick={() => setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "12px 16px", fontSize: 14, color: "#fff", textDecoration: "none", borderBottom: `1px solid ${LINEA}` }}>{panelLabel}</a>
                        <button type="button" onClick={() => { if (isPreview) return; setCuentaOpen(false); signOut("/"); }}
                          style={{ display: "block", width: "100%", padding: "12px 16px", fontSize: 14, color: "#fb7185", background: "none", border: "none", textAlign: "left", cursor: isPreview ? "default" : "pointer", opacity: isPreview ? 0.45 : 1, fontFamily: "inherit" }}>Cerrar sesión</button>
                      </>
                    ) : (
                      <>
                        <a href={isPreview ? undefined : `/login?redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "13px 16px", fontSize: 14, color: "#fff", textDecoration: "none", borderBottom: `1px solid ${LINEA}`, cursor: isPreview ? "default" : "pointer" }}>Iniciar sesión</a>
                        <a href={isPreview ? undefined : `/registro?plan=buyer&redirect=/tienda/${slug}`} onClick={() => !isPreview && setCuentaOpen(false)} className="av-link" style={{ display: "block", padding: "13px 16px", fontSize: 14, color: "#fff", textDecoration: "none", cursor: isPreview ? "default" : "pointer" }}>Registrarse</a>
                      </>
                    )}
                  </div>
                )}
              </div>
              <a href={vista.enCatalogo ? vista.urlTienda : todos} onClick={e => { if (vista.enCatalogo) { e.preventDefault(); vista.irALaPortada(); } else alClicTodos(e); }}
                className="av-solo-ancho" style={{ marginLeft: 6, background: accent, color: sobreAcento, textDecoration: "none", padding: "0 16px", minHeight: 40, alignItems: "center", fontSize: 13, fontWeight: 800, borderRadius: 10, boxShadow: `0 0 20px ${conAlfa(accent, 0.4)}` }}>
                {vista.enCatalogo ? "Showroom" : "Ver vehículos"}
              </a>
              <button className="av-burger av-ico" type="button" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Cerrar el menú" : "Abrir el menú"} aria-expanded={menuOpen}
                style={{ ...iconoBoton, border: `1px solid ${navLinea}`, color: navTinta, marginLeft: 4, fontSize: 18 }}>
                {menuOpen ? "×" : "☰"}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="av-menu" style={{ maxHeight:"calc(100dvh - 110px)", overflowY:"auto", overscrollBehavior:"contain", borderTop: `1px solid ${navLinea}`, padding: "6px 0 14px" }}>
              {menuCelu.map(([lbl, id, celu]) => (
                <button key={id} type="button" data-cel-bloque-oculto={celu ? "" : undefined} onClick={() => { irDesdeMenu(id); setMenuOpen(false); }}
                  style={{ display: "block", width: "100%", background: "none", border: "none", color: navTinta, cursor: "pointer", textAlign: "left", minHeight: 48, fontSize: 15, fontWeight: 600, fontFamily: "inherit", borderBottom: `1px solid ${navLinea}`, padding: "0 4px" }}>
                  {lbl}
                </button>
              ))}
              {pushBell && config?.showPushBell && !isPreview && (
                <div className="av-push-menu">
                  <StoreFollowButton storeSlug={slug} color={navTinta} size={18} fila={{ minHeight: 48, padding: "0 4px", fontSize: 15, fontWeight: 600, color: navTinta, borderBottom: `1px solid ${navLinea}` }} />
                  <button type="button" onClick={() => { setMenuOpen(false); pushBell.openDrawer(); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", minHeight: 48, padding: "0 4px", fontSize: 15, fontWeight: 600, color: navTinta, borderBottom: `1px solid ${navLinea}` }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Novedades{pushBell.hasNew && <span aria-label="hay novedades" style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />}
                  </button>
                </div>
              )}
              {!vista.enCatalogo && (
                <a href={todos} onClick={e => { setMenuOpen(false); alClicTodos(e); }} style={{ display: "flex", alignItems: "center", minHeight: 48, color: accent, fontSize: 15, fontWeight: 800, textDecoration: "none", padding: "0 4px" }}>
                  Ver todos los vehículos →
                </a>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* ── EL CATÁLOGO ── la ficha técnica de todo el stock (ver volt/CatalogoVolt). */}
      {vista.enCatalogo && (
        <section aria-label="Todos los vehículos" style={{ position: "relative", overflow: "hidden", background: VACIO, minHeight: "80vh",
          paddingTop: isPreview ? 20 : (showAnn ? PROMO_H : 0) + NAV_TOP + NAV_H + 20 }}>
          <EscenaVolt acento={accent} quieta />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "clamp(12px,2.5vh,32px) clamp(16px,4vw,32px) clamp(56px,8vw,96px)", boxSizing: "border-box" }}>
            {loadingProducts ? (
              <div role="status" aria-label="Cargando vehículos" style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
                <div style={{ width: 40, height: 40, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "av-spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <CatalogoVolt key={JSON.stringify(filtroPedido)} productos={products} opciones={opciones} filtroInicial={filtroCatalogo} escribirUrl={!isPreview && !!slug}
                acento={accent} moneda={currency} hrefDe={paginaDe} favoritos={favorites} onFavorito={toggleFavorite}
                comparando={comparando} onComparar={ocultas.includes("av-comparar") ? undefined : alternarComparar} onVolver={vista.irALaPortada}
                storeId={config?.storeId} isOwner={isOwner} isPreview={isPreview} />
            )}
          </div>
        </section>
      )}

      {/* ── LA AGENCIA ── página aparte: /tienda/<slug>/nosotros (ver volt/AgenciaVolt). */}
      {vista.enNosotros && (
        <section aria-label="La agencia" style={{ position: "relative", overflow: "hidden", background: VACIO, minHeight: "80vh",
          paddingTop: isPreview ? 20 : (showAnn ? PROMO_H : 0) + NAV_TOP + NAV_H + 20 }}>
          <EscenaVolt acento={accent} quieta />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "clamp(12px,2.5vh,32px) clamp(16px,4vw,32px) clamp(56px,8vw,96px)", boxSizing: "border-box" }}>
            <AgenciaVolt acento={accent} sobreAcento={sobreAcento} nombreTienda={storeName} waLink={waLink} todosHref={todos} onVerVehiculos={e => alClicTodos(e)} enPrevia={isPreview} />
          </div>
        </section>
      )}

      {vista.enPortada && (<>
      {/* ── PORTADA ── foto entera, título y buscador, como en los otros templates de autos (ver volt/PortadaVolt). */}
      <PortadaVolt ov={iovr["heroBackground"]} acento={accent} opciones={opciones} principal={principal} cuantos={loadingProducts ? 0 : products.length} waLink={waLink}
        datos={datosPortada}
        arriba={isPreview ? 0 : (showAnn ? PROMO_H : 0) + NAV_TOP + NAV_H} onBuscar={f => abrirCatalogo(f)} onVerTodos={e => alClicTodos(e)} todosHref={todos} />

      {/* ── EL SHOWROOM ── los vehículos giran y el elegido muestra sus datos. */}
      <section id="showroom" aria-label="Showroom" style={{ position: "relative", overflow: "hidden", background: VACIO, paddingTop: "clamp(40px,6vw,72px)" }}>
        <EscenaVolt acento={accent} quieta={isPreview} />
        <div data-ef="profundo" style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "clamp(12px,2.5vh,32px) clamp(16px,4vw,32px) clamp(48px,8vh,88px)", boxSizing: "border-box" }}>
          {loadingProducts ? (
            <div role="status" aria-label="Cargando vehículos" style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
              <div style={{ width: 40, height: 40, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "av-spin 0.8s linear infinite", boxShadow: `0 0 18px ${conAlfa(accent, 0.5)}` }} />
            </div>
          ) : (
            <EscenarioVolt productos={products} opciones={opciones} inicialId={foco?.id} acento={accent} moneda={currency} whatsapp={whatsapp} hrefDe={paginaDe}
              favoritos={favorites} onFavorito={toggleFavorite} comparando={comparando} onComparar={ocultas.includes("av-comparar") ? undefined : alternarComparar}
              selector={enEdicion ? <div style={{ marginBottom: 16 }}><SelectorVehiculoFoco productos={products} seleccionado={config?.featuredVehicleId} oscuro onChange={setFeaturedVehicleId} /></div> : undefined}
              cabecera={<>
                <p className="av-entra" style={{ margin: "0 0 14px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(232,236,246,0.8)",
                  padding: "7px 12px", borderRadius: 999, border: `1px solid ${conAlfa(accent, 0.35)}`, background: conAlfa(accent, 0.08), maxWidth: "100%", boxSizing: "border-box", overflowWrap: "anywhere" }}>
                  <span aria-hidden="true" className="av-latido" style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}`, animation: "av-latido 1.6s ease-in-out infinite" }} />
                  <span style={{ minWidth: 0 }}><EditableZone field="showroomKicker" label="Etiqueta del showroom">Showroom en línea</EditableZone></span>
                </p>
                <h2 className="av-entra" style={{ margin: "0 0 10px", fontSize: "clamp(30px,4.2vw,54px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.98, animationDelay: ".08s",
                  backgroundImage: `linear-gradient(180deg, #ffffff 35%, ${conAlfa(accent, 0.95)} 150%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#fff" }}>
                  <EditableZone field="showroomHeading" label="Título del showroom">Recorré el showroom</EditableZone>
                </h2>
                <p className="av-entra" style={{ margin: 0, fontSize: "clamp(14px,1.4vw,16px)", color: "rgba(232,236,246,0.65)", lineHeight: 1.6, animationDelay: ".16s" }}>
                  <EditableZone field="showroomSubtext" label="Subtítulo del showroom">Pasalos con las flechas o deslizando, y tocá el que te guste para ver todo.</EditableZone>
                </p>
              </>} />
          )}
        </div>
      </section>

      <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── CARTELERA ── tres carteles que pasan solos (ver volt/CarteleraVolt).
           En la tienda sólo aparece cuando la agencia sube una foto propia. */}
      <SectionBlock id="av-cartelera" label="Cartelera" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {(isPreview || hayFotosDeCartelera(iovr)) ? (
        <section id="cartelera" aria-label="Cartelera" style={{ padding: "clamp(40px,5vw,64px) clamp(16px,4vw,32px)", position: "relative", ...fCartelera.estilo, borderTop: `1px solid ${fCartelera.linea}` }}>
          {capa("bgCartelera", "Fondo de la cartelera", fCartelera.ov)}
          <div data-ef="sube" style={ancho}>
            <CarteleraVolt fotos={[iovr["promoBanner1"], iovr["promoBanner2"], iovr["promoBanner3"]]} acento={accent}
              intervalMs={carruselMs("auto-volt", config?.bannerInterval)} editMode={editMode && isPreview} ejemplosEnTienda={isPreview} hrefStock={todos} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── COMPARADOR ── hasta tres lado a lado (ver volt/ComparadorVolt). */}
      <SectionBlock id="av-comparar" label="Comparador" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {products.length >= 2 ? (
        <section id="comparar" style={{ padding: pad, position: "relative", ...fComparar.estilo, borderTop: `1px solid ${fComparar.linea}` }}>
          {capa("bgComparar", "Fondo del comparador", fComparar.ov)}
          <div data-ef="sube" style={ancho}>
            <Titulo acento={accent} tinta={fComparar.tinta}
              codigo={<EditableZone field="compararKicker" label="Etiqueta del comparador">Comparador</EditableZone>}
              titulo={<EditableZone field="compararHeading" label="Título del comparador">Ponelos lado a lado</EditableZone>}
              derecha={<p style={{ margin: 0, maxWidth: 340, fontSize: 14, lineHeight: 1.55, color: fComparar.tenue }}>Sumá vehículos con <strong style={{ color: fComparar.tinta }}>⇄ Comparar</strong> en el showroom, o elegilos acá.</p>} />
            <ComparadorVolt productos={products} ids={idsComparados} acento={accent} moneda={currency} hrefDe={paginaDe}
              onQuitar={id => setEleccion(idsComparados.filter(x => x !== id))}
              onAgregar={id => setEleccion([...idsComparados, id].slice(-3))} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── TASÁ TU USADO / AVISAME SI ENTRA ── */}
      <SectionBlock id="av-tasar" label="Tasá tu usado y Avisame si entra" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="tasar" style={{ padding: pad, position: "relative", ...fTasar.estilo, borderTop: `1px solid ${fTasar.linea}` }}>
        {capa("bgTasar", "Fondo de tasación", fTasar.ov)}
        <div data-ef="sube" style={ancho}>
          <Titulo acento={accent} tinta={fTasar.tinta}
            codigo={<EditableZone field="tasarKicker" label="Etiqueta de tasación">Antes de comprar</EditableZone>}
            titulo={<EditableZone field="tasarHeading" label="Título de tasación">Te ayudamos a dar el paso</EditableZone>} />
          <ServiciosVolt storeId={config?.storeId} acento={accent} isOwner={isOwner} isPreview={isPreview}
            textos={{
              tasarTitulo: <EditableZone field="tasarTitulo" label="Tasá tu usado — título">¿Tenés un usado?</EditableZone>,
              tasarTexto: <EditableZone field="tasarTexto" label="Tasá tu usado — texto">Contanos qué tenés y te respondemos con una oferta, para tomarlo en parte de pago o comprártelo.</EditableZone>,
              avisameTitulo: <EditableZone field="avisameTitulo" label="Avisame si entra — título">¿No está lo que buscás?</EditableZone>,
              avisameTexto: <EditableZone field="avisameTexto" label="Avisame si entra — texto">Dejanos marca, modelo y hasta cuánto querés gastar. Cuando entre, te escribimos primero.</EditableZone>,
            }} />
        </div>
      </section>
      </SectionBlock>

      {/* ── VIDEOS ── los que la agencia subió en sus vehículos, en tarjetas chicas. */}
      <SectionBlock id="av-videos" label="Videos" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      {(videos.length > 0 || enEditor) ? (
        <section style={{ padding: pad, position: "relative", ...fVideos.estilo, borderTop: `1px solid ${fVideos.linea}` }}>
          {capa("bgVideos", "Fondo de videos", fVideos.ov)}
          <div data-ef="sube" style={ancho}>
            <Titulo acento={accent} tinta={fVideos.tinta}
              codigo={<EditableZone field="videosKicker" label="Etiqueta de videos">En video</EditableZone>}
              titulo={<EditableZone field="videosHeading" label="Título de videos">Miralos andar</EditableZone>} />
            <VideosVolt videos={videos} acento={accent} moneda={currency} tinta={fVideos.tinta} hrefDe={paginaDeId}
              vacio={<p style={{ margin: 0, padding: "24px 20px", border: `1px dashed ${fVideos.linea}`, borderRadius: 18, color: fVideos.tenue, fontSize: 14, lineHeight: 1.6 }}>
                Acá aparecen los videos que subas en cada vehículo (en Productos → el vehículo → Videos). Cada uno lleva a su vehículo. Mientras no haya ninguno, este bloque no se muestra en la tienda.
              </p>} />
          </div>
        </section>
      ) : null}
      </SectionBlock>

      {/* ── PREGUNTAS ── una conversación, no un acordeón (ver volt/BloquesVolt). */}
      <SectionBlock id="av-preguntas" label="Preguntas frecuentes" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="preguntas" style={{ padding: pad, position: "relative", ...fPreguntas.estilo, borderTop: `1px solid ${fPreguntas.linea}` }}>
        {capa("bgPreguntas", "Fondo de preguntas", fPreguntas.ov)}
        <div data-ef="sube" className="av-faq" style={ancho}>
          <div className="av-faq-lado" style={{ minWidth: 0 }}>
            <Titulo acento={accent} tinta={fPreguntas.tinta}
              codigo={<EditableZone field="faqKicker" label="Etiqueta de preguntas">Preguntas</EditableZone>}
              titulo={<EditableZone field="faqTitulo" label="Título de preguntas">Preguntanos lo que quieras</EditableZone>} />
            <p style={{ margin: "-10px 0 0", maxWidth: 380, fontSize: 15, lineHeight: 1.65, color: fPreguntas.tenue }}>
              <EditableZone field="faqOtraTexto" label="Texto de preguntas">Tocá una pregunta y te contestamos al toque. Si la tuya no está, escribinos: te contesta una persona, no un robot.</EditableZone>
            </p>
          </div>
          <ChatPreguntasVolt acento={accent} nombreTienda={storeName} enEdicion={enEdicion}
            preguntas={armarPreguntasAutos({ monedas: opciones.monedas.length ? opciones.monedas : [principal], conWhatsapp: !!waLink })}
            otraDuda={
              <a href={waLink ?? "#contacto"} {...(waLink ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={isPreview ? e => e.preventDefault() : undefined}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 16px", borderRadius: 999, background: accent, color: sobreAcento, fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>
                {waLink ? <><WaIcon size={15} /> Otra pregunta</> : "Otra pregunta →"}
              </a>} />
        </div>
      </section>
      </SectionBlock>

      {/* ── NOVEDADES POR MAIL ── la lista a la que le escribe Notificaciones (ver NewsletterForm). */}
      <SectionBlock id="av-novedades" label="Recibí los ingresos por mail" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section style={{ padding: "clamp(48px,7vw,88px) clamp(16px,4vw,32px)", position: "relative", ...fNovedades.estilo }}>
        {capa("bgNovedades", "Fondo de novedades", fNovedades.ov)}
        <div data-ef="sube" style={{ ...ancho, maxWidth: 860 }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, padding: "clamp(26px,5vw,48px)", textAlign: "center",
            background: `radial-gradient(120% 90% at 50% 0%, ${conAlfa(accent, 0.22)}, #0a0e19 60%)`, border: `1px solid ${conAlfa(accent, 0.35)}` }}>
            <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: accent }}>
              <EditableZone field="novedadesKicker" label="Etiqueta de novedades">Novedades</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: "#fff" }}>
              <EditableZone field="novedadesHeading" label="Título de novedades">Enterate primero de lo que entra</EditableZone>
            </h2>
            <p style={{ margin: "0 auto 22px", maxWidth: 520, fontSize: 15, lineHeight: 1.6, color: "rgba(232,236,246,0.7)" }}>
              <EditableZone field="novedadesTexto" label="Texto de novedades">Dejanos tu mail y te avisamos cuando ingresen unidades nuevas o baje un precio. Sin spam.</EditableZone>
            </p>
            <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "left" }}>
              <NewsletterForm slug={slug} isPreview={isPreview} placeholder="tu@email.com" boton="Avisarme"
                theme={{
                  form: { display: "flex", gap: 6, background: "rgba(5,7,13,0.7)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 6 },
                  input: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 15, padding: "12px 10px", fontFamily: "inherit" },
                  boton: { flexShrink: 0, background: accent, color: sobreAcento, border: "none", borderRadius: 10, padding: "0 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
                  colorMensaje: "#e8ecf6",
                  colorError: "#fb7185",
                }} />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(232,236,246,0.45)", lineHeight: 1.5, textAlign: "center" }}>Te llega un mail para confirmar. Te das de baja cuando quieras.</p>
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>

      {/* ── LA AGENCIA ── nosotros, los números y el contacto en un solo panel. */}
      <SectionBlock id="av-nosotros" label="La agencia" isPreview={isPreview} defaultOrder={AV_SECTION_IDS}>
      <section id="nosotros" style={{ padding: pad, position: "relative", ...fNosotros.estilo, borderTop: `1px solid ${fNosotros.linea}` }}>
        {capa("bgNosotros", "Fondo de la agencia", fNosotros.ov)}
        <div data-ef="sube" className="av-about" style={{ ...ancho, scrollMarginTop: (showAnn ? PROMO_H : 0) + NAV_H + NAV_TOP + 16 }}>
          <div className="av-incl" style={{ borderRadius: 26, padding: 1, background: `linear-gradient(160deg, ${conAlfa(accent, 0.7)}, transparent 45%, ${conAlfa(accent, 0.3)})` }}>
            <div style={{ position: "relative", borderRadius: 25, overflow: "hidden", aspectRatio: "5/4", background: "#03040a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la dueña */}
              <img src={fotoLiviana(nosotrosUrl, 1200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {(() => {
                const ov = iovr["nosotrosImage"];
                if (!ov?.overlayType || ov.overlayType === "none") return null;
                return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />;
              })()}
              <EditableImageButton field="nosotrosImage" label="Foto de la agencia" />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: accent }}>
              <EditableZone field="nosotrosKicker" label="Etiqueta de la agencia">La agencia</EditableZone>
            </p>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(28px,4.2vw,48px)", fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.04, color: fNosotros.tinta }}>
              <EditableZone field="nosotrosHeading" label="Título de la agencia">Vehículos elegidos uno por uno</EditableZone>
            </h2>
            <p style={{ margin: "0 0 22px", fontSize: 16, lineHeight: 1.8, color: fNosotros.tenue }}>
              <EditableZone field="nosotrosP1" label="Párrafo de la agencia">Somos especialistas en compra y venta de vehículos usados y a estrenar. Cada uno tiene fotos reales, su ficha técnica y el precio a la vista.</EditableZone>
            </p>
            {stats.length > 0 && (
              <div className="av-stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 26px" }}>
                {stats.map((s, i) => (
                  <div key={s.fv} style={{ padding: "12px 16px", borderRadius: 14, border: `1px solid ${fNosotros.claro ? "rgba(11,16,32,0.12)" : conAlfa(accent, 0.3)}`, background: fNosotros.claro ? "rgba(11,16,32,0.03)" : conAlfa(accent, 0.07), minWidth: 0 }}>
                    <p data-ef-contar style={{ margin: 0, fontFamily: MONO, fontSize: 24, fontWeight: 700, lineHeight: 1, color: fNosotros.claro ? fNosotros.tinta : "#fff", textShadow: fNosotros.claro ? "none" : `0 0 16px ${conAlfa(accent, 0.55)}` }}>
                      <EditableZone field={s.fv} label={`Número ${i + 1}`}>{s.n}</EditableZone>
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: fNosotros.tenue }}>
                      <EditableZone field={s.fl} label={`Texto del número ${i + 1}`}>{s.l}</EditableZone>
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="av-ctas" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 50, padding: "0 22px", borderRadius: 14, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15, boxShadow: "0 12px 34px -12px rgba(37,211,102,0.7)" }}>
                  <WaIcon size={19} />
                  <EditableZone field="contactWhatsApp" label="Texto del botón de WhatsApp">Escribinos por WhatsApp</EditableZone>
                </a>
              )}
              <Link href={todos} onClick={e => alClicTodos(e)} style={{ display: "inline-flex", alignItems: "center", minHeight: 50, padding: "0 22px", borderRadius: 14, border: `1px solid ${fNosotros.claro ? "rgba(11,16,32,0.25)" : "rgba(255,255,255,0.22)"}`, color: fNosotros.tinta, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
                Ver todos los vehículos
              </Link>
              {conAgencia && <a href={`${vista.urlTienda}/nosotros${vista.sufijoEditor}`} onClick={e => { e.preventDefault(); vista.irANosotros(); }}
                style={{ display: "inline-flex", alignItems: "center", minHeight: 50, padding: "0 6px", color: accent, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
                Conocé la agencia →
              </a>}
            </div>
          </div>
        </div>
      </section>
      </SectionBlock>
      </div>
      </>)}

      {/* La barra de comparación: aparece cuando hay vehículos elegidos y lleva al comparador. */}
      {comparando.length > 1 && !editMode && !searchOpen && !ocultas.includes("av-comparar") && (
        // Oculto sólo en el celular: la barra se va con el bloque (su "Ver" bajaba a algo escondido).
        <div role="status" data-cel-bloque-oculto={ocultasCelu.includes("av-comparar") ? "" : undefined} style={{ position: "fixed", left: 16, bottom: 24, zIndex: isPreview ? CAPAS.previaModal : CAPAS.panel, display: "flex", alignItems: "center", gap: 10,
          padding: "8px 8px 8px 14px", borderRadius: 16, background: "rgba(8,11,21,0.88)", backdropFilter: "blur(14px)", border: `1px solid ${conAlfa(accent, 0.45)}`,
          boxShadow: `0 18px 40px -16px ${conAlfa(accent, 0.7)}`, maxWidth: "calc(100vw - 104px)", boxSizing: "border-box" }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: "#fff", whiteSpace: "nowrap" }}><span style={{ color: accent }}>⇄</span> {comparando.length} para comparar</span>
          <button type="button" onClick={() => irA("comparar")} style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, border: "none", background: accent, color: sobreAcento, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Ver</button>
        </div>
      )}

      {/* ── PIE ── */}
      <footer id="contacto" style={{ position: "relative", padding: "clamp(40px,6vw,64px) clamp(16px,4vw,32px) 24px", scrollMarginTop: (showAnn ? PROMO_H : 0) + NAV_H + NAV_TOP + 16, ...fPie.estilo, borderTop: `1px solid ${conAlfa(accent, 0.25)}` }}>
        {capa("bgFooter", "Fondo del pie", fPie.ov, "Pie de la tienda")}
        <div style={ancho}>
          <ContenidoPieAutos slug={slug} storeName={storeName} products={products} legales={config?.legales} enEditor={isPreview}
            whatsapp={whatsapp.enabled ? whatsapp.number : null} redes={config?.socialLinks} acento={accent} estilo="volt" onVerVehiculos={tipo => abrirCatalogo(tipo ? { tipo } : {})}
            colores={fPie.claro ? { tinta: TINTA_CLARA, suave: fPie.tenue, linea: "rgba(11,16,32,0.12)" } : { tinta: "#ffffff", suave: fPie.tenue, linea: "rgba(255,255,255,0.1)" }}
            descripcion={<EditableZone field="footerFrase" label="Frase del pie">{FRASE_PIE}</EditableZone>}
            copyright={<EditableZone field="footerCopyright" label="Copyright">{`© ${new Date().getFullYear()} ${storeName}.`}</EditableZone>}
            onReportar={isOwner ? undefined : () => setShowReport(true)} />
        </div>
      </footer>

      {showReport && <ReportStoreModal slug={slug} onClose={() => setShowReport(false)} />}
      {fav.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 20, zIndex: isPreview ? CAPAS.previaModal : 230, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, maxWidth: 440, background: "#0a0e19", border: `1px solid ${conAlfa(accent, 0.35)}`, color: "#fff", borderRadius: 14, padding: "12px 12px 12px 16px", boxShadow: "0 14px 40px rgba(0,0,0,0.6)", fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ flex: 1, overflowWrap: "anywhere" }}>{fav.aviso}</span>
            <button type="button" onClick={fav.cerrarAviso} aria-label="Cerrar aviso" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── BUSCADOR ── en su capa (CAPAS.buscador): empatada con la barra, la barra se comía el clic de la ×. */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Buscar vehículos" onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: CAPAS.buscador, background: "rgba(5,7,13,0.94)", backdropFilter: "blur(14px)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "clamp(72px,14vh,128px)" }}>
          <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Cerrar búsqueda"
            style={{ position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: `1px solid ${LINEA}`, color: "#fff", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
          <div style={{ width: "100%", maxWidth: 720, padding: "0 clamp(16px,4vw,24px)", boxSizing: "border-box" }}>
            <p style={{ margin: "0 0 10px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: accent }}>BUSCAR EN EL STOCK</p>
            <input autoFocus type="search" aria-label="Buscar vehículos" maxLength={80} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Marca, modelo, año…"
              style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${accent}`, boxShadow: `0 1px 0 0 ${conAlfa(accent, 0.6)}`, color: "#fff", fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, padding: "12px 0", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ width: "100%", maxWidth: 960, padding: "24px clamp(16px,4vw,24px)", overflowY: "auto", boxSizing: "border-box" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
                {searchResults.slice(0, 24).map(p => (
                  <Link key={p.id} href={paginaDe(p)} style={{ display: "block", background: "rgba(255,255,255,0.04)", border: `1px solid ${LINEA}`, borderRadius: 16, textDecoration: "none", color: "#fff", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                    <img src={fotoLiviana(p.images[0], 640)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block", background: VACIO }} />
                    <div style={{ padding: "10px 12px 12px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", overflowWrap: "anywhere" }}>{p.name}</p>
                      <p style={{ fontFamily: MONO, fontSize: 13, color: accent, margin: 0 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, currency)) : "Consultar"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {searchResults.length > 24 && (
                <Link href={linkAVehiculos(slug, { q: searchQuery.trim() }, isPreview)}
                  onClick={e => { alClicTodos(e, { q: searchQuery.trim() }); setSearchOpen(false); setSearchQuery(""); }} style={{ display: "block", textAlign: "center", marginTop: 18, color: accent, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                  Ver los {searchResults.length} resultados →
                </Link>
              )}
            </div>
          )}
          {searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <p style={{ color: "rgba(232,236,246,0.55)", marginTop: 32, fontSize: 14, padding: "0 16px", textAlign: "center", overflowWrap: "anywhere" }}>
              Nada con &ldquo;{searchQuery}&rdquo;. Probá con otra marca o modelo.
            </p>
          )}
        </div>
      )}

      {/* ── FAVORITOS ── */}
      <div role="dialog" aria-modal="true" aria-label="Favoritos" inert={!favoritesOpen} aria-hidden={!favoritesOpen}
        style={{ position: "fixed", inset: 0, zIndex: isPreview ? CAPAS.previaModal : 205, pointerEvents: favoritesOpen ? "auto" : "none" }}>
        <div onClick={() => setFavoritesOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", opacity: favoritesOpen ? 1 : 0, transition: "opacity 0.3s" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100vw", background: "#080b15", color: "#fff", transform: favoritesOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", borderLeft: `1px solid ${conAlfa(accent, 0.3)}` }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${LINEA}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Favoritos <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 13, color: accent }}>{String(favoriteProducts.length).padStart(2, "0")}</span></p>
            <button type="button" onClick={() => setFavoritesOpen(false)} aria-label="Cerrar favoritos" style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", width: 44, height: 44, marginRight: -10 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
            {favoriteProducts.length === 0 ? (
              <p style={{ textAlign: "center", padding: "52px 0", margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(232,236,246,0.55)" }}>Todavía no guardaste ninguno.<br />Tocá el corazón de un vehículo para tenerlo acá.</p>
            ) : favoriteProducts.map(product => (
              <div key={product.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${LINEA}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
                <img src={fotoLiviana(product.images[0], 256)} alt="" style={{ width: 96, height: 68, objectFit: "cover", borderRadius: 10, flexShrink: 0, background: VACIO }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", overflowWrap: "anywhere" }}>{product.name}</p>
                  <p style={{ fontFamily: MONO, fontSize: 13, color: accent, margin: "0 0 10px" }}>{product.price > 0 ? fmtPrice(product.price, monedaDe(product, currency)) : "Consultar"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={paginaDe(product)} style={{ background: accent, color: sobreAcento, borderRadius: 10, padding: "0 14px", minHeight: 36, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ver</Link>
                    <button type="button" onClick={() => toggleFavorite(product.id)} style={{ background: "transparent", color: "rgba(232,236,246,0.75)", border: `1px solid ${LINEA}`, borderRadius: 10, padding: "0 14px", minHeight: 36, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Quitar</button>
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
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: CAPAS.panel, background: "#25d366", color: "#fff", width: 56, height: 56, borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <WaIcon size={24} />
        </a>
      )}
    </div>
  );
}
