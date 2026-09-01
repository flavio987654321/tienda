"use client";

import { useState } from "react";
import { useIsPwa } from "@/hooks/useIsPwa";
import {
  CheckCircle, Clock, AlertTriangle, ArrowRight, Sparkles, Rocket, Crown,
  Loader2, Star, Percent, ShieldCheck, X,
} from "lucide-react";
import { PRECIOS_DIGITALES, COMISION_DIGITAL, DIGITALES_ABIERTO } from "@/lib/planLimits";
import { COPY_DIGITAL, featuresDigital, type TierDigital } from "@/lib/planes-digitales";
import PaymentModal from "@/components/subscription/PaymentModal";

type Estado = "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
type Billing = "MONTHLY" | "ANNUAL";

type Props = {
  tier: TierDigital;
  billing: Billing;
  estado: Estado;
  /** Días que quedan de prueba o de gracia. En Free no significa nada. */
  dias: number;
  /** La próxima renovación, ya escrita. Sólo cuando hay un plan pago andando. */
  renovacion: string | null;
  /** Si los 7 días de prueba siguen sin usar. */
  pruebaDisponible: boolean;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const PLAN_KEY = { STARTER: "DIGITAL_STARTER", PRO: "DIGITAL_PRO" } as const;

/* El color de cada plan. Naranja es el de Productos Digitales en toda la
   plataforma —la tarjeta de /precios, la de registro, la pantalla de inicio del
   panel— y los tres se separan por intensidad, no por color: cambiar de plan no
   tiene que parecer cambiar de producto. */
const ESTILO: Record<TierDigital, { degrade: string; icono: React.ElementType; sombra: string }> = {
  FREE:    { degrade: "from-gray-700 to-gray-900",       icono: Sparkles, sombra: "shadow-gray-200"   },
  STARTER: { degrade: "from-orange-500 to-amber-600",    icono: Rocket,   sombra: "shadow-orange-200" },
  PRO:     { degrade: "from-orange-600 to-rose-600",     icono: Crown,    sombra: "shadow-orange-200" },
};

const ESTADO_CFG: Record<Estado, { label: string; texto: string; fondo: string; borde: string; Icon: React.ElementType }> = {
  TRIAL:     { label: "Probando",        texto: "text-amber-700",   fondo: "bg-amber-50",   borde: "border-amber-200",   Icon: Clock },
  ACTIVE:    { label: "Activo",          texto: "text-emerald-700", fondo: "bg-emerald-50", borde: "border-emerald-200", Icon: CheckCircle },
  GRACE:     { label: "Pago pendiente",  texto: "text-orange-700",  fondo: "bg-orange-50",  borde: "border-orange-200",  Icon: AlertTriangle },
  EXPIRED:   { label: "Terminado",       texto: "text-red-700",     fondo: "bg-red-50",     borde: "border-red-200",     Icon: AlertTriangle },
  CANCELLED: { label: "Cancelado",       texto: "text-gray-600",    fondo: "bg-gray-100",   borde: "border-gray-200",    Icon: AlertTriangle },
};

/**
 * Mi plan, del panel de Productos Digitales.
 *
 * ── Por qué no es una copia de la del panel de tiendas ───────────────────────
 * Porque el plan de acá se comporta al revés. Una tienda que no paga se cierra:
 * hay gracia, hay avisos de cierre y hay una fecha después de la cual no se entra
 * más. Una cuenta digital que no paga **vuelve a Free y sigue andando** — no se
 * borra ningún producto, ninguna venta y ninguna página. Sube la comisión y se
 * apagan las funciones pagas, y eso es todo.
 *
 * Eso cambia lo que la pantalla tiene que decir. La del dueño avisa un cierre;
 * ésta tiene que sacar el miedo, porque el miedo acá sería mentira. Por eso el
 * cartel de abajo está siempre, en los cinco estados.
 */
export default function MiPlanDigitalClient({ tier, billing, estado, dias, renovacion, pruebaDisponible }: Props) {
  const inPwa = useIsPwa();
  const [pagar, setPagar] = useState<{ plan: "DIGITAL_STARTER" | "DIGITAL_PRO"; billing: Billing } | null>(null);
  const [probando, setProbando] = useState<TierDigital | null>(null);
  const [errorPrueba, setErrorPrueba] = useState("");

  const cfg = ESTILO[tier];
  const PlanIcon = cfg.icono;
  const estadoCfg = ESTADO_CFG[estado] ?? ESTADO_CFG.EXPIRED;
  const EstadoIcon = estadoCfg.Icon;

  const esFree = tier === "FREE";
  const precio = esFree ? 0 : PRECIOS_DIGITALES[PLAN_KEY[tier]][billing];
  const comision = COMISION_DIGITAL[tier];

  /* Los días se dibujan sobre el total del tramo en el que está: siete de prueba,
     cuatro de gracia. Sin esto la barra de la gracia se veía casi vacía siempre. */
  const totalDias = estado === "TRIAL" ? 7 : 4;

  async function empezarPrueba(destino: "STARTER" | "PRO") {
    setErrorPrueba("");
    setProbando(destino);
    try {
      const r = await fetch("/api/digitales/prueba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: destino }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrorPrueba(data.error ?? "No pudimos activar la prueba. Intentá de nuevo.");
        setProbando(null);
        return;
      }
      // Recarga entera y no un estado local: el plan cambió, y de él dependen la
      // barra de arriba, las funciones, la comisión y los botones. Que se vuelva
      // a leer de la base es la única forma de que no queden dos verdades.
      window.location.reload();
    } catch {
      setErrorPrueba("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      setProbando(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Mi plan</h1>
          <p className="text-gray-500 text-sm mt-1">Tu plan, lo que incluye y cómo cambiarlo.</p>
        </div>

        <div className="space-y-4">

          {/* ── El plan de hoy ─────────────────────────────────────────────── */}
          <div className={`rounded-3xl bg-gradient-to-br ${cfg.degrade} p-6 text-white shadow-xl ${cfg.sombra} relative overflow-hidden`}>
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-white/10 rounded-full" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                  <PlanIcon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${estadoCfg.fondo} ${estadoCfg.texto} ${estadoCfg.borde}`}>
                  <EstadoIcon className="h-3.5 w-3.5" />
                  {estadoCfg.label}
                </div>
              </div>

              <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Plan actual</p>
              <h2 className="text-3xl font-black text-white mt-0.5">{COPY_DIGITAL[tier].nombre}</h2>

              <p className="text-white/80 text-sm font-medium mt-1">
                {esFree
                  ? "Gratis · no vence"
                  : `${billing === "MONTHLY" ? "Mensual" : "Anual"} · ${money(precio)}`}
              </p>

              {/* Free no tiene fecha de nada, así que en vez de una cuenta regresiva
                  vacía se dice lo único que hay para decir: que no se termina. */}
              {esFree && (
                <div className="mt-5 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-white font-semibold text-sm">
                    No te pedimos ninguna tarjeta y no vence nunca. Cobramos {COMISION_DIGITAL.FREE}% de comisión por venta.
                  </p>
                </div>
              )}

              {(estado === "TRIAL" || estado === "GRACE") && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                    <span>{estado === "TRIAL" ? "Días de prueba que te quedan" : "Días para regularizar el pago"}</span>
                    <span className="font-black text-white text-sm">{dias} día{dias !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, (dias / totalDias) * 100)}%` }} />
                  </div>
                  <p className="text-white/80 text-xs mt-2.5 leading-relaxed">
                    {estado === "TRIAL"
                      ? "Cuando se terminen volvés a Free automáticamente. No se te cobra nada."
                      : "Si no llega el pago, volvés a Free. Tus productos y tus ventas quedan donde están."}
                  </p>
                </div>
              )}

              {estado === "ACTIVE" && renovacion && (
                <div className="mt-5 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-white/70 text-xs mb-0.5">Próxima renovación</p>
                  <p className="text-white font-bold text-sm">
                    {renovacion}
                    {dias <= 5 && <span className="ml-2 text-yellow-200">· {dias} día{dias !== 1 ? "s" : ""}</span>}
                  </p>
                </div>
              )}

              {(estado === "EXPIRED" || estado === "CANCELLED") && (
                <div className="mt-5 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-white font-semibold text-sm">
                    Tu plan pago terminó. Seguís con las funciones de Free hasta que lo renueves.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── La comisión ────────────────────────────────────────────────────
              Va en su propia tarjeta y no perdida entre las funciones: es lo único
              de esta pantalla que le sale plata en cada venta, así que tiene que
              poder leerse sin buscarla. */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="h-4 w-4 text-orange-500" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comisión por venta</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{comision}%</p>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Es lo que retenemos de cada venta cobrada con Mercado Pago.{" "}
              {tier !== "PRO" && (
                <>
                  Con {tier === "FREE" ? "Starter baja a " : "Pro baja a "}
                  <strong className="text-gray-700">
                    {tier === "FREE" ? COMISION_DIGITAL.STARTER : COMISION_DIGITAL.PRO}%
                  </strong>.
                </>
              )}
            </p>
          </div>

          {/* ── Qué incluye ───────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Incluido en {COPY_DIGITAL[tier].nombre}
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Las filas apagadas se muestran igual, tachadas: esconderlas dejaba
                  la lista de Free igual de larga que la de Pro y no se veía qué se
                  gana al cambiar. */}
              {featuresDigital(tier).map(({ text, on }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on ? `bg-gradient-to-br ${cfg.degrade}` : "bg-gray-200"}`}>
                    {on ? <CheckCircle className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-gray-400" />}
                  </div>
                  <span className={`text-sm ${on ? "text-gray-700" : "text-gray-400 line-through"}`}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Probar 7 días ──────────────────────────────────────────────────
              Sólo desde Free y sólo si la prueba sigue sin usar. La ruta lo vuelve
              a verificar: esto es la pantalla, no el permiso. */}
          {esFree && pruebaDisponible && DIGITALES_ABIERTO && (
            <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">7 días gratis</p>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Probá un plan pago una semana. No te pedimos tarjeta y no se te cobra nada:
                cuando se terminan, volvés a Free solo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["STARTER", "PRO"] as const).map((destino) => {
                  const Icono = ESTILO[destino].icono;
                  const cargando = probando === destino;
                  return (
                    <button
                      key={destino}
                      onClick={() => empezarPrueba(destino)}
                      disabled={probando !== null}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        {cargando ? <Loader2 className="h-4 w-4 text-orange-600 animate-spin" /> : <Icono className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">Probar {COPY_DIGITAL[destino].nombre}</p>
                        <p className="text-xs text-gray-500">después {money(PRECIOS_DIGITALES[PLAN_KEY[destino]].MONTHLY)}/mes</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 ml-auto text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>

              {errorPrueba && (
                <p className="text-sm text-red-600 mt-3 font-medium">{errorPrueba}</p>
              )}
            </div>
          )}

          {/* ── Cambiar de plan ────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Opciones</p>
            <div className="space-y-2.5">

              {/* Con el producto todavía cerrado no se ofrece pagar. La ruta de la
                  preferencia rechaza estos planes igual, así que un botón sería un
                  botón que no puede funcionar. */}
              {!DIGITALES_ABIERTO && (
                <p className="text-sm text-gray-500 leading-relaxed">
                  Los planes pagos todavía no están abiertos. Tu cuenta Free anda igual y no vence.
                </p>
              )}

              {DIGITALES_ABIERTO && (
                <>
                  {/* Desde Free: suscribirse a cualquiera de los dos. */}
                  {esFree && (["STARTER", "PRO"] as const).map((destino) => (
                    <button
                      key={destino}
                      onClick={() => setPagar({ plan: PLAN_KEY[destino], billing })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors group"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700">
                        <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                          {destino === "PRO" ? <Crown className="h-4 w-4 text-orange-600" /> : <Rocket className="h-4 w-4 text-orange-600" />}
                        </div>
                        Suscribirme a {COPY_DIGITAL[destino].nombre}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-orange-600">
                        {money(PRECIOS_DIGITALES[PLAN_KEY[destino]].MONTHLY)}/mes
                      </span>
                    </button>
                  ))}

                  {/* Probando: el paso siguiente es pagar el plan que ya está usando.
                      No se le ofrece otro — cambiar de plan en medio de la prueba es
                      una decisión más, y acá la que importa es quedarse. */}
                  {estado === "TRIAL" && !esFree && (
                    <button
                      onClick={() => setPagar({ plan: PLAN_KEY[tier], billing })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors group"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700">
                        <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                          <PlanIcon className="h-4 w-4 text-orange-600" />
                        </div>
                        Quedarme en {COPY_DIGITAL[tier].nombre}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-orange-600">{money(precio)}</span>
                    </button>
                  )}

                  {/* Con el plago pago caído o por caerse: renovar. */}
                  {!esFree && (estado === "GRACE" || estado === "EXPIRED" || estado === "CANCELLED") && (
                    <button
                      onClick={() => setPagar({ plan: PLAN_KEY[tier], billing })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700">
                        <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                          <PlanIcon className="h-4 w-4 text-orange-600" />
                        </div>
                        Renovar {COPY_DIGITAL[tier].nombre}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-orange-600">{money(precio)}</span>
                    </button>
                  )}

                  {/* Anual: sólo con un plan pago andando y estando en mensual. */}
                  {!esFree && billing === "MONTHLY" && (estado === "ACTIVE" || estado === "TRIAL") && (
                    <button
                      onClick={() => setPagar({ plan: PLAN_KEY[tier], billing: "ANNUAL" })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-emerald-700">
                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                          <Star className="h-4 w-4 text-emerald-600" />
                        </div>
                        Pasar a anual · 3 meses gratis
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-600">
                        {money(PRECIOS_DIGITALES[PLAN_KEY[tier]].ANNUAL)}/año
                      </span>
                    </button>
                  )}

                  {/* De Starter a Pro, con el plan andando. */}
                  {tier === "STARTER" && (estado === "ACTIVE" || estado === "TRIAL") && (
                    <button
                      onClick={() => setPagar({ plan: "DIGITAL_PRO", billing })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-rose-700">
                        <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                          <Crown className="h-4 w-4 text-rose-600" />
                        </div>
                        Mejorar a Pro
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-rose-400" />
                    </button>
                  )}
                </>
              )}

              {/* `/precios` es de la web comercial, fuera del panel: desde la app
                  instalada se abre en el navegador. Sin esto reemplazaba la
                  pantalla y dejaba a la persona navegando tiendaapps.com adentro
                  de la app, sin barra de direcciones ni forma de volver. */}
              <a
                href="/precios"
                {...(inPwa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3 text-left text-sm font-medium text-gray-600">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-gray-500" />
                  </div>
                  Comparar los tres planes
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
              </a>
            </div>
          </div>

          {/* ── Lo que no pasa nunca ───────────────────────────────────────────
              El cartel más importante de la pantalla, y por eso está en los cinco
              estados. Es la diferencia real con el plan de una tienda: acá no hay
              cierre, no hay fecha límite y no se borra nada. */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900">Tu cuenta no se cierra</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Si un plan pago se termina, volvés a Free y seguís adentro. No se borra ningún
                  producto, ninguna venta ni ninguna página: cambian la comisión y las funciones
                  pagas, nada más.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pagar && (
        <PaymentModal
          plan={pagar.plan}
          billing={pagar.billing}
          onClose={() => setPagar(null)}
          onSuccess={() => { setPagar(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
