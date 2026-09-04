import { contarConTope } from "@/lib/rate-limit";

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
 * La forma sí es la misma, y a propósito: el mismo `contarConTope`, el mismo
 * orden, los globales últimos. Lo que ya se aprendió caro no se vuelve a
 * aprender.
 *
 * ── ⚠️ ACÁ ESTÁN LOS TOPES, NO EL CUPO ─────────────────────────────────────
 *
 * No son lo mismo y conviene no mezclarlos:
 *
 * - **Tope** — invisible, anti-abuso. Nadie lo ve ni lo vende. Vive en Redis y
 *   se olvida solo, que es lo correcto para una ráfaga. Es esto.
 * - **Cupo** — parte de lo que se vende: *"3 en el plan gratis"*, *"12 al
 *   empezar y 10 por mes en Pro"*. La persona lo ve gastarse y va escrito en la
 *   página de precios, así que **no puede vivir en Redis**: un contador con
 *   ventana se olvida y regala el cupo entero de nuevo. Vive en la base, en
 *   `lib/cupo-ia`.
 */

/* ── Capa 1: ráfaga ─────────────────────────────────────────────────────────
   Anti-script. Una persona armando productos no se acerca ni de casualidad:
   cada generación va seguida de leer tres fichas y decidir. */
export const RAFAGA_IA = 8;
export const VENTANA_RAFAGA_MS = 10 * 60_000;

/* ── Capa 2: el CUPO, que reemplazó al tope diario ──────────────────────────
 *
 * Acá hubo un tope diario por plan (10/20/40) y **se sacó el 04/09/26**, antes
 * de que existiera el botón. Dos motivos:
 *
 * 1. **Los números no cerraban.** 40 por día × 30 días × 1,35 centavos son
 *    US$16 al mes de un plan Pro de US$43. El botón barato terminaba costando
 *    como el caro en el peor caso, y el cálculo de márgenes del plan no lo tenía
 *    en cuenta porque asumía que esto "no se contaba".
 * 2. **Un tope diario no se puede explicar.** Se renueva solo, así que no hay
 *    número que mostrarle a la persona que signifique algo — y cuanto más
 *    números hay en pantalla, menos se entiende cuál se está gastando.
 *
 * Lo reemplaza un CUPO de verdad —arranque + mensual, contado en la base— que
 * vive en `lib/cupo-ia`. Ese sí es parte de lo que se vende y se muestra.
 *
 * Acá quedan sólo los frenos invisibles: la ráfaga y los dos globales.
 */

/* ── Capa 3: el global de las cuentas SIN ABONO ─────────────────────────────
 *
 * La capa que de verdad importa, y la que ninguna capa por-usuario puede tapar:
 * **veinte cuentas truchas son la misma persona** y cada una llega con su cupo
 * personal intacto.
 *
 * Va separado del global total para que el que abusa no deje sin IA al que paga.
 * Es la misma decisión que en Sasha, por el mismo motivo exacto.
 *
 * ⚠️ CUBRE A FREE, Y EL 04/09/26 NO LO CUBRÍA. Esto miraba sólo `TRIAL`, copiado
 * de Sasha sin mirar que acá el mapa es otro: una cuenta Free digital es
 * `ACTIVE` —no vence nunca, porque no se cobra— así que **quedaba afuera del
 * único freno que ve las cuentas en serie**.
 *
 * Y Free es la MÁS expuesta de las dos, no la menos: la prueba dura 7 días y es
 * una sola vez por cuenta (`pruebaYaUsada`); **Free no se termina nunca, no pide
 * tarjeta y se abren las que uno quiera**. Encontrado el 04/09/26 comparando con
 * cómo lo resuelve la competencia, que en su plan gratis da UNA generación y
 * nunca más.
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

export type MotivoIA = "rafaga" | "global-prueba" | "global";

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
  /**
   * Si la cuenta no paga: en prueba, **o en Free**.
   *
   * ⚠️ Free entra acá, y el 04/09/26 no entraba. Esta capa miraba sólo `TRIAL`,
   * y una cuenta Free digital es `ACTIVE` —no vence nunca, porque no se cobra—,
   * así que **quedaba afuera del único freno que ve las cuentas en serie**. Y es
   * la MÁS expuesta de las dos: la prueba dura 7 días y es una sola vez por
   * cuenta; Free no se termina nunca y se abren las que uno quiera.
   */
  sinAbono: boolean;
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
  { userId, sinAbono, day, que }: PedidoIA,
  contar: Contador = contarConTope,
): Promise<VeredictoIA> {
  const rafaga = await contar(`ia-dig:${que}:${userId}`, RAFAGA_IA, VENTANA_RAFAGA_MS);
  if (!rafaga.permitido) return { permitido: false, motivo: "rafaga", mensaje: MENSAJES.rafaga };

  if (sinAbono) {
    const g = await contar(`ia-dig-gratis-dia:${day}`, GLOBAL_PRUEBA_DIARIO, UN_DIA_MS);
    avisarSiSeAcerca("global de cuentas sin abono", g.cuenta, GLOBAL_PRUEBA_DIARIO);
    if (!g.permitido) return { permitido: false, motivo: "global-prueba", mensaje: MENSAJES["global-prueba"] };
  }

  const total = await contar(`ia-dig-global-dia:${day}`, GLOBAL_DIARIO, UN_DIA_MS);
  avisarSiSeAcerca("global total", total.cuenta, GLOBAL_DIARIO);
  if (!total.permitido) return { permitido: false, motivo: "global", mensaje: MENSAJES.global };

  return { permitido: true };
}
