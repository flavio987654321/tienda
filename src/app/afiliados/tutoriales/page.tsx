import type { Metadata } from "next";
import PanelTutoriales from "@/components/panel/PanelTutoriales";
import TemaComoPanel from "@/components/panel/TemaComoPanel";
import { getCurrentUser } from "@/lib/auth-session";
import { tutorialesPara } from "@/lib/tutoriales";

/* Los tutoriales del afiliado (16/10/26). Ver `lib/tutoriales`. La guarda, como
   en `/afiliados/ayuda`: el layout esconde la pantalla pero no evita que corra. */
export const metadata: Metadata = { title: "Tutoriales", robots: { index: false, follow: false } };

export default async function TutorialesDelAfiliado() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") return null;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <TemaComoPanel>
          <PanelTutoriales secciones={tutorialesPara("afiliado")} acento="indigo" volverA="/afiliados" />
        </TemaComoPanel>
      </div>
    </div>
  );
}
