import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

  const isAdminEmail = ADMIN_EMAIL && data.user.email.toLowerCase() === ADMIN_EMAIL;

  const profile = await prisma.user.findFirst({
    where: {
      OR: [{ id: data.user.id }, { email: data.user.email }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      banned: true,
    },
  });

  if (profile) {
    if (profile.banned) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit `banned` from rest
    const { banned: _, ...rest } = profile;
    // Si el email es el admin y el role no es ADMIN, lo corrige automáticamente
    if (isAdminEmail && rest.role !== "ADMIN") {
      await prisma.user.update({ where: { id: profile.id }, data: { role: "ADMIN" } });
      rest.role = "ADMIN";
    }
    return rest;
  }

  // upsert evita crash por unique constraint si dos requests llegan simultáneamente para el mismo usuario nuevo
  return prisma.user.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? null,
      role: isAdminEmail ? "ADMIN" : "BUYER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  });
}
