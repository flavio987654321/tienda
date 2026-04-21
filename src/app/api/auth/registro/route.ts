import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
    const { name, email, password, storeName } = await req.json();

    if (!name || !email || !password || !storeName) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    let slug = toSlug(storeName);
    const slugExists = await prisma.store.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now()}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "SELLER",
        store: {
          create: {
            name: storeName,
            slug,
          },
        },
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (e: any) {
    console.error("REGISTRO ERROR:", e?.message, e?.stack);
    return NextResponse.json({ error: e?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}
