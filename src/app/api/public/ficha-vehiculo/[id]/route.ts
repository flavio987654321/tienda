import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { numeroWhatsApp } from "@/lib/whatsappTienda";
import { leerFicha, bloquesDeFicha, tipoDeFicha, type FilaDeFicha } from "@/lib/fichaVehiculo";
import { armarFichaPdf } from "@/lib/fichaVehiculoPdf";
import { monedaDe } from "@/lib/monedaVehiculo";

export const runtime = "nodejs";

/**
 * La ficha técnica de un vehículo, en PDF (06/10/26). Pública: es el botón
 * "Descargar ficha" del modal del vehículo, y el link se comparte por WhatsApp.
 *
 * Se ve lo mismo que en la tienda y nada más: vehículo activo, de una tienda de
 * autos activa y publicada (o el dueño mirando la suya, o en local — la misma
 * puerta que `/api/public/[slug]`).
 */

function atributos(crudo: string): { key: string; value: string }[] {
  try {
    const l = JSON.parse(crudo);
    return Array.isArray(l)
      ? l.filter((a) => a && typeof a.key === "string" && (typeof a.value === "string" || typeof a.value === "number"))
          .map((a) => ({ key: a.key, value: String(a.value) }))
      : [];
  } catch {
    return [];
  }
}

function primeraFoto(crudo: string): string | null {
  try {
    const l = JSON.parse(crudo);
    const f = Array.isArray(l) ? l[0] : null;
    return typeof f === "string" ? f : typeof f?.url === "string" ? f.url : null;
  } catch {
    return null;
  }
}

/**
 * Bajar una imagen para meterla en el PDF, como JPEG (pdfkit no lee webp).
 *
 * ⚠️ Sólo de donde guardamos nosotros (el depósito de Supabase, `/uploads/` en
 * local) y de los dos bancos de fotos de los datos de muestra. Esta ruta es
 * pública: si bajara cualquier dirección que diga un producto, sería una
 * puerta para que nuestro servidor le pegue a lo que alguien quiera.
 */
async function imagenJpeg(url: string | null, ancho: number): Promise<Buffer | null> {
  if (!url) return null;
  try {
    let bytes: Buffer;
    if (url.startsWith("/uploads/") && !url.includes("..")) {
      bytes = await readFile(path.join(process.cwd(), "public", url));
    } else {
      const u = new URL(url);
      const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
      const permitido = u.protocol === "https:" && (u.host === supabase || u.host === "images.unsplash.com" || u.host === "images.pexels.com");
      if (!permitido) return null;
      const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return null;
      const largo = Number(r.headers.get("content-length") || 0);
      if (largo > 12 * 1024 * 1024) return null;
      bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length > 12 * 1024 * 1024) return null;
    }
    return await sharp(bytes).rotate().resize({ width: ancho, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

function precioTexto(n: number, moneda: string): string {
  return (moneda === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}

function nombreDeArchivo(nombre: string): string {
  const base = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `ficha-${base || "vehiculo"}.pdf`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ip = getClientIp(req);
  const { permitido } = await checkRateLimitConRespaldo(`ficha-pdf:${ip}`, 30, 10 * 60_000, { limiteFallback: 30, limiteFallbackGlobal: 600 });
  if (!permitido) return NextResponse.json({ error: "Demasiadas descargas seguidas. Probá en unos minutos." }, { status: 429 });

  const producto = await prisma.product.findFirst({
    where: { id, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, price: true, images: true, category: true, attributes: true, vehicleStatus: true,
      store: { select: { name: true, slug: true, logo: true, storeConfig: true, tipoTienda: true, isActive: true, isPublished: true, ownerId: true } },
    },
  });
  const store = producto?.store;
  if (!producto || !store || !store.isActive || store.tipoTienda !== "AUTOS") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!store.isPublished && process.env.NODE_ENV === "production") {
    const usuario = await getCurrentUser();
    if (usuario?.id !== store.ownerId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let config: { whatsapp?: { enabled?: boolean; number?: string }; colors?: { accent?: string }; currency?: string } = {};
  try { config = JSON.parse(store.storeConfig || "{}") ?? {}; } catch { /* config rota: valores por defecto */ }

  const attrs = atributos(producto.attributes);
  const valor = (k: string) => attrs.find((a) => a.key.toLowerCase() === k.toLowerCase())?.value.trim() ?? "";
  const kmCrudo = (valor("Kilómetros") || valor("Km")).replace(/,\d{1,2}$/, "").replace(/\D/g, "");
  const km = kmCrudo ? `${Number(kmCrudo).toLocaleString("es-AR")} km` : "";
  // Maquinaria agrícola: horas de uso en vez de kilómetros.
  const horasCrudo = valor("Horas de uso").replace(/\D/g, "");
  const horas = horasCrudo ? `${Number(horasCrudo).toLocaleString("es-AR")} h` : "";

  const principales: FilaDeFicha[] = [
    ["Marca", valor("Marca")], ["Modelo", valor("Modelo")], ["Versión", valor("Versión")],
    ["Año", valor("Año")], ["Kilómetros", km], ["Horas de uso", horas], ["Motor", valor("Motor")],
    ["Transmisión", valor("Transmisión")], ["Combustible", valor("Combustible")], ["Tracción", valor("Tracción")],
    ["Carrocería", valor("Carrocería")], ["Color", valor("Color")], ["Puertas", valor("Puertas")],
  ].filter(([, v]) => v).map(([label, v]) => ({ label, valor: v }));

  const ubicacion = [valor("Localidad"), valor("Provincia")].filter(Boolean).join(", ") || valor("Ubicación") || valor("Ciudad");
  const tipo = tipoDeFicha(producto.category) ?? "auto";
  const ficha = bloquesDeFicha(leerFicha(attrs), tipo);

  const wa = config.whatsapp?.enabled && numeroWhatsApp(config.whatsapp.number) ? config.whatsapp.number!.trim() : null;
  const origen = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const link = `${origen}/tienda/${store.slug}/producto/${encodeURIComponent(producto.id)}`;

  const [foto, logo] = await Promise.all([
    imagenJpeg(primeraFoto(producto.images), 1400),
    imagenJpeg(store.logo, 400),
  ]);

  const pdf = await armarFichaPdf({
    tienda: { nombre: store.name, logo, whatsapp: wa, link, acento: config.colors?.accent ?? "#2563eb" },
    vehiculo: {
      nombre: producto.name,
      // La moneda de ESTE vehículo (ver lib/monedaVehiculo), no sólo la principal.
      precio: precioTexto(producto.price, monedaDe({ attributes: attrs }, config.currency === "USD" ? "USD" : "ARS")),
      chips: [valor("Año"), km || horas, valor("Condición")].filter(Boolean),
      ubicacion,
      reservado: producto.vehicleStatus === "RESERVED",
      foto,
      principales,
    },
    ficha,
    fecha: new Date(),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreDeArchivo(producto.name)}"`,
      /* Cinco minutos en el borde: el link se comparte por WhatsApp y lo abren
         muchos a la vez; un cambio de la ficha tarda eso en verse. Una tienda
         sin publicar (sólo la ve su dueño) no se guarda en ningún lado. */
      "Cache-Control": store.isPublished
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
        : "private, no-store",
    },
  });
}
