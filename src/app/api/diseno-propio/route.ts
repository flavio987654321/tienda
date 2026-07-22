import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { DESIGN_BRIEF_TERMS_VERSION } from "@/lib/legal";
import { RUBRO_IDS, ESTETICA_IDS, PALETA_IDS, FOTOS_IDS, CATALOGO_IDS, LOGO_IDS } from "@/lib/designBrief";
import { sendDesignBriefAdminEmail } from "@/lib/email";

// Valores cerrados: el wizard manda ids de una lista fija, así que se validan
// contra esa lista (la misma que usa la página) en vez de aceptar cualquier
// string. Sin esto, el endpoint es público y sin login — cualquiera podría
// llenar la tabla con basura.

// Tope de los campos libres. Son opcionales y nadie necesita más que esto para
// pegar tres links o decir qué no le gusta.
const MAX_LIBRE = 2000;

function libre(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, MAX_LIBRE);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`diseno-propio:${ip}`, 3, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  // Honeypot: el campo `website` está oculto en el formulario, una persona nunca
  // lo completa. Si viene con algo es un bot. Se responde ok:true sin guardar,
  // para que el bot lo dé por enviado y no reintente ni descubra la trampa.
  if (String(body.website ?? "").trim() !== "") {
    console.warn("[diseno-propio] honeypot activado desde IP", ip);
    return NextResponse.json({ ok: true });
  }

  const tipoTienda = String(body.tipoTienda ?? "").trim();
  const estetica   = String(body.estetica ?? "").trim();
  const paleta     = String(body.paleta ?? "").trim();
  const nombre     = String(body.nombre ?? "").trim();
  const email      = String(body.email ?? "").trim().toLowerCase();

  const telefono = String(body.telefono ?? "").trim();

  if (!RUBRO_IDS.includes(tipoTienda))   return NextResponse.json({ error: "Elegí qué vendés." }, { status: 400 });
  if (!ESTETICA_IDS.includes(estetica))  return NextResponse.json({ error: "Elegí una estética." }, { status: 400 });
  if (!PALETA_IDS.includes(paleta))      return NextResponse.json({ error: "Elegí una paleta." }, { status: 400 });
  if (nombre.length < 2 || nombre.length > 80) return NextResponse.json({ error: "Contanos cómo te llamás." }, { status: 400 });
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }
  const telDigits = telefono.replace(/\D/g, "");
  if (telDigits.length < 8 || telDigits.length > 20) {
    return NextResponse.json({ error: "Dejanos un teléfono o WhatsApp válido." }, { status: 400 });
  }

  // Datos de marca. Las tres de opciones cerradas se validan contra la lista:
  // se acepta vacío (los briefs viejos no las tienen y el paso no las exige
  // todas), pero si viene algo tiene que ser un id conocido y no basura.
  const queVende = libre(body.queVende);
  const nombreTienda = libre(body.nombreTienda);
  const opcion = (v: unknown, ids: string[]) => {
    const s = String(v ?? "").trim();
    return s && ids.includes(s) ? s : null;
  };
  const fotos = opcion(body.fotos, FOTOS_IDS);
  const catalogo = opcion(body.catalogo, CATALOGO_IDS);
  const logo = opcion(body.logo, LOGO_IDS);

  // La aceptación no se infiere ni se asume: si no viene true, no se guarda.
  // Es el permiso para publicar el diseño en el catálogo, así que sin eso el
  // brief no sirve.
  if (body.acepta !== true) {
    return NextResponse.json({ error: "Necesitamos que aceptes las condiciones." }, { status: 400 });
  }

  // Captcha al final: un error de campos no consume el token (es de un solo uso)
  if (!(await verifyTurnstile(body.turnstileToken, ip, "diseno-propio"))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
  }

  // Se calculan una sola vez: van al registro y también al mail de aviso.
  const coloresPropios = libre(body.coloresPropios);
  const referencias = libre(body.referencias);
  const noQuiero = libre(body.noQuiero);
  const tiendaUrl = libre(body.tiendaUrl);
  const nombreFinal = nombre.slice(0, 120);
  const telefonoFinal = telefono.slice(0, 40) || null;
  const tieneTienda = body.tieneTienda === "si";

  try {
    await prisma.designBrief.create({
      data: {
        tipoTienda,
        estetica,
        paleta,
        coloresPropios,
        referencias,
        noQuiero,
        nombreTienda,
        queVende,
        fotos,
        catalogo,
        logo,
        nombre: nombreFinal,
        email,
        telefono: telefonoFinal,
        tieneTienda,
        tiendaUrl,
        acceptedIp: ip,
        acceptedVersion: DESIGN_BRIEF_TERMS_VERSION,
      },
    });
  } catch (err) {
    console.error("[diseno-propio] no se pudo guardar el brief:", err);
    return NextResponse.json({ error: "No pudimos guardar tu idea. Probá de nuevo." }, { status: 500 });
  }

  // Aviso al admin por mail, además del panel. Va en su propio try y después de
  // guardar: si el mail falla, la idea ya está a salvo en la base y la persona
  // igual ve el "recibimos tu idea" — perder el aviso no puede perder el brief.
  try {
    await sendDesignBriefAdminEmail({
      nombre: nombreFinal,
      email,
      telefono: telefonoFinal,
      tipoTienda,
      estetica,
      paleta,
      coloresPropios,
      referencias,
      noQuiero,
      nombreTienda,
      queVende,
      fotos,
      catalogo,
      logo,
      tieneTienda,
      tiendaUrl,
    });
  } catch (err) {
    console.error("[diseno-propio] el brief se guardó pero no se pudo avisar por mail:", err);
  }

  return NextResponse.json({ ok: true });
}
