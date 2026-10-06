import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { despues } from "@/lib/despues";
import { diaAR, HORAS_DEMORA } from "@/lib/seguimiento";

/**
 * El resumen del día para cada concesionaria (06/10/26), desde el cron
 * diario (12:00 UTC = 9 de la mañana en Argentina).
 *
 * "Hoy: 2 visitas, 3 para llamar y 1 consulta sin responder". Uno solo por
 * tienda y sólo si hay algo: un aviso diario de "no tenés nada" enseña a
 * ignorar los avisos.
 *
 * Por qué un resumen y no un aviso a las 2 horas de cada consulta: el cron
 * corre una vez por día. El "sin responder" en el momento lo marca el panel,
 * en rojo; esto es lo que la dueña ve al empezar el día aunque no abra el panel.
 */
export async function avisarAgendaDelDia(ahora = new Date()): Promise<{ tiendas: number }> {
  const hoy = diaAR(ahora);
  const abierta = { status: "PENDING", store: { tipoTienda: "AUTOS", isActive: true } };

  const [visitas, llamar, sinResponder] = await Promise.all([
    prisma.seguimientoConsulta.groupBy({
      by: ["storeId"], _count: { _all: true },
      where: { visitaEl: { gte: hoy.desde, lte: hoy.hasta }, lead: abierta },
    }),
    prisma.seguimientoConsulta.groupBy({
      by: ["storeId"], _count: { _all: true },
      where: { recordarEl: { lte: hoy.hasta }, lead: abierta },
    }),
    prisma.lead.groupBy({
      by: ["storeId"], _count: { _all: true },
      where: {
        ...abierta, customerPhone: { not: null }, createdAt: { lt: new Date(ahora.getTime() - HORAS_DEMORA * 3600_000) },
        OR: [{ seguimiento: { is: null } }, { seguimiento: { is: { etapa: null } } }],
      },
    }),
  ]);

  const porTienda = new Map<string, { visitas: number; llamar: number; sinResponder: number }>();
  const sumar = (filas: { storeId: string; _count: { _all: number } }[], k: "visitas" | "llamar" | "sinResponder") => {
    for (const f of filas) {
      const t = porTienda.get(f.storeId) ?? { visitas: 0, llamar: 0, sinResponder: 0 };
      t[k] = f._count._all;
      porTienda.set(f.storeId, t);
    }
  };
  sumar(visitas, "visitas");
  sumar(llamar, "llamar");
  sumar(sinResponder, "sinResponder");
  if (porTienda.size === 0) return { tiendas: 0 };

  const tiendas = await prisma.store.findMany({ where: { id: { in: [...porTienda.keys()] } }, select: { id: true, ownerId: true } });
  for (const t of tiendas) {
    const n = porTienda.get(t.id)!;
    const partes = [
      n.visitas && `${n.visitas} ${n.visitas === 1 ? "visita" : "visitas"}`,
      n.llamar && `${n.llamar} para llamar`,
      n.sinResponder && `${n.sinResponder} ${n.sinResponder === 1 ? "consulta" : "consultas"} sin responder`,
    ].filter(Boolean) as string[];
    const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
    const aviso = { title: "Tu agenda de hoy", body: `Hoy tenés ${lista}. Está todo en Consultas.` };
    await createNotification({ userId: t.ownerId, type: "AGENDA_DEL_DIA", ...aviso, link: "/dashboard/consultas" });
    despues(() => sendPushToUser(t.ownerId, { ...aviso, url: "/dashboard/consultas" }), "agenda del día: push");
  }
  return { tiendas: tiendas.length };
}
