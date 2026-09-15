import { sumarDiasCalendario } from "@/lib/fechas-comerciales";
import type { TipoDeCupon } from "@/lib/cupones-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   EJEMPLOS LISTOS PARA USAR EN MARKETING
   ══════════════════════════════════════════════════════════════════════════

   Las pantallas de Marketing explicaban qué hace cada herramienta pero no
   PARA QUÉ se usa ni cómo queda una bien hecha. Quien nunca armó un cupón
   ni le escribió a sus compradores se queda mirando un formulario vacío.

   Acá viven tres ideas de cupón y tres mails de ejemplo. Cada uno lleva su
   POR QUÉ en la misma frase: nada de porcentajes inventados ni de "el 80 %
   de los compradores…". Un ejemplo con un número que no se puede defender
   hace que la persona deje de creerle al resto del panel.

   Son borradores: la pantalla los carga en el formulario y la persona los
   cambia antes de mandar. Puro; probado en `plantillas-marketing.check.ts`. */

/* ── Cupones ─────────────────────────────────────────────────────────────── */

export type IdeaDeCupon = {
  clave: string;
  /** Para quién es, en una línea. */
  nombre: string;
  codigo: string;
  tipo: TipoDeCupon;
  valor: number;
  /** Cuántos días vive, o null = sin vencimiento. */
  diasDeVida: number | null;
  topeUsos: number | null;
  /** Por qué funciona, con la razón adentro. */
  porQue: string;
};

export const IDEAS_DE_CUPON: readonly IdeaDeCupon[] = [
  {
    clave: "decidirse",
    nombre: "Para quien preguntó y no se decide",
    codigo: "HOY10", tipo: "PORCENTAJE", valor: 10, diasDeVida: 3, topeUsos: null,
    porQue: "Un descuento chico que vence en tres días le da a quien está dudando la excusa para decidirse ahora: la razón es que se termina, no el monto.",
  },
  {
    clave: "volver",
    nombre: "Para quien ya te compró",
    codigo: "VOLVE20", tipo: "PORCENTAJE", valor: 20, diasDeVida: null, topeUsos: null,
    porQue: "Es la venta más fácil que existe: ya te pagó una vez y ya sabe cómo entregás. Mandáselo con Mail a tus compradores cuando lances el siguiente.",
  },
  {
    clave: "lanzamiento",
    nombre: "Para un lanzamiento",
    codigo: "LANZAMIENTO", tipo: "PORCENTAJE", valor: 30, diasDeVida: 7, topeUsos: 50,
    porQue: "Los primeros cincuenta con descuento y después el precio de lista. El tope es de verdad —el cupón se agota solo—, así que se puede decir sin mentir.",
  },
] as const;

/** La idea, lista para el formulario: la fecha de vencimiento como "YYYY-MM-DD" contada desde hoy. */
export function cuponDeLaIdea(idea: IdeaDeCupon, hoy: string): { codigo: string; tipo: TipoDeCupon; valor: string; venceAt: string; topeUsos: string } {
  return {
    codigo: idea.codigo,
    tipo: idea.tipo,
    valor: String(idea.valor),
    venceAt: idea.diasDeVida === null ? "" : sumarDiasCalendario(hoy, idea.diasDeVida),
    topeUsos: idea.topeUsos === null ? "" : String(idea.topeUsos),
  };
}

/**
 * Porcentaje o pesos: la regla que la pantalla dice al lado del formulario.
 * Un porcentaje chico sobre algo barato no mueve a nadie; un monto fijo
 * sobre algo caro se nota poco. Se dice con los números del producto.
 */
export const CONSEJO_DE_CUPON =
  "Porcentaje para lo caro, pesos para lo barato: 10 % de $ 3.000 son $ 300 y no mueven a nadie; \"$ 1.000 menos\" sí se entiende. Y siempre con vencimiento o con tope: un cupón que dura para siempre no apura a nadie.";

/* ── Mail a compradores ──────────────────────────────────────────────────── */

export type PlantillaDeCorreo = {
  clave: string;
  nombre: string;
  /** Con `{producto}` donde va el nombre. */
  asunto: string;
  cuerpo: string;
  /** Si conviene ponerle el botón al producto. */
  conBoton: boolean;
};

export const PLANTILLAS_DE_CORREO: readonly PlantillaDeCorreo[] = [
  {
    clave: "siguiente",
    nombre: "Salió el siguiente",
    asunto: "Salió {producto}",
    cuerpo: "Te escribo porque ya está listo {producto}.\n\nComo ya me compraste, quería que lo supieras antes que nadie. Abajo te dejo el link para verlo.\n\nCualquier duda, contestame este mail.",
    conBoton: true,
  },
  {
    clave: "actualizado",
    nombre: "Actualicé el archivo",
    asunto: "Actualicé {producto}",
    cuerpo: "Le agregué cosas a {producto} y quería que las tengas: [contá en una línea qué cambió].\n\nEntrá con el mismo enlace de descarga que te llegó cuando compraste: ya baja la versión nueva. Si no lo encontrás, contestame este mail y te lo mando de nuevo.",
    conBoton: false,
  },
  {
    clave: "opinion",
    nombre: "¿Cómo te fue?",
    asunto: "¿Cómo te fue con {producto}?",
    cuerpo: "Hace un tiempo compraste {producto} y quería saber cómo te fue: qué te sirvió, qué te quedó picando.\n\nContestame este mail con dos líneas, lo leo yo. Y si te sirvió y querés dejarlo escrito para los que vienen, también me ayuda un montón.",
    conBoton: false,
  },
] as const;

/** La plantilla con el nombre del producto puesto. Sin producto elegido, una forma genérica que se lee bien igual. */
export function correoDeLaPlantilla(p: PlantillaDeCorreo, producto: string | null): { asunto: string; cuerpo: string } {
  const nombre = producto?.trim() || "el material";
  return { asunto: p.asunto.replace(/\{producto\}/g, nombre), cuerpo: p.cuerpo.replace(/\{producto\}/g, nombre) };
}

export const CONSEJO_DE_CORREO =
  "Uno cada tanto y siempre con algo que le sirva a quien lo lee. Quien recibe tres mails seguidos sin nada adentro se da de baja, y a esa persona no le podés escribir nunca más.";

/* ── Enlaces ─────────────────────────────────────────────────────────────── */

export const CONSEJO_DE_ENLACES =
  "Los dos que más venden son la bio de Instagram y WhatsApp: son el link que alguien toca cuando ya te vio y quiere saber más. Ponéle nombre de campaña cuando pruebes dos cosas en el mismo canal —\"reel-frenos\" y \"reel-aceite\"— y en Estadísticas → Campañas ves cuál trajo ventas.";

/* ── Medición ────────────────────────────────────────────────────────────── */

export const CONSEJO_DE_MEDICION =
  "Para saber si anda: instalá la extensión Meta Pixel Helper en Chrome y abrí tu página publicada. Tiene que marcar PageView y ViewContent; en la pantalla de pago, InitiateCheckout; y en Gracias, después de una compra real, Purchase. Si no marca nada, el ID está mal copiado.";
