import { prisma } from "@/lib/prisma";
import { altaPendiente, type PerfilParaAlta } from "@/lib/alta-google";

/** El perfil de esta cuenta, con lo justo para saber si le falta el alta. */
export async function perfilParaAlta(userId: string): Promise<PerfilParaAlta> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      termsAcceptedAt: true,
      store: { select: { id: true } },
      subscription: { select: { id: true } },
    },
  });
  if (!u) return null;
  return {
    role: u.role,
    termsAcceptedAt: u.termsAcceptedAt,
    tieneTienda: !!u.store,
    tieneSuscripcion: !!u.subscription,
  };
}

export async function tieneAltaPendiente(userId: string): Promise<boolean> {
  return altaPendiente(await perfilParaAlta(userId));
}

/** ¿Es el admin? Por el mail configurado o por el rol en la base. */
export async function esElAdmin(userId: string, email: string | null | undefined): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEmail && email && email.toLowerCase().trim() === adminEmail) return true;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}
