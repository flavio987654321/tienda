import { NextRequest, NextResponse } from "next/server";
import { buscarSlugLibre, reservarSlug } from "@/lib/direccion-digital";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import type { TierDigital } from "@/lib/planes-digitales";
import {
  rolDe, topeDe, validarCampos, imagenValida, LARGO_TITULO, LARGO_DESCRIPCION,
} from "@/lib/productos-digitales";
import { limpiarTexto } from "@/lib/texto-limpio";
import { espacioDigital } from "@/lib/espacio-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crear un producto digital, un bono o un upsell.
 *
 * Los tres entran por acá porque **son la misma cosa**: lo único que cambia es
 * el rol y de quién cuelgan. Tres rutas serían tres copias de estas mismas
 * validaciones, que se desincronizan de a una.
 *
 * Los frenos, en orden:
 *
 *   1. Sesión y **rol DIGITAL**. Sin lo segundo, una dueña de tienda podría
 *      crearse productos por acá saltándose el panel que le corresponde.
 *   2. Tope de intentos.
 *   3. El rol sale de una lista, nunca de un cast.
 *   4. Los campos, con la misma función que usa la edición.
 *   5. **El padre tiene que ser un PRINCIPAL de ESTA cuenta.** Es el freno más
 *      importante: `padreId` llega del navegador, y sin verificar de quién es,
 *      cualquiera cuelga un bono del producto de otra persona.
 *   6. El tope del plan, contado en la base y no en la pantalla.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`digital-producto:${user.id}`, 60, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiados productos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /digitales/productos");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { rol: rolCrudo, padreId, name, description, price, comparePrice, imagen } = body as Record<string, unknown>;

  const rol = rolDe(rolCrudo);
  if (!rol) return NextResponse.json({ error: "Tipo de producto inválido" }, { status: 400 });

  // Un bono no se cobra, pase lo que pase mande el navegador.
  const precio = rol === "BONO" ? 0 : price;

  const problema = validarCampos({ name, description, price: precio, comparePrice }, rol);
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  if (typeof name !== "string") return NextResponse.json({ error: "Falta el título" }, { status: 400 });

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { tier: true, role: true },
  });
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;

  const espacio = await espacioDigital(user.id);
  if ("error" in espacio) return NextResponse.json({ error: espacio.error }, { status: 409 });

  /* ⚠️ De quién cuelga, verificado contra ESTA cuenta.
   *
   * `padreId` viaja en el pedido. Sin este chequeo, mandar el id del producto de
   * otra persona le cuelga un bono adentro de su embudo: aparece en su página de
   * venta y se entrega con sus compras. */
  let padre: string | null = null;
  if (rol !== "PRINCIPAL") {
    if (typeof padreId !== "string" || !padreId) {
      return NextResponse.json({ error: "Falta decir de qué producto es" }, { status: 400 });
    }
    const principal = await prisma.product.findFirst({
      where: { id: padreId, storeId: espacio.storeId, rolDigital: "PRINCIPAL", deletedAt: null },
      select: { id: true },
    });
    if (!principal) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
    padre = principal.id;
  }

  const tope = topeDe(tier, rol);

  /* ⚠️ Contar y crear van JUNTOS, en una transacción y con candado.
   *
   * Antes eran dos pasos sueltos: contar, y después crear. Entre uno y otro hay
   * un ratito, y en ese ratito entra otro pedido de la misma cuenta: los dos
   * preguntan "¿cuántos hay?", a los dos les contestan "cero", y los dos crean.
   * Quedan dos productos en un plan que permite uno.
   *
   * Con una persona haciendo clic no pasaba —va de a uno, y el doble clic ya
   * está trabado en la pantalla—. Pero la cáscara que arma la IA crea el
   * principal, el bono y el upsell de una sentada, que es exactamente el caso
   * que lo dispara. Se tapa ahora porque después hay que descubrirlo mirando una
   * cuenta Free con tres productos.
   *
   * El candado es POR TIENDA (`pg_advisory_xact_lock`) y no global: dos
   * creaciones de la misma cuenta se hacen una después de la otra, y las de
   * cuentas distintas no se estorban entre sí. Se suelta solo al terminar la
   * transacción, salga bien o salga mal. */
  const creado = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${espacio.storeId}))`;

    /* El tope se cuenta en la base y NO se confía en que la pantalla haya apagado
       el botón: el botón apagado es una cortesía, no un permiso. */
    const cuantos = await tx.product.count({
      where: {
        storeId: espacio.storeId,
        rolDigital: rol,
        deletedAt: null,
        ...(rol === "PRINCIPAL" ? {} : { padreId: padre }),
      },
    });
    if (cuantos >= tope) return null;

    return tx.product.create({
      data: {
        storeId: espacio.storeId,
        rolDigital: rol,
        padreId: padre,
        name: limpiarTexto(name, LARGO_TITULO) ?? "",
        description: limpiarTexto(description, LARGO_DESCRIPCION),
        price: typeof precio === "number" ? precio : 0,
        comparePrice: typeof comparePrice === "number" && comparePrice > 0 ? comparePrice : null,
        /* La imagen se guarda sólo si es una dirección NUESTRA. Ver `imagenValida`:
           una url ajena adentro de la página de venta es un rastreador de un
           tercero que ve entrar a cada visitante. */
        images: imagenValida(imagen) ? JSON.stringify([imagen]) : "[]",
        /* Nace despublicado SIEMPRE, aunque venga con todo cargado. Publicar es
           una decisión aparte y con su propio chequeo: un producto sin archivo
           publicado se puede comprar y no se puede entregar. */
        isActive: false,
      },
      select: { id: true },
    });
  });

  /* `null` es "no entrabas por el tope". Se contesta afuera de la transacción a
     propósito: adentro habría que tirar para cortarla, y una excepción para algo
     que no es un error deja rastros feos en los registros. */
  if (!creado) {
    return NextResponse.json(
      {
        error:
          tope === 0
            ? "Tu plan no incluye upsells. Pasá a Starter o Pro para agregarlos."
            : "Llegaste al tope de tu plan. Pasá a un plan más grande para agregar más.",
        tope,
      },
      { status: 409 }
    );
  }

  /* ── La dirección del producto ─────────────────────────────────────────────
   *
   * ⚠️ SÓLO EL PRINCIPAL, y desde que nace. Si la dirección apareciera más
   * tarde —al publicar, al mejorar de plan— sería una dirección que CAMBIA, y
   * cambiarle la URL a algo que ya se está publicitando se lleva puestos los
   * anuncios corriendo, el historial del píxel y los links repartidos.
   *
   * Un bono y un upsell no llevan: no son páginas que alguien visite, se
   * entregan con la compra.
   *
   * ── Por qué va afuera de la transacción de arriba ─────────────────────────
   *
   * Porque reservar el nombre toma SU PROPIO candado —sobre el nombre, no sobre
   * la cuenta—, y dos candados anidados que se piden en distinto orden son un
   * abrazo mortal esperando. Afuera, el primero ya se soltó.
   *
   * ── Y por qué no corta el pedido si falla ─────────────────────────────────
   *
   * Porque el producto ya existe y está bien. Quedarse sin dirección no lo
   * rompe: la tarjeta lo dice y hay un botón para elegirla a mano. Tirar acá
   * sería devolver un error por algo que sí se creó, y la pantalla mostraría
   * "no se pudo" al lado del producto recién hecho. */
  if (rol === "PRINCIPAL") {
    try {
      const libre = await buscarSlugLibre(limpiarTexto(name, LARGO_TITULO) ?? "");
      if (libre) await reservarSlug(creado.id, libre);
    } catch (e) {
      console.error("[productos-digitales] no se pudo reservar la dirección", { id: creado.id, e });
    }
  }

  return NextResponse.json({ ok: true, id: creado.id });
}
