"use client";

import { useEffect, useState, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import DashboardLayout from "@/components/DashboardLayout";
import StorePreview, { StoreConfig } from "@/components/StorePreview";
import {
  Loader2, Save, Users, Palette, Layout, Type,
  Image as ImageIcon, Monitor, Smartphone, Tablet, LayoutGrid,
  List, Grid2X2, ChevronDown, ChevronUp, Megaphone, Share2,
  MousePointer2, CreditCard, Search, ExternalLink,
  Plus, Trash2, Layers, X, Copy, Menu, Link,
} from "lucide-react";

/* ─── Templates ─── */
const TEMPLATES = [
  { id:"default",  name:"Clean",     emoji:"⬜", desc:"Blanco, aireado, fotos grandes — estilo Zara" },
  { id:"fashion",  name:"Editorial", emoji:"👗", desc:"Revista de moda, grid portrait, tipografía bold" },
  { id:"boutique", name:"Boutique",  emoji:"🛍️", desc:"Elegante y cálido, cards premium con sombra" },
  { id:"colorful", name:"Vívido",    emoji:"🎨", desc:"Colores fuertes, moderno y energético" },
  { id:"luxury",   name:"Luxury",    emoji:"✨", desc:"Dark premium, catálogo numerado, acento dorado" },
  { id:"vintage",  name:"Clásico",   emoji:"🏛️", desc:"Tipografía serif, estilo heritage profesional" },
  { id:"sport",    name:"Sport",     emoji:"⚡", desc:"Dark + neón, cards horizontales, muy energético" },
  { id:"tech",     name:"Moderno",   emoji:"🖥️", desc:"Gris claro, split hero, grid limpio y profesional" },
  { id:"kids",     name:"Colorful",  emoji:"🎀", desc:"Colores vivos, redondeado, divertido pero prolijo" },
  { id:"market",   name:"Market",    emoji:"🏪", desc:"Sidebar de filtros, grid denso, estilo marketplace" },
];

const FUENTES = ["Inter","Poppins","Playfair Display","Roboto","Montserrat","Lato","Raleway","Oswald","Nunito","DM Sans"];

const PALETTES = [
  { name:"Índigo",    primary:"#6366f1", secondary:"#f1f5f9", accent:"#f59e0b" },
  { name:"Rosa",      primary:"#ec4899", secondary:"#fdf2f8", accent:"#8b5cf6" },
  { name:"Esmeralda", primary:"#059669", secondary:"#f0fdf4", accent:"#f59e0b" },
  { name:"Océano",    primary:"#0284c7", secondary:"#f0f9ff", accent:"#6366f1" },
  { name:"Coral",     primary:"#f97316", secondary:"#fff7ed", accent:"#14b8a6" },
  { name:"Negro",     primary:"#111827", secondary:"#f9fafb", accent:"#6366f1" },
  { name:"Vino",      primary:"#9f1239", secondary:"#fff1f2", accent:"#d97706" },
  { name:"Oliva",     primary:"#4d7c0f", secondary:"#f7fee7", accent:"#ca8a04" },
  { name:"Violeta",   primary:"#7c3aed", secondary:"#f5f3ff", accent:"#ec4899" },
  { name:"Pizarra",   primary:"#475569", secondary:"#f8fafc", accent:"#0ea5e9" },
];
const LAYOUTS = [
  { id:"grid2",label:"2 col",icon:Grid2X2 },
  { id:"grid3",label:"3 col",icon:LayoutGrid },
  { id:"grid4",label:"4 col",icon:Layout },
  { id:"list", label:"Lista",icon:List },
];
const HERO_STYLES   = [{id:"full",label:"Grande"},{id:"compact",label:"Compacto"},{id:"minimal",label:"Sin banner"}];
const NAVBAR_STYLES = [{id:"solid",label:"Sólido"},{id:"transparent",label:"Transparente"},{id:"minimal",label:"Minimal"}];
const BTN_STYLES    = [{id:"rounded",label:"Redondeado"},{id:"pill",label:"Píldora"},{id:"square",label:"Cuadrado"},{id:"outline",label:"Borde"}];
const CARD_RADIUS   = [{id:"none",label:"Recto"},{id:"sm",label:"Suave"},{id:"md",label:"Medio"},{id:"lg",label:"Grande"},{id:"xl",label:"Máximo"}];
const CARD_SHADOW   = [{id:"none",label:"Sin sombra"},{id:"sm",label:"Suave"},{id:"md",label:"Media"},{id:"lg",label:"Fuerte"}];
const BG_STYLES     = [{id:"plain",label:"Liso"},{id:"gradient",label:"Degradado"},{id:"pattern",label:"Patrón"}];
const CURRENCIES    = [{id:"ARS",label:"Pesos ARS"},{id:"USD",label:"Dólares USD"}];

const SOCIAL_SVGS: Record<string,{path:string;bg:string}> = {
  instagram: { bg:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", path:"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  facebook:  { bg:"#1877F2", path:"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  tiktok:    { bg:"#111827", path:"M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z" },
  whatsapp:  { bg:"#25D366", path:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
  email:     { bg:"#6366f1", path:"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" },
};

const ALL_CHANNELS = [
  { key:"showInstagram", url:"instagramUrl",   label:"Instagram", network:"instagram", ph:"@mitienda o URL completa" },
  { key:"showFacebook",  url:"facebookUrl",    label:"Facebook",  network:"facebook",  ph:"facebook.com/mitienda" },
  { key:"showTiktok",    url:"tiktokUrl",      label:"TikTok",    network:"tiktok",    ph:"@mitienda" },
  { key:"showWhatsapp",  url:"whatsappNumber", label:"WhatsApp",  network:"whatsapp",  ph:"5491112345678" },
  { key:"showEmail",     url:"emailAddress",   label:"Email",     network:"email",     ph:"tu@email.com" },
] as const;

type DesignSection = "template"|"colores"|"textos"|"imagenes"|"layout"|"tarjetas"|"anuncio"|"redes"|"footer"|"vendedoras"|"seo"|"tienda";
type NavLink = { id: string; label: string; type: "filter" | "url" | "section"; value: string };

/* ─── Block types ─── */
export type BlockType = "hero"|"text"|"products"|"banner"|"banner-group"|"cta"|"image-text"|"socials"|"spacer"|"divider"|"navbar"|"contacto"|"nosotros";
export interface Block { id:string; type:BlockType; props:Record<string,any> }
type PreviewViewport = "desktop"|"tablet"|"mobile";
type TextPosition = { x: number; y: number };
type PreviewProduct = {
  id: string;
  name: string;
  price?: number | null;
  comparePrice?: number | null;
  description?: string | null;
  images?: string | null;
  reelUrls?: string | null;
  category?: string | null;
  subcategory?: string | null;
  variants?: { name: string; value: string; stock: number; price?: number | null }[];
  attributes?: Record<string, string> | null;
}

const BLOCK_LIBRARY: { type:BlockType; emoji:string; label:string; desc:string; defaultProps:Record<string,any> }[] = [
  { type:"navbar",     emoji:"🧭", label:"Menú de navegación", desc:"Barra superior con links, buscador y menú hamburguesa",
    defaultProps:{ navConfig:'{"layout":"right","showSearch":false,"links":[]}' } },
  { type:"hero",       emoji:"🖼️", label:"Hero / Portada",       desc:"Título grande, subtítulo y botón de acción",
    defaultProps:{ title:"¡Bienvenidos a mi tienda!", subtitle:"Encontrá todo lo que buscás", buttonText:"Ver productos", bgColor:"", textColor:"#ffffff", layout:"center", height:"lg" } },
  { type:"text",       emoji:"📝", label:"Bloque de texto",        desc:"Título y párrafo de texto libre",
    defaultProps:{ heading:"Sobre nosotros", body:"Somos una tienda con años de experiencia...", align:"center", fontSize:"md", color:"", textColor:"", bgColor:"" } },
  { type:"products",   emoji:"🛍️", label:"Grilla de productos",    desc:"Muestra tu catálogo con columnas configurables",
    defaultProps:{ heading:"Nuestros productos", columns:3, layoutMode:"grid", showHeading:true, categoryFilter:"all", subcategoryFilter:"all", showCategoryTabs:true, color:"", bgColor:"" } },
  { type:"banner",     emoji:"📢", label:"Banda de anuncio",       desc:"Franja de color con texto destacado",
    defaultProps:{ text:"🔥 ¡Oferta especial! Envío gratis hoy", bgColor:"#f59e0b", textColor:"#000000", size:"md" } },
  { type:"cta",        emoji:"🚀", label:"Llamada a la acción",    desc:"Sección oscura con botón grande destacado",
    defaultProps:{ heading:"¿Lista para comprar?", sub:"Envíos a todo el país", buttonText:"Ver catálogo", bgColor:"#0f172a", textColor:"#ffffff" } },
  { type:"image-text", emoji:"🖼️", label:"Imagen + Texto",         desc:"Foto al lado de texto descriptivo (split)",
    defaultProps:{ heading:"¿Por qué elegirnos?", body:"Calidad y atención garantizada en cada compra.", image:"", imagePosition:"left", imageFit:"cover", imageFocus:"center", color:"", textColor:"", bgColor:"", imageBgColor:"", imageRadius:"redondeada" } },
  { type:"spacer",     emoji:"⬜", label:"Espacio en blanco",      desc:"Separador con texto, emoji y color opcionales",
    defaultProps:{ height:"md", text:"", emoji:"", bgColor:"", textColor:"", lineStyle:"none", lineColor:"#e5e7eb" } },
  { type:"socials",    emoji:"link", label:"Redes / Contacto",       desc:"Iconos, botones o tarjeta con tus canales",
    defaultProps:{ heading:"Seguinos y contactanos", showHeading:true, layout:"icons", color:"", bgColor:"", showInstagram:true, showFacebook:true, showTiktok:true, showWhatsapp:true, showEmail:true, instagramUrl:"", facebookUrl:"", tiktokUrl:"", whatsappNumber:"", emailAddress:"" } },
  { type:"divider",    emoji:"─", label:"Línea separadora",        desc:"Línea horizontal decorativa",
    defaultProps:{ style:"solid", color:"#e5e7eb" } },
  { type:"contacto",   emoji:"✉️", label:"Formulario de contacto",  desc:"Formulario que envía un email al dueño de la tienda",
    defaultProps:{ heading:"Contacto", subtitle:"¿Tenés alguna pregunta? Escribinos.", bgColor:"#111827", textColor:"", bgImage:"", showName:true, showEmail:true, showPhone:false, showMessage:true, buttonText:"Enviar mensaje", buttonColor:"" } },
  { type:"nosotros",   emoji:"👥", label:"Página Nosotros",          desc:"Encabezado, equipo, misión/visión y grilla de características",
    defaultProps:{ tag:"NOSOTROS", heading:"¿Quiénes somos?", subtitle:"Conocé al equipo detrás de la tienda.", bgColor:"#ffffff", textColor:"#111827", showMembers:false, members:[], showTextSection:false, textSectionHeading:"Misión y Visión", textSectionBody:"", showFeatures:false, featuresHeading:"Lo que hacemos", featuresSubtitle:"", featuresBgColor:"#4338ca", features:[] } },
  { type:"banner-group", emoji:"🎠", label:"Carrusel de banners",     desc:"Imágenes full-width que pasan automáticamente",
    defaultProps:{ slides:[
      { image:"", title:"Bienvenidos", subtitle:"Descubrí nuestra colección", buttonText:"Ver productos", buttonUrl:"", focalX:50, focalY:50 },
      { image:"", title:"Envíos gratis", subtitle:"En compras mayores a $X", buttonText:"Aprovechar", buttonUrl:"", focalX:50, focalY:50 },
    ], height:"md", autoplay:true, speed:4, showDots:true, showArrows:true, overlayColor:"#000000", overlayOpacity:35, textColor:"#ffffff", textAlign:"center" } },
];

/* ─── Bloques prediseñados por template ─── */
const TEMPLATE_BLOCKS: Record<string, Omit<Block,"id">[]> = {
  default:  [ // Clean
    { type:"hero",        props:{ title:"¡Bienvenidos a mi tienda!", subtitle:"Encontrá todo lo que buscás", buttonText:"Ver colección", layout:"center", height:"lg" } },
    { type:"products",   props:{ heading:"Nuestros productos", columns:3, layoutMode:"grid", showHeading:true } },
    { type:"text",        props:{ heading:"Sobre nosotros", body:"Contá de qué se trata tu tienda y qué te hace especial.", align:"center", fontSize:"md" } },
    { type:"socials",     props:{ heading:"Seguinos en redes", showInstagram:true, showWhatsapp:true, showFacebook:true, columns:3 } },
  ],
  fashion:  [ // Editorial
    { type:"banner",      props:{ text:"✨ NUEVA TEMPORADA — EXPLORÁ LA COLECCIÓN", bgColor:"#111827", textColor:"#f9fafb" } },
    { type:"hero",        props:{ title:"La nueva colección llegó", subtitle:"Moda que te expresa. Piezas únicas para cada momento.", buttonText:"Ver lookbook", layout:"left", height:"xl" } },
    { type:"products",   props:{ heading:"Destacados de temporada", columns:2, layoutMode:"grid", showHeading:true } },
    { type:"image-text",  props:{ heading:"Nuestra historia", body:"Contá el origen y la visión de tu marca.", imagePosition:"right" } },
    { type:"socials",     props:{ heading:"Seguinos", showInstagram:true, showTiktok:true, columns:2 } },
  ],
  boutique: [ // Boutique
    { type:"hero",        props:{ title:"Bienvenida a nuestra boutique", subtitle:"Piezas únicas seleccionadas para vos", buttonText:"Explorar colección", layout:"center", height:"lg" } },
    { type:"banner-group",props:{ cards:[{title:"Novedades",text:"Últimas llegadas",buttonText:"Ver todo",bgColor:"#6366f1",textColor:"#ffffff"},{title:"Ofertas",text:"Hasta 40% off",buttonText:"Aprovechar",bgColor:"#ec4899",textColor:"#ffffff"},{title:"Envíos",text:"A todo el país",buttonText:"Info",bgColor:"#f59e0b",textColor:"#111827"}] } },
    { type:"products",   props:{ heading:"Nueva colección", columns:3, layoutMode:"grid", showHeading:true } },
    { type:"text",        props:{ heading:"Por qué elegirnos", body:"Calidad, atención personalizada y diseño exclusivo.", align:"center", fontSize:"md" } },
    { type:"socials",     props:{ heading:"Encontranos en", showInstagram:true, showWhatsapp:true, columns:2 } },
  ],
  colorful: [ // Vívido
    { type:"hero",        props:{ title:"¡Todo lo que buscás está acá!", subtitle:"Colores, estilo y calidad en un solo lugar", buttonText:"¡Ver ahora!", layout:"center", height:"md" } },
    { type:"products",   props:{ heading:"🔥 Lo más vendido", columns:4, layoutMode:"grid", showHeading:true } },
    { type:"cta",         props:{ heading:"¡No te quedes sin los tuyos!", body:"Comprá hoy y recibí en 24hs", buttonText:"Comprar ya", bgColor:"#111827" } },
    { type:"products",   props:{ heading:"🆕 Novedades", columns:3, layoutMode:"carousel", showHeading:true } },
    { type:"socials",     props:{ heading:"Seguinos y enterate de todo", showInstagram:true, showTiktok:true, showWhatsapp:true, columns:3 } },
  ],
  luxury:   [ // Luxury
    { type:"hero",        props:{ title:"Excelencia en cada detalle", subtitle:"Una experiencia de compra sin igual", buttonText:"Explorar", layout:"center", height:"xl", bgColor:"#0f0f0f", textColor:"#f5f0e8" } },
    { type:"divider",     props:{ style:"solid", color:"#c9a84c" } },
    { type:"products",   props:{ heading:"Colección Premium", columns:3, layoutMode:"grid", showHeading:true } },
    { type:"divider",     props:{ style:"solid", color:"#c9a84c" } },
    { type:"text",        props:{ heading:"Nuestra propuesta", body:"Artículos de alta gama seleccionados con criterio exclusivo.", align:"center", fontSize:"lg" } },
    { type:"socials",     props:{ heading:"Conectate con nosotros", showInstagram:true, showWhatsapp:true, columns:2 } },
  ],
  vintage:  [ // Clásico
    { type:"banner",      props:{ text:"Bienvenidos — Calidad artesanal y atención personalizada", bgColor:"#f5f0e8", textColor:"#44403c" } },
    { type:"hero",        props:{ title:"Tradición y calidad", subtitle:"Productos con historia y carácter propio", buttonText:"Descubrir", layout:"center", height:"lg" } },
    { type:"products",   props:{ heading:"Nuestra selección", columns:3, layoutMode:"grid", showHeading:true } },
    { type:"image-text",  props:{ heading:"Quiénes somos", body:"Una empresa con décadas de experiencia y pasión por la calidad.", imagePosition:"left" } },
    { type:"socials",     props:{ heading:"Seguinos", showInstagram:true, showFacebook:true, columns:2 } },
  ],
  sport:    [ // Sport
    { type:"hero",        props:{ title:"SUPERÁ TUS LÍMITES", subtitle:"Equipamiento para quienes no se detienen", buttonText:"VER COLECCIÓN", layout:"center", height:"xl", bgColor:"#0f0f0f", textColor:"#ffffff" } },
    { type:"products",   props:{ heading:"⚡ TOP VENTAS", columns:3, layoutMode:"carousel", showHeading:true } },
    { type:"cta",         props:{ heading:"Nuevo lanzamiento", body:"Sé el primero en tenerlo", buttonText:"QUIERO UNO", bgColor:"#111827" } },
    { type:"products",   props:{ heading:"TODA LA COLECCIÓN", columns:4, layoutMode:"grid", showHeading:true } },
    { type:"socials",     props:{ heading:"Seguinos", showInstagram:true, showTiktok:true, columns:2 } },
  ],
  tech:     [ // Moderno
    { type:"hero",        props:{ title:"Tecnología que transforma", subtitle:"Los mejores productos al mejor precio", buttonText:"Ver catálogo", layout:"left", height:"md" } },
    { type:"products",   props:{ heading:"Productos destacados", columns:4, layoutMode:"grid", showHeading:true } },
    { type:"text",        props:{ heading:"¿Por qué elegirnos?", body:"Garantía, soporte técnico y los mejores precios del mercado.", align:"center", fontSize:"md" } },
    { type:"products",   props:{ heading:"Más vendidos", columns:3, layoutMode:"carousel", showHeading:true } },
    { type:"socials",     props:{ heading:"Contacto y redes", showInstagram:true, showWhatsapp:true, showFacebook:true, columns:3 } },
  ],
  kids:     [ // Colorful
    { type:"hero",        props:{ title:"🎉 ¡Bienvenidos!", subtitle:"Los mejores productos para los más pequeños", buttonText:"¡A explorar!", layout:"center", height:"md" } },
    { type:"products",   props:{ heading:"🎁 Para ellos", columns:3, layoutMode:"grid", showHeading:true } },
    { type:"banner-group",props:{ cards:[{title:"🚀 Novedades",text:"Lo último llegó",buttonText:"Ver",bgColor:"#6366f1",textColor:"#ffffff"},{title:"⭐ Ofertas",text:"Hasta 50% off",buttonText:"Aprovechar",bgColor:"#ec4899",textColor:"#ffffff"},{title:"🎈 Envíos",text:"Rápido y seguro",buttonText:"Info",bgColor:"#f59e0b",textColor:"#111827"}] } },
    { type:"socials",     props:{ heading:"Seguinos", showInstagram:true, showWhatsapp:true, showFacebook:true, columns:3 } },
  ],
  market:   [ // Market
    { type:"hero",        props:{ title:"Todo en un solo lugar", subtitle:"Miles de productos al mejor precio", buttonText:"Explorar", layout:"center", height:"compact" } },
    { type:"products",   props:{ heading:"Ofertas del día", columns:4, layoutMode:"grid", showHeading:true } },
    { type:"divider",     props:{ style:"solid" } },
    { type:"products",   props:{ heading:"Más vendidos", columns:4, layoutMode:"grid", showHeading:true } },
    { type:"cta",         props:{ heading:"¿Querés vender con nosotros?", body:"Unite a nuestra plataforma", buttonText:"Contactanos", bgColor:"#1e3a5f" } },
    { type:"socials",     props:{ heading:"Seguinos y contactanos", showInstagram:true, showWhatsapp:true, showFacebook:true, columns:3 } },
  ],
};

const DEFAULT_CONFIG: StoreConfig = {
  name:"", tagline:"", description:"",
  primaryColor:"#6366f1", secondaryColor:"#f1f5f9", accentColor:"#f59e0b",
  fontFamily:"Inter", templateId:"default",
  logo:"", banner:"",
  productLayout:"grid3", showPrices:true, showStock:true, showRatings:false,
  heroStyle:"full", navbarStyle:"solid", buttonStyle:"rounded",
  cardRadius:"md", cardShadow:"sm", cardHover:"scale",
  backgroundStyle:"plain",
  announcementBar:"", announcementBarColor:"#6366f1",
  instagramUrl:"", facebookUrl:"", tiktokUrl:"",
  whatsappNumber:"", showWhatsappButton:false,
  footerText:"", currency:"ARS",
  tipoTienda:"ROPA", tipoTiendaConfigurado:false, tieneVentaMayorista:false,
  productModalSizeChart:false, productModalSizeChartTitle:"Tabla de talles",
  productModalSizeChartData:'{"columns":["Talle","Pecho","Cintura","Cadera"],"rows":[]}',
  productModalShowReels:false, productModalReelUrls:"[]",
  productModalButtonText:"Agregar al carrito", productModalAccentColor:"", productModalShowDescription:true,
  navLinks:"[]",
};


function isStarterConfigBlocks(blocks: Block[]) {
  if (blocks.length !== 3) return false;
  const [hero, text, products] = blocks;
  return (
    hero?.type === "hero" &&
    text?.type === "text" &&
    products?.type === "products" &&
    hero.props.title === "Â¡Bienvenidos a mi tienda!" &&
    text.props.heading === "Sobre nosotros" &&
    products.props.heading === "Nuestros productos"
  );
}

/* ─── Reusable UI ─── */
function Accordion({ label, icon:Icon, id, open, toggle, children }: {
  label:string; icon:React.ComponentType<{className?:string}>; id:DesignSection; open:boolean; toggle:(id:DesignSection)=>void; children:React.ReactNode
}) {
  return (
    <div data-section={id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={()=>toggle(id)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg"><Icon className="h-3.5 w-3.5 text-indigo-600"/></div>
          <span className="font-semibold text-gray-900 text-sm">{label}</span>
        </div>
        {open?<ChevronUp className="h-4 w-4 text-gray-400"/>:<ChevronDown className="h-4 w-4 text-gray-400"/>}
      </button>
      {open&&<div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">{children}</div>}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer shrink-0">
          <input type="color" value={value||"#6366f1"} onChange={e=>onChange(e.target.value)} className="sr-only"/>
          <div className="h-9 w-9 rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-110" style={{backgroundColor:value||"#6366f1"}}/>
        </label>
        <input type="text" value={value} onChange={e=>onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"/>
      </div>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }: { label:string; sub?:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {sub&&<p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <button onClick={()=>onChange(!value)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value?"bg-indigo-600":"bg-gray-300"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value?"translate-x-4":"translate-x-0.5"}`}/>
      </button>
    </div>
  );
}

function Chips({ options, value, onChange }: { options:{id:string;label:string}[]; value:string; onChange:(v:string)=>void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o=>(
        <button key={o.id} onClick={()=>onChange(o.id)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${value===o.id?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Block editor (per-type) ─── */
function formatCategoryLabel(value: string) {
  if (value === "all") return "Todas";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parsePreviewImages(images: string | null | undefined) {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function blockSupportsMovableText(type: BlockType) {
  return ["hero", "text", "products", "banner", "cta", "image-text"].includes(type);
}

function getViewportTextPositions(props: Record<string, any>, viewport: PreviewViewport): Record<string, TextPosition> {
  const all = props.textPositions;
  if (!all || typeof all !== "object") return {};
  const current = all[viewport];
  return current && typeof current === "object" ? current : {};
}

function updateViewportTextPosition(
  props: Record<string, any>,
  viewport: PreviewViewport,
  key: string,
  position: TextPosition
) {
  const all = props.textPositions && typeof props.textPositions === "object" ? props.textPositions : {};
  const current = all[viewport] && typeof all[viewport] === "object" ? all[viewport] : {};
  return {
    ...props,
    textPositions: {
      ...all,
      [viewport]: {
        ...current,
        [key]: position,
      },
    },
  };
}

function clearViewportTextPositions(props: Record<string, any>, viewport: PreviewViewport) {
  const all = props.textPositions && typeof props.textPositions === "object" ? props.textPositions : {};
  if (!all[viewport]) return props;
  return {
    ...props,
    textPositions: {
      ...all,
      [viewport]: {},
    },
  };
}

type NavConfig = { layout: "right" | "center"; showSearch: boolean; links: NavLink[]; mode?: "links" | "hamburger"; bgColor?: string; textColor?: string; searchStyle?: "icon" | "bar"; };

function parseNavConfig(value: string): NavConfig {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return { layout: "right", showSearch: false, links: parsed };
    return {
      layout: parsed.layout || "right",
      showSearch: Boolean(parsed.showSearch),
      links: Array.isArray(parsed.links) ? parsed.links : [],
      mode: parsed.mode || undefined,
      bgColor: parsed.bgColor || undefined,
      textColor: parsed.textColor || undefined,
      searchStyle: parsed.searchStyle || undefined,
    };
  } catch { return { layout: "right", showSearch: false, links: [] }; }
}

function NavLinksEditor({ value, onChange, categories = [], blocks = [] }: { value: string; onChange: (v: string) => void; categories?: string[]; blocks?: Block[] }) {
  const [cfg, setCfg] = useState<NavConfig>(() => parseNavConfig(value));
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function save(updated: NavConfig) { setCfg(updated); onChange(JSON.stringify(updated)); }

  function addLink() {
    save({ ...cfg, links: [...cfg.links, { id: crypto.randomUUID(), label: "Nuevo botón", type: "url", value: "" }] });
  }
  function removeLink(id: string) { save({ ...cfg, links: cfg.links.filter(l => l.id !== id) }); }
  function updateLink(id: string, field: keyof NavLink, val: string) {
    save({ ...cfg, links: cfg.links.map(l => l.id === id ? { ...l, [field]: val, ...(field === "type" ? { value: "" } : {}) } : l) });
  }

  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); dragOverIdx.current = idx; }
  function onDrop() {
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    if (from === null || to === null || from === to) return;
    const links = [...cfg.links];
    const [moved] = links.splice(from, 1);
    links.splice(to, 0, moved);
    save({ ...cfg, links });
    dragIdx.current = null;
    dragOverIdx.current = null;
  }

  const isHamburger = cfg.mode === "hamburger";

  return (
    <div className="space-y-3">
      {/* Modo */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Modo del menú</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => save({ ...cfg, mode: "links" })}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${!isHamburger ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            Botones visibles
          </button>
          <button type="button" onClick={() => save({ ...cfg, mode: "hamburger" })}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${isHamburger ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            ☰ Menú icono
          </button>
        </div>
      </div>

      {/* Posición (solo en modo links) */}
      {!isHamburger && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Posición de los botones</p>
          <div className="flex gap-2">
            {([["right","Derecha"],["center","Centro"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => save({ ...cfg, layout: val })}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${cfg.layout === val ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-gray-700">Buscador en navbar</p>
            <p className="text-xs text-gray-400">Filtra productos al escribir</p>
          </div>
          <button type="button" onClick={() => save({ ...cfg, showSearch: !cfg.showSearch })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.showSearch ? "bg-indigo-500" : "bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${cfg.showSearch ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
        {cfg.showSearch && (
          <div className="flex gap-2 pl-1">
            {([["icon","🔍 Solo lupa"],["bar","▭ Barra visible"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => save({ ...cfg, searchStyle: val })}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${(cfg.searchStyle ?? "icon") === val ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Colores */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Colores del navbar</p>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <p className="text-xs text-gray-500">Fondo</p>
            <div className="flex items-center gap-2">
              <input type="color" value={cfg.bgColor || "#ffffff"} onChange={e => save({ ...cfg, bgColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-gray-200 p-0.5" />
              {cfg.bgColor && (
                <button type="button" onClick={() => save({ ...cfg, bgColor: undefined })}
                  className="text-xs text-gray-400 hover:text-red-500">Auto</button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <p className="text-xs text-gray-500">Texto / Links</p>
            <div className="flex items-center gap-2">
              <input type="color" value={cfg.textColor || "#111827"} onChange={e => save({ ...cfg, textColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-gray-200 p-0.5" />
              {cfg.textColor && (
                <button type="button" onClick={() => save({ ...cfg, textColor: undefined })}
                  className="text-xs text-gray-400 hover:text-red-500">Auto</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <p className="text-xs font-medium text-gray-600">Botones del menú</p>
      {cfg.links.map((link, idx) => (
        <div key={link.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          draggable onDragStart={() => onDragStart(idx)} onDragOver={e => onDragOver(e, idx)} onDrop={onDrop}>
          {/* Header de la card */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-gray-300 select-none cursor-grab text-sm leading-none">⠿</span>
            <input type="text" value={link.label} onChange={e => updateLink(link.id, "label", e.target.value)}
              placeholder="Nombre del botón (ej: Inicio)"
              className="flex-1 bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:text-indigo-700" />
            <button type="button" onClick={() => removeLink(link.id)} className="text-gray-300 hover:text-red-400 p-0.5 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Tipo + valor */}
          <div className="px-3 py-2.5 space-y-2">
            {/* Pills de tipo */}
            <div className="flex gap-1">
              {([["url","🔗 Enlace"],["section","⚓ Sección"],["filter","🏷️ Categoría"]] as const).map(([t, l]) => (
                <button key={t} type="button" onClick={() => updateLink(link.id, "type", t)}
                  className={`flex-1 rounded-md border py-1 text-[10px] font-semibold transition-colors ${link.type === t ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:text-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Valor según tipo */}
            {link.type === "filter" ? (
              <select value={link.value} onChange={e => updateLink(link.id, "value", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">— Elegir categoría —</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : link.type === "section" ? (
              <select value={link.value} onChange={e => updateLink(link.id, "value", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">— Elegir bloque de destino —</option>
                {blocks.filter(b => b.type !== "navbar").map(b => {
                  const label = b.props.heading || b.props.title || b.props.text || b.type;
                  const emoji = ({ hero:"🖼️", text:"📝", products:"🛍️", banner:"📢", "banner-group":"🎠", cta:"🚀", "image-text":"🖼️", socials:"🔗", spacer:"⬜", divider:"─", contacto:"✉️", nosotros:"👥", navbar:"🧭" } as Record<string,string>)[b.type] || "📦";
                  return <option key={b.id} value={b.id}>{emoji} {String(label).slice(0,40) || b.type}</option>;
                })}
              </select>
            ) : (
              <input type="text" value={link.value} onChange={e => updateLink(link.id, "value", e.target.value)}
                placeholder="https://... o /ruta"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={addLink}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-semibold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
        <Plus className="h-3.5 w-3.5" />
        Agregar botón
      </button>
    </div>
  );
}

function ContentGlobalSettings({
  config,
  set,
}: {
  config: StoreConfig;
  set: <K extends keyof StoreConfig>(k: K, v: StoreConfig[K]) => void;
}) {
  const [open, setOpen] = useState<DesignSection[]>([]);
  const toggle = (section: DesignSection) => {
    setOpen((current) =>
      current.includes(section) ? current.filter((item) => item !== section) : [...current, section]
    );
  };

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-gray-400">Ajustes de la tienda</p>

      <Accordion label="WhatsApp flotante" icon={Share2} id="redes" open={open.includes("redes")} toggle={toggle}>
        <p className="text-xs text-gray-500">
          Los links de redes del bloque se cargan dentro de cada bloque &quot;Redes / Contacto&quot;. Este ajuste global queda solo para el boton flotante.
        </p>
        <div className="border-t border-gray-100 pt-3">
          <Toggle label="Boton flotante de WhatsApp" sub="Aparece en el margen de la tienda" value={config.showWhatsappButton} onChange={v=>set("showWhatsappButton",v)}/>
          {config.showWhatsappButton&&(
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Numero de WhatsApp</label>
              <input type="text" value={config.whatsappNumber} onChange={e=>set("whatsappNumber",e.target.value)}
                placeholder="5491112345678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          )}
        </div>
      </Accordion>

      <Accordion label="Footer" icon={CreditCard} id="footer" open={open.includes("footer")} toggle={toggle}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto del footer</label>
          <textarea value={config.footerText} onChange={e=>set("footerText",e.target.value)} rows={3}
            placeholder="© 2025 Mi Tienda · Buenos Aires, Argentina"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
        </div>
      </Accordion>

      <Accordion label="SEO / Google" icon={Search} id="seo" open={open.includes("seo")} toggle={toggle}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Titulo para Google</label>
          <input type="text" value={config.seoTitle||""} onChange={e=>set("seoTitle",e.target.value)}
            placeholder="Mi Tienda - Ropa y joyas online"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripcion para Google</label>
          <textarea value={config.seoDescription||""} onChange={e=>set("seoDescription",e.target.value)} rows={3}
            placeholder="Encontrá las mejores prendas y accesorios."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
        </div>
      </Accordion>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  categories = [],
  subcategoriesByCategory = {},
  uploadingImage = false,
  onPickImage,
  onUploadFile,
  blocks = [],
}: {
  block:Block;
  onChange:(props:Record<string,any>)=>void;
  config?:StoreConfig;
  categories?:string[];
  subcategoriesByCategory?:Record<string,string[]>;
  uploadingImage?: boolean;
  onPickImage?: (field?: string) => void;
  onUploadFile?: (file:File) => Promise<string|undefined>;
  blocks?: Block[];
}) {
  const p = block.props;
  const upd = (k:string,v:any) => onChange({...p,[k]:v});
  const [contactBgMode, setContactBgMode] = useState<"color"|"image">(() => p.bgImage ? "image" : "color");
  const availableSubcategories = p.categoryFilter && p.categoryFilter !== "all"
    ? subcategoriesByCategory[p.categoryFilter] || []
    : Array.from(new Set(Object.values(subcategoriesByCategory).flat()));

  const inp = (label:string, key:string, ph?:string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input value={p[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={ph}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
    </div>
  );
  const ta = (label:string, key:string, ph?:string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea value={p[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={ph} rows={3} style={{resize:"none"}}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
    </div>
  );

  // Altura personalizada para todos los bloques
  const heightEditorSection = (
    <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-amber-900">Altura mínima del bloque</label>
        <span className="text-sm font-bold text-amber-700">{p.blockMinHeight > 0 ? `${p.blockMinHeight}px` : "auto"}</span>
      </div>
      <input type="range" min="0" max="800" step="10" value={p.blockMinHeight||0} onChange={e=>upd("blockMinHeight",parseInt(e.target.value)||0)} className="w-full accent-amber-600"/>
      <p className="text-xs text-amber-600">0 = altura automática. Arrastrá el slider para ajustar.</p>
    </div>
  );

  if (block.type==="hero") return <div className="space-y-3">
    {inp("Título","title","¡Bienvenidos!")}
    {inp("Subtítulo","subtitle","Encontrá todo lo que buscás")}
    {inp("Texto del botón","buttonText","Ver productos")}
    <ColorPicker label="Color de fondo (vacío = color principal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
    <ColorPicker label="Color de texto" value={p.textColor||"#ffffff"} onChange={v=>upd("textColor",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Alineación</label>
      <div className="flex gap-2">
        {[["left","Izq"],["center","Centro"],["right","Der"]].map(([v,l])=>(
          <button key={v} onClick={()=>upd("layout",v)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${p.layout===v?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>{l}</button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Altura</label>
      <Chips options={[{id:"sm",label:"Compacto"},{id:"md",label:"Normal"},{id:"lg",label:"Grande"},{id:"xl",label:"Pantalla completa"}]} value={p.height||"lg"} onChange={v=>upd("height",v)}/>
    </div>
    {heightEditorSection}
  </div>;

  if (block.type==="text") return <div className="space-y-3">
    {inp("Título","heading","Sobre nosotros")}
    {ta("Texto / Párrafo","body","Somos una tienda...")}
    <ColorPicker label="Color del bloque (vacío = color principal)" value={p.color||""} onChange={v=>upd("color",v)}/>
    <ColorPicker label="Color del texto (vacío = gris por defecto)" value={p.textColor||""} onChange={v=>upd("textColor",v)}/>
    <ColorPicker label="Color de fondo (vacío = fondo normal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Alineación</label>
      <div className="flex gap-2">
        {[["left","Izq"],["center","Centro"],["right","Der"]].map(([v,l])=>(
          <button key={v} onClick={()=>upd("align",v)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${p.align===v?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>{l}</button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño del título</label>
      <Chips options={[{id:"sm",label:"Pequeño"},{id:"md",label:"Mediano"},{id:"lg",label:"Grande"},{id:"xl",label:"Extra grande"}]} value={p.fontSize||"md"} onChange={v=>upd("fontSize",v)}/>
    </div>
    {heightEditorSection}
  </div>;

  if (block.type==="products") return <div className="space-y-3">
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">Formato del bloque</p>
      <p className="mt-1 text-xs text-indigo-600">
        {p.layoutMode==="carousel"
          ? "Carrusel: los productos se deslizan hacia los costados y elegis cuantas cards se ven a la vez."
          : "Grilla: los productos se ordenan en filas y elegis cuantas columnas se ven por fila."}
      </p>
    </div>
    <ColorPicker label="Color del bloque (vacío = color principal)" value={p.color||""} onChange={v=>upd("color",v)}/>
    <ColorPicker label="Color de fondo (vacío = fondo normal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
      <Chips options={[{id:"grid",label:"Grilla"},{id:"carousel",label:"Carrusel"}]} value={p.layoutMode||"grid"} onChange={v=>upd("layoutMode",v)}/>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Categoria a mostrar</label>
      <select value={p.categoryFilter||"all"} onChange={e=>upd("categoryFilter",e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        <option value="all">Todas las categorias</option>
        {categories.map((category)=><option key={category} value={category}>{formatCategoryLabel(category)}</option>)}
      </select>
    </div>
    <Toggle label="Mostrar filtro de categorias" sub="Permite cambiar de categoria en la tienda" value={p.showCategoryTabs!==false} onChange={v=>upd("showCategoryTabs",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Subcategoria a mostrar</label>
      <select value={p.subcategoryFilter||"all"} onChange={e=>upd("subcategoryFilter",e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        <option value="all">Todas las subcategorias</option>
        {availableSubcategories.map((subcat)=><option key={subcat} value={subcat}>{formatCategoryLabel(subcat)}</option>)}
      </select>
    </div>
    <Toggle label="Mostrar título de sección" value={p.showHeading!==false} onChange={v=>upd("showHeading",v)}/>
    {p.showHeading!==false && inp("Título de la sección","heading","Nuestros productos")}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {p.layoutMode==="carousel" ? "Productos visibles por deslizamiento" : "Columnas por fila"}
      </label>
      <div className="grid grid-cols-5 gap-1.5">
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>upd("columns",n)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${p.columns===n?"border-indigo-500 bg-indigo-50":"border-gray-200 hover:border-gray-300"}`}>
            <span className={`text-xs font-bold ${p.columns===n?"text-indigo-700":"text-gray-600"}`}>{n}</span>
            <div className={`flex gap-0.5`}>{Array.from({length:Math.min(n,5)}).map((_,i)=><div key={i} className={`h-3 rounded-sm ${p.columns===n?"bg-indigo-400":"bg-gray-300"}`} style={{width:`${Math.max(3,16/n*1.5)}px`}}/>)}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        {p.layoutMode==="carousel"
          ? "Cuantos más productos visibles elegís, más chicas se ven las cards dentro del carrusel."
          : "Cuantas más columnas elegís, más chicas se ven las cards dentro de la grilla."}
      </p>
    </div>
  </div>;

  if (block.type==="banner") return <div className="space-y-3">
    {inp("Texto del anuncio","text","🔥 ¡Oferta especial!")}
    <ColorPicker label="Color de fondo" value={p.bgColor||"#f59e0b"} onChange={v=>upd("bgColor",v)}/>
    <ColorPicker label="Color de texto" value={p.textColor||"#000000"} onChange={v=>upd("textColor",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño</label>
      <Chips options={[{id:"sm",label:"Delgada"},{id:"md",label:"Normal"},{id:"lg",label:"Grande"}]} value={p.size||"md"} onChange={v=>upd("size",v)}/>
    </div>
    {heightEditorSection}
  </div>;

  if (block.type==="banner-group") {
    const slides: any[] = Array.isArray(p.slides) ? p.slides : [];
    const updSlide = (idx:number, key:string, val:any) => upd("slides", slides.map((s:any,i:number)=>i===idx?{...s,[key]:val}:s));
    return <div className="space-y-3 w-full min-w-0">

      {/* Tamaño y texto */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tamaño y texto</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Proporción del banner</label>
          <div className="grid grid-cols-2 gap-1.5">
            {([["sm","Compacto"],["md","Normal"],["lg","Alto"],["xl","Pantalla"]] as const).map(([id,label])=>(
              <button key={id} onClick={()=>upd("height",id)} className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${(p.height||"md")===id?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>{label}</button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Se mantiene igual en cualquier pantalla</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Alineación del texto</label>
          <Chips options={[{id:"left",label:"Izquierda"},{id:"center",label:"Centro"},{id:"right",label:"Derecha"}]} value={p.textAlign||"center"} onChange={v=>upd("textAlign",v)}/>
        </div>
      </div>

      {/* Animación */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Animación</p>
        <Toggle label="Autoplay" value={p.autoplay!==false} onChange={v=>upd("autoplay",v)}/>
        <Toggle label="Mostrar puntos" value={p.showDots!==false} onChange={v=>upd("showDots",v)}/>
        <Toggle label="Mostrar flechas" value={p.showArrows!==false} onChange={v=>upd("showArrows",v)}/>
        {p.autoplay!==false && (
          <div className="pt-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Velocidad</label>
            <Chips options={[{id:"3",label:"3s"},{id:"4",label:"4s"},{id:"5",label:"5s"},{id:"6",label:"6s"},{id:"8",label:"8s"}]} value={String(p.speed||4)} onChange={v=>upd("speed",Number(v))}/>
          </div>
        )}
      </div>

      {/* Colores */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Colores</p>
        <ColorPicker label="Color del texto" value={p.textColor||"#ffffff"} onChange={v=>upd("textColor",v)}/>
        <ColorPicker label="Color del overlay" value={p.overlayColor||"#000000"} onChange={v=>upd("overlayColor",v)}/>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Opacidad del overlay</label>
            <span className="text-xs font-semibold text-indigo-600">{p.overlayOpacity||35}%</span>
          </div>
          <input type="range" min="0" max="80" step="5" value={p.overlayOpacity||35} onChange={e=>upd("overlayOpacity",parseInt(e.target.value))} onMouseDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} className="w-full accent-indigo-600"/>
        </div>
      </div>

      {/* Slides */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-0.5">Imágenes del carrusel</p>
        {slides.map((slide:any, idx:number)=>(
          <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Slide {idx+1}</p>
              {slides.length > 1 && (
                <button onClick={()=>upd("slides",slides.filter((_:any,i:number)=>i!==idx))} className="text-xs text-red-400 hover:text-red-600 transition-colors">Eliminar</button>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Imagen</label>
              {slide.image ? (
                <div className="relative">
                  <img src={slide.image} alt="" className="w-full h-20 object-cover rounded-xl"/>
                  <button onClick={()=>updSlide(idx,"image","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <label className="flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  <ImageIcon className="h-4 w-4"/>
                  <span className="text-xs font-medium">Subir imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const file = e.target.files?.[0]; if(!file||!onUploadFile) return;
                    const url = await onUploadFile(file);
                    if(url) updSlide(idx,"image",url);
                  }}/>
                </label>
              )}
            </div>
            {slide.image && (
              <p className="text-[11px] text-indigo-500 font-medium bg-indigo-50 rounded-xl px-3 py-2">
                Usá el botón <strong>📷 Mover foto</strong> en la preview para reposicionar la imagen
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
              <input value={slide.title||""} onChange={e=>updSlide(idx,"title",e.target.value)} placeholder="Título del slide" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subtítulo</label>
              <input value={slide.subtitle||""} onChange={e=>updSlide(idx,"subtitle",e.target.value)} placeholder="Texto debajo del título" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Texto botón</label>
                <input value={slide.buttonText||""} onChange={e=>updSlide(idx,"buttonText",e.target.value)} placeholder="Ver más" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL botón</label>
                <input value={slide.buttonUrl||""} onChange={e=>updSlide(idx,"buttonUrl",e.target.value)} placeholder="/productos" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
          </div>
        ))}
        {slides.length < 5 && (
          <button onClick={()=>upd("slides",[...slides,{image:"",title:"",subtitle:"",buttonText:"",buttonUrl:"",focalX:50,focalY:50}])}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
            <Plus className="h-3.5 w-3.5"/> Agregar slide
          </button>
        )}
      </div>
    </div>;
  }

  if (block.type==="cta") return <div className="space-y-3">
    {inp("Título","heading","¿Lista para comprar?")}
    {inp("Subtítulo","sub","Envíos a todo el país")}
    {inp("Texto del botón","buttonText","Ver catálogo")}
    <ColorPicker label="Color de fondo" value={p.bgColor||"#0f172a"} onChange={v=>upd("bgColor",v)}/>
    <ColorPicker label="Color de texto" value={p.textColor||"#ffffff"} onChange={v=>upd("textColor",v)}/>
    {heightEditorSection}
  </div>;

  if (block.type==="image-text") return <div className="space-y-3">
    {inp("Título","heading","¿Por qué elegirnos?")}
    {ta("Descripción","body","Calidad garantizada en cada compra.")}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Imagen</label>
      {p.image ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img src={p.image} alt="" className={`h-32 w-full ${p.imageFit==="contain" ? "object-contain" : "object-cover"}`} style={{ objectPosition: p.imageFocus || "center" }} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPickImage?.()}
              disabled={uploadingImage}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {uploadingImage ? "Subiendo..." : "Cambiar imagen"}
            </button>
            <button
              type="button"
              onClick={() => upd("image","")}
              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onPickImage?.()}
          disabled={uploadingImage}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-60"
        >
          {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          <span className="text-xs font-medium">{uploadingImage ? "Subiendo..." : "Subir imagen"}</span>
        </button>
      )}
    </div>
    <ColorPicker label="Color del bloque (vacío = color principal)" value={p.color||""} onChange={v=>upd("color",v)}/>
    <ColorPicker label="Color del texto (vacío = gris por defecto)" value={p.textColor||""} onChange={v=>upd("textColor",v)}/>
    <ColorPicker label="Color de fondo (vacío = fondo normal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
    <ColorPicker label="Fondo del cuadro de imagen" value={p.imageBgColor||"#f3f4f6"} onChange={v=>upd("imageBgColor",v)}/>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Cómo encaja la imagen</label>
      <Chips options={[{id:"cover",label:"Recortar"},{id:"contain",label:"Completa"}]} value={p.imageFit||"cover"} onChange={v=>upd("imageFit",v)}/>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Forma de la imagen</label>
      <Chips options={[{id:"redondeada",label:"Redondeada"},{id:"cuadrada",label:"Cuadrada"},{id:"circulo",label:"Círculo"},{id:"ovalada",label:"Ovalada"}]} value={p.imageRadius||"redondeada"} onChange={v=>upd("imageRadius",v)}/>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Posición de la imagen</label>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {([["left","← Izquierda"],["right","Derecha →"],["top","↑ Arriba"],["bottom","↓ Abajo"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>upd("imagePosition",v)} className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${p.imagePosition===v||(!p.imagePosition&&v==="left")?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>{l}</button>
        ))}
      </div>
      {(p.imagePosition==="left"||p.imagePosition==="right"||!p.imagePosition) && (
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600">Ancho del cuadro de imagen</label>
              <span className="text-xs font-semibold text-indigo-600">{p.imageWidth||50}%</span>
            </div>
            <input type="range" min="30" max="70" step="5" value={p.imageWidth||50}
              onChange={e=>upd("imageWidth",parseInt(e.target.value))}
              onMouseDown={e=>e.stopPropagation()}
              onPointerDown={e=>e.stopPropagation()}
              className="w-full accent-indigo-600 cursor-ew-resize"/>
          </div>
        </div>
      )}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-600">Alto del cuadro de imagen</label>
          <span className="text-xs font-semibold text-indigo-600">{p.imageHeight||320}px</span>
        </div>
        <input type="range" min="180" max="520" step="20" value={p.imageHeight||320}
          onChange={e=>upd("imageHeight",parseInt(e.target.value))}
          onMouseDown={e=>e.stopPropagation()}
          onPointerDown={e=>e.stopPropagation()}
          className="w-full accent-indigo-600 cursor-ns-resize"/>
      </div>
    </div>
    {heightEditorSection}
  </div>;

  if (block.type==="socials") return <div className="space-y-3">
    <Toggle label="Mostrar titulo" value={p.showHeading!==false} onChange={v=>upd("showHeading",v)}/>
    {p.showHeading!==false && inp("Titulo","heading","Seguinos y contactanos")}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Estilo visual</label>
      <Chips options={[{id:"icons",label:"Iconos"},{id:"buttons",label:"Botones"},{id:"card",label:"Tarjeta"}]} value={p.layout||"icons"} onChange={v=>upd("layout",v)}/>
    </div>
    <ColorPicker label="Color del bloque (vacío = color principal)" value={p.color||""} onChange={v=>upd("color",v)}/>
    <ColorPicker label="Color de fondo (vacío = fondo normal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Canales</p>
      <p className="text-[10px] text-gray-400 -mt-1">Arrastrá los íconos en la preview para reordenarlos</p>
      {(()=>{
        const order: string[] = Array.isArray(p.channelOrder) ? p.channelOrder : ALL_CHANNELS.map(c=>c.key);
        return [...ALL_CHANNELS].sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
      })().map(({key:show,url,label,ph})=>(
        <div key={show} className="space-y-1.5">
          <Toggle label={label} value={p[show]!==false} onChange={v=>upd(show,v)}/>
          {p[show]!==false&&(
            <input type="text" value={p[url]||""} onChange={e=>upd(url,e.target.value)} placeholder={ph}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          )}
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-400">Los logos mantienen sus colores reales. Estos colores cambian el fondo, el titulo, bordes y botones del bloque.</p>
    {heightEditorSection}
  </div>;

  if (block.type==="spacer") return <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Altura</label>
      <Chips options={[{id:"xs",label:"8px"},{id:"sm",label:"24px"},{id:"md",label:"48px"},{id:"lg",label:"80px"},{id:"xl",label:"120px"}]} value={p.height||"md"} onChange={v=>upd("height",v)}/>
    </div>
    <div className="border-t border-gray-100 pt-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contenido opcional</p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Emoji / ícono</label>
        <input type="text" value={p.emoji||""} onChange={e=>upd("emoji",e.target.value)} placeholder="ej: ✨ 🌟 →" maxLength={4}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Texto</label>
        <input type="text" value={p.text||""} onChange={e=>upd("text",e.target.value)} placeholder="ej: Nueva colección 2025"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Línea decorativa</label>
        <Chips options={[{id:"none",label:"Ninguna"},{id:"solid",label:"Sólida"},{id:"dashed",label:"Guiones"},{id:"dotted",label:"Puntos"}]} value={p.lineStyle||"none"} onChange={v=>upd("lineStyle",v)}/>
      </div>
      {p.lineStyle && p.lineStyle !== "none" && (
        <ColorPicker label="Color de línea" value={p.lineColor||"#e5e7eb"} onChange={v=>upd("lineColor",v)}/>
      )}
      <ColorPicker label="Color de fondo (vacío = transparente)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
      {(p.text||p.emoji) && (
        <ColorPicker label="Color del texto" value={p.textColor||"#374151"} onChange={v=>upd("textColor",v)}/>
      )}
    </div>
  </div>;

  if (block.type==="contacto") {
    return <div className="space-y-3">
      {inp("Título del formulario","heading","Contacto")}
      {inp("Subtítulo","subtitle","¿Tenés alguna pregunta? Escribinos.")}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo de fondo</label>
        <div className="flex gap-2 mb-2">
          {([["color","🎨 Color"],["image","🖼️ Imagen"]] as const).map(([v,l])=>(
            <button key={v} type="button"
              onClick={()=>{
                setContactBgMode(v);
                if(v==="color") upd("bgImage","");
                else upd("bgColor","");
              }}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${contactBgMode===v?"border-indigo-400 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              {l}
            </button>
          ))}
        </div>
        {contactBgMode==="color" ? (
          <ColorPicker label="Color de fondo" value={p.bgColor||"#111827"} onChange={v=>upd("bgColor",v)}/>
        ) : (
          <div>
            {p.bgImage && <img src={String(p.bgImage)} alt="" className="mb-2 h-20 w-full rounded-lg object-cover"/>}
            <div className="flex gap-2">
              <input value={p.bgImage||""} onChange={e=>upd("bgImage",e.target.value)} placeholder="https://..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              {onPickImage && <button type="button" onClick={() => onPickImage?.("bgImage")}
                disabled={uploadingImage}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50">
                {uploadingImage ? "⏳" : "📁"}
              </button>}
            </div>
          </div>
        )}
      </div>
      <ColorPicker label="Color de texto" value={p.textColor||"#ffffff"} onChange={v=>upd("textColor",v)}/>
      <ColorPicker label="Color del botón (vacío = color principal)" value={p.buttonColor||""} onChange={v=>upd("buttonColor",v)}/>
      {inp("Texto del botón","buttonText","Enviar mensaje")}
      <div className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-600 mb-2">Campos del formulario</p>
        {[["showName","Nombre"],["showEmail","Email"],["showPhone","Teléfono"],["showMessage","Mensaje"]].map(([key,label])=>(
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={p[key]!==false} onChange={e=>upd(key,e.target.checked)} className="rounded"/>
            <span className="text-xs text-gray-700">{label}</span>
          </label>
        ))}
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
        <p className="text-xs text-blue-700">📧 Los mensajes se envían al email de tu cuenta.</p>
      </div>
    </div>;
  }

  if (block.type==="nosotros") {
    const members: {id:string;name:string;role:string;image:string;bio:string}[] = Array.isArray(p.members) ? p.members : [];
    const features: {id:string;number:string;title:string;desc:string}[] = Array.isArray(p.features) ? p.features : [];
    return <div className="space-y-4">
      {/* Encabezado */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Encabezado</p>
        {inp("Etiqueta (ej: NOSOTROS)","tag","NOSOTROS")}
        {inp("Título principal","heading","¿Quiénes somos?")}
        {ta("Subtítulo","subtitle","Conocé al equipo detrás de la tienda.")}
        <div className="flex gap-2">
          <div className="flex-1"><ColorPicker label="Fondo" value={p.bgColor||"#ffffff"} onChange={v=>upd("bgColor",v)}/></div>
          <div className="flex-1"><ColorPicker label="Texto" value={p.textColor||"#111827"} onChange={v=>upd("textColor",v)}/></div>
        </div>
      </div>

      {/* Equipo */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Equipo</p>
          <button type="button" onClick={()=>upd("showMembers",!p.showMembers)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.showMembers?"bg-indigo-500":"bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.showMembers?"translate-x-4":"translate-x-0.5"}`}/>
          </button>
        </div>
        {p.showMembers && <>
          {members.map((m,mi)=>(
            <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Integrante {mi+1}</span>
                <button type="button" onClick={()=>upd("members",members.filter(x=>x.id!==m.id))}
                  className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
              <input value={m.name} onChange={e=>upd("members",members.map(x=>x.id===m.id?{...x,name:e.target.value}:x))}
                placeholder="Nombre" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <input value={m.role} onChange={e=>upd("members",members.map(x=>x.id===m.id?{...x,role:e.target.value}:x))}
                placeholder="Rol / cargo (opcional)" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <textarea value={m.bio} onChange={e=>upd("members",members.map(x=>x.id===m.id?{...x,bio:e.target.value}:x))}
                placeholder="Descripción, bullets... (una línea por punto)" rows={3}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
              <div className="flex gap-2">
                <input value={m.image} onChange={e=>upd("members",members.map(x=>x.id===m.id?{...x,image:e.target.value}:x))}
                  placeholder="URL de foto" className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                {onPickImage && <button type="button"
                  onClick={()=>onPickImage?.(`member_image_${m.id}`)}
                  disabled={uploadingImage} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">{uploadingImage?"⏳":"📁"}</button>}
              </div>
              {m.image && <img src={m.image} alt="" className="h-20 w-full rounded-lg object-cover"/>}
            </div>
          ))}
          <button type="button" onClick={()=>upd("members",[...members,{id:crypto.randomUUID(),name:"",role:"",image:"",bio:""}])}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            <Plus className="h-3.5 w-3.5"/> Agregar integrante
          </button>
        </>}
      </div>

      {/* Misión / Visión */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Misión / Visión</p>
          <button type="button" onClick={()=>upd("showTextSection",!p.showTextSection)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.showTextSection?"bg-indigo-500":"bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.showTextSection?"translate-x-4":"translate-x-0.5"}`}/>
          </button>
        </div>
        {p.showTextSection && <>
          {inp("Título de la sección","textSectionHeading","Misión y Visión")}
          <textarea value={p.textSectionBody||""} onChange={e=>upd("textSectionBody",e.target.value)}
            placeholder="Misión: ...\n\nVisión: ..." rows={5}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
        </>}
      </div>

      {/* Características / Pasos */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Grilla de pasos</p>
          <button type="button" onClick={()=>upd("showFeatures",!p.showFeatures)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.showFeatures?"bg-indigo-500":"bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.showFeatures?"translate-x-4":"translate-x-0.5"}`}/>
          </button>
        </div>
        {p.showFeatures && <>
          {inp("Título","featuresHeading","Lo que hacemos")}
          {inp("Subtítulo","featuresSubtitle","")}
          <ColorPicker label="Color de fondo de la grilla" value={p.featuresBgColor||"#1e3a5f"} onChange={v=>upd("featuresBgColor",v)}/>
          {features.map((f,fi)=>(
            <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Paso {fi+1}</span>
                <button type="button" onClick={()=>upd("features",features.filter(x=>x.id!==f.id))}
                  className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
              <input value={f.number} onChange={e=>upd("features",features.map(x=>x.id===f.id?{...x,number:e.target.value}:x))}
                placeholder="Número (ej: 01)" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <input value={f.title} onChange={e=>upd("features",features.map(x=>x.id===f.id?{...x,title:e.target.value}:x))}
                placeholder="Título del paso" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <textarea value={f.desc} onChange={e=>upd("features",features.map(x=>x.id===f.id?{...x,desc:e.target.value}:x))}
                placeholder="Descripción" rows={2} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
            </div>
          ))}
          <button type="button" onClick={()=>upd("features",[...features,{id:crypto.randomUUID(),number:String(features.length+1).padStart(2,"0"),title:"",desc:""}])}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            <Plus className="h-3.5 w-3.5"/> Agregar paso
          </button>
        </>}
      </div>
    </div>;
  }

  if (block.type==="divider") return <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Estilo</label>
      <Chips options={[{id:"solid",label:"Sólida"},{id:"dashed",label:"Guiones"},{id:"dotted",label:"Puntos"}]} value={p.style||"solid"} onChange={v=>upd("style",v)}/>
    </div>
    <ColorPicker label="Color" value={p.color||"#e5e7eb"} onChange={v=>upd("color",v)}/>
  </div>;

  if (block.type==="navbar") return <div className="space-y-3">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
      Este bloque reemplaza el encabezado por defecto de la tienda. Solo puede haber uno.
    </div>
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">Logo / Nombre de la tienda</p>
      <input value={p.logoText || ""} onChange={e => upd("logoText", e.target.value)}
        placeholder="Nombre de tu tienda (por defecto usa el nombre configurado)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
      <input value={p.logoUrl || ""} onChange={e => upd("logoUrl", e.target.value)}
        placeholder="URL de imagen de logo (opcional)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
    </div>
    <NavLinksEditor
      value={p.navConfig || '{"layout":"right","showSearch":false,"links":[]}'}
      onChange={v => upd("navConfig", v)}
      categories={categories}
      blocks={blocks}
    />
  </div>;

  return null;
}

type MovableTextItem = {
  id: string;
  content: ReactNode;
  defaultPos: TextPosition;
  className?: string;
  style?: CSSProperties;
};

function MovableTextStage({
  blockProps,
  viewport,
  items,
  onChange,
  style,
  className = "",
}: {
  blockProps: Record<string, any>;
  viewport: PreviewViewport;
  items: MovableTextItem[];
  onChange: (props: Record<string, any>) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const [draftPositions, setDraftPositions] = useState<Record<string, TextPosition>>(() => {
    const stored = getViewportTextPositions(blockProps, viewport);
    return items.reduce<Record<string, TextPosition>>((acc, item) => {
      acc[item.id] = stored[item.id] ?? item.defaultPos;
      return acc;
    }, {});
  });
  const latestRef = useRef<Record<string, TextPosition>>(draftPositions);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  type Guide = { axis: "x" | "y"; pct: number };
  const [activeGuides, setActiveGuides] = useState<Guide[]>([]);

  function normalizePositions(source: Record<string, TextPosition>) {
    if (!stageRef.current) return source;
    const stageRect = stageRef.current.getBoundingClientRect();
    let changed = false;
    const next = { ...source };

    items.forEach((item) => {
      const itemNode = itemRefs.current[item.id];
      if (!itemNode) return;
      const itemRect = itemNode.getBoundingClientRect();
      const halfW = itemRect.width / 2;
      const halfH = itemRect.height / 2;
      const current = source[item.id] ?? item.defaultPos;
      // pos is center-percentage; clamp so the element stays within stage bounds
      const pixelX = clamp((current.x / 100) * Math.max(stageRect.width, 1), halfW, Math.max(halfW, stageRect.width - halfW));
      const pixelY = clamp((current.y / 100) * Math.max(stageRect.height, 1), halfH, Math.max(halfH, stageRect.height - halfH));
      const normalized = {
        x: Number(((pixelX / Math.max(stageRect.width, 1)) * 100).toFixed(2)),
        y: Number(((pixelY / Math.max(stageRect.height, 1)) * 100).toFixed(2)),
      };

      if (normalized.x !== current.x || normalized.y !== current.y) {
        next[item.id] = normalized;
        changed = true;
      }
    });

    return changed ? next : source;
  }

  function persistPositions(source: Record<string, TextPosition>) {
    let nextProps = blockProps;
    items.forEach((item) => {
      const position = source[item.id];
      if (position) {
        nextProps = updateViewportTextPosition(nextProps, viewport, item.id, position);
      }
    });
    onChange(nextProps);
  }

  useEffect(() => {
    latestRef.current = draftPositions;
  }, [draftPositions]);

  useEffect(() => {
    setDraftPositions((current) => {
      const normalized = normalizePositions(current);
      latestRef.current = normalized;
      if (normalized !== current && !dragRef.current) {
        persistPositions(normalized);
      }
      return normalized;
    });
  }, [items, viewport, style]);

  useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setDraftPositions((current) => {
        const normalized = normalizePositions(current);
        latestRef.current = normalized;
        if (normalized !== current && !dragRef.current) {
          persistPositions(normalized);
        }
        return normalized;
      });
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [items, viewport]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!dragRef.current || !stageRef.current) return;
      const stageRect = stageRef.current.getBoundingClientRect();
      const itemNode = itemRefs.current[dragRef.current.id];
      if (!itemNode) return;
      const itemRect = itemNode.getBoundingClientRect();
      const halfW = itemRect.width / 2;
      const halfH = itemRect.height / 2;
      const SNAP = 8;

      let centerX = clamp(
        event.clientX - stageRect.left - dragRef.current.offsetX + halfW,
        halfW,
        Math.max(halfW, stageRect.width - halfW),
      );
      let centerY = clamp(
        event.clientY - stageRect.top - dragRef.current.offsetY + halfH,
        halfH,
        Math.max(halfH, stageRect.height - halfH),
      );

      // Build guide candidates: stage center + other elements' centers
      const guides: { axis: "x" | "y"; px: number }[] = [
        { axis: "x", px: stageRect.width / 2 },
        { axis: "y", px: stageRect.height / 2 },
      ];
      itemsRef.current.forEach((other) => {
        if (other.id === dragRef.current!.id) return;
        const node = itemRefs.current[other.id];
        if (!node) return;
        const r = node.getBoundingClientRect();
        guides.push({ axis: "x", px: r.left - stageRect.left + r.width / 2 });
        guides.push({ axis: "y", px: r.top - stageRect.top + r.height / 2 });
      });

      const activeX: { axis: "x" | "y"; pct: number }[] = [];
      const activeY: { axis: "x" | "y"; pct: number }[] = [];
      guides.forEach(({ axis, px }) => {
        if (axis === "x" && Math.abs(centerX - px) < SNAP) {
          centerX = px;
          activeX.push({ axis: "x", pct: (px / Math.max(stageRect.width, 1)) * 100 });
        }
        if (axis === "y" && Math.abs(centerY - px) < SNAP) {
          centerY = px;
          activeY.push({ axis: "y", pct: (px / Math.max(stageRect.height, 1)) * 100 });
        }
      });
      setActiveGuides([...activeX, ...activeY]);

      setDraftPositions((current) => ({
        ...current,
        [dragRef.current!.id]: {
          x: Number(((centerX / Math.max(stageRect.width, 1)) * 100).toFixed(2)),
          y: Number(((centerY / Math.max(stageRect.height, 1)) * 100).toFixed(2)),
        },
      }));
    }

    function handleMouseUp() {
      if (!dragRef.current) return;
      const currentDrag = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setActiveGuides([]);
      onChange(updateViewportTextPosition(blockProps, viewport, currentDrag.id, latestRef.current[currentDrag.id]));
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [blockProps, onChange, viewport]);

  function startDrag(id: string, event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!stageRef.current || !itemRefs.current[id]) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const itemRect = itemRefs.current[id]!.getBoundingClientRect();
    dragRef.current = {
      id,
      offsetX: event.clientX - itemRect.left,
      offsetY: event.clientY - itemRect.top,
    };
    setDraggingId(id);
    setDraftPositions((current) => {
      const currentItem = current[id];
      if (currentItem) return current;
      return {
        ...current,
        [id]: {
          x: Number((((itemRect.left - stageRect.left + itemRect.width / 2) / Math.max(stageRect.width, 1)) * 100).toFixed(2)),
          y: Number((((itemRect.top - stageRect.top + itemRect.height / 2) / Math.max(stageRect.height, 1)) * 100).toFixed(2)),
        },
      };
    });
  }

  return (
    <div
      ref={stageRef}
      className={`relative ${className}`}
      style={{overflow: "visible", ...style}}
    >
      {/* Alignment guides — visible only while dragging */}
      {activeGuides.map((guide, i) =>
        guide.axis === "x" ? (
          <div
            key={`gx-${i}`}
            style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${guide.pct}%`,
              width: "1px",
              background: "#818cf8",
              pointerEvents: "none",
              zIndex: 20,
              boxShadow: "0 0 4px rgba(129,140,248,0.6)",
            }}
          />
        ) : (
          <div
            key={`gy-${i}`}
            style={{
              position: "absolute", left: 0, right: 0,
              top: `${guide.pct}%`,
              height: "1px",
              background: "#818cf8",
              pointerEvents: "none",
              zIndex: 20,
              boxShadow: "0 0 4px rgba(129,140,248,0.6)",
            }}
          />
        )
      )}
      {items.map((item) => {
        const pos = draftPositions[item.id] ?? item.defaultPos;
        return (
          <div
            key={item.id}
            ref={(node) => { itemRefs.current[item.id] = node; }}
            onMouseDown={(event) => startDrag(item.id, event)}
            className={`${item.className ?? ""} ${draggingId === item.id ? "cursor-grabbing" : "cursor-grab"} select-none`}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              ...item.style,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Block renderer for preview ─── */

function BlockPreview({ block, config, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, onChangeProps, isFirst, isLast, previewProducts = [], viewport, onProductClick }: {
  block:Block; config:StoreConfig; selected:boolean;
  onSelect:()=>void; onMoveUp:()=>void; onMoveDown:()=>void; onDuplicate:()=>void; onDelete:()=>void; onChangeProps:(props:Record<string,any>)=>void;
  isFirst:boolean; isLast:boolean;
  previewProducts?: PreviewProduct[];
  viewport: PreviewViewport;
  onProductClick?: (product: PreviewProduct) => void;
}) {
  const p = block.props;
  const c = config;
  const blockWrapRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{startY: number; startHeight: number} | null>(null);
  const draggingHeightRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [draggingHeight, setDraggingHeight] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [focalMode, setFocalMode] = useState(false);
  const [socialDragFrom, setSocialDragFrom] = useState<number|null>(null);
  const [socialDragOver, setSocialDragOver] = useState<number|null>(null);
  const socialIconRefs = useRef<(HTMLDivElement|null)[]>([]);

  useEffect(() => {
    if (block.type !== "banner-group") return;
    if (selected) return; // pausar cuando está siendo editado
    const slides = Array.isArray(block.props.slides) ? block.props.slides : [];
    if (block.props.autoplay === false || slides.length <= 1) return;
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % slides.length), (Number(block.props.speed) || 4) * 1000);
    return () => clearInterval(t);
  }, [block.type, block.props.autoplay, block.props.speed, (block.props.slides as any[])?.length, selected]);

  useEffect(() => {
    if (!isResizing || !resizeRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaY = e.clientY - resizeRef.current.startY;
      const newHeight = Math.max(60, resizeRef.current.startHeight + deltaY);
      draggingHeightRef.current = newHeight;
      setDraggingHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (!resizeRef.current) return;
      const finalHeight = draggingHeightRef.current ?? resizeRef.current.startHeight;
      onChangeProps({ ...p, blockMinHeight: finalHeight });
      resizeRef.current = null;
      draggingHeightRef.current = null;
      setIsResizing(false);
      setDraggingHeight(null);
      document.body.style.cursor = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, p, onChangeProps]);

  const SPACER_H: Record<string,string> = { xs:"8px",sm:"24px",md:"48px",lg:"80px",xl:"120px" };
  const FONT_SIZE: Record<string,string> = { sm:"18px",md:"24px",lg:"32px",xl:"36px" };
  const HERO_H: Record<string,string> = { sm:"180px",md:"260px",lg:"360px",xl:"480px" };
  const channelOrder: string[] = Array.isArray(p.channelOrder) ? p.channelOrder : ALL_CHANNELS.map(c=>c.key);
  const socialItems = [...ALL_CHANNELS]
    .sort((a,b) => channelOrder.indexOf(a.key) - channelOrder.indexOf(b.key))
    .filter(item => p[item.key] !== false)
    .map(item => ({ ...item, bg: SOCIAL_SVGS[item.network]?.bg ?? "#6b7280", path: SOCIAL_SVGS[item.network]?.path ?? "" }));

  const wrapStyle: CSSProperties = {
    position: "relative",
    outline: selected ? "2.5px solid #818cf8" : hovered ? "1.5px dashed #a5b4fc" : "1px solid transparent",
    outlineOffset: "-2px",
    cursor: "pointer",
    transition: "outline 0.12s ease",
    minHeight: draggingHeight !== null
      ? `${draggingHeight}px`
      : (p.blockMinHeight && p.blockMinHeight > 0 ? `${p.blockMinHeight}px` : "auto"),
  };

  const floatingControls = selected ? (
    <>
      <div style={{position:"absolute",top:"12px",left:"12px",zIndex:4,padding:"4px 8px",borderRadius:"999px",background:"rgba(99,102,241,0.12)",color:"#4f46e5",fontSize:"10px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>
        {BLOCK_LIBRARY.find((item) => item.type === block.type)?.label || block.type}
      </div>
      <div style={{position:"absolute",top:"12px",right:"12px",zIndex:4,display:"flex",gap:"6px"}}>
        <button type="button" onClick={(event)=>{event.stopPropagation();onMoveUp();}} disabled={isFirst} style={{width:"28px",height:"28px",borderRadius:"999px",border:"1px solid #e5e7eb",background:"rgba(255,255,255,0.96)",color:isFirst?"#d1d5db":"#6b7280"}}><ChevronUp style={{width:"14px",height:"14px",margin:"0 auto"}}/></button>
        <button type="button" onClick={(event)=>{event.stopPropagation();onMoveDown();}} disabled={isLast} style={{width:"28px",height:"28px",borderRadius:"999px",border:"1px solid #e5e7eb",background:"rgba(255,255,255,0.96)",color:isLast?"#d1d5db":"#6b7280"}}><ChevronDown style={{width:"14px",height:"14px",margin:"0 auto"}}/></button>
        <button type="button" onClick={(event)=>{event.stopPropagation();onDuplicate();}} style={{width:"28px",height:"28px",borderRadius:"999px",border:"1px solid #e5e7eb",background:"rgba(255,255,255,0.96)",color:"#6b7280"}}><Copy style={{width:"14px",height:"14px",margin:"0 auto"}}/></button>
        <button type="button" onClick={(event)=>{event.stopPropagation();onDelete();}} style={{width:"28px",height:"28px",borderRadius:"999px",border:"1px solid #fecaca",background:"rgba(255,255,255,0.96)",color:"#ef4444"}}><Trash2 style={{width:"14px",height:"14px",margin:"0 auto"}}/></button>
      </div>
      {blockSupportsMovableText(block.type) && (
        <div style={{position:"absolute",right:"12px",bottom:"12px",zIndex:4,padding:"6px 10px",borderRadius:"999px",background:"rgba(255,255,255,0.92)",color:"#4f46e5",fontSize:"11px",fontWeight:700,boxShadow:"0 8px 24px rgba(15,23,42,0.08)"}}>
          Arrastrá los textos
        </div>
      )}
      {/* Resize handle en la parte inferior */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!blockWrapRef.current) return;
          const rect = blockWrapRef.current.getBoundingClientRect();
          resizeRef.current = {
            startY: e.clientY,
            startHeight: rect.height,
          };
          setIsResizing(true);
          document.body.style.cursor = "ns-resize";
        }}
        style={{
          position:"absolute",
          bottom:"0",
          left:"0",
          right:"0",
          height:"8px",
          cursor:isResizing?"ns-resize":"ns-resize",
          background:isResizing?"linear-gradient(to bottom, rgba(99,102,241,0.5), rgba(99,102,241,0.8))":"linear-gradient(to bottom, rgba(99,102,241,0.1), rgba(99,102,241,0.2))",
          zIndex:5,
          transition:isResizing?"none":"opacity 0.2s, background 0.2s",
          opacity:isResizing?1:0.5,
          borderTop:"1px dashed rgba(99,102,241,0.3)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
        title="Arrastra para cambiar la altura del bloque"
      >
        {selected && (
          <div style={{fontSize:"8px",color:"#4f46e5",fontWeight:800,letterSpacing:"0.1em"}}>⋮⋮⋮</div>
        )}
      </div>
    </>
  ) : null;

  const hoverBadge = !selected && hovered ? (
    <div style={{position:"absolute",top:"8px",left:"8px",zIndex:3,padding:"3px 9px",borderRadius:"999px",background:"rgba(79,70,229,0.82)",color:"white",fontSize:"10px",fontWeight:700,pointerEvents:"none",backdropFilter:"blur(4px)",letterSpacing:"0.03em",display:"flex",alignItems:"center",gap:"4px"}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:"10px",height:"10px"}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 2 2L12 13H9v-3z"/></svg>
      Editar
    </div>
  ) : null;

  function startSocialDrag(e: React.MouseEvent, idx: number, visKeys: string[], allKeys: string[], currentP: Record<string,any>) {
    e.stopPropagation();
    e.preventDefault();
    let currentOver = idx;
    setSocialDragFrom(idx);
    setSocialDragOver(idx);
    const onMove = (ev: MouseEvent) => {
      const hovIdx = socialIconRefs.current.findIndex(r => {
        if (!r) return false;
        const rect = r.getBoundingClientRect();
        return ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      });
      if (hovIdx >= 0) { currentOver = hovIdx; setSocialDragOver(hovIdx); }
    };
    const onUp = () => {
      if (idx !== currentOver) {
        const newOrder = [...allKeys];
        const fromKey = visKeys[idx]; const toKey = visKeys[currentOver];
        const fi = newOrder.indexOf(fromKey); const ti = newOrder.indexOf(toKey);
        if (fi >= 0 && ti >= 0) { newOrder.splice(fi, 1); newOrder.splice(ti, 0, fromKey); }
        onChangeProps({...currentP, channelOrder: newOrder});
      }
      setSocialDragFrom(null); setSocialDragOver(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function renderContent() {
    // Aplicar altura personalizada a todos los bloques (dragging tiene prioridad sobre la guardada)
    const customMinHeight = draggingHeight !== null
      ? `${draggingHeight}px`
      : (p.blockMinHeight && p.blockMinHeight > 0 ? `${p.blockMinHeight}px` : undefined);

    if (block.type==="hero") {
      const hh = HERO_H[p.height||"lg"] || "180px";
      const layout = p.layout || "center";
      const baseX = layout === "left" ? 8 : layout === "right" ? 54 : 28;
      return (
        <div style={{ background:p.bgColor||c.primaryColor, color:p.textColor||"#fff", fontFamily:c.fontFamily, minHeight:customMinHeight || hh, padding:"24px 32px" }}>
          <MovableTextStage
            key={`hero-${viewport}-${Boolean(p.title)}-${Boolean(p.subtitle)}-${Boolean(p.buttonText)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
            blockProps={p}
            viewport={viewport}
            onChange={onChangeProps}
            style={{ minHeight: customMinHeight || hh }}
            items={[
              ...(p.title ? [{
                id: "title",
                defaultPos: { x: baseX, y: 18 },
                style: { width: "min(100%, 520px)", textAlign: layout as "left" | "center" | "right" },
                content: <h2 style={{fontSize:FONT_SIZE[p.fontSize||"xl"]||"36px",fontWeight:900,lineHeight:1.1,marginBottom:"12px",textShadow:"0 1px 2px rgba(0,0,0,0.12)"}}>{p.title}</h2>,
              }] : []),
              ...(p.subtitle ? [{
                id: "subtitle",
                defaultPos: { x: baseX, y: 40 },
                style: { width: "min(100%, 520px)", textAlign: layout as "left" | "center" | "right" },
                content: <p style={{fontSize:"16px",opacity:0.8,lineHeight:1.6,maxWidth:"520px"}}>{p.subtitle}</p>,
              }] : []),
              ...(p.buttonText ? [{
                id: "buttonText",
                defaultPos: { x: baseX + (layout === "center" ? 10 : 0), y: 65 },
                content: <button style={{background:"#ffffff",border:"none",color:p.bgColor||c.primaryColor,padding:"12px 32px",borderRadius:"999px",fontSize:"14px",fontWeight:900,cursor:"inherit"}}>{p.buttonText}</button>,
              }] : []),
            ]}
          />
        </div>
      );
    }

    if (block.type==="text") {
      const blockColor = p.color || c.primaryColor;
      const textColor = p.textColor || "#6b7280";
      const blockBg = p.bgColor || "transparent";
      const align = p.align || "center";
      const baseX = align === "left" ? 8 : align === "right" ? 42 : 20;
      return (
        <div style={{padding:"32px 24px",fontFamily:c.fontFamily,background:blockBg,minHeight:customMinHeight}}>
          <MovableTextStage
            key={`text-${viewport}-${Boolean(p.heading)}-${Boolean(p.body)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
            blockProps={p}
            viewport={viewport}
            onChange={onChangeProps}
            style={{ minHeight: customMinHeight || "170px" }}
            items={[
              ...(p.heading ? [{
                id: "heading",
                defaultPos: { x: baseX, y: 18 },
                style: { width: "min(100%, 560px)", textAlign: align as "left" | "center" | "right" },
                content: <h3 style={{fontSize:FONT_SIZE[p.fontSize||"md"]||"20px",fontWeight:800,color:blockColor}}>{p.heading}</h3>,
              }] : []),
              ...(p.body ? [{
                id: "body",
                defaultPos: { x: baseX, y: 46 },
                style: { width: "min(100%, 640px)", textAlign: align as "left" | "center" | "right" },
                content: <p style={{fontSize:"13px",color:textColor,lineHeight:1.7}}>{p.body}</p>,
              }] : []),
            ]}
          />
        </div>
      );
    }

    if (block.type==="products") {
      const cols = Math.max(1, Number(p.columns) || 3);
      const layoutMode = p.layoutMode || "grid";
      const blockColor = p.color || c.primaryColor;
      const blockBg = p.bgColor || "transparent";
      const categoryFilter = String(p.categoryFilter || "all");
      const subcategoryFilter = String(p.subcategoryFilter || "all");
      const categories = Array.from(new Set(previewProducts.map((product) => product.category).filter(Boolean))) as string[];
      const subcategories = Array.from(new Set(previewProducts.filter((product) => categoryFilter === "all" || product.category === categoryFilter).map((product) => product.subcategory).filter(Boolean))) as string[];
      const maxVisible = layoutMode === "carousel" ? Math.max(cols * 3, 6) : Math.max(cols * 2, 4);
      const filteredProducts = previewProducts.filter((product) => {
        if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
        if (subcategoryFilter !== "all" && product.subcategory !== subcategoryFilter) return false;
        return true;
      }).slice(0, maxVisible);
      const placeholderNames = ["Producto ejemplo","Artículo demo","Item de muestra","Producto prueba","Ejemplo tienda","Artículo ejemplo","Muestra gratis","Demo producto"];
      const placeholders: PreviewProduct[] = Array.from({ length: Math.max(0, maxVisible - filteredProducts.length) }, (_, i) => ({
        id: `__placeholder_${i}`,
        name: placeholderNames[i % placeholderNames.length],
        price: [1999, 3500, 8990, 2499, 5900][i % 5],
        images: null,
        category: null,
        subcategory: null,
      }));
      const visibleProducts = [...filteredProducts, ...placeholders];

      return (
        <div style={{padding:"24px 16px",fontFamily:c.fontFamily,background:blockBg,minHeight:customMinHeight}}>
          {p.showHeading!==false && p.heading && (
            <MovableTextStage
              key={`products-${viewport}-${Boolean(p.heading)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
              blockProps={p}
              viewport={viewport}
              onChange={onChangeProps}
              style={{ minHeight: "52px", marginBottom: "14px" }}
              items={[
                {
                  id: "heading",
                  defaultPos: { x: 34, y: 10 },
                  style: { width: "min(100%, 420px)", textAlign: "center" as const },
                  content: <h3 style={{fontSize:"16px",fontWeight:800,color:blockColor}}>{p.heading}</h3>,
                },
              ]}
            />
          )}
          {(p.showCategoryTabs !== false || categoryFilter !== "all" || subcategoryFilter !== "all") && (
            <div style={{display:"flex",justifyContent:"center",gap:"8px",flexWrap:"wrap",marginBottom:"14px"}}>
              {p.showCategoryTabs !== false && (
                <>
                  <span style={{padding:"6px 12px",borderRadius:"999px",fontSize:"11px",fontWeight:800,background:blockColor,color:"#fff"}}>
                    {categoryFilter === "all" ? "Todo" : formatCategoryLabel(categoryFilter)}
                  </span>
                  {categoryFilter === "all" && categories.slice(0, 3).map((category) => (
                    <span key={category} style={{padding:"6px 12px",borderRadius:"999px",fontSize:"11px",fontWeight:700,background:"#fff",color:"#6b7280",border:"1px solid #e5e7eb"}}>
                      {formatCategoryLabel(category)}
                    </span>
                  ))}
                </>
              )}
              {categoryFilter !== "all" && subcategoryFilter === "all" && subcategories.slice(0, 3).map((subcategory) => (
                <span key={subcategory} style={{padding:"6px 12px",borderRadius:"999px",fontSize:"11px",fontWeight:700,background:"#fff",color:"#6b7280",border:"1px solid #e5e7eb"}}>
                  {formatCategoryLabel(subcategory)}
                </span>
              ))}
              {subcategoryFilter !== "all" && (
                <span style={{padding:"6px 12px",borderRadius:"999px",fontSize:"11px",fontWeight:700,background:"#fff",color:"#6b7280",border:"1px solid #e5e7eb"}}>
                  {formatCategoryLabel(subcategoryFilter)}
                </span>
              )}
            </div>
          )}
          {visibleProducts.length === 0 ? (
            <div style={{padding:"20px 12px",border:"1px dashed #d1d5db",borderRadius:"14px",textAlign:"center",color:"#9ca3af",fontSize:"12px"}}>
              No hay productos para esa categoría o subcategoría.
            </div>
          ) : layoutMode === "carousel" ? (
            <div style={{display:"flex",gap:"10px",overflowX:"auto",paddingBottom:"6px",scrollSnapType:"x mandatory"}}>
              {visibleProducts.map((product)=> {
                const isPlaceholder = product.id.startsWith("__placeholder_");
                const image = parsePreviewImages(product.images || "")[0];
                return (
                  <div key={product.id} onClick={!isPlaceholder ? ()=>onProductClick?.(product) : undefined} style={{flex:`0 0 calc((100% - ${(cols - 1) * 10}px) / ${cols})`,minWidth:cols===1?"100%":undefined,scrollSnapAlign:"start",borderRadius:"12px",overflow:"hidden",background:"#fff",border:isPlaceholder?"1px dashed #d1d5db":"1px solid #e5e7eb",opacity:isPlaceholder?0.5:1,cursor:isPlaceholder?"default":"pointer"}}>
                    <div style={{aspectRatio:"1",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      {image ? (
                        <img src={image} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      ) : (
                        <span style={{fontSize:"20px",opacity:0.35}}>IMG</span>
                      )}
                    </div>
                    <div style={{padding:"12px"}}>
                      <p style={{fontSize:"12px",fontWeight:700,color:"#111827",marginBottom:"4px",lineHeight:1.4}}>{product.name}</p>
                      <p style={{fontSize:"11px",color:"#10b981",fontWeight:800}}>${Number(product.price || 0).toLocaleString("es-AR")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:"10px"}}>
              {visibleProducts.map((product)=> {
                const isPlaceholder = product.id.startsWith("__placeholder_");
                const image = parsePreviewImages(product.images || "")[0];
                return (
                  <div key={product.id} onClick={!isPlaceholder ? ()=>onProductClick?.(product) : undefined} style={{borderRadius:"12px",overflow:"hidden",background:"#fff",border:isPlaceholder?"1px dashed #d1d5db":"1px solid #e5e7eb",opacity:isPlaceholder?0.5:1,cursor:isPlaceholder?"default":"pointer"}}>
                    <div style={{aspectRatio:"1",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      {image ? (
                        <img src={image} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      ) : (
                        <span style={{fontSize:"20px",opacity:0.35}}>IMG</span>
                      )}
                    </div>
                    <div style={{padding:"12px"}}>
                      <p style={{fontSize:"12px",fontWeight:700,color:"#111827",marginBottom:"4px",lineHeight:1.4}}>{product.name}</p>
                      <p style={{fontSize:"11px",color:"#10b981",fontWeight:800}}>${Number(product.price || 0).toLocaleString("es-AR")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (block.type==="banner") {
      const padH = p.size==="sm" ? "8px" : p.size==="lg" ? "16px" : "12px";
      return (
        <div style={{background:p.bgColor||"#f59e0b",color:p.textColor||"#000",padding:`${padH} 24px`,fontFamily:c.fontFamily,minHeight:customMinHeight}}>
          <MovableTextStage
            key={`banner-${viewport}-${Boolean(p.text)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
            blockProps={p}
            viewport={viewport}
            onChange={onChangeProps}
            style={{ minHeight: "32px" }}
            items={[
              {
                id: "text",
                defaultPos: { x: 26, y: 18 },
                style: { width: "min(100%, 520px)", textAlign: "center" as const },
                content: <p style={{fontSize:"13px",fontWeight:800,letterSpacing:"0.01em",margin:0}}>{p.text||"Oferta especial"}</p>,
              },
            ]}
          />
        </div>
      );
    }

    if (block.type==="banner-group") {
      const slides: any[] = Array.isArray(p.slides) ? p.slides : [];
      const RATIOS: Record<string,string> = { sm:"25%", md:"35%", lg:"47%", xl:"56.25%" };
      const paddingBottom = RATIOS[String(p.height||"md")] || "35%";
      const idx = slides.length > 0 ? carouselIdx % slides.length : 0;
      const slide = slides[idx] || {};
      const overlayOpacity = Number(p.overlayOpacity ?? 35) / 100;
      const textColor = String(p.textColor || "#ffffff");
      const textAlign = String(p.textAlign || "center");
      const fx = slide.focalX ?? 50;
      const fy = slide.focalY ?? 50;

      const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!slide.image) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const newFx = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const newFy = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        const newSlides = slides.map((s: any, i: number) => i === idx ? {...s, focalX: newFx, focalY: newFy} : s);
        onChangeProps({...p, slides: newSlides});
      };

      return (
        <div style={{position:"relative", width:"100%", paddingBottom, overflow:"hidden", fontFamily:c.fontFamily, background:"#1f2937", userSelect:"none"}}>
          <div style={{position:"absolute", inset:0}}>
            {slide.image && <img src={slide.image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:`${fx}% ${fy}%`,transition:"object-position 0.15s"}}/>}
            {!slide.image && <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"rgba(255,255,255,0.3)",fontSize:"48px"}}>🖼️</span></div>}
            <div style={{position:"absolute",inset:0,background:p.overlayColor||"#000000",opacity:overlayOpacity}}/>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:textAlign==="center"?"center":textAlign==="right"?"flex-end":"flex-start",justifyContent:"center",padding:"24px 32px",textAlign:textAlign as React.CSSProperties["textAlign"],gap:"10px"}}>
              {slide.title && <h2 style={{fontSize:"clamp(16px,3vw,28px)",fontWeight:900,color:textColor,lineHeight:1.15,margin:0}}>{slide.title}</h2>}
              {slide.subtitle && <p style={{fontSize:"clamp(11px,1.2vw,14px)",color:textColor,opacity:0.9,margin:0,maxWidth:"480px"}}>{slide.subtitle}</p>}
              {slide.buttonText && <button style={{background:c.primaryColor,color:"#fff",padding:"9px 20px",borderRadius:"999px",fontSize:"12px",fontWeight:800,border:"none",cursor:"inherit",marginTop:"4px"}}>{slide.buttonText}</button>}
            </div>

            {focalMode && slide.image && (
              <div onClick={handleFocalClick} style={{position:"absolute",inset:0,cursor:"crosshair",zIndex:8}}>
                <div style={{position:"absolute",left:`${fx}%`,top:0,bottom:0,width:"1px",background:"rgba(255,255,255,0.5)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",top:`${fy}%`,left:0,right:0,height:"1px",background:"rgba(255,255,255,0.5)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",left:`${fx}%`,top:`${fy}%`,transform:"translate(-50%,-50%)",width:"18px",height:"18px",borderRadius:"50%",border:"2.5px solid #fff",boxShadow:"0 0 0 2px rgba(0,0,0,0.6)",pointerEvents:"none",background:"rgba(99,102,241,0.7)"}}/>
                <div style={{position:"absolute",bottom:"14px",left:0,right:0,display:"flex",justifyContent:"center",gap:"8px",pointerEvents:"none"}}>
                  <span style={{background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:"10px",fontWeight:600,padding:"4px 12px",borderRadius:"999px"}}>Hacé clic donde querés centrar la foto</span>
                </div>
              </div>
            )}
            {selected && slide.image && (
              <button onClick={(e)=>{e.stopPropagation();setFocalMode(f=>!f);}} style={{position:"absolute",bottom:"8px",right:"8px",zIndex:9,background:focalMode?"#6366f1":"rgba(0,0,0,0.55)",color:"#fff",border:"none",borderRadius:"999px",padding:"5px 12px",fontSize:"11px",fontWeight:700,cursor:"pointer",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",gap:"5px"}}>
                {focalMode ? "✓ Listo" : "📷 Mover foto"}
              </button>
            )}
            {p.showDots!==false && slides.length > 1 && (
              <div style={{position:"absolute",bottom:"10px",left:0,right:0,display:"flex",justifyContent:"center",gap:"5px",zIndex:6}}>
                {slides.map((_:any,i:number)=>(
                  <button key={i} onClick={(e)=>{e.stopPropagation();setCarouselIdx(i);}} style={{width:i===idx?"20px":"8px",height:"8px",borderRadius:"4px",background:i===idx?"#fff":"rgba(255,255,255,0.45)",border:"none",cursor:"pointer",padding:0,transition:"width 0.25s"}}/>
                ))}
              </div>
            )}
            {p.showArrows!==false && slides.length > 1 && (
              <>
                <button onClick={(e)=>{e.stopPropagation();setCarouselIdx(i=>(i-1+slides.length)%slides.length);}} style={{position:"absolute",left:"8px",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.35)",border:"none",borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:"16px",lineHeight:1,zIndex:6}}>‹</button>
                <button onClick={(e)=>{e.stopPropagation();setCarouselIdx(i=>(i+1)%slides.length);}} style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.35)",border:"none",borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:"16px",lineHeight:1,zIndex:6}}>›</button>
              </>
            )}
          </div>
        </div>
      );
    }

    if (block.type==="cta") {
      return (
        <div style={{background:p.bgColor||"#0f172a",color:p.textColor||"#fff",padding:"40px 24px",fontFamily:c.fontFamily,minHeight:customMinHeight}}>
          <MovableTextStage
            key={`cta-${viewport}-${Boolean(p.heading)}-${Boolean(p.sub)}-${Boolean(p.buttonText)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
            blockProps={p}
            viewport={viewport}
            onChange={onChangeProps}
            style={{ minHeight: customMinHeight || "180px" }}
            items={[
              {
                id: "heading",
                defaultPos: { x: 28, y: 16 },
                style: { width: "min(100%, 520px)", textAlign: "center" as const },
                content: <h3 style={{fontSize:"20px",fontWeight:900,margin:0}}>{p.heading||"Lista para comprar?"}</h3>,
              },
              ...(p.sub ? [{
                id: "sub",
                defaultPos: { x: 27, y: 40 },
                style: { width: "min(100%, 520px)", textAlign: "center" as const },
                content: <p style={{fontSize:"12px",opacity:0.78,lineHeight:1.6,margin:0}}>{p.sub}</p>,
              }] : []),
              {
                id: "buttonText",
                defaultPos: { x: 36, y: 66 },
                content: <button style={{background:"#fff",color:"#111827",padding:"10px 18px",borderRadius:"12px",fontSize:"12px",fontWeight:800,cursor:"inherit"}}>{p.buttonText||"Ver catalogo"}</button>,
              },
            ]}
          />
        </div>
      );
    }

    if (block.type==="image-text") {
      const imageWidth = Number(p.imageWidth || 50);
      const imageHeight = Number(p.imageHeight || 320);
      const blockColor = p.color || c.primaryColor;
      const textColor = p.textColor || "#6b7280";
      const pos = p.imagePosition || "left";
      const isVertical = pos === "top" || pos === "bottom";
      const stackedImageText = viewport !== "desktop" || isVertical;
      const radiusMap: Record<string,string> = { redondeada:"18px", cuadrada:"0px", circulo:"50%", ovalada:"50px" };
      const imageRadius = radiusMap[p.imageRadius||"redondeada"] || "18px";
      const isRound = p.imageRadius === "circulo" || p.imageRadius === "ovalada";
      const flexDir = isVertical
        ? (pos === "bottom" ? "column-reverse" : "column")
        : (pos === "right" ? "row-reverse" : "row");
      const imgContainerStyle: React.CSSProperties = isRound ? {
        flex: stackedImageText ? "0 0 auto" : `0 0 ${imageWidth}%`,
        alignSelf: "center",
        aspectRatio: p.imageRadius === "circulo" ? "1 / 1" : "3 / 4",
        borderRadius: imageRadius,
        overflow: "hidden",
        background: p.imageBgColor || "#f3f4f6",
      } : {
        flex: stackedImageText ? "1 1 auto" : `0 0 ${imageWidth}%`,
        width: stackedImageText && !isVertical ? "100%" : undefined,
        minHeight: `${imageHeight}px`,
        borderRadius: imageRadius,
        overflow: "hidden",
        background: p.imageBgColor || "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
      return (
        <div style={{display:"flex",gap:"20px",padding:"24px",background:p.bgColor||"transparent",fontFamily:c.fontFamily,alignItems:isRound?"center":"stretch",flexDirection:flexDir as React.CSSProperties["flexDirection"],minHeight:customMinHeight}}>
          <div style={imgContainerStyle}>
            {p.image ? (
              <img src={p.image} alt={p.heading || "Imagen del bloque"} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:p.imageFocus||"center"}} />
            ) : (
              <div style={{color:"#9ca3af",fontSize:"12px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>Sin imagen</div>
            )}
          </div>
          <div style={{flex:stackedImageText&&!isVertical ? "1 1 auto" : `1 1 ${100-imageWidth}%`,width:stackedImageText&&!isVertical ? "100%" : undefined,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <MovableTextStage
              key={`image-text-${viewport}-${Boolean(p.heading)}-${Boolean(p.body)}-${JSON.stringify(getViewportTextPositions(p, viewport))}`}
              blockProps={p}
              viewport={viewport}
              onChange={onChangeProps}
              style={{ minHeight: `${imageHeight}px` }}
              items={[
                ...(p.heading ? [{
                  id: "heading",
                  defaultPos: { x: 6, y: 28 },
                  style: { width: "min(100%, 420px)", textAlign: "left" as const },
                  content: <h3 style={{fontSize:"30px",fontWeight:900,color:blockColor,marginBottom:"16px",lineHeight:1.2}}>{p.heading}</h3>,
                }] : []),
                ...(p.body ? [{
                  id: "body",
                  defaultPos: { x: 6, y: 44 },
                  style: { width: "min(100%, 460px)", textAlign: "left" as const },
                  content: <p style={{fontSize:"16px",color:textColor,lineHeight:1.7}}>{p.body}</p>,
                }] : []),
              ]}
            />
          </div>
        </div>
      );
    }

    if (block.type==="socials") {
      const layout = String(p.layout || "icons");
      const blockColor = p.color || c.primaryColor;
      const visibleItems = socialItems;

      const headingNode = p.showHeading !== false && p.heading ? (
        <div style={{textAlign:"center",marginBottom:"14px"}}>
          <h3 style={{fontSize:"16px",fontWeight:800,color:blockColor,margin:0}}>{p.heading}</h3>
        </div>
      ) : null;

      const SvgIcon = ({ path, bg, size }: { path:string; bg:string; size:number }) => (
        <div style={{width:size,height:size,borderRadius:"999px",display:"grid",placeItems:"center",background:bg,flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,.18)"}}>
          <svg viewBox="0 0 24 24" fill="white" width={size*0.46} height={size*0.46}><path d={path}/></svg>
        </div>
      );

      const iconSize = visibleItems.length <= 2 ? 64 : visibleItems.length <= 3 ? 56 : 48;
      const socAllKeys = channelOrder.length===ALL_CHANNELS.length?[...channelOrder]:ALL_CHANNELS.map(ch=>ch.key);
      const socVisKeys = visibleItems.map(v=>v.key);

      if (layout === "icons") {
        return (
          <div style={{padding:"24px",fontFamily:c.fontFamily,background:p.bgColor||"transparent",textAlign:"center",minHeight:customMinHeight}}>
            {headingNode}
            <div style={{display:"flex",flexWrap:"wrap",gap:visibleItems.length<=2?"20px":"12px",justifyContent:"center",alignItems:"flex-end"}}>
              {visibleItems.map((item,i)=>(
                <div key={item.label}
                  ref={el=>{ socialIconRefs.current[i]=el; }}
                  onMouseDown={e=>startSocialDrag(e,i,socVisKeys,socAllKeys,p)}
                  onClick={e=>e.stopPropagation()}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",
                    cursor:socialDragFrom===i?"grabbing":"grab",
                    opacity:socialDragFrom===i?0.4:1,
                    outline:socialDragOver===i&&socialDragFrom!==i?"3px solid #6366f1":"none",
                    outlineOffset:"4px",borderRadius:"999px",
                    transition:"opacity 0.1s",userSelect:"none"}}
                  title={`Arrastrá para reordenar — ${item.label}`}
                >
                  <SvgIcon path={item.path} bg={item.bg} size={iconSize}/>
                  {visibleItems.length <= 3 && <span style={{fontSize:"10px",fontWeight:700,color:"#374151"}}>{item.label}</span>}
                </div>
              ))}
            </div>
            {visibleItems.length <= 2 && (
              <p style={{fontSize:"11px",color:"#9ca3af",marginTop:"12px"}}>Activá más canales en el panel de edición</p>
            )}
          </div>
        );
      }

      if (layout === "buttons") {
        return (
          <div style={{padding:"24px",fontFamily:c.fontFamily,background:p.bgColor||"transparent",textAlign:"center",minHeight:customMinHeight}}>
            {headingNode}
            <div style={{display:"flex",flexDirection:"column",gap:"10px",maxWidth:"320px",margin:"0 auto"}}>
              {visibleItems.map((item,i)=>(
                <div key={item.label}
                  ref={el=>{ socialIconRefs.current[i]=el; }}
                  onMouseDown={e=>startSocialDrag(e,i,socVisKeys,socAllKeys,p)}
                  onClick={e=>e.stopPropagation()}
                  style={{background:blockColor,color:"#fff",borderRadius:"12px",padding:"12px 20px",fontSize:"13px",fontWeight:700,display:"flex",alignItems:"center",gap:"12px",
                    cursor:socialDragFrom===i?"grabbing":"grab",
                    opacity:socialDragFrom===i?0.4:1,
                    outline:socialDragOver===i&&socialDragFrom!==i?"3px solid #6366f1":"none",
                    outlineOffset:"2px",userSelect:"none"}}
                >
                  <SvgIcon path={item.path} bg="rgba(255,255,255,0.2)" size={32}/>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // card layout
      const columns = visibleItems.length === 1 ? 1 : Math.max(2, Math.min(4, visibleItems.length));
      return (
        <div style={{padding:"28px 24px",fontFamily:c.fontFamily,background:p.bgColor||"transparent",minHeight:customMinHeight}}>
          {headingNode}
          <div style={{display:"grid",gridTemplateColumns:visibleItems.length===1?"1fr":`repeat(${columns}, minmax(0, 1fr))`,gap:"12px",maxWidth:visibleItems.length===1?"260px":"none",margin:visibleItems.length===1?"0 auto":"0"}}>
            {visibleItems.map((item,i)=>(
              <div key={item.label}
                ref={el=>{ socialIconRefs.current[i]=el; }}
                onMouseDown={e=>startSocialDrag(e,i,socVisKeys,socAllKeys,p)}
                onClick={e=>e.stopPropagation()}
                style={{border:socialDragOver===i&&socialDragFrom!==i?"2px solid #6366f1":"1px solid #e5e7eb",borderRadius:"16px",padding:"14px 12px",display:"flex",alignItems:"center",gap:"10px",background:"#fff",
                  cursor:socialDragFrom===i?"grabbing":"grab",
                  opacity:socialDragFrom===i?0.4:1,
                  userSelect:"none"}}
              >
                <SvgIcon path={item.path} bg={item.bg} size={36}/>
                <div>
                  <p style={{fontSize:"12px",fontWeight:700,color:"#111827",margin:0}}>{item.label}</p>
                  <p style={{fontSize:"11px",color:"#6b7280",margin:0}}>{p[item.url]||"Canal activo"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (block.type==="spacer") {
      const h = customMinHeight || SPACER_H[p.height as keyof typeof SPACER_H||"md"] || "48px";
      const hasContent = p.text || p.emoji;
      const lineStyle = p.lineStyle || "none";
      const lineColor = p.lineColor || "#e5e7eb";
      const line = lineStyle !== "none" ? <div style={{flex:1,borderTop:`1.5px ${lineStyle} ${lineColor}`}}/> : null;
      return (
        <div style={{
          minHeight: h,
          background: p.bgColor || (hasContent || lineStyle !== "none" ? "transparent" : "repeating-linear-gradient(45deg,#f9fafb,#f9fafb 10px,#f3f4f6 10px,#f3f4f6 20px)"),
          display:"flex", alignItems:"center", justifyContent:"center", padding: hasContent || lineStyle !== "none" ? "0 24px" : "0",
        }}>
          {(hasContent || lineStyle !== "none") ? (
            <div style={{display:"flex",alignItems:"center",gap:"12px",width:"100%"}}>
              {line}
              {hasContent && (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",flexShrink:0}}>
                  {p.emoji && <span style={{fontSize:"22px",lineHeight:1}}>{p.emoji}</span>}
                  {p.text && <span style={{fontSize:"13px",fontWeight:600,color:p.textColor||"#374151",whiteSpace:"nowrap"}}>{p.text}</span>}
                </div>
              )}
              {line}
            </div>
          ) : null}
        </div>
      );
    }

    if (block.type==="divider") {
      return (
        <div style={{padding:"8px 24px",minHeight:customMinHeight}}>
          <hr style={{border:"none",borderTop:`2px ${p.style||"solid"} ${p.color||"#e5e7eb"}`}}/>
        </div>
      );
    }

    if (block.type==="nosotros") {
      const members: {id:string;name:string;role:string;image:string;bio:string}[] = Array.isArray(p.members) ? p.members : [];
      const features: {id:string;number:string;title:string;desc:string}[] = Array.isArray(p.features) ? p.features : [];
      const bg = String(p.bgColor||"#ffffff");
      const fg = String(p.textColor||"#111827");
      return (
        <div style={{background:bg,color:fg,minHeight:customMinHeight,position:"relative"}}>
          {selected && (
            <div style={{position:"absolute",bottom:"10px",right:"10px",zIndex:4,padding:"5px 10px",borderRadius:"999px",background:"rgba(255,255,255,0.92)",color:"#4f46e5",fontSize:"10px",fontWeight:700,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",pointerEvents:"none"}}>
              Editá desde el panel izquierdo ←
            </div>
          )}
          {/* Header */}
          <div style={{maxWidth:"720px",margin:"0 auto",padding:"48px 24px 32px"}}>
            {p.tag && <span style={{display:"inline-block",border:`1.5px solid ${fg}`,borderRadius:"999px",padding:"3px 12px",fontSize:"10px",fontWeight:800,letterSpacing:"0.15em",marginBottom:"16px",opacity:0.6}}>{String(p.tag)}</span>}
            <h1 style={{fontWeight:900,fontSize:"28px",margin:"0 0 10px",lineHeight:1.15}}>{String(p.heading||"¿Quiénes somos?")}</h1>
            {p.subtitle && <p style={{fontSize:"14px",opacity:0.65,margin:0}}>{String(p.subtitle)}</p>}
          </div>
          {/* Members */}
          {p.showMembers && members.length > 0 && (
            <div style={{maxWidth:"720px",margin:"0 auto",padding:"0 24px 32px",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"16px"}}>
              {members.map(m=>(
                <div key={m.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"16px",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  {m.image && <img src={m.image} alt={m.name} style={{width:"100%",height:"120px",objectFit:"cover"}}/>}
                  <div style={{padding:"12px 14px"}}>
                    {m.name && <p style={{fontWeight:800,fontSize:"13px",margin:"0 0 2px",color:"#111827"}}>{m.name}</p>}
                    {m.role && <p style={{fontSize:"11px",color:"#9ca3af",margin:"0 0 6px"}}>{m.role}</p>}
                    {m.bio && <p style={{fontSize:"11px",color:"#6b7280",margin:0,whiteSpace:"pre-line"}}>{m.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Text section */}
          {p.showTextSection && (
            <div style={{maxWidth:"720px",margin:"0 auto",padding:"0 24px 32px"}}>
              <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:"16px",padding:"24px"}}>
                {p.textSectionHeading && <h2 style={{fontWeight:800,fontSize:"16px",textAlign:"center",margin:"0 0 12px",color:fg}}>{String(p.textSectionHeading)}</h2>}
                {p.textSectionBody && <p style={{fontSize:"12px",color:"#4b5563",lineHeight:1.7,margin:0,whiteSpace:"pre-line",textAlign:"center"}}>{String(p.textSectionBody)}</p>}
              </div>
            </div>
          )}
          {/* Features */}
          {p.showFeatures && (
            <div style={{background:p.featuresBgColor||"#4338ca",padding:"32px 24px"}}>
              {p.featuresHeading && <h2 style={{fontWeight:900,fontSize:"18px",color:"#fff",textAlign:"center",margin:"0 0 6px"}}>{String(p.featuresHeading)}</h2>}
              {p.featuresSubtitle && <p style={{fontSize:"12px",color:"rgba(255,255,255,0.6)",textAlign:"center",margin:"0 0 20px"}}>{String(p.featuresSubtitle)}</p>}
              {features.length > 0 ? (
                <div style={{maxWidth:"720px",margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                  {features.map(f=>(
                    <div key={f.id} style={{background:"rgba(255,255,255,0.1)",borderRadius:"12px",padding:"14px",border:"1px solid rgba(255,255,255,0.1)"}}>
                      {f.number && <p style={{fontSize:"22px",fontWeight:900,color:"rgba(255,255,255,0.2)",margin:"0 0 4px"}}>{f.number}</p>}
                      {f.title && <p style={{fontWeight:800,fontSize:"12px",color:"#fff",margin:"0 0 4px"}}>{f.title}</p>}
                      {f.desc && <p style={{fontSize:"11px",color:"rgba(255,255,255,0.65)",margin:0}}>{f.desc}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{textAlign:"center",color:"rgba(255,255,255,0.5)",fontSize:"12px",margin:0}}>Agregá pasos desde el panel izquierdo</p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (block.type==="contacto") {
      const bgCol = String(p.bgColor||"#111827");
      const bgImg = String(p.bgImage||"");
      const isLightBg = !bgImg && (() => { const h=(bgCol).replace("#",""); if(h.length<6) return false; const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16); return (r*299+g*587+b*114)/1000>160; })();
      const txtCol = String(p.textColor||(isLightBg?"#111827":"#ffffff"));
      return (
        <div style={{position:"relative",background:bgCol,color:txtCol,padding:"40px 24px",textAlign:"center",minHeight:customMinHeight}}>
          {bgImg && <img src={bgImg} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.35}}/>}
          <div style={{position:"relative",maxWidth:"500px",margin:"0 auto"}}>
            <h2 style={{fontWeight:900,fontSize:"22px",margin:"0 0 6px",color:txtCol}}>{String(p.heading||"Contacto")}</h2>
            {p.subtitle && <p style={{opacity:0.7,fontSize:"13px",marginBottom:"20px"}}>{String(p.subtitle)}</p>}
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {p.showName!==false && <div style={{background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"10px 14px",textAlign:"left",fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>Nombre completo</div>}
              {p.showEmail!==false && <div style={{background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"10px 14px",textAlign:"left",fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>Email</div>}
              {p.showPhone && <div style={{background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"10px 14px",textAlign:"left",fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>Teléfono</div>}
              {p.showMessage!==false && <div style={{background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"10px 14px",textAlign:"left",fontSize:"12px",color:"rgba(255,255,255,0.5)",height:"60px"}}>Mensaje</div>}
              <div style={{background:p.buttonColor||"#6366f1",color:"#fff",borderRadius:"999px",padding:"10px 24px",fontSize:"13px",fontWeight:800,textAlign:"center"}}>{String(p.buttonText||"Enviar mensaje")}</div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      data-block-id={block.id}
      ref={blockWrapRef}
      style={wrapStyle}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {renderContent()}
      {hoverBadge}
      {floatingControls}
    </div>
  );
}
function BlockLibraryModal({ onAdd, onClose }: { onAdd:(type:BlockType)=>void; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Agregar bloque</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-gray-600"/>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {BLOCK_LIBRARY.map(b=>(
            <button key={b.type} onClick={()=>{ onAdd(b.type); onClose(); }}
              className="flex items-start gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group">
              <span className="text-2xl">{b.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700">{b.label}</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">{b.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function ConfiguracionPage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [preview, setPreview]     = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [open, setOpen]           = useState<DesignSection[]>(["template","colores"]);
  const [uploadingLogo, setUL]    = useState(false);
  const [uploadingBanner, setUB]  = useState(false);
  const [uploadingBlockImage, setUploadingBlockImage] = useState(false);
  const logoRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const blockImageRef = useRef<HTMLInputElement>(null);
  const reelVideoRef = useRef<HTMLInputElement>(null);
  const [uploadingReel, setUploadingReel] = useState(false);
  const [config, setConfig]       = useState<StoreConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty]     = useState(false);
  const loadedRef                 = useRef(false);
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<Record<string,string[]>>({});
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [previewModalProduct, setPreviewModalProduct] = useState<PreviewProduct | null>(null);

  // Blocks state
  const [blocks, setBlocks]               = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string|null>(null);
  const [selectedImageField, setSelectedImageField] = useState<string>("image");
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [previewHoverLink, setPreviewHoverLink] = useState<string|null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const blockItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const editorPanelRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    fetch("/api/productos")
      .then(r=>r.json())
      .then(({products})=>{
        setPreviewProducts(Array.isArray(products) ? products : []);
        const categories = Array.from(new Set(((products || []) as any[]).map(product => product.category).filter(Boolean))) as string[];
        setProductCategories(categories);
        const grouped = ((products || []) as any[]).reduce((acc: Record<string,string[]>, product) => {
          if (!product.category || !product.subcategory) return acc;
          acc[product.category] = Array.from(new Set([...(acc[product.category] || []), product.subcategory]));
          return acc;
        }, {});
        setProductSubcategories(grouped);
      })
      .catch(()=>{});

    fetch("/api/configuracion").then(r=>r.json()).then(({store})=>{
      if(store) {
        setStoreSlug(store.slug || "");
        setConfig(p=>({...p,...store,
          commissionRate:String(store.commissionRate||10),
          announcementBar:store.announcementBar||"",
          announcementBarColor:store.announcementBarColor||"#6366f1",
          instagramUrl:store.instagramUrl||"",
          facebookUrl:store.facebookUrl||"",
          tiktokUrl:store.tiktokUrl||"",
          whatsappNumber:store.whatsappNumber||"",
          footerText:store.footerText||"",
          navLinks:store.navLinks||"[]",
        }));
        try {
          const parsedRaw = JSON.parse(store.pageBlocks||"[]");
          // Support both old format (array) and new format ({ blocks, modalConfig })
          const loadedBlocks: Block[] = Array.isArray(parsedRaw) ? parsedRaw : (Array.isArray(parsedRaw?.blocks) ? parsedRaw.blocks : []);
          const pmc = parsedRaw?.modalConfig || {};
          setBlocks(loadedBlocks);
          if (pmc && typeof pmc === "object") {
            setConfig(p=>({...p,
              productModalSizeChart: Boolean(pmc.sizeChart),
              productModalSizeChartTitle: pmc.sizeChartTitle || "Tabla de talles",
              productModalSizeChartData: pmc.sizeChartData || '{"columns":["Talle","Pecho","Cintura","Cadera"],"rows":[]}',
              productModalShowReels: Boolean(pmc.showReels),
              productModalReelUrls: pmc.reelUrls || "[]",
              productModalButtonText: pmc.buttonText || "Agregar al carrito",
              productModalAccentColor: pmc.accentColor || "",
              productModalShowDescription: pmc.showDescription !== false,
            }));
          }
        } catch {}
      }
      setLoading(false);
      loadedRef.current = true;
    });
  },[]);

  useEffect(() => {
    if (!selectedBlockId) return;
    const el = blockItemRefs.current.get(selectedBlockId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedBlockId]);

  const set = <K extends keyof StoreConfig>(k:K,v:StoreConfig[K]) => {
    setConfig(p=>({...p,[k]:v}));
    if (loadedRef.current) setIsDirty(true);
  };
  const toggle = (s:DesignSection) => setOpen(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  async function uploadAsset(file: File) {
    const fd=new FormData(); fd.append("file",file);
    const res=await fetch("/api/upload",{method:"POST",body:fd});
    const {url}=await res.json();
    return url as string | undefined;
  }

  async function upload(file:File, field:"logo"|"banner") {
    if(field==="logo") setUL(true); else setUB(true);
    const url = await uploadAsset(file);
    if(url) set(field,url);
    if(field==="logo") setUL(false); else setUB(false);
  }

  async function uploadBlockImage(file: File) {
    if (!selectedBlockId) return;
    setUploadingBlockImage(true);
    const url = await uploadAsset(file);
    if (url) {
      const current = blocks.find((block) => block.id === selectedBlockId);
      if (current) {
        if (selectedImageField.startsWith("member_image_")) {
          const memberId = selectedImageField.replace("member_image_", "");
          const members = Array.isArray(current.props.members) ? current.props.members : [];
          updateBlock(selectedBlockId, { ...current.props, members: members.map((m: {id:string}) => m.id === memberId ? { ...m, image: url } : m) });
        } else {
          updateBlock(selectedBlockId, { ...current.props, [selectedImageField]: url });
        }
      }
    }
    setUploadingBlockImage(false);
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    try {
      // Asegurar que todas las posiciones de texto se sincronicen antes de guardar
      const processedBlocks = blocks.map(block => ({
        ...block,
        props: {
          ...block.props,
          // Garantizar que textPositions sea un objeto válido
          textPositions: block.props.textPositions && typeof block.props.textPositions === 'object' 
            ? block.props.textPositions 
            : {}
        }
      }));

      const modalConfig = {
        sizeChart: config.productModalSizeChart,
        sizeChartTitle: config.productModalSizeChartTitle,
        sizeChartData: config.productModalSizeChartData,
        showReels: config.productModalShowReels,
        reelUrls: config.productModalReelUrls,
        buttonText: config.productModalButtonText || "Agregar al carrito",
        accentColor: config.productModalAccentColor || "",
        showDescription: config.productModalShowDescription !== false,
      };
      const pageBlocksPayload = JSON.stringify({ blocks: processedBlocks, modalConfig });
      // UX-04: Validate social URL format
      const socialUrlFields: { val: string | undefined | null; label: string }[] = [
        { val: config.instagramUrl, label: "Instagram" },
        { val: config.facebookUrl,  label: "Facebook" },
        { val: config.tiktokUrl,    label: "TikTok" },
      ];
      for (const { val, label } of socialUrlFields) {
        if (val && typeof val === "string") {
          const v = val.trim();
          if (v && !v.startsWith("@") && !v.startsWith("http://") && !v.startsWith("https://")) {
            setSaving(false);
            alert(`URL de ${label} inválida. Usá una URL completa (https://...) o un @usuario.`);
            return;
          }
        }
      }

      // UX-05: Validate WhatsApp international format
      if (config.whatsappNumber && config.whatsappNumber.trim()) {
        const waClean = config.whatsappNumber.trim().replace(/[\s\-()+]/g, "");
        if (!/^\d{7,15}$/.test(waClean)) {
          setSaving(false);
          alert("Número de WhatsApp inválido. Usá formato internacional: 5491112345678 (sin espacios ni guiones).");
          return;
        }
      }

      const res = await fetch("/api/configuracion",{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...config, pageBlocks: pageBlocksPayload})
      });
      if (!res.ok) {
        let msg = "Error al guardar";
        try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
        throw new Error(msg);
      }
      setSaved(true);
      setIsDirty(false);
      setTimeout(()=>setSaved(false),3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`No se pudo guardar: ${msg}. Verificá tu conexión e intentá de nuevo.`);
    } finally {
      setSaving(false);
    }
  }

  // Block helpers
  function addBlock(type:BlockType) {
    const lib = BLOCK_LIBRARY.find(b=>b.type===type)!;
    const newBlock: Block = { id:`${type}-${Date.now()}`, type, props:{...lib.defaultProps} };
    setBlocks(p=>[...p,newBlock]);
    setSelectedBlockId(newBlock.id);
    setIsDirty(true);
  }

  function updateBlock(id:string, props:Record<string,any>) {
    setBlocks(p=>p.map(b=>b.id===id?{...b,props}:b));
    setIsDirty(true);
  }

  function deleteBlock(id:string) {
    setBlocks(p=>p.filter(b=>b.id!==id));
    setIsDirty(true);
    if(selectedBlockId===id) setSelectedBlockId(null);
  }

  function duplicateBlock(id:string) {
    const idx = blocks.findIndex(b=>b.id===id);
    if(idx<0) return;
    const orig = blocks[idx];
    const newB: Block = { ...orig, id:`${orig.type}-${Date.now()}` };
    setBlocks(p=>[...p.slice(0,idx+1),newB,...p.slice(idx+1)]);
    setSelectedBlockId(newB.id);
    setIsDirty(true);
  }

  function loadTemplateBlocks(templateId: string) {
    const defs = TEMPLATE_BLOCKS[templateId] ?? TEMPLATE_BLOCKS["default"];
    const newBlocks: Block[] = defs.map(b => ({ ...b, id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }));
    setBlocks(newBlocks);
    setSelectedBlockId(null);
    setIsDirty(true);
  }

  function moveBlock(id:string, dir:-1|1) {
    setBlocks(p=>{
      const idx=p.findIndex(b=>b.id===id); if(idx<0) return p;
      const ni=idx+dir; if(ni<0||ni>=p.length) return p;
      const a=[...p]; [a[idx],a[ni]]=[a[ni],a[idx]]; return a;
    });
    setIsDirty(true);
  }

  const previewW ={desktop:"w-full",tablet:"w-[420px]",mobile:"w-[280px]"}[preview];
  const hasCustomBlocks = blocks.length > 0 && !isStarterConfigBlocks(blocks);

  useEffect(() => {
    if (!selectedBlockId) return;
    const viewport = previewScrollRef.current;
    if (!viewport) return;
    const target = viewport.querySelector<HTMLElement>(`[data-block-id="${selectedBlockId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedBlockId]);

  // Sincronizar cambios de bloques a isDirty
  useEffect(() => {
    if (loadedRef.current && blocks.length > 0) {
      setIsDirty(true);
    }
  }, [blocks.length]);

  // Advertir al cerrar la pestaña o el navegador con cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if(loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-indigo-600"/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* Bloqueo en móvil/tablet — el editor requiere pantalla de PC */}
      <div className="lg:hidden fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <Monitor className="h-16 w-16 text-gray-300 mb-4"/>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Editor no disponible</h2>
        <p className="text-gray-500 text-sm max-w-sm">El editor de la tienda está optimizado para pantallas de PC. Por favor accedé desde una computadora.</p>
      </div>
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"logo")}/>
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"banner")}/>
      <input ref={blockImageRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&uploadBlockImage(e.target.files[0])}/>

      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diseñá tu tienda</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Preview en vivo mientras editás</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/tienda/${storeSlug}`} target="_blank"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors border border-gray-200 px-3 py-2 rounded-xl">
            <ExternalLink className="h-3.5 w-3.5"/> Ver en vivo
          </a>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200">
            {saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}
            {saved?"¡Guardado! ✓":saving?"Guardando...":"Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-1 gap-3 grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── EDITOR PANEL ── */}
        <div ref={editorPanelRef} className="min-h-0 overflow-y-auto space-y-2 pr-1 pb-4">

          {/* ── BLOQUES ── */}
            <div className="space-y-3">
              {/* Add block button */}
              <button onClick={()=>setShowBlockLibrary(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-200">
                <Plus className="h-4 w-4"/> Agregar bloque
              </button>

              {blocks.length===0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                  <Layers className="h-8 w-8 text-gray-300 mx-auto mb-3"/>
                  <p className="text-gray-500 text-sm font-medium">Sin bloques de contenido</p>
                  <p className="text-gray-400 text-xs mt-1">Agregá secciones para personalizar el contenido de tu tienda</p>
                </div>
              ) : (
                /* Block list */
                <div className="space-y-1.5">
                  {blocks.map((b,idx)=>{
                    const lib = BLOCK_LIBRARY.find(x=>x.type===b.type);
                    const isSel = selectedBlockId===b.id;
                    return (
                      <div
                        key={b.id}
                        ref={(el) => { if (el) blockItemRefs.current.set(b.id, el); else blockItemRefs.current.delete(b.id); }}
                        draggable={!isSel}
                        onDragStart={(e) => {
                          if (isSel) { e.preventDefault(); return; }
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("blockIndex", String(idx));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceIdx = Number(e.dataTransfer.getData("blockIndex"));
                          if (sourceIdx !== idx && sourceIdx >= 0 && sourceIdx < blocks.length) {
                            const newBlocks = [...blocks];
                            const [movedBlock] = newBlocks.splice(sourceIdx, 1);
                            newBlocks.splice(idx, 0, movedBlock);
                            setBlocks(newBlocks);
                            setIsDirty(true);
                          }
                        }}
                        className={`rounded-2xl overflow-hidden transition-all cursor-grab active:cursor-grabbing ${isSel ? "bg-white border-2 border-indigo-300 shadow-lg shadow-indigo-100/70" : "bg-white border border-gray-100 hover:border-gray-200"}`}>
                        <div
                          onClick={()=>setSelectedBlockId(isSel?null:b.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSel?"bg-gradient-to-r from-indigo-50 to-violet-50":"hover:bg-gray-50"}`}
                        >
                          <span className="text-lg">{lib?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isSel?"text-indigo-700":"text-gray-900"}`}>{lib?.label}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {b.props.title||b.props.heading||b.props.text||"···"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={e=>{e.stopPropagation();moveBlock(b.id,-1);}} disabled={idx===0}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                              title="Mover arriba">
                              <ChevronUp className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();moveBlock(b.id,1);}} disabled={idx===blocks.length-1}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                              title="Mover abajo">
                              <ChevronDown className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();duplicateBlock(b.id);}}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                              title="Duplicar">
                              <Copy className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();deleteBlock(b.id);}}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                              title="Eliminar">
                              <Trash2 className="h-3 w-3"/>
                            </button>
                          </div>
                        </div>

                        {/* Inline editor */}
                        {isSel && (
                          <div className="border-t-2 border-indigo-200 px-3 py-3 bg-gradient-to-b from-indigo-50/80 via-white to-indigo-50/40 space-y-3">
                            <div className="sticky top-0 z-[1] -mx-3 -mt-3 mb-3 border-b border-indigo-100 bg-white/90 px-3 py-2 backdrop-blur">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Editando este bloque</p>
                            </div>
                            <BlockEditor
                              block={b}
                              onChange={props=>updateBlock(b.id,props)}
                              config={config}
                              categories={productCategories}
                              subcategoriesByCategory={productSubcategories}
                              uploadingImage={uploadingBlockImage && selectedBlockId === b.id}
                              onPickImage={(field?: string) => {
                                setSelectedBlockId(b.id);
                                setSelectedImageField(field || "image");
                                blockImageRef.current?.click();
                              }}
                              onUploadFile={uploadAsset}
                              blocks={blocks}
                            />
                            {blockSupportsMovableText(b.type) && (
                              <button
                                type="button"
                                onClick={() => updateBlock(b.id, clearViewportTextPositions(b.props, preview))}
                                className="w-full rounded-xl border border-dashed border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                              >
                                Resetear posiciones de texto ({preview})
                              </button>
                            )}
                            <div className="border-t border-dashed border-indigo-200 pt-2">
                              <p className="text-[11px] text-indigo-400">Fin de este bloque</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <ContentGlobalSettings config={config} set={set} />

              <p className="text-xs text-gray-400 text-center px-2">
                Hacé clic en un bloque para editarlo · Los cambios se ven en tiempo real en la preview →
              </p>
            </div>
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="min-h-0 h-full flex flex-col rounded-2xl border-2 border-indigo-100 shadow-xl shadow-indigo-100/40">
          <div className="bg-gray-800 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/>
              </div>
              <div className="flex-1 mx-4 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center truncate">
                mitienda.com/tienda/{storeSlug || config.name || "mi-tienda"}
              </div>
              <div className="flex items-center gap-1">
                {([["desktop",Monitor],["tablet",Tablet],["mobile",Smartphone]] as const).map(([id,Icon])=>(
                  <button key={id} onClick={()=>setPreview(id)}
                    className={`p-1.5 rounded-lg transition-colors ${preview===id?"bg-gray-600 text-white":"text-gray-500 hover:text-gray-300"}`}>
                    <Icon className="h-3.5 w-3.5"/>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 flex items-start justify-center p-4 overflow-y-auto flex-1 min-h-0">
              <div ref={previewScrollRef} className={`${previewW} relative transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl`}>
                <div style={{fontFamily:config.fontFamily,minHeight:"400px"}}>
                    {/* Mini navbar */}
                    {(()=>{
                      const navbarBlock = blocks.find(b=>b.type==="navbar");
                      const isSolid = config.navbarStyle==="solid";
                      const bgColor = isSolid ? config.primaryColor : "white";
                      const fgColor = isSolid ? "white" : config.primaryColor;
                      const linkColor = isSolid ? "rgba(255,255,255,0.85)" : "#374151";
                      if (navbarBlock) {
                        const navCfg = parseNavConfig(String(navbarBlock.props.navConfig || '{"layout":"right","showSearch":false,"links":[]}'));
                        const nbBg = navCfg.bgColor || bgColor;
                        const nbFg = navCfg.textColor || fgColor;
                        const nbLink = navCfg.textColor || linkColor;
                        const isHamb = navCfg.mode === "hamburger";
                        const nbLogoText = String(navbarBlock.props.logoText || config.name || "Mi Tienda");
                        const nbLogoUrl = String(navbarBlock.props.logoUrl || "");
                        const isSearchBar = navCfg.showSearch && navCfg.searchStyle === "bar";
                        const previewSubs: Record<string,string[]> = {};
                        previewProducts.forEach(p=>{ if(p.category&&p.subcategory){ if(!previewSubs[p.category]) previewSubs[p.category]=[]; if(!previewSubs[p.category].includes(p.subcategory!)) previewSubs[p.category].push(p.subcategory!); } });
                        return (
                          <div>
                            {/* Navbar bar */}
                            <div style={{background:nbBg,padding:"10px 16px",display:"flex",alignItems:"center",gap:"8px",borderBottom:"1px solid rgba(0,0,0,0.1)"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                                {nbLogoUrl && <img src={nbLogoUrl} alt={nbLogoText} style={{height:"20px",width:"20px",borderRadius:"4px",objectFit:"cover"}}/>}
                                <span style={{fontWeight:800,fontSize:"13px",color:nbFg}}>{nbLogoText}</span>
                              </div>
                              {!isHamb && navCfg.layout==="center" && navCfg.links.length>0 && (
                                <div style={{display:"flex",gap:"6px",flex:1,justifyContent:"center"}}>
                                  {navCfg.links.slice(0,6).map(l=>{
                                    const lsubs = l.type==="filter" ? (previewSubs[l.value]||[]) : [];
                                    return (
                                      <div key={l.id} style={{position:"relative"}}
                                        onMouseEnter={()=>lsubs.length>0&&setPreviewHoverLink(l.id)}
                                        onMouseLeave={()=>setPreviewHoverLink(null)}>
                                        <span style={{fontSize:"10px",fontWeight:600,color:nbLink,cursor:"pointer",padding:"2px 4px",borderRadius:"4px",background:previewHoverLink===l.id?"rgba(0,0,0,0.06)":"transparent"}}>{l.label}</span>
                                        {lsubs.length>0&&previewHoverLink===l.id&&(
                                          <div style={{position:"absolute",top:"100%",left:0,background:"white",border:"1px solid #e5e7eb",borderRadius:"8px",boxShadow:"0 4px 12px rgba(0,0,0,0.12)",minWidth:"120px",zIndex:99,overflow:"hidden"}}>
                                            {lsubs.map(s=><div key={s} style={{padding:"6px 12px",fontSize:"10px",color:"#374151",cursor:"pointer"}}>{s}</div>)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {!isHamb && navCfg.layout!=="center" && <div style={{flex:1}}/>}
                              {!isHamb && navCfg.layout!=="center" && navCfg.links.length>0 && (
                                <div style={{display:"flex",gap:"6px"}}>
                                  {navCfg.links.slice(0,6).map(l=>{
                                    const lsubs = l.type==="filter" ? (previewSubs[l.value]||[]) : [];
                                    return (
                                      <div key={l.id} style={{position:"relative"}}
                                        onMouseEnter={()=>lsubs.length>0&&setPreviewHoverLink(l.id)}
                                        onMouseLeave={()=>setPreviewHoverLink(null)}>
                                        <span style={{fontSize:"10px",fontWeight:600,color:nbLink,cursor:"pointer",padding:"2px 4px",borderRadius:"4px",background:previewHoverLink===l.id?"rgba(0,0,0,0.06)":"transparent"}}>{l.label}</span>
                                        {lsubs.length>0&&previewHoverLink===l.id&&(
                                          <div style={{position:"absolute",top:"100%",right:0,background:"white",border:"1px solid #e5e7eb",borderRadius:"8px",boxShadow:"0 4px 12px rgba(0,0,0,0.12)",minWidth:"120px",zIndex:99,overflow:"hidden"}}>
                                            {lsubs.map(s=><div key={s} style={{padding:"6px 12px",fontSize:"10px",color:"#374151",cursor:"pointer"}}>{s}</div>)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {isHamb && <div style={{flex:1}}/>}
                              {navCfg.showSearch && !isSearchBar && <span style={{fontSize:"11px",color:nbLink}}>🔍</span>}
                              {isSearchBar && (
                                <div style={{display:"flex",alignItems:"center",gap:"4px",border:`1px solid ${nbLink}33`,borderRadius:"8px",padding:"2px 8px",opacity:0.8}}>
                                  <span style={{fontSize:"9px",color:nbLink}}>🔍</span>
                                  <span style={{fontSize:"9px",color:nbLink,opacity:0.6}}>Buscar...</span>
                                </div>
                              )}
                              {isHamb && (
                                <span onClick={()=>setPreviewMenuOpen(v=>!v)} style={{fontSize:"16px",color:nbFg,cursor:"pointer",userSelect:"none",padding:"2px"}} title="Ver menú">☰</span>
                              )}
                            </div>
                            {/* Preview drawer */}
                            {previewMenuOpen && isHamb && (
                              <div style={{position:"absolute",inset:0,zIndex:50,display:"flex",justifyContent:"flex-end"}}>
                                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)"}} onClick={()=>setPreviewMenuOpen(false)}/>
                                <div style={{position:"relative",width:"75%",maxWidth:"240px",background:"white",display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.18)",overflowY:"auto"}}>
                                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #f3f4f6",padding:"12px 14px",flexShrink:0}}>
                                    <span style={{fontWeight:800,fontSize:"13px",color:"#111827"}}>{nbLogoText}</span>
                                    <span onClick={()=>setPreviewMenuOpen(false)} style={{cursor:"pointer",fontSize:"18px",color:"#6b7280",lineHeight:1,padding:"2px"}}>✕</span>
                                  </div>
                                  {navCfg.showSearch && (
                                    <div style={{margin:"8px 10px",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"5px 10px",display:"flex",alignItems:"center",gap:"5px",background:"#f9fafb",flexShrink:0}}>
                                      <span style={{fontSize:"11px",color:"#9ca3af"}}>🔍</span>
                                      <span style={{fontSize:"11px",color:"#9ca3af"}}>Buscar...</span>
                                    </div>
                                  )}
                                  <div style={{padding:"4px 6px"}}>
                                    {navCfg.links.map(l=>{
                                      const lsubs = l.type==="filter" ? (previewSubs[l.value]||[]) : [];
                                      const isExp = previewHoverLink===l.id;
                                      return (
                                        <div key={l.id}>
                                          <div onClick={()=>lsubs.length>0?setPreviewHoverLink(isExp?null:l.id):undefined}
                                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 10px",borderRadius:"8px",cursor:"pointer",fontWeight:600,fontSize:"12px",color:"#111827"}}>
                                            {l.label}
                                            {lsubs.length>0&&<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:"11px",height:"11px",opacity:0.4,transform:isExp?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>}
                                          </div>
                                          {lsubs.length>0&&isExp&&(
                                            <div style={{marginLeft:"6px",marginBottom:"2px",background:"#f9fafb",borderRadius:"6px"}}>
                                              {lsubs.map(s=><div key={s} style={{padding:"6px 12px",fontSize:"11px",color:"#6b7280"}}>{s}</div>)}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div style={{background:bgColor,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(0,0,0,0.1)"}}>
                          <div style={{fontWeight:800,fontSize:"14px",color:fgColor}}>{config.name||"Mi Tienda"}</div>
                        </div>
                      );
                    })()}

                    {/* Blocks */}
                    {blocks.length===0 ? (
                      <div style={{padding:"40px 24px",textAlign:"center",color:"#9ca3af"}}>
                        <div style={{fontSize:"32px",marginBottom:"12px"}}>📐</div>
                        <p style={{fontWeight:600,marginBottom:"6px"}}>Agregá bloques para ver la preview</p>
                        <p style={{fontSize:"12px"}}>Usá el botón &quot;Agregar bloque&quot; en el panel izquierdo</p>
                      </div>
                    ) : (
                      blocks.map((b,idx)=> {
                        if (b.type === "navbar") return null;
                        // hide blocks that are linked as sections in the navbar
                        const navbarBlock = blocks.find(bl => bl.type === "navbar");
                        const sectionBlockIds = new Set<string>();
                        try {
                          const cfg = JSON.parse(navbarBlock?.props?.navConfig || "{}");
                          const links = Array.isArray(cfg.links) ? cfg.links : [];
                          links.filter((l: {type:string}) => l.type === "section").forEach((l: {value:string}) => {
                            try {
                              const ids = JSON.parse(l.value || "[]");
                              if (Array.isArray(ids)) ids.forEach((id: string) => sectionBlockIds.add(id));
                              else sectionBlockIds.add(l.value);
                            } catch { if (l.value) sectionBlockIds.add(l.value); }
                          });
                        } catch {}
                        if (sectionBlockIds.has(b.id)) return null;
                        return (
                        <BlockPreview
                          key={b.id}
                          block={b}
                          config={config}
                          previewProducts={previewProducts}
                          viewport={preview}
                          selected={selectedBlockId===b.id}
                          onSelect={()=>setSelectedBlockId(selectedBlockId===b.id?null:b.id)}
                          onMoveUp={()=>moveBlock(b.id,-1)}
                          onMoveDown={()=>moveBlock(b.id,1)}
                          onDuplicate={()=>duplicateBlock(b.id)}
                          onDelete={()=>deleteBlock(b.id)}
                          onChangeProps={(props)=>updateBlock(b.id,props)}
                          isFirst={idx===0}
                          isLast={idx===blocks.length-1}
                          onProductClick={setPreviewModalProduct}
                        />
                        );
                      })
                    )}

                    {/* Add block zone */}
                    <div
                      onClick={()=>setShowBlockLibrary(true)}
                      style={{padding:"20px",textAlign:"center",cursor:"pointer",borderTop:"2px dashed #e5e7eb",color:"#9ca3af",transition:"all 0.2s"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="#f0f9ff",e.currentTarget.style.color="#6366f1")}
                      onMouseLeave={e=>(e.currentTarget.style.background="",e.currentTarget.style.color="#9ca3af")}
                    >
                      <span style={{fontSize:"18px",marginRight:"8px"}}>+</span>
                      <span style={{fontSize:"12px",fontWeight:600}}>Agregar bloque aquí</span>
                    </div>

                    {/* Mini footer */}
                    <div style={{background:"#f9fafb",borderTop:"1px solid #e5e7eb",padding:"12px 16px",textAlign:"center"}}>
                      <p style={{fontSize:"11px",color:"#9ca3af"}}>{config.footerText||`© 2025 ${config.name||"Mi Tienda"}`}</p>
                    </div>

                  </div>
                {config.showWhatsappButton && config.whatsappNumber && (
                  <a
                    href={`https://wa.me/${config.whatsappNumber.replace(/\D/g, "")}`}
                    className="sticky bottom-4 ml-auto mr-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
                    aria-label="WhatsApp flotante"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {"Hacé clic en un bloque de la preview para seleccionarlo y editarlo"}
          </p>
        </div>
      </div>
      </div>{/* end flex col h-full */}

      {/* Block library modal */}
      {showBlockLibrary&&<BlockLibraryModal onAdd={addBlock} onClose={()=>setShowBlockLibrary(false)}/>}

      {/* Product modal editor */}
      {previewModalProduct && (() => {
        const prod = previewModalProduct;
        const imgs = parsePreviewImages(prod.images || "");
        const img = imgs[0];
        const variants = prod.variants || [];
        const hasVariants = variants.length > 0 && !(variants.length === 1 && variants[0].value === "default");
        const reelList = parsePreviewImages(prod.reelUrls || "");

        async function saveProductReels(nextReels: string[]) {
          const detailRes = await fetch(`/api/productos/${prod.id}`);
          const detailData = await detailRes.json();
          if (!detailRes.ok || !detailData.product) {
            throw new Error(detailData.error || "No se pudo cargar el producto");
          }

          const current = detailData.product;
          const patchRes = await fetch(`/api/productos/${prod.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: current.name,
              description: current.description || "",
              price: String(current.price ?? ""),
              comparePrice: current.comparePrice != null ? String(current.comparePrice) : "",
              category: current.category || "general",
              subcategory: current.subcategory || "",
              tags: (() => { try { return JSON.parse(current.tags || "[]"); } catch { return []; } })(),
              images: (() => { try { return JSON.parse(current.images || "[]"); } catch { return []; } })(),
              reelUrls: nextReels,
              variants: (current.variants || []).map((variant: any) => ({
                name: variant.name || "Talle",
                value: variant.value || "",
                stock: String(variant.stock ?? 0),
                price: variant.price != null ? String(variant.price) : "",
                sku: variant.sku || "",
              })),
              attributes: (() => { try { return JSON.parse(current.attributes || "[]"); } catch { return []; } })(),
            }),
          });
          const patchData = await patchRes.json();
          if (!patchRes.ok) {
            throw new Error(patchData.error || "No se pudieron guardar los reels");
          }

          const serializedReels = JSON.stringify(nextReels);
          setPreviewProducts((prev) => prev.map((item) => item.id === prod.id ? { ...item, reelUrls: serializedReels } : item));
          setPreviewModalProduct((prev) => prev && prev.id === prod.id ? { ...prev, reelUrls: serializedReels } : prev);
        }

        async function uploadReelVideo(file: File) {
          if (reelList.length >= 3) {
            window.alert("Solo podes cargar hasta 3 reels por producto.");
            return;
          }

          setUploadingReel(true);
          try {
            const fd = new FormData();
            fd.append("file", file);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData.url) {
              throw new Error(uploadData.error || "No se pudo subir el video");
            }

            await saveProductReels([...reelList, uploadData.url].slice(0, 3));
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "No se pudo guardar el reel");
          } finally {
            setUploadingReel(false);
          }
        }

        async function removeReelAt(index: number) {
          setUploadingReel(true);
          try {
            await saveProductReels(reelList.filter((_, currentIndex) => currentIndex !== index));
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "No se pudo eliminar el reel");
          } finally {
            setUploadingReel(false);
          }
        }

        // Auto-generate size chart from product variants
        const sizeVariants = variants.filter(v =>
          v.name?.toLowerCase().includes("tall") ||
          v.name?.toLowerCase().includes("size") ||
          v.name?.toLowerCase().includes("talla")
        );
        const sizeChartVariants = sizeVariants.length > 0
          ? sizeVariants
          : variants.filter(v => v.value && v.value !== "default");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={()=>setPreviewModalProduct(null)}>
            <div className="flex w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-white" onClick={e=>e.stopPropagation()}>

              {/* Left: phone preview */}
              <div className="w-[340px] shrink-0 bg-gray-900 flex flex-col">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Vista previa</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"/><div className="w-2 h-2 rounded-full bg-yellow-500"/><div className="w-2 h-2 rounded-full bg-green-500"/>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-white" style={{fontFamily:config.fontFamily}}>
                  {/* Product image */}
                  {img ? (
                    <div style={{aspectRatio:"1",background:"#f3f4f6",overflow:"hidden"}}>
                      <img src={img} alt={prod.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ) : (
                    <div style={{aspectRatio:"1",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",color:"#d1d5db",fontSize:"13px"}}>Sin imagen</div>
                  )}
                  <div style={{padding:"16px 14px 24px"}}>
                    <h3 style={{fontSize:"15px",fontWeight:800,color:"#111827",marginBottom:"4px"}}>{prod.name}</h3>
                    {prod.description && config.productModalShowDescription!==false && <p style={{fontSize:"11px",color:"#6b7280",marginBottom:"10px",lineHeight:1.5}}>{prod.description}</p>}
                    <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"14px"}}>
                      <span style={{fontSize:"18px",fontWeight:800,color:config.productModalAccentColor||config.primaryColor}}>${Number(prod.price||0).toLocaleString("es-AR")}</span>
                      {prod.comparePrice && prod.comparePrice>(prod.price||0) && (
                        <span style={{fontSize:"12px",color:"#9ca3af",textDecoration:"line-through"}}>${Number(prod.comparePrice).toLocaleString("es-AR")}</span>
                      )}
                    </div>
                    {hasVariants && !config.productModalSizeChart && (
                      <div style={{marginBottom:"14px"}}>
                        <p style={{fontSize:"10px",fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px"}}>Variantes</p>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                          {variants.map((v,i)=>(
                            <span key={i} style={{padding:"3px 8px",borderRadius:"999px",border:"1px solid #e5e7eb",fontSize:"10px",fontWeight:600,color:"#374151",background:"#f9fafb"}}>{v.value&&v.value!=="default"?v.value:v.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Size chart preview — auto from variants */}
                    {config.productModalSizeChart && (
                      <div style={{marginBottom:"14px",padding:"10px",background:"#f8fafc",borderRadius:"10px",border:"1px solid #e2e8f0"}}>
                        <p style={{fontSize:"10px",fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"8px"}}>
                          📏 {config.productModalSizeChartTitle||"Tabla de talles"}
                        </p>
                        {sizeChartVariants.length > 0 ? (
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
                            <thead>
                              <tr style={{background:(config.productModalAccentColor||config.primaryColor)+"22"}}>
                                <th style={{padding:"4px 8px",textAlign:"left",fontWeight:700,color:"#374151"}}>Talle</th>
                                <th style={{padding:"4px 8px",textAlign:"center",fontWeight:700,color:"#374151"}}>Disponible</th>
                                <th style={{padding:"4px 8px",textAlign:"center",fontWeight:700,color:"#374151"}}>Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sizeChartVariants.map((v,i)=>(
                                <tr key={i} style={{background:i%2===0?"#fff":"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                                  <td style={{padding:"4px 8px",fontWeight:700,color:"#111827"}}>{v.value}</td>
                                  <td style={{padding:"4px 8px",textAlign:"center"}}>
                                    {v.stock>0
                                      ? <span style={{color:"#10b981",fontWeight:700}}>✓</span>
                                      : <span style={{color:"#ef4444"}}>✗</span>}
                                  </td>
                                  <td style={{padding:"4px 8px",textAlign:"center",color:"#6b7280",fontSize:"9px"}}>{v.stock>0?`${v.stock} u.`:"Sin stock"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{padding:"8px",color:"#94a3b8",fontSize:"10px",textAlign:"center"}}>
                            Agregá variantes al producto para ver la tabla
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reels preview */}
                    {config.productModalShowReels && reelList.length > 0 && (
                      <div style={{marginBottom:"14px"}}>
                        <p style={{fontSize:"10px",fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px"}}>🎬 Videos</p>
                        <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px"}}>
                          {reelList.map((url,i)=>(
                            <div key={i} style={{width:"70px",height:"120px",background:"#000",borderRadius:"8px",flexShrink:0,overflow:"hidden",position:"relative"}}>
                              <video src={url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>
                              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",pointerEvents:"none"}}>▶</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {config.productModalShowReels && reelList.length === 0 && (
                      <div style={{marginBottom:"14px",padding:"8px",background:"#fef9c3",borderRadius:"8px",fontSize:"10px",color:"#92400e"}}>
                        Subí videos en el panel →
                      </div>
                    )}

                    <button style={{width:"100%",padding:"11px",borderRadius:"8px",background:config.productModalAccentColor||config.primaryColor,color:"#fff",fontWeight:700,fontSize:"12px",border:"none",cursor:"pointer"}}>
                      {config.productModalButtonText||"Agregar al carrito"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Editar modal de producto</p>
                    <p className="text-xs text-gray-400 truncate max-w-[240px]">{prod.name}</p>
                  </div>
                  <button onClick={()=>setPreviewModalProduct(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="h-4 w-4 text-gray-500"/>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <p className="text-xs text-gray-400 px-1">Los estilos aplican a toda la tienda. Los reels se guardan en este producto.</p>

                  {/* Size chart section */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-50 rounded-lg"><span className="text-sm">📏</span></div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Tabla de talles</p>
                          <p className="text-xs text-gray-400">Mostrá una guía de medidas en el modal</p>
                        </div>
                      </div>
                      <button onClick={()=>set("productModalSizeChart",!config.productModalSizeChart)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.productModalSizeChart?"bg-indigo-600":"bg-gray-300"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${config.productModalSizeChart?"translate-x-4":"translate-x-0.5"}`}/>
                      </button>
                    </div>
                    {config.productModalSizeChart && (
                      <div className="px-4 pb-4 border-t border-gray-50 space-y-3 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Título de la sección</label>
                          <input type="text" value={config.productModalSizeChartTitle||"Tabla de talles"}
                            onChange={e=>set("productModalSizeChartTitle",e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                          <span className="text-sm mt-0.5">ℹ️</span>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            La tabla se genera automáticamente con los talles que cargaste en cada producto (variantes). Si un talle tiene stock aparece con ✓, si no tiene aparece con ✗.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reels section */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-pink-50 rounded-lg"><span className="text-sm">🎬</span></div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Carrusel de videos</p>
                          <p className="text-xs text-gray-400">Subí videos del producto desde tu dispositivo</p>
                        </div>
                      </div>
                      <button onClick={()=>set("productModalShowReels",!config.productModalShowReels)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.productModalShowReels?"bg-indigo-600":"bg-gray-300"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${config.productModalShowReels?"translate-x-4":"translate-x-0.5"}`}/>
                      </button>
                    </div>
                    {config.productModalShowReels && (
                      <div className="px-4 pb-4 border-t border-gray-50 space-y-2 pt-3">
                        <input ref={reelVideoRef} type="file" accept="video/*" className="hidden"
                          onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadReelVideo(f); e.target.value=""; }}/>
                        {reelList.map((_url,i)=>(
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 text-xs text-white font-bold">▶</div>
                            <span className="flex-1 text-xs text-gray-500 truncate">Video {i+1}</span>
                            <button onClick={()=>removeReelAt(i)}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                              <Trash2 className="h-3 w-3"/>
                            </button>
                          </div>
                        ))}
                        <button onClick={()=>reelVideoRef.current?.click()} disabled={uploadingReel}
                          className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-xs font-medium text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors disabled:opacity-50">
                          {uploadingReel ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Plus className="h-3.5 w-3.5"/>}
                          {uploadingReel ? "Subiendo..." : "Subir video"}
                        </button>
                        <p className="text-xs text-gray-400 text-center">MP4, WebM · máx. 50 MB</p>
                      </div>
                    )}
                  </div>

                  {/* Botón y estilo */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3.5 flex items-center gap-2.5">
                      <div className="p-1.5 bg-violet-50 rounded-lg"><span className="text-sm">🎨</span></div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Texto y colores</p>
                        <p className="text-xs text-gray-400">Personalizá el botón y el acento del modal</p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 border-t border-gray-50 space-y-3 pt-3">
                      {/* Texto del botón */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto del botón</label>
                        <input type="text" value={config.productModalButtonText||"Agregar al carrito"}
                          onChange={e=>set("productModalButtonText",e.target.value)}
                          placeholder="Agregar al carrito"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                      </div>
                      {/* Color de acento */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Color de acento <span className="text-gray-400 font-normal">(precio, tabla)</span></label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={config.productModalAccentColor||config.primaryColor}
                            onChange={e=>set("productModalAccentColor",e.target.value)}
                            className="h-8 w-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                          <input type="text" value={config.productModalAccentColor||""}
                            onChange={e=>set("productModalAccentColor",e.target.value)}
                            placeholder={config.primaryColor+" (color principal)"}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          {config.productModalAccentColor && (
                            <button onClick={()=>set("productModalAccentColor","")}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap">Limpiar</button>
                          )}
                        </div>
                      </div>
                      {/* Mostrar descripción */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-700">Mostrar descripción</p>
                          <p className="text-xs text-gray-400">Texto descriptivo del producto</p>
                        </div>
                        <button onClick={()=>set("productModalShowDescription",!config.productModalShowDescription)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.productModalShowDescription!==false?"bg-indigo-600":"bg-gray-300"}`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${config.productModalShowDescription!==false?"translate-x-4":"translate-x-0.5"}`}/>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button onClick={()=>{ setPreviewModalProduct(null); handleSave(); }}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-200">
                      <Save className="h-4 w-4"/> Guardar cambios
                    </button>

                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      <UnsavedChangesGuard isDirty={isDirty} />
    </DashboardLayout>
  );
}
