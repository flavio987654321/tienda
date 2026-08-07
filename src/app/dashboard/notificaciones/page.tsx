"use client";

import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bell, Send, Users, AlertTriangle, CheckCircle2, Loader2,
  Clock, ChevronDown, ChevronUp, Crown, ArrowRight, Trash2, Link2,
} from "lucide-react";
import Link from "next/link";
import { SuscriptoresModal } from "./SuscriptoresModal";
import { SelectorEmoji } from "./SelectorEmoji";
import { largoVisible, recortar } from "@/lib/texto";
import { PUSH_CAMPAIGNS_PER_WEEK } from "@/lib/planLimits";
import CampoAuto from "@/components/CampoAuto";

const TITLE_MAX = 50;
const BODY_MAX = 150;
const URL_MAX = 512;
const EXPIRY_OPTIONS = [
  { days: 3, label: "3 días" },
  { days: 7, label: "7 días" },
  { days: 14, label: "14 días" },
  { days: 30, label: "30 días" },
];
const DEFAULT_EXPIRY_DAYS = 7;

function isExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now();
}

type Campaign = {
  id: string;
  title: string;
  body: string;
  sentCount: number;
  createdAt: string;
  expiresAt: string | null;
  /** Entregas del canal mail. `sentCount` sigue siendo sólo las de push. */
  sentEmail: number;
  emailStatus: "SIN_MAIL" | "PENDIENTE" | "ENVIANDO" | "LISTO";
};

type Stats = {
  /** Seguidores con push. Conserva el nombre viejo. */
  subscriberCount: number;
  followerCount: number;
  /** Suscriptores por mail CONFIRMADOS: los que realmente reciben. */
  emailCount: number;
  /** Cargados pero sin confirmar. No reciben nada todavía. */
  pendientesEmail: number;
  totalAlcance: number;
  /** false = faltan las claves VAPID en este entorno; el push no sale. */
  pushConfigurado: boolean;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  campaigns: Campaign[];
  /** Cuántas hay en total. `campaigns` viene cortado en `historialMax`. */
  totalCampanas: number;
  historialMax: number;
};

type LoadState = "loading" | "ok" | "not_premium" | "error";

// `bodyTemplate` estaba vacío en los tres, así que el campo no hacía nada: se
// sacó. Y ya que los presets sólo proponen un título, ahora proponen uno útil —
// con emoji, que es lo que hace que la notificación se distinga en la pantalla
// bloqueada.
const PRESET_TYPES = [
  { label: "Producto nuevo",  titleTemplate: "🆕 ¡Nuevo producto disponible!" },
  { label: "Oferta especial", titleTemplate: "🔥 ¡Oferta por tiempo limitado!" },
  { label: "Novedad libre",   titleTemplate: "" },
];

export default function NotificacionesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const loadingStats = loadState === "loading";
  const [presetIdx, setPresetIdx] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_EXPIRY_DAYS);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showAudiencia, setShowAudiencia] = useState(false);
  const [continuando, setContinuando] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);

  function loadStats() {
    fetch("/api/push/send")
      .then(async (r) => {
        if (r.status === 403) { setLoadState("not_premium"); return; }
        if (!r.ok) { setLoadState("error"); return; }
        const d = await r.json();
        setStats(d);
        setLoadState("ok");
      })
      .catch(() => setLoadState("error"));
  }

  useEffect(() => { loadStats(); }, []);

  // Escape cierra el modal de confirmación. Sin esto, el reflejo de "me
  // equivoqué, saco esto" no tiene respuesta en un modal que manda mails a
  // todos tus clientes.
  useEffect(() => {
    if (!showConfirm) return;
    const alEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setShowConfirm(false); };
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [showConfirm]);

  function applyPreset(idx: number) {
    // Estos chips parecen un filtro y en realidad SOBREESCRIBEN el formulario.
    // Escribías 140 caracteres de mensaje, tocabas otro tipo por curiosidad, y
    // se borraba todo sin aviso ni forma de recuperarlo — los tres presets
    // tienen el cuerpo vacío, así que "aplicar" uno era siempre borrar.
    //
    // Ahora sólo pisa lo que está vacío o lo que puso otro preset. Lo que
    // escribió una persona no se toca sin permiso.
    const tituloEsDeOtroPreset = PRESET_TYPES.some((p) => p.titleTemplate !== "" && p.titleTemplate === title);
    const hayAlgoEscrito = (title.trim() !== "" && !tituloEsDeOtroPreset) || message.trim() !== "";

    if (hayAlgoEscrito && !confirm("Cambiar el tipo reemplaza lo que escribiste. ¿Seguir?")) return;

    setPresetIdx(idx);
    setTitle(PRESET_TYPES[idx].titleTemplate);
    setMessage("");
    setResult(null);
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    if (!tosAccepted || title.trim().length === 0 || message.trim().length === 0) return;
    setShowConfirm(true);
  }

  async function handleSend() {
    // El botón "Sí, enviar" no estaba protegido. `setShowConfirm(false)` cierra
    // el modal, pero eso recién pasa en el siguiente render: dos clicks rápidos
    // entran los dos, y son DOS campañas mandadas a todo el mundo, dos veces el
    // cupo semanal y dos mails idénticos a cada suscriptor. `sending` tampoco
    // servía, por lo mismo — es estado. El ref cambia en el acto.
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    setShowConfirm(false);
    setSending(true);
    setResult(null);

    try {
      const body: Record<string, string | number> = { title: title.trim(), message: message.trim(), expiresInDays };
      if (url.trim().length > 0) body.url = url.trim();

      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        // El resultado dice los dos canales por separado. Un solo número sumado
        // escondería que el push falló y sólo salió el mail, o al revés.
        const push = `${data.sentCount} por push`;
        const mail = `${data.sentEmail ?? 0} por mail`;
        setResult({
          ok: true,
          msg: data.faltanMails
            ? `Enviada: ${push} y ${mail}. Quedan mails en cola — seguí desde el historial.`
            : `Enviada: ${push} y ${mail}.`,
        });
        setTitle("");
        setMessage("");
        setUrl("");
        setShowUrlField(false);
        setTosAccepted(false);
        loadStats();
      } else {
        setResult({ ok: false, msg: data.error ?? "Error al enviar" });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red. Intentá de nuevo." });
    } finally {
      setSending(false);
      enviandoRef.current = false;
    }
  }

  /**
   * Retoma una campaña que quedó a medias por mail.
   *
   * Con el plan gratuito de Vercel la función se corta a los pocos segundos, así
   * que una lista grande no entra en un envío solo. Esto no reenvía nada: el
   * servidor guarda hasta dónde llegó y sigue desde el siguiente.
   */
  async function handleContinuar(campaignId: string) {
    setContinuando(campaignId);
    try {
      const res = await fetch("/api/newsletter/continuar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setResult({
          ok: true,
          msg: data?.falta
            ? `Van ${data.enviados} más. Todavía quedan: tocá continuar de nuevo.`
            : `Listo, se completó el envío por mail (${data?.enviados ?? 0} en esta pasada).`,
        });
        loadStats();
      } else {
        setResult({ ok: false, msg: data?.error ?? "No pudimos continuar el envío." });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red. Intentá de nuevo." });
    } finally {
      setContinuando(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/push/send?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStats((prev) => prev ? { ...prev, campaigns: prev.campaigns.filter((c) => c.id !== id) } : prev);
        setSelectedIds((prev) => prev.filter((x) => x !== id));
      } else {
        // Antes el `if (res.ok)` no tenía else: si el borrado fallaba, la fila
        // se quedaba ahí y no pasaba absolutamente nada en pantalla. El dueño
        // apretaba de nuevo, y de nuevo, sin saber que el servidor estaba
        // diciendo que no.
        setResult({ ok: false, msg: "No pudimos borrar esa notificación. Probá de nuevo." });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red al borrar. Probá de nuevo." });
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (!stats) return;
    setSelectedIds((prev) => prev.length === stats.campaigns.length ? [] : stats.campaigns.map((c) => c.id));
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    // Borrar de a una es un click sobre una fila que estás mirando. Borrar 40 de
    // un saque, con "Seleccionar todo" al lado, es otra cosa — y no se deshace.
    const cuantas = selectedIds.length;
    if (!confirm(
      `Se sacan ${cuantas} notificacion${cuantas !== 1 ? "es" : ""} de tu historial.\n\n` +
      "No se puede deshacer, y no libera cupo semanal: lo que ya se envió, se envió."
    )) return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setStats((prev) => prev ? { ...prev, campaigns: prev.campaigns.filter((c) => !selectedIds.includes(c.id)) } : prev);
        setSelectedIds([]);
      } else {
        setResult({ ok: false, msg: "No pudimos borrar las notificaciones. Probá de nuevo." });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red al borrar. Probá de nuevo." });
    } finally {
      setBulkDeleting(false);
    }
  }

  const canSend = stats ? stats.weeklyRemaining > 0 : false;
  // Se cuentan caracteres VISIBLES: con `.length`, un título de tres emojis
  // marcaba 6 y el dueño veía que se le acababa el espacio sin motivo.
  const titleLen = largoVisible(title);
  const bodyLen = largoVisible(message);

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
            Un mensaje que sale por dos vías: push al celular de tus seguidores y mail a los suscriptores de tu tienda.
          </p>
        </div>

        {/* Stats cards (solo Premium) */}
        {loadState !== "not_premium" && <div className="grid grid-cols-2 gap-3">
          {/* El número total es clicable: abre las dos listas. Un contador que
              sólo se mira no deja averiguar QUIÉN está adentro ni por qué la
              lista es más grande que los envíos. */}
          <button
            type="button"
            onClick={() => !loadingStats && setShowAudiencia(true)}
            disabled={loadingStats}
            className="rounded-2xl border border-gray-100 bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 disabled:cursor-default"
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tu audiencia</span>
            </div>
            {loadingStats ? (
              <div className="h-7 w-12 rounded bg-gray-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{stats?.totalAlcance ?? 0}</p>
            )}
            {/* El desglose va siempre, no sólo cuando hay de los dos: son dos
                canales distintos —al seguidor le llega un push, al suscriptor un
                mail— y un total pelado haría creer que todos reciben lo mismo. */}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {loadingStats
                ? " "
                : `${stats?.followerCount ?? 0} por push · ${stats?.emailCount ?? 0} por mail`}
            </p>
            {!loadingStats && (stats?.pendientesEmail ?? 0) > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                +{stats?.pendientesEmail} sin confirmar
              </p>
            )}
            {/* Sin las claves VAPID el push no sale y el envío informa 0. Decirlo
                acá evita que el dueño se ponga a buscar por qué sus seguidores no
                reciben, cuando lo que falta es una variable de entorno. */}
            {!loadingStats && stats && !stats.pushConfigurado && stats.followerCount > 0 && (
              <p className="text-[10px] text-red-500 mt-0.5">
                Push sin configurar — esos {stats.followerCount} no reciben
              </p>
            )}
          </button>

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
                {/* El respaldo sale de la constante y no de un 3 a mano: es el
                    número que se muestra mientras el servidor no contestó, y ya
                    hubo una vez que este tope decía uno y se aplicaba otro. */}
                <span className="text-base font-normal text-gray-400">/{stats?.weeklyLimit ?? PUSH_CAMPAIGNS_PER_WEEK}</span>
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats && stats.weeklyRemaining > 0
                ? `Te ${stats.weeklyRemaining === 1 ? "queda" : "quedan"} ${stats.weeklyRemaining} disponible${stats.weeklyRemaining !== 1 ? "s" : ""}`
                : "Límite semanal alcanzado"}
            </p>
          </div>
        </div>}

        {/* Aviso de cómo funcionan */}
        {/* Numerado y no un párrafo corrido. Adentro hay tres cosas que se
            descubren tarde y duelen, y las tres estaban enterradas en el mismo
            bloque de texto: que push y mail son dos vías DISTINTAS (con "Tu
            audiencia: 2" es fácil creer que son dos personas recibiendo lo
            mismo), que en iPhone no llega salvo que hayan instalado la tienda
            —limitación de Apple, y la pregunta inevitable es "¿por qué no le
            llegó a mi hermana?"—, y que el tope cuenta mensajes y no envíos, que
            es plata para el que lo entiende y estaba al final, donde ya nadie
            llega. Mismo contenido; cada idea con su renglón, y la trampa del
            iPhone pegada a "Push" en vez de perdida en el medio. */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">¿Cómo funciona?</p>
          <div className="grid gap-2.5 text-xs text-blue-800 sm:grid-cols-3">
            {[
              <>Escribís el mensaje <strong>una sola vez</strong> y sale por dos vías distintas.</>,
              <><strong>Push</strong> al celular de los que tocan 👍 en tu tienda, aunque la tengan cerrada. En iPhone solo si instalaron la tienda en su pantalla de inicio.</>,
              <><strong>Mail</strong> a los que dejaron su correo en el bloque de novedades y lo confirmaron.</>,
            ].map((texto, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-700">{i + 1}</span>
                <p>{texto}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-blue-100 pt-2.5 text-xs text-blue-800">
            El límite de <strong>{PUSH_CAMPAIGNS_PER_WEEK} por semana</strong> cuenta mensajes, no envíos: mandar por las dos vías gasta uno solo.
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
                Actualizate a Tienda Premium para enviar notificaciones push directamente al celular o computadora de tus visitantes, aunque tengan el navegador cerrado.
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
        {loadState !== "not_premium" && (
          <div ref={formRef} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Nueva notificación</h2>

            {/* Tipos predefinidos */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Tipo de anuncio</p>
              {/* En angosto van en dos columnas y no sueltas. Los tres nombres
                  miden casi lo mismo pero no exactamente, así que dejándolas
                  fluir entraban dos en el primer renglón y la tercera caía
                  suelta y corrida — la típica fila desprolija. En columnas la
                  tercera arranca alineada con la primera. */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {PRESET_TYPES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(i)}
                    className={`truncate px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] ${titleLen >= TITLE_MAX ? "text-amber-500" : "text-gray-400"}`}>
                      {titleLen}/{TITLE_MAX}
                    </span>
                    <SelectorEmoji
                      onElegir={(e) => setTitle((t) => recortar(t + e, TITLE_MAX))}
                      deshabilitado={titleLen >= TITLE_MAX}
                    />
                  </div>
                </div>
                {/* CampoAuto y no <input>: un input no puede pasar a renglón
                    nuevo —es lo que el elemento es, no algo que se arregle con
                    CSS— así que el título se corría hacia la derecha y en el
                    teléfono se perdía de vista casi todo lo escrito. Justo acá
                    importa el doble: es lo que va a leer el cliente en la
                    pantalla del celular, y hay que poder mirarlo entero antes de
                    mandarlo a todo el mundo. El de "Mensaje" ya era un textarea.

                    Sin `maxLength`: ese atributo cuenta unidades de JavaScript,
                    no caracteres, y con emojis cortaba antes de tiempo — y en el
                    peor caso a la mitad de uno. El tope lo pone `recortar`.

                    Se va el `required` nativo y no hace falta: `handleSubmitClick`
                    ya frena con el título vacío. Lo que sí cambia es que Enter
                    deja de mandar el formulario, y para algo irreversible como
                    esto es mejor así — se manda con el botón, a propósito. */}
                <CampoAuto
                  value={title}
                  onChange={(v) => { setTitle(recortar(v, TITLE_MAX)); setResult(null); }}
                  placeholder="ej: ¡Nuevo producto disponible!"
                  ariaLabel="Título de la notificación"
                  className="text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Mensaje */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Mensaje</label>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] ${bodyLen >= BODY_MAX ? "text-amber-500" : "text-gray-400"}`}>
                      {bodyLen}/{BODY_MAX}
                    </span>
                    <SelectorEmoji
                      onElegir={(e) => setMessage((m) => recortar(m + e, BODY_MAX))}
                      deshabilitado={bodyLen >= BODY_MAX}
                    />
                  </div>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(recortar(e.target.value, BODY_MAX)); setResult(null); }}
                  placeholder="ej: Entrá a la tienda y mirá los nuevos productos que llegaron esta semana."
                  required
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
                />
              </div>

              {/* URL opcional */}
              {showUrlField ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-gray-400" />
                      Link de destino <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <button type="button" onClick={() => { setUrl(""); setShowUrlField(false); }} className="text-[11px] text-gray-400 hover:text-red-400 transition-colors">
                      Quitar
                    </button>
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value.slice(0, URL_MAX))}
                    placeholder="https://www.tiendaapps.com/tienda/mi-tienda"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Al tocar la notificación, el cliente irá a esta URL. Si no ponés ninguna, va a tu tienda.</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUrlField(true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Agregar link de destino
                </button>
              )}

              {/* Duración de la novedad */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Visible durante
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setExpiresInDays(opt.days)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        expiresInDays === opt.days
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Pasado ese tiempo desaparece del banner de novedades de la tienda, pero queda en tu historial.
                </p>
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
                    {/* `min-w-0` + ancho relativo: el link llevaba un tope fijo
                        de 260px, y en 360 a esta columna le quedan unos 256 — o
                        sea que el recorte se hacía DESPUÉS del borde de la
                        tarjeta y el link se salía igual. */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 leading-tight break-words">{title || "Título"}</p>
                      <p className="text-[11px] text-gray-500 leading-tight mt-0.5 break-words">{message || "Mensaje..."}</p>
                      {url && <p className="text-[10px] text-indigo-400 mt-0.5 truncate">{url}</p>}
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
        )}

        {/* Modal de confirmación antes de enviar.
            Cierra tocando afuera o con Escape, igual que el de audiencia: antes
            sólo se salía por "Cancelar", que es justo lo que uno no encuentra
            cuando abrió algo sin querer. */}
        {showConfirm && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                  <Send className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">¿Confirmar envío?</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Le llega a {stats?.pushConfigurado ? (stats?.followerCount ?? 0) : 0} por push
                    y a {stats?.emailCount ?? 0} por mail. Consume 1 notificación semanal.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-[11px] text-gray-500">{message}</p>
                {url && <p className="text-[10px] text-indigo-400 truncate">{url}</p>}
              </div>

              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Esta acción no se puede deshacer. Un push ya entregado no se borra del celular, y un mail
                enviado no se puede recuperar.
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
              {/* El total, no la cantidad traída: el listado se corta en
                  `historialMax` y poner ese número acá diría que ésas son todas. */}
              <span>Historial de envíos ({stats.totalCampanas ?? stats.campaigns.length})</span>
              {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {showHistory && (
              <>
                <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
                  <label className="flex items-center gap-2 text-[11px] font-medium text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === stats.campaigns.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Seleccionar todo
                  </label>
                  {selectedIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      {bulkDeleting
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                      Eliminar ({selectedIds.length})
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.campaigns.map((c) => {
                    const expired = isExpired(c.expiresAt);
                    return (
                      <div key={c.id} className="px-5 py-3 group flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                              {expired && (
                                <span className="shrink-0 text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  Expirada
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{c.body}</p>
                            {c.expiresAt && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {expired ? "Dejó de mostrarse el " : "Visible hasta el "}
                                {new Date(c.expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right flex items-start gap-2">
                            <div>
                              <span className="text-[11px] font-medium text-indigo-600">
                                {c.sentCount} push
                              </span>
                              {c.emailStatus !== "SIN_MAIL" && (
                                <span className="text-[11px] font-medium text-indigo-600"> · {c.sentEmail} mail</span>
                              )}
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(c.createdAt).toLocaleDateString("es-AR", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                              {/* La campaña que quedó a mitad de camino es la
                                  única que necesita una acción del dueño. Sin
                                  este botón, esos mails no salen nunca y nada
                                  en pantalla dice que faltan. */}
                              {(c.emailStatus === "PENDIENTE" || c.emailStatus === "ENVIANDO") && (
                                <button
                                  onClick={() => handleContinuar(c.id)}
                                  disabled={continuando === c.id}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                  {continuando === c.id
                                    ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Enviando…</>
                                    : <>Continuar envío por mail</>}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="mt-0.5 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                              title="Eliminar del historial"
                            >
                              {deletingId === c.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {stats.totalCampanas > stats.campaigns.length && (
                  <p className="border-t border-gray-50 bg-gray-50/50 px-5 py-2.5 text-center text-[11px] text-gray-500">
                    Mostrando las <strong>{stats.campaigns.length}</strong> más recientes de{" "}
                    <strong>{stats.totalCampanas}</strong>.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Estado vacío — sólo si NO hay nadie por ninguna de las dos vías. Antes
            miraba únicamente los seguidores, así que una tienda con la lista de
            mail llena seguía viendo "todavía no tenés seguidores". */}
        {!loadingStats && stats?.totalAlcance === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Todavía no tenés a quién escribirle</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Se suma gente por dos lados: los clientes registrados que tocan 👍 en tu tienda para
              seguirla, y los que dejan su correo en el bloque de novedades y lo confirman por mail.
            </p>
          </div>
        )}

        {showAudiencia && <SuscriptoresModal onClose={() => setShowAudiencia(false)} />}

      </div>
    </DashboardLayout>
  );
}
