import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";

const TERMS_VERSION = CURRENT_TERMS_VERSION;

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

    const { name, email, password, storeName, accountType, billing, tier, phone, termsAccepted, ageConfirmed, turnstileToken } = await req.json();

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
    if (typeof password !== "string" || password.length > 72) {
      return NextResponse.json({ error: "La contraseña no puede superar 72 caracteres" }, { status: 400 });
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

    const type = accountType === "seller" ? "SELLER" : accountType === "buyer" ? "BUYER" : "OWNER";
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
          // El plan de afiliadas (SELLER) es gratuito — no se crea Subscription para ese rol
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
            : {}),
        },
      });

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
