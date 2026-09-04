import { contarConTope } from "@/lib/rate-limit";
import type { TierDigital } from "@/lib/planes-digitales";

/**
 * Los topes de la IA de Productos Digitales.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NINGUNA FUNCIÓN DE IA SALE SIN TOPE, NI EN EL PLAN MÁS CARO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Está escrito en el plan desde antes de entusiasmarse, y el motivo es la foto
 * de la competencia: su plan más caro dice *"Todos los ebooks con IA"*. Eso es
 * ilimitado, y es una bomba. **El plan más caro lleva el tope más alto, no
 * ninguno.**
 *
 * ── Por qué esto es un archivo aparte de `asistente-limites` ────────────────
 *
 * Porque cuentan cosas distintas y se agotan por separado. Sasha es un chat: el
 * tope está en mensajes y lo que se protege es el volumen. Esto son
 * generaciones: una sola llamada por producto, mucho más caras por unidad, y con
 * un presupuesto que no puede compartirse con el chat — si se cruzaran, una
 * tarde de charla con Sasha dejaría a alguien sin poder armar su producto.
 *
 * La forma sí es la misma, y a propósito: las mismas cuatro capas, en el mismo
 * orden, con el mismo `contarConTope`. Lo que ya se aprendió caro no se vuelve a
 * aprender.
 *
 * ── Lo que este archivo NO cuenta ──────────────────────────────────────────
 *
 * 🔲 **El cupo de ebooks.** Ése no es un tope de ráfaga: es un cupo con arranque
 * (3 en Starter, 6 en Pro, una sola vez), mensual (2 y 5) y un reintento por
 * ebook. Eso no vive en Redis con una ventana — se olvida y se regala de nuevo —,
 * necesita una columna en la base. Va con el botón del ebook, que es el que lo
 * gasta. Ver 2.4 bis del plan.
 *
 * Acá está lo BARATO: armar el embudo y escribir la página. Cuesta centavos, así
 * que no se cuenta contra un cupo que la persona ve — se protege del script, que
 * es otra cosa.
 */

/* ── Capa 1: ráfaga ─────────────────────────────────────────────────────────
   Anti-script. Una persona armando productos no se acerca ni de casualidad:
   cada generación va seguida de leer tres fichas y decidir. */
export const RAFAGA_IA = 8;
export const VENTANA_RAFAGA_MS = 10 * 60_000;

/* ── Capa 2: diario por cuenta ──────────────────────────────────────────────
 *
 * Y acá el plan SÍ cambia el número, al revés que en Sasha. El motivo es que
 * estas generaciones se corresponden con productos, y cuántos productos puede
 * tener cada plan ya está decidido: 1, 2 y 5. Darle 40 generaciones diarias a
 * una cuenta Free que puede tener **un** producto es pagar 39 llamadas que no
 * pueden terminar en nada.
 *
 * Los números son holgados igual —nadie rehace su embudo diez veces en un día
 * de buena fe— pero tienen fondo.
 */
export const DIARIO_POR_PLAN: Record<TierDigital, number> = {
  FREE: 10,
  STARTER: 20,
  PRO: 40,
};

/* ── Capa 3: el global de las cuentas en prueba ─────────────────────────────
 *
 * La capa que de verdad importa, y la que ninguna capa por-usuario puede tapar:
 * **veinte cuentas truchas son la misma persona** y cada una llega con su tope
 * personal intacto.
 *
 * Va separado del global total para que el que abusa no deje sin IA al que paga.
 * Es la misma decisión que en Sasha, por el mismo motivo exacto.
 *
 * ⚠️ Y acá pesa más que allá: la prueba dura 7 días, **no pide tarjeta** y da
 * acceso a la IA. Es la única parte del sistema donde alguien gasta plata nuestra
 * sin habernos dado nunca un dato real.
 */
export const GLOBAL_PRUEBA_DIARIO = 150;

/* ── Capa 4: el corta-corriente ─────────────────────────────────────────────
 * Toda la plataforma, en un día, pague o no. No está pensado para saltar nunca.
 *
 * ⚠️ Y no es el techo de verdad. El único que garantiza que no llegue una
 * factura de US$500 es el spending limit de la cuenta de Anthropic, que se pone
 * en su consola y vive fuera de este repo. */
export const GLOBAL_DIARIO = 600;

/** A partir de qué porcentaje de un tope global se avisa por consola. */
const AVISO_DESDE = 0.8;
const UN_DIA_MS = 24 * 60 * 60_000;

export type MotivoIA = "rafaga" | "diario" | "global-prueba" | "global";

export type VeredictoIA =
  | { permitido: true }
  | { permitido: false; motivo: MotivoIA; mensaje: string };

/** Se inyecta para poder probar sin Redis. */
export type Contador = (
  clave: string,
  limite: number,
  ventanaMs: number,
) => Promise<{ permitido: boolean; cuenta: number }>;

export type PedidoIA = {
  userId: string;
  tier: TierDigital;
  /** Si la suscripción está en prueba (o todavía no hay ninguna). */
  enPrueba: boolean;
  /** El día de Argentina, `YYYY-MM-DD`. Va en la clave: el contador se cae solo. */
  day: string;
  /** Qué se está generando. Va en la clave para que no compartan contador. */
  que: "embudo" | "pagina";
};

/* Los lee quien vende, no un desarrollador: dicen qué pasó y cuándo vuelve,
   nunca "rate limit" ni el número del tope. Decir el número es contarle a quien
   quiera abusar exactamente cuánto le falta. */
const MENSAJES: Record<MotivoIA, string> = {
  rafaga: "Generaste varias seguidas. Esperá unos minutos y probá de nuevo.",
  diario: "Llegaste al límite de generaciones de hoy. Mañana se renueva.",
  "global-prueba": "La IA está con mucha demanda en este momento. Probá de nuevo más tarde.",
  global: "La IA está con mucha demanda en este momento. Probá de nuevo más tarde.",
};

function avisarSiSeAcerca(que: string, cuenta: number, limite: number): void {
  if (cuenta === Math.ceil(limite * AVISO_DESDE)) {
    console.warn(`[ia-digitales] el tope ${que} va en ${cuenta} de ${limite} — si esto es uso real, hay que subirlo.`);
  }
  if (cuenta === limite + 1) {
    console.error(`[ia-digitales] TOPE ${que} ALCANZADO (${limite}). A partir de acá se rechaza.`);
  }
}

/**
 * Si esta generación se hace o no.
 *
 * ⚠️ EL ORDEN NO ES DECORATIVO. Los contadores suman aunque el pedido se rechace
 * —así funciona `INCR`—, así que **los topes globales van últimos**: si fueran
 * primero, alguien ya bloqueado por su tope personal seguiría comiéndose el
 * presupuesto de todos con cada intento.
 *
 * Tira si Redis no contesta, igual que el de Sasha. Es a propósito: acá lo que
 * está del otro lado cuesta plata, así que "no pude contar" tiene que frenar, no
 * dejar pasar. Ver el llamador.
 */
export async function permitirGeneracion(
  { userId, tier, enPrueba, day, que }: PedidoIA,
  contar: Contador = contarConTope,
): Promise<VeredictoIA> {
  const rafaga = await contar(`ia-dig:${que}:${userId}`, RAFAGA_IA, VENTANA_RAFAGA_MS);
  if (!rafaga.permitido) return { permitido: false, motivo: "rafaga", mensaje: MENSAJES.rafaga };

  /* El diario es de la CUENTA y no del botón: los dos botones baratos comparten
     el mismo techo diario. Contarlos por separado le daría a una cuenta Free el
     doble de generaciones que las que dice su número. */
  const diario = await contar(`ia-dig-dia:${userId}`, DIARIO_POR_PLAN[tier], UN_DIA_MS);
  if (!diario.permitido) return { permitido: false, motivo: "diario", mensaje: MENSAJES.diario };

  if (enPrueba) {
    const g = await contar(`ia-dig-prueba-dia:${day}`, GLOBAL_PRUEBA_DIARIO, UN_DIA_MS);
    avisarSiSeAcerca("global de pruebas", g.cuenta, GLOBAL_PRUEBA_DIARIO);
    if (!g.permitido) return { permitido: false, motivo: "global-prueba", mensaje: MENSAJES["global-prueba"] };
  }

  const total = await contar(`ia-dig-global-dia:${day}`, GLOBAL_DIARIO, UN_DIA_MS);
  avisarSiSeAcerca("global total", total.cuenta, GLOBAL_DIARIO);
  if (!total.permitido) return { permitido: false, motivo: "global", mensaje: MENSAJES.global };

  return { permitido: true };
}
