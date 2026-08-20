import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsMfaChallenge } from "@/lib/mfa";

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

type SupabaseMiddleware = ReturnType<typeof createServerClient>;

async function runSupabaseAuth(
  request: NextRequest
): Promise<{ response: NextResponse; supabase: SupabaseMiddleware | null }> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return { response, supabase: null };

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
  return { response, supabase };
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

    /* La búsqueda va contra nuestra propia API, no contra la REST de Supabase.
       Antes le pegaba a `/rest/v1/Store` con la clave pública y eso NUNCA
       funcionó: las tablas las creó Prisma y los roles de PostgREST no tienen
       permiso sobre ellas, así que siempre volvía 42501. Con el `if (res.ok)` de
       abajo fallaba en silencio y ningún dominio propio resolvió jamás.
       Que PostgREST no llegue a las tablas es deseable y se deja como está; la
       consulta se mudó a /api/public/dominio, que usa Prisma. Ver ese archivo. */
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (appUrl) {
      try {
        const res = await fetch(
          `${appUrl}/api/public/dominio?host=${encodeURIComponent(host)}`,
          // El dominio propio de una tienda no cambia nunca en la práctica; sin
          // cache esto sería una consulta a la base por cada visita.
          { next: { revalidate: 300 } }
        );
        if (res.ok) {
          const { slug } = await res.json() as { slug: string | null };
          if (slug) {
            const url = request.nextUrl.clone();
            url.pathname = `/tienda/${slug}${pathname === "/" ? "" : pathname}`;
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

  const { response: res, supabase } = await runSupabaseAuth(request);

  // Segundo factor para los ENDPOINTS del admin. El gate de las páginas vive en el
  // layout de /admin, pero los /api/admin no pasan por ese layout: sin esto, una
  // sesión con la contraseña pero sin el 2FA (aal1) no vería la UI pero igual
  // podría llamar las rutas de admin (banear, eliminar, cambiar suscripciones).
  // Acá se cierran para todos de una, incluidos los endpoints que se agreguen
  // después. `needsMfaChallenge` falla abierto, así que un error no bloquea nada.
  if (supabase && pathname.startsWith("/api/admin")) {
    if (await needsMfaChallenge(supabase)) {
      return NextResponse.json(
        { error: "Verificación en dos pasos requerida" },
        { status: 403 }
      );
    }
  }

  // Headers de seguridad para el panel admin
  if (pathname.startsWith("/admin")) {
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
