import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import LeadsAdmin from "./LeadsAdmin";

export const metadata = { title: "Leads — Admin TiendaApps" };

export default async function LeadsAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  return <LeadsAdmin />;
}
