"use client";

import { useState } from "react";
import { Check, X, Phone, User, MessageCircle, ChevronDown, Tag, TrendingUp, Copy, ExternalLink } from "lucide-react";
import { money } from "@/lib/utils";

const TEMPLATES = [
  {
    label: "Saludo inicial",
    text: (name: string, product: string) =>
      `Hola ${name}! 👋 Te contacto por tu consulta sobre *${product}*. ¿En qué te puedo ayudar?`,
  },
  {
    label: "Consulta stock",
    text: (name: string, product: string) =>
      `Hola ${name}! Tenemos stock disponible de *${product}*. ¿Cuántas unidades necesitás?`,
  },
  {
    label: "Envío info",
    text: (name: string, product: string) =>
      `Hola ${name}! Te comento que *${product}* tiene envío a todo el país. ¿Querés que te cuente más detalles?`,
  },
  {
    label: "Cerrar venta",
    text: (name: string, product: string) =>
      `Hola ${name}! ¿Seguís interesado/a en *${product}*? Podemos coordinar el pago y envío cuando quieras 😊`,
  },
];

type Lead = {
  id: string;
  productName: string;
  productPrice: number;
  customerName: string | null;
  customerPhone: string | null;
  customerMessage: string | null;
  status: string;
  commissionAmount: number | null;
  commissionRate: number | null;
  confirmedAt: string | null;
  createdAt: string;
  affiliate: { id: string; userName: string | null; userEmail: string | null } | null;
};

function leadStatusLabel(s: string) {
  if (s === "CONFIRMED") return { label: "Confirmada", cls: "bg-green-100 panel-oscuro:bg-green-500/15 text-green-700 panel-oscuro:text-green-300" };
  if (s === "REJECTED") return { label: "Rechazada", cls: "bg-red-100 panel-oscuro:bg-red-500/15 text-red-700 panel-oscuro:text-red-300" };
  return { label: "Pendiente", cls: "bg-yellow-100 panel-oscuro:bg-yellow-500/15 text-yellow-700 panel-oscuro:text-yellow-300" };
}

function QuickReplyTemplates({
  phone,
  name,
  product,
}: {
  phone: string;
  name: string;
  product: string;
}) {
  const [copied, setCopied] = useState<number | null>(null);

  function whatsappUrl(text: string) {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const displayName = name || "cliente";

  return (
    <div className="rounded-xl border border-green-100 panel-oscuro:border-green-500/30 bg-green-50/50 panel-oscuro:bg-green-500/10 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700 panel-oscuro:text-green-300">
        Respuesta rápida
      </p>
      <div className="space-y-2">
        {TEMPLATES.map((tpl, idx) => {
          const text = tpl.text(displayName, product);
          return (
            <div key={idx} className="flex items-start gap-2">
              <p className="flex-1 rounded-lg border border-green-100 panel-oscuro:border-green-500/30 bg-white panel-oscuro:bg-gray-900 px-3 py-2 text-xs text-gray-700 panel-oscuro:text-gray-300 leading-relaxed">
                <span className="mb-0.5 block font-semibold text-gray-500 panel-oscuro:text-gray-400">{tpl.label}</span>
                {text}
              </p>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => copyText(text, idx)}
                  title="Copiar texto"
                  className="flex items-center justify-center rounded-lg bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 p-1.5 text-gray-400 panel-oscuro:text-gray-500 hover:text-gray-700 panel-oscuro:hover:text-gray-300 transition-colors"
                >
                  <Copy className={`h-3.5 w-3.5 ${copied === idx ? "text-green-600 panel-oscuro:text-green-400" : ""}`} />
                </button>
                <a
                  href={whatsappUrl(text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en WhatsApp"
                  className="flex items-center justify-center rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeadsClient({
  initialLeads,
  commissionRate,
}: {
  initialLeads: Lead[];
  commissionRate: number;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "REJECTED">("ALL");
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = leads.filter((l) => filter === "ALL" || l.status === filter);

  async function updateStatus(leadId: string, status: "CONFIRMED" | "REJECTED") {
    setLoading(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status,
                  confirmedAt: status === "CONFIRMED" ? new Date().toISOString() : null,
                  commissionAmount:
                    status === "CONFIRMED" && l.commissionRate
                      ? Math.floor((l.productPrice * l.commissionRate) / 100)
                      : null,
                }
              : l
          )
        );
      }
    } finally {
      setLoading(null);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-8 sm:p-16 text-center">
        <MessageCircle className="h-10 w-10 text-gray-200 panel-oscuro:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-500 panel-oscuro:text-gray-400 font-medium">Todavía no tenés consultas</p>
        <p className="text-sm text-gray-400 panel-oscuro:text-gray-500 mt-1">Cuando alguien consulte por un producto desde un link de afiliado, aparecerá acá.</p>
      </div>
    );
  }

  return (
    <div className="bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 overflow-hidden">
      {/* Filtros */}
      <div className="flex gap-2 p-4 border-b border-gray-50 panel-oscuro:border-gray-800 overflow-x-auto">
        {(["ALL", "PENDING", "CONFIRMED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f ? "bg-indigo-600 text-white" : "bg-gray-50 panel-oscuro:bg-gray-800/50 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
            }`}
          >
            {f === "ALL" ? "Todas" : f === "PENDING" ? "Pendientes" : f === "CONFIRMED" ? "Confirmadas" : "Rechazadas"}
            <span className="ml-1.5 opacity-70">
              {f === "ALL" ? leads.length : leads.filter((l) => l.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-50 panel-oscuro:divide-gray-800">
        {filtered.map((lead) => {
          const { label, cls } = leadStatusLabel(lead.status);
          const isExpanded = expanded === lead.id;
          const estimatedCommission = Math.floor((lead.productPrice * commissionRate) / 100);

          return (
            <div key={lead.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Producto */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                    {lead.affiliate && (
                      <span className="text-xs text-indigo-600 panel-oscuro:text-indigo-400 bg-indigo-50 panel-oscuro:bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">
                        Afiliado: {lead.affiliate.userName || lead.affiliate.userEmail}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 panel-oscuro:text-gray-100 truncate">{lead.productName}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 panel-oscuro:text-gray-400">
                    <span className="font-medium text-gray-700 panel-oscuro:text-gray-300">{money(lead.productPrice)}</span>
                    {lead.affiliate && lead.status === "PENDING" && (
                      <span className="flex items-center gap-1 text-indigo-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Comisión estimada: {money(estimatedCommission)}
                      </span>
                    )}
                    {lead.status === "CONFIRMED" && lead.commissionAmount && (
                      <span className="flex items-center gap-1 text-green-600 panel-oscuro:text-green-400 font-semibold">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Comisión acreditada: {money(lead.commissionAmount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 panel-oscuro:text-gray-500 mt-1">
                    {new Date(lead.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  {lead.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => updateStatus(lead.id, "CONFIRMED")}
                        disabled={!!loading}
                        title="Confirmar venta"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => updateStatus(lead.id, "REJECTED")}
                        disabled={!!loading}
                        title="Rechazar"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-400 text-xs font-semibold hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : lead.id)}
                    className="p-2 rounded-xl hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/50 transition-colors text-gray-400 panel-oscuro:text-gray-500"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Detalles expandibles */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-50 panel-oscuro:border-gray-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lead.customerName && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-gray-50 panel-oscuro:bg-gray-800/50 rounded-lg shrink-0">
                          <User className="h-3.5 w-3.5 text-gray-500 panel-oscuro:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Cliente</p>
                          <p className="text-sm font-medium text-gray-900 panel-oscuro:text-gray-100">{lead.customerName}</p>
                        </div>
                      </div>
                    )}
                    {lead.customerPhone && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-green-50 panel-oscuro:bg-green-500/10 rounded-lg shrink-0">
                          <Phone className="h-3.5 w-3.5 text-green-600 panel-oscuro:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Teléfono</p>
                          <a href={`tel:${lead.customerPhone}`} className="text-sm font-medium text-green-600 panel-oscuro:text-green-400 hover:underline">
                            {lead.customerPhone}
                          </a>
                        </div>
                      </div>
                    )}
                    {lead.customerMessage && (
                      <div className="flex items-start gap-2.5 sm:col-span-2">
                        <div className="p-1.5 bg-indigo-50 panel-oscuro:bg-indigo-500/10 rounded-lg shrink-0">
                          <MessageCircle className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Mensaje</p>
                          <p className="text-sm text-gray-700 panel-oscuro:text-gray-300">{lead.customerMessage}</p>
                        </div>
                      </div>
                    )}
                    {lead.affiliate && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-50 panel-oscuro:bg-indigo-500/10 rounded-lg shrink-0">
                          <Tag className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Afiliado</p>
                          <p className="text-sm font-medium text-gray-900 panel-oscuro:text-gray-100">
                            {lead.affiliate.userName || lead.affiliate.userEmail}
                          </p>
                          {lead.commissionRate && (
                            <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">{lead.commissionRate}% de comisión</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Respuesta rápida — solo si hay teléfono */}
                  {lead.customerPhone && (
                    <QuickReplyTemplates
                      phone={lead.customerPhone}
                      name={lead.customerName || ""}
                      product={lead.productName}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
