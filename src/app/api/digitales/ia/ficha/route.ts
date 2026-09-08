import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { anthropic } from "@/lib/anthropic";
import { permitirGeneracion } from "@/lib/ia-digitales";
import { consumirDelCupo, devolverAlCupo, estadoDelCupo } from "@/lib/cupo-ia";
import {
  INSTRUCCIONES, esquemaDeUnaFicha, pedidoDeUnaFicha, normalizarUnaFicha,
} from "@/lib/embudo-ia";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proponer UN bono o UN upsell para un producto que ya existe.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL AGUJERO QUE TAPA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `/ia/embudo` propone los tres de una, y la pantalla los crea en orden
 * empezando por el principal. En Free el tope de principales es UNO, así que
 * apenas alguien tiene su producto —creado con la IA, a mano, o desde el
 * recibimiento— el botón "Armar con IA" desaparece y **el embudo no se puede
 * correr nunca más**. Quien hizo su producto a mano quedaba sin ninguna forma
 * de pedirle a la IA el bono ni el upsell.
 *
 * Encontrado el 08/09/26 mirando la base de una cuenta real: el principal
 * creado a las 18:30 y los bonos cuatro horas después. **El upsell no existía
 * ni borrado**, porque nunca hubo manera de pedirlo.
 *
 * ── Igual que la del embudo: PROPONE, NO GUARDA ────────────────────────────
 *
 * Devuelve una ficha para que la persona la lea, la edite y recién ahí la cree
 * por `POST /api/digitales/productos`, que es la que tiene los topes del plan,
 * la validación y la verificación del padre. Los mismos dos motivos de allá:
 * lo que se publica en una página que cobra lo firma quien vende —tiene que
 * haberlo leído— y los topes se escriben en un solo lugar.
 *
 * ── Cuesta lo mismo que un embudo entero, y es a propósito ─────────────────
 *
 * Sale de la misma bolsa (`CUPO_EMBUDO`) y gasta una. Cobrar "media" por una
 * ficha sería un cupo con fracciones que nadie puede contar de cabeza, y el
 * ahorro real son centavos. Lo que la pantalla sí tiene que hacer es DECIRLO
 * antes de apretar, y lo dice.
 */

/* Corto a propósito, igual que en la del embudo. */
const ESPERA_MS = 45_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  /* Rol DIGITAL, no OWNER: cada ecosistema tiene su puerta. */
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-ficha] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "La IA no está disponible en este momento." }, { status: 503 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;
  const estado = getSubscriptionStatus(sub);

  /* Los topes ANTES de leer el cuerpo y de tocar la base. Y si Redis no
     contesta, se frena: del otro lado hay algo que se paga. Va con `que:
     "embudo"` porque sale de la misma bolsa y es la misma clase de llamada. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: estado === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "embudo",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ficha] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite de generaciones. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const padreId = typeof body?.padreId === "string" ? body.padreId : "";
  /* El rol sale de una lista, nunca de un cast: con un rol inventado el esquema
     se armaría con la descripción equivocada. */
  const rol = body?.rol === "BONO" || body?.rol === "UPSELL" ? body.rol : null;

  if (!padreId || !rol) {
    return NextResponse.json({ error: "Falta decir de qué producto y de qué tipo." }, { status: 400 });
  }

  /* ⚠️ EL DUEÑO ADENTRO DEL `where`. Sin esto, mandando el id de otro se le
     leen el título, la descripción y el precio a un producto ajeno — y encima
     se los devolvemos escritos en la respuesta. */
  const padre = await prisma.product.findFirst({
    where: {
      id: padreId, deletedAt: null, rolDigital: "PRINCIPAL",
      store: { ownerId: user.id },
    },
    select: {
      id: true, name: true, description: true, price: true,
      /* Los que ya cuelgan, para que no proponga uno repetido. */
      hijos: {
        where: { deletedAt: null, rolDigital: rol },
        select: { name: true },
      },
    },
  });
  if (!padre) {
    return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  }

  /* ⚠️ EL CUPO SE GASTA ANTES DE LLAMAR AL MODELO. Después sería tarde: ocho
     pedidos en paralelo pasarían todos el control —porque ninguno gastó
     todavía— y generarían los ocho. Si la llamada falla, se devuelve. */
  const bolsa = await consumirDelCupo(user.id, tier);
  if (!bolsa) {
    const cupo = await estadoDelCupo(user.id, tier);
    return NextResponse.json({
      error: cupo.topeDelMes > 0
        ? `Usaste todas tus generaciones. El ${cupo.proximoMes ? "1° del mes que viene" : "mes que viene"} tenés ${cupo.topeDelMes} nuevas.`
        : "Usaste todas las generaciones de tu plan.",
      sinCupo: true,
      cupo,
    }, { status: 429 });
  }

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 700,
        /* Las MISMAS instrucciones que el embudo: qué se puede entregar acá, cómo
           se escribe, y qué no se puede prometer. Escritas de nuevo para una
           ficha sola, se desincronizan de a una — y la que quedaría vieja es
           justo la lista de lo que no se puede prometer. */
        system: INSTRUCCIONES,
        tools: [{
          name: "proponer_ficha",
          description: rol === "BONO"
            ? "Devuelve un bono de regalo para el producto principal."
            : "Devuelve un upsell para el producto principal.",
          input_schema: esquemaDeUnaFicha(rol),
        }],
        tool_choice: { type: "tool", name: "proponer_ficha" },
        messages: [{
          role: "user",
          content: pedidoDeUnaFicha(
            rol,
            { titulo: padre.name, bajada: padre.description, precio: padre.price },
            padre.hijos.map((h) => h.name),
          ),
        }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-ficha] falló la llamada a Anthropic", e);
    await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "No pudimos proponerte nada en este momento. Probá de nuevo en un minuto." },
      { status: 502 },
    );
  }

  console.log("[ia-ficha] usage", {
    userId: user.id, tier, rol,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  const ficha = bloque ? normalizarUnaFicha(bloque.input, rol) : null;

  if (!ficha) {
    console.error("[ia-ficha] lo que volvió no tenía la forma esperada", {
      userId: user.id, rol, stop: respuesta.stop_reason,
    });
    /* No se le cobra: los tokens se gastaron pero la persona no se lleva nada. */
    await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "Nos salió algo raro. Probá de nuevo." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    ficha,
    cupo: await estadoDelCupo(user.id, tier),
  });
}
