import { getCurrentUser } from "@/lib/auth-session";
import PanelTutoriales from "@/components/panel/PanelTutoriales";
import { tutorialesPara } from "@/lib/tutoriales";
import BotonVolver from "../BotonVolver";

/* Los tutoriales del panel de Productos Digitales (16/10/26). Ver
   `lib/tutoriales`. Sin sesión no se redirige: la pantalla la dibuja el layout
   (ver Mi cuenta). */
export default async function TutorialesDigitales() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <BotonVolver />
      <PanelTutoriales secciones={tutorialesPara("digitales")} acento="naranja" />
    </div>
  );
}
