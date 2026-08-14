import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { actualizarStoreConfig } from "@/lib/store-config";
import { marcarVinculado, desmarcarVinculado } from "@/lib/apps/whatsapp-vinculo";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

// POST   /api/facebook/whatsapp/vinculo → la dueña dice que ya lo vinculó
// DELETE /api/facebook/whatsapp/vinculo → se arrepiente / lo desvinculó en Meta
//
// Acá NO se habla con Meta. El vínculo entre el catálogo y WhatsApp lo hace ella
// en el panel de Meta —ver `lib/apps/whatsapp-vinculo` para el porqué— y esto
// sólo guarda que lo dio por hecho, para que la pantalla deje de pedírselo.
//
// Reemplaza a `whatsapp/accounts` y `whatsapp/connect`, que llamaban a la Graph
// API con un permiso que la app no tiene: devolvían error #200 para todo el mundo.

// Techo generoso: no hay nada caro atrás, sólo evita que un bucle escriba
// storeConfig sin freno.
async function dentroDelTope(userId: string): Promise<boolean> {
  const { permitido } = await checkRateLimitConRespaldo(
    `wa-vinculo:${userId}`,
    20,
    60_000,
    { limiteFallback: 20, limiteFallbackGlobal: 400 },
  );
  return permitido;
}

async function cambiar(marcar: boolean) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTope(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbCatalogId: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Sin catálogo no hay nada que vincular, así que darlo por hecho sería dejar la
  // ficha en verde sobre algo que no existe. Al desmarcar no se exige: si perdió
  // el catálogo, con más razón hay que poder sacar la marca.
  if (marcar && !store.fbCatalogId) {
    return NextResponse.json(
      { error: "Primero instalá la app Catálogo de Meta: es la que crea el catálogo que vas a vincular." },
      { status: 400 },
    );
  }

  await actualizarStoreConfig(store.id, marcar ? marcarVinculado : desmarcarVinculado);

  return NextResponse.json({ ok: true });
}

export async function POST() {
  return cambiar(true);
}

export async function DELETE() {
  return cambiar(false);
}
