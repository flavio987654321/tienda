import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getOAuthUrl } from "@/lib/googleAnalytics";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// GET /api/google/analytics/oauth/connect
// Redirige al dueño de tienda a la página de autorización de Google.
export async function GET() {
  if (!process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/aplicaciones/google-analytics?ga=error`);
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const nonce = randomBytes(16).toString("hex");
  const url = getOAuthUrl(nonce);
  const res = NextResponse.redirect(url);

  res.cookies.set("ga_oauth_state", `${nonce}:${store.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
  });

  return res;
}
