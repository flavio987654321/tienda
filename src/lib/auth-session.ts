import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

export async function getCurrentUser(): Promise<AppSessionUser | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

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
    },
  });

  if (profile) return profile;

  return prisma.user.create({
    data: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? null,
      role: "BUYER",
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
