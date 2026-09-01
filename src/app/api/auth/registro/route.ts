import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarContrasena } from "@/lib/password-policy";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { sendWelcomeEmail } from "@/lib/resend";
import { altaDigitalFree, altaDigitalConPrueba } from "@/lib/subscription";
import { TIERS_DIGITALES, type TierDigital } from "@/lib/planes-digitales";

const TERMS_VERSION = CURRENT_TERMS_VERSION;

/* Productos Digitales todavía no está abierto. El interruptor se mira también
   acá y no sólo en la pantalla: el formulario se puede saltear pegándole
   directo a esta ruta, y sin esto se podrían crear cuentas de un ecosistema que
   no existe para nadie más. */
const DIGITALES_ON = process.env.NEXT_PUBLIC_DIGITALES_ENABLED === "1";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`registro:${ip}`, 5, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }, { status: 429 });
    }

    const { name, email, password, storeName, accountType, billing, tier, digitalTier, phone, termsAccepted, ageConfirmed, turnstileToken } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }
    if (!termsAccepted || !ageConfirmed) {
      return NextResponse.json({ error: "Debés aceptar los términos y condiciones y confirmar tu edad para continuar." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length > 100) {
      return NextResponse.json({ error: "El nombre no puede superar 100 caracteres" }, { status: 400 });
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
    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.length > 30) {
        return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
      }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) {
        return NextResponse.json({ error: "El teléfono debe tener entre 8 y 15 dígitos" }, { status: 400 });
      }
    }

    /* El tipo de cuenta sale de una tabla y no de una cadena de ternarios.

       El ternario que había acá terminaba en `: "OWNER"`, o sea que CUALQUIER
       valor desconocido creaba una cuenta de tienda. Con tres tipos se notaba
       poco; al sumar el cuarto, pedir una cuenta digital creaba una cuenta DE
       TIENDA —con su tienda vacía y su prueba de 7 días corriendo— y sin ningún
       error: la persona pedía una cosa y recibía otra.

       El `hasOwnProperty` es por lo mismo que en `planDe`: `accountType` llega del
       navegador, y sin él un valor como "constructor" devuelve algo heredado del
       prototipo en vez de undefined.

       Sin `accountType` sigue siendo OWNER, que es como se comportaba antes para
       quien no lo manda. Lo que ya no pasa es que un valor equivocado se tome
       por bueno. */
    type TipoDeCuenta = "OWNER" | "SELLER" | "BUYER" | "DIGITAL";
    const TIPOS_DE_CUENTA: Record<string, TipoDeCuenta> = {
      owner: "OWNER",
      seller: "SELLER",
      buyer: "BUYER",
      digital: "DIGITAL",
    };
    let type: TipoDeCuenta = "OWNER";
    if (accountType !== undefined && accountType !== null) {
      if (typeof accountType !== "string" || !Object.prototype.hasOwnProperty.call(TIPOS_DE_CUENTA, accountType)) {
        return NextResponse.json({ error: "Tipo de cuenta inválido" }, { status: 400 });
      }
      type = TIPOS_DE_CUENTA[accountType];
    }
    if (type === "DIGITAL" && !DIGITALES_ON) {
      return NextResponse.json({ error: "Las cuentas de Productos Digitales todavía no están disponibles." }, { status: 400 });
    }

    /* El plan digital que eligió, validado contra la lista real.

       Se busca en un array con `find` y no en un objeto a propósito: no hay
       prototipo del que heredar, así que "constructor" no puede colarse. Lo que
       no esté en la lista se rechaza en vez de caer en un default, y sin plan
       elegido es FREE — nunca uno pago.

       Que esto sea seguro NO depende de esta validación sola: el alta de un plan
       pago sale de `altaDigitalConPrueba`, que devuelve TRIAL y jamás ACTIVE. Aun
       si esta lista se aflojara, lo más que se podría pedir son los siete días
       que la pantalla ofrece igual. */
    let tierDigital: TierDigital = "FREE";
    if (type === "DIGITAL" && digitalTier !== undefined && digitalTier !== null) {
      const elegido = TIERS_DIGITALES.find((t) => t === digitalTier);
      if (!elegido) {
        return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
      }
      tierDigital = elegido;
    }

    if (type === "OWNER" && !storeName) {
      return NextResponse.json({ error: "El nombre de la tienda es requerido" }, { status: 400 });
    }
    if (type === "OWNER" && typeof storeName === "string" && storeName.trim().length > 80) {
      return NextResponse.json({ error: "El nombre de la tienda no puede superar 80 caracteres" }, { status: 400 });
    }

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

    if (type === "OWNER" && storeName) {
      const baseSlug = toSlug(storeName.trim()) || "tienda";
      const [slugExists, nameExists] = await Promise.all([
        prisma.store.findUnique({ where: { slug: baseSlug }, select: { id: true } }),
        prisma.store.findFirst({ where: { name: { equals: storeName.trim(), mode: "insensitive" } }, select: { id: true } }),
      ]);
      if (slugExists || nameExists) {
        return NextResponse.json({ error: "Ya existe una tienda con un nombre muy similar. Elegí un nombre diferente." }, { status: 400 });
      }
    }

    const supabase = createSupabaseAdminClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role: type },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "No se pudo crear el usuario" }, { status: 400 });
    }

    try {
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          id: authData.user.id,
          name,
          email: normalizedEmail,
          password: null,
          role: type,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          termsAcceptedIp: ip,
          // Acaba de aceptar la versión vigente al registrarse: no tiene por qué
          // recibir el mail de "actualizamos los términos" de esa misma versión.
          termsNotifiedVersion: TERMS_VERSION,
          ...(phone ? { phone: phone.trim() } : {}),
          ...(type === "OWNER"
            ? {
                store: {
                  create: {
                    name: storeName,
                    slug: await uniqueStoreSlug(storeName),
                  },
                },
              }
            : {}),
          /* Quién arranca con suscripción y cuál.
             - OWNER   → su prueba de 7 días, que al vencer le cierra la tienda.
             - DIGITAL → Free, sin tarjeta y sin vencimiento. Los 7 días existen
                         igual, pero son para probar Starter o Pro desde adentro
                         y no la puerta de entrada. Ver `altaDigitalFree`.
             - SELLER  → el plan de afiliados es gratuito y no crea Subscription.
             - BUYER   → tampoco. */
          ...(type === "OWNER"
            ? {
                subscription: {
                  create: {
                    role: "OWNER",
                    plan: billing === "ANNUAL" ? "ANNUAL" : "MONTHLY",
                    status: "TRIAL",
                    trialEndsAt,
                    tier: tier === "PREMIUM" ? "PREMIUM" : "BASIC",
                  },
                },
              }
            : type === "DIGITAL"
            ? {
                subscription: {
                  create:
                    tierDigital === "FREE"
                      ? { ...altaDigitalFree() }
                      : { ...altaDigitalConPrueba(tierDigital) },
                },
              }
            : {}),
        },
      });

      // Bienvenida. Va acá y no por cron: el alta es el disparador, así llega
      // en el momento. Sin await a propósito — si Resend está caído o lento, la
      // cuenta ya está creada y no tiene por qué fallar el registro por un mail.
      sendWelcomeEmail({
        to: normalizedEmail,
        userName: name,
        role: type,
        storeName: type === "OWNER" ? storeName : null,
        digitalPlan: type === "DIGITAL" ? tierDigital : null,
      }).catch((err) => console.error("[email] sendWelcomeEmail failed:", err));

      return NextResponse.json({ success: true, userId: user.id });
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

async function uniqueStoreSlug(storeName: string): Promise<string> {
  const base = toSlug(storeName) || "tienda";
  const first = await prisma.store.findUnique({ where: { slug: base } });
  if (!first) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const exists = await prisma.store.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
  }
  // Fallback con timestamp si los 99 slots están ocupados (prácticamente imposible)
  return `${base}-${Date.now().toString(36)}`;
}
