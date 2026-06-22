"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Clock, CheckCircle2 } from "lucide-react";

type Status = {
  donorName: string;
  amount: number;
  status: string;
  campaignName: string | null;
  campaignType: "CANASTA" | "LIBRE";
  campaignDelivered: boolean;
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export default function SeguimientoPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Status | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/canasta/donation-status/${params.id}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        setData(await r.json());
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
        <HeartHandshake className="h-14 w-14 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">No encontramos esa donación</h1>
        <Link href="/comunidad" className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Volver
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const campaignUrl = data.campaignType === "LIBRE" ? "/comunidad/causa" : "/comunidad/campana";

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
      {data.campaignDelivered ? (
        <>
          <HeartHandshake className="h-14 w-14 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Esta campaña ya se entregó!</h1>
          <p className="text-gray-500 max-w-sm mb-6">Gracias por ser parte — tu aporte ayudó a alguien que lo necesitaba.</p>
        </>
      ) : data.status === "CONFIRMED" ? (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu donación está confirmada</h1>
          <p className="text-gray-500 max-w-sm mb-6">Cuando se complete la meta, nuestro equipo decide a quién se le entrega lo recaudado. Para ver cómo sigue, entrá a la página de la campaña cuando quieras.</p>
        </>
      ) : (
        <>
          <Clock className="h-14 w-14 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu donación está pendiente</h1>
          <p className="text-gray-500 max-w-sm mb-6">Todavía no se confirmó el pago. Si ya pagaste, puede demorar unos minutos.</p>
        </>
      )}

      <div className="rounded-2xl border border-amber-900/10 bg-white p-5 max-w-sm w-full shadow-sm text-left">
        <p className="text-xs text-gray-400 mb-1">{data.campaignName}</p>
        <p className="text-sm text-gray-700">{data.donorName}</p>
        <p className="text-lg font-bold text-amber-700">{formatMoney(data.amount)}</p>
      </div>

      <Link href={campaignUrl} className="mt-6 text-amber-600 hover:text-amber-700 text-sm font-medium">
        Ver la campaña →
      </Link>
    </div>
  );
}
