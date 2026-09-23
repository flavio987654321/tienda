import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { pasosParaMover, LUGARES } from "@/lib/orden-promociones";

// PUT /api/admin/promociones/reordenar
// Mueve un flyer a otro lugar del carrusel de la home. Si el lugar está ocupado,
// los dos se intercambian; si está vacío, el flyer se muda y listo.
//
// Es una ruta aparte y no el PUT de `[id]` con `sortOrder`, que ya existe: aquél
// escribe una fila sola y acá SIEMPRE hay que mirar a los dos. Mandar un número
// de orden por su cuenta es lo que choca contra el `@@unique([sortOrder])` de la
// base, y quien llama no tiene por qué saber en qué orden hay que escribir.
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, sortOrder } = await req.json();
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "Falta el flyer" }, { status: 400 });
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder >= LUGARES) {
    return NextResponse.json({ error: "Ese lugar no existe" }, { status: 400 });
  }

  const promociones = await prisma.promotion.findMany({ orderBy: { sortOrder: "asc" } });
  if (!promociones.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Ese flyer ya no está — recargá la página." }, { status: 404 });
  }

  /* Qué escrituras hacen falta y en qué orden lo decide `orden-promociones`, que
     se prueba solo. Acá sólo se aplican. */
  const pasos = pasosParaMover(promociones, id, sortOrder);

  if (pasos.length > 0) {
    try {
      /* Los tres pasos del intercambio, o ninguno. Cortarse en el medio dejaría
         un flyer en el lugar provisorio —o sea, fuera del carrusel— y la home
         mostrando dos en vez de tres. */
      await prisma.$transaction(
        pasos.map((paso) =>
          prisma.promotion.update({ where: { id: paso.id }, data: { sortOrder: paso.sortOrder } }),
        ),
      );
    } catch (e) {
      /* Dos pestañas moviendo al mismo tiempo: la lista que leímos arriba ya no
         es la que está en la base. No se reintenta solo —quedaría un orden que
         nadie pidió—, se avisa y se recarga. */
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.code === "P2025")) {
        return NextResponse.json(
          { error: "Alguien movió los flyers mientras tanto — recargá la página." },
          { status: 409 },
        );
      }
      throw e;
    }
  }

  /* Vuelve la lista entera y ya ordenada: el panel la pisa tal cual en vez de
     adivinar cómo quedaron los dos que se tocaron. */
  const actualizadas = await prisma.promotion.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(actualizadas);
}
