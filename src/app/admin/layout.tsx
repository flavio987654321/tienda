import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import AdminSidebar from "./AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
