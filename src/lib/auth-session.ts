import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

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

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

  const isAdminEmail = Boolean(ADMIN_EMAIL && data.user.email.toLowerCase() === ADMIN_EMAIL);

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
