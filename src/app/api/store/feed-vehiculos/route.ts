import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { monedaDe, monedaDeTienda } from "@/lib/monedaVehiculo";
import { PUBLIC_APP_URL as APP_URL } from "@/lib/site";
import { aCsv, atributos, filaDeVehiculo, CENTRO_DE_PROVINCIA, type FilaVehiculo, type Ubicacion } from "@/lib/feedVehiculosMeta";

/* La localidad en el mapa, con el servicio oficial de georreferenciación del
   Estado (datos.gob.ar, gratis y sin clave). Meta pide latitud y longitud de la
   agencia y muestra los anuncios a gente cerca: la capital de la provincia
   ponía a una agencia de Pinamar en La Plata, a 300 km. Se recuerda mientras
   vive la función; si el servicio no contesta, va la capital. */
const yaUbicadas = new Map<string, Ubicacion | null>();
async function ubicarLocalidad(provincia: string, localidad: string): Promise<Ubicacion | null> {
  const clave = `${provincia}|${localidad}`.toLowerCase();
  if (yaUbicadas.has(clave)) return yaUbicadas.get(clave)!;
  let r: Ubicacion | null = null;
  try {
    const q = new URLSearchParams({ nombre: localidad, provincia: provincia === "CABA" ? "Ciudad Autónoma de Buenos Aires" : provincia, max: "1", campos: "centroide" });
    const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${q}`, { signal: AbortSignal.timeout(4000) });
    const c = res.ok ? ((await res.json()) as { localidades?: { centroide?: { lat?: number; lon?: number } }[] }).localidades?.[0]?.centroide : null;
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lon)) r = { lat: c.lat!, lng: c.lon! };
  } catch { /* sin respuesta: va la capital */ }
  yaUbicadas.set(clave, r);
  return r;
}

// GET /api/store/feed-vehiculos?store=<slug>
// El catálogo de VEHÍCULOS para Meta, en CSV. Ver `lib/feedVehiculosMeta`.
// Con `&ver=1` devuelve un resumen en JSON (cuántos van y por qué quedó afuera
// cada uno) para revisarlo antes de conectarlo.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`store-feed-vehiculos:${ip}`, 30, 60 * 60_000))) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("store")?.trim() ?? "";
  if (!slug || !/^[a-z0-9-]{1,80}$/i.test(slug)) return new NextResponse("store inválido", { status: 400 });

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, isPublished: true },
    select: {
      name: true, slug: true, storeConfig: true,
      products: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, images: true, category: true, attributes: true, vehicleStatus: true },
        take: 500,
      },
    },
  });
  if (!store) return new NextResponse("No encontrado", { status: 404 });

  const principal = monedaDeTienda(store.storeConfig);
  // Cada localidad distinta una sola vez, todas juntas.
  const lugares = new Map<string, { provincia: string; localidad: string }>();
  for (const p of store.products) {
    const a = atributos(p.attributes);
    if (a["Provincia"] && a["Localidad"]) lugares.set(`${a["Provincia"]}|${a["Localidad"]}`, { provincia: a["Provincia"], localidad: a["Localidad"] });
  }
  const ubicadas = new Map<string, Ubicacion | null>();
  await Promise.all([...lugares].slice(0, 30).map(async ([k, l]) => ubicadas.set(k, await ubicarLocalidad(l.provincia, l.localidad))));
  const filas: FilaVehiculo[] = [];
  const salteados: { id: string; nombre: string; motivo: string }[] = [];
  for (const p of store.products) {
    const r = filaDeVehiculo(p, {
      urlBase: APP_URL, slug: store.slug, tienda: store.name,
      moneda: (x) => monedaDe(x, principal),
      ubicacionDe: (provincia, localidad) => (localidad && ubicadas.get(`${provincia}|${localidad}`)) || CENTRO_DE_PROVINCIA[provincia] || null,
    });
    if ("fila" in r) filas.push(r.fila);
    else salteados.push({ id: p.id, nombre: p.name, motivo: r.salteado });
  }

  if (searchParams.get("ver") === "1") {
    return NextResponse.json({ van: filas.length, salteados, muestra: filas[0] ?? null });
  }
  return new NextResponse(aCsv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
