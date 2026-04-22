import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export default async function PanelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (store || user.role === "OWNER") redirect("/dashboard");
  if (user.role === "SELLER") redirect("/vendedoras");

  redirect("/mi-cuenta");
}
