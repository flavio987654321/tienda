import { prisma } from "@/lib/prisma";
import { altaPendiente, type PerfilParaAlta } from "@/lib/alta-google";
import { huellaDeMail, dominiosParaBuscar } from "@/lib/prueba-repetida";

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

/**
 * ¿Esta cuenta tiene contraseña guardada?
 *
 * Se mira la contraseña misma (`auth.users.encrypted_password`) y NO la lista
 * de proveedores: cuando alguien que entró con Google agrega una contraseña,
 * Supabase no siempre suma "email" a esa lista, y "Agregar contraseña" le
 * seguiría apareciendo para siempre. Ante la duda (no se pudo leer), true: es
 * preferible no ofrecer algo a ofrecerlo de más.
 */
export async function tieneContrasena(userId: string): Promise<boolean> {
  try {
    const filas = await prisma.$queryRaw<{ con: boolean }[]>`
      SELECT coalesce(encrypted_password, '') <> '' AS con FROM auth.users WHERE id::text = ${userId}`;
    return filas[0]?.con ?? true;
  } catch (e) {
    console.error("[cuenta] no se pudo saber si tiene contraseña:", e instanceof Error ? e.message : e);
    return true;
  }
}

/**
 * ¿Este mail (o un alias suyo) ya usó la prueba de este producto en una cuenta
 * que después eliminó? Ver `lib/prueba-repetida`.
 *
 * Ante un error de la base, false: no se le niega la prueba a alguien porque
 * la consulta se cayó. El costo de equivocarse para ese lado es una prueba.
 */
export async function pruebaUsadaAntes(email: string, tipo: "OWNER" | "DIGITAL"): Promise<boolean> {
  try {
    const huella = huellaDeMail(email);
    const candidatos = await prisma.deletedAccountAudit.findMany({
      where: {
        subscriptionRole: tipo,
        OR: dominiosParaBuscar(email).map((d) => ({ originalEmail: { endsWith: `@${d}`, mode: "insensitive" as const } })),
      },
      select: { originalEmail: true },
      take: 5000,
    });
    return candidatos.some((c) => c.originalEmail && huellaDeMail(c.originalEmail) === huella);
  } catch (e) {
    console.error("[prueba] no se pudo revisar si ya la usó:", e instanceof Error ? e.message : e);
    return false;
  }
}
