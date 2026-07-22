import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { promotionStatus, parseStringArray } from "@/lib/promotions";

// Las promos de MONTO FIJO que están corriendo ahora, para el formulario de
// productos (F6-C9): con el precio y la categoría que se están cargando, ¿alguna
// promo vigente dejaría a este producto gratis o casi?
//
// Endpoint aparte y no el GET de la lista porque las preguntas son distintas: la
// lista pagina, incluye pausadas y archivadas y devuelve la promo entera para
// mostrarla. Acá alcanza con las que de verdad aplican y con los campos que
// deciden el alcance — así el formulario de productos no arrastra la paginación
// ni el peso de una pantalla que no es la suya.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ promotions: [] });

  const now = new Date();
  const all = await prisma.storePromotion.findMany({
    where: { storeId: store.id, type: "FIXED", archivedAt: null, isActive: true },
    select: { name: true, type: true, value: true, scope: true, categories: true, productIds: true, startsAt: true, endsAt: true, isActive: true, archivedAt: true },
  });

  // Solo "active": una PAUSADA o PROGRAMADA no le está descontando nada a nadie
  // hoy, y avisar por ellas sería una alarma por algo que no está pasando.
  const promotions = all
    .filter((p) => promotionStatus(p, now) === "active")
    .map((p) => ({
      name: p.name,
      type: p.type,
      value: p.value,
      scope: p.scope,
      categories: parseStringArray(p.categories),
      productIds: parseStringArray(p.productIds),
    }));

  return NextResponse.json({ promotions });
}
