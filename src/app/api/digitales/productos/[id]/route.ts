import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  rolDe, loQueFalta, validarCampos, imagenValida, LARGO_TITULO, LARGO_DESCRIPCION,
} from "@/lib/productos-digitales";
import { limpiarTexto } from "@/lib/texto-limpio";

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
     se cobra la plata y no llega nada. */
  if (publicado === true) {
    const falta = loQueFalta({
      rolDigital: actual.rolDigital,
      archivoPath: actual.archivoPath,
      price: typeof precio === "number" ? precio : actual.price,
      name: typeof name === "string" ? name : actual.name,
    });
    if (falta) return NextResponse.json({ error: falta }, { status: 409 });
  }

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

  return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true });
}
