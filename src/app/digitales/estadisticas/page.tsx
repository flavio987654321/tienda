import { getCurrentUser } from "@/lib/auth-session";
import { cargarEstadisticas } from "@/lib/estadisticas-digitales-db";
import BotonVolver from "../BotonVolver";
import EstadisticasClient, { esVista, type Vista } from "./EstadisticasClient";

export const dynamic = "force-dynamic";

/**
 * Estadísticas, del panel de Productos Digitales.
 *
 * Contesta la pregunta que Ventas no contesta: no "¿vendí?" sino **"¿la
 * página sirve?"** — de cada 100 que entraron, cuántos pagaron. Por eso las
 * visitas van al lado de las ventas y no en otra pantalla.
 *
 * Se mira por producto o en general, con el mismo selector que el inicio: en
 * este ecosistema cada producto es su propio sitio y una cuenta Pro tiene
 * cinco. Y con un rango de días, porque una campaña se mide mientras corre.
 * Y en dos solapas: General ("¿vendí, y la página funciona?") y Campañas
 * ("¿me rinde el anuncio?").
 *
 * La consulta y la cuenta viven en `estadisticas-digitales-db` porque las
 * comparte con la exportación. Todo se calcula en el servidor y baja
 * resuelto: la pantalla no importa nada que arrastre Prisma.
 *
 * Sin sesión no se redirige a `/login`: esa ruta está fuera del `scope` del
 * manifiesto y desde la app instalada abría el sitio comercial entero. La
 * pantalla la dibuja el layout.
 */
export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; rango?: string; vista?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const { p, rango, vista: vistaPedida } = await searchParams;
  /* La solapa: General o Campañas. Cualquier otra cosa en la URL cae en General. */
  const vista: Vista = esVista(vistaPedida) ? vistaPedida : "general";

  const { tier, principales, elegido, datos, recortado } = await cargarEstadisticas(user.id, p, rango);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
      <BotonVolver />
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Estadísticas</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Cuánta gente entra a cada página y cuánta termina pagando.
        </p>
      </div>
      <EstadisticasClient
        tier={tier}
        principales={principales}
        elegido={elegido}
        datos={datos}
        recortado={recortado}
        vista={vista}
      />
    </div>
  );
}
