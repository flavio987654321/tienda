import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * Las dos listas que ve el dueño al tocar el número de suscriptores.
 *
 * Van juntas en una respuesta pero separadas en dos claves, porque son públicos
 * distintos: al seguidor le llega un push a su dispositivo y está registrado en
 * la plataforma; al suscriptor le llega un mail y no tiene cuenta. Mezclarlos en
 * una sola lista obligaría a mirar un ícono para saber qué recibe cada uno.
 */
/**
 * Cuántos se traen de cada lista.
 *
 * Va con los totales al lado a propósito. Un tope sin total es un tope que
 * miente: el dueño con 800 suscriptores vería 500 y nada en pantalla le diría
 * que faltan 300 — y esos 300 igual reciben las campañas, así que el número de
 * arriba tampoco le cerraría con la lista.
 */
const TOPE = 500;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const [seguidores, suscriptores, totalSeguidores, totalSuscriptores] = await Promise.all([
    prisma.storeFollow.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: TOPE,
      select: {
        id: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: TOPE,
      select: { id: true, email: true, confirmed: true, bajaEn: true, createdAt: true },
    }),
    prisma.storeFollow.count({ where: { storeId: store.id } }),
    prisma.newsletterSubscriber.count({ where: { storeId: store.id } }),
  ]);

  return NextResponse.json({
    // Los totales reales, para que el modal pueda decir "mostrando 500 de 837"
    // en vez de dar a entender que 500 es todo lo que hay.
    totales: { seguidores: totalSeguidores, suscriptores: totalSuscriptores },
    tope: TOPE,
    // El mail del seguidor NO se manda: el dueño no lo necesita para nada —el
    // push sale del lado del servidor— y sería entregarle la casilla de una
    // persona registrada que sólo apretó "seguir tienda".
    seguidores: seguidores.map((f) => ({
      id: f.id,
      nombre: f.user?.name ?? "Cliente",
      imagen: f.user?.image ?? null,
      desde: f.createdAt,
    })),
    suscriptores: suscriptores.map((s) => ({
      id: s.id,
      email: s.email,
      // Tres estados y no dos: "pendiente" es el que confunde al dueño cuando
      // ve que la lista es más grande que los envíos.
      estado: s.bajaEn ? "baja" : s.confirmed ? "confirmado" : "pendiente",
      desde: s.createdAt,
    })),
  });
}

/**
 * El dueño saca a alguien de la lista de mail.
 *
 * Se apaga (`bajaEn`), no se borra, por lo mismo que la baja pedida por el
 * suscriptor: una fila borrada deja que esa dirección vuelva a entrar por el
 * formulario público —lo escribe cualquiera— y volvamos a escribirle.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // `updateMany` con el storeId adentro: un id de otra tienda no actualiza nada
  // en vez de tocar una fila ajena.
  const { count } = await prisma.newsletterSubscriber.updateMany({
    where: { id, storeId: store.id, bajaEn: null },
    data: { bajaEn: new Date(), bajaMotivo: "dueño" },
  });

  return NextResponse.json({ ok: true, actualizados: count });
}
