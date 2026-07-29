import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";

export const dynamic = "force-dynamic";

/**
 * La conversación que ve el dueño al abrir el chat.
 *
 * Son DOS cosas con reglas distintas metidas en la misma lista:
 *
 *   - La charla de hoy. Se resetea sola al cambiar el día, igual que antes.
 *   - Los avisos que Sasha mandó sola y todavía no se leyeron, de CUALQUIER día.
 *     Si escribió el martes y el dueño entra el jueves, ese mensaje tiene que
 *     estar: si no, el contador del globito diría 1 y al abrir no habría nada.
 *
 * Se traen en dos consultas y se ordenan juntas. Una sola con un OR daría lo
 * mismo, pero así queda escrito en el código cuál es cuál y por qué.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const day = getArgentinaDayKey();

  const mensajes = await prisma.asistenteMensaje.findMany({
    where: {
      userId: user.id,
      OR: [
        // La charla de hoy y los avisos de hoy, leídos o no.
        //
        // Los avisos de hoy tienen que quedar aunque ya estén leídos. Si sólo se
        // trajeran los sin leer, pasaba esto: entrás, leés el aviso de la mañana
        // —que lo marca como leído—, recargás la página, y el mensaje ya no está.
        // Leerlo de un vistazo lo borraba.
        { day },
        // Y los avisos sin leer de CUALQUIER día: si Sasha escribió el martes y
        // entrás el jueves, tiene que estar. Si no, el contador diría 1, abrís, y
        // no hay nada.
        { esAviso: true, leidoAt: null },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true, esAviso: true, leidoAt: true },
  });

  return NextResponse.json({
    messages: mensajes.map((m) => ({ role: m.role, content: m.content })),
    // El contador del globito: los avisos sin leer, de cualquier día.
    sinLeer: mensajes.filter((m) => m.esAviso && m.leidoAt === null).length,
    // Si ya habló hoy, no vuelve a saludar. Cuenta también el aviso de la mañana:
    // un "¡Hola! ¿Por dónde arrancamos?" arriba de un aviso suyo queda raro. Y no
    // puede depender de si está leído o no, o el saludo aparecería recién después
    // de que el dueño lea el aviso.
    yaSaludoHoy: mensajes.some((m) => m.role === "assistant"),
  });
}

/**
 * Marca los avisos como leídos. Se llama cuando el dueño abre el chat.
 *
 * Guarda el momento y no un booleano: cuesta lo mismo y deja saber cuánto tardó
 * en mirarlos, que es la única forma de darse cuenta después si los avisos sirven
 * o se ignoran. Un `read = true` no se puede convertir en eso más adelante.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { count } = await prisma.asistenteMensaje.updateMany({
    where: { userId: user.id, esAviso: true, leidoAt: null },
    data: { leidoAt: new Date() },
  });

  return NextResponse.json({ ok: true, marcados: count });
}
