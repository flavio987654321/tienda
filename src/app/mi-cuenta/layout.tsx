import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";

/* La cuenta del cliente no tenía NINGUNA guarda.
 *
 * La pantalla es un componente de cliente, así que no había dónde ponerla: sin
 * sesión se dibujaba igual y quedaba vacía, esperando datos que las APIs —esas
 * sí protegidas— nunca le iban a dar. No se filtraba nada; simplemente se veía
 * una pantalla rota en vez de un login.
 *
 * Un layout de servidor arriba resuelve las dos cosas: decide antes de dibujar
 * y manda a cada rol a su panel, igual que las otras tres puertas. */
export default async function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "OWNER") redirect("/dashboard");
  if (user.role === "SELLER") redirect("/afiliados");

  return children;
}
