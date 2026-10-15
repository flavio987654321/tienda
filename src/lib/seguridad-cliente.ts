"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";

/**
 * Lo que usan desde el navegador la pantalla de verificación, la pestaña
 * Seguridad y el "Verificá que sos vos". Ver `lib/seguridad-cuenta`.
 *
 * Todo con tiempo límite: si la red no contesta, la pantalla dice "no pudimos
 * conectar" y ofrece reintentar. Nunca una ruedita que gira para siempre.
 */

export const MENSAJE_SIN_CONEXION = "No pudimos conectar. Revisá tu internet y probá de nuevo.";
const ESPERA_MS = 20_000;
/** La huella espera a que la persona toque el sensor: más margen que un pedido. */
const ESPERA_HUELLA_MS = 120_000;

export type Respuesta<T> = { ok: true; data: T } | { ok: false; status: number; error: string; data: Record<string, unknown> };

export async function pedir<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<Respuesta<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(ESPERA_MS),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data as T };
    return { ok: false, status: res.status, error: typeof data?.error === "string" ? data.error : "Algo falló. Probá de nuevo.", data };
  } catch {
    return { ok: false, status: 0, error: MENSAJE_SIN_CONEXION, data: {} };
  }
}

/** ¿Este navegador puede usar huella o cara de este mismo dispositivo? */
export async function hayHuellaEnEsteDispositivo(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** ¿Puede usar llaves de acceso en general (también la de otro celular, con QR)? */
export function hayLlavesDeAcceso(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** El nombre con que se guarda una huella: "Huella · Chrome en Windows · 15/10". Supabase pide nombres distintos. */
export function nombreParaHuella(): string {
  const d = new Date();
  return `Huella · ${describirDispositivo(navigator.userAgent)} · ${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Traduce lo que tira el navegador o Supabase a algo que se entienda. */
export function errorDeHuella(e: unknown): string {
  const nombre = (e as { name?: string; cause?: { name?: string } } | null)?.cause?.name ?? (e as { name?: string } | null)?.name ?? "";
  const mensaje = String((e as { message?: string } | null)?.message ?? "");
  if (nombre === "NotAllowedError" || /not allowed|cancel/i.test(mensaje)) {
    return "Se canceló o se pasó el tiempo. Probá de nuevo y tocá el sensor cuando te lo pida.";
  }
  if (nombre === "InvalidStateError") return "Esta huella ya estaba guardada en tu cuenta.";
  if (nombre === "SecurityError") return "Este navegador no deja usar la huella en esta página.";
  if (/disabled|not enabled|webauthn/i.test(mensaje) && /enroll|factor|mfa/i.test(mensaje)) {
    return "La huella todavía no está disponible. Usá la app de códigos.";
  }
  if (/fetch|network|timeout/i.test(mensaje)) return MENSAJE_SIN_CONEXION;
  return "No se pudo usar la huella. Probá de nuevo o usá otro método.";
}

/** Pasa el segundo paso con una huella ya guardada. */
export async function verificarConHuella(supabase: SupabaseClient, factorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase.auth.mfa.webauthn.authenticate({
      factorId,
      webauthn: { signal: AbortSignal.timeout(ESPERA_HUELLA_MS) },
    });
    if (error) return { ok: false, error: errorDeHuella(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorDeHuella(e) };
  }
}

/**
 * Guarda una huella nueva y devuelve su id. Antes borra las que hayan quedado a
 * medio activar de un intento cortado: si no, Supabase rechaza la nueva.
 */
export async function registrarHuella(supabase: SupabaseClient): Promise<{ ok: true; factorId: string } | { ok: false; error: string }> {
  try {
    await limpiarSinVerificar(supabase);
    const { error } = await supabase.auth.mfa.webauthn.register({
      friendlyName: nombreParaHuella(),
      webauthn: { signal: AbortSignal.timeout(ESPERA_HUELLA_MS) },
    });
    if (error) return { ok: false, error: errorDeHuella(error) };
    const { data } = await supabase.auth.mfa.listFactors();
    const nueva = (data?.all ?? [])
      .filter((f) => f.factor_type === "webauthn" && f.status === "verified")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!nueva) return { ok: false, error: "No se pudo confirmar la huella. Probá de nuevo." };
    return { ok: true, factorId: nueva.id };
  } catch (e) {
    await limpiarSinVerificar(supabase);
    return { ok: false, error: errorDeHuella(e) };
  }
}

export async function limpiarSinVerificar(supabase: SupabaseClient): Promise<void> {
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  } catch { /* si no se puede, el intento siguiente lo vuelve a probar */ }
}
