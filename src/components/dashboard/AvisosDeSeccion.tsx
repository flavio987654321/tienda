import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Aviso } from "@/lib/avisos-tienda";

/**
 * Los avisos de una sección, arriba de todo y con el texto a la vista.
 *
 * El triángulo del menú lateral es, por fuerza, un ícono mudo: ahí no entra una
 * frase. Acá sí entra, y es donde la persona puede hacer algo al respecto — por
 * eso este cartel dice qué pasa, por qué importa y a dónde ir.
 *
 * Y es el único lugar donde se ven los AMARILLOS. En el menú van solo los rojos:
 * el menú está siempre en pantalla y unos cuantos triangulitos amarillos fijos
 * se vuelven empapelado en una semana, hasta que el rojo tampoco se ve.
 */
export default function AvisosDeSeccion({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {avisos.map((aviso) => {
        const rojo = aviso.nivel === "rojo";
        return (
          <div
            key={aviso.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              rojo ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 shrink-0 mt-0.5 ${rojo ? "text-red-500" : "text-amber-500"}`}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${rojo ? "text-red-800" : "text-amber-900"}`}>
                {aviso.titulo}
              </p>
              <p className={`text-xs mt-0.5 ${rojo ? "text-red-700" : "text-amber-800"}`}>
                {aviso.detalle}
              </p>
            </div>
            <Link
              href={aviso.href}
              className={`shrink-0 self-center rounded-full px-3 py-1.5 text-xs font-semibold text-white ${
                rojo ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              Resolver
            </Link>
          </div>
        );
      })}
    </div>
  );
}
