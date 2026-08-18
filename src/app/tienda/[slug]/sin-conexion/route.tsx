import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/* La pantalla de "sin conexión" DE ESTA TIENDA.
 *
 * ── Por qué no alcanzaba con `public/offline.html` ───────────────────────────
 * Ese archivo es uno solo para todo el mundo y dice "TiendaApps". Alguien que
 * instaló la app de su almacén de barrio, se queda sin señal y abre el ícono,
 * veía la marca de otro. Toda la promesa del premium es que esa app es del
 * comerciante; el momento en que algo falla es justo cuando peor cae que
 * aparezca un nombre que no es el suyo.
 *
 * Un archivo estático no puede arreglarse: no tiene forma de saber de qué tienda
 * es. Pero el service worker SÍ — cada tienda registra el suyo con scope
 * `/tienda/<slug>`, así que puede leer `self.registration.scope`, deducir el slug
 * y guardarse ESTA página en vez de la genérica. Ver el `install` de `sw.js`.
 *
 * ── Tiene que bastarse sola ──────────────────────────────────────────────────
 * Se muestra cuando NO hay red, así que no puede pedir nada: ni una hoja de
 * estilos, ni una fuente, ni el logo desde el storage. Por eso los estilos van
 * en línea y el logo viaja adentro del HTML como data URI. Si algo de esto
 * apuntara a una URL, se vería roto exactamente en el único momento en que esta
 * página existe.
 *
 * Es un `route` y no un `page` a propósito: hace falta controlar el documento
 * entero, sin el layout ni los scripts de la tienda, que offline tampoco cargan.
 */

/** El ícono ya compuesto, embebido. Si falla, la página sale igual con la inicial. */
async function iconoEmbebido(origin: string, slug: string): Promise<string | null> {
  try {
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), 8000);
    const res = await fetch(
      `${origin}/api/icons/tienda/${encodeURIComponent(slug)}?size=192&purpose=any`,
      { cache: "no-store", signal: controlador.signal }
    );
    clearTimeout(reloj);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

function colorUsable(hex: string | null): string | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 40 ? null : hex;
}

function esClaro(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

/* Nada de lo que entra acá se escribe crudo en el HTML.
 *
 * Acá NO hay React que escape por su cuenta: esto arma un documento pegando
 * strings, así que el nombre de la tienda —que lo escribe el comerciante— entraría
 * tal cual. Un nombre como `</title><script>…` sería XSS servido desde el dominio
 * de la plataforma, en una página que además queda GUARDADA en el service worker
 * del visitante.
 *
 * La comilla simple va aunque hoy no haya ningún atributo que la use: es una línea,
 * y protege del día en que alguien agregue uno y no se acuerde de esto. */
function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, logoColor: true, primaryColor: true },
  });

  if (!store) return new Response("Not found", { status: 404 });

  const acento = colorUsable(store.logoColor) || colorUsable(store.primaryColor) || "#6366f1";
  const icono = await iconoEmbebido(new URL(req.url).origin, slug);
  const nombre = escapar(store.name);
  const inicial = escapar(store.name.trim().charAt(0).toUpperCase() || "?");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Sin conexión — ${nombre}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    background:#f9fafb;min-height:100svh;display:flex;align-items:center;
    justify-content:center;padding:1.5rem;color:#111827;-webkit-font-smoothing:antialiased;
  }
  .card{
    background:#fff;border-radius:1.5rem;padding:2.5rem 2rem;max-width:340px;width:100%;
    text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.07);
    border:1px solid #e5e7eb;
  }
  .logo{
    width:5rem;height:5rem;border-radius:1.375rem;margin:0 auto 1.25rem;display:flex;
    align-items:center;justify-content:center;overflow:hidden;background:${acento};
    box-shadow:0 8px 24px -6px ${acento}66;
  }
  .logo img{width:100%;height:100%;object-fit:cover;display:block}
  .logo span{font-size:2rem;font-weight:800;color:${esClaro(acento) ? "#111827" : "#fff"}}
  .tienda{font-size:1.05rem;font-weight:700;margin-bottom:1.5rem;color:#111827}
  h1{font-size:1rem;font-weight:700;margin-bottom:.5rem}
  p{font-size:.875rem;color:#6b7280;line-height:1.6;margin-bottom:1.75rem}
  .btn{
    display:inline-flex;align-items:center;gap:.5rem;background:${acento};
    color:${esClaro(acento) ? "#111827" : "#fff"};border:none;border-radius:.875rem;
    padding:.8rem 1.75rem;font-size:.875rem;font-weight:700;cursor:pointer;
    transition:transform .1s,filter .15s;
  }
  .btn:hover{filter:brightness(1.08)}
  .btn:active{transform:scale(.97)}
</style>
</head>
<body>
  <div class="card">
    <div class="logo">
      ${icono ? `<img src="${icono}" alt="${nombre}" />` : `<span>${inicial}</span>`}
    </div>
    <div class="tienda">${nombre}</div>

    <h1>Sin conexión</h1>
    <p>No hay internet en este momento.<br />Cuando vuelvas a tener señal, tocá Reintentar.</p>

    <button class="btn" onclick="location.reload()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-5" />
      </svg>
      Reintentar
    </button>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      /* Se deja cachear una hora, igual que el ícono.
         Estaba en `no-store` pensando en que el service worker se quedara siempre
         con lo último. Pero el que la guarda es la Cache API, que no mira este
         header — así que lo único que hacía `no-store` era obligar a recomponer
         todo, incluida una render de Satori para el ícono, cada vez que un service
         worker arranca y pide refrescar. Y arrancan seguido.
         Con una hora, el logo tarda a lo sumo eso en actualizarse y deja de haber
         dos invocaciones caras por cada visita. */
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
