import type { NextRequest } from "next/server";

// Vercel es el único proxy de confianza frente a la app: agrega la IP real del
// cliente como el ÚLTIMO valor de x-forwarded-for. Tomar el primero permite que
// el propio cliente falsifique la cabecera con un valor propio al principio de
// la lista y evada los límites por IP.
function lastForwardedIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
  return ips[ips.length - 1] ?? "unknown";
}

export function getClientIp(req: NextRequest): string {
  return lastForwardedIp(req.headers);
}

// Para Server Components / Pages, donde solo se tiene el Headers de next/headers()
// en vez de un NextRequest completo.
export function getClientIpFromHeaders(headersList: { get(name: string): string | null }): string {
  return lastForwardedIp(headersList);
}
