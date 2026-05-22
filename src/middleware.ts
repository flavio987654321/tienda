import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Rutas públicas: pueden ser llamadas desde cualquier dominio (tiendas embebidas)
const PUBLIC_API = /^\/api\/public\//;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const origin = req.headers.get("origin") ?? "";
  const isPreflight = req.method === "OPTIONS";

  // ── Rutas públicas: CORS abierto ──────────────────────────────────────────
  if (PUBLIC_API.test(pathname)) {
    const headers = new Headers({
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    if (isPreflight) return new NextResponse(null, { status: 204, headers });
    const res = NextResponse.next();
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  // ── Rutas privadas: solo mismo origen ────────────────────────────────────
  // origin vacío = request same-origin o server-to-server → se permite
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  if (isPreflight) return new NextResponse(null, { status: 204 });

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
