"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Banknote, FileText, Shield, Truck, Check,
  ChevronDown, ChevronUp, Save, AlertCircle, ToggleLeft, ToggleRight,
  Eye, EyeOff, Lock,
} from "lucide-react";
import type { StorePaymentInfo } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO } from "@/types/store-config";

type Props = {
  initial: {
    paymentInfo: StorePaymentInfo;
    policyReturns: string;
    policyShipping: string;
    policyTerms: string;
    policyReturnsActive: boolean;
    policyShippingActive: boolean;
    policyTermsActive: boolean;
  };
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PagosClient({ initial }: Props) {
  const [paymentInfo, setPaymentInfo] = useState<StorePaymentInfo>(
    initial.paymentInfo ?? DEFAULT_PAYMENT_INFO
  );
  const [policyReturns, setPolicyReturns] = useState(initial.policyReturns);
  const [policyShipping, setPolicyShipping] = useState(initial.policyShipping);
  const [policyTerms, setPolicyTerms] = useState(initial.policyTerms);
  const [policyReturnsActive, setPolicyReturnsActive] = useState(initial.policyReturnsActive);
  const [policyShippingActive, setPolicyShippingActive] = useState(initial.policyShippingActive);
  const [policyTermsActive, setPolicyTermsActive] = useState(initial.policyTermsActive);

  const [openSection, setOpenSection] = useState<"transferencia" | "efectivo" | "policies" | null>("transferencia");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Campos sensibles enmascarados — se ocultan al perder foco de la página
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const maskAll = useCallback(() => setRevealed({}), []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) maskAll();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [maskAll]);

  function toggleReveal(field: string) {
    setRevealed((r) => ({ ...r, [field]: !r[field] }));
  }

  function setTransferencia(field: string, value: string | boolean) {
    setPaymentInfo((p) => ({
      ...p,
      transferencia: { ...p.transferencia, [field]: value },
    }));
  }

  function setEfectivo(field: string, value: string | boolean) {
    setPaymentInfo((p) => ({
      ...p,
      efectivo: { ...p.efectivo, [field]: value },
    }));
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/pagos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentInfo,
          policyReturns,
          policyShipping,
          policyTerms,
          policyReturnsActive,
          policyShippingActive,
          policyTermsActive,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const t = paymentInfo.transferencia;
  const e = paymentInfo.efectivo;

  return (
    <div className="space-y-4">

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Los datos sensibles (CBU, CVU, CUIL) se ocultan automáticamente si dejás la pantalla sin atención o cambiás de pestaña. Solo vos podés verlos.
        </p>
      </div>

      {/* TRANSFERENCIA */}
      <Section
        id="transferencia"
        open={openSection === "transferencia"}
        onToggle={() => setOpenSection(openSection === "transferencia" ? null : "transferencia")}
        icon={<CreditCard className="h-4 w-4 text-indigo-500" />}
        title="Transferencia bancaria"
        subtitle="CBU, CVU o alias para que el cliente transfiera"
        badge={t.enabled ? "Activo" : undefined}
        badgeColor="green"
      >
        <div className="space-y-4">
          <Toggle
            enabled={t.enabled}
            onChange={(v) => setTransferencia("enabled", v)}
            label="Mostrar datos de transferencia en el email de compra"
          />

          {t.enabled && (
            <div className="space-y-3 pt-1">
              <Row label="Titular de la cuenta" required>
                <Input
                  value={t.titular}
                  onChange={(v) => setTransferencia("titular", v)}
                  placeholder="Ej: María González"
                  maxLength={120}
                />
              </Row>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Row label="CBU">
                  <SensitiveInput
                    value={t.cbu}
                    onChange={(v) => setTransferencia("cbu", v)}
                    placeholder="22 dígitos"
                    maxLength={22}
                    inputMode="numeric"
                    revealed={!!revealed["cbu"]}
                    onToggleReveal={() => toggleReveal("cbu")}
                  />
                </Row>
                <Row label="CVU">
                  <SensitiveInput
                    value={t.cvu}
                    onChange={(v) => setTransferencia("cvu", v)}
                    placeholder="22 dígitos"
                    maxLength={22}
                    inputMode="numeric"
                    revealed={!!revealed["cvu"]}
                    onToggleReveal={() => toggleReveal("cvu")}
                  />
                </Row>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Row label="Alias">
                  <Input
                    value={t.alias}
                    onChange={(v) => setTransferencia("alias", v)}
                    placeholder="Ej: MI.TIENDA.ARS"
                    maxLength={60}
                  />
                </Row>
                <Row label="Banco">
                  <Input
                    value={t.banco}
                    onChange={(v) => setTransferencia("banco", v)}
                    placeholder="Ej: Banco Galicia"
                    maxLength={80}
                  />
                </Row>
              </div>
              <Row label="CUIL / CUIT">
                <SensitiveInput
                  value={t.cuil}
                  onChange={(v) => setTransferencia("cuil", v)}
                  placeholder="Ej: 27-12345678-9"
                  maxLength={20}
                  revealed={!!revealed["cuil"]}
                  onToggleReveal={() => toggleReveal("cuil")}
                />
              </Row>
              <Row label="Instrucciones adicionales">
                <Textarea
                  value={t.instrucciones}
                  onChange={(v) => setTransferencia("instrucciones", v)}
                  placeholder="Ej: Enviá el comprobante por WhatsApp al 11-xxxx-xxxx después de transferir."
                  maxLength={500}
                />
              </Row>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
                Estos datos aparecen automáticamente en el email de confirmación que le llega al cliente al hacer su pedido.
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* EFECTIVO */}
      <Section
        id="efectivo"
        open={openSection === "efectivo"}
        onToggle={() => setOpenSection(openSection === "efectivo" ? null : "efectivo")}
        icon={<Banknote className="h-4 w-4 text-emerald-500" />}
        title="Efectivo / Retiro en persona"
        subtitle="Para clientes que pagan en el local o al retirar"
        badge={e.enabled ? "Activo" : undefined}
        badgeColor="green"
      >
        <div className="space-y-4">
          <Toggle
            enabled={e.enabled}
            onChange={(v) => setEfectivo("enabled", v)}
            label="Mostrar opción de pago en efectivo en el email"
          />

          {e.enabled && (
            <div className="space-y-3 pt-1">
              <Row label="Instrucciones">
                <Textarea
                  value={e.instrucciones}
                  onChange={(v) => setEfectivo("instrucciones", v)}
                  placeholder="Ej: Retiro en Av. Siempre Viva 742, de lunes a sábado de 10 a 18 hs."
                  maxLength={500}
                />
              </Row>
            </div>
          )}
        </div>
      </Section>

      {/* POLÍTICAS LEGALES */}
      <Section
        id="policies"
        open={openSection === "policies"}
        onToggle={() => setOpenSection(openSection === "policies" ? null : "policies")}
        icon={<Shield className="h-4 w-4 text-gray-500" />}
        title="Políticas y términos legales"
        subtitle="Se muestran en el footer de tu tienda y en los emails"
        badge={policyTermsActive || policyReturnsActive || policyShippingActive ? "Activas" : undefined}
        badgeColor="gray"
      >
        <div className="space-y-5">
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
            Tus políticas se incluyen como links en el footer de tu tienda. Los clientes también las ven en la página de detalle de la tienda.
          </div>

          {/* Devoluciones */}
          <PolicyBlock
            icon={<Truck className="h-3.5 w-3.5" />}
            label="Política de devoluciones y cambios"
            active={policyReturnsActive}
            onToggle={() => setPolicyReturnsActive((v) => !v)}
            value={policyReturns}
            onChange={setPolicyReturns}
            placeholder={`Ej: Aceptamos cambios dentro de los 30 días de recibido el producto, con ticket de compra. El producto debe estar sin uso y con etiquetas. Para solicitar un cambio contactanos por WhatsApp o email.\n\nNo aceptamos devoluciones de dinero salvo defecto de fabricación.`}
          />

          {/* Envío */}
          <PolicyBlock
            icon={<Truck className="h-3.5 w-3.5" />}
            label="Política de envíos"
            active={policyShippingActive}
            onToggle={() => setPolicyShippingActive((v) => !v)}
            value={policyShipping}
            onChange={setPolicyShipping}
            placeholder={`Ej: Enviamos por correo y transporte a todo el país. Los tiempos de entrega son de 3 a 7 días hábiles. El costo de envío se calcula según destino.\n\nRetiro en local sin cargo, coordinar por WhatsApp.`}
          />

          {/* Términos */}
          <PolicyBlock
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Términos y condiciones"
            active={policyTermsActive}
            onToggle={() => setPolicyTermsActive((v) => !v)}
            value={policyTerms}
            onChange={setPolicyTerms}
            placeholder={`Ej: Al realizar una compra en nuestra tienda, el cliente acepta estos términos. Los precios pueden cambiar sin previo aviso. Las imágenes son referenciales. En caso de inconvenientes, contactar a soporte antes de iniciar cualquier reclamo formal.`}
          />
        </div>
      </Section>

      {/* SAVE BUTTON */}
      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: saveState === "saved"
              ? "linear-gradient(135deg,#16a34a,#15803d)"
              : saveState === "error"
              ? "linear-gradient(135deg,#dc2626,#b91c1c)"
              : "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: "#fff",
            boxShadow: saveState === "saving" ? "none" : "0 8px 24px -4px rgba(99,102,241,0.45)",
          }}
        >
          {saveState === "saving" ? (
            <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
          ) : saveState === "saved" ? (
            <Check className="h-4 w-4" />
          ) : saveState === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveState === "saving" ? "Guardando..." : saveState === "saved" ? "Guardado" : saveState === "error" ? "Error al guardar" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({
  open, onToggle, icon, title, subtitle, badge, badgeColor, children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "green" | "gray";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{title}</span>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor === "green" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 group"
    >
      {enabled
        ? <ToggleRight className="h-6 w-6 text-indigo-600 shrink-0" />
        : <ToggleLeft className="h-6 w-6 text-gray-300 shrink-0" />}
      <span className="text-sm text-gray-700 text-left leading-snug">{label}</span>
    </button>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; inputMode?: "numeric" | "text";
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
    />
  );
}

function SensitiveInput({ value, onChange, placeholder, maxLength, inputMode, revealed, onToggleReveal }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  revealed: boolean;
  onToggleReveal: () => void;
}) {
  function mask(v: string): string {
    if (!v) return "";
    const visible = v.slice(-4);
    return "•".repeat(Math.max(0, v.length - 4)) + visible;
  }

  return (
    <div className="relative">
      <input
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors font-mono tracking-wider"
      />
      <button
        type="button"
        onClick={onToggleReveal}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label={revealed ? "Ocultar" : "Mostrar"}
        tabIndex={-1}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={3}
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors resize-none"
    />
  );
}

function PolicyBlock({ icon, label, active, onToggle, value, onChange, placeholder }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs font-bold text-gray-700 flex-1">{label}</span>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          {active
            ? <><ToggleRight className="h-5 w-5 text-indigo-500" /><span className="text-indigo-600">Visible</span></>
            : <><ToggleLeft className="h-5 w-5 text-gray-300" /><span className="text-gray-400">Oculta</span></>}
        </button>
      </div>
      <div className="px-4 py-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          rows={4}
          className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <div className="text-right mt-1">
          <span className="text-[10px] text-gray-300">{value.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
