"use client";

import { useState } from "react";
import { BadgeCheck, X, MapPin, Phone, Calendar } from "lucide-react";

type VerifiedInfo = {
  showName: boolean;
  name: string | null;
  showCity: boolean;
  city: string | null;
  showPhone: boolean;
  phone: string | null;
  showSince: boolean;
  memberSince: string | null;
};

export default function VerifiedBadge({ info }: { info: VerifiedInfo }) {
  const [open, setOpen] = useState(false);

  const hasAnyInfo = info.showName || info.showCity || info.showPhone || info.showSince;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-colors"
        title="Identidad verificada"
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Verificado
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Identidad verificada</p>
                  <p className="text-xs text-gray-500">por TiendaApps</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Este vendedor confirmó su identidad con documentación real. Sus datos fueron revisados por nuestro equipo.
            </p>

            {hasAnyInfo && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                {info.showName && info.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-gray-700 font-medium">{info.name}</span>
                  </div>
                )}
                {info.showCity && info.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{info.city}</span>
                  </div>
                )}
                {info.showPhone && info.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={`https://wa.me/${info.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      +{info.phone}
                    </a>
                  </div>
                )}
                {info.showSince && info.memberSince && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">Vendedor desde {info.memberSince}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
