import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { medidaPermitida } from "@/lib/medidas-icono";
import { prisma } from "@/lib/prisma";
import { urlDeDescargaPermitida } from "@/lib/url-utils";

export const runtime = "nodejs";

/* El ícono de la tienda para la app instalada.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * Antes el manifest apuntaba directo a `store.logo`, el archivo tal cual lo subió
 * el comerciante, y le declaraba al navegador tres cosas que no eran ciertas:
 *
 *   1. `sizes: "192x192"` y `"512x512"` sobre una imagen de cualquier medida. Un
 *      logo de 120px entraba igual —Chrome le cree al manifest— y quedaba
 *      estirado y borroso en la pantalla de inicio.
 *   2. `type: "image/png"` cuando `/api/upload` acepta también jpeg, webp y gif.
 *   3. `purpose: "maskable"` sobre un logo sin margen: Android le aplica su
 *      máscara y le come los bordes.
 *
 * Componiendo el ícono acá las tres pasan a ser verdad: sale PNG, sale en la
 * medida exacta que se pide, y la versión maskable deja el margen que la máscara
 * necesita. Es el mismo enfoque que ya usaba el panel en `/api/icons/dashboard`,
 * que era justo la superficie donde el ícono importa menos.
 *
 * ── La zona segura del maskable ──────────────────────────────────────────────
 * La especificación dice que el sistema puede recortar hasta un círculo del 80%
 * del lado. Un cuadrado centrado del 56% tiene diagonal 79%, así que entra entero
 * en ese círculo pase lo que pase. Por eso el logo va más chico acá que en `any`,
 * y por eso el fondo llega hasta el borde sin esquinas redondeadas: cualquier
 * transparencia en la punta se vería como un mordisco cuando el sistema aplica
 * una máscara más ancha que el círculo.
 */

/* El tope tiene que ser el MISMO que deja subir `/api/upload` (4 MB), no uno más
   chico: cualquier logo por debajo de ese número ya fue aceptado por la
   plataforma y tiene que poder dibujarse.
   Esto estaba en 1,5 MB, copiado del generador de OG —donde ese número sí tiene
   sentido, porque ahí la imagen es un fondo y no el tema—. El efecto era que un
   logo de entre 1,5 y 4 MB se descartaba y el ícono salía con la inicial de la
   tienda. Pasaba de verdad: el logo de "amaranta" pesa 1,82 MB y su app se
   instalaba con una "A" en vez de su marca, que es exactamente lo que este
   archivo viene a arreglar. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** El logo, ya embebido. Satori no resuelve URLs externas de forma confiable. */
async function logoComoDataUrl(url: string): Promise<string | null> {
  // `store.logo` lo escribe el comerciante y el servidor va a ir a buscarlo, así
  // que antes hay que ver a dónde apunta. El porqué está en `urlDeDescargaPermitida`.
  const permitida = urlDeDescargaPermitida(url);
  if (!permitida) {
    console.error("[icons/tienda] url de logo rechazada:", url);
    return null;
  }

  try {
    const controller = new AbortController();
    // 8s y no 4: son hasta 4 MB desde el storage. Quedarse esperando un poco más
    // es mejor que devolver la inicial, que es lo que ve el usuario si esto falla.
    const timer = setTimeout(() => controller.abort(), 8000);
    // `redirect: "error"` para que un 302 no sirva de puerta trasera: sin esto, una
    // url pública podía redirigir a una dirección interna y la guarda de arriba,
    // que sólo miró la primera, no se enteraba.
    const res = await fetch(permitida, {
      cache: "no-store",
      signal: controller.signal,
      redirect: "error",
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("[icons/tienda] el logo contesto", res.status, url);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.error("[icons/tienda] el logo no es una imagen:", contentType, url);
      return null;
    }

    // Cortar por el `content-length` ANTES de bajar el cuerpo, como ya hacía la
    // ruta de OG. Sin esto, el chequeo de tamaño de abajo recién actúa cuando la
    // respuesta entera ya está en memoria — o sea que una url que devuelve un
    // archivo enorme se carga igual, y recién después se descarta.
    const declarado = res.headers.get("content-length");
    if (declarado && Number(declarado) > MAX_IMAGE_BYTES) {
      console.error("[icons/tienda] logo demasiado grande (declarado):", declarado, url);
      return null;
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      console.error("[icons/tienda] logo demasiado grande:", buf.byteLength, url);
      return null;
    }

    return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
  } catch (e) {
    // Con `catch {}` a secas, un logo que no carga se degradaba a la inicial sin
    // dejar rastro en ningún lado. Que quede escrito: el ícono es lo que se vende.
    console.error("[icons/tienda] no se pudo bajar el logo:", (e as Error).message, url);
    return null;
  }
}

/** Un color muy oscuro como fondo deja el ícono negro sobre negro. */
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  /* Sólo las medidas que se piden de verdad, en vez de cualquier número entre 16
     y 1024. El `NaN` ya estaba cubierto acá, pero quedaba lo otro: cada medida
     distinta es una imagen distinta que la CDN no tiene guardada, así que hay que
     componerla de cero — y en ESTA ruta componer incluye salir a la red a buscar
     el logo del comerciante. Pidiendo `size=1023`, `1022`, `1021`… cualquiera
     hace trabajar al servidor todo lo que quiera, sin sesión y sin límite.
     Con la lista, el conjunto de respuestas es finito y la CDN las guarda todas.
     Ver `medidaPermitida`. */
  const size = medidaPermitida(req.nextUrl.searchParams.get("size"));
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, logo: true, logoColor: true, primaryColor: true },
  });

  if (!store) return new Response("Not found", { status: 404 });

  const fondo = colorUsable(store.logoColor) || colorUsable(store.primaryColor) || "#6366f1";
  const dataUrl = store.logo ? await logoComoDataUrl(store.logo) : null;

  // Ver el comentario de arriba: 56% entra en el círculo de recorte, 72% no
  // necesita entrar porque `any` se muestra tal cual.
  const ladoLogo = Math.round(size * (maskable ? 0.56 : 0.72));
  const radio = maskable ? 0 : Math.round(size * 0.22);

  // El `.trim()` y el filtro no sobran: un nombre que empieza con espacio partía
  // en un primer trozo vacío y la inicial salía en blanco — un ícono con el color
  // de la tienda y nada adentro.
  const iniciales = store.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: fondo,
          borderRadius: radio,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt=""
            width={ladoLogo}
            height={ladoLogo}
            style={{ width: ladoLogo, height: ladoLogo, objectFit: "contain" }}
          />
        ) : (
          <span
            style={{
              fontSize: Math.round(size * (maskable ? 0.3 : 0.38)),
              fontWeight: 800,
              color: esClaro(fondo) ? "#111827" : "#ffffff",
            }}
          >
            {iniciales}
          </span>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        // El logo cambia cuando el comerciante lo cambia; una hora de caché es
        // suficiente y evita recomponer el PNG en cada arranque de la app.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
