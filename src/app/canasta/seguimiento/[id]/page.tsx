"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Trophy, Clock, CheckCircle2 } from "lucide-react";

type Status = {
  donorName: string;
  amount: number;
  status: string;
  campaignName: string | null;
  drawHappened: boolean;
  winnerPosition: 1 | 2 | 3 | null;
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
        <Link href="/canasta" className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Volver a la canasta
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

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
      {data.winnerPosition ? (
        <>
          <Trophy className="h-14 w-14 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Ganaste el {data.winnerPosition}° puesto!</h1>
          <p className="text-gray-500 max-w-sm mb-6">Te vamos a contactar por teléfono para coordinar la entrega.</p>
        </>
      ) : data.drawHappened ? (
        <>
          <HeartHandshake className="h-14 w-14 text-amber-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Esta vez no salió tu nombre</h1>
          <p className="text-gray-500 max-w-sm mb-6">Gracias por ser parte — tu aporte ayudó a completar una canasta real para un vecino.</p>
        </>
      ) : data.status === "CONFIRMED" ? (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu donación está confirmada</h1>
          <p className="text-gray-500 max-w-sm mb-6">Ya estás participando del sorteo. Te vamos a avisar por email cuándo es.</p>
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

      <Link href="/canasta" className="mt-6 text-amber-600 hover:text-amber-700 text-sm font-medium">
        ← Volver a la canasta
      </Link>
    </div>
  );
}
