import { prisma } from "@/lib/prisma";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/adminSections";

// Lógica de los contadores de "nuevo desde la última vez" del panel admin.
// Vive acá y no en la ruta para que el endpoint consolidado (/api/admin/badges)
// y cualquier otro consumidor la compartan sin duplicarla.

// Cuántos registros entraron después del seenAt en cada sección. Un filtro por
// sección porque cada una vive en otra tabla y con otro criterio de "evento".
function countNew(section: AdminSection, seenAt: Date): Promise<number> {
  switch (section) {
    case "disenos":
      return prisma.designBrief.count({ where: { createdAt: { gt: seenAt } } });
    case "leads":
      return prisma.lead.count({ where: { createdAt: { gt: seenAt } } });
    case "testimonios":
      return prisma.testimonial.count({ where: { createdAt: { gt: seenAt } } });
    case "donaciones":
      // Solo confirmadas: una donación que quedó PENDING y nunca se pagó no es
      // un evento real que valga la pena avisar.
      return prisma.donation.count({ where: { createdAt: { gt: seenAt }, status: "CONFIRMED" } });
  }
}

// Cuenta lo nuevo de cada sección para un admin. La primera vez que no existe el
// registro de "visto" lo crea con seenAt=now (único write): así el histórico
// previo a activar esto NO aparece como un badge gigante y las llamadas
// siguientes son solo lectura.
export async function getNewCounts(userId: string): Promise<Record<AdminSection, number>> {
  const entries = await Promise.all(
    ADMIN_SECTIONS.map(async (section) => {
      let view = await prisma.adminSectionView.findUnique({
        where: { userId_section: { userId, section } },
      });
      if (!view) {
        try {
          view = await prisma.adminSectionView.create({ data: { userId, section } });
        } catch {
          // Dos lecturas concurrentes pueden intentar crearlo a la vez; el unique
          // rechaza una y acá la re-leemos.
          view = await prisma.adminSectionView.findUnique({
            where: { userId_section: { userId, section } },
          });
        }
      }
      const count = await countNew(section, view?.seenAt ?? new Date());
      return [section, count] as const;
    })
  );
  return Object.fromEntries(entries) as Record<AdminSection, number>;
}
