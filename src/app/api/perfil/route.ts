import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarTelefono, LARGO_MAXIMO as TELEFONO_MAXIMO } from "@/lib/telefono";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, city: true, phone: true },
  });

  return NextResponse.json({ profile });
}

/* Los topes de cada campo. No están para molestar: sin ninguno, estos tres
   valores entraban a la base con el largo que se les mandara, y el nombre se
   dibuja en el panel, en los mails y en el checkout. Un nombre de 40.000
   caracteres no rompe nada visible el día que se guarda — rompe la pantalla que
   lo muestre, meses después.
   Son generosos a propósito: nadie se llama con más de 80 letras. */
const TOPES = { name: 80, city: 80, phone: TELEFONO_MAXIMO } as const;

/**
 * Un campo que llega en el pedido, limpio y acotado. Devuelve `undefined` cuando
 * el campo NO vino, que es distinto de vacío.
 *
 * Esa diferencia es todo el arreglo de esta ruta. Antes hacía
 * `city: city?.trim() || null` para los tres campos SIEMPRE, así que cualquiera
 * que mandara sólo el nombre y el teléfono —como hace ahora el panel de
 * Productos Digitales, que no pide ciudad— le borraba la ciudad a la persona sin
 * tocarla ni nombrarla. La única pantalla que existía mandaba los tres juntos y
 * por eso nunca se vio.
 */
function campo(valor: unknown, tope: number): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string") return undefined;
  /* Se sacan los caracteres de control antes de medir. No los escribe nadie a
     mano: llegan pegados desde otro lado, y un salto de linea metido adentro
     del nombre se arrastra a los mails y a los encabezados. El byte nulo ademas
     rompe Postgres, que no lo acepta adentro de un texto. */
  const limpio = valor.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, tope).trim();
  return limpio.length > 0 ? limpio : null;
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 20 ediciones por hora alcanzan de sobra para alguien corrigiendo su nombre, y
  // cortan a quien use esto para escribir en la base en loop.
  try {
    if (!(await checkRateLimit(`perfil:${user.id}`, 20, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Demasiados cambios seguidos. Esperá un momento." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/perfil");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, city, phone } = body as Record<string, unknown>;

  // Sólo los campos que vinieron. Un `undefined` en Prisma es "no lo toques".
  const data = {
    name: campo(name, TOPES.name),
    city: campo(city, TOPES.city),
    phone: campo(phone, TOPES.phone),
  };

  /* El nombre no puede quedar en una sola letra. No es cosmética: se dibuja en el
     panel, en los mails y en el checkout de Mercado Pago, y ahí "a" no identifica
     a nadie. Borrarlo del todo sí se permite —es un dato opcional y las pantallas
     tienen su texto de reemplazo—; lo que no se permite es dejarlo a medias. */
  if (typeof data.name === "string" && data.name.length < 2) {
    return NextResponse.json({ error: "El nombre tiene que tener al menos 2 letras" }, { status: 400 });
  }

  /* La MISMA regla que el registro, porque ahora sale de un solo lado. Estaba
     nada más que en el alta: el número que no se podía cargar al crear la cuenta
     se guardaba igual entrando por acá, y quedaba en la base sin que nada lo
     frenara. Un teléfono que no es un teléfono se descubre el día que soporte
     necesita llamar. */
  if (typeof data.phone === "string") {
    const problema = validarTelefono(data.phone);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, city: true, phone: true },
  });

  return NextResponse.json({ profile: updated });
}
