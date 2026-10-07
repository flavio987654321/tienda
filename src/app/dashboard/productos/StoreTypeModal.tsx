"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { STORE_TYPES, type StoreTypeConfig } from "@/lib/storeTypes";
import {
  Loader2, X, Check, AlertTriangle, Trash2, Download, ArrowLeft, ArrowRight,
  ShoppingBag, Shirt, Tag, Users, MessageCircle, Repeat, Target, FileText, ShieldCheck,
} from "lucide-react";
import { TOUR_PANEL_KEY } from "@/components/tours";

/* ── Elegir o cambiar el rubro, en pasos (07/10/26) ─────────────────────────
   Antes era una grilla de emojis y un botón rojo: para algo que borra la
   tienda entera, poco. Ahora:
     1. Elegí      — tarjetas con una foto de cómo queda una tienda de ese rubro.
     2. Conocelo   — qué trae: cómo compra el cliente, qué se carga, qué tiene de propio.
     3. Tus datos  — qué se borra y qué se queda, y los respaldos (sólo al CAMBIAR).
     4. Confirmá   — escribir el nombre del rubro para habilitar el botón (sólo al CAMBIAR).
   La primera vez (cuenta nueva) no hay nada que borrar: pasos 1 y 2.
   La lógica de guardar/borrar es la de siempre; cambió la presentación. */

type Paso = "elegir" | "conocer" | "datos" | "confirmar";

type Presentacion = {
  frase: string;
  imagenes: string[];
  /** Palabra a escribir para confirmar el cambio (sin tildes, da igual mayúsculas). */
  palabra: string;
  puntos: { icono: ReactNode; titulo: string; texto: string }[];
};

const ICONO = "h-4 w-4";
const PRESENTACION: Record<string, Presentacion> = {
  ROPA: {
    frase: "Carrito, talles y pago online",
    imagenes: ["/marketing/rubro-ropa-1.png", "/marketing/rubro-ropa-2.png", "/marketing/rubro-ropa-3.png"],
    palabra: "MODA",
    puntos: [
      { icono: <ShoppingBag className={ICONO} />, titulo: "Carrito y pago online", texto: "Tus clientes eligen, pagan con Mercado Pago y te llega el pedido. Sin ida y vuelta por chat." },
      { icono: <Shirt className={ICONO} />, titulo: "Talles y colores", texto: "Cada prenda con sus variantes y el stock de cada una." },
      { icono: <Tag className={ICONO} />, titulo: "Cupones, promociones y ruleta", texto: "Para empujar ventas y recuperar carritos abandonados." },
      { icono: <Users className={ICONO} />, titulo: "Afiliados", texto: "Gente que recomienda tu tienda y cobra una comisión por venta." },
    ],
  },
  AUTOS: {
    frase: "Consultas, tasaciones y fichas",
    imagenes: ["/marketing/rubro-autos-1.png"],
    palabra: "AUTOS",
    puntos: [
      { icono: <MessageCircle className={ICONO} />, titulo: "Consultas, no carrito", texto: "Cada unidad tiene su botón para escribirte por WhatsApp o dejarte sus datos." },
      { icono: <Repeat className={ICONO} />, titulo: "Tasaciones y permutas", texto: "El cliente carga su usado desde la tienda y te llega listo para cotizar." },
      { icono: <Target className={ICONO} />, titulo: "Búsquedas", texto: "Si no tenés lo que busca, lo anota; cuando entra algo así, te avisamos." },
      { icono: <FileText className={ICONO} />, titulo: "Ficha en PDF y stock", texto: "Ficha descargable de cada unidad, y cuánto ganás con cada una." },
    ],
  },
};

function presentacion(t: StoreTypeConfig): Presentacion {
  return PRESENTACION[t.id] ?? { frase: t.description, imagenes: [], palabra: t.label.split(" ")[0].toUpperCase(), puntos: [] };
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();

const SE_BORRA = [
  "Productos publicados",
  "Pedidos y consultas recibidos",
  "Cupones, promociones y carritos abandonados",
  "Reseñas de productos",
  "Historial de ventas de tus afiliados",
  "Plantilla y diseño de la tienda",
];
const SE_QUEDA = [
  "Logo y colores",
  "Redes sociales",
  "Conexión con Mercado Pago",
  "Tus afiliados (sin su historial)",
  "Copia interna de tus ventas, para descargar desde Configuración",
];

const BLOCK_LINKS: Record<string, { href: string; label: string }> = {
  UNRESOLVED_ORDERS: { href: "/dashboard/pedidos", label: "Ver pedidos pendientes" },
  UNCLAIMED_PRIZES: { href: "/dashboard/cupones", label: "Ver cupones y premios" },
  PENDING_COMMISSIONS: { href: "/dashboard/pagos", label: "Ver pagos a afiliados" },
  LIVE_COUPONS: { href: "/dashboard/cupones", label: "Ver mis cupones vigentes" },
  LIVE_PROMOTIONS: { href: "/dashboard/promociones", label: "Ver mis promociones" },
};

export default function StoreTypeModal({
  isEditing = false,
  currentType,
  onClose,
}: {
  isEditing?: boolean;
  currentType?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("elegir");
  const [selected, setSelected] = useState<string | null>(null);
  const [wholesale, setWholesale] = useState(false);
  const [saving, setSaving] = useState(false);
  // Cambio de rubro terminado: la pantalla de carga muestra "Listo" antes de ir al panel.
  const [listo, setListo] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  // CTA para desbloquearse cuando el server devuelve 409 (pedidos sin resolver, etc.)
  const [errorLink, setErrorLink] = useState<{ href: string; label: string } | null>(null);
  const [escrito, setEscrito] = useState("");

  const elegido = STORE_TYPES.find((t) => t.id === selected) ?? null;
  const actual = STORE_TYPES.find((t) => t.id === currentType) ?? null;
  const isChangingType = isEditing && selected !== null && selected !== currentType;
  const pasos: Paso[] = isEditing ? ["elegir", "conocer", "datos", "confirmar"] : ["elegir", "conocer"];
  const nroPaso = pasos.indexOf(paso) + 1;

  function handleClose() {
    if (saving) return;
    if (isEditing) onClose?.();
    else router.back();
  }

  // Escape cierra (sólo al cambiar: la primera vez el rubro es obligatorio).
  useEffect(() => {
    if (!isEditing) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose?.(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [isEditing, saving, onClose]);

  function ir(p: Paso) {
    setError("");
    setErrorLink(null);
    setPaso(p);
  }

  function elegir(id: string) {
    setSelected(id);
    setWholesale(false);
    setEscrito("");
    ir("conocer");
  }

  async function downloadCsv(tipo: "productos" | "pedidos" | "cupones" | "promociones") {
    if (downloading) return;
    setDownloading(tipo);
    setError("");
    try {
      const res = await fetch(`/api/store/export-csv?tipo=${tipo}`, { signal: AbortSignal.timeout(60_000) });
      // Sin esto, un 500/401 descarga el JSON de error como .csv y lo marca
      // con tilde verde: el dueño confirma el borrado creyendo que tiene respaldo
      if (!res.ok || !res.headers.get("Content-Type")?.includes("text/csv")) {
        throw new Error();
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `${tipo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded((prev) => ({ ...prev, [tipo]: true }));
    } catch {
      setError("No se pudo descargar el archivo. Revisá tu conexión y probá de nuevo.");
    } finally {
      setDownloading(null);
    }
  }

  async function save() {
    // Guard síncrono anti doble-click: el disabled del botón depende del
    // re-render de React y dos clicks rápidos dispararían dos resets
    if (!selected || saving) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("Sin conexión a internet. Conectate y probá de nuevo.");
      return;
    }
    setSaving(true);
    setError("");
    setErrorLink(null);

    try {
      if (isChangingType) {
        // Reset completo + cambio de tipo
        const res = await fetch("/api/store/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newType: selected }),
          // Borra mucho: tope largo, pero tope. Si se corta, puede que igual se haya hecho.
          signal: AbortSignal.timeout(90_000),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorLink(BLOCK_LINKS[data?.code] ?? null);
          throw new Error(data?.error || "No se pudo cambiar el tipo de tienda. Probá de nuevo.");
        }
        // Resetear tour para que aparezca de nuevo con el nuevo tipo
        localStorage.removeItem(TOUR_PANEL_KEY);
      } else {
        // Primera configuración o mismo tipo
        const configRes = await fetch("/api/configuracion", { signal: AbortSignal.timeout(20_000) });
        if (!configRes.ok) throw new Error("No se pudo guardar el tipo de tienda. Probá de nuevo.");
        const { store: current } = await configRes.json();
        const res = await fetch("/api/configuracion", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...current,
            name: current.name || "Mi Tienda",
            tipoTienda: selected,
            tipoTiendaConfigurado: true,
            tieneVentaMayorista: isEditing ? (current.tieneVentaMayorista ?? false) : wholesale,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "No se pudo guardar el tipo de tienda. Probá de nuevo.");
        }
      }
    } catch (err) {
      setSaving(false);
      const tope = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      setError(tope
        ? (isChangingType
          ? "Tardó más de lo normal. Recargá la página: puede que el cambio ya se haya hecho."
          : "Tardó demasiado en contestar. Revisá tu conexión y probá de nuevo.")
        : err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      return;
    }

    window.dispatchEvent(new CustomEvent("store-type-changed", { detail: { newType: selected } }));

    /* ── Cambio de rubro: "Listo" y el panel de cero (06/10/26) ───────────────
       Al terminar de borrar, la pantalla de carga pasa a "Listo" y se carga el
       panel de inicio entero: todo lo que se ve es del rubro nuevo, y la guía
       —que se reinicia al cambiar— arranca ahí. */
    if (isChangingType) {
      setListo(true);
      await new Promise((r) => setTimeout(r, 1100));
      window.location.assign("/dashboard");
      return;
    }

    setListo(true);
    await new Promise((r) => setTimeout(r, 700));
    router.refresh();
    if (isEditing) onClose?.();
  }

  // ── Overlay de carga mientras guarda / borra ──
  if (saving && elegido) {
    if (listo) {
      return (
        <div role="status" className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md gap-5 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center animate-pop-in">
            <Check className="h-10 w-10 text-white" />
          </div>
          <div>
            <p className="text-white text-xl font-bold">Listo: tu tienda ahora es de {elegido.label}</p>
            <p className="text-white/70 text-sm mt-1.5">Te llevamos al panel para que cargues tus primeros {elegido.id === "AUTOS" ? "vehículos" : "productos"}…</p>
          </div>
        </div>
      );
    }
    return (
      <div role="status" className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md gap-6 px-6 animate-fade-slide">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
        <div className="text-center">
          <p className="text-white text-xl font-bold">
            {isChangingType ? `Cambiando a ${elegido.label}…` : `Preparando tu tienda de ${elegido.label}…`}
          </p>
          {isChangingType && <p className="text-white/60 text-sm mt-1">Limpiando los datos anteriores. No cierres esta ventana.</p>}
        </div>
      </div>
    );
  }

  const titulo =
    paso === "elegir" ? (isEditing ? "Cambiar de rubro" : "¿Qué vendés?")
    : paso === "conocer" ? `Así funciona una tienda de ${elegido?.label ?? ""}`
    : paso === "datos" ? "Qué pasa con tus datos"
    : "Confirmá el cambio";
  const bajada =
    paso === "elegir" ? (isEditing ? "Elegí el rubro nuevo. Antes de cambiar nada te mostramos qué trae y qué pasa con tus datos." : "Esto define los campos de tus productos, las categorías, las plantillas y cómo te compran.")
    : paso === "conocer" ? presentacion(elegido!).frase
    : paso === "datos" ? `Pasar de ${actual?.label ?? "tu rubro"} a ${elegido?.label ?? ""} empieza la tienda de cero.`
    : "Este paso no se puede deshacer.";

  const pres = elegido ? presentacion(elegido) : null;
  const confirmado = !!pres && sinTildes(escrito) === sinTildes(pres.palabra);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="rubro-titulo"
        className="bg-white panel-oscuro:bg-gray-900 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] border border-slate-200/70 panel-oscuro:border-gray-800">

        {/* Encabezado: paso, título y progreso */}
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-100 panel-oscuro:border-gray-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 panel-oscuro:text-indigo-400">
              Paso {nroPaso} de {pasos.length}
            </p>
            {isEditing && (
              <button type="button" onClick={handleClose} aria-label="Cerrar"
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 panel-oscuro:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {pasos.map((p, i) => (
              <span key={p} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < nroPaso ? (paso === "confirmar" ? "bg-red-500" : "bg-indigo-500") : "bg-slate-100 panel-oscuro:bg-gray-800"}`} />
            ))}
          </div>
          <h2 id="rubro-titulo" className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 panel-oscuro:text-gray-100">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-500 panel-oscuro:text-gray-400">{bajada}</p>
        </div>

        {/* Cuerpo */}
        <div key={paso} className="px-5 sm:px-7 py-5 overflow-y-auto animate-fade-slide">

          {/* ── 1. Elegir ── */}
          {paso === "elegir" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {STORE_TYPES.filter((t) => !t.comingSoon).map((t) => {
                  const p = presentacion(t);
                  const esActual = isEditing && t.id === currentType;
                  return (
                    <button key={t.id} type="button" disabled={esActual} onClick={() => elegir(t.id)}
                      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                        esActual
                          ? "border-slate-200 panel-oscuro:border-gray-800 cursor-default"
                          : "border-slate-200 panel-oscuro:border-gray-700 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5"
                      }`}>
                      <div className="relative aspect-[16/8] bg-slate-100 panel-oscuro:bg-gray-800 overflow-hidden">
                        {p.imagenes[0] && (
                          <Image src={p.imagenes[0]} alt="" fill sizes="(max-width: 640px) 100vw, 320px"
                            className={`object-cover object-left-top transition-transform duration-500 ${esActual ? "opacity-60" : "group-hover:scale-[1.03]"}`} />
                        )}
                        {esActual && (
                          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">Tu rubro hoy</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold ${esActual ? "text-slate-400 panel-oscuro:text-gray-500" : "text-slate-900 panel-oscuro:text-gray-100"}`}>{t.label}</p>
                          <p className="text-xs text-slate-500 panel-oscuro:text-gray-400 mt-0.5">{p.frase}</p>
                        </div>
                        {!esActual && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 panel-oscuro:bg-gray-800 text-slate-500 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {STORE_TYPES.some((t) => t.comingSoon) && (
                <p className="mt-4 text-xs text-slate-400 panel-oscuro:text-gray-500">
                  Próximamente: {STORE_TYPES.filter((t) => t.comingSoon).map((t) => t.label).join(" · ")}
                </p>
              )}
            </>
          )}

          {/* ── 2. Conocer el rubro ── */}
          {paso === "conocer" && elegido && pres && (
            <div className="space-y-5">
              {pres.imagenes[0] && (
                <div className="space-y-2">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-slate-100 panel-oscuro:bg-gray-800 border border-slate-200/70 panel-oscuro:border-gray-800">
                    <Image src={pres.imagenes[0]} alt={`Ejemplo de una tienda de ${elegido.label}`} fill sizes="(max-width: 640px) 100vw, 640px" className="object-cover object-left-top" />
                  </div>
                  {/* Otras plantillas del rubro: en el celular no entran, y la principal alcanza. */}
                  {pres.imagenes.length > 1 && (
                    <div className="hidden sm:grid grid-cols-2 gap-2">
                      {pres.imagenes.slice(1, 3).map((src) => (
                        <div key={src} className="relative aspect-[16/6] overflow-hidden rounded-xl bg-slate-100 panel-oscuro:bg-gray-800 border border-slate-200/70 panel-oscuro:border-gray-800">
                          <Image src={src} alt="" fill sizes="320px" className="object-cover object-left-top" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pres.puntos.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {pres.puntos.map((pt) => (
                    <li key={pt.titulo} className="flex gap-3 rounded-2xl border border-slate-100 panel-oscuro:border-gray-800 bg-slate-50/70 panel-oscuro:bg-gray-800/40 p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 panel-oscuro:bg-indigo-500/15 text-indigo-600 panel-oscuro:text-indigo-300">{pt.icono}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 panel-oscuro:text-gray-100">{pt.titulo}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 panel-oscuro:text-gray-400">{pt.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600 panel-oscuro:text-gray-300">{elegido.description}</p>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 panel-oscuro:text-gray-500 mb-2">Categorías que vas a poder usar</p>
                <div className="flex flex-wrap gap-1.5">
                  {elegido.categorias.slice(0, 8).map((c) => (
                    <span key={c} className="rounded-full border border-slate-200 panel-oscuro:border-gray-700 px-2.5 py-1 text-xs capitalize text-slate-600 panel-oscuro:text-gray-300">{c}</span>
                  ))}
                </div>
              </div>

              {!isEditing && elegido.supportsWholesale && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 panel-oscuro:border-gray-700 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 panel-oscuro:text-gray-200">¿Vendés también por mayor?</p>
                    <p className="text-xs text-slate-500 panel-oscuro:text-gray-400 mt-0.5">Suma el precio mayorista en tus productos. Se puede cambiar después.</p>
                  </div>
                  <button type="button" role="switch" aria-checked={wholesale} aria-label="Venta por mayor" onClick={() => setWholesale((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${wholesale ? "bg-indigo-600" : "bg-slate-200 panel-oscuro:bg-gray-700"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${wholesale ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Tus datos ── */}
          {paso === "datos" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-red-100 panel-oscuro:border-red-500/25 bg-red-50/60 panel-oscuro:bg-red-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-700 panel-oscuro:text-red-300"><Trash2 className="h-4 w-4" /> Se borra</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {SE_BORRA.map((x) => <li key={x} className="text-xs leading-relaxed text-red-900/80 panel-oscuro:text-red-200/80">• {x}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-emerald-100 panel-oscuro:border-emerald-500/25 bg-emerald-50/60 panel-oscuro:bg-emerald-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 panel-oscuro:text-emerald-300"><ShieldCheck className="h-4 w-4" /> Se queda</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {SE_QUEDA.map((x) => <li key={x} className="text-xs leading-relaxed text-emerald-900/80 panel-oscuro:text-emerald-200/80">• {x}</li>)}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-800 panel-oscuro:text-amber-200 space-y-1">
                <p><strong>Antes, dá de baja los cupones y promociones vigentes.</strong> Si un cliente tiene uno, deja de funcionar pero te lo va a reclamar igual.</p>
                <p>La tienda queda <strong>sin publicar</strong> hasta que cargues el catálogo nuevo. La ruleta se apaga hasta que le pongas premios nuevos.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 panel-oscuro:text-gray-200">Guardá una copia antes de seguir</p>
                <p className="text-xs text-slate-500 panel-oscuro:text-gray-400 mt-0.5 mb-2.5">Planillas que se abren con Excel o Google Sheets.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["productos", "Productos"],
                    ["pedidos", "Pedidos, pagos y comisiones"],
                    ["cupones", "Cupones"],
                    ["promociones", "Promociones"],
                  ] as const).map(([tipo, label]) => (
                    <button key={tipo} type="button" onClick={() => downloadCsv(tipo)} disabled={downloading !== null}
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors disabled:opacity-60 ${
                        downloaded[tipo]
                          ? "border-emerald-200 panel-oscuro:border-emerald-500/30 bg-emerald-50/60 panel-oscuro:bg-emerald-500/10 text-emerald-800 panel-oscuro:text-emerald-200"
                          : "border-slate-200 panel-oscuro:border-gray-700 text-slate-700 panel-oscuro:text-gray-300 hover:bg-slate-50 panel-oscuro:hover:bg-gray-800/50"
                      }`}>
                      {downloading === tipo ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        : downloaded[tipo] ? <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        : <Download className="h-4 w-4 shrink-0 text-slate-400" />}
                      <span className="min-w-0 flex-1">{label}</span>
                      <span className="text-[11px] text-slate-400">{downloading === tipo ? "Bajando…" : downloaded[tipo] ? "Listo" : "CSV"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Confirmar ── */}
          {paso === "confirmar" && elegido && pres && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 panel-oscuro:border-gray-700 p-4">
                <span className="text-sm text-slate-500 panel-oscuro:text-gray-400 line-through decoration-red-400">{actual?.label}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-900 panel-oscuro:text-gray-100">{elegido.label}</span>
              </div>
              <label className="block">
                <span className="text-sm text-slate-700 panel-oscuro:text-gray-300">
                  Para confirmar, escribí <strong className="font-bold tracking-wider text-slate-900 panel-oscuro:text-gray-100">{pres.palabra}</strong>
                </span>
                <input value={escrito} onChange={(e) => setEscrito(e.target.value)} autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === "Enter" && confirmado) void save(); }}
                  className="mt-2 w-full rounded-xl border border-slate-300 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-4 py-3 text-base font-semibold uppercase tracking-wider text-slate-900 panel-oscuro:text-gray-100 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                  placeholder={pres.palabra} />
              </label>
              <p className="text-xs text-slate-500 panel-oscuro:text-gray-400">
                {Object.keys(downloaded).length === 0
                  ? "No bajaste ningún respaldo. Si lo necesitás, volvé al paso anterior."
                  : `Bajaste ${Object.keys(downloaded).length} respaldo${Object.keys(downloaded).length > 1 ? "s" : ""}.`}
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3 text-sm text-red-700 panel-oscuro:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                {errorLink && (
                  <a href={errorLink.href} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2">
                    {errorLink.label} →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie: volver y seguir */}
        {paso !== "elegir" && (
          <div className="flex items-center gap-3 border-t border-slate-100 panel-oscuro:border-gray-800 px-5 sm:px-7 py-4 shrink-0">
            <button type="button" onClick={() => ir(pasos[nroPaso - 2])} disabled={downloading !== null}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 panel-oscuro:text-gray-300 hover:bg-slate-100 panel-oscuro:hover:bg-gray-800 disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <div className="flex-1" />
            {paso === "conocer" && (isEditing ? (
              <button type="button" onClick={() => ir("datos")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                Quiero este rubro <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => void save()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                Empezar con {elegido?.label} <ArrowRight className="h-4 w-4" />
              </button>
            ))}
            {paso === "datos" && (
              <button type="button" onClick={() => ir("confirmar")} disabled={downloading !== null}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 panel-oscuro:bg-white px-5 text-sm font-semibold text-white panel-oscuro:text-slate-900 hover:bg-slate-800 disabled:opacity-50">
                Entendido, seguir <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {paso === "confirmar" && (
              <button type="button" onClick={() => void save()} disabled={!confirmado || saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">
                Cambiar y borrar todo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
