import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { sendCanastaSoporteEmail } from "@/lib/resend";

/**
 * Solicitud de ayuda de la Canasta Solidaria.
 *
 * ── Por qué tiene tope ───────────────────────────────────────────────────────
 * No pide sesión y no puede pedirla: la persona que llena esto es justamente la
 * que todavía no tiene cuenta. Pero manda un mail en cada llamada, así que sin
 * tope alcanzaba un bucle de `curl` para tapar la casilla de soporte y quemar
 * la cuota de Resend.
 *
 * El tope es el mismo que ya tenía `/api/contacto`, que hace exactamente lo
 * mismo: 5 por IP por minuto. Esta ruta se escribió después y se quedó sin él.
 *
 * ── Por qué los largos se revisan de nuevo acá ───────────────────────────────
 * El formulario ya tiene `maxLength` en cada campo, pero eso lo aplica el
 * navegador: un pedido armado a mano no pasa por ahí. Los números de abajo son
 * los mismos que los del formulario a propósito — si allá cambian, acá también.
 *
 * ── Lo que NO tiene ──────────────────────────────────────────────────────────
 * Captcha. `/api/contacto` sí lo tiene, pero pedirlo acá sin tocar el
 * formulario rompería el envío. El tope es lo que ataja la inundación; el
 * captcha sería el paso siguiente, y va junto con el campo en la página.
 */
const LARGOS = { nombre: 120, email: 160, telefono: 40, localidad: 120, edad: 10, mensaje: 1500 };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`canasta-soporte:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const localidad = String(body.localidad ?? "").trim();
  const edad = String(body.edad ?? "").trim();
  const mensaje = String(body.mensaje ?? "").trim();

  if (!nombre || !email || !telefono || !localidad || !mensaje) {
    return NextResponse.json({ error: "Completá todos los campos" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (mensaje.length < 20) {
    return NextResponse.json({ error: "El mensaje es muy corto" }, { status: 400 });
  }

  const campos = { nombre, email, telefono, localidad, edad, mensaje };
  for (const [campo, valor] of Object.entries(campos)) {
    if (valor.length > LARGOS[campo as keyof typeof LARGOS]) {
      return NextResponse.json({ error: "Alguno de los campos es demasiado largo." }, { status: 400 });
    }
  }

  try {
    await sendCanastaSoporteEmail(campos);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Igual que en /api/contacto: sin esto, el error se tragaba entero y la
    // persona sólo veía "no se pudo enviar", sin rastro de por qué.
    console.error("[canasta/soporte] no se pudo enviar:", err);
    return NextResponse.json({ error: "No se pudo enviar el mensaje. Intentá de nuevo." }, { status: 500 });
  }
}
