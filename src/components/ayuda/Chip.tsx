import type { Clase } from "@/lib/ayuda";

/* Marca de qué mitad de la ayuda es el artículo, y no es decorativo: le dice al
   lector si va a encontrar el paso a paso o el criterio antes de hacer clic. */
export default function Chip({ clase }: { clase: Clase }) {
  const esMecanica = clase === "mecanica";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
        esMecanica ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-700"
      }`}
    >
      {esMecanica ? "Cómo se hace" : "Qué conviene"}
    </span>
  );
}
