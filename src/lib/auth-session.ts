import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import { faltaSegundoPaso } from "@/lib/mfa";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  banned: true,
} satisfies Prisma.UserSelect;

type UserProfile = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

async function toSessionUser(profile: UserProfile, isAdminEmail: boolean): Promise<AppSessionUser | null> {
  if (profile.banned) return null;

  const { banned: _, ...user } = profile;
  if (isAdminEmail && user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: profile.id }, data: { role: "ADMIN" } });
    user.role = "ADMIN";
  }
  return user;
}

/**
 * La persona de la sesión. Si la cuenta tiene la verificación en dos pasos y
 * esta sesión todavía no la pasó, devuelve null: para todo el sistema, quien
 * puso la contraseña pero no la huella todavía no entró. Es lo que cierra de una
 * todas las APIs con sesión, incluidas las que se agreguen después. Ver
 * `lib/seguridad-cuenta`.
 *
 * El admin es la excepción: tiene su propio segundo paso (`/verificar-2fa`), que
 * su layout y el middleware exigen por su cuenta.
 */
export async function getCurrentUser(): Promise<AppSessionUser | null> {
  const r = await cargarUsuario();
  return r && !r.faltaSegundoPaso ? r.user : null;
}

/**
 * Como `getCurrentUser`, pero también devuelve a quien le falta el segundo paso,
 * con la marca. Sólo para la pantalla de verificación y sus endpoints: es lo
 * único que alguien en ese estado puede usar.
 */
export async function getUsuarioConSegundoPaso(): Promise<{ user: AppSessionUser; faltaSegundoPaso: boolean } | null> {
  return cargarUsuario();
}

async function cargarUsuario(): Promise<{ user: AppSessionUser; faltaSegundoPaso: boolean } | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

  const isAdminEmail = Boolean(ADMIN_EMAIL && data.user.email.toLowerCase() === ADMIN_EMAIL);
  const falta = !isAdminEmail && (await faltaSegundoPaso(supabase, data.user));
  const user = await perfilDe(data.user as typeof data.user & { email: string }, isAdminEmail);
  return user ? { user, faltaSegundoPaso: falta } : null;
}

async function perfilDe(
  authUser: { id: string; email: string; user_metadata?: { name?: string } | null },
  isAdminEmail: boolean,
): Promise<AppSessionUser | null> {
  const data = { user: authUser };

  const profile = await prisma.user.findFirst({
    where: {
      OR: [{ id: data.user.id }, { email: data.user.email }],
    },
    select: profileSelect,
  });

  if (profile) return toSessionUser(profile, isAdminEmail);

  try {
    const createdOrExistingProfile = await prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? null,
        role: isAdminEmail ? "ADMIN" : "BUYER",
      },
      select: profileSelect,
    });
    return toSessionUser(createdOrExistingProfile, isAdminEmail);
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    // Otra solicitud pudo crear el mismo perfil de Supabase después de la búsqueda.
    const profileCreatedByConcurrentRequest = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: profileSelect,
    });
    if (!profileCreatedByConcurrentRequest) throw error;

    return toSessionUser(profileCreatedByConcurrentRequest, isAdminEmail);
  }
}
