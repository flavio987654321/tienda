import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id?: string;
  role?: string;
};

export default async function PanelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.id) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (store || user.role === "OWNER") redirect("/dashboard");
  if (user.role === "SELLER") redirect("/vendedoras");

  redirect("/registro");
}
