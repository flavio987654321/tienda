import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listAccountSummaries, getValidAccessToken } from "@/lib/googleAnalytics";

// GET /api/google/analytics/accounts
// Lista las cuentas de Google Analytics del dueño de tienda ya conectado por OAuth.
// No se listan las propiedades acá — el paso de conexión ya resuelve solo si
// hay que reusar una propiedad existente o crear una nueva dentro de la cuenta elegida.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { gaRefreshToken: true },
  });
  if (!store?.gaRefreshToken) {
    return NextResponse.json({ error: "Google no está conectado" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken(store.gaRefreshToken);
    const { accountSummaries } = await listAccountSummaries(accessToken);
    const accounts = (accountSummaries ?? []).map((a) => ({ accountId: a.account, accountName: a.displayName }));
    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("Google Analytics /accounts error:", err);
    return NextResponse.json({ error: "No se pudo obtener tus cuentas de Google Analytics" }, { status: 502 });
  }
}
