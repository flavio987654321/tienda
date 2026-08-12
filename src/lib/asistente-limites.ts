import { contarConTope } from "@/lib/rate-limit";

/* ── Cuántos mensajes de Sasha se pueden mandar, y quién los paga ────────────
 *
 * Cada mensaje le cuesta plata a TiendaApps, así que esto no es un tope de
 * cortesía: es el único freno entre una cuenta trucha y la factura de
 * Anthropic. Los cuatro topes son capas distintas y cada una tapa un agujero
 * que las otras no:
 *
 *   1. RÁFAGA — que nadie dispare un script contra el endpoint.
 *   2. DIARIO POR DUEÑO — el techo de una cuenta sola en el día.
 *   3. GLOBAL DE PRUEBAS — el techo de TODAS las cuentas en prueba juntas.
 *   4. GLOBAL TOTAL — el corta-corriente, por si algo que no previmos.
 *
 * El 3 es el importante y vale explicar por qué existe separado del 4. El
 * agujero real es que la prueba es gratis: alguien registra veinte cuentas,
 * cada una con su tope de dueño intacto, y ninguna capa "por usuario" se
 * entera de que son la misma persona. Un tope global las suma.
 *
 * Pero un global único tendría un costo feo: el que abusa se come el
 * presupuesto y deja sin Sasha a los que PAGAN. Por eso son dos. Las cuentas
 * en prueba compiten contra un presupuesto chico y aparte; una tienda que
 * paga no puede quedarse sin asistente porque haya cuentas truchas dando
 * vueltas — sólo la frena el corta-corriente, y ése está puesto tan arriba
 * que si salta es una emergencia de verdad.
 *
 * OJO — esto acota el daño, no lo hace imposible. El techo que de verdad
 * garantiza que no llegue una factura de $500 es el spending limit de la
 * cuenta de Anthropic, que se pone en su consola y vive fuera de este repo. */

/** Anti-script. Una persona escribiendo no se acerca ni de casualidad. */
export const LIMITE_RAFAGA = 30;
export const VENTANA_RAFAGA_MS = 10 * 60_000;

/** Una tienda que paga, en un día. Holgado a propósito: ya la estamos cobrando. */
export const LIMITE_DIARIO = 150;

/* Una cuenta en prueba, en un día. Más bajo, y no por mezquindad: la prueba
 * dura 7 días y no pide tarjeta, así que es la única parte del sistema donde
 * alguien puede gastar sin haber dado nunca un dato real. Cuarenta mensajes
 * por día alcanzan de sobra para conocer a Sasha — el que se queda corto con
 * eso no está probando, está haciendo otra cosa. */
export const LIMITE_DIARIO_PRUEBA = 40;

/* TODAS las cuentas en prueba juntas, en un día. Diez cuentas en prueba
 * usando el asistente a fondo el mismo día ya es mucho más de lo que pasa un
 * día normal; si se alcanza, o hubo un pico de altas real —y entonces este
 * número hay que subirlo— o alguien está registrando cuentas en serie. */
export const LIMITE_GLOBAL_PRUEBA_DIARIO = 400;

/* El corta-corriente: TODA la plataforma, en un día, pague o no.
 * No está pensado para que salte nunca. Está para que un agujero que no vimos
 * tenga un techo igual. */
export const LIMITE_GLOBAL_DIARIO = 2_000;

/** A partir de qué porcentaje de un tope global se avisa por consola. */
const AVISO_DESDE = 0.8;

const UN_DIA_MS = 24 * 60 * 60_000;

export type Motivo = "rafaga" | "diario" | "global-prueba" | "global";

export type Veredicto =
  | { permitido: true }
  | { permitido: false; motivo: Motivo; mensaje: string };

/** Cuenta un uso y dice si entra. Se inyecta para poder probar sin Redis. */
export type Contador = (clave: string, limite: number, ventanaMs: number) => Promise<{ permitido: boolean; cuenta: number }>;

export type Pedido = {
  userId: string;
  /** Si la suscripción está en período de prueba (o no hay suscripción). */
  enPrueba: boolean;
  /** El día de Argentina, `YYYY-MM-DD`. Va en la clave: el contador se cae solo. */
  day: string;
};

/* Los mensajes los lee el dueño de la tienda, no un desarrollador: dicen qué
   pasó y cuándo vuelve, nunca "rate limit" ni un número de tope. */
const MENSAJES: Record<Motivo, string> = {
  rafaga: "Mandaste muchos mensajes seguidos, esperá un momento.",
  diario: "Llegaste al límite de mensajes de hoy con Sasha.",
  "global-prueba": "Sasha está con mucha demanda en este momento. Probá de nuevo más tarde.",
  global: "Sasha está con mucha demanda en este momento. Probá de nuevo más tarde.",
};

function avisarSiSeAcerca(que: string, cuenta: number, limite: number): void {
  if (cuenta === Math.ceil(limite * AVISO_DESDE)) {
    console.warn(`[asistente] el tope ${que} va en ${cuenta} de ${limite} — si esto es uso real, hay que subirlo.`);
  }
  if (cuenta === limite + 1) {
    console.error(`[asistente] TOPE ${que} ALCANZADO (${limite}). A partir de acá se rechaza.`);
  }
}

/**
 * Si este mensaje se manda o no.
 *
 * El ORDEN no es decorativo. Los contadores suman aunque el pedido se
 * rechace —así es `INCR`—, así que los topes globales van ÚLTIMOS: si fueran
 * primero, alguien ya bloqueado por su tope personal seguiría comiéndose el
 * presupuesto de todos con cada intento.
 *
 * Tira si Redis no contesta. Es a propósito, ver el llamador.
 */
export async function permitirMensaje(
  { userId, enPrueba, day }: Pedido,
  contar: Contador = contarConTope
): Promise<Veredicto> {
  const rafaga = await contar(`asistente:${userId}`, LIMITE_RAFAGA, VENTANA_RAFAGA_MS);
  if (!rafaga.permitido) return { permitido: false, motivo: "rafaga", mensaje: MENSAJES.rafaga };

  const topeDiario = enPrueba ? LIMITE_DIARIO_PRUEBA : LIMITE_DIARIO;
  const diario = await contar(`asistente-dia:${userId}`, topeDiario, UN_DIA_MS);
  if (!diario.permitido) return { permitido: false, motivo: "diario", mensaje: MENSAJES.diario };

  if (enPrueba) {
    const g = await contar(`asistente-prueba-dia:${day}`, LIMITE_GLOBAL_PRUEBA_DIARIO, UN_DIA_MS);
    avisarSiSeAcerca("global de pruebas", g.cuenta, LIMITE_GLOBAL_PRUEBA_DIARIO);
    if (!g.permitido) return { permitido: false, motivo: "global-prueba", mensaje: MENSAJES["global-prueba"] };
  }

  const total = await contar(`asistente-global-dia:${day}`, LIMITE_GLOBAL_DIARIO, UN_DIA_MS);
  avisarSiSeAcerca("global total", total.cuenta, LIMITE_GLOBAL_DIARIO);
  if (!total.permitido) return { permitido: false, motivo: "global", mensaje: MENSAJES.global };

  return { permitido: true };
}
