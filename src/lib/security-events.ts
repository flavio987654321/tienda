import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type SecurityEventKind = "SERVER_ERROR" | "RATE_LIMITED" | "CAPTCHA_REJECTED";
export type SecurityEventOrigin = "AUTOMATION_SIGNAL" | "ANONYMOUS" | "REGISTERED_USER" | "UNKNOWN";

type SecurityEventInput = {
  kind: SecurityEventKind;
  origin: SecurityEventOrigin;
  route: string;
  method: string;
  status?: number;
  reason?: string;
  errorName?: string;
  requestId?: string;
  headers?: { get(name: string): string | null } | Record<string, string | string[] | undefined>;
};

export const DIAS_RETENCION_EVENTOS_SEGURIDAD = 30;
export const VENTANA_ALERTAS_MINUTOS = 5;
export const UMBRAL_EVENTOS_REPETIDOS = 10;
export const LIMITE_ALERTAS_ACTIVAS = 25;
const DAY_MS = 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;
let warnedAboutKey = false;

function headerValue(
  headers: SecurityEventInput["headers"],
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof Headers !== "undefined" && headers instanceof Headers) return headers.get(name);
  const record = headers as Record<string, string | string[] | undefined>;
  const key = Object.keys(record).find((header) => header.toLowerCase() === name.toLowerCase());
  const value = key ? record[key] : undefined;
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function huellaTemporalDeIp(
  headers: SecurityEventInput["headers"],
  key = process.env.ENCRYPTION_KEY,
): string | null {
  const forwarded = headerValue(headers, "x-forwarded-for");
  const ip = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);

  if (!ip || ip === "unknown" || !key || !/^[a-f\d]{64}$/i.test(key)) return null;

  return createHmac("sha256", Buffer.from(key, "hex")).update(ip).digest("hex").slice(0, 24);
}

export async function registrarEventoSeguridad(input: SecurityEventInput): Promise<void> {
  const key = process.env.ENCRYPTION_KEY;
  if (
    headerValue(input.headers, "x-forwarded-for")
    && (!key || !/^[a-f\d]{64}$/i.test(key))
    && !warnedAboutKey
  ) {
    warnedAboutKey = true;
    console.error("[security-events] ENCRYPTION_KEY no configurada; se omite la huella de IP");
  }

  try {
    await prisma.securityEvent.create({
      data: {
        kind: input.kind,
        origin: input.origin,
        route: input.route.slice(0, 180),
        method: input.method.slice(0, 12).toUpperCase(),
        status: input.status ?? null,
        reason: input.reason?.slice(0, 80) ?? null,
        errorName: input.errorName?.slice(0, 80) ?? null,
        requestId: input.requestId?.slice(0, 100) ?? null,
        ipFingerprint: huellaTemporalDeIp(input.headers, key),
      },
    });
  } catch (error) {
    console.error(
      "[security-events] No se pudo guardar el evento",
      error instanceof Error ? error.name : "UnknownError",
    );
    return;
  }

  const ahora = Date.now();
  if (ahora - lastCleanupAt >= DAY_MS) {
    lastCleanupAt = ahora;
    const vence = new Date(ahora - DIAS_RETENCION_EVENTOS_SEGURIDAD * DAY_MS);
    try {
      await prisma.securityEvent.deleteMany({ where: { createdAt: { lt: vence } } });
    } catch (error) {
      console.error(
        "[security-events] No se pudieron depurar los eventos vencidos",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }
}
