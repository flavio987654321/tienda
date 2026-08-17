import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { isSafeUrl, urlDeDescargaPermitida } from "@/lib/url-utils";
import sharp from "sharp";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { logo } = body;

  if (logo && !isSafeUrl(logo)) {
    return NextResponse.json({ error: "URL de logo inválida" }, { status: 400 });
  }

  let logoColor: string | null = null;

  if (logo) {
    logoColor = await extractLogoColor(logo);
  }

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { logo: logo || null, logoColor },
    select: { slug: true, logo: true, logoColor: true },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");
  revalidatePath("/dashboard", "layout");

  return NextResponse.json({ logo: store.logo, logoColor: store.logoColor });
}

/**
 * Extrae el color de fondo del logo usando sharp.
 * Muestrea los bordes de la imagen: si son mayormente transparentes devuelve null
 * (fondo transparente → usar color primario de la tienda).
 * Si tienen color, devuelve el color promedio en hex.
 */
async function extractLogoColor(logoUrl: string): Promise<string | null> {
  /* Acá el servidor SALE A BUSCAR una url que mandó el comerciante, y esta es la
     puerta más directa de las tres que hacen eso: no hay que esperar a que nadie
     renderice nada, alcanza con un PATCH a esta ruta y el fetch sale al toque.
     `isSafeUrl` de más arriba solo mira el protocolo, así que
     `http://169.254.169.254/` le pasaba por al lado. Ver `urlDeDescargaPermitida`. */
  const permitida = urlDeDescargaPermitida(logoUrl);
  if (!permitida) return null;

  try {
    // `redirect: "error"`: si no, una url pública que responde 302 hacia adentro
    // esquiva la guarda de arriba, que solo llegó a ver la primera.
    const res = await fetch(permitida, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Redimensionar a 30x30 para muestrear bordes con bajo costo
    const { data, info } = await sharp(inputBuffer)
      .resize(30, 30, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;   // 30
    const h = info.height;  // 30
    const ch = info.channels; // 4 (RGBA)

    // Muestrea los 4 bordes: top, bottom, left, right (fila/columna exterior)
    const borderPixels: { r: number; g: number; b: number; a: number }[] = [];

    for (let x = 0; x < w; x++) {
      // fila top
      const idxTop = (0 * w + x) * ch;
      borderPixels.push({ r: data[idxTop], g: data[idxTop + 1], b: data[idxTop + 2], a: data[idxTop + 3] });
      // fila bottom
      const idxBot = ((h - 1) * w + x) * ch;
      borderPixels.push({ r: data[idxBot], g: data[idxBot + 1], b: data[idxBot + 2], a: data[idxBot + 3] });
    }
    for (let y = 1; y < h - 1; y++) {
      // columna left
      const idxL = (y * w + 0) * ch;
      borderPixels.push({ r: data[idxL], g: data[idxL + 1], b: data[idxL + 2], a: data[idxL + 3] });
      // columna right
      const idxR = (y * w + (w - 1)) * ch;
      borderPixels.push({ r: data[idxR], g: data[idxR + 1], b: data[idxR + 2], a: data[idxR + 3] });
    }

    const opaquePixels = borderPixels.filter((p) => p.a > 40);
    const transparentRatio = 1 - opaquePixels.length / borderPixels.length;

    // Si más del 60% del borde es transparente → fondo transparente
    if (transparentRatio > 0.6) return null;

    // Promedio de los píxeles opaques del borde
    if (opaquePixels.length === 0) return null;
    const avgR = Math.round(opaquePixels.reduce((s, p) => s + p.r, 0) / opaquePixels.length);
    const avgG = Math.round(opaquePixels.reduce((s, p) => s + p.g, 0) / opaquePixels.length);
    const avgB = Math.round(opaquePixels.reduce((s, p) => s + p.b, 0) / opaquePixels.length);

    // Si el color detectado es muy oscuro (luminancia < 40) → fondo transparente o negro → usar color primario
    const luminance = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;
    if (luminance < 40) return null;

    return `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;
  } catch {
    return null;
  }
}
