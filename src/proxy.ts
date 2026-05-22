import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_API = /^\/api\/public\//;

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function handleApiCors(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;

  const origin = request.headers.get("origin") ?? "";
  const isPreflight = request.method === "OPTIONS";

  // Rutas públicas: CORS abierto (catálogos de tienda embebidos)
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

  // Rutas privadas: bloquear orígenes desconocidos
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    const host = request.headers.get("host") ?? "";
    // Permitir si el origen coincide con el host actual
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Solicitud no permitida" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Solicitud no permitida" }, { status: 403 });
    }
  }

  if (isPreflight) return new NextResponse(null, { status: 204 });
  return null;
}

export async function proxy(request: NextRequest) {
  // CORS / CSRF para rutas API
  const corsResponse = handleApiCors(request);
  if (corsResponse) return corsResponse;

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
