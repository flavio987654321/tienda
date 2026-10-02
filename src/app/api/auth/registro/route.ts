import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarContrasena } from "@/lib/password-policy";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { sendWelcomeEmail } from "@/lib/resend";
import { validarDatosDeAlta, nombreDeTiendaTomado, perfilDeAlta } from "@/lib/alta-de-cuenta";
import { pruebaUsadaAntes } from "@/lib/alta-google-servidor";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`registro:${ip}`, 5, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }
    const { email, password, turnstileToken } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 254) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    /* Acá SOLO se miraba que fuera texto y que no fuera larguísima: no había
       ningún mínimo. El formulario pedía 6 caracteres, pero eso corre en el
       navegador, y quien quiere abrir cuentas a mansalva le pega directo a esta
       ruta. Se podía registrar con una contraseña de un carácter.
       La regla vive ahora en `password-policy`, que usan también los dos
       formularios, así que no puede volver a quedar uno con una regla distinta. */
    const problemaContrasena = validarContrasena(password);
    if (problemaContrasena) {
      return NextResponse.json({ error: problemaContrasena }, { status: 400 });
    }

    /* El resto —nombre, teléfono, tipo de cuenta, plan, tienda, términos— es lo
       mismo que valida el alta con Google, y por eso vive en `alta-de-cuenta`. */
    const validado = validarDatosDeAlta(body);
    if (!validado.ok) {
      return NextResponse.json({ error: validado.error }, { status: 400 });
    }
    const datos = validado.datos;

    // Captcha después de validar campos (un error de tipeo no gasta el token, que es
    // de un solo uso) pero antes de tocar la base (nadie enumera emails sin resolverlo).
    if (!(await verifyTurnstile(turnstileToken, ip, "registro"))) {
      return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email. Iniciá sesión o usá otro email." }, { status: 400 });
    }

    if (datos.type === "OWNER" && datos.storeName) {
      const tomado = await nombreDeTiendaTomado(datos.storeName);
      if (tomado) return NextResponse.json({ error: tomado }, { status: 400 });
    }

    // ¿Ya usó la prueba de este producto con este mail, en una cuenta que eliminó?
    const sinPrueba = (datos.type === "OWNER" || datos.type === "DIGITAL")
      && (await pruebaUsadaAntes(normalizedEmail, datos.type));

    const supabase = createSupabaseAdminClient();

    /* El alta y el link de confirmación, en un solo paso.
     *
     * Antes esto era `admin.createUser({ email_confirm: true })`, que quiere decir
     * literalmente "creá esta cuenta y dala por confirmada". O sea que nunca se le
     * escribía a la dirección: alguien podía registrarse con el correo de otra
     * persona y quedarse con él. El de esa persona además no podía volver a
     * usarlo, y los mails de esa cuenta —incluidos los pedidos, si era una
     * tienda— le llegaban a un desconocido.
     *
     * `generateLink` con tipo "signup" hace las dos cosas de una: crea la cuenta
     * SIN confirmar y devuelve el link que la confirma. Es la misma función que
     * usa la recuperación de contraseña desde siempre.
     *
     * El mail lo mandamos NOSOTROS por Resend, con el diseño de la plataforma, en
     * vez de dejárselo a la plantilla por defecto de Supabase.
     */
    const redirectTo = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/login?confirmado=1`;

    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password,
      options: { data: { name: datos.name, role: datos.type }, redirectTo },
    });

    const linkDeConfirmacion = authData?.properties?.action_link;

    if (authError || !authData?.user || !linkDeConfirmacion) {
      console.error("REGISTRO: no se pudo generar el link de confirmación", authError?.message);
      return NextResponse.json({ error: authError?.message || "No se pudo crear el usuario" }, { status: 400 });
    }

    try {
      const user = await prisma.user.create({
        data: {
          id: authData.user.id,
          email: normalizedEmail,
          password: null,
          ...(await perfilDeAlta(datos, ip, { sinPrueba })),
        },
      });

      /* El mail de bienvenida ahora es LA LLAVE, y por eso se espera.
       *
       * Antes iba sin `await` a propósito: si Resend estaba caído, la cuenta ya
       * estaba creada y no tenía sentido fallar el registro por un mail
       * informativo. Ahora ese mail lleva adentro el link de confirmación, así
       * que si no sale, la cuenta queda creada y **nadie puede entrar**.
       *
       * Si falla NO se borra la cuenta: el mail pudo haberse mandado igual y
       * estar en camino, y borrarla sería peor. Se avisa a la pantalla, que le
       * ofrece reenviarlo. */
      let mailEnviado = true;
      try {
        await sendWelcomeEmail({
          to: normalizedEmail,
          userName: datos.name,
          role: datos.type,
          storeName: datos.type === "OWNER" ? datos.storeName : null,
          digitalPlan: datos.type === "DIGITAL" ? (sinPrueba ? "FREE" : datos.tierDigital) : null,
          confirmLink: linkDeConfirmacion,
          sinPrueba,
        });
      } catch (err) {
        mailEnviado = false;
        console.error("REGISTRO: no se pudo mandar el mail de confirmación a", normalizedEmail, err);
      }

      return NextResponse.json({ success: true, userId: user.id, mailEnviado, ...(sinPrueba ? { sinPrueba } : {}) });
    } catch (dbError) {
      // Revertir usuario Supabase para no dejar registros huérfanos
      const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error("REGISTRO: no se pudo eliminar usuario Supabase huérfano", authData.user.id, deleteError.message);
      }
      throw dbError;
    }
  } catch (e) {
    console.error("REGISTRO ERROR:", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : undefined);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
