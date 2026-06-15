"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STORE_TYPES } from "@/lib/storeTypes";
import { Loader2, X, Check, AlertTriangle, Trash2, Download } from "lucide-react";
import { TOUR_STORAGE_KEY } from "@/components/TourGuide";

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
  const [selected, setSelected] = useState<string | null>(currentType ?? null);
  const [wholesale, setWholesale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // confirm step: solo cuando isEditing y cambia de tipo
  const [confirmStep, setConfirmStep] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const selectedConfig = STORE_TYPES.find((t) => t.id === selected);
  const isChangingType = isEditing && selected !== null && selected !== currentType;

  function handleClose() {
    if (isEditing) onClose?.();
    else router.back();
  }

  async function downloadCsv() {
    if (downloading) return;
    setDownloading(true);
    const res = await fetch("/api/store/export-csv");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "productos.csv";
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
    setDownloaded(true);
  }

  async function handleConfirmButton() {
    if (!selected) return;
    // Si es edición y cambia de tipo → mostrar advertencia primero
    if (isChangingType) {
      setConfirmStep(true);
      return;
    }
    await save();
  }

  async function save() {
    if (!selected) return;
    setSaving(true);

    if (isChangingType) {
      // Reset completo + cambio de tipo
      await fetch("/api/store/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newType: selected }),
      });
      // Resetear tour para que aparezca de nuevo con el nuevo tipo
      localStorage.removeItem(TOUR_STORAGE_KEY);
    } else {
      // Primera configuración o mismo tipo
      const configRes = await fetch("/api/configuracion");
      const { store: current } = await configRes.json();
      await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          name: current.name || "Mi Tienda",
          tipoTienda: selected,
          tipoTiendaConfigurado: true,
          tieneVentaMayorista: isEditing ? (current.tieneVentaMayorista ?? false) : wholesale,
        }),
      });
    }

    setSaving(false);
    setSaved(true);
    window.dispatchEvent(new CustomEvent("store-type-changed", { detail: { newType: selected } }));
    await new Promise((r) => setTimeout(r, 700));
    router.refresh();
    if (isEditing) onClose?.();
  }

  // ── Overlay de carga mientras borra ──
  if (saving) {
    const toConfig = STORE_TYPES.find((t) => t.id === selected);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md gap-6 animate-fade-slide">
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-white animate-spin" />
          <span className="absolute text-4xl">{toConfig?.emoji}</span>
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-bold">Cambiando a {toConfig?.label}...</p>
          <p className="text-white/60 text-sm mt-1">Limpiando datos anteriores</p>
        </div>
      </div>
    );
  }

  // ── Pantalla de confirmación de reset ──
  if (confirmStep) {
    const fromConfig = STORE_TYPES.find((t) => t.id === currentType);
    const toConfig   = STORE_TYPES.find((t) => t.id === selected);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-slide">
          <div className="bg-red-50 rounded-t-3xl px-7 py-6 border-b border-red-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-red-700">¿Estás seguro?</h2>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Estás por cambiar de <strong>{fromConfig?.emoji} {fromConfig?.label}</strong> a <strong>{toConfig?.emoji} {toConfig?.label}</strong>
            </p>
          </div>

          <div className="px-7 py-5 space-y-4">
            <p className="text-sm text-gray-700 font-medium">Esto va a eliminar permanentemente:</p>
            <ul className="space-y-2">
              {[
                "Todos tus productos publicados",
                "Todos los pedidos recibidos",
                "Todas las consultas (leads)",
                "Todos los cupones de descuento",
                "Las reseñas de productos",
                "La plantilla y configuración del diseño",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
              Esta acción no se puede deshacer. Se conservan: logo, colores, redes sociales, conexión MercadoPago y afiliados.
            </div>

            {/* Exportar antes de borrar */}
            <button
              onClick={downloadCsv}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Descargando...</>
              ) : downloaded ? (
                <><Check className="h-4 w-4 text-green-500" /> CSV descargado</>
              ) : (
                <><Download className="h-4 w-4" /> Guardar copia de mis productos (CSV)</>
              )}
            </button>
          </div>

          <div className="px-7 pb-6 flex gap-3">
            <button
              onClick={() => setConfirmStep(false)}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || saved}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                saved ? "bg-green-500" : "bg-red-600 hover:bg-red-700 disabled:opacity-50"
              }`}
            >
              {saved   ? <><Check className="h-4 w-4" /> ¡Listo!</> :
               saving  ? <><Loader2 className="h-4 w-4 animate-spin" /> Borrando...</> :
               "Sí, cambiar y borrar todo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla principal de selección ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-7 text-white relative shrink-0">
          {isEditing && (
            <button
              onClick={handleClose}
              title="Cerrar"
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white/80" />
            </button>
          )}
          <h2 className="text-2xl font-bold mb-1">
            {isEditing ? "¿Qué vendés?" : "Antes de empezar, ¿qué vendés?"}
          </h2>
          <p className="text-indigo-200 text-sm">
            {isEditing
              ? "Cambiar el tipo de tienda va a reiniciar todos tus datos. Solo tu configuración y plantilla se conservan."
              : "Esto define los campos de tus productos, las categorías, el diseño sugerido y la experiencia de compra de tus clientes."}
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">

          {/* Tipos */}
          <div className="grid grid-cols-2 gap-2.5">
            {STORE_TYPES.map((t) => {
              const active = selected === t.id;
              const isCurrent = t.id === currentType;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t.id); setWholesale(false); }}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    active && saved
                      ? "border-green-500 bg-green-50 shadow-md scale-[1.03] animate-success-flash"
                      : active
                      ? "border-indigo-500 bg-indigo-50 shadow-md scale-[1.03]"
                      : "border-gray-100 hover:border-gray-300 bg-gray-50 hover:scale-[1.01]"
                  }`}
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${active ? "text-indigo-700" : "text-gray-800"}`}>
                      {t.label}
                    </p>
                    {isCurrent && isEditing && (
                      <p className="text-xs text-gray-400 mt-0.5">actual</p>
                    )}
                  </div>
                  {active && (
                    <span key={t.id} className="absolute top-2 right-2 animate-pop-in">
                      <Check className="h-3.5 w-3.5 text-white bg-indigo-500 rounded-full p-0.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info del tipo seleccionado */}
          {selectedConfig && (
            <div key={selectedConfig.id} className="animate-fade-slide bg-indigo-50 rounded-2xl px-4 py-3 text-sm text-indigo-700">
              Categorías: {selectedConfig.categorias.slice(0, 4).join(", ")}...
            </div>
          )}

          {/* Aviso de reset cuando cambia de tipo */}
          {isChangingType && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 animate-fade-slide">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Al confirmar se van a eliminar todos tus productos, pedidos y consultas actuales.</span>
            </div>
          )}

          {/* Toggle mayorista — solo primera vez */}
          {!isEditing && selectedConfig?.supportsWholesale && (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Venta por mayor</p>
                <p className="text-xs text-gray-400 mt-0.5">Activa campos de precio mayorista en tus productos</p>
              </div>
              <button
                onClick={() => setWholesale((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  wholesale ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  wholesale ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          )}

          {/* Confirmar */}
          <button
            onClick={handleConfirmButton}
            disabled={!selected || saving || saved || selected === currentType}
            className={`w-full py-3.5 rounded-2xl font-semibold disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 ${
              saved
                ? "bg-green-500 text-white scale-[1.02] shadow-lg"
                : isChangingType
                ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            }`}
          >
            {saved ? (
              <><Check className="h-4 w-4" /> ¡Guardado!</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : isChangingType ? (
              "Cambiar tipo de tienda →"
            ) : (
              "Confirmar y continuar →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
