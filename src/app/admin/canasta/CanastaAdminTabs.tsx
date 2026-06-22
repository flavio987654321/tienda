"use client";

import { useState } from "react";
import { HeartHandshake, Sparkles } from "lucide-react";
import CanastaAdmin from "./CanastaAdmin";
import CausaLibreAdmin from "./CausaLibreAdmin";
import CanastaEntregaAdmin from "./CanastaEntregaAdmin";

type Donor = {
  id: string;
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  donorLocalidad: string;
  amount: number;
  status: string;
  createdAt: string | Date;
};

type TestimonialData = { donorName: string; mediaUrl: string | null; mediaType: string | null; text: string | null } | null;

type HistoryItem = {
  campaignId: string;
  campaignName: string;
  deliveredAt: string | Date;
  testimonial: TestimonialData;
};

type CanastaCampaign = {
  id: string;
  name: string;
  status: string;
  goalAmount: number | null;
  reservePct: number;
  products: { id: string; name: string; image: string | null; targetPrice: number }[];
} | null;

type LibreCampaign = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  goalAmount: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  contactPhone: string | null;
} | null;

type Bundle<C> = { campaign: C; donors: Donor[]; history: HistoryItem[] };

export default function CanastaAdminTabs({
  canasta,
  libre,
}: {
  canasta: Bundle<CanastaCampaign>;
  libre: Bundle<LibreCampaign>;
}) {
  const [tab, setTab] = useState<"canasta" | "libre">("canasta");

  return (
    <div>
      <div className="flex gap-1 px-6 sm:px-8 pt-6 border-b border-white/5">
        <button
          type="button"
          onClick={() => setTab("canasta")}
          className={`text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition-colors flex items-center gap-2 ${
            tab === "canasta" ? "border-amber-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <HeartHandshake className="h-4 w-4" /> Canasta Solidaria
        </button>
        <button
          type="button"
          onClick={() => setTab("libre")}
          className={`text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition-colors flex items-center gap-2 ${
            tab === "libre" ? "border-amber-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Causa Libre
        </button>
      </div>

      {tab === "canasta" ? (
        <div>
          <CanastaAdmin campaign={canasta.campaign} />
          <CanastaEntregaAdmin
            type="CANASTA"
            campaign={canasta.campaign}
            donors={canasta.donors}
            history={canasta.history}
          />
        </div>
      ) : (
        <div>
          <CausaLibreAdmin campaign={libre.campaign} />
          <CanastaEntregaAdmin
            type="LIBRE"
            campaign={libre.campaign}
            donors={libre.donors}
            history={libre.history}
          />
        </div>
      )}
    </div>
  );
}
