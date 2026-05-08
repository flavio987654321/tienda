import { NextResponse, type NextRequest } from "next/server";
import { proxy } from "@/proxy";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function verifyCsrf(request: NextRequest): NextResponse | null {
  if (!MUTATION_METHODS.has(request.method)) return null;
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests with no Origin (same-origin curl/server-to-server without Origin header)
  // but block cross-origin browser requests that do send an Origin
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: "Solicitud no permitida" }, { status: 403 });
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;
  return proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
