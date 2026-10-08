import { NextRequest, NextResponse } from "next/server";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const config = await getTurnstileSiteKey(req.nextUrl.hostname);
    return NextResponse.json(config, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[turnstile] no se pudo resolver el widget del dominio", error);
    return NextResponse.json({ configured: true, error: "No pudimos cargar la verificación de seguridad. Recargá la página." }, { status: 503 });
  }
}
