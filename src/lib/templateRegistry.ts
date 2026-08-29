import type { TemplateId } from "@/types/store-config";
import { TEMPLATE_TIPO_TIENDA } from "@/types/store-config";
import { getStoreType } from "@/lib/storeTypes";
import Aire from "@/components/store/templates/Aire";
import BohoTerra from "@/components/store/templates/BohoTerra";
import UrbanPulse from "@/components/store/templates/UrbanPulse";
import ChicParis from "@/components/store/templates/ChicParis";
import Aurora from "@/components/store/templates/Aurora";
import AutoMotor from "@/components/store/templates/AutoMotor";
import AutoDrive from "@/components/store/templates/AutoDrive";
import ElectroPrime from "@/components/store/templates/ElectroPrime";
import TechNova from "@/components/store/templates/TechNova";
import HomeStudio from "@/components/store/templates/HomeStudio";
import CasaClara from "@/components/store/templates/CasaClara";

export type TemplateInfo = {
  id: TemplateId;
  name: string;
  desc: string;
  blurb: string;
  palette: string[];
  component: React.ComponentType;
  tipoTiendas: string[];
};

export type TemplateCategory = { id: string; name: string; templates: TemplateInfo[] };

// Registro único de plantillas. Hoy lo usa solo la galería del editor
// (dashboard/configuracion), que arma las miniaturas con el campo `component`.
//
// Tuvo otros dos consumidores que se sacaron: la sección "Diseño según tu
// rubro" de la home y la demo pública `/plantillas/[id]`. Con la demo se fueron
// `ALL_TEMPLATES` y `getTemplateInfo`, que eran solo para ella.
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "moda",
    name: "Moda & Ropa",
    templates: [
      { id: "aire",         name: "Aire",         desc: "Claro · Amplio · Moderno",     blurb: "Fondo claro, tarjetas redondeadas y mucho espacio. Para tiendas de ropa que quieren que se vea la prenda y no el decorado.", palette: ["#f4f4f1", "#1f5c3d", "#14161a"], component: Aire,        tipoTiendas: TEMPLATE_TIPO_TIENDA["aire"] },
      { id: "boho-terra",   name: "Boho Terra",   desc: "Orgánico · Natural · Cálido",  blurb: "Ideal para marcas con identidad natural y artesanal, en tonos tierra y cálidos.", palette: ["#faf7f2", "#b5652a", "#2c2218"], component: BohoTerra,   tipoTiendas: TEMPLATE_TIPO_TIENDA["boho-terra"]   },
      { id: "urban-pulse",  name: "Urban Pulse",  desc: "Deportivo · Energético",        blurb: "Pensado para ropa deportiva y streetwear, con energía y contraste fuerte.", palette: ["#0f0f0f", "#d4ff00", "#f5f5f5"], component: UrbanPulse,  tipoTiendas: TEMPLATE_TIPO_TIENDA["urban-pulse"]  },
      { id: "chic-paris",   name: "Chic Paris",   desc: "Editorial · Carousel · Limpio", blurb: "Un diseño editorial y prolijo, con carrusel de producto destacado.", palette: ["#ffffff", "#c0392b", "#111111"], component: ChicParis,   tipoTiendas: TEMPLATE_TIPO_TIENDA["chic-paris"]   },
      { id: "aurora",       name: "Aurora",       desc: "Oscuro · Luz · Profundidad",    blurb: "Fondo con luz viva calculada en tiempo real, vidrio y profundidad. Para marcas que quieren verse modernas sin gritar.", palette: ["#06070d", "#8b5cf6", "#f2f2f7"], component: Aurora,      tipoTiendas: TEMPLATE_TIPO_TIENDA["aurora"]       },
    ],
  },
  {
    id: "autos",
    name: "Autos & Motos",
    templates: [
      { id: "auto-motor", name: "Auto Motor", desc: "Oscuro · Premium · Concesionaria", blurb: "Estética de concesionaria premium en fondo oscuro, para autos y motos de alta gama.", palette: ["#0a0a0a", "#e8a020", "#1a1a1a"], component: AutoMotor, tipoTiendas: TEMPLATE_TIPO_TIENDA["auto-motor"] },
      { id: "auto-drive", name: "Auto Drive", desc: "Claro · Moderno · Marketplace",    blurb: "Un marketplace de vehículos claro y moderno, fácil de navegar.", palette: ["#f0f4f8", "#2563eb", "#0f172a"], component: AutoDrive,  tipoTiendas: TEMPLATE_TIPO_TIENDA["auto-drive"]  },
    ],
  },
  {
    id: "hogar-tech",
    name: "Hogar & Tecnología",
    templates: [
      { id: "electro-prime", name: "Electro Prime", desc: "Claro · Confianza · Cuotas",   blurb: "Pensado para electro y tecnología, con foco en cuotas y confianza.", palette: ["#ffffff", "#ea580c", "#111827"], component: ElectroPrime, tipoTiendas: TEMPLATE_TIPO_TIENDA["electro-prime"] },
      { id: "tech-nova",     name: "Tech Nova",     desc: "Claro · Tech · Vibrante",       blurb: "Diseño claro y vibrante para tiendas de tecnología con productos variados.", palette: ["#fafaff", "#7c3aed", "#0f0f1a"], component: TechNova,    tipoTiendas: TEMPLATE_TIPO_TIENDA["tech-nova"]     },
      { id: "home-studio",   name: "Home Studio",   desc: "Cálido · Lifestyle · Editorial", blurb: "Cálido y editorial, ideal para muebles y decoración de hogar.", palette: ["#faf8f4", "#b5652a", "#2c2218"], component: HomeStudio,  tipoTiendas: TEMPLATE_TIPO_TIENDA["home-studio"]   },
      { id: "casa-clara",    name: "Casa Clara",    desc: "Minimalista · Blanco · Simple", blurb: "Minimalista en blanco, para una tienda de hogar simple y directa.", palette: ["#ffffff", "#0f172a", "#444444"], component: CasaClara,   tipoTiendas: TEMPLATE_TIPO_TIENDA["casa-clara"]    },
    ],
  },
];

/**
 * Las categorías que ve la dueña, según el rubro de su tienda.
 *
 * ── Por qué no alcanzaba con las tres de arriba ──────────────────────────────
 *
 * Están agrupadas por el rubro para el que se diseñaron: Moda, Autos, Hogar &
 * Tecnología. La galería las muestra todas y apaga las tarjetas que el rubro no
 * habilita. Con eso, una tienda de productos digitales entraba y veía once
 * diseños repartidos en tres títulos que hablan de otra cosa, dos de ellos
 * enteros en gris.
 *
 * Un rubro que entrega por descarga no es "moda" ni "hogar": puede usar
 * cualquiera de los nueve diseños de tienda, porque un archivo se muestra igual
 * que cualquier otro producto. Así que en ese caso la galería deja de agrupar
 * por el rubro de origen y muestra UNA sola sección con los que puede usar.
 *
 * ── Por qué se arma sola y no a mano ─────────────────────────────────────────
 *
 * La lista sale de TEMPLATE_TIPO_TIENDA, la misma tabla que decide si la
 * tarjeta se puede clickear. Con una segunda lista escrita a mano, habilitar un
 * diseño y olvidarse de agregarlo acá daría una tarjeta que existe pero que
 * nadie encuentra — o peor al revés: una que aparece y está apagada.
 *
 * El nombre de la sección tampoco se escribe acá: es el del rubro, el mismo que
 * la dueña eligió en el modal de "¿qué vendés?".
 */
export function categoriasParaRubro(tipoTienda: string | null | undefined): TemplateCategory[] {
  const rubro = getStoreType(tipoTienda ?? "GENERAL");
  if (!rubro.requiereArchivo) return TEMPLATE_CATEGORIES;
  return [{
    id: rubro.id.toLowerCase(),
    name: rubro.label,
    templates: TEMPLATE_CATEGORIES
      .flatMap(c => c.templates)
      .filter(t => t.tipoTiendas.includes(rubro.id)),
  }];
}

