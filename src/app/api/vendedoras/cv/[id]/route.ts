import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 120;

/**
 * GET /api/vendedoras/cv/[id] → redirige al CV del afiliado con un link firmado.
 *
 * El documento vive en un bucket PRIVADO (ver /api/upload): no tiene dirección
 * pública. Para verlo hay que pasar por acá, que primero comprueba quién
 * pregunta y recién después le pide a Supabase un link que dura dos minutos.
 *
 * Antes el `cvUrl` guardado era una dirección pública directa: el botón "Ver CV"
 * del panel apuntaba al archivo en crudo, así que el documento de identidad de
 * una persona quedaba accesible para cualquiera que tuviera esa dirección —sin
 * sesión, sin vencimiento y sin manera de saber quién lo abrió—.
 *
 * Quién puede: el dueño de la tienda a la que se postuló, el propio afiliado y
 * un ADMIN. Nadie más, ni siquiera otro dueño de tienda.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    select: {
      cvUrl: true,
      userId: true,
      store: { select: { ownerId: true } },
    },
  });

  if (!affiliate?.cvUrl) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const puedeVer =
    user.role === "ADMIN" ||
    user.id === affiliate.userId ||
    user.id === affiliate.store?.ownerId;

  // Mismo 404 que cuando no existe: quien no tiene permiso tampoco tiene por qué
  // enterarse de que ese afiliado subió un documento.
  if (!puedeVer) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Los documentos nuevos se guardan como `supabase://bucket/ruta`. Los que
  // hubiera cargados de antes son direcciones públicas completas: se redirige tal
  // cual, porque ese archivo ya está en el bucket público y firmarlo no lo
  // protegería. (Al escribir esto no había ninguno: 0 de 2 afiliados con CV.)
  if (!affiliate.cvUrl.startsWith("supabase://")) {
    return NextResponse.redirect(affiliate.cvUrl);
  }

  const sinEsquema = affiliate.cvUrl.slice("supabase://".length);
  const barra = sinEsquema.indexOf("/");
  if (barra < 1) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const bucket = sinEsquema.slice(0, barra);
  const filePath = sinEsquema.slice(barra + 1);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Storage no configurado" }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${filePath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  }).catch(() => null);

  const data = (await res?.json().catch(() => null)) as { signedURL?: string } | null;
  if (!res?.ok || !data?.signedURL) {
    console.error("[vendedoras/cv] no se pudo firmar la url", { id, bucket });
    return NextResponse.json({ error: "No se pudo abrir el documento" }, { status: 502 });
  }

  return NextResponse.redirect(`${supabaseUrl}/storage/v1${data.signedURL}`);
}
