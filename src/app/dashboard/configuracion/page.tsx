"use client";

import { useEffect, useState, useRef } from "react";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import DashboardLayout from "@/components/DashboardLayout";
import StorePreview, { StoreConfig } from "@/components/StorePreview";
import {
  Loader2, Save, Users, Palette, Layout, Type,
  Image as ImageIcon, Monitor, Smartphone, Tablet, LayoutGrid,
  List, Grid2X2, ChevronDown, ChevronUp, Megaphone, Share2,
  MousePointer2, CreditCard, Search, ExternalLink,
  Plus, Trash2, Layers, X, Copy,
} from "lucide-react";

/* ─── Templates ─── */
const TEMPLATES = [
  { id:"default",  name:"Minimal",   emoji:"⬜", desc:"Hero centrado y grilla limpia" },
  { id:"fashion",  name:"Editorial", emoji:"👗", desc:"Texto lateral + portada grande" },
  { id:"boutique", name:"Boutique",  emoji:"🛍️", desc:"Mosaico con fotos chicas" },
  { id:"colorful", name:"Color Pop", emoji:"🎨", desc:"Bloques de color y categorias" },
  { id:"luxury",   name:"Luxury",    emoji:"✨", desc:"Portada premium dividida" },
  { id:"vintage",  name:"Vintage",   emoji:"🌸", desc:"Banner clasico y marco retro" },
  { id:"sport",    name:"Sport",     emoji:"⚡", desc:"Hero diagonal y cards fuertes" },
  { id:"tech",     name:"Tech",      emoji:"🖥️", desc:"Dark con neon y grilla compacta" },
  { id:"kids",     name:"Kids",      emoji:"🎀", desc:"Redondeado, ludico y suave" },
  { id:"market",   name:"Market",    emoji:"🏪", desc:"Buscador + menu lateral" },
];

const FUENTES = ["Inter","Poppins","Playfair Display","Roboto","Montserrat","Lato","Raleway","Oswald","Nunito","DM Sans"];
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

type DesignSection = "template"|"colores"|"textos"|"imagenes"|"layout"|"tarjetas"|"anuncio"|"redes"|"footer"|"vendedoras"|"seo";

/* ─── Block types ─── */
export type BlockType = "hero"|"text"|"products"|"banner"|"cta"|"image-text"|"socials"|"spacer"|"divider";
export interface Block { id:string; type:BlockType; props:Record<string,any> }
type PreviewProduct = {
  id: string;
  name: string;
  price?: number | null;
  images?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

const BLOCK_LIBRARY: { type:BlockType; emoji:string; label:string; desc:string; defaultProps:Record<string,any> }[] = [
  { type:"hero",       emoji:"🖼️", label:"Hero / Portada",       desc:"Título grande, subtítulo y botón de acción",
    defaultProps:{ title:"¡Bienvenidos a mi tienda!", subtitle:"Encontrá todo lo que buscás", buttonText:"Ver productos", bgColor:"", textColor:"#ffffff", layout:"center", height:"lg" } },
  { type:"text",       emoji:"📝", label:"Bloque de texto",        desc:"Título y párrafo de texto libre",
    defaultProps:{ heading:"Sobre nosotros", body:"Somos una tienda con años de experiencia...", align:"center", fontSize:"md", color:"", textColor:"", bgColor:"" } },
  { type:"products",   emoji:"🛍️", label:"Grilla de productos",    desc:"Muestra tu catálogo con columnas configurables",
    defaultProps:{ heading:"Nuestros productos", columns:3, showHeading:true, categoryFilter:"all", subcategoryFilter:"all", showCategoryTabs:true, color:"", bgColor:"" } },
  { type:"banner",     emoji:"📢", label:"Banda de anuncio",       desc:"Franja de color con texto destacado",
    defaultProps:{ text:"🔥 ¡Oferta especial! Envío gratis hoy", bgColor:"#f59e0b", textColor:"#000000", size:"md" } },
  { type:"cta",        emoji:"🚀", label:"Llamada a la acción",    desc:"Sección oscura con botón grande destacado",
    defaultProps:{ heading:"¿Lista para comprar?", sub:"Envíos a todo el país", buttonText:"Ver catálogo", bgColor:"#0f172a", textColor:"#ffffff" } },
  { type:"image-text", emoji:"🖼️", label:"Imagen + Texto",         desc:"Foto al lado de texto descriptivo (split)",
    defaultProps:{ heading:"¿Por qué elegirnos?", body:"Calidad y atención garantizada en cada compra.", image:"", imagePosition:"left", imageFit:"cover", imageFocus:"center", color:"", textColor:"", bgColor:"", imageBgColor:"" } },
  { type:"spacer",     emoji:"⬜", label:"Espacio en blanco",      desc:"Separador de altura personalizable",
    defaultProps:{ height:"md" } },
  { type:"socials",    emoji:"link", label:"Redes / Contacto",       desc:"Iconos, botones o tarjeta con tus canales",
    defaultProps:{ heading:"Seguinos y contactanos", showHeading:true, layout:"icons", color:"", bgColor:"", showInstagram:true, showFacebook:true, showTiktok:true, showWhatsapp:true, showEmail:true, instagramUrl:"", facebookUrl:"", tiktokUrl:"", whatsappNumber:"", emailAddress:"" } },
  { type:"divider",    emoji:"─", label:"Línea separadora",        desc:"Línea horizontal decorativa",
    defaultProps:{ style:"solid", color:"#e5e7eb" } },
];

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
};

const CONFIG_TAB_KEY = "mitienda_config_editor_tab";

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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

      <Accordion label="Afiliados" icon={Users} id="vendedoras" open={open.includes("vendedoras")} toggle={toggle}>
        <Toggle label="Activar sistema de afiliados" sub="Otros pueden vender en tu tienda" value={Boolean(config.affiliatesEnabled)} onChange={v=>set("affiliatesEnabled",v)}/>
        {config.affiliatesEnabled&&(
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Comision por venta</label>
              <span className="text-sm font-bold text-indigo-600">{config.commissionRate||10}%</span>
            </div>
            <input type="range" min="1" max="50" value={config.commissionRate||10} onChange={e=>set("commissionRate",e.target.value)} className="w-full accent-indigo-600"/>
            <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>
              Venta $10.000 → afiliado gana ${(10000*parseFloat(String(config.commissionRate||"0"))/100).toLocaleString("es-AR")}
            </p>
          </div>
        )}
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
}: {
  block:Block;
  onChange:(props:Record<string,any>)=>void;
  config?:StoreConfig;
  categories?:string[];
  subcategoriesByCategory?:Record<string,string[]>;
  uploadingImage?: boolean;
  onPickImage?: () => void;
}) {
  const p = block.props;
  const upd = (k:string,v:any) => onChange({...p,[k]:v});
  const availableSubcategories = p.categoryFilter && p.categoryFilter !== "all"
    ? subcategoriesByCategory[p.categoryFilter] || []
    : Array.from(new Set(Object.values(subcategoriesByCategory).flat()));

  const inp = (label:string, key:string, ph?:string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input value={p[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={ph}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
    </div>
  );
  const ta = (label:string, key:string, ph?:string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea value={p[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={ph} rows={3} style={{resize:"none"}}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
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
  </div>;

  if (block.type==="products") return <div className="space-y-3">
    <ColorPicker label="Color del bloque (vacío = color principal)" value={p.color||""} onChange={v=>upd("color",v)}/>
    <ColorPicker label="Color de fondo (vacío = fondo normal)" value={p.bgColor||""} onChange={v=>upd("bgColor",v)}/>
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
      <label className="block text-xs font-medium text-gray-600 mb-1">Columnas (tamaño de las cards)</label>
      <div className="grid grid-cols-4 gap-1.5">
        {[2,3,4,5].map(n=>(
          <button key={n} onClick={()=>upd("columns",n)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${p.columns===n?"border-indigo-500 bg-indigo-50":"border-gray-200 hover:border-gray-300"}`}>
            <span className={`text-xs font-bold ${p.columns===n?"text-indigo-700":"text-gray-600"}`}>{n}</span>
            <div className={`flex gap-0.5`}>{Array.from({length:Math.min(n,4)}).map((_,i)=><div key={i} className={`h-3 rounded-sm ${p.columns===n?"bg-indigo-400":"bg-gray-300"}`} style={{width:`${16/n*1.5}px`}}/>)}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Más columnas = tarjetas más pequeñas</p>
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
  </div>;

  if (block.type==="cta") return <div className="space-y-3">
    {inp("Título","heading","¿Lista para comprar?")}
    {inp("Subtítulo","sub","Envíos a todo el país")}
    {inp("Texto del botón","buttonText","Ver catálogo")}
    <ColorPicker label="Color de fondo" value={p.bgColor||"#0f172a"} onChange={v=>upd("bgColor",v)}/>
    <ColorPicker label="Color de texto" value={p.textColor||"#ffffff"} onChange={v=>upd("textColor",v)}/>
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
      <label className="block text-xs font-medium text-gray-600 mb-1">Posición de la foto</label>
      <Chips options={[{id:"center",label:"Centro"},{id:"top",label:"Arriba"},{id:"bottom",label:"Abajo"}]} value={p.imageFocus||"center"} onChange={v=>upd("imageFocus",v)}/>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Posición de la imagen</label>
      <div className="flex gap-2">
        {[["left","Izquierda"],["right","Derecha"]].map(([v,l])=>(
          <button key={v} onClick={()=>upd("imagePosition",v)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${p.imagePosition===v?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>{l}</button>
        ))}
      </div>
    </div>
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
      {([
        {show:"showInstagram",url:"instagramUrl",   label:"Instagram", ph:"@mitienda o URL completa"},
        {show:"showFacebook", url:"facebookUrl",    label:"Facebook",  ph:"facebook.com/mitienda"},
        {show:"showTiktok",   url:"tiktokUrl",      label:"TikTok",    ph:"@mitienda"},
        {show:"showWhatsapp", url:"whatsappNumber", label:"WhatsApp",  ph:"5491112345678"},
        {show:"showEmail",    url:"emailAddress",   label:"Email",     ph:"tu@email.com"},
      ] as const).map(({show,url,label,ph})=>(
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
  </div>;

  if (block.type==="spacer") return <div className="space-y-2">
    <label className="block text-xs font-medium text-gray-600">Altura del espacio</label>
    <Chips options={[{id:"xs",label:"8px"},{id:"sm",label:"24px"},{id:"md",label:"48px"},{id:"lg",label:"80px"},{id:"xl",label:"120px"}]} value={p.height||"md"} onChange={v=>upd("height",v)}/>
  </div>;

  if (block.type==="divider") return <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Estilo</label>
      <Chips options={[{id:"solid",label:"Sólida"},{id:"dashed",label:"Guiones"},{id:"dotted",label:"Puntos"}]} value={p.style||"solid"} onChange={v=>upd("style",v)}/>
    </div>
    <ColorPicker label="Color" value={p.color||"#e5e7eb"} onChange={v=>upd("color",v)}/>
  </div>;

  return null;
}

/* ─── Block renderer for preview ─── */
function BlockPreview({ block, config, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, isFirst, isLast, previewProducts = [] }: {
  block:Block; config:StoreConfig; selected:boolean;
  onSelect:()=>void; onMoveUp:()=>void; onMoveDown:()=>void; onDuplicate:()=>void; onDelete:()=>void;
  isFirst:boolean; isLast:boolean;
  previewProducts?: PreviewProduct[];
}) {
  const p = block.props;
  const c = config;

  const SPACER_H: Record<string,string> = { xs:"8px",sm:"24px",md:"48px",lg:"80px",xl:"120px" };
  const FONT_SIZE: Record<string,string> = { sm:"16px",md:"20px",lg:"28px",xl:"36px" };
  const HERO_H: Record<string,string> = { sm:"80px",md:"120px",lg:"180px",xl:"240px" };
  const ALIGN_MAP: Record<string,string> = { left:"flex-start",center:"center",right:"flex-end" };
  const socialItems = [
    { key:"showInstagram", label:"Instagram", color:"#E1306C", gradient:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
    { key:"showFacebook",  label:"Facebook",  color:"#1877F2", gradient:null },
    { key:"showTiktok",    label:"TikTok",    color:"#010101", gradient:null },
    { key:"showWhatsapp",  label:"WhatsApp",  color:"#25D366", gradient:null },
    { key:"showEmail",     label:"Email",     color:"#6366f1", gradient:null },
  ].filter(item => p[item.key] !== false);

  const socialIconSvg: Record<string, string> = {
    Instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    Facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    TikTok: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z",
    WhatsApp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
    Email: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  };

  function renderContent() {
    if (block.type==="hero") {
      const hh = HERO_H[p.height||"lg"]||"180px";
      return (
        <div style={{ background:p.bgColor||c.primaryColor, color:p.textColor||"#fff", fontFamily:c.fontFamily, minHeight:hh, display:"flex", flexDirection:"column", alignItems:(ALIGN_MAP[p.layout||"center"]||"center") as any, justifyContent:"center", padding:"24px 32px", textAlign:(p.layout||"center") as any }}>
          <h2 style={{fontSize:"22px",fontWeight:900,marginBottom:"8px",lineHeight:1.2}}>{p.title||"¡Bienvenidos!"}</h2>
          {p.subtitle&&<p style={{fontSize:"13px",opacity:0.85,marginBottom:"16px"}}>{p.subtitle}</p>}
          {p.buttonText&&<button style={{background:"rgba(255,255,255,0.2)",border:"2px solid rgba(255,255,255,0.6)",color:"inherit",padding:"8px 20px",borderRadius:"10px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>{p.buttonText}</button>}
        </div>
      );
    }
    if (block.type==="text") {
      const blockColor = p.color || c.primaryColor;
      const textColor = p.textColor || "#6b7280";
      const blockBg = p.bgColor || "transparent";
      return (
        <div style={{padding:"32px 24px",textAlign:(p.align||"center") as any,fontFamily:c.fontFamily,background:blockBg}}>
          {p.heading&&<h3 style={{fontSize:FONT_SIZE[p.fontSize||"md"]||"20px",fontWeight:800,color:blockColor,marginBottom:"10px"}}>{p.heading}</h3>}
          {p.body&&<p style={{fontSize:"13px",color:textColor,lineHeight:1.7}}>{p.body}</p>}
        </div>
      );
    }
    if (block.type==="products") {
      const cols = p.columns||3;
      const blockColor = p.color || c.primaryColor;
      const blockBg = p.bgColor || "transparent";
      const categoryFilter = String(p.categoryFilter || "all");
      const subcategoryFilter = String(p.subcategoryFilter || "all");
      const categories = Array.from(new Set(previewProducts.map((product) => product.category).filter(Boolean))) as string[];
      const subcategories = Array.from(new Set(previewProducts.filter((product) => categoryFilter === "all" || product.category === categoryFilter).map((product) => product.subcategory).filter(Boolean))) as string[];
      const visibleProducts = previewProducts
        .filter((product) => {
          if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
          if (subcategoryFilter !== "all" && product.subcategory !== subcategoryFilter) return false;
          return true;
        })
        .slice(0, Math.max(cols * 2, 4));
      return (
        <div style={{padding:"24px 16px",fontFamily:c.fontFamily,background:blockBg}}>
          {p.showHeading!==false&&p.heading&&<h3 style={{fontSize:"16px",fontWeight:800,color:blockColor,marginBottom:"14px",textAlign:"center"}}>{p.heading}</h3>}
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
              No hay productos para esa categoria o subcategoria.
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:"10px"}}>
              {visibleProducts.map((product)=> {
                const image = parsePreviewImages(product.images || "")[0];
                return (
                  <div key={product.id} style={{borderRadius:"12px",overflow:"hidden",background:"#fff",border:"1px solid #e5e7eb"}}>
                    <div style={{aspectRatio:"1",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      {image ? (
                        <img src={image} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      ) : (
                        <span style={{fontSize:"20px",opacity:0.4}}>📦</span>
                      )}
                    </div>
                    <div style={{padding:"8px"}}>
                      <p style={{fontSize:"11px",fontWeight:800,color:"#111827",marginBottom:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {product.name}
                      </p>
                      <p style={{fontSize:"10px",color:"#6b7280",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {product.subcategory ? formatCategoryLabel(product.subcategory) : product.category ? formatCategoryLabel(product.category) : "Producto"}
                      </p>
                      <div style={{height:"10px",background:blockColor+"40",borderRadius:"4px",width:"60%",marginTop:"7px"}}/>
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
      const PAD_MAP: Record<string,string> = {sm:"6px",md:"12px",lg:"20px"};
      const padH = PAD_MAP[p.size||"md"]||"12px";
      return (
        <div style={{background:p.bgColor||"#f59e0b",color:p.textColor||"#000",padding:`${padH} 24px`,textAlign:"center",fontFamily:c.fontFamily,fontSize:"13px",fontWeight:700}}>
          {p.text||"📢 Anuncio"}
        </div>
      );
    }
    if (block.type==="cta") {
      return (
        <div style={{background:p.bgColor||"#0f172a",color:p.textColor||"#fff",padding:"40px 24px",textAlign:"center",fontFamily:c.fontFamily}}>
          <h3 style={{fontSize:"20px",fontWeight:900,marginBottom:"8px"}}>{p.heading||"¿Lista para comprar?"}</h3>
          {p.sub&&<p style={{fontSize:"12px",opacity:0.7,marginBottom:"18px"}}>{p.sub}</p>}
          <button style={{background:c.primaryColor,color:"#fff",padding:"10px 28px",borderRadius:"10px",fontSize:"13px",fontWeight:700,border:"none",cursor:"pointer"}}>{p.buttonText||"Ver catálogo"}</button>
        </div>
      );
    }
    if (block.type==="image-text") {
      const isRight = p.imagePosition==="right";
      const blockColor = p.color || c.primaryColor;
      const textColor = p.textColor || "#6b7280";
      const blockBg = p.bgColor || "transparent";
      const imageBg = p.imageBgColor || "#f3f4f6";
      const imageFit = p.imageFit || "cover";
      const imageFocus = p.imageFocus || "center";
      return (
        <div style={{display:"flex",flexDirection:isRight?"row-reverse":"row",padding:"24px",gap:"20px",fontFamily:c.fontFamily,background:blockBg}}>
          <div style={{flex:1,background:imageBg,borderRadius:"12px",minHeight:"120px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            {p.image?<img src={p.image} alt="" style={{width:"100%",height:"100%",objectFit:imageFit,objectPosition:imageFocus}}/>:<span style={{opacity:0.3,fontSize:"24px"}}>🖼️</span>}
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            {p.heading&&<h3 style={{fontSize:"16px",fontWeight:800,color:blockColor,marginBottom:"8px"}}>{p.heading}</h3>}
            {p.body&&<p style={{fontSize:"12px",color:textColor,lineHeight:1.7}}>{p.body}</p>}
          </div>
        </div>
      );
    }
    if (block.type==="socials") {
      const layout = p.layout || "icons";
      const blockColor = p.color || c.primaryColor;
      const blockBg = p.bgColor || "#ffffff";
      const demoItems = [
        { key:"d1", label:"Instagram", color:"#E1306C", gradient:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
        { key:"d2", label:"WhatsApp",  color:"#25D366", gradient:null },
      ];
      const items = socialItems.length ? socialItems : demoItems;
      const iconCircle = (item: typeof items[0]) => (
        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"26px",height:"26px",borderRadius:"999px",background:item.gradient||(layout==="buttons"?"rgba(255,255,255,.2)":item.color),flexShrink:0}}>
          <svg viewBox="0 0 24 24" fill="white" width="13" height="13"><path d={socialIconSvg[item.label]||socialIconSvg.Email}/></svg>
        </span>
      );
      if (layout === "card") {
        return (
          <div style={{padding:"28px 24px",fontFamily:c.fontFamily,background:blockBg}}>
            <div style={{maxWidth:"520px",margin:"0 auto",border:`1px solid ${blockColor}22`,borderRadius:"18px",padding:"22px",textAlign:"center",background:blockBg}}>
              {p.showHeading!==false&&<h3 style={{fontSize:"18px",fontWeight:900,color:blockColor,marginBottom:"14px"}}>{p.heading||"Seguinos y contactanos"}</h3>}
              <div style={{display:"grid",gap:"8px"}}>
                {items.map(item=>(
                  <div key={item.label} style={{display:"flex",alignItems:"center",gap:"10px",border:`1px solid ${blockColor}33`,borderRadius:"12px",padding:"10px 14px",fontSize:"12px",fontWeight:800,color:blockColor}}>
                    {iconCircle(item)}{item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div style={{padding:"30px 24px",fontFamily:c.fontFamily,textAlign:"center",background:blockBg}}>
          {p.showHeading!==false&&<h3 style={{fontSize:"18px",fontWeight:900,color:blockColor,marginBottom:"16px"}}>{p.heading||"Seguinos y contactanos"}</h3>}
          <div style={{display:"flex",justifyContent:"center",gap:"10px",flexWrap:"wrap"}}>
            {items.map(item=>(
              <div key={item.label} style={{display:"inline-flex",alignItems:"center",gap:"8px",border:layout==="buttons"?"none":`1px solid ${blockColor}44`,background:layout==="buttons"?blockColor:"#fff",color:layout==="buttons"?"#fff":blockColor,borderRadius:layout==="buttons"?"999px":"14px",padding:layout==="buttons"?"9px 16px":"9px",fontSize:"12px",fontWeight:900}}>
                {iconCircle(item)}
                {layout==="buttons"&&item.label}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (block.type==="spacer") return <div style={{height:SPACER_H[p.height as keyof typeof SPACER_H||"md"]||"48px",background:"repeating-linear-gradient(45deg,#f9fafb,#f9fafb 10px,#f3f4f6 10px,#f3f4f6 20px)"}}/>;
    if (block.type==="divider") return (
      <div style={{padding:"8px 24px"}}>
        <hr style={{border:"none",borderTop:`2px ${p.style||"solid"} ${p.color||"#e5e7eb"}`}}/>
      </div>
    );
    return null;
  }

  return (
    <div
      data-block-id={block.id}
      className={`relative group cursor-pointer transition-all ${selected?"ring-2 ring-indigo-500 ring-offset-1":"hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1"}`}
      onClick={onSelect}
      style={{borderRadius:"4px"}}
    >
      {renderContent()}

      {/* Floating controls */}
      <div className={`absolute top-1 right-1 z-10 flex gap-1 transition-opacity ${selected?"opacity-100":"opacity-0 group-hover:opacity-100"}`}>
        <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={isFirst} title="Subir"
          className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-indigo-50 disabled:opacity-30 transition-colors">
          <ChevronUp className="h-3 w-3 text-gray-600"/>
        </button>
        <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={isLast} title="Bajar"
          className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-indigo-50 disabled:opacity-30 transition-colors">
          <ChevronDown className="h-3 w-3 text-gray-600"/>
        </button>
        <button onClick={e=>{e.stopPropagation();onDuplicate();}} title="Duplicar"
          className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors">
          <Copy className="h-3 w-3 text-gray-600"/>
        </button>
        <button onClick={e=>{e.stopPropagation();onDelete();}} title="Eliminar"
          className="w-6 h-6 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-100 transition-colors">
          <Trash2 className="h-3 w-3 text-red-500"/>
        </button>
      </div>

      {/* Type label */}
      {selected&&(
        <div className="absolute top-1 left-1 z-10 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-lg font-semibold">
          {BLOCK_LIBRARY.find(b=>b.type===block.type)?.emoji} {BLOCK_LIBRARY.find(b=>b.type===block.type)?.label}
        </div>
      )}
    </div>
  );
}

/* ─── Block Library Modal ─── */
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
  const [config, setConfig]       = useState<StoreConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty]     = useState(false);
  const loadedRef                 = useRef(false);
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<Record<string,string[]>>({});
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);

  // Blocks state
  const [activeTab, setActiveTab]         = useState<"diseño"|"bloques">("diseño");
  const [blocks, setBlocks]               = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string|null>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const previewScrollRef = useRef<HTMLDivElement>(null);

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
        }));
        try {
          const parsedBlocks = JSON.parse(store.pageBlocks||"[]");
          const loadedBlocks = Array.isArray(parsedBlocks) ? parsedBlocks : [];
          const savedTab = window.localStorage.getItem(CONFIG_TAB_KEY);

          setBlocks(loadedBlocks);

          if (loadedBlocks.length > 0 && !isStarterConfigBlocks(loadedBlocks)) {
            setActiveTab("bloques");
          } else if (savedTab === "bloques" && loadedBlocks.length > 0) {
            setActiveTab("bloques");
          }
        } catch {}
      }
      setLoading(false);
      loadedRef.current = true;
    });
  },[]);

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
      if (current) updateBlock(selectedBlockId, { ...current.props, image: url });
    }
    setUploadingBlockImage(false);
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/configuracion",{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...config, pageBlocks:JSON.stringify(blocks)})
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSaved(true);
      setIsDirty(false);
      setTimeout(()=>setSaved(false),3000);
    } catch {
      alert("Hubo un error al guardar. Intentá de nuevo.");
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
    if (activeTab !== "bloques" || !selectedBlockId) return;
    const viewport = previewScrollRef.current;
    if (!viewport) return;
    const target = viewport.querySelector<HTMLElement>(`[data-block-id="${selectedBlockId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTab, selectedBlockId]);

  if(loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-indigo-600"/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"logo")}/>
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"banner")}/>
      <input ref={blockImageRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&uploadBlockImage(e.target.files[0])}/>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      <div className="flex gap-5 items-start">
        {/* ── EDITOR PANEL ── */}
        <div className="w-72 shrink-0 space-y-2 max-h-[calc(100vh-130px)] overflow-y-auto pr-1 pb-4">

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-2">
            {([["diseño","🎨 Diseño"],["bloques","📐 Contenido"]] as const).map(([t,l])=>(
              <button key={t} onClick={()=>{
                setActiveTab(t);
                window.localStorage.setItem(CONFIG_TAB_KEY, t);
              }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab===t?"bg-white shadow text-indigo-700":"text-gray-500 hover:text-gray-700"}`}>
                {l}
              </button>
            ))}
          </div>

          {activeTab==="diseño" ? (
            <>
              {hasCustomBlocks && (
                <button
                  type="button"
                  onClick={()=>{
                    setActiveTab("bloques");
                    window.localStorage.setItem(CONFIG_TAB_KEY, "bloques");
                  }}
                  className="w-full rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-left text-xs text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  <span className="font-bold">Tenes contenido personalizado guardado.</span>
                  <span className="mt-1 block text-indigo-500">Toca aca para editar el diseño armado por bloques.</span>
                </button>
              )}

              <Accordion label="Template" icon={Layout} id="template" open={open.includes("template")} toggle={toggle}>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t=>(
                    <button key={t.id} onClick={()=>set("templateId",t.id)}
                      className={`relative rounded-xl border-2 p-3 text-left transition-all ${config.templateId===t.id?"border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100":"border-gray-200 hover:border-gray-300"}`}>
                      <div className="text-2xl mb-1">{t.emoji}</div>
                      <p className={`font-semibold text-xs ${config.templateId===t.id?"text-indigo-700":"text-gray-900"}`}>{t.name}</p>
                      <p className="text-gray-400 leading-tight" style={{fontSize:"10px"}}>{t.desc}</p>
                      {config.templateId===t.id&&(
                        <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-0.5">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Accordion>

              <Accordion label="Colores y fuente" icon={Palette} id="colores" open={open.includes("colores")} toggle={toggle}>
                <ColorPicker label="Color principal" value={config.primaryColor} onChange={v=>set("primaryColor",v)}/>
                <ColorPicker label="Color secundario (fondo)" value={config.secondaryColor} onChange={v=>set("secondaryColor",v)}/>
                <ColorPicker label="Color de acento (badges)" value={config.accentColor} onChange={v=>set("accentColor",v)}/>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipografía</label>
                  <select value={config.fontFamily} onChange={e=>set("fontFamily",e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {FUENTES.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Fondo</label>
                  <Chips options={BG_STYLES} value={config.backgroundStyle} onChange={v=>set("backgroundStyle",v)}/>
                </div>
              </Accordion>

              <Accordion label="Textos" icon={Type} id="textos" open={open.includes("textos")} toggle={toggle}>
                {([{label:"Nombre de la tienda",field:"name" as const,ph:"Mi Tienda"},{label:"Eslogan / Tagline",field:"tagline" as const,ph:"¡Moda que te expresa!"}] as const).map(({label,field,ph})=>(
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                    <input type="text" value={config[field]||""} onChange={e=>set(field,e.target.value)} placeholder={ph}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción</label>
                  <textarea value={config.description} onChange={e=>set("description",e.target.value)} rows={3}
                    placeholder="Contá de qué se trata tu tienda..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Banner principal</label>
                  <Chips options={HERO_STYLES} value={config.heroStyle} onChange={v=>set("heroStyle",v)}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Navbar</label>
                  <Chips options={NAVBAR_STYLES} value={config.navbarStyle} onChange={v=>set("navbarStyle",v)}/>
                </div>
              </Accordion>

              <Accordion label="Imágenes" icon={ImageIcon} id="imagenes" open={open.includes("imagenes")} toggle={toggle}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                      {config.logo?<img src={config.logo} className="w-full h-full object-cover" alt=""/>:<ImageIcon className="h-4 w-4 text-gray-300"/>}
                    </div>
                    <div className="flex-1 space-y-1">
                      <button onClick={()=>logoRef.current?.click()} disabled={uploadingLogo}
                        className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                        {uploadingLogo?<Loader2 className="h-3 w-3 animate-spin"/>:null}{uploadingLogo?"Subiendo...":"Subir logo"}
                      </button>
                      {config.logo&&<button onClick={()=>set("logo","")} className="w-full py-1 text-xs text-red-400 hover:text-red-600 transition-colors">Quitar</button>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Banner / Fondo del hero</label>
                  {config.banner?(
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={config.banner} className="w-full h-20 object-cover" alt=""/>
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2">
                        <button onClick={()=>bannerRef.current?.click()} className="bg-white text-gray-700 text-xs px-2 py-1 rounded-lg font-medium">Cambiar</button>
                        <button onClick={()=>set("banner","")} className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-medium">Quitar</button>
                      </div>
                    </div>
                  ):(
                    <button onClick={()=>bannerRef.current?.click()} disabled={uploadingBanner}
                      className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                      {uploadingBanner?<Loader2 className="h-4 w-4 animate-spin"/>:<ImageIcon className="h-4 w-4"/>}
                      <span className="text-xs">{uploadingBanner?"Subiendo...":"Subir banner"}</span>
                    </button>
                  )}
                </div>
              </Accordion>

              <Accordion label="Layout de productos" icon={LayoutGrid} id="layout" open={open.includes("layout")} toggle={toggle}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Disposición</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {LAYOUTS.map(({id,label,icon:Icon})=>(
                      <button key={id} onClick={()=>set("productLayout",id)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${config.productLayout===id?"border-indigo-500 bg-indigo-50":"border-gray-200 hover:border-gray-300"}`}>
                        <Icon className={`h-4 w-4 ${config.productLayout===id?"text-indigo-600":"text-gray-400"}`}/>
                        <span className={`font-medium ${config.productLayout===id?"text-indigo-700":"text-gray-500"}`} style={{fontSize:"9px"}}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle label="Mostrar precios" value={config.showPrices} onChange={v=>set("showPrices",v)}/>
                <Toggle label="Mostrar stock" value={config.showStock} onChange={v=>set("showStock",v)}/>
                <Toggle label="Mostrar estrellas" sub="Rating de productos" value={config.showRatings} onChange={v=>set("showRatings",v)}/>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Moneda</label>
                  <Chips options={CURRENCIES} value={config.currency} onChange={v=>set("currency",v)}/>
                </div>
              </Accordion>

              <Accordion label="Estilo de tarjetas" icon={MousePointer2} id="tarjetas" open={open.includes("tarjetas")} toggle={toggle}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Bordes</label>
                  <Chips options={CARD_RADIUS} value={config.cardRadius} onChange={v=>set("cardRadius",v)}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Sombra</label>
                  <Chips options={CARD_SHADOW} value={config.cardShadow} onChange={v=>set("cardShadow",v)}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Botones</label>
                  <Chips options={BTN_STYLES} value={config.buttonStyle} onChange={v=>set("buttonStyle",v)}/>
                </div>
              </Accordion>

              <Accordion label="Barra de anuncio" icon={Megaphone} id="anuncio" open={open.includes("anuncio")} toggle={toggle}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto del anuncio</label>
                  <input type="text" value={config.announcementBar} onChange={e=>set("announcementBar",e.target.value)}
                    placeholder='🚚 Envío gratis en compras +$50.000'
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>Dejalo vacío para ocultarla</p>
                </div>
                <ColorPicker label="Color de la barra" value={config.announcementBarColor} onChange={v=>set("announcementBarColor",v)}/>
              </Accordion>

              <Accordion label="WhatsApp flotante" icon={Share2} id="redes" open={open.includes("redes")} toggle={toggle}>
                <p className="text-xs text-gray-500">
                  Los links de redes del bloque se cargan dentro de cada bloque &quot;Redes / Contacto&quot;. Este ajuste global queda solo para el boton flotante.
                </p>
                <div className="border-t border-gray-100 pt-3">
                  <Toggle label="Botón flotante de WhatsApp" sub="Aparece en el margen de la tienda" value={config.showWhatsappButton} onChange={v=>set("showWhatsappButton",v)}/>
                  {config.showWhatsappButton&&(
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">💬 Número de WhatsApp</label>
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

              <Accordion label="Afiliados" icon={Users} id="vendedoras" open={open.includes("vendedoras")} toggle={toggle}>
                <Toggle label="Activar sistema de afiliados" sub="Otros pueden vender en tu tienda" value={Boolean(config.affiliatesEnabled)} onChange={v=>set("affiliatesEnabled",v)}/>
                {config.affiliatesEnabled&&(
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Comisión por venta</label>
                      <span className="text-sm font-bold text-indigo-600">{config.commissionRate||10}%</span>
                    </div>
                    <input type="range" min="1" max="50" value={config.commissionRate||10} onChange={e=>set("commissionRate",e.target.value)} className="w-full accent-indigo-600"/>
                    <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>
                      Venta $10.000 → afiliado gana ${(10000*parseFloat(String(config.commissionRate||"0"))/100).toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
              </Accordion>

              <Accordion label="SEO / Google" icon={Search} id="seo" open={open.includes("seo")} toggle={toggle}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Título para Google</label>
                  <input type="text" value={config.seoTitle||""} onChange={e=>set("seoTitle",e.target.value)}
                    placeholder="Mi Tienda - Ropa y joyas online"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción para Google</label>
                  <textarea value={config.seoDescription||""} onChange={e=>set("seoDescription",e.target.value)} rows={3}
                    placeholder="Encontrá las mejores prendas y accesorios."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
                </div>
              </Accordion>
            </>
          ) : (
            /* ── BLOQUES TAB ── */
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
                      <div key={b.id} className={`rounded-2xl overflow-hidden transition-all ${isSel ? "bg-white border-2 border-indigo-300 shadow-lg shadow-indigo-100/70" : "bg-white border border-gray-100"}`}>
                        <div
                          onClick={()=>setSelectedBlockId(isSel?null:b.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSel?"bg-gradient-to-r from-indigo-50 to-violet-50":"hover:bg-gray-50"}`}
                        >
                          <span className="text-lg">{lib?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${isSel?"text-indigo-700":"text-gray-900"}`}>{lib?.label}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {b.props.title||b.props.heading||b.props.text||"···"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={e=>{e.stopPropagation();moveBlock(b.id,-1);}} disabled={idx===0}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
                              <ChevronUp className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();moveBlock(b.id,1);}} disabled={idx===blocks.length-1}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
                              <ChevronDown className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();duplicateBlock(b.id);}}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors">
                              <Copy className="h-3 w-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();deleteBlock(b.id);}}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
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
                              onPickImage={() => {
                                setSelectedBlockId(b.id);
                                blockImageRef.current?.click();
                              }}
                            />
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
          )}
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="flex-1 min-w-0 sticky top-4">
          <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
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

            <div className="bg-gray-900 flex items-start justify-center p-4 overflow-auto" style={{minHeight:"620px"}}>
              <div ref={previewScrollRef} className={`${previewW} relative transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl`} style={{maxHeight:"620px",overflowY:"auto"}}>
                {activeTab==="diseño" ? (
                  <StorePreview config={config}/>
                ) : (
                  /* Blocks preview */
                  <div style={{fontFamily:config.fontFamily,minHeight:"400px"}}>
                    {/* Mini navbar */}
                    <div style={{background:config.navbarStyle==="solid"?config.primaryColor:"white",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(0,0,0,0.1)"}}>
                      <div style={{fontWeight:800,fontSize:"14px",color:config.navbarStyle==="solid"?"white":config.primaryColor}}>{config.name||"Mi Tienda"}</div>
                      <div style={{display:"flex",gap:"12px"}}>
                        {["Inicio","Productos","Contacto"].map(l=>(
                          <span key={l} style={{fontSize:"11px",color:config.navbarStyle==="solid"?"rgba(255,255,255,0.8)":"#6b7280"}}>{l}</span>
                        ))}
                      </div>
                    </div>

                    {/* Blocks */}
                    {blocks.length===0 ? (
                      <div style={{padding:"40px 24px",textAlign:"center",color:"#9ca3af"}}>
                        <div style={{fontSize:"32px",marginBottom:"12px"}}>📐</div>
                        <p style={{fontWeight:600,marginBottom:"6px"}}>Agregá bloques para ver la preview</p>
                        <p style={{fontSize:"12px"}}>Usá el botón &quot;Agregar bloque&quot; en el panel izquierdo</p>
                      </div>
                    ) : (
                      blocks.map((b,idx)=>(
                        <BlockPreview
                          key={b.id}
                          block={b}
                          config={config}
                          previewProducts={previewProducts}
                          selected={selectedBlockId===b.id}
                          onSelect={()=>setSelectedBlockId(selectedBlockId===b.id?null:b.id)}
                          onMoveUp={()=>moveBlock(b.id,-1)}
                          onMoveDown={()=>moveBlock(b.id,1)}
                          onDuplicate={()=>duplicateBlock(b.id)}
                          onDelete={()=>deleteBlock(b.id)}
                          isFirst={idx===0}
                          isLast={idx===blocks.length-1}
                        />
                      ))
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
                )}
                {activeTab==="bloques" && config.showWhatsappButton && config.whatsappNumber && (
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
            {activeTab==="bloques" ? "Hacé clic en un bloque de la preview para seleccionarlo y editarlo" : "Preview con productos de ejemplo · Los cambios se guardan con el botón"}
          </p>
        </div>
      </div>

      {/* Block library modal */}
      {showBlockLibrary&&<BlockLibraryModal onAdd={addBlock} onClose={()=>setShowBlockLibrary(false)}/>}

      <UnsavedChangesGuard isDirty={isDirty} />
    </DashboardLayout>
  );
}
