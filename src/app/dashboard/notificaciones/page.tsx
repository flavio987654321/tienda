"use client";

import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bell, Send, Users, AlertTriangle, CheckCircle2, Loader2,
  Clock, ChevronDown, ChevronUp, ShieldCheck, Crown, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const TITLE_MAX = 50;
const BODY_MAX = 150;

type Campaign = {
  id: string;
  title: string;
  body: string;
  sentCount: number;
  createdAt: string;
};

type Stats = {
  subscriberCount: number;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  campaigns: Campaign[];
};

type LoadState = "loading" | "ok" | "not_premium" | "error";

const PRESET_TYPES = [
  { label: "Producto nuevo", titleTemplate: "¡Nuevo producto disponible!", bodyTemplate: "" },
  { label: "Oferta especial", titleTemplate: "¡Oferta por tiempo limitado!", bodyTemplate: "" },
  { label: "Novedad libre", titleTemplate: "", bodyTemplate: "" },
];

export default function NotificacionesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const loadingStats = loadState === "loading";
  const [presetIdx, setPresetIdx] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/push/send")
      .then(async (r) => {
        if (r.status === 403) { setLoadState("not_premium"); return; }
        if (!r.ok) { setLoadState("error"); return; }
        const d = await r.json();
        setStats(d);
        setLoadState("ok");
      })
      .catch(() => setLoadState("error"));
  }, []);

  function applyPreset(idx: number) {
    setPresetIdx(idx);
    setTitle(PRESET_TYPES[idx].titleTemplate);
    setMessage(PRESET_TYPES[idx].bodyTemplate);
    setResult(null);
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    if (!tosAccepted || title.trim().length === 0 || message.trim().length === 0) return;
    setShowConfirm(true);
  }

  async function handleSend() {
    setShowConfirm(false);
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Enviada a ${data.sentCount} suscriptor${data.sentCount !== 1 ? "es" : ""}.` });
        setTitle("");
        setMessage("");
        setTosAccepted(false);
        // Recargar estadísticas
        fetch("/api/push/send")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) setStats(d); })
          .catch(() => {});
      } else {
        setResult({ ok: false, msg: data.error ?? "Error al enviar" });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red. Intentá de nuevo." });
    } finally {
      setSending(false);
    }
  }

  const canSend = stats ? stats.weeklyRemaining > 0 : false;
  const titleLen = title.length;
  const bodyLen = message.length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-500" />
            Notificaciones push
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Enviá alertas directamente al celular de tus suscriptores, aunque tengan la tienda cerrada.
          </p>
        </div>

        {/* Stats cards (solo Premium) */}
        {loadState !== "not_premium" && <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suscriptores</span>
            </div>
            {loadingStats ? (
              <div className="h-7 w-12 rounded bg-gray-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{stats?.subscriberCount ?? 0}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">Clientes con notificaciones activas</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Esta semana</span>
            </div>
            {loadingStats ? (
              <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats?.weeklyUsed ?? 0}
                <span className="text-base font-normal text-gray-400">/{stats?.weeklyLimit ?? 2}</span>
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats && stats.weeklyRemaining > 0
                ? `Te ${stats.weeklyRemaining === 1 ? "queda" : "quedan"} ${stats.weeklyRemaining} disponible${stats.weeklyRemaining !== 1 ? "s" : ""}`
                : "Límite semanal alcanzado"}
            </p>
          </div>
        </div>}

        {/* Aviso de qué son las notificaciones */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>¿Cómo funciona?</strong> Cuando alguien entra a tu tienda desde el celular, aparece un banner
            preguntando si quiere recibir alertas. Si acepta, queda suscripto y recibe tus notificaciones
            directamente en la pantalla, aunque tenga la tienda cerrada o la haya instalado como app. Podés enviar
            hasta <strong>2 notificaciones por semana</strong> para no saturar a tus suscriptores.
          </p>
        </div>

        {/* Gate: solo Premium */}
        {loadState === "not_premium" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Función exclusiva de Plan Premium</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Actualizate a Tienda Premium para enviar notificaciones push a los visitantes que instalaron tu tienda como app.
              </p>
            </div>
            <Link
              href="/precios"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
            >
              Ver planes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Formulario (solo Premium) */}
        {loadState === "not_premium" ? null : <div ref={formRef} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Nueva notificación</h2>

          {/* Tipos predefinidos */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Tipo de anuncio</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TYPES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    presetIdx === i
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitClick} className="space-y-3">
            {/* Título */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Título</label>
                <span className={`text-[11px] ${titleLen > TITLE_MAX ? "text-red-500" : "text-gray-400"}`}>
                  {titleLen}/{TITLE_MAX}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value.slice(0, TITLE_MAX)); setResult(null); }}
                placeholder="ej: ¡Nuevo producto disponible!"
                maxLength={TITLE_MAX}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
            </div>

            {/* Mensaje */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Mensaje</label>
                <span className={`text-[11px] ${bodyLen > BODY_MAX ? "text-red-500" : "text-gray-400"}`}>
                  {bodyLen}/{BODY_MAX}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value.slice(0, BODY_MAX)); setResult(null); }}
                placeholder="ej: Entrá a la tienda y mirá los nuevos productos que llegaron esta semana."
                maxLength={BODY_MAX}
                required
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
              />
            </div>

            {/* Preview */}
            {(title || message) && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Vista previa
                </p>
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{title || "Título"}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{message || "Mensaje..."}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ToS */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <span className="text-[11px] text-gray-500 leading-relaxed">
                Acepto usar las notificaciones solo para contenido relacionado con mi tienda
                (productos, ofertas, novedades). El uso indebido puede resultar en la suspensión
                del servicio según los{" "}
                <a href="/terminos" target="_blank" className="text-indigo-600 underline">
                  términos de uso
                </a>
                .
              </span>
            </label>

            {/* Resultado del envío */}
            {result && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
                result.ok
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}>
                {result.ok
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 shrink-0" />}
                {result.msg}
              </div>
            )}

            {/* Límite semanal */}
            {!loadingStats && !canSend && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Alcanzaste el límite de {stats?.weeklyLimit} notificaciones por semana. Podés enviar más el próximo lunes.
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !tosAccepted || !canSend || titleLen === 0 || bodyLen === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4" /> Enviar notificación</>
              )}
            </button>
          </form>
        </div>

        {/* Modal de confirmación antes de enviar */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                  <Send className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">¿Confirmar envío?</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Se enviará a todos tus suscriptores y consumirá 1 notificación semanal.
                  </p>
                </div>
              </div>

              {/* Preview resumida */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-[11px] text-gray-500">{message}</p>
              </div>

              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Esta acción no se puede deshacer. Una vez enviada, la notificación llega a todos los celulares.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Sí, enviar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historial */}
        {stats && stats.campaigns.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <span>Historial de envíos ({stats.campaigns.length})</span>
              {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-50">
                {stats.campaigns.map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{c.body}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-medium text-indigo-600">
                          {c.sentCount} enviado{c.sentCount !== 1 ? "s" : ""}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString("es-AR", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {!loadingStats && stats?.subscriberCount === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Todavía no tenés suscriptores</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Cuando un cliente active las notificaciones desde tu tienda, aparecerá acá y
              empezarás a poder contactarlos.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
