import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedBusinesses, decryptToken } from "@/lib/facebook";

// GET /api/facebook/business
// Lista los Business Portfolios de Meta del dueño de tienda ya conectado por OAuth.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { fbAccessToken: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    const { data } = await listOwnedBusinesses(token);
    return NextResponse.json({ businesses: data });
  } catch (err) {
    console.error("Facebook /business error:", err);
    return NextResponse.json({ error: "No se pudo obtener los portfolios de Meta" }, { status: 502 });
  }
}
