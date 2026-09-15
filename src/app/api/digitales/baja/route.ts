import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leerTokenDeBaja } from "@/lib/correos-compradores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Baja de los mails de una vendedora. Pública: llega desde el mail.
 *
 * Es el mismo esquema que `/api/newsletter/baja`, y por los mismos motivos:
 *
 * - El GET NO da de baja: redirige a la página con el botón. Gmail y los
 *   antivirus abren solos los links de los mails para revisarlos; una baja
 *   por GET se ejecutaría con cada escaneo y daríamos de baja a gente que no
 *   pidió irse.
 * - El POST sí, y entra por dos caminos: el botón de la página (JSON) y el
 *   "Cancelar suscripción" de un clic de Gmail (formulario, con el token en
 *   la query, que es la única URL que Gmail conoce).
 * - Un token que no sirve se contesta OK igual: quien llegó acá se quiere ir,
 *   y decirle "link inválido" lo deja con el botón de spam como única salida.
 */
export async function GET(req: NextRequest) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/correo/baja?t=${encodeURIComponent(t)}`, req.url));
}

async function leerToken(req: NextRequest): Promise<string | null> {
  const tipo = req.headers.get("content-type") ?? "";
  if (tipo.includes("application/x-www-form-urlencoded")) return new URL(req.url).searchParams.get("t");
  const body = await req.json().catch(() => null);
  if (typeof body?.token === "string") return body.token;
  return new URL(req.url).searchParams.get("t");
}

export async function POST(req: NextRequest) {
  const token = await leerToken(req);
  const datos = leerTokenDeBaja(token);
  if (!datos) return NextResponse.json({ ok: true });

  /* Se guarda aunque ese correo nunca haya comprado: lo único que importa es
     que a esa dirección no se le escriba más. El `upsert` hace que apretar
     dos veces no falle. */
  const store = await prisma.store.findUnique({ where: { id: datos.storeId }, select: { id: true, owner: { select: { name: true } } } });
  if (!store) return NextResponse.json({ ok: true });
  await prisma.bajaCorreoDigital.upsert({
    where: { storeId_email: { storeId: store.id, email: datos.email } },
    create: { storeId: store.id, email: datos.email },
    update: {},
  });
  return NextResponse.json({ ok: true, vendedor: store.owner.name });
}
