import { limpiarUtm } from "@/lib/utm-digital";

/* ══════════════════════════════════════════════════════════════════════════
   ENLACES LISTOS PARA COMPARTIR, CON LA ETIQUETA PUESTA
   ══════════════════════════════════════════════════════════════════════════

   Estadísticas → Campañas cuenta de dónde viene cada visita y cada venta,
   pero sólo si el link trae `?utm_source=...`. Nadie va a escribir eso a
   mano. Acá se arman los links de cada producto para cada lugar donde se
   comparte —la bio de Instagram, una historia, WhatsApp, un mail— con la
   etiqueta ya puesta, y un botón para copiarlos.

   Cada canal lleva `utm_source` (uno de los orígenes que `clasificarOrigen`
   conoce, así se dibuja con su nombre y no en "Otros") y `utm_medium` (una
   de las palabras que `medioDe` entiende). El nombre de campaña es opcional y
   pasa por `limpiarUtm`, la misma limpieza que sufre al entrar: lo que la
   persona ve en el link es exactamente lo que va a ver en la tabla.

   Es puro. Probado en `enlaces-compartir.check.ts`. */

export type Canal = {
  clave: string;
  nombre: string;
  /** Un origen de `ORIGENES`, para que la visita se cuente con su nombre. */
  source: string;
  /** Una palabra que `medioDe` entiende. */
  medium: string;
  /** Dónde va ese link. Corto: es el pie de la fila. */
  donde: string;
};

export const CANALES: readonly Canal[] = [
  { clave: "instagram-bio", nombre: "Instagram · biografía", source: "instagram", medium: "bio", donde: "El link del perfil. Es el que más entra." },
  { clave: "instagram-historia", nombre: "Instagram · historia o reel", source: "instagram", medium: "historia", donde: "El sticker de enlace de una historia, o el comentario fijado de un reel." },
  { clave: "whatsapp", nombre: "WhatsApp", source: "whatsapp", medium: "organico", donde: "Estado, grupos, o el mensaje a quien te preguntó." },
  { clave: "facebook", nombre: "Facebook", source: "facebook", medium: "organico", donde: "Un posteo, un grupo, o el botón de tu página." },
  { clave: "tiktok", nombre: "TikTok", source: "tiktok", medium: "organico", donde: "El link de la bio." },
  { clave: "youtube", nombre: "YouTube", source: "youtube", medium: "organico", donde: "La descripción de un video." },
  { clave: "email", nombre: "Mail", source: "email", medium: "mail", donde: "Un correo a tu lista, o tu firma." },
] as const;

/** Un producto tal como lo necesita esta pantalla. */
export type ProductoParaCompartir = {
  id: string;
  name: string;
  slugDigital: string | null;
  dominioPropio: string | null;
  isActive: boolean;
};

/**
 * La dirección base del producto: el dominio propio si lo tiene, si no la de
 * tiendaapps, si no la larga (`/p/<id>`). Es la misma prioridad con que se
 * la muestra a la dueña en Productos.
 */
export function direccionBase(p: Pick<ProductoParaCompartir, "id" | "slugDigital" | "dominioPropio">, dominioPlataforma: string, appUrl: string): string {
  if (p.dominioPropio) return `https://${p.dominioPropio}`;
  if (p.slugDigital) return `https://${p.slugDigital}.${dominioPlataforma}`;
  return `${appUrl.replace(/\/$/, "")}/p/${p.id}`;
}

/** El nombre de campaña como va a quedar guardado: la misma limpieza que al entrar. */
export function campaniaLimpia(valor: string): string {
  return limpiarUtm(valor);
}

/**
 * El link de un canal, con la etiqueta puesta. La campaña sólo si vino con
 * algo después de limpiarla; un `utm_campaign=` vacío es ruido en el link y
 * no cuenta como campaña al entrar.
 */
export function enlaceParaCompartir(base: string, canal: Canal, campania = ""): string {
  const q = new URLSearchParams();
  q.set("utm_source", canal.source);
  q.set("utm_medium", canal.medium);
  const c = campaniaLimpia(campania);
  if (c) q.set("utm_campaign", c);
  /* Un dominio pelado lleva la barra antes del ?: es lo que el navegador va
     a mostrar igual, y así el link se ve limpio donde se pegue. */
  const b = /^https?:\/\/[^/?]+$/.test(base) ? `${base}/` : base;
  const separador = b.includes("?") ? "&" : "?";
  return `${b}${separador}${q.toString()}`;
}
