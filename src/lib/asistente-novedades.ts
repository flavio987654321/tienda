import { getStoreSnapshot } from "@/lib/asistente-insights";
import { getUpcomingDates } from "@/lib/fechas-comerciales";

export type Novedad = {
  tieneNovedad: boolean;
  tipo: "oportunidad" | "alerta" | null;
};

/**
 * Decide si hay algo "avisable" para esta tienda — sin IA, solo reglas de código.
 * Se usa para elegir la cara de la burbuja antes de que el dueño abra el chat,
 * sin gastar ni un token de Claude.
 */
export async function getNovedad(storeId: string, tipoTienda: string): Promise<Novedad> {
  const [snapshot, fechasProximas] = await Promise.all([
    getStoreSnapshot(storeId, tipoTienda),
    Promise.resolve(getUpcomingDates(7)),
  ]);

  // Alerta: algo que requiere atención del dueño.
  if (snapshot.productosStockBajo > 0) return { tieneNovedad: true, tipo: "alerta" };
  if (snapshot.tendenciaVentas === "bajando") return { tieneNovedad: true, tipo: "alerta" };

  // Oportunidad: fecha comercial próxima, vale la pena avisar con tiempo.
  if (fechasProximas.length > 0) return { tieneNovedad: true, tipo: "oportunidad" };

  return { tieneNovedad: false, tipo: null };
}
