"use client";

import { useState } from "react";
import { useIsPwa } from "@/hooks/useIsPwa";
import {
  CheckCircle, Clock, AlertTriangle, ArrowRight, Sparkles, Rocket, Crown,
  Loader2, Star, Percent, ShieldCheck, X, Mail, KeyRound, Phone, UserRound, CalendarDays,
} from "lucide-react";
import { PRECIOS_DIGITALES, COMISION_DIGITAL, DIGITALES_ABIERTO } from "@/lib/planLimits";
import { COPY_DIGITAL, featuresDigital, type TierDigital } from "@/lib/planes-digitales";
import { validarTelefono, LARGO_MAXIMO as TELEFONO_MAXIMO } from "@/lib/telefono";
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
  cuenta: { nombre: string; email: string; telefono: string; alta: string };
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const PLAN_KEY = { STARTER: "DIGITAL_STARTER", PRO: "DIGITAL_PRO" } as const;

/* El color de cada plan. Naranja es el de Productos Digitales en toda la
   plataforma —la tarjeta de /precios, la de registro, el inicio del panel— y los
   tres se separan por intensidad, no por color: cambiar de plan no tiene que
   parecer cambiar de producto. */
const ESTILO: Record<TierDigital, { degrade: string; icono: React.ElementType; sombra: string }> = {
  FREE:    { degrade: "from-gray-700 to-gray-900",    icono: Sparkles, sombra: "shadow-gray-200"   },
  STARTER: { degrade: "from-orange-500 to-amber-600", icono: Rocket,   sombra: "shadow-orange-200" },
  PRO:     { degrade: "from-orange-600 to-rose-600",  icono: Crown,    sombra: "shadow-orange-200" },
};

const ESTADO_CFG: Record<Estado, { label: string; texto: string; fondo: string; borde: string; Icon: React.ElementType }> = {
  TRIAL:     { label: "Probando",       texto: "text-amber-700",   fondo: "bg-amber-50 panel-oscuro:bg-amber-500/10",   borde: "border-amber-200 panel-oscuro:border-amber-500/30",   Icon: Clock },
  ACTIVE:    { label: "Activo",         texto: "text-emerald-700 panel-oscuro:text-emerald-300", fondo: "bg-emerald-50 panel-oscuro:bg-emerald-500/10", borde: "border-emerald-200 panel-oscuro:border-emerald-500/30", Icon: CheckCircle },
  GRACE:     { label: "Pago pendiente", texto: "text-orange-700 panel-oscuro:text-orange-300",  fondo: "bg-orange-50 panel-oscuro:bg-orange-500/10",  borde: "border-orange-200 panel-oscuro:border-orange-500/30",  Icon: AlertTriangle },
  EXPIRED:   { label: "Terminado",      texto: "text-red-700 panel-oscuro:text-red-300",     fondo: "bg-red-50 panel-oscuro:bg-red-500/10",     borde: "border-red-200 panel-oscuro:border-red-500/30",     Icon: AlertTriangle },
  CANCELLED: { label: "Cancelado",      texto: "text-gray-600 panel-oscuro:text-gray-400",    fondo: "bg-gray-100 panel-oscuro:bg-gray-800",   borde: "border-gray-200 panel-oscuro:border-gray-700",    Icon: AlertTriangle },
};

/**
 * Mi cuenta, del panel de Productos Digitales.
 *
 * ── Por qué el plan y los datos van juntos ───────────────────────────────────
 * Porque se miran juntos, y porque el panel todavía no tiene tantas pantallas
 * como para partirlos. La competencia lo tiene así y está bien.
 *
 * ── Por qué NO es una copia de "Mi plan" del panel de tiendas ────────────────
 * Porque el plan de acá se comporta al revés. Una tienda que no paga se cierra:
 * hay gracia, hay avisos de cierre y hay una fecha después de la cual no se entra
 * más. Una cuenta digital que no paga **vuelve a Free y sigue andando** — no se
 * borra ningún producto, ninguna venta y ninguna página. Sube la comisión y se
 * apagan las funciones pagas, y eso es todo.
 *
 * Eso cambia lo que la pantalla tiene que decir. La del dueño avisa un cierre;
 * ésta tiene que sacar el miedo, porque el miedo acá sería mentira. Por eso el
 * cartel de abajo está en los cinco estados.
 */
export default function MiCuentaClient({ tier, billing, estado, dias, renovacion, pruebaDisponible, cuenta }: Props) {
  const inPwa = useIsPwa();
  const [pagar, setPagar] = useState<{ plan: "DIGITAL_STARTER" | "DIGITAL_PRO"; billing: Billing } | null>(null);
  const [probando, setProbando] = useState<TierDigital | null>(null);
  const [errorPrueba, setErrorPrueba] = useState("");

  // Datos de la cuenta
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [telefono, setTelefono] = useState(cuenta.telefono);
  /* Contra qué se compara para saber si hay algo para guardar. Arranca en lo que
     vino del servidor y se mueve cuando se guarda bien.
     Antes se comparaba contra la prop, que no cambia sin recargar: apenas
     guardabas, el botón se volvía a prender con exactamente los mismos datos y
     se podía mandar el mismo pedido todas las veces que uno quisiera. */
  const [guardadoComo, setGuardadoComo] = useState({ nombre: cuenta.nombre, telefono: cuenta.telefono });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorDatos, setErrorDatos] = useState("");

  // Contraseña
  const [mandandoLink, setMandandoLink] = useState(false);
  const [linkMandado, setLinkMandado] = useState(false);

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

  const datosCambiaron = nombre.trim() !== guardadoComo.nombre || telefono.trim() !== guardadoComo.telefono;

  /* Lo que está mal, si hay algo, para decirlo ANTES de mandar.
     No reemplaza a la validación del servidor —la del navegador no protege nada,
     el que ataca no usa el navegador— pero evita el viaje y, sobre todo, dice qué
     está mal al lado del campo en vez de después.
     El teléfono usa la misma función que la ruta y que el registro: si algún día
     cambia la regla, cambia en los tres a la vez. */
  const problemaNombre =
    nombre.trim().length > 0 && nombre.trim().length < 2
      ? "El nombre tiene que tener al menos 2 letras"
      : null;
  const problemaTelefono = validarTelefono(telefono);
  const hayProblema = problemaNombre !== null || problemaTelefono !== null;

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
      /* Recarga entera y no un estado local: el plan cambió, y de él dependen la
         tarjeta de arriba, las funciones, la comisión, los botones y hasta la
         barra lateral. Que se vuelva a leer de la base es la única forma de que
         no queden dos verdades. */
      window.location.reload();
    } catch {
      setErrorPrueba("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      setProbando(null);
    }
  }

  async function guardarDatos() {
    /* El botón ya está apagado en estos dos casos; el freno va igual porque un
       `disabled` no es una garantía: alcanza con un Enter en el momento justo, o
       con las herramientas del navegador. */
    if (guardando || hayProblema || !datosCambiaron) return;

    setErrorDatos("");
    setGuardado(false);
    setGuardando(true);
    try {
      /* Se mandan sólo los dos campos que esta pantalla edita. La ruta ahora sabe
         distinguir "no vino" de "vino vacío", así que la ciudad —que acá ni se
         pide— queda como estaba. Antes los pisaba a los tres siempre. */
      const r = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim(), phone: telefono.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrorDatos(data.error ?? "No pudimos guardar los cambios.");
        return;
      }
      /* La base es la que manda: se toma lo que devolvió, no lo que se escribió.
         Es lo mismo casi siempre, pero la ruta recorta y limpia —espacios de más,
         caracteres de control, el tope de largo— y si acá quedara el texto crudo,
         la pantalla mostraría algo distinto de lo guardado hasta la próxima
         recarga. */
      const guardadoAhora = {
        nombre: (data.profile?.name ?? "") as string,
        telefono: (data.profile?.phone ?? "") as string,
      };
      setNombre(guardadoAhora.nombre);
      setTelefono(guardadoAhora.telefono);
      setGuardadoComo(guardadoAhora);
      setGuardado(true);
    } catch {
      setErrorDatos("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function mandarLinkDeContrasena() {
    setMandandoLink(true);
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cuenta.email }),
      });
    } catch {
      /* La ruta contesta ok pase lo que pase —a propósito, para no revelar qué
         correos existen— así que acá no hay ningún error que mostrar que sea
         cierto. Si la red falló, el cartel dice "revisá tu correo" y no va a
         haber nada: es el único caso en que engaña, y es preferible a inventar
         un diagnóstico. */
    } finally {
      setMandandoLink(false);
      setLinkMandado(true);
    }
  }

  /* El encabezado y el "volver" no están acá: los dibuja `page.tsx`. Son iguales
     en todas las pantallas del panel y no dependen de ningún estado, así que no
     tienen por qué viajar al navegador. */
  return (
    <>
      <div className="space-y-4">

        {/* ── El plan de hoy ───────────────────────────────────────────────── */}
        <div className={`rounded-3xl bg-gradient-to-br ${cfg.degrade} p-6 text-white shadow-xl ${cfg.sombra} relative overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white panel-oscuro:bg-gray-900/10 rounded-full" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-white panel-oscuro:bg-gray-900/10 rounded-full" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 bg-white panel-oscuro:bg-gray-900/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <PlanIcon className="h-6 w-6 text-white" />
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${estadoCfg.fondo} ${estadoCfg.texto} ${estadoCfg.borde}`}>
                <EstadoIcon className="h-3.5 w-3.5" />
                {estadoCfg.label}
              </div>
            </div>

            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Tu plan actual</p>
            <h2 className="text-3xl font-black text-white mt-0.5">{COPY_DIGITAL[tier].nombre}</h2>

            <p className="text-white/80 text-sm font-medium mt-1">
              {esFree ? "Gratis · no vence" : `${billing === "MONTHLY" ? "Mensual" : "Anual"} · ${money(precio)}`}
            </p>

            {/* Free no tiene fecha de nada, así que en vez de una cuenta regresiva
                vacía se dice lo único que hay para decir: que no se termina. */}
            {esFree && (
              <div className="mt-5 bg-white panel-oscuro:bg-gray-900/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
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
                <div className="h-2 bg-white panel-oscuro:bg-gray-900/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white panel-oscuro:bg-gray-900 rounded-full transition-all" style={{ width: `${Math.min(100, (dias / totalDias) * 100)}%` }} />
                </div>
                <p className="text-white/80 text-xs mt-2.5 leading-relaxed">
                  {estado === "TRIAL"
                    ? "Cuando se terminen volvés a Free automáticamente. No se te cobra nada."
                    : "Si no llega el pago, volvés a Free. Tus productos y tus ventas quedan donde están."}
                </p>
              </div>
            )}

            {estado === "ACTIVE" && renovacion && (
              <div className="mt-5 bg-white panel-oscuro:bg-gray-900/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <p className="text-white/70 text-xs mb-0.5">Próxima renovación</p>
                <p className="text-white font-bold text-sm">
                  {renovacion}
                  {dias <= 5 && <span className="ml-2 text-yellow-200">· {dias} día{dias !== 1 ? "s" : ""}</span>}
                </p>
              </div>
            )}

            {(estado === "EXPIRED" || estado === "CANCELLED") && (
              <div className="mt-5 bg-white panel-oscuro:bg-gray-900/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <p className="text-white font-semibold text-sm">
                  Tu plan pago terminó. Seguís con las funciones de Free hasta que lo renueves.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── La comisión ──────────────────────────────────────────────────────
            En su propia tarjeta y no perdida entre las funciones: es lo único de
            esta pantalla que le sale plata en cada venta, así que tiene que poder
            leerse sin buscarla. */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 uppercase tracking-widest">Comisión por venta</p>
          </div>
          <p className="text-3xl font-black text-gray-900 panel-oscuro:text-gray-100">{comision}%</p>
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-1.5 leading-relaxed">
            Es lo que retenemos de cada venta cobrada con Mercado Pago.{" "}
            {tier !== "PRO" && (
              <>
                Con {tier === "FREE" ? "Starter baja a " : "Pro baja a "}
                <strong className="text-gray-700 panel-oscuro:text-gray-300">
                  {tier === "FREE" ? COMISION_DIGITAL.STARTER : COMISION_DIGITAL.PRO}%
                </strong>.
              </>
            )}
          </p>
          {/* Decidido el 02/09/26 y escrito en el detalle de cada venta devuelta;
              faltaba acá, que es donde la persona lee cuánto le cobramos. Se
              dice ANTES de la primera venta: de una venta que se deshizo no
              nos quedamos con nada. */}
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-2 leading-relaxed">
            Si una venta se devuelve —arrepentimiento o contracargo—, la comisión te vuelve
            entera: de una venta que se deshizo no nos quedamos con nada.
          </p>
        </div>

        {/* ── Qué incluye ──────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 uppercase tracking-widest mb-4">
            Incluido en {COPY_DIGITAL[tier].nombre}
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {/* Las filas apagadas se muestran igual, tachadas: esconderlas dejaba
                la lista de Free igual de larga que la de Pro y no se veía qué se
                gana al cambiar. */}
            {featuresDigital(tier).map(({ text, on }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on ? `bg-gradient-to-br ${cfg.degrade}` : "bg-gray-200 panel-oscuro:bg-gray-700"}`}>
                  {on ? <CheckCircle className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-gray-400 panel-oscuro:text-gray-500" />}
                </div>
                <span className={`text-sm ${on ? "text-gray-700 panel-oscuro:text-gray-300" : "text-gray-400 panel-oscuro:text-gray-500 line-through"}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Probar 7 días ────────────────────────────────────────────────────
            Sólo desde Free y sólo si la prueba sigue sin usar. La ruta lo vuelve a
            verificar: esto es la pantalla, no el permiso. */}
        {esFree && pruebaDisponible && DIGITALES_ABIERTO && (
          <div className="rounded-3xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">7 días gratis</p>
            </div>
            <p className="text-sm text-gray-600 panel-oscuro:text-gray-400 mb-4 leading-relaxed">
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
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white panel-oscuro:bg-gray-900 border border-orange-200 panel-oscuro:border-orange-500/30 hover:border-orange-400 hover:shadow-md transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-100 panel-oscuro:bg-orange-500/15 flex items-center justify-center shrink-0">
                      {cargando ? <Loader2 className="h-4 w-4 text-orange-600 animate-spin" /> : <Icono className="h-4 w-4 text-orange-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Probar {COPY_DIGITAL[destino].nombre}</p>
                      <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">después {money(PRECIOS_DIGITALES[PLAN_KEY[destino]].MONTHLY)}/mes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 ml-auto text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>

            {errorPrueba && <p className="text-sm text-red-600 mt-3 font-medium">{errorPrueba}</p>}
          </div>
        )}

        {/* ── Cambiar de plan ──────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 uppercase tracking-widest mb-4">Cambiar de plan</p>
          <div className="space-y-2.5">

            {/* Con el producto todavía cerrado no se ofrece pagar. La ruta de la
                preferencia rechaza estos planes igual, así que un botón sería un
                botón que no puede funcionar. */}
            {!DIGITALES_ABIERTO && (
              <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
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
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700 panel-oscuro:text-orange-300">
                      <div className="w-8 h-8 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-xl flex items-center justify-center shrink-0">
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
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700 panel-oscuro:text-orange-300">
                      <div className="w-8 h-8 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-xl flex items-center justify-center shrink-0">
                        <PlanIcon className="h-4 w-4 text-orange-600" />
                      </div>
                      Quedarme en {COPY_DIGITAL[tier].nombre}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-orange-600">{money(precio)}</span>
                  </button>
                )}

                {/* Con el plan pago caído o por caerse: renovar. */}
                {!esFree && (estado === "GRACE" || estado === "EXPIRED" || estado === "CANCELLED") && (
                  <button
                    onClick={() => setPagar({ plan: PLAN_KEY[tier], billing })}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-orange-700 panel-oscuro:text-orange-300">
                      <div className="w-8 h-8 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-xl flex items-center justify-center shrink-0">
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
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-emerald-200 panel-oscuro:border-emerald-500/30 bg-emerald-50 panel-oscuro:bg-emerald-500/10 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-emerald-700 panel-oscuro:text-emerald-300">
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
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-rose-200 panel-oscuro:border-rose-500/30 bg-rose-50 hover:bg-rose-100 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-rose-700">
                      <div className="w-8 h-8 bg-rose-100 panel-oscuro:bg-rose-500/15 rounded-xl flex items-center justify-center shrink-0">
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
                instalada se abre en el navegador. Sin esto reemplazaba la pantalla
                y dejaba a la persona navegando tiendaapps.com adentro de la app,
                sin barra de direcciones ni forma de volver. */}
            <a
              href="/precios"
              {...(inPwa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3 text-left text-sm font-medium text-gray-600 panel-oscuro:text-gray-400">
                <div className="w-8 h-8 bg-gray-100 panel-oscuro:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-gray-500 panel-oscuro:text-gray-400" />
                </div>
                Comparar los tres planes
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 panel-oscuro:text-gray-500" />
            </a>
          </div>
        </div>

        {/* ── Tus datos ────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <UserRound className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 uppercase tracking-widest">Tus datos</p>
          </div>
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mb-5">Sólo los vemos nosotros. No se le muestran a quien te compra.</p>

          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                maxLength={80}
                aria-invalid={problemaNombre !== null}
                aria-describedby={problemaNombre ? "error-nombre" : undefined}
                onChange={(e) => { setNombre(e.target.value); setGuardado(false); }}
                className={`w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 panel-oscuro:text-gray-100 outline-none transition-all ${
                  problemaNombre
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : "border-gray-200 panel-oscuro:border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                }`}
                placeholder="Cómo te llamás"
              />
              {problemaNombre && (
                <p id="error-nombre" className="text-xs text-red-600 mt-1.5 font-medium">{problemaNombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="telefono" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
                Celular de contacto
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 panel-oscuro:text-gray-500" />
                <input
                  id="telefono"
                  type="tel"
                  inputMode="tel"
                  value={telefono}
                  maxLength={TELEFONO_MAXIMO}
                  aria-invalid={problemaTelefono !== null}
                  aria-describedby={problemaTelefono ? "error-telefono" : "ayuda-telefono"}
                  onChange={(e) => { setTelefono(e.target.value); setGuardado(false); }}
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm text-gray-900 panel-oscuro:text-gray-100 outline-none transition-all ${
                    problemaTelefono
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-gray-200 panel-oscuro:border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  }`}
                  placeholder="+54 9 11 5555 5555"
                />
              </div>
              {problemaTelefono ? (
                <p id="error-telefono" className="text-xs text-red-600 mt-1.5 font-medium">{problemaTelefono}</p>
              ) : (
                <p id="ayuda-telefono" className="text-xs text-gray-400 panel-oscuro:text-gray-500 mt-1.5">
                  Lo usamos sólo para escribirte desde soporte si hace falta.
                </p>
              )}
            </div>

            <button
              onClick={guardarDatos}
              disabled={guardando || !datosCambiaron || hayProblema}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>

            {guardado && (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Listo, quedó guardado.
              </p>
            )}
            {errorDatos && <p className="text-sm text-red-600 font-medium">{errorDatos}</p>}
          </div>

          {/* Lo que no se puede cambiar acá. Va abajo y en gris para que se lea
              como información y no como un formulario que no anda. */}
          <div className="mt-6 pt-5 border-t border-gray-100 panel-oscuro:border-gray-800 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400 panel-oscuro:text-gray-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Correo</p>
                <p className="text-sm text-gray-700 panel-oscuro:text-gray-300 font-medium break-all">{cuenta.email}</p>
              </div>
            </div>
            {cuenta.alta && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-gray-400 panel-oscuro:text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Cuenta creada</p>
                  <p className="text-sm text-gray-700 panel-oscuro:text-gray-300 font-medium">{cuenta.alta}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Contraseña ───────────────────────────────────────────────────────
            Por mail y no con un formulario acá, y es a propósito: un formulario en
            esta pantalla deja que cualquiera que agarre la sesión abierta —el
            teléfono desbloqueado arriba de la mesa— te cambie la contraseña y te
            deje afuera de tu propia cuenta. Pidiendo la vieja tampoco alcanza:
            eso hay que verificarlo volviendo a iniciar sesión contra Supabase, que
            según cómo esté configurado exige captcha y devolvería "contraseña
            incorrecta" siempre.
            El link al correo prueba que sos vos con algo que la sesión no tiene, y
            reusa el circuito de "olvidé mi contraseña" que ya está hecho y
            probado. Menos código y más seguro. */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 uppercase tracking-widest">Contraseña</p>
          </div>

          {linkMandado ? (
            <div className="mt-3 rounded-2xl bg-emerald-50 panel-oscuro:bg-emerald-500/10 border border-emerald-100 panel-oscuro:border-emerald-500/25 p-4">
              <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 mb-1">Revisá tu correo</p>
              <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
                Si <strong className="text-gray-700 panel-oscuro:text-gray-300 break-all">{cuenta.email}</strong> es tu dirección, te llegó
                un link para poner una contraseña nueva. Puede tardar un minuto y a veces cae en Correo no
                deseado.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-2 mb-4 leading-relaxed">
                La cambiás desde un link que te mandamos por correo. Lo hacemos así y no con un formulario
                acá para que nadie que agarre tu sesión abierta pueda dejarte afuera de tu cuenta.
              </p>
              <button
                onClick={mandarLinkDeContrasena}
                disabled={mandandoLink}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {mandandoLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {mandandoLink ? "Mandando..." : "Mandarme el link"}
              </button>
            </>
          )}
        </div>

        {/* ── Lo que no pasa nunca ─────────────────────────────────────────────
            El cartel más importante de la pantalla, y por eso está en los cinco
            estados. Es la diferencia real con el plan de una tienda: acá no hay
            cierre, no hay fecha límite y no se borra nada. */}
        <div className="rounded-3xl border border-emerald-100 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Tu cuenta no se cierra</p>
              <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1 leading-relaxed">
                Si un plan pago se termina, volvés a Free y seguís adentro. No se borra ningún producto,
                ninguna venta ni ninguna página: cambian la comisión y las funciones pagas, nada más.
              </p>
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
    </>
  );
}
