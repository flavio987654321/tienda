import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { rutaDeRef } from "@/lib/subida-digital";
import { configDeposito, enlaceDeDescarga } from "@/lib/deposito-digital";

export const runtime = "nodejs";

/**
 * Canjea el token de compra por el archivo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ACÁ SE ENTREGA LO QUE ALGUIEN PAGÓ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Qué protege esto ────────────────────────────────────────────────────────
 *
 * El token es **toda** la autorización: no hay sesión, porque quien compra no
 * tiene cuenta. Por eso el token son 32 bytes del generador criptográfico (ver
 * `entrega-digital`) y por eso lo que se guarda en el producto es una referencia
 * y no una URL: la dirección del archivo nunca sirve sola.
 *
 * ── Lo que devuelve ─────────────────────────────────────────────────────────
 *
 * Una redirección a un enlace firmado de cinco minutos, así el archivo baja
 * **derecho de Supabase al navegador**. Si lo sirviéramos nosotros, un PDF de
 * 50 MB chocaría contra el techo de 4,5 MB de la plataforma y encima pagaríamos
 * el tránsito dos veces.
 *
 * ── ⚠️ POR QUÉ EL MAIL NO PUEDE LINKEAR ACÁ DERECHO ─────────────────────────
 *
 * Porque **esta dirección descuenta una descarga con sólo abrirla**, y los
 * enlaces de un mail los abre mucha gente que no es la persona: Outlook Safe
 * Links, los antivirus corporativos y los previsualizadores los visitan solos
 * apenas llega el correo. Con el enlace directo, alguien podría quedarse sin sus
 * cinco descargas sin haber tocado nada.
 *
 * El mail linkea a una PÁGINA con un botón; el botón viene acá. Abrir la página
 * no cuesta nada. Esa página va en el paso siguiente, junto con el mail.
 */
/**
 * El "no se puede" de esta ruta, dicho como corresponde según quién pregunta.
 *
 * Quien llega acá es casi siempre una PERSONA que tocó "Descargar": su navegador
 * abre esta dirección como una página. Contestarle JSON le mostraba
 * `{"error":"Este enlace venció…"}` en letra de máquina, sin un botón para
 * volver. Al navegador se le contesta una página chica con el mismo texto; a
 * cualquier otro, el JSON de siempre.
 */
function falla(req: NextRequest, mensaje: string, status: number) {
  if (!(req.headers.get("accept") ?? "").includes("text/html")) {
    return NextResponse.json({ error: mensaje }, { status });
  }
  /* El texto es nuestro, pero se escapa igual: es HTML armado a mano. */
  const texto = mensaje.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>No se pudo descargar</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f6f4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1c1c;padding:16px;box-sizing:border-box">
<main style="max-width:420px;width:100%;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:28px 24px;text-align:center">
<p style="font-size:34px;margin:0 0 8px">📄</p>
<h1 style="font-size:19px;margin:0 0 10px">No se pudo descargar</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 22px;color:#444">${texto}</p>
<button onclick="history.back()" style="font:inherit;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;border:0;background:#1c1c1c;color:#fff;cursor:pointer">Volver</button>
</main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  /* Límite por IP. Es la puerta de un archivo pago y no pide sesión: sin techo,
     alguien puede probar tokens todo el día. Adivinar uno de 32 bytes es
     imposible, pero el intento igual nos cuesta una consulta por pedido. */
  const ip = getClientIp(_req);
  if (!(await checkRateLimit(`digital-descarga:${ip}`, 30, 60_000))) {
    return falla(_req, "Demasiados intentos. Esperá un minuto.", 429);
  }

  const { token } = await ctx.params;

  /* 32 bytes en base64url son 43 caracteres. Se comprueba la forma antes de
     buscar: descarta la basura sin gastar una consulta. */
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43,64}$/.test(token)) {
    return falla(_req, "Este enlace no es válido.", 404);
  }

  const permiso = await prisma.digitalDownload.findUnique({
    where: { token },
    select: {
      id: true, expiresAt: true, descargas: true, maxDescargas: true,
      orderItem: {
        select: {
          order: { select: { status: true } },
          product: { select: { name: true, archivoPath: true, archivoNombre: true } },
        },
      },
    },
  });

  if (!permiso) {
    return falla(_req, "Este enlace no existe o ya no vale.", 404);
  }

  /* ⚠️ El pago tiene que estar acreditado. El permiso nace recién cuando el
     webhook confirma, así que esto no debería poder fallar — pero una orden se
     puede cancelar después (contracargo, devolución), y ahí el permiso queda
     escrito y el archivo no se tiene que entregar más. */
  if (permiso.orderItem.order.status !== "CONFIRMED") {
    return falla(_req, "Esta compra no está confirmada. Si ya pagaste, escribinos.", 403);
  }

  /* Se distingue vencido de agotado, y se dice cuál es. No es una filtración:
     quien lee esto TIENE el token, así que ya sabe que existe. Y un "no vale"
     genérico deja a alguien que pagó sin saber si esperar, reintentar o
     reclamar. */
  const ahora = new Date();
  if (permiso.expiresAt <= ahora) {
    return falla(_req, "Este enlace venció. Escribile a quien te lo vendió para que te lo renueve.", 410);
  }
  if (permiso.descargas >= permiso.maxDescargas) {
    return falla(_req, `Ya usaste las ${permiso.maxDescargas} descargas de este enlace.`, 429);
  }

  const ruta = rutaDeRef(permiso.orderItem.product.archivoPath);
  if (!ruta) {
    console.error("[digital-descarga] permiso sin archivo alcanzable:", permiso.id);
    return falla(_req, "No pudimos encontrar el archivo. Escribinos y lo resolvemos.", 500);
  }

  const config = configDeposito();
  if (!config) {
    console.error("[digital-descarga] falta configurar Supabase Storage");
    return falla(_req, "No pudimos preparar la descarga.", 500);
  }

  /* ══════════════════════════════════════════════════════════════════════
     EL CONTADOR ES LA PUERTA, y por eso se sube ANTES de firmar
     ══════════════════════════════════════════════════════════════════════

     Las condiciones van adentro del `where`, no en un `if` de más arriba. Las de
     arriba son para poder explicar QUÉ pasó; ésta es la que decide. Con dos
     pedidos a la vez —el doble click de siempre, o el enlace abierto en dos
     pestañas— los dos leen "van 4 de 5" y los dos pasarían el `if`. Con la
     condición en el `where`, la base deja pasar uno solo: el segundo actualiza
     cero filas y se entera acá abajo.

     Es el mismo patrón que usa el alta de productos contra el tope del plan. */
  const { count } = await prisma.digitalDownload.updateMany({
    where: {
      id: permiso.id,
      descargas: { lt: permiso.maxDescargas },
      expiresAt: { gt: ahora },
    },
    data: { descargas: { increment: 1 }, ultimaDescarga: ahora },
  });

  if (count === 0) {
    return falla(_req, "Este enlace ya no tiene descargas disponibles.", 429);
  }

  const enlace = await enlaceDeDescarga(config, ruta);

  if (!enlace) {
    /* ⚠️ Se devuelve la descarga que acabábamos de contar. Sin esto, un problema
       NUESTRO —Supabase caído, una firma que falla— le come una de las cinco a
       alguien que no bajó nada. Va con la misma condición adentro del `where`
       para no dejar el contador en negativo si algo más lo tocó en el medio. */
    await prisma.digitalDownload.updateMany({
      where: { id: permiso.id, descargas: { gt: 0 } },
      data: { descargas: { decrement: 1 } },
    }).catch((e) => console.error("[digital-descarga] no se pudo devolver la descarga:", e));

    console.error("[digital-descarga] no se pudo firmar el enlace:", permiso.id);
    return falla(_req, "No pudimos preparar la descarga. Probá de nuevo en un momento.", 502);
  }

  /* ══════════════════════════════════════════════════════════════════════
     LA PRUEBA DE ENTREGA
     ══════════════════════════════════════════════════════════════════════

     Se anota DESPUÉS de firmar y nunca antes: acá el archivo ya está entregado
     de verdad. Anotarlo arriba dejaría escrito "se lo bajó el día 5" en una
     descarga que terminó en error 502 — una prueba falsa es peor que ninguna.

     ⚠️ Va con `.catch` y sin `await` que frene la respuesta: esto es evidencia
     para un contracargo, no parte de la entrega. Si la fila no se puede escribir
     —la base ocupada, la tabla todavía sin migrar— la persona igual se tiene que
     llevar lo que pagó. Un registro que falla no puede negar un archivo.

     El agente se recorta: lo escribe el cliente y puede venir con kilobytes de
     basura. */
  prisma.digitalDownloadLog.create({
    data: {
      downloadId: permiso.id,
      ip,
      agente: _req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  }).catch((e) => console.error("[digital-descarga] no se pudo registrar la descarga:", e));

  /* 302 y no 301: el enlace firmado dura cinco minutos, y un navegador que
     guarde el permanente mandaría a la persona a una dirección muerta la próxima
     vez, sin siquiera preguntarnos. */
  return NextResponse.redirect(enlace, 302);
}
