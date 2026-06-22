"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import SoporteBanner from "@/components/canasta/SoporteBanner";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

type CampaignInfo = {
  campaign: { id: string; name: string; goalAmount: number } | null;
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export default function DonarPage() {
  return (
    <Suspense>
      <DonarContent />
    </Suspense>
  );
}

function DonarContent() {
  const searchParams = useSearchParams();
  const failed = searchParams.get("donacion") === "error";

  const [campaign, setCampaign] = useState<CampaignInfo["campaign"] | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  const [amount, setAmount] = useState<number | "">("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorLocalidad, setDonorLocalidad] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/canasta/campaign", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCampaign(d.campaign ?? null))
      .finally(() => setLoadingCampaign(false));
  }, []);

  const maxDonation = campaign ? Math.floor(campaign.goalAmount * 0.2) : null;

  async function submit() {
    if (submitting) return;
    setError(null);

    if (!acceptedTerms) {
      setError("Tenés que aceptar los Términos y Condiciones para continuar.");
      return;
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1000) {
      setError("El monto mínimo es $1.000");
      return;
    }
    if (maxDonation && amount > maxDonation) {
      setError(`El máximo por donación es ${formatMoney(maxDonation)}, para que la campaña sea un aporte de toda la comunidad.`);
      return;
    }
    if (!donorName.trim() || !donorPhone.trim() || !donorEmail.trim() || !donorLocalidad.trim()) {
      setError("Completá todos los campos");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/canasta/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, donorName, donorPhone, donorEmail, donorLocalidad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la donación");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la donación");
      setSubmitting(false);
    }
  }

  if (loadingCampaign) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
        <HeartHandshake className="h-14 w-14 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No hay ninguna campaña activa ahora</h1>
        <Link href="/comunidad" className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900">
      <div className="border-b border-amber-900/10 px-6 py-5 grid grid-cols-3 items-center sticky top-0 bg-[#FFFBF5]/90 backdrop-blur-xl z-10">
        <Link
          href="/comunidad/campana"
          aria-label="Volver"
          className="w-9 h-9 rounded-full border border-amber-900/10 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-amber-50 transition-colors justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/" className="text-sm font-bold text-gray-900 justify-self-center hover:text-amber-700 transition-colors">TiendaApps</Link>
        <div className="flex items-center gap-2 text-amber-700 justify-self-end">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Donar</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">Donar a {campaign.name}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Mínimo $1.000{maxDonation ? ` — máximo ${formatMoney(maxDonation)} por persona` : ""}. Podés donar con o sin crear una cuenta.
        </p>

        {failed && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3 mb-6">
            El pago no se completó. Podés intentarlo de nuevo.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Monto</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`text-xs font-semibold rounded-lg py-2 border transition-colors ${
                    amount === a ? "bg-amber-500 text-white border-amber-500" : "bg-white border-amber-900/10 text-gray-700 hover:bg-amber-50"
                  }`}
                >
                  {formatMoney(a)}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
              placeholder="Otro monto"
              className="w-full bg-white border border-amber-900/10 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <input
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="Nombre y apellido"
            className="w-full bg-white border border-amber-900/10 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="tel"
            value={donorPhone}
            onChange={(e) => setDonorPhone(e.target.value)}
            placeholder="Teléfono"
            className="w-full bg-white border border-amber-900/10 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="email"
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-white border border-amber-900/10 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            value={donorLocalidad}
            onChange={(e) => setDonorLocalidad(e.target.value)}
            placeholder="Localidad"
            className="w-full bg-white border border-amber-900/10 rounded-lg px-3 py-2.5 text-sm"
          />

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 accent-amber-500 shrink-0"
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              Acepto los{" "}
              <a href="/canasta/terminos" target="_blank" rel="noopener" className="text-amber-700 underline hover:text-amber-800">
                Términos de la donación
              </a>
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !acceptedTerms}
            className="w-full bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-600 hover:to-green-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submitting ? "Redirigiendo a Mercado Pago..." : "Continuar al pago"}
          </button>
          <p className="text-center text-[11px] text-gray-400">
            Esta donación es voluntaria y no reembolsable. Una donación por persona por campaña.
          </p>
        </div>

        <div className="mt-8">
          <SoporteBanner />
        </div>
      </div>
    </div>
  );
}
