import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { pushConfigurado, sendPushDePrueba } from "@/lib/push";
import { endpointDePushValido } from "@/lib/suscripcionPush";

/* POST /api/push/prueba — "Mandame un aviso de prueba" (08/10/26).
   A UN celular: el de quien toca el botón (su `endpoint`), y sólo si es suyo.
   Con `demora`, el servidor espera unos segundos antes de mandarlo: así se
   alcanza a bloquear el celular o salir de la app y ver que llega igual. La
   espera es del servidor y no del navegador, porque un celular con la pantalla
   apagada congela los relojes de la página. */
export const maxDuration = 30;

const DEMORA_MS = 8_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Cinco cada diez minutos: alcanza para probar en dos celulares; no para molestar.
  const { permitido } = await checkRateLimitConRespaldo(`push-prueba:${user.id}`, 5, 10 * 60_000, { limiteFallback: 5, limiteFallbackGlobal: 500 });
  if (!permitido) return NextResponse.json({ error: "Ya probaste varias veces. Esperá unos minutos." }, { status: 429 });

  if (!pushConfigurado()) return NextResponse.json({ error: "Los avisos no están configurados en este servidor." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; demora?: unknown } | null;
  if (!endpointDePushValido(body?.endpoint)) return NextResponse.json({ error: "Este celular no está anotado." }, { status: 400 });

  if (body?.demora === true) await new Promise((r) => setTimeout(r, DEMORA_MS));

  const r = await sendPushDePrueba(user.id, body!.endpoint as string, {
    title: "¡Funciona! 🎉",
    body: "Así te van a llegar los avisos de tu tienda, aunque tengas la app cerrada.",
    url: "/dashboard",
    tag: "aviso-de-prueba",
  });
  if (r === "ok") return NextResponse.json({ ok: true });
  if (r === "vencida" || r === "no-esta") {
    return NextResponse.json({ error: "Este celular dejó de estar anotado. Volvé a activar los avisos.", reactivar: true }, { status: 410 });
  }
  return NextResponse.json({ error: "No se pudo mandar. Probá de nuevo en un rato." }, { status: 502 });
}
