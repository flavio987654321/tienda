"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellRing, Check, ChevronDown, Download, Loader2, Lock, Send, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, getPushSubscription, isPushSupported } from "@/lib/push-client";
import { esAppInstalada, esIOS } from "@/lib/pwa";
import { useSePuedeInstalar, instalarLaApp } from "@/lib/instalar-app";
import { useRubroDelPanel } from "@/contexts/RubroDelPanel";

/**
 * "Recibí los avisos en tu celular" (08/10/26).
 *
 * Tres pasos, cada uno con su estado real, no supuesto:
 *   1. Instalar el panel como app. En iPhone es obligatorio (regla de Apple:
 *      sin instalar, Safari no da avisos). En Android es recomendable y en la
 *      compu, opcional.
 *   2. Activar los avisos en ESTE aparato (la suscripción del navegador, que
 *      es por aparato, no por cuenta).
 *   3. Probar: el servidor manda un aviso a este aparato y nada más, con unos
 *      segundos de espera si se quiere ver que llega con la app cerrada.
 *
 * `donde="inicio"` va arriba del inicio del panel hasta que quede todo listo;
 * después se achica a una línea y se puede cerrar. `donde="ajustes"` está
 * siempre, en Configuración.
 *
 * Lo que es del navegador (si soporta, si está instalada, el permiso) se lee
 * con `useSyncExternalStore`, no se copia a un estado: en el servidor no se
 * sabe, y el primer dibujo no puede mentir ("tu navegador no soporta…").
 */

type Activacion = "cargando" | "activo" | "apagado" | "bloqueado" | "sin-servidor" | "error";
type Prueba = { fase: "nada" } | { fase: "enviando"; demora: boolean; desde: number } | { fase: "enviado" } | { fase: "fallo"; texto: string; reactivar?: boolean };

const CLAVE_OCULTA = "avisos_celular_oculto";
const CLAVE_PROBADO = "avisos_celular_probado";
const DEMORA_S = 8;

const nada = () => () => {};
function leerLocal(k: string): boolean { try { return localStorage.getItem(k) === "1"; } catch { return false; } }
function guardarLocal(k: string, v: boolean) { try { if (v) localStorage.setItem(k, "1"); else localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }

export default function AvisosAlCelular({ donde }: { donde: "inicio" | "ajustes" }) {
  const { tipoTienda } = useRubroDelPanel();
  const autos = tipoTienda === "AUTOS";
  const queAvisamos = autos ? "cada consulta, tasación o búsqueda nueva" : "cada pedido nuevo";

  // ── Lo que dice el navegador ───────────────────────────────────────────────
  const soporta = useSyncExternalStore<boolean | null>(nada, () => isPushSupported(), () => null);
  const instalada = useSyncExternalStore<boolean | null>(nada, () => esAppInstalada(), () => null);
  const iphone = useSyncExternalStore(nada, () => esIOS(), () => false);
  const android = useSyncExternalStore(nada, () => /Android/i.test(navigator.userAgent), () => false);
  const bloqueado = useSyncExternalStore(nada, () => isPushSupported() && Notification.permission === "denied", () => false);
  const sePuedeInstalar = useSePuedeInstalar();
  const celular = iphone || android;
  /* En la compu: la dirección del panel, para abrirlo desde el celular. */
  const direccion = useSyncExternalStore(nada, () => `${location.host}/dashboard`, () => "");

  // ── Lo nuestro ─────────────────────────────────────────────────────────────
  const [activacion, setActivacion] = useState<Activacion>("cargando");
  const [prueba, setPrueba] = useState<Prueba>({ fase: "nada" });
  const [probado, setProbado] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [verPasosIphone, setVerPasosIphone] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const enVuelo = useRef(false);

  useEffect(() => {
    /* Las marcas guardadas se leen al montar (en el servidor no existen). Un tick
       después, como pide el lint del repo para no escribir estado en el efecto. */
    const t = setTimeout(() => { setProbado(leerLocal(CLAVE_PROBADO)); setOculta(leerLocal(CLAVE_OCULTA)); }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (soporta !== true || bloqueado) return;
    let vivo = true;
    getPushSubscription()
      .then((s) => { if (vivo) setActivacion(s && Notification.permission === "granted" ? "activo" : "apagado"); })
      .catch(() => { if (vivo) setActivacion("error"); });
    return () => { vivo = false; };
  }, [soporta, bloqueado]);

  // La cuenta regresiva del "te llega en 8 segundos".
  useEffect(() => {
    if (prueba.fase !== "enviando" || !prueba.demora) return;
    const tick = () => setSegundos(Math.max(0, DEMORA_S - Math.floor((Date.now() - prueba.desde) / 1000)));
    const t0 = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => { clearTimeout(t0); clearInterval(id); };
  }, [prueba]);

  const estadoActivacion: Activacion = soporta === false ? "error" : bloqueado ? "bloqueado" : activacion;
  const activo = estadoActivacion === "activo";
  // En iPhone sin instalar no hay avisos posibles: el paso 2 espera al 1.
  const necesitaInstalar = iphone && instalada === false;

  const instalar = useCallback(async () => {
    if (instalando) return;
    setInstalando(true);
    try { await instalarLaApp(); } finally { setInstalando(false); }
  }, [instalando]);

  const activar = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setActivacion("cargando");
    try {
      const clave = await fetch("/api/push/vapid-key").then((r) => r.ok).catch(() => false);
      if (!clave) { setActivacion("sin-servidor"); return; }
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setActivacion(permiso === "denied" ? "bloqueado" : "apagado"); return; }
      setActivacion((await subscribeToPush()) ? "activo" : "error");
    } catch {
      setActivacion("error");
    } finally {
      enVuelo.current = false;
    }
  }, []);

  const apagar = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setActivacion("cargando");
    try {
      const ok = await unsubscribeFromPush();
      setActivacion(ok ? "apagado" : "error");
      if (ok) { setProbado(false); guardarLocal(CLAVE_PROBADO, false); setPrueba({ fase: "nada" }); }
    } finally {
      enVuelo.current = false;
    }
  }, []);

  const probar = useCallback(async (demora: boolean) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setAyuda(false);
    setSegundos(demora ? DEMORA_S : 0);
    setPrueba({ fase: "enviando", demora, desde: Date.now() });
    try {
      const sub = await getPushSubscription();
      if (!sub) { setActivacion("apagado"); setPrueba({ fase: "fallo", texto: "Este celular no tiene los avisos activos. Activalos y probá de nuevo.", reactivar: true }); return; }
      const r = await fetch("/api/push/prueba", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, demora }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; reactivar?: boolean };
      if (r.ok) setPrueba({ fase: "enviado" });
      else {
        if (d.reactivar) setActivacion("apagado");
        setPrueba({ fase: "fallo", texto: d.error ?? "No se pudo mandar. Probá de nuevo.", reactivar: d.reactivar });
      }
    } catch {
      setPrueba({ fase: "fallo", texto: "Sin conexión. Probá de nuevo." });
    } finally {
      enVuelo.current = false;
    }
  }, []);

  const confirmarQueLlego = () => { setProbado(true); guardarLocal(CLAVE_PROBADO, true); setPrueba({ fase: "nada" }); };
  const ocultar = () => { setOculta(true); guardarLocal(CLAVE_OCULTA, true); };

  // Todavía no se sabe nada del navegador: en el inicio no se dibuja (no salta).
  if (soporta === null || instalada === null) {
    return donde === "ajustes" ? <Marco><p className="px-5 py-6 text-sm text-slate-400">Viendo qué puede hacer este navegador…</p></Marco> : null;
  }

  const listo = activo && probado;

  // ── Inicio, ya listo: una línea, que se puede cerrar ──────────────────────
  if (donde === "inicio" && (oculta || listo)) {
    if (oculta) return null;
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-100 panel-oscuro:border-emerald-500/25 bg-emerald-50/70 panel-oscuro:bg-emerald-500/10 px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
        <p className="min-w-0 flex-1 text-sm text-emerald-900 panel-oscuro:text-emerald-200">
          <strong className="font-semibold">Avisos activos en este celular.</strong> Te avisamos {queAvisamos}.
        </p>
        <button type="button" onClick={ocultar} aria-label="Ocultar este aviso"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-700 panel-oscuro:text-emerald-300 hover:bg-emerald-100 panel-oscuro:hover:bg-emerald-500/20">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const paso1Hecho = instalada === true;
  // En la compu instalar es opcional: no entra en la cuenta ("1 de 2") salvo que ya esté instalada.
  const paso1Opcional = !celular && !paso1Hecho;
  const total = paso1Opcional ? 2 : 3;
  const hechos = [!paso1Opcional && paso1Hecho, activo, probado].filter(Boolean).length;

  return (
    <Marco inicio={donde === "inicio"}>
      {/* Encabezado */}
      <div className="relative overflow-hidden px-5 pt-5 pb-4 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <BellRing className="h-6 w-6 avc-campana" />
            {!activo && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white panel-oscuro:border-gray-900 bg-amber-400" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 panel-oscuro:text-gray-100 sm:text-lg">Recibí los avisos en tu celular</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-500 panel-oscuro:text-gray-400">
              Te avisamos {queAvisamos} al instante, aunque tengas la app cerrada.
            </p>
          </div>
          {donde === "inicio" && (
            <button type="button" onClick={ocultar} aria-label="Ocultar por ahora"
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 panel-oscuro:hover:bg-gray-800">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Avance */}
        <div className="relative mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 panel-oscuro:bg-gray-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechos} aria-label="Pasos listos">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500" style={{ width: `${(hechos / total) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500 panel-oscuro:text-gray-400">{hechos} de {total}</span>
        </div>
      </div>

      <ol className="border-t border-slate-100 panel-oscuro:border-gray-800">
        {/* ── 1. Instalar ── */}
        <Paso n={1} hecho={paso1Hecho} titulo="Instalá la app del panel"
          etiqueta={paso1Hecho ? "Instalada" : iphone ? "Necesario en iPhone" : celular ? "Recomendado" : "Opcional en la compu"}
          texto={paso1Hecho
            ? "Estás usando el panel como app. Así los avisos llegan con su ícono, aunque no la tengas abierta."
            : iphone
              ? "En iPhone, Apple sólo deja recibir avisos si el panel está en la pantalla de inicio."
              : celular
                ? `Queda con su ícono en el celular, se abre de un toque y los avisos llegan a su nombre.${sePuedeInstalar ? "" : " Desde el menú del navegador (⋮): «Instalar app» o «Agregar a la pantalla de inicio»."}`
                : `Queda como un programa más, con su ícono.${sePuedeInstalar ? "" : " Desde el menú del navegador (⋮): «Instalar»."}`}>
          {!paso1Hecho && (sePuedeInstalar ? (
            <BotonPrincipal onClick={() => void instalar()} cargando={instalando} icono={<Download className="h-4 w-4" />}>Instalar</BotonPrincipal>
          ) : iphone ? (
            <BotonSecundario onClick={() => setVerPasosIphone((v) => !v)} aria-expanded={verPasosIphone}>
              Cómo se hace <ChevronDown className={`h-4 w-4 transition-transform ${verPasosIphone ? "rotate-180" : ""}`} />
            </BotonSecundario>
          ) : null)}
        </Paso>
        {!paso1Hecho && iphone && verPasosIphone && (
          <li className="list-none px-5 pb-5 sm:px-6">
            <ol className="grid gap-2 rounded-2xl bg-slate-50 panel-oscuro:bg-gray-800/60 p-4 text-sm text-slate-700 panel-oscuro:text-gray-300 sm:grid-cols-3">
              <MiniPaso n={1} icono={<Share className="h-4 w-4" />}>Abrí esta página en <strong>Safari</strong> y tocá <strong>Compartir</strong>.</MiniPaso>
              <MiniPaso n={2} icono={<SquarePlus className="h-4 w-4" />}>Elegí <strong>«Agregar a inicio»</strong> y confirmá.</MiniPaso>
              <MiniPaso n={3} icono={<Smartphone className="h-4 w-4" />}>Abrí el panel <strong>desde el ícono nuevo</strong> y seguí acá.</MiniPaso>
            </ol>
          </li>
        )}

        {/* ── 2. Activar ── */}
        <Paso n={2} hecho={activo} bloqueadoPor={necesitaInstalar ? "Primero instalá la app" : undefined} titulo={celular ? "Activá los avisos en este celular" : "Activá los avisos en esta compu"}
          etiqueta={activo ? "Activos" : estadoActivacion === "bloqueado" ? "Bloqueados" : undefined}
          texto={activo
            ? `Listo: ${celular ? "este celular" : "esta compu"} está anotad${celular ? "o" : "a"}. Cada celular o compu se activa por separado.`
            : estadoActivacion === "bloqueado"
              ? undefined
              : celular ? "Tu teléfono te va a preguntar si permitís las notificaciones: tocá «Permitir»." : "El navegador te va a preguntar si permitís las notificaciones: elegí «Permitir»."}>
          {!necesitaInstalar && soporta && (activo ? (
            <BotonTexto onClick={() => void apagar()}>Apagar</BotonTexto>
          ) : estadoActivacion === "bloqueado" ? null : (
            <BotonPrincipal onClick={() => void activar()} cargando={estadoActivacion === "cargando"} icono={<Bell className="h-4 w-4" />}>Activar</BotonPrincipal>
          ))}
        </Paso>
        {estadoActivacion === "bloqueado" && !necesitaInstalar && (
          <li className="list-none px-5 pb-5 sm:px-6">
            <div className="flex gap-3 rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Las notificaciones están <strong>bloqueadas</strong> para el panel, y el navegador no deja volver a preguntar.
                {instalada
                  ? " Andá a los Ajustes del teléfono → Notificaciones → TiendaApps, y permitilas. Después volvé acá."
                  : " Tocá el candadito al lado de la dirección → Notificaciones → «Permitir», y recargá la página."}
              </p>
            </div>
          </li>
        )}
        {soporta === false && !necesitaInstalar && (
          <li className="list-none px-5 pb-5 text-sm text-slate-500 panel-oscuro:text-gray-400 sm:px-6">
            Este navegador no puede recibir avisos. Probá desde Chrome, o instalá el panel como app.
          </li>
        )}
        {(estadoActivacion === "error" && soporta) || estadoActivacion === "sin-servidor" ? (
          <li className="list-none px-5 pb-5 text-sm text-red-600 panel-oscuro:text-red-400 sm:px-6" role="alert">
            {estadoActivacion === "sin-servidor"
              ? "Los avisos no están configurados en el servidor. No es algo tuyo: escribinos."
              : "No se pudieron activar. Probá de nuevo en un momento."}
          </li>
        ) : null}

        {/* ── 3. Probar ── */}
        <Paso n={3} hecho={probado && activo} bloqueadoPor={!activo ? "Primero activá los avisos" : undefined} titulo="Probalo"
          etiqueta={probado && activo ? "Probado" : undefined} ultimo
          texto={probado && activo
            ? "Te llegó el de prueba. Cuando quieras, probá de nuevo."
            : "Te mandamos un aviso de prueba. Mejor con la app cerrada: así ves cómo te va a llegar de verdad."}>
          {activo && prueba.fase !== "enviando" && (
            <div className="flex flex-wrap gap-2">
              <BotonPrincipal onClick={() => void probar(true)} icono={<Send className="h-4 w-4" />}>
                {celular ? "Probar con el celular bloqueado" : "Probar en 8 segundos"}
              </BotonPrincipal>
              <BotonSecundario onClick={() => void probar(false)}>Ahora</BotonSecundario>
            </div>
          )}
        </Paso>
        {activo && prueba.fase !== "nada" && (
          <li className="list-none px-5 pb-5 sm:px-6" aria-live="polite">
            {prueba.fase === "enviando" && (
              <div className="flex items-center gap-4 rounded-2xl bg-indigo-50 panel-oscuro:bg-indigo-500/10 p-4">
                {prueba.demora ? (
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
                      <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" className="stroke-indigo-100 panel-oscuro:stroke-indigo-500/20" />
                      <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-indigo-500 transition-[stroke-dashoffset] duration-300"
                        strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - segundos / DEMORA_S)} />
                    </svg>
                    <span className="text-base font-bold tabular-nums text-indigo-700 panel-oscuro:text-indigo-300">{segundos}</span>
                  </span>
                ) : <Loader2 className="h-6 w-6 shrink-0 animate-spin text-indigo-500" />}
                <p className="text-sm leading-relaxed text-indigo-900 panel-oscuro:text-indigo-200">
                  {prueba.demora
                    ? <><strong>{celular ? "Bloqueá el celular ahora" : "Minimizá esta ventana"}.</strong> En {segundos} segundos te llega el aviso.</>
                    : "Mandando el aviso…"}
                </p>
              </div>
            )}
            {prueba.fase === "enviado" && (
              <div className="rounded-2xl border border-slate-200 panel-oscuro:border-gray-700 p-4">
                <p className="text-sm font-semibold text-slate-900 panel-oscuro:text-gray-100">Mandado. ¿Te llegó?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BotonPrincipal onClick={confirmarQueLlego} icono={<Check className="h-4 w-4" />}>Sí, me llegó</BotonPrincipal>
                  <BotonSecundario onClick={() => setAyuda(true)}>No me llegó</BotonSecundario>
                </div>
                {ayuda && (
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600 panel-oscuro:text-gray-300">
                    <li>• Revisá que el teléfono no esté en <strong>No molestar</strong> o en modo concentración.</li>
                    <li>• En Android: Ajustes → Apps → {instalada ? "TiendaApps" : "Chrome"} → Notificaciones, que estén permitidas.</li>
                    <li>• Si tenés <strong>ahorro de batería</strong> fuerte, puede demorar: sacá a {instalada ? "la app" : "Chrome"} de la lista de optimizadas.</li>
                    <li>• ¿Seguís sin recibirlo? Apagá y volvé a activar los avisos en el paso 2.</li>
                  </ul>
                )}
              </div>
            )}
            {prueba.fase === "fallo" && (
              <p role="alert" className="rounded-2xl bg-red-50 panel-oscuro:bg-red-500/10 p-4 text-sm text-red-700 panel-oscuro:text-red-300">{prueba.texto}</p>
            )}
          </li>
        )}
      </ol>
      {/* Desde la compu, lo que de verdad importa es el celular: cómo seguir ahí. */}
      {!celular && direccion && (
        <div className="flex items-start gap-3 border-t border-slate-100 panel-oscuro:border-gray-800 bg-slate-50/70 panel-oscuro:bg-gray-800/40 px-5 py-4 sm:px-6">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p className="text-[13px] leading-relaxed text-slate-600 panel-oscuro:text-gray-300">
            <strong className="font-semibold text-slate-900 panel-oscuro:text-gray-100">¿Y en el celular?</strong>{" "}
            Entrá a <span className="font-semibold text-indigo-600 panel-oscuro:text-indigo-300">{direccion}</span> desde el celular, iniciá sesión y seguí estos mismos pasos ahí. Cada aparato se activa por separado.
          </p>
        </div>
      )}
      <style>{`
        @keyframes avc-sacude { 0%,100% { transform: rotate(0) } 10%,30% { transform: rotate(-12deg) } 20%,40% { transform: rotate(12deg) } 50% { transform: rotate(0) } }
        .avc-campana { animation: avc-sacude 2.4s ease-in-out 1s 2; transform-origin: 50% 10% }
        @media (prefers-reduced-motion: reduce) { .avc-campana { animation: none } }
      `}</style>
    </Marco>
  );
}

/* ── Piezas ──────────────────────────────────────────────────────────────── */

function Marco({ children, inicio }: { children: React.ReactNode; inicio?: boolean }) {
  return (
    <section aria-label="Avisos al celular"
      className={`${inicio ? "mb-6" : ""} overflow-hidden rounded-2xl border border-slate-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 shadow-sm`}>
      {children}
    </section>
  );
}

function Paso({ n, hecho, titulo, texto, etiqueta, bloqueadoPor, ultimo, children }: {
  n: number; hecho: boolean; titulo: string; texto?: string; etiqueta?: string; bloqueadoPor?: string; ultimo?: boolean; children?: React.ReactNode;
}) {
  const apagado = !!bloqueadoPor && !hecho;
  return (
    <li className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 ${ultimo ? "" : "border-b border-slate-100 panel-oscuro:border-gray-800"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span aria-hidden="true" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${hecho
          ? "bg-emerald-500 text-white"
          : apagado ? "bg-slate-100 panel-oscuro:bg-gray-800 text-slate-300 panel-oscuro:text-gray-600" : "bg-indigo-50 panel-oscuro:bg-indigo-500/15 text-indigo-600 panel-oscuro:text-indigo-300"}`}>
          {hecho ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0">
          <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold ${apagado ? "text-slate-400 panel-oscuro:text-gray-500" : "text-slate-900 panel-oscuro:text-gray-100"}`}>
            <span className="sr-only">{hecho ? "Hecho: " : `Paso ${n}: `}</span>{titulo}
            {etiqueta && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hecho
                ? "bg-emerald-50 panel-oscuro:bg-emerald-500/15 text-emerald-700 panel-oscuro:text-emerald-300"
                : etiqueta === "Bloqueados" ? "bg-amber-50 panel-oscuro:bg-amber-500/15 text-amber-700 panel-oscuro:text-amber-300"
                : "bg-slate-100 panel-oscuro:bg-gray-800 text-slate-600 panel-oscuro:text-gray-300"}`}>{etiqueta}</span>
            )}
          </p>
          {(apagado ? bloqueadoPor : texto) && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 panel-oscuro:text-gray-400">{apagado ? bloqueadoPor : texto}</p>
          )}
        </div>
      </div>
      {children && !apagado && <div className="shrink-0 pl-12 sm:pl-0">{children}</div>}
    </li>
  );
}

function MiniPaso({ n, icono, children }: { n: number; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white panel-oscuro:bg-gray-900 p-3 shadow-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 panel-oscuro:bg-indigo-500/15 text-indigo-600 panel-oscuro:text-indigo-300" aria-hidden="true">{icono}</span>
      <span className="leading-snug"><span className="sr-only">{n}. </span>{children}</span>
    </li>
  );
}

function BotonPrincipal({ onClick, cargando, icono, children }: { onClick: () => void; cargando?: boolean; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={cargando}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[.98] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : icono}
      {cargando ? "Un momento…" : children}
    </button>
  );
}

function BotonSecundario({ onClick, children, ...rest }: { onClick: () => void; children: React.ReactNode } & React.AriaAttributes) {
  return (
    <button type="button" onClick={onClick} {...rest}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-4 text-sm font-semibold text-slate-700 panel-oscuro:text-gray-200 transition hover:bg-slate-50 panel-oscuro:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
      {children}
    </button>
  );
}

function BotonTexto({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="min-h-10 rounded-lg px-2 text-sm font-medium text-slate-400 transition hover:text-red-600 panel-oscuro:text-gray-500 panel-oscuro:hover:text-red-400">
      {children}
    </button>
  );
}
