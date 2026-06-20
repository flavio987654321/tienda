import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export default function SoporteBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-900/10 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <LifeBuoy className="h-4.5 w-4.5 text-amber-700" />
        </div>
        <p className="text-sm text-gray-600 leading-snug">
          ¿Necesitás ayuda? Si tu situación lo requiere, contactá a soporte de TiendaApps y evaluaremos tu caso.
        </p>
      </div>
      <Link
        href="/canasta/soporte"
        className="shrink-0 text-center bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
      >
        Contactar soporte
      </Link>
    </div>
  );
}
