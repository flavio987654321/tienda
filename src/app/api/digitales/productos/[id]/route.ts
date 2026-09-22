import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  rolDe, loQueFalta, validarCampos, imagenValida, porQueNoSePublica, LARGO_TITULO, LARGO_DESCRIPCION,
} from "@/lib/productos-digitales";
import type { TierDigital } from "@/lib/planes-digitales";
import { limpiarTexto } from "@/lib/texto-limpio";
import { desconectarDominio } from "@/lib/dominio-digital";
import { cuantosDe } from "@/lib/correos-compradores-db";
import { createNotification } from "@/lib/notifications";
import { despues } from "@/lib/despues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El producto pedido, **sólo si es de quien lo pide**.
 *
 * Es la línea que separa "mi producto" de "el producto de cualquiera". El `id`
 * viaja en la URL, así que sin cruzarlo contra el dueño, alguien con una cuenta
 * digital cualquiera edita, publica o borra el producto de otra persona probando
 * ids. Por eso el `where` va con el dueño adentro y no se filtra después: una
 * consulta que ya no puede devolver lo ajeno no se puede olvidar de comprobarlo.
 */
async function miProducto(userId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null, store: { ownerId: userId } },
    select: {
      id: true, name: true, price: true, rolDigital: true, archivoPath: true, isActive: true,
      storeId: true, padreId: true,
      /* El cobro de la cuenta, para la puerta de publicar. Sólo si HAY token:
         el token en sí no tiene por qué salir de la base para esto. */
      store: { select: { mpAccessToken: true } },
    },
  });
}

/** Editar: título, descripción, precios, y publicar o despublicar. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`digital-producto-edit:${user.id}`, 120, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiados cambios seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /digitales/productos/[id]");
  }

  const { id } = await ctx.params;
  const actual = await miProducto(user.id, id);
  if (!actual) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, description, price, comparePrice, publicado, imagen } = body as Record<string, unknown>;

  const rol = rolDe(actual.rolDigital) ?? "PRINCIPAL";
  // Un bono no se cobra, mande lo que mande el navegador.
  const precio = rol === "BONO" ? 0 : price;

  /* La MISMA función que usa el alta. Copiar las reglas acá era la forma segura
     de que la edición terminara aceptando lo que el alta rechaza. */
  const problema = validarCampos({ name, description, price: precio, comparePrice }, rol);
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });

  /* ⚠️ Publicar es lo único de esta ruta que puede hacer daño de verdad, así que
     se revisa contra lo que va a quedar guardado y no contra lo que hay hoy.
     Un producto publicado sin archivo se puede comprar y no se puede entregar:
     se cobra la plata y no llega nada. Y uno publicado sin Mercado Pago es una
     página viva con el botón de comprar roto — ver `loQueFalta`. */
  if (publicado === true) {
    const falta = loQueFalta({
      rolDigital: actual.rolDigital,
      archivoPath: actual.archivoPath,
      price: typeof precio === "number" ? precio : actual.price,
      name: typeof name === "string" ? name : actual.name,
      cobroConectado: !!actual.store?.mpAccessToken,
    });
    if (falta) return NextResponse.json({ error: falta }, { status: 409 });
  }

  /* ⚠️ Y la segunda puerta del tope: cuántos de este grupo YA están publicados.
   *
   * Crear ya cuenta contra el plan, pero una cuenta que CAYÓ de plan tiene más
   * productos que los que le tocan, y lo que la mantiene dentro del plan es esto:
   * no se publica uno si ya hay tantos publicados como permite. Sin esto, el
   * cron despublica de noche y ella vuelve a publicar de día, todos los días.
   *
   * Se cuenta en la base y no se confía en que la pantalla apagó el botón: el
   * botón apagado es una cortesía. Y se cuenta sin transacción a propósito:
   * dos publicaciones en el mismo instante de la misma cuenta son una persona
   * con dos pestañas, y lo peor que consigue es UNA página de más en su propio
   * plan. El alta sí lleva candado, porque ahí la IA crea tres de una sentada;
   * publicar es un clic por vez. */
  if (publicado === true && !actual.isActive) {
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } });
    const tier = (sub?.tier ?? "FREE") as TierDigital;
    const publicados = await prisma.product.count({
      where: {
        storeId: actual.storeId,
        rolDigital: rol,
        deletedAt: null,
        isActive: true,
        ...(rol === "PRINCIPAL" ? {} : { padreId: actual.padreId }),
      },
    });
    const sinLugar = porQueNoSePublica(rol, publicados, tier);
    if (sinLugar) return NextResponse.json({ error: sinLugar }, { status: 409 });
  }

  /* ── El lanzamiento ──────────────────────────────────────────────────────
     Al publicar un principal, la gente que ya compró OTRO es la audiencia
     más barata que existe. Si hay alguien, se anota en la campanita con el
     link al mail ya armado (`?nuevo=`: a todos los que no tienen éste, con la
     plantilla y el botón). Se cuenta con la MISMA función que ese mail, y
     con `despues`: publicar no puede esperar por un aviso. Sólo al pasar de
     borrador a publicado, no cada vez que se despublica y se vuelve a
     publicar el mismo día… salvo que sí: si lo apaga y lo prende, vuelve a
     aparecer, y está bien —es un aviso, no un mail—. */
  const seLanza = publicado === true && !actual.isActive && rol === "PRINCIPAL";

  await prisma.product.update({
    where: { id },
    data: {
      // `undefined` en Prisma es "no lo toques": sólo se escribe lo que vino.
      ...(typeof name === "string" ? { name: limpiarTexto(name, LARGO_TITULO) ?? "" } : {}),
      ...(description !== undefined
        ? { description: limpiarTexto(description, LARGO_DESCRIPCION) }
        : {}),
      ...(typeof precio === "number" ? { price: precio } : {}),
      ...(comparePrice !== undefined
        ? { comparePrice: typeof comparePrice === "number" && comparePrice > 0 ? comparePrice : null }
        : {}),
      ...(typeof publicado === "boolean" ? { isActive: publicado } : {}),
      /* `null` saca la imagen; una dirección ajena se ignora en silencio en vez
         de guardarse (ver `imagenValida`). */
      ...(imagen === null ? { images: "[]" } : imagenValida(imagen) ? { images: JSON.stringify([imagen]) } : {}),
    },
  });

  if (seLanza) {
    despues(async () => {
      const clientes = await cuantosDe(actual.storeId, { productId: null, sinProductoId: id });
      if (clientes === 0) return;
      await createNotification({
        userId: user.id,
        type: "DIGITAL_LANZAMIENTO",
        title: `Publicaste «${actual.name}»`,
        body: `${clientes === 1 ? "Tenés 1 cliente que todavía no lo tiene" : `Tenés ${clientes} clientes que todavía no lo tienen`}: avisales por mail, con el texto ya armado.`,
        link: `/digitales/marketing/compradores?nuevo=${id}`,
      });
    }, "[digitales] aviso de lanzamiento");
  }

  return NextResponse.json({ ok: true, lanzado: seLanza });
}

/**
 * Borrar.
 *
 * Se marca como borrado, no se borra: `OrderItem` apunta al producto, así que
 * sacarlo de verdad dejaría pedidos viejos sin poder decir qué se vendió — y con
 * ellos, los permisos de descarga de gente que ya pagó.
 *
 * Al principal se le van los bonos y los upsells en el mismo movimiento. Sueltos
 * no tienen dónde vivir: no se muestran en ningún lado y quedarían contando
 * contra el tope del plan para siempre.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const actual = await miProducto(user.id, id);
  if (!actual) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  const ahora = new Date();
  await prisma.product.updateMany({
    where: {
      deletedAt: null,
      OR: [{ id }, ...(actual.rolDigital === "PRINCIPAL" ? [{ padreId: id }] : [])],
    },
    data: { deletedAt: ahora, isActive: false },
  });

  /* ── El dominio propio se suelta ───────────────────────────────────────────
   *
   * ⚠️ Y no es sólo prolijidad: cada dominio conectado ocupa un lugar del techo
   * de Vercel —50 por proyecto en el plan gratuito—, y mientras siga anotado la
   * persona no lo puede apuntar a ningún otro lado. Es SUYO: lo compró y lo paga.
   *
   * No corta el borrado si falla. El producto ya está borrado y eso es lo que
   * pidió; un dominio que quedó colgado se arregla después y no lo afecta.
   *
   * ── La dirección de tiendaapps NO se suelta, a propósito ──────────────────
   *
   * Liberar `mecanica.tiendaapps.com` la dejaría disponible para cualquier otro,
   * y los links viejos —que siguen dando vueltas— caerían en la página de un
   * desconocido. Ocupar un nombre no le cuesta nada a nadie; eso sí costaría. */
  try {
    await desconectarDominio(id);
  } catch (e) {
    console.error("[productos-digitales] no se pudo soltar el dominio al borrar", { id, e });
  }

  return NextResponse.json({ ok: true });
}
