import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { storePreferencesSchema, mergeStorePreferences } from "@/lib/store-config";
import { isSafeExternalUrl } from "@/lib/url-utils";

const NOMBRE_RED: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
  youtube: "YouTube", pinterest: "Pinterest",
};

/**
 * Guardado parcial de las preferencias de la tienda (WhatsApp, redes, moneda,
 * SEO) desde /dashboard/ajustes.
 *
 * Existe aparte de `POST /api/configuracion` porque ese endpoint pide el config
 * COMPLETO y reemplaza todas las claves de diseño con lo que le mandan: usarlo
 * para cambiar un número de teléfono habría significado que esta pantalla tenga
 * que cargar, arrastrar y reenviar el diseño entero — y que dos pestañas
 * abiertas se pisen el trabajo. Acá se manda solo lo que cambió.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Pedido mal formado" }, { status: 400 });

  const parsed = storePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Regla que antes vivía suelta en el editor de diseño: un botón de WhatsApp
  // encendido sin número es un botón que abre una conversación con nadie.
  /* Los templates arman el link como `wa.me/` + los dígitos del número, sin
     agregarle el país. Un número local suelto ("2254605521") arma un `wa.me`
     que no abre ninguna conversación — y el botón roto lo ven los clientes, no
     el dueño, así que puede quedar así meses sin que nadie avise.
     Se acepta con "+" adelante o con el país ya pegado (11 dígitos o más). */
  const wa = parsed.data.whatsapp;
  if (wa?.enabled) {
    const digitos = wa.number.replace(/\D/g, "");
    if (!digitos) {
      return NextResponse.json(
        { error: "Completá el número de WhatsApp o desactivá el botón." },
        { status: 400 }
      );
    }
    if (digitos.length < 8) {
      return NextResponse.json(
        { error: "Ese número es muy corto. Poné el número completo." },
        { status: 400 }
      );
    }
    if (!wa.number.trim().startsWith("+") && digitos.length <= 10) {
      return NextResponse.json(
        { error: "Falta el código de país: escribí +54 9 y después tu número." },
        { status: 400 }
      );
    }
  }

  /* Las redes terminan en un `<a href>` o en un `window.open()` del pie de cada
     plantilla, sin pasar por ningún filtro. Un `javascript:…` guardado acá se
     ejecutaría en el navegador de QUIEN VISITA la tienda, no en el del dueño —
     así que la validación tiene que estar del lado del servidor, que es el único
     lado que no se puede saltear. El resto del proyecto ya usa este mismo
     chequeo para el logo, el banner y los bloques de página. */
  for (const [red, url] of Object.entries(parsed.data.socialLinks ?? {})) {
    if (url && !isSafeExternalUrl(url)) {
      return NextResponse.json(
        { error: `El link de ${NOMBRE_RED[red] ?? red} no es una dirección web válida. Tiene que empezar con https://` },
        { status: 400 }
      );
    }
  }

  const current = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { storeConfig: true },
  });
  if (!current) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const store = await prisma.store.update({
    where: { ownerId: user.id },
    data: { storeConfig: mergeStorePreferences(current.storeConfig, parsed.data) },
    select: { slug: true },
  });

  revalidatePath(`/tienda/${store.slug}`, "layout");
  return NextResponse.json({ ok: true });
}
