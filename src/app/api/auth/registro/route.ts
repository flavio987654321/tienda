import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const { name, email, password, storeName, accountType } = await req.json();

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
      return NextResponse.json({ error: "El email ya esta registrado" }, { status: 400 });
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
        },
      });

      return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw error;
    }
  } catch (e: any) {
    console.error("REGISTRO ERROR:", e?.message, e?.stack);
    return NextResponse.json({ error: e?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}

async function uniqueStoreSlug(storeName: string) {
  let slug = toSlug(storeName);
  const slugExists = await prisma.store.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now()}`;
  return slug;
}
