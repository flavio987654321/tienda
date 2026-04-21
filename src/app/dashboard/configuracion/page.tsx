"use client";

import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StorePreview, { StoreConfig } from "@/components/StorePreview";
import {
  Loader2, Save, Users, Palette, Layout, Type,
  Image as ImageIcon, Monitor, Smartphone, Tablet, LayoutGrid,
  List, Grid2X2, ChevronDown, ChevronUp, Megaphone, Share2,
  MousePointer2, CreditCard, Search, ExternalLink
} from "lucide-react";

// ── Templates con mini thumbnail ──────────────────────────────────
const TEMPLATES = [
  { id: "default",  name: "Minimal",   emoji: "⬜", desc: "Hero centrado y grilla limpia" },
  { id: "fashion",  name: "Editorial", emoji: "👗", desc: "Texto lateral + portada grande" },
  { id: "boutique", name: "Boutique",  emoji: "🛍️", desc: "Mosaico con fotos chicas" },
  { id: "colorful", name: "Color Pop", emoji: "🎨", desc: "Bloques de color y categorias" },
  { id: "luxury",   name: "Luxury",    emoji: "✨", desc: "Portada premium dividida" },
  { id: "vintage",  name: "Vintage",   emoji: "🌸", desc: "Banner clasico y marco retro" },
  { id: "sport",    name: "Sport",     emoji: "⚡", desc: "Hero diagonal y cards fuertes" },
  { id: "tech",     name: "Tech",      emoji: "🖥️", desc: "Dark con neon y grilla compacta" },
  { id: "kids",     name: "Kids",      emoji: "🎀", desc: "Redondeado, ludico y suave" },
  { id: "market",   name: "Market",    emoji: "🏪", desc: "Buscador + menu lateral" },
];

const FUENTES = ["Inter","Poppins","Playfair Display","Roboto","Montserrat","Lato","Raleway","Oswald","Nunito","DM Sans"];
const LAYOUTS = [
  { id:"grid2", label:"2 col", icon:Grid2X2 },
  { id:"grid3", label:"3 col", icon:LayoutGrid },
  { id:"grid4", label:"4 col", icon:Layout },
  { id:"list",  label:"Lista", icon:List },
];
const HERO_STYLES  = [{ id:"full",label:"Grande"},{ id:"compact",label:"Compacto"},{ id:"minimal",label:"Sin banner"}];
const NAVBAR_STYLES = [{ id:"solid",label:"Sólido"},{ id:"transparent",label:"Transparente"},{ id:"minimal",label:"Minimal"}];
const BTN_STYLES   = [{ id:"rounded",label:"Redondeado"},{ id:"pill",label:"Píldora"},{ id:"square",label:"Cuadrado"},{ id:"outline",label:"Borde"}];
const CARD_RADIUS  = [{ id:"none",label:"Recto"},{ id:"sm",label:"Suave"},{ id:"md",label:"Medio"},{ id:"lg",label:"Grande"},{ id:"xl",label:"Máximo"}];
const CARD_SHADOW  = [{ id:"none",label:"Sin sombra"},{ id:"sm",label:"Suave"},{ id:"md",label:"Media"},{ id:"lg",label:"Fuerte"}];
const BG_STYLES    = [{ id:"plain",label:"Liso"},{ id:"gradient",label:"Degradado"},{ id:"pattern",label:"Patrón"}];
const CURRENCIES   = [{ id:"ARS",label:"Pesos ARS"},{ id:"USD",label:"Dólares USD"}];

type Section = "template"|"colores"|"textos"|"imagenes"|"layout"|"tarjetas"|"anuncio"|"redes"|"footer"|"vendedoras"|"seo";

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

function Accordion({
  label,
  icon: Icon,
  id,
  open,
  toggle,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  id: Section;
  open: boolean;
  toggle: (id: Section) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg"><Icon className="h-3.5 w-3.5 text-indigo-600" /></div>
          <span className="font-semibold text-gray-900 text-sm">{label}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400"/> : <ChevronDown className="h-4 w-4 text-gray-400"/>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">{children}</div>}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer shrink-0">
          <input type="color" value={value} onChange={e=>onChange(e.target.value)} className="sr-only"/>
          <div className="h-9 w-9 rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-110" style={{backgroundColor:value}}/>
        </label>
        <input type="text" value={value} onChange={e=>onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"/>
      </div>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
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
      {options.map(o => (
        <button key={o.id} onClick={()=>onChange(o.id)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${value===o.id?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ConfiguracionPage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [preview, setPreview]   = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [open, setOpen]         = useState<Section[]>(["template","colores"]);
  const [uploadingLogo, setUL]  = useState(false);
  const [uploadingBanner, setUB]= useState(false);
  const logoRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [config, setConfig]     = useState<StoreConfig>(DEFAULT_CONFIG);

  useEffect(()=>{
    fetch("/api/configuracion").then(r=>r.json()).then(({store})=>{
      if(store) setConfig(p=>({...p,...store, commissionRate:String(store.commissionRate||10), announcementBar:store.announcementBar||"", announcementBarColor:store.announcementBarColor||"#6366f1", instagramUrl:store.instagramUrl||"", facebookUrl:store.facebookUrl||"", tiktokUrl:store.tiktokUrl||"", whatsappNumber:store.whatsappNumber||"", footerText:store.footerText||""}));
      setLoading(false);
    });
  },[]);

  const set = <K extends keyof StoreConfig>(k: K, v: StoreConfig[K]) => setConfig(p=>({...p,[k]:v}));
  const toggle = (s: Section) => setOpen(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  async function upload(file: File, field:"logo"|"banner") {
    if (field === "logo") setUL(true);
    else setUB(true);
    const fd=new FormData(); fd.append("file",file);
    const res=await fetch("/api/upload",{method:"POST",body:fd});
    const {url}=await res.json();
    if(url) set(field,url);
    if (field === "logo") setUL(false);
    else setUB(false);
  }

  async function handleSave(){
    setSaving(true); setSaved(false);
    await fetch("/api/configuracion",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  }

  const previewW = {desktop:"w-full",tablet:"w-[420px]",mobile:"w-[280px]"}[preview];

  if(loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-indigo-600"/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diseñá tu tienda</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Preview en vivo mientras editás</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/tienda/${config.slug || config.name?.toLowerCase().replace(/\s+/g,"-") || "mi-tienda"}`} target="_blank"
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

          {/* TEMPLATE */}
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

          {/* COLORES */}
          <Accordion label="Colores y fuente" icon={Palette} id="colores" open={open.includes("colores")} toggle={toggle}>
            <ColorPicker label="Color principal" value={config.primaryColor} onChange={v=>set("primaryColor",v)}/>
            <ColorPicker label="Color secundario (fondo)" value={config.secondaryColor} onChange={v=>set("secondaryColor",v)}/>
            <ColorPicker label="Color de acento (badges, tags)" value={config.accentColor} onChange={v=>set("accentColor",v)}/>
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

          {/* TEXTOS */}
          <Accordion label="Textos" icon={Type} id="textos" open={open.includes("textos")} toggle={toggle}>
            {[
              {label:"Nombre de la tienda", field:"name" as const, ph:"Mi Tienda"},
              {label:"Eslogan / Tagline", field:"tagline" as const, ph:"¡Moda que te expresa!"},
            ].map(({label,field,ph})=>(
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                <input type="text" value={config[field] || ""} onChange={e=>set(field,e.target.value)} placeholder={ph}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Estilo del banner principal</label>
              <Chips options={HERO_STYLES} value={config.heroStyle} onChange={v=>set("heroStyle",v)}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Estilo del navbar</label>
              <Chips options={NAVBAR_STYLES} value={config.navbarStyle} onChange={v=>set("navbarStyle",v)}/>
            </div>
          </Accordion>

          {/* IMÁGENES */}
          <Accordion label="Imágenes" icon={ImageIcon} id="imagenes" open={open.includes("imagenes")} toggle={toggle}>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"logo")}/>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"banner")}/>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                  {config.logo?<img src={config.logo} className="w-full h-full object-cover" alt=""/>:<ImageIcon className="h-4 w-4 text-gray-300"/>}
                </div>
                <div className="flex-1 space-y-1">
                  <button onClick={()=>logoRef.current?.click()} disabled={uploadingLogo}
                    className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                    {uploadingLogo?<Loader2 className="h-3 w-3 animate-spin"/>:null}
                    {uploadingLogo?"Subiendo...":"Subir logo"}
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

          {/* LAYOUT */}
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

          {/* TARJETAS */}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Estilo de botones</label>
              <Chips options={BTN_STYLES} value={config.buttonStyle} onChange={v=>set("buttonStyle",v)}/>
            </div>
          </Accordion>

          {/* ANUNCIO */}
          <Accordion label="Barra de anuncio" icon={Megaphone} id="anuncio" open={open.includes("anuncio")} toggle={toggle}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto del anuncio</label>
              <input type="text" value={config.announcementBar} onChange={e=>set("announcementBar",e.target.value)}
                placeholder='Ej: 🚚 Envío gratis en compras +$50.000'
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>Dejalo vacío para ocultarla</p>
            </div>
            <ColorPicker label="Color de la barra" value={config.announcementBarColor} onChange={v=>set("announcementBarColor",v)}/>
          </Accordion>

          {/* REDES SOCIALES */}
          <Accordion label="Redes sociales y contacto" icon={Share2} id="redes" open={open.includes("redes")} toggle={toggle}>
            {[
              {label:"Instagram", field:"instagramUrl" as const, ph:"@mitienda", icon:"📸"},
              {label:"Facebook",  field:"facebookUrl" as const,  ph:"facebook.com/mitienda", icon:"👍"},
              {label:"TikTok",    field:"tiktokUrl" as const,    ph:"@mitienda", icon:"🎵"},
            ].map(({label,field,ph,icon})=>(
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{icon} {label}</label>
                <input type="text" value={config[field] || ""} onChange={e=>set(field,e.target.value)} placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3">
              <Toggle label="Botón flotante de WhatsApp" sub="Aparece en el margen de la tienda" value={config.showWhatsappButton} onChange={v=>set("showWhatsappButton",v)}/>
              {config.showWhatsappButton && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">💬 Número de WhatsApp</label>
                  <input type="text" value={config.whatsappNumber} onChange={e=>set("whatsappNumber",e.target.value)}
                    placeholder="5491112345678"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>Sin + ni espacios. Ej: 5491112345678</p>
                </div>
              )}
            </div>
          </Accordion>

          {/* FOOTER */}
          <Accordion label="Footer" icon={CreditCard} id="footer" open={open.includes("footer")} toggle={toggle}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto del footer</label>
              <textarea value={config.footerText} onChange={e=>set("footerText",e.target.value)} rows={3}
                placeholder="Ej: © 2025 Mi Tienda · Todos los derechos reservados · Buenos Aires, Argentina"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
            </div>
          </Accordion>

          {/* VENDEDORAS */}
          <Accordion label="Vendedoras" icon={Users} id="vendedoras" open={open.includes("vendedoras")} toggle={toggle}>
            <Toggle label="Activar sistema de vendedoras" sub="Otros pueden vender en tu tienda" value={Boolean(config.affiliatesEnabled)} onChange={v=>set("affiliatesEnabled",v)}/>
            {config.affiliatesEnabled && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Comisión por venta</label>
                  <span className="text-sm font-bold text-indigo-600">{config.commissionRate || 10}%</span>
                </div>
                <input type="range" min="1" max="50" value={config.commissionRate || 10} onChange={e=>set("commissionRate",e.target.value)} className="w-full accent-indigo-600"/>
                <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>
                  Venta $10.000 → vendedora gana ${(10000*parseFloat(String(config.commissionRate || "0"))/100).toLocaleString("es-AR")}
                </p>
              </div>
            )}
          </Accordion>

          {/* SEO */}
          <Accordion label="SEO / Google" icon={Search} id="seo" open={open.includes("seo")} toggle={toggle}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Título para Google</label>
              <input type="text" value={config.seoTitle || ""} onChange={e=>set("seoTitle",e.target.value)}
                placeholder="Mi Tienda - Ropa y joyas online"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción para Google</label>
              <textarea value={config.seoDescription || ""} onChange={e=>set("seoDescription",e.target.value)} rows={3}
                placeholder="Encontrá las mejores prendas y accesorios. Envíos a todo Argentina."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
              <p className="text-gray-400 mt-1" style={{fontSize:"10px"}}>Máx. 160 caracteres recomendado</p>
            </div>
          </Accordion>
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="flex-1 min-w-0 sticky top-4">
          <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/>
              </div>
              <div className="flex-1 mx-4 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center truncate">
                mitienda.com/tienda/{(config.name||"mi-tienda").toLowerCase().replace(/\s+/g,"-")}
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
              <div className={`${previewW} transition-all duration-300 bg-white rounded-lg overflow-hidden shadow-2xl`} style={{maxHeight:"620px",overflowY:"auto"}}>
                <StorePreview config={config}/>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Preview con productos de ejemplo · Los cambios se guardan con el botón</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
