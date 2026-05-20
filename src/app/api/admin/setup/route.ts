import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta admin" }, { status: 409 });
  }

  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "email, password y name son requeridos" }, { status: 400 });
  }
  if (password.length < 16) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 16 caracteres" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
    user_metadata: { name, role: "ADMIN" },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Error creando usuario" }, { status: 500 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        name,
        email: email.toLowerCase().trim(),
        role: "ADMIN",
      },
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: e?.message ?? "Error en DB" }, { status: 500 });
  }
}
