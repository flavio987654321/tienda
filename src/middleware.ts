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

/**
 * El camino pedido con el destino adelante — salvo que ya lo tenga puesto.
 *
 * ⚠️ El "salvo" no es un detalle. Sin él, `mitienda.tiendaapps.com/p/<id>/pagar`
 * se reescribía a `/p/<id>/p/<id>/pagar`, que no es ninguna ruta: 404. Y ése
 * no es un link raro, es EL BOTÓN DE COMPRAR de la página de venta digital
 * —`PaginaDeVenta` lo escribe así— que tiene que funcionar igual en
 * `tiendaapps.com/p/<id>`, en el subdominio y en el dominio propio. Salió de
 * auditar la landing propia, que al principio ponía `/pagar` pelado y tenía
 * el problema espejo: andaba en el subdominio y era 404 en la plataforma.
 *
 * La barra del final importa: sin ella un destino `/tienda/lu` se comería
 * `/tienda/luna`, que es OTRA tienda.
 */
function conElDestinoAdelante(destino: string, pathname: string): string {
  if (pathname === "/") return destino;
  if (pathname === destino || pathname.startsWith(`${destino}/`)) return pathname;
  return `${destino}${pathname}`;
}

/**
 * A dónde lleva un subdominio: `/tienda/<slug>` o `/p/<id>`.
 *
 * `null` si no se pudo averiguar. Quien llama tiene que seguir de largo con lo
 * que hacía antes — una tienda que ya andaba no puede romperse porque una
 * consulta nueva no contestó.
 *
 * El middleware corre en el edge y no puede usar Prisma; por eso el salto por
 * `/api/public/dominio`, que es el mismo que ya usa el dominio propio. Con
 * cache: sin él sería una consulta a la base por cada visita.
 */
async function donde(
  pregunta: "sub" | "host",
  valor: string,
  request: NextRequest,
): Promise<{ destino: string; redirigir: string | null } | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  if (!appUrl) return null;
  try {
    const res = await fetch(
      `${appUrl}/api/public/dominio?${pregunta}=${encodeURIComponent(valor)}`,
      /* Ni un subdominio ni un dominio propio cambian en la práctica. Sin cache
         esto sería una consulta a la base por cada visita a cada tienda. */
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const { slug, producto, redirigir } = await res.json() as {
      slug: string | null; producto: string | null; redirigir?: string | null;
    };
    /* La tienda primero: es lo que ya funcionaba. Los dos no pueden coexistir
       —lo impide el candado de `direccion-digital`— pero si algún día
       coexistieran, que gane lo viejo y no que se rompa. */
    if (slug) return { destino: `/tienda/${slug}`, redirigir: null };
    /* ⚠️ `redirigir` viene cuando la dueña del producto ya no tiene Pro: el
       dominio propio no se apaga, manda a la dirección de tiendaapps. Ver
       `aDondeRedirige` en `dominio-digital`. */
    if (producto) return { destino: `/p/${producto}`, redirigir: redirigir ?? null };
    return null;
  } catch {
    return null;
  }
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

      /* ⚠️ Ese nombre puede ser DOS cosas desde la Fase 5 bis: una tienda o un
         producto digital. Comparten el mismo espacio de nombres —los dos se
         traducen desde el mismo subdominio— y sólo la base sabe cuál es.

         Antes esto no preguntaba nada y reescribía derecho a `/tienda/…`. Si la
         consulta falla, se hace exactamente eso: **una tienda no puede dejar de
         funcionar porque se cayó una consulta que ella no necesita.** */
      const destino = await donde("sub", slug, request);
      if (destino) {
        url.pathname = conElDestinoAdelante(destino.destino, pathname);
        return NextResponse.rewrite(url);
      }

      url.pathname = conElDestinoAdelante(`/tienda/${slug}`, pathname);
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
    /* ⚠️ Y desde la Fase 5 bis un dominio propio también puede ser de un
       PRODUCTO digital, no sólo de una tienda. `Store.customDomain` es único por
       cuenta —uno— y una cuenta Pro trae hasta cinco productos, cada uno con el
       suyo. La misma función contesta por los dos casos; ver `donde`.

       Si la consulta no contesta, se deja pasar igual que antes: la 404 de Next
       lo maneja y ninguna tienda se rompe por una consulta caída. */
    const destino = await donde("host", host, request);
    if (destino) {
      /* Sin Pro, el dominio propio manda a la dirección de tiendaapps con la
         misma ruta y la misma búsqueda: un link de anuncio con `?utm=` llega
         entero. 307 y no 308: cuando vuelva a Pro tiene que dejar de
         redirigir, y un 308 el navegador lo recuerda para siempre. */
      if (destino.redirigir) {
        /* `redirigir` puede traer camino propio (`…/p/<id>`) o no traer
           ninguno (`https://<slug>.tiendaapps.com`): se separa para no
           escribirlo dos veces, igual que en las reescrituras de arriba. */
        /* Y con red: acá adentro una excepción es un 500 para TODAS las
           tiendas, no para ésta. Si el destino no se pudiera leer, se hace lo
           de siempre. */
        let aDonde = `${destino.redirigir}${pathname === "/" ? "" : pathname}`;
        try {
          const base = new URL(destino.redirigir);
          aDonde = base.origin + conElDestinoAdelante(base.pathname === "/" ? "" : base.pathname, pathname);
        } catch { /* se queda con lo de siempre */ }
        return NextResponse.redirect(`${aDonde}${request.nextUrl.search}`, 307);
      }
      const url = request.nextUrl.clone();
      url.pathname = conElDestinoAdelante(destino.destino, pathname);
      return NextResponse.rewrite(url);
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
