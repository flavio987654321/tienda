import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`registro:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }, { status: 429 });
    }

    const { name, email, password, storeName, accountType, billing, tier } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const type = accountType === "seller" ? "SELLER" : accountType === "buyer" ? "BUYER" : "OWNER";
    if (type === "OWNER" && !storeName) {
      return NextResponse.json({ error: "El nombre de la tienda es requerido" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "No se pudo completar el registro. Verificá los datos e intentá de nuevo." }, { status: 400 });
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
          ...(type === "OWNER" || type === "SELLER"
            ? {
                subscription: {
                  create: {
                    role: type === "OWNER" ? "OWNER" : "AFFILIATE",
                    plan: billing === "ANNUAL" ? "ANNUAL" : "MONTHLY",
                    status: "TRIAL",
                    trialEndsAt,
                    ...(type === "OWNER" ? { tier: tier === "PREMIUM" ? "PREMIUM" : "BASIC" } : {}),
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
  } catch (e: any) {
    console.error("REGISTRO ERROR:", e?.message, e?.stack);
    return NextResponse.json({ error: e?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}

async function uniqueStoreSlug(storeName: string): Promise<string> {
  const base = toSlug(storeName) || "tienda";
  // Sufijo único desde el inicio — elimina la ventana de race condition entre check y create
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const slug = `${base}-${suffix}`;
  // Verificación extra por si acaso (colisión prácticamente imposible)
  const exists = await prisma.store.findUnique({ where: { slug } });
  return exists ? `${slug}-${Math.random().toString(36).slice(2, 6)}` : slug;
}
