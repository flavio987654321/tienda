import { contarConTope } from "@/lib/rate-limit";
import type { TierDigital } from "@/lib/planes-digitales";

/* ── Cuántos mensajes puede mandarle a Sasha una cuenta digital, y quién paga ─
 *
 * Es el mismo problema que `asistente-limites` (Sasha de tiendas) y se
 * resuelve con la misma forma, en un archivo APARTE y con claves de Redis
 * aparte, a propósito: los dos ecosistemas no comparten presupuesto, y los
 * ebooks (`ia-digitales`) tampoco. Si compartieran, una tarde de charla dejaría
 * a alguien sin poder armar su producto, o al revés.
 *
 * Lo que cambia respecto de tiendas, y por qué:
 *
 *   - El tope diario es POR PLAN y va contado POR DÍA ARGENTINO, no por
 *     ventana de 24 h desde el primer mensaje. Así "se te acabaron los de hoy"
 *     tiene una hora de vuelta que se puede decir: las 00:00. Una ventana
 *     deslizante no la tiene, y "esperá un rato" es lo que no queremos decir.
 *
 *   - Free NO tiene Sasha, y no es un tope en cero: se rechaza ANTES de tocar
 *     ningún contador. Free dura para siempre y no pide tarjeta; es la cuenta
 *     más fácil de fabricar en serie, y por eso el asistente —que cuesta plata
 *     por mensaje— es de los planes que pagan.
 *
 *   - El techo por mensaje es chico a propósito. Con Haiku y el prompt corto,
 *     un mensaje ronda medio centavo: 40 por día en Starter son como mucho
 *     US$6 por mes contra un plan de US$19,7, y en un uso normal (5 a 10
 *     mensajes) menos de US$1. Si alguna vez el tope corta a alguien que usa
 *     de verdad, se sube ESE número; lo que no se hace es sacarlo.
 *
 * Y la regla que no se negocia: si Redis no contesta, se FRENA. Del otro lado
 * hay algo que se paga; "no pude contar" corta y nunca deja pasar. El techo
 * de verdad sigue siendo el spending limit de la cuenta de Anthropic. */

/** Anti-script. Una persona escribiendo no se acerca. */
export const RAFAGA_SASHA = 20;
export const VENTANA_RAFAGA_MS = 10 * 60_000;

/** Por día argentino, por plan. Free no tiene (ver arriba). */
export const DIARIO_POR_PLAN: Record<TierDigital, number> = {
  FREE: 0,
  STARTER: 40,
  PRO: 80,
};

/* TODAS las cuentas digitales juntas, en un día. Diez cuentas Pro usándola a
 * fondo el mismo día son 800; si se alcanza, o hubo un pico real —y hay que
 * subirlo— o alguien fabricó cuentas pagas, que es raro porque pagan. Está
 * para que un agujero que no vimos tenga techo igual. */
export const GLOBAL_SASHA_DIARIO = 800;

/** A partir de qué porcentaje del tope global se avisa por consola. */
const AVISO_DESDE = 0.8;
/** El contador diario vive un día y un poco más: la clave lleva el día, así
 *  que no importa cuándo venza mientras no venza antes de medianoche. */
const VIDA_DEL_CONTADOR_DIARIO_MS = 26 * 60 * 60_000;

export type MotivoSasha = "plan" | "rafaga" | "diario" | "global";

export type VeredictoSasha =
  | { permitido: true; usados: number; tope: number }
  | { permitido: false; motivo: MotivoSasha; mensaje: string };

/** Cuenta un uso y dice si entra. Se inyecta para poder probar sin Redis. */
export type Contador = (clave: string, limite: number, ventanaMs: number) => Promise<{ permitido: boolean; cuenta: number }>;

export type PedidoSasha = {
  userId: string;
  tier: TierDigital;
  /** El día de Argentina, `YYYY-MM-DD`. Va en la clave: el contador se cae solo. */
  day: string;
  /** La hora de Argentina (0–23), para decir cuánto falta para las 00:00. */
  hora: number;
};

/** "1 hora", "7 horas", "menos de una hora". */
export function horasHastaManana(hora: number): string {
  const faltan = 24 - Math.max(0, Math.min(23, hora));
  if (faltan <= 1) return "menos de una hora";
  return `${faltan} horas`;
}

/* Los lee quien vende, no un desarrollador: dicen qué pasó y cuándo vuelve,
   nunca "rate limit" ni un número de tope. */
export function mensajeDeTope(motivo: MotivoSasha, hora: number): string {
  switch (motivo) {
    case "plan":
      return "Sasha es de los planes Starter y Pro. Podés pasarte desde Mi cuenta.";
    case "rafaga":
      return "Mandaste muchos mensajes seguidos. Esperá un minuto y seguimos.";
    case "diario":
      return `Se te acabaron los mensajes de hoy con Sasha. Vuelven a las 00:00, en ${horasHastaManana(hora)}.`;
    case "global":
      return "Sasha está con mucha demanda en este momento. Probá de nuevo más tarde.";
  }
}

function avisarSiSeAcerca(que: string, cuenta: number, limite: number): void {
  if (cuenta === Math.ceil(limite * AVISO_DESDE)) {
    console.warn(`[sasha-digital] el tope ${que} va en ${cuenta} de ${limite} — si esto es uso real, hay que subirlo.`);
  }
  if (cuenta === limite + 1) {
    console.error(`[sasha-digital] TOPE ${que} ALCANZADO (${limite}). A partir de acá se rechaza.`);
  }
}

/**
 * Si este mensaje se manda o no.
 *
 * El ORDEN no es decorativo. Los contadores suman aunque el pedido se rechace
 * —así es `INCR`—, así que el global va ÚLTIMO: si fuera primero, alguien ya
 * bloqueado por su tope personal seguiría comiéndose el presupuesto de todos
 * con cada intento. Y Free se rechaza antes de contar nada.
 *
 * Tira si Redis no contesta. Es a propósito, ver el llamador.
 */
export async function permitirMensajeSasha(
  { userId, tier, day, hora }: PedidoSasha,
  contar: Contador = contarConTope,
): Promise<VeredictoSasha> {
  const tope = DIARIO_POR_PLAN[tier] ?? 0;
  if (tope <= 0) return { permitido: false, motivo: "plan", mensaje: mensajeDeTope("plan", hora) };

  const rafaga = await contar(`sasha-digital:${userId}`, RAFAGA_SASHA, VENTANA_RAFAGA_MS);
  if (!rafaga.permitido) return { permitido: false, motivo: "rafaga", mensaje: mensajeDeTope("rafaga", hora) };

  const diario = await contar(`sasha-digital-dia:${userId}:${day}`, tope, VIDA_DEL_CONTADOR_DIARIO_MS);
  if (!diario.permitido) return { permitido: false, motivo: "diario", mensaje: mensajeDeTope("diario", hora) };

  const total = await contar(`sasha-digital-global:${day}`, GLOBAL_SASHA_DIARIO, VIDA_DEL_CONTADOR_DIARIO_MS);
  avisarSiSeAcerca("global de digitales", total.cuenta, GLOBAL_SASHA_DIARIO);
  if (!total.permitido) return { permitido: false, motivo: "global", mensaje: mensajeDeTope("global", hora) };

  return { permitido: true, usados: diario.cuenta, tope };
}

/* ── Cuánto cuesta, para el que mira los números ───────────────────────────
 *
 * Precios de Haiku 4.5 por millón de tokens, en dólares. Están acá y no en la
 * consola de Anthropic porque el admin los necesita para pasar de tokens a
 * plata; si cambian, se cambian acá y toda la cuenta se actualiza. */
export const PRECIO_HAIKU_USD_POR_MILLON = { entrada: 1, salida: 5, cacheLeido: 0.1, cacheEscrito: 1.25 } as const;

export type TokensDeRespuesta = { tokensEntrada: number; tokensSalida: number; tokensCacheLeido: number; tokensCacheEscrito: number };

/** Dólares que costó una respuesta (o la suma de muchas). */
export function costoEnDolares(t: TokensDeRespuesta): number {
  const p = PRECIO_HAIKU_USD_POR_MILLON;
  return (t.tokensEntrada * p.entrada + t.tokensSalida * p.salida + t.tokensCacheLeido * p.cacheLeido + t.tokensCacheEscrito * p.cacheEscrito) / 1_000_000;
}
