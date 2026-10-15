"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * El cartel rojo de arriba de los tres paneles cuando alguien pidió "Perdí mi
 * celular" en esta cuenta. Va en el panel y no sólo por mail porque, si el pedido
 * lo hizo quien robó el mail, los mails los puede borrar él: esto lo ve la
 * dueña la próxima vez que entra. Ver `lib/seguridad-cuenta`.
 */
export default function AvisoSeguridad({ className = "" }: { className?: string }) {
  const [rec, setRec] = useState<{ estado: string; venceAt: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/seguridad/aviso", { cache: "no-store", signal: AbortSignal.timeout(15_000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setRec(d?.recuperacion ?? null); })
      .catch(() => { /* sin cartel: no es motivo para ensuciar el panel */ });
    return () => { vivo = false; };
  }, []);

  if (!rec) return null;
  const fecha = rec.venceAt
    ? new Date(rec.venceAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <div role="alert" className={`rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 text-sm text-red-900">
          <p className="font-bold">
            {rec.estado === "congelada"
              ? "Frenamos un pedido para quitar tu verificación en dos pasos."
              : `Alguien pidió quitar tu verificación en dos pasos${fecha ? ` (se quitaría a partir del ${fecha})` : ""}.`}
          </p>
          <p className="mt-0.5 text-red-900/80">Si no fuiste vos, cancelalo ya y cambiá tu contraseña.</p>
        </div>
        <Link href="/panel?seguridad=1" className="shrink-0 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">
          Ver
        </Link>
      </div>
    </div>
  );
}
