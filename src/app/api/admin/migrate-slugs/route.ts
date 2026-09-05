import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { estaLibre } from "@/lib/direccion-digital";
import { revalidatePath } from "next/cache";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const stores = await prisma.store.findMany({
    select: { id: true, name: true, slug: true },
  });

  const results: { id: string; name: string; oldSlug: string; newSlug: string; status: string }[] = [];

  for (const store of stores) {
    const base = toSlug(store.name) || "tienda";

    // Si el slug ya es limpio (igual al base) no hay nada que hacer
    if (store.slug === base) {
      results.push({ id: store.id, name: store.name, oldSlug: store.slug, newSlug: store.slug, status: "skip" });
      continue;
    }

    /* Buscar el primer slug disponible.
     *
     * ⚠️ `estaLibre` mira LAS DOS tablas: `<nombre>.tiendaapps.com` puede ser
     * una tienda o un producto digital, y el middleware desempata a favor de la
     * tienda. Preguntando sólo por `Store` —como hacía— esta herramienta le
     * podía sacar el subdominio a un producto de un plumazo y en lote, que es
     * la peor forma de que pase. Se excluye la propia tienda: si ya tiene ese
     * nombre, no choca consigo misma. */
    let newSlug = base;
    let counter = 2;
    while (!(await estaLibre(newSlug, undefined, store.id))) {
      newSlug = `${base}-${counter}`;
      counter++;
    }

    if (newSlug === store.slug) {
      results.push({ id: store.id, name: store.name, oldSlug: store.slug, newSlug, status: "skip" });
      continue;
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { slug: newSlug },
    });

    revalidatePath(`/tienda/${store.slug}`, "layout");
    revalidatePath(`/tienda/${newSlug}`, "layout");

    results.push({ id: store.id, name: store.name, oldSlug: store.slug, newSlug, status: "updated" });
  }

  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  return NextResponse.json({ ok: true, updated, skipped, results });
}
