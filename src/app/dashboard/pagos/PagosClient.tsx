"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Banknote, FileText, Shield, Truck, Check,
  ChevronDown, ChevronUp, Save, AlertCircle, ToggleLeft, ToggleRight,
  Eye, EyeOff, Lock, Mail, Package, Sparkles, X,
} from "lucide-react";
import type { StorePaymentInfo, ShippingMethod } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO, DEFAULT_SHIPPING_METHODS, LIVE_QUOTE_SHIPPING_METHODS } from "@/types/store-config";
import { PROVINCIAS_ARGENTINA as PROVINCES } from "@/lib/provincias";
import CampoAuto from "@/components/CampoAuto";
import {
  generatePolicyShipping, generatePolicyReturns, generatePolicyTerms,
  generatePolicyDeliveryAutos, generatePolicyOperationAutos, generatePolicyTermsAutos,
  type LegalWizardAnswers, type LegalWizardAnswersAutos, type LegalStoreInfo,
} from "@/lib/legal-generator";
import MpConnectButton from "./MpConnectButton";

type Props = {
  initial: {
    paymentInfo: StorePaymentInfo;
    shippingMethods: ShippingMethod[];
    shippingConfigured: boolean;
    policyReturns: string;
    policyShipping: string;
    policyTerms: string;
    policyReturnsActive: boolean;
    policyShippingActive: boolean;
    policyTermsActive: boolean;
    originStreet: string;
    originCity: string;
    originProvince: string;
    originPostalCode: string;
    storeName: string;
    contact: string;
    isAutos: boolean;
    mpConnected: boolean;
    mpConnectedAt: string | null;
    mpSellerId: string | null;
    mpStatus?: "connected" | "error";
    activeAffiliatesCount: number;
  };
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PagosClient({ initial }: Props) {
  const [paymentInfo, setPaymentInfo] = useState<StorePaymentInfo>(
    initial.paymentInfo ?? DEFAULT_PAYMENT_INFO
  );
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(
    initial.shippingMethods?.length ? initial.shippingMethods : DEFAULT_SHIPPING_METHODS
  );
  const [policyReturns, setPolicyReturns] = useState(initial.policyReturns);
  const [policyShipping, setPolicyShipping] = useState(initial.policyShipping);
  const [policyTerms, setPolicyTerms] = useState(initial.policyTerms);
  const [policyReturnsActive, setPolicyReturnsActive] = useState(initial.policyReturnsActive);
  const [policyShippingActive, setPolicyShippingActive] = useState(initial.policyShippingActive);
  const [policyTermsActive, setPolicyTermsActive] = useState(initial.policyTermsActive);
  const [originStreet, setOriginStreet] = useState(initial.originStreet);
  const [originCity, setOriginCity] = useState(initial.originCity);
  const [originProvince, setOriginProvince] = useState(initial.originProvince);
  const [originPostalCode, setOriginPostalCode] = useState(initial.originPostalCode);
  const [legalWizardOpen, setLegalWizardOpen] = useState(false);

  const storeInfo: LegalStoreInfo = { name: initial.storeName, contact: initial.contact };
  const isAutos = initial.isAutos;

  function applyLegalWizard(answers: LegalWizardAnswers) {
    setPolicyShipping(generatePolicyShipping(storeInfo, answers));
    setPolicyReturns(generatePolicyReturns(storeInfo, answers));
    setPolicyTerms(generatePolicyTerms(storeInfo, answers));
    setPolicyShippingActive(true);
    setPolicyReturnsActive(true);
    setPolicyTermsActive(true);
    setLegalWizardOpen(false);
  }

  function applyLegalWizardAutos(answers: LegalWizardAnswersAutos) {
    setPolicyShipping(generatePolicyDeliveryAutos(storeInfo, answers));
    setPolicyReturns(generatePolicyOperationAutos(storeInfo, answers));
    setPolicyTerms(generatePolicyTermsAutos(storeInfo, answers));
    setPolicyShippingActive(true);
    setPolicyReturnsActive(true);
    setPolicyTermsActive(true);
    setLegalWizardOpen(false);
  }

  const hasFullOrigin = !!(originStreet.trim() && originCity.trim() && originProvince && originPostalCode.trim());
  const liveQuoteEnabled = shippingMethods.some((m) => m.liveQuote && m.enabled);

  function toggleLiveQuote(enable: boolean) {
    setShippingMethods((prev) => {
      const withoutLiveQuote = prev.filter((m) => !m.liveQuote);
      if (!enable) return withoutLiveQuote;
      return [...withoutLiveQuote, ...LIVE_QUOTE_SHIPPING_METHODS.map((m) => ({ ...m, enabled: true }))];
    });
  }

  // Nada abierto por default — el dueño elige qué mirar, en vez de
  // encontrarse una sección ya desplegada sin haberla tocado.
  const [openSection, setOpenSection] = useState<"transferencia" | "efectivo" | "envios" | "policies" | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

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
    setValidationError(null);
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
    // Validación: si transferencia activa, necesita al menos un identificador
    if (paymentInfo.transferencia.enabled) {
      const t = paymentInfo.transferencia;
      if (!t.cbu.trim() && !t.cvu.trim() && !t.alias.trim()) {
        setValidationError("Si activás transferencia bancaria, completá al menos el CBU, CVU o alias.");
        return;
      }
    }
    if (liveQuoteEnabled && !hasFullOrigin) {
      setValidationError("Completá la dirección de origen (calle, ciudad, provincia y código postal) antes de activar la cotización automática de envío.");
      return;
    }
    setValidationError(null);
    setSaveState("saving");
    try {
      const res = await fetch("/api/pagos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentInfo,
          shippingMethods,
          policyReturns,
          policyShipping,
          policyTerms,
          policyReturnsActive,
          policyShippingActive,
          policyTermsActive,
          originStreet,
          originCity,
          originProvince,
          originPostalCode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "");
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setValidationError(err instanceof Error && err.message ? err.message : null);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const t = paymentInfo.transferencia;
  const e = paymentInfo.efectivo;

  return (
    <div className="space-y-4">

      {/* How it works banner */}
      {isAutos ? (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
          <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">¿Para qué sirve esto?</p>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Como tu tienda funciona por consulta, no hace falta configurar métodos de pago ni de envío acá — eso lo coordinás directo con cada interesado. Esta pantalla es solo para las políticas legales de tu tienda.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
            <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">¿Para qué sirve esto?</p>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Esta pantalla junta dos cosas distintas: <strong>cómo te cobran</strong> (MercadoPago, transferencia, efectivo) y <strong>cómo se entrega</strong> el pedido (retiro, envío). No hace falta activar todo — elegís solo las opciones que usás en tu negocio. Lo que actives le llega al cliente en el email de confirmación del pedido.
              </p>
            </div>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Los datos sensibles (CBU, CVU, CUIL) se ocultan automáticamente si dejás la pantalla sin atención o cambiás de pestaña.
            </p>
          </div>
        </>
      )}

      {!isAutos && <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">Cómo te cobran</p>}

      {/* MERCADOPAGO — cobro automático. Va primero porque es el único medio
          que confirma el pago solo; los de abajo dependen de que la dueña
          revise el comprobante a mano. */}
      {!isAutos && (
        <MpConnectButton
          connected={initial.mpConnected}
          connectedAt={initial.mpConnectedAt}
          mpSellerId={initial.mpSellerId}
          mpStatus={initial.mpStatus}
          activeAffiliatesCount={initial.activeAffiliatesCount}
        />
      )}

      {/* TRANSFERENCIA */}
      {!isAutos && (
      <>

      <Section
        open={openSection === "transferencia"}
        onToggle={() => setOpenSection(openSection === "transferencia" ? null : "transferencia")}
        icon={<CreditCard className="h-4 w-4 text-indigo-500" />}
        title="Transferencia bancaria"
        subtitle="El cliente recibe tu CBU, CVU o alias en el email para que pueda transferirte"
        badge={t.enabled ? "Activo" : undefined}
      >
        <div className="space-y-4">
          <Toggle
            enabled={t.enabled}
            onChange={(v) => setTransferencia("enabled", v)}
            label="Incluir datos de transferencia en el email de confirmación del pedido"
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
              <p className="text-[11px] text-slate-400 -mt-1 px-0.5">
                CBU = bancos tradicionales (Galicia, Santander, BBVA…) · CVU = billeteras virtuales (Mercado Pago, Ualá, Naranja X)
              </p>
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
              <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 leading-relaxed">
                <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
                Estos datos van incluidos en el email que el cliente recibe al confirmar su pedido.
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* EFECTIVO */}
      <Section
        open={openSection === "efectivo"}
        onToggle={() => setOpenSection(openSection === "efectivo" ? null : "efectivo")}
        icon={<Banknote className="h-4 w-4 text-emerald-500" />}
        title="Efectivo / Retiro en persona"
        subtitle="Para clientes que pagan al retirar el pedido o en tu local"
        badge={e.enabled ? "Activo" : undefined}
      >
        <div className="space-y-4">
          <Toggle
            enabled={e.enabled}
            onChange={(v) => setEfectivo("enabled", v)}
            label="Incluir opción de pago en efectivo en el email de confirmación"
          />

          {e.enabled && (
            <div className="space-y-3 pt-1">
              <Row label="Instrucciones para el cliente">
                <Textarea
                  value={e.instrucciones}
                  onChange={(v) => setEfectivo("instrucciones", v)}
                  placeholder="Ej: Retiro en Av. Siempre Viva 742, de lunes a sábado de 10 a 18 hs. El pago se realiza al momento de retirar."
                  maxLength={500}
                />
              </Row>
            </div>
          )}
        </div>
      </Section>

      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">Cómo se entrega</p>

      {/* MÉTODOS DE ENVÍO */}
      <Section
        open={openSection === "envios"}
        onToggle={() => setOpenSection(openSection === "envios" ? null : "envios")}
        icon={<Package className="h-4 w-4 text-sky-500" />}
        title="Métodos de envío"
        subtitle="Definí cómo tus clientes pueden recibir su compra y cuánto cobrar"
        badge={shippingMethods.filter(m => m.enabled && !m.isPickup).length > 0 ? "Configurado" : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 bg-sky-50 border border-sky-100 rounded-lg p-3.5 text-xs text-sky-700 leading-relaxed">
            <Truck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sky-400" />
            Estas opciones aparecen en el checkout cuando el cliente elige cómo recibir su compra. Podés poner precio fijo o &quot;A coordinar&quot; para acordarlo por WhatsApp.
          </div>

          {shippingMethods.map((method, idx) => {
            const disabled = !method.enabled && !method.isPickup;
            return (
              <div
                key={method.id}
                className={`rounded-lg border p-4 space-y-3 transition-colors ${disabled ? "border-slate-150 bg-slate-50/50 opacity-60" : "border-slate-200 bg-white"}`}
              >
                {/* Fila superior: toggle + etiqueta del método.
                    En angosto envuelve: el interruptor y "Opción N" se quedan
                    arriba —son chicos y de ancho fijo— y el nombre baja a un
                    renglón propio a todo el ancho. Los tres en la misma fila le
                    dejaban al nombre unos 92px de texto útil, así que "Envío
                    estándar" ya salía partido en dos. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {method.isPickup ? (
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Siempre activo
                    </span>
                  ) : (
                    <button
                      onClick={() => setShippingMethods(prev => prev.map((m, i) => i === idx ? { ...m, enabled: !m.enabled } : m))}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {method.enabled
                        ? <><ToggleRight className="h-5 w-5 text-sky-500" /><span className="text-sky-600">Activo</span></>
                        : <><ToggleLeft className="h-5 w-5 text-slate-300" /><span className="text-slate-400">Inactivo</span></>}
                    </button>
                  )}
                  {/* `order-last` + `w-full`: en angosto baja al segundo renglón,
                      después de "Opción N", aunque en el código venga antes. */}
                  <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
                    {/* `estilo` y no `className`: esta pantalla tiene su propia
                        paleta y así reemplaza la de CampoAuto en vez de pelearse
                        con ella. El nombre admite 80 caracteres y en un teléfono
                        entran unos 37. */}
                    <CampoAuto
                      value={method.label}
                      onChange={v => setShippingMethods(prev => prev.map((m, i) => i === idx ? { ...m, label: v.slice(0, 80) } : m))}
                      maxLength={80}
                      ariaLabel="Nombre del método de envío"
                      placeholder={method.isPickup ? "Ej: Retiro en local / acordar" : "Ej: Envío a domicilio"}
                      disabled={disabled}
                      estilo="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors disabled:cursor-not-allowed"
                    />
                  </div>
                  {!method.isPickup && (
                    <span className="shrink-0 text-[11px] text-slate-400">Opción {idx}</span>
                  )}
                </div>

                {/* Costo cotizado en vivo — no editable, se calcula por CP + peso */}
                {method.liveQuote && !disabled && (
                  <p className="text-[11px] text-sky-600 sm:pl-[72px]">Se cotiza automáticamente según el código postal y el peso del pedido (Correo Argentino / OCA / Andreani vía Envíopack).</p>
                )}

                {/* Costo — solo envíos fijos/a coordinar */}
                {!method.isPickup && !method.liveQuote && !disabled && (
                  <div className="space-y-2 sm:pl-[72px]">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShippingMethods(prev => prev.map((m, i) => i === idx ? { ...m, coordinar: true, price: 0 } : m))}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${method.coordinar ? "bg-sky-50 border-sky-300 text-sky-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        A coordinar
                      </button>
                      <button
                        onClick={() => setShippingMethods(prev => prev.map((m, i) => i === idx ? { ...m, coordinar: false } : m))}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${!method.coordinar ? "bg-sky-50 border-sky-300 text-sky-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        Precio fijo
                      </button>
                    </div>
                    {!method.coordinar ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={method.price || ""}
                          onChange={e => setShippingMethods(prev => prev.map((m, i) => i === idx ? { ...m, price: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : m))}
                          placeholder="0"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">El cliente ve &quot;A coordinar&quot; en el checkout. Acordás el costo por WhatsApp u otro medio.</p>
                    )}
                  </div>
                )}

                {method.isPickup && (
                  <p className="text-[11px] text-slate-400 sm:pl-[72px]">Siempre gratuito — el comprador retira en persona o coordinan directamente.</p>
                )}
              </div>
            );
          })}

          {/* COTIZACIÓN AUTOMÁTICA — Envíopack */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <Toggle
              enabled={liveQuoteEnabled}
              onChange={(v) => toggleLiveQuote(v)}
              label="Cotizar el envío automáticamente con Correo Argentino / OCA / Andreani"
            />
            <p className="text-[11px] text-slate-400 pl-9">
              Agrega una opción nueva de envío a domicilio en el checkout, con el precio real calculado según destino y peso. No necesitás contrato propio con ningún correo.
            </p>

            {liveQuoteEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600 pt-2">Dirección desde donde despachás los pedidos</p>
                <Row label="Calle y altura" required>
                  <Input value={originStreet} onChange={setOriginStreet} placeholder="Ej: Av. Siempre Viva 742" maxLength={200} />
                </Row>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Row label="Ciudad" required>
                    <Input value={originCity} onChange={setOriginCity} placeholder="Ej: Rosario" maxLength={100} />
                  </Row>
                  <Row label="Provincia" required>
                    <select
                      value={originProvince}
                      onChange={(e) => setOriginProvince(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    >
                      <option value="">Elegir...</option>
                      {PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Código postal" required>
                    <Input value={originPostalCode} onChange={setOriginPostalCode} placeholder="Ej: 2000" maxLength={10} />
                  </Row>
                </div>
                {!hasFullOrigin && (
                  <p className="text-[11px] text-amber-600">Completá los 4 datos para poder guardar con la cotización automática activada.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>
      </>
      )}

      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2">Legal</p>

      {/* POLÍTICAS LEGALES */}
      <Section
        open={openSection === "policies"}
        onToggle={() => setOpenSection(openSection === "policies" ? null : "policies")}
        icon={<Shield className="h-4 w-4 text-slate-400" />}
        title="Políticas y términos legales"
        subtitle="Se muestran en el footer de tu tienda y en los emails de confirmación"
        badge={policyTermsActive || policyReturnsActive || policyShippingActive ? "Activas" : undefined}
        badgeVariant="neutral"
      >
        <div className="space-y-5">
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
            Tus políticas aparecen como links en el footer de tu tienda. Los clientes las ven antes de comprar y también en los emails.
          </div>

          <button
            type="button"
            onClick={() => setLegalWizardOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {policyReturns || policyShipping || policyTerms ? "Regenerar con asistente" : "Generar con asistente"}
          </button>

          <PolicyBlock
            icon={<Truck className="h-3.5 w-3.5" />}
            label={isAutos ? "Condiciones de la operación" : "Política de devoluciones y cambios"}
            active={policyReturnsActive}
            onToggle={() => setPolicyReturnsActive((v) => !v)}
            value={policyReturns}
            onChange={setPolicyReturns}
            placeholder={isAutos
              ? "Ej: Para reservar un vehículo pedimos una seña, que se descuenta del precio final. Si la operación no se concreta por causas ajenas al comprador, la seña se devuelve.\n\nLos vehículos se entregan con la documentación al día."
              : `Ej: Aceptamos cambios dentro de los 30 días de recibido el producto, con ticket de compra. El producto debe estar sin uso y con etiquetas. Para solicitar un cambio contactanos por WhatsApp o email.\n\nNo aceptamos devoluciones de dinero salvo defecto de fabricación.`}
          />

          <PolicyBlock
            icon={<Truck className="h-3.5 w-3.5" />}
            label={isAutos ? "Cómo se coordina la entrega" : "Política de envíos"}
            active={policyShippingActive}
            onToggle={() => setPolicyShippingActive((v) => !v)}
            value={policyShipping}
            onChange={setPolicyShipping}
            placeholder={isAutos
              ? "Ej: La entrega se coordina en persona por WhatsApp una vez acordados los detalles de la operación. Recomendamos revisar la documentación antes de cerrar la compra."
              : `Ej: Enviamos por correo y transporte a todo el país. Los tiempos de entrega son de 3 a 7 días hábiles. El costo de envío se calcula según destino.\n\nRetiro en local sin cargo, coordinar por WhatsApp.`}
          />

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
      <div className="sticky bottom-4 pt-2">
        {validationError && (
          <div className="flex items-start gap-2 mb-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{validationError}</p>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          style={{
            background: saveState === "saved"
              ? "#16a34a"
              : saveState === "error"
              ? "#dc2626"
              : "#0f172a",
            color: "#fff",
            boxShadow: saveState === "saving" ? "none" : "0 4px 16px -2px rgba(15,23,42,0.25)",
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

      {legalWizardOpen && (
        isAutos ? (
          <LegalWizardModalAutos
            storeInfo={storeInfo}
            onClose={() => setLegalWizardOpen(false)}
            onApply={applyLegalWizardAutos}
          />
        ) : (
          <LegalWizardModal
            storeInfo={storeInfo}
            onClose={() => setLegalWizardOpen(false)}
            onApply={applyLegalWizard}
          />
        )
      )}
    </div>
  );
}

function LegalWizardModal({ storeInfo, onClose, onApply }: {
  storeInfo: LegalStoreInfo;
  onClose: () => void;
  onApply: (answers: LegalWizardAnswers) => void;
}) {
  const [shipsNationwide, setShipsNationwide] = useState(true);
  const [avgDeliveryDays, setAvgDeliveryDays] = useState("3 a 7");
  const [extraReturnDays, setExtraReturnDays] = useState(0);
  const [cancellationFeePercent, setCancellationFeePercent] = useState(0);
  const [preview, setPreview] = useState<{ shipping: string; returns: string; terms: string } | null>(null);

  const answers: LegalWizardAnswers = { shipsNationwide, avgDeliveryDays, extraReturnDays, cancellationFeePercent };

  function generatePreview() {
    setPreview({
      shipping: generatePolicyShipping(storeInfo, answers),
      returns: generatePolicyReturns(storeInfo, answers),
      terms: generatePolicyTerms(storeInfo, answers),
    });
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900">Generar políticas</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Completá esto y armamos las 3 políticas con las cláusulas que exige la ley argentina (derecho de arrepentimiento, garantía, datos personales) más lo que respondas. Después podés editar cualquier párrafo a mano.
        </p>

        {!preview ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">¿Hacés envíos a todo el país, o solo entregás en tu zona / retiro en persona?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShipsNationwide(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${shipsNationwide ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  Envío a todo el país
                </button>
                <button type="button" onClick={() => setShipsNationwide(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${!shipsNationwide ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  Solo en persona
                </button>
              </div>
            </div>

            {shipsNationwide && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">¿Cuántos días tarda el envío en promedio?</p>
                <input
                  value={avgDeliveryDays}
                  onChange={(e) => setAvgDeliveryDays(e.target.value)}
                  placeholder="Ej: 3 a 7"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-300"
                />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">
                Además de los 10 días que exige la ley, ¿le das más días al comprador para cambios por simple arrepentimiento?
              </p>
              <input
                type="number"
                min={0}
                value={extraReturnDays}
                onChange={(e) => setExtraReturnDays(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">Dejá 0 si solo aplicás el mínimo legal.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">
                Si alguien cancela un pedido ya confirmado, ¿le cobrás un % administrativo?
              </p>
              <input
                type="number"
                min={0}
                max={100}
                value={cancellationFeePercent}
                onChange={(e) => setCancellationFeePercent(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">Dejá 0 si no cobrás nada.</p>
            </div>

            <button
              type="button"
              onClick={generatePreview}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Generar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Política de envíos", text: preview.shipping },
              { label: "Política de devoluciones y cambios", text: preview.returns },
              { label: "Términos y condiciones", text: preview.terms },
            ].map(({ label, text }) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-700 mb-1.5">{label}</p>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold">
                Volver
              </button>
              <button type="button" onClick={() => onApply(answers)} className="flex-[2] py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
                Usar este texto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegalWizardModalAutos({ storeInfo, onClose, onApply }: {
  storeInfo: LegalStoreInfo;
  onClose: () => void;
  onApply: (answers: LegalWizardAnswersAutos) => void;
}) {
  const [hasWarranty, setHasWarranty] = useState(false);
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [depositRefundable, setDepositRefundable] = useState(true);
  const [preview, setPreview] = useState<{ delivery: string; operation: string; terms: string } | null>(null);

  const answers: LegalWizardAnswersAutos = { hasWarranty, requiresDeposit, depositRefundable };

  function generatePreview() {
    setPreview({
      delivery: generatePolicyDeliveryAutos(storeInfo, answers),
      operation: generatePolicyOperationAutos(storeInfo, answers),
      terms: generatePolicyTermsAutos(storeInfo, answers),
    });
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900">Generar políticas</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Como tu tienda funciona por consulta, estas políticas se enfocan en cómo se coordina la entrega y las condiciones de la operación, no en envíos ni pagos online. Después podés editar cualquier párrafo a mano.
        </p>

        {!preview ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">¿Pedís una seña para reservar el vehículo?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRequiresDeposit(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${!requiresDeposit ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  No
                </button>
                <button type="button" onClick={() => setRequiresDeposit(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${requiresDeposit ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  Sí
                </button>
              </div>
            </div>

            {requiresDeposit && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Si quien reserva se baja antes de concretar la compra, ¿devolvés la seña?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDepositRefundable(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${depositRefundable ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                    Sí, se devuelve
                  </button>
                  <button type="button" onClick={() => setDepositRefundable(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${!depositRefundable ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                    No se devuelve
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">¿Tus vehículos suelen tener garantía vigente?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHasWarranty(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${!hasWarranty ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  No, se venden como están
                </button>
                <button type="button" onClick={() => setHasWarranty(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${hasWarranty ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                  Sí, suelen tener
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={generatePreview}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Generar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Cómo se coordina la entrega", text: preview.delivery },
              { label: "Condiciones de la operación", text: preview.operation },
              { label: "Términos y condiciones", text: preview.terms },
            ].map(({ label, text }) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-700 mb-1.5">{label}</p>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold">
                Volver
              </button>
              <button type="button" onClick={() => onApply(answers)} className="flex-[2] py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
                Usar este texto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({
  open, onToggle, icon, title, subtitle, badge, badgeVariant = "green", children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "green" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800">{title}</span>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${badgeVariant === "green" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
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
        : <ToggleLeft className="h-6 w-6 text-slate-300 shrink-0" />}
      <span className="text-sm text-slate-700 text-left leading-snug">{label}</span>
    </button>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* La paleta de esta pantalla, en un solo lugar: la usan el input nativo de acá
   abajo y el CampoAuto del nombre del método de envío. */
const ESTILO_CAMPO =
  "rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors";

function Input({ value, onChange, placeholder, maxLength, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; inputMode?: "numeric" | "text";
}) {
  // Los numéricos siguen siendo un input nativo: ahí importa el teclado que abre
  // el teléfono, y un CBU o un código postal nunca es largo. Los de texto libre
  // —titular de la cuenta, calle de origen, ciudad— pasan a crecer en renglones
  // en vez de correrse hacia la derecha.
  if (inputMode !== "numeric") {
    return (
      <CampoAuto
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        estilo={ESTILO_CAMPO}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      className={`w-full ${ESTILO_CAMPO}`}
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
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors font-mono tracking-wider"
      />
      <button
        type="button"
        onClick={onToggleReveal}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors resize-none"
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
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-bold text-slate-700 flex-1">{label}</span>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          {active
            ? <><ToggleRight className="h-5 w-5 text-indigo-500" /><span className="text-indigo-600">Visible</span></>
            : <><ToggleLeft className="h-5 w-5 text-slate-300" /><span className="text-slate-400">Oculta</span></>}
        </button>
      </div>
      <div className="px-4 py-3 bg-white">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          rows={4}
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none leading-relaxed"
        />
        <div className="text-right mt-1">
          <span className="text-[10px] text-slate-300">{value.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
