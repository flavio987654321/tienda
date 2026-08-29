import { getStoreType } from "@/lib/storeTypes";

/**
 * Los textos "de fábrica" que un template promete en la vidriera: la barra de
 * anuncios de arriba y las tres fichas de garantías del hero.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 *
 * Cada template los tenía escritos a mano, y todos decían lo mismo:
 *
 *     "🚚 Envío gratis en compras mayores a $30.000"
 *     "🔄 Cambios sin cargo hasta 30 días"
 *
 * Eso está bien para una tienda de ropa. Pero una tienda que vende archivos
 * descargables **no envía nada**, así que abría prometiéndole al comprador un
 * envío gratis que no existe. Y "cambios sin cargo hasta 30 días" es todavía
 * peor: en contenido digital el derecho a arrepentirse tiene otras reglas una
 * vez descargado el archivo, así que la tienda estaría prometiendo algo que
 * después no va a poder cumplir.
 *
 * Son textos por DEFECTO: la dueña puede reescribirlos desde el editor. Pero
 * salían así de fábrica, y nadie cambia lo que no sabe que está mal.
 *
 * Vive en un solo lugar porque lo usan varios templates: con una copia en cada
 * uno, arreglarlo en tres y olvidarse del cuarto es cuestión de tiempo. El
 * chequeo `beneficios-rubro.check.ts` verifica que ningún template habilitado
 * para un rubro sin envío se quede con los textos viejos.
 */

export type FichaDeGarantia = { title: string; desc: string };

const ANUNCIOS_FISICO = [
  "🚚 Envío gratis en compras mayores a $30.000",
  "🔄 Cambios sin cargo hasta 30 días",
  "💳 6 cuotas sin interés",
];

/* Lo que sí puede prometer una tienda que entrega por descarga. Las tres cosas
   que más tranquilizan al comprar un archivo: que llega al toque, que llega por
   mail y que el pago está protegido. */
const ANUNCIOS_DIGITAL = [
  "⚡ Descarga inmediata apenas se acredita el pago",
  "📩 Te llega el link por mail",
  "🔒 Pago protegido",
];

const GARANTIAS_FISICO: FichaDeGarantia[] = [
  { title: "Envío gratis",      desc: "En compras mayores a $30.000" },
  { title: "Cambios sin cargo", desc: "Hasta 30 días después de la compra" },
  { title: "Pago seguro",       desc: "Todos los medios de pago protegidos" },
];

const GARANTIAS_DIGITAL: FichaDeGarantia[] = [
  { title: "Descarga inmediata", desc: "Apenas se acredita el pago" },
  { title: "Te llega por mail",  desc: "Con tu link de descarga privado" },
  { title: "Pago seguro",        desc: "Todos los medios de pago protegidos" },
];

/** ¿Este rubro entrega por descarga? Se pregunta al rubro, no a una lista. */
function entregaPorDescarga(tipoTienda: string | null | undefined): boolean {
  return getStoreType(tipoTienda ?? "ROPA").requiereArchivo === true;
}

/** Los mensajes de la barra de anuncios, cuando la dueña no escribió los suyos. */
export function anunciosPorDefecto(tipoTienda: string | null | undefined): string[] {
  return entregaPorDescarga(tipoTienda) ? ANUNCIOS_DIGITAL : ANUNCIOS_FISICO;
}

/**
 * Igual que la anterior, pero respetando los textos propios del template cuando
 * el rubro SÍ envía.
 *
 * Boho Terra dice "🌿 Envío gratis" y Aurora "🚚 Envío gratis": la diferencia es
 * la voz de cada diseño, y pisarla con un texto único los aplanaría a todos. Lo
 * que hay que corregir es sólo el caso en que la promesa es falsa — si no hay
 * envío, no importa con qué emoji se prometa.
 */
export function anunciosDeRubro(
  tipoTienda: string | null | undefined,
  propiosDelTemplate: string[],
): string[] {
  return entregaPorDescarga(tipoTienda) ? ANUNCIOS_DIGITAL : propiosDelTemplate;
}

/** Los títulos de las tres fichas de garantía. Los íconos los pone el template. */
export function garantiasPorDefecto(tipoTienda: string | null | undefined): FichaDeGarantia[] {
  return entregaPorDescarga(tipoTienda) ? GARANTIAS_DIGITAL : GARANTIAS_FISICO;
}
