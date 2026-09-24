import { Package, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DIGITALES_ABIERTO } from "./planLimits";

/* El listado de links del nav público, en un solo lugar.

   Existía por duplicado: `SiteNav` lo tenía escrito a mano y la home tenía DOS
   copias más (su nav de escritorio y su menú de hamburguesa), porque la home no
   usa `SiteNav` — necesita una barra transparente que se pinta de blanco recién
   al bajar, y un cajón lateral en vez del panel a pantalla completa.

   Las copias se desincronizaron de verdad: al agregar "Productos digitales" el
   link apareció en las otras pantallas pero no en la home, y hubo que ir a
   buscar los dos lugares que faltaban. De acá en más se comparte el listado y
   cada nav sigue poniendo su propio layout y sus propias clases. */

export type SiteNavKey =
  | "tiendas"
  | "digitales"
  | "quienes-somos"
  | "precios"
  | "seguimiento"
  | "contacto";

export type LinkPublico = {
  key: SiteNavKey;
  href: string;
  label: string;
  /* Sólo lo muestra el nav de escritorio; el menú chico va sin íconos. */
  icon?: LucideIcon;
};

// "Cómo funciona" salió de acá: apuntaba a #como-funciona, el ancla de la
// galería de plantillas de la home, que se sacó. Los diseños se muestran ahora
// en los videos publicitarios.
const LINKS: LinkPublico[] = [
  { key: "tiendas",       href: "/tiendas",             label: "Tiendas" },
  { key: "digitales",     href: "/productos-digitales", label: "Productos digitales" },
  { key: "quienes-somos", href: "/quienes-somos",       label: "Quiénes somos" },
  { key: "precios",       href: "/precios",             label: "Precios" },
  { key: "seguimiento",   href: "/seguimiento",         label: "Seguimiento", icon: Package },
  { key: "contacto",      href: "/contacto",            label: "Contacto",    icon: MessageCircle },
];

/* Lo que se dibuja de verdad. Productos Digitales sale del menú cuando el
   producto está apagado: un link a una pantalla que avisa "todavía no" es peor
   que no tener el link. El filtro va acá y no arriba para que LINKS siga siendo
   la lista completa de lo que existe. */
export const LINKS_PUBLICOS: LinkPublico[] = LINKS.filter(
  (l) => l.key !== "digitales" || DIGITALES_ABIERTO,
);
