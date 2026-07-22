import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import DisenosAdmin from "./DisenosAdmin";

export const metadata = { title: "Diseños — Admin TiendaApps" };

export default async function DisenosAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  return <DisenosAdmin />;
}
