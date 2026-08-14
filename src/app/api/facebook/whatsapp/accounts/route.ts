import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedWhatsAppAccounts, decryptToken, dentroDelTopeGraph } from "@/lib/facebook";

// GET /api/facebook/whatsapp/accounts
// Lista las WhatsApp Business Accounts del portfolio comercial ya conectado por OAuth.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { fbAccessToken: true, fbBusinessId: true },
  });
  if (!store?.fbAccessToken || !store.fbBusinessId) {
    return NextResponse.json({ error: "Conectá primero tu portfolio comercial de Facebook" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    const { data } = await listOwnedWhatsAppAccounts(token, store.fbBusinessId);
    return NextResponse.json({ accounts: data });
  } catch (err) {
    console.error("Facebook /whatsapp/accounts error:", err);
    return NextResponse.json({ error: "No se pudo obtener tus cuentas de WhatsApp Business" }, { status: 502 });
  }
}
