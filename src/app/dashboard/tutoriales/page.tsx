"use client";

import DashboardLayout from "@/components/DashboardLayout";
import PanelTutoriales from "@/components/panel/PanelTutoriales";
import { useRubroDelPanel } from "@/contexts/RubroDelPanel";
import { tutorialesPara } from "@/lib/tutoriales";

/* Los tutoriales del dueño de tienda (16/10/26), según el rubro: una
   concesionaria ve los de consultas y tasaciones, una tienda de ropa los de
   pedidos y cupones, igual que su menú. Ver `lib/tutoriales`. */
export default function TutorialesDelPanel() {
  const { tipoTienda } = useRubroDelPanel();
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PanelTutoriales secciones={tutorialesPara("tienda", tipoTienda)} acento="indigo" volverA="/dashboard" />
      </div>
    </DashboardLayout>
  );
}
