import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOSTS = new Set([
  "tiendaapps.com",
  "www.tiendaapps.com",
  "localhost",
]);

const PUBLIC_API = /^\/api\/public\//;

function isAllowedOrigin(origin: string, host: string): boolean {
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    if (originHost === "tiendaapps.com" || originHost === "www.tiendaapps.com") return true;
    if (originHost.endsWith(".tiendaapps.com")) return true;
    if (process.env.NEXT_PUBLIC_APP_URL && origin === process.env.NEXT_PUBLIC_APP_URL) return true;
    if (origin === "http://localhost:3000" || origin === "http://localhost:3001") return true;
  } catch {
    return false;
  }
  return false;
}

function handleCors(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;

  const origin = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  const isPreflight = request.method === "OPTIONS";

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

  if (origin && !isAllowedOrigin(origin, host)) {
    return NextResponse.json({ error: "Solicitud no permitida" }, { status: 403 });
  }

  if (isPreflight) return new NextResponse(null, { status: 204 });
  return null;
}

async function runSupabaseAuth(request: NextRequest): Promise<NextResponse> {
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").split(":")[0];

  const isVercelPreview = host.endsWith(".vercel.app");
  const isPlatform = PLATFORM_HOSTS.has(host) || isVercelPreview;

  if (!isPlatform) {
    // Subdominio: luna.tiendaapps.com → /tienda/luna
    const subMatch = /^([a-z0-9-]+)\.tiendaapps\.com$/.exec(host);

    if (subMatch) {
      // Las rutas de API y assets pasan sin rewrite
      if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
        return NextResponse.next();
      }
      const slug = subMatch[1];
      const url = request.nextUrl.clone();
      url.pathname = `/tienda/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }

    // Dominio personalizado: buscar en Supabase por customDomain
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/Store?customDomain=eq.${encodeURIComponent(host)}&select=slug&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (res.ok) {
          const [store] = await res.json() as Array<{ slug: string }>;
          if (store?.slug) {
            const url = request.nextUrl.clone();
            url.pathname = `/tienda/${store.slug}${pathname === "/" ? "" : pathname}`;
            return NextResponse.rewrite(url);
          }
        }
      } catch {
        // Si falla el lookup deja pasar — la página 404 de Next.js lo maneja
      }
    }

    return NextResponse.next();
  }

  // Dominio principal: CORS + auth de Supabase
  const corsRes = handleCors(request);
  if (corsRes) return corsRes;

  return runSupabaseAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
