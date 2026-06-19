import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

const MAX_ACTIVE = 3;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const promotions = await prisma.promotion.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(promotions);
}

// POST /api/admin/promociones
// Sube un flyer nuevo (máximo 3 activos a la vez — el carrusel de la home
// no está pensado para más).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { imageUrl, link, sortOrder } = await req.json();
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }
  if (link !== undefined && link !== null && typeof link !== "string") {
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  }

  const activeCount = await prisma.promotion.count({ where: { active: true } });
  if (activeCount >= MAX_ACTIVE) {
    return NextResponse.json({ error: `Ya hay ${MAX_ACTIVE} promociones activas — borrá una para agregar otra.` }, { status: 409 });
  }

  // Cada slot (0, 1, 2) en el admin manda su propio número de orden — si no
  // viene especificado, se agrega al final.
  let finalSortOrder = 0;
  if (typeof sortOrder === "number" && Number.isFinite(sortOrder)) {
    finalSortOrder = Math.round(sortOrder);
  } else {
    const maxOrder = await prisma.promotion.aggregate({ _max: { sortOrder: true } });
    finalSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  }

  // sortOrder es único en la base — si dos uploads casi simultáneos
  // apuntaron al mismo slot (doble click, dos pestañas), solo uno gana y el
  // otro recibe un mensaje claro en vez de duplicar el slot.
  try {
    const promotion = await prisma.promotion.create({
      data: {
        imageUrl: imageUrl.trim(),
        link: link?.trim() || null,
        sortOrder: finalSortOrder,
      },
    });
    return NextResponse.json(promotion);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese espacio ya tiene una promoción — recargá la página." }, { status: 409 });
    }
    throw e;
  }
}
