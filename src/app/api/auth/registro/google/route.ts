import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { sendWelcomeEmail } from "@/lib/resend";
import { validarDatosDeAlta, nombreDeTiendaTomado, perfilDeAlta } from "@/lib/alta-de-cuenta";
import { tieneGoogle } from "@/lib/alta-google";
import { esElAdmin, tieneAltaPendiente } from "@/lib/alta-google-servidor";

/**
 * El alta de quien entró con Google: el mismo formulario de `/registro`, sin
 * mail ni contraseña (los pone Google) y sin captcha (ya hay una sesión real
 * detrás, y el límite va por cuenta).
 *
 * Solo sirve para una cuenta con Google y con el alta pendiente: no puede
 * cambiarle el rol ni el plan a una cuenta que ya existe.
 */

class AltaRechazada extends Error {
  constructor(mensaje: string, readonly status: number) { super(mensaje); }
}

async function quienEs() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user?.email || !tieneGoogle(user)) return null;
  return user;
}

/** ¿Le falta el alta? Lo usa `/registro?google=1` para saber qué mostrar. */
export async function GET() {
  const user = await quienEs();
  if (!user) return NextResponse.json({ pendiente: false }, { status: 401 });
  const nombre = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  return NextResponse.json({
    pendiente: await tieneAltaPendiente(user.id),
    email: user.email,
    nombre: nombre.slice(0, 100),
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await quienEs();
    if (!user?.email) return NextResponse.json({ error: "Volvé a entrar con Google." }, { status: 401 });

    if (!(await checkRateLimit(`registro-google:${user.id}`, 5, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }, { status: 429 });
    }
    if (await esElAdmin(user.id, user.email)) {
      return NextResponse.json({ error: "Esta cuenta no se puede crear con Google." }, { status: 403 });
    }
    if (!(await tieneAltaPendiente(user.id))) {
      return NextResponse.json({ error: "Tu cuenta ya está creada.", yaCreada: true }, { status: 409 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }
    const validado = validarDatosDeAlta(body);
    if (!validado.ok) return NextResponse.json({ error: validado.error }, { status: 400 });
    const datos = validado.datos;

    if (datos.type === "OWNER" && datos.storeName) {
      const tomado = await nombreDeTiendaTomado(datos.storeName);
      if (tomado) return NextResponse.json({ error: tomado }, { status: 400 });
    }

    const email = user.email.toLowerCase().trim();
    const perfil = await perfilDeAlta(datos, getClientIp(req));

    /* Una sola alta por cuenta, aunque lleguen dos a la vez (doble click, dos
       pestañas con planes distintos). Si ya existe el "comprador" vacío que
       crea `getCurrentUser`, primero se lo RECLAMA con un update condicionado
       a que siga vacío: Postgres bloquea la fila, y la segunda encuentra 0
       filas y no toca nada. Si no existe, se crea, y la segunda choca con el
       id repetido. */
    try {
      await prisma.$transaction(async (tx) => {
        const existe = await tx.user.findUnique({ where: { id: user.id }, select: { banned: true } });
        if (existe?.banned) throw new AltaRechazada("Esta cuenta está suspendida.", 403);
        if (existe) {
          const reclamo = await tx.user.updateMany({
            where: { id: user.id, role: "BUYER", termsAcceptedAt: null },
            data: { termsAcceptedAt: new Date() },
          });
          if (reclamo.count === 0) throw new AltaRechazada("Tu cuenta ya está creada.", 409);
          await tx.user.update({ where: { id: user.id }, data: perfil });
        } else {
          await tx.user.create({ data: { id: user.id, email, password: null, ...perfil } });
        }
      });
    } catch (e) {
      if (e instanceof AltaRechazada) {
        return NextResponse.json({ error: e.message, yaCreada: e.status === 409 }, { status: e.status });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Llegaron dos a la vez y la otra ganó; o el mail es de otra cuenta.
        if (!(await tieneAltaPendiente(user.id))) return NextResponse.json({ error: "Tu cuenta ya está creada.", yaCreada: true }, { status: 409 });
        return NextResponse.json({ error: "Ya existe una cuenta con ese email. Iniciá sesión con tu contraseña." }, { status: 400 });
      }
      throw e;
    }

    // Informativo: el mail ya lo confirmó Google, así que no lleva link y un
    // fallo no frena nada. Con `await` igual: sin él, Vercel corta la función
    // al responder y el mail no sale nunca.
    await sendWelcomeEmail({
      to: email,
      userName: datos.name,
      role: datos.type,
      storeName: datos.type === "OWNER" ? datos.storeName : null,
      digitalPlan: datos.type === "DIGITAL" ? datos.tierDigital : null,
    }).catch((err) => console.error("REGISTRO GOOGLE: no salió el mail de bienvenida a", email, err));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("REGISTRO GOOGLE ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
