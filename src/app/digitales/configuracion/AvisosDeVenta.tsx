"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Smartphone } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, getPushSubscription, isPushSupported } from "@/lib/push-client";
import { esAppInstalada, esIOS } from "@/lib/pwa";

/**
 * El interruptor de los avisos al teléfono, en Configuración → General.
 *
 * Hasta el 21/09/26 acá había un botón apagado que decía "a una cuenta
 * digital todavía no le llega ningún aviso". Era cierto cuando se escribió y
 * dejó de serlo el día que el cobro empezó a mandar el push de "¡Vendiste!"
 * (`/api/digitales/cobro`) y el panel a pedir el permiso (`PWAManager`, sin
 * `disableNotifPrompt`). Quedó diciendo lo contrario de lo que pasaba.
 *
 * Usa las mismas funciones que el panel de tiendas (`lib/push-client`): la
 * suscripción cuelga del service worker que controla ESTA página —el de
 * `/digitales`—, que es el que recibe el push. Sólo cambia la ropa: naranja
 * y con tema oscuro, como el resto del panel.
 *
 * Los estados que se distinguen, porque cada uno pide algo distinto:
 *   - no soporta (iPhone sin la app instalada, navegador viejo): decir cómo;
 *   - bloqueado (dijo que no alguna vez): el navegador no vuelve a preguntar,
 *     hay que destrabarlo en el candadito; se le dice, no se le miente con un
 *     botón que no hace nada;
 *   - activo / apagado: el interruptor.
 */
type Estado = "cargando" | "activo" | "apagado" | "bloqueado" | "error" | "sin-servidor";

export default function AvisosDeVenta() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const enVuelo = useRef(false);

  /* `null` en el servidor: no se sabe. Con `false` a secas, el primer pintado
     diría "tu navegador no soporta avisos" a todo el mundo. */
  const soporta = useSyncExternalStore<boolean | null>(() => () => {}, () => isPushSupported(), () => null);
  /* Lo mismo para "bloqueado": es un valor del navegador, no un estado
     nuestro, así que se lee, no se guarda (y el lint del repo no deja
     escribir estado adentro de un efecto). */
  const bloqueadoAlEntrar = useSyncExternalStore<boolean>(
    () => () => {},
    () => isPushSupported() && Notification.permission === "denied",
    () => false,
  );
  /* Si está usando el panel instalado como app. Cosmético: decide qué
     consejo se muestra, nada más. */
  const instalada = useSyncExternalStore<boolean | null>(() => () => {}, () => esAppInstalada(), () => null);
  const iphone = useSyncExternalStore<boolean>(() => () => {}, () => esIOS(), () => false);

  useEffect(() => {
    if (!soporta || bloqueadoAlEntrar) return;
    getPushSubscription()
      .then((s) => setEstado(s ? "activo" : "apagado"))
      .catch(() => setEstado("error"));
  }, [soporta, bloqueadoAlEntrar]);

  async function alternar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    const eraActivo = estado === "activo";
    setEstado("cargando");
    try {
      if (!eraActivo) {
        /* Sin la clave en el servidor (pasa en local) el error es nuestro, no
           de ella: se dice tal cual y no "probá de nuevo". */
        const clave = await fetch("/api/push/vapid-key").then((r) => r.ok).catch(() => false);
        if (!clave) { setEstado("sin-servidor"); return; }
      }
      const ok = eraActivo ? await unsubscribeFromPush() : await subscribeToPush();
      if (!ok && !eraActivo && Notification.permission === "denied") setEstado("bloqueado");
      else setEstado(ok ? (eraActivo ? "apagado" : "activo") : "error");
    } finally {
      enVuelo.current = false;
    }
  }

  if (soporta === null) {
    return <p className="text-sm text-gray-400 panel-oscuro:text-gray-500">Viendo si tu navegador puede avisar…</p>;
  }
  if (soporta === false) {
    return (
      <p className="text-sm leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
        Este navegador no puede mandar avisos. En iPhone, instalá el panel como app (Compartir →
        «Agregar a inicio») y abrilo desde ahí: ahí sí llegan.
      </p>
    );
  }
  if (bloqueadoAlEntrar || estado === "bloqueado") {
    return (
      <p className="text-sm leading-relaxed text-amber-800 panel-oscuro:text-amber-200">
        Los avisos están bloqueados en este navegador. Para volver a permitirlos, tocá el candadito
        al lado de la dirección, buscá «Notificaciones» y ponelo en «Permitir»; después recargá.
      </p>
    );
  }

  const activo = estado === "activo";
  return (
    <div className="space-y-3">
      {/* Dónde está parada: en la app instalada los avisos llegan con el
          navegador cerrado; en el navegador, no siempre. Se dice antes del
          botón, porque cambia qué conviene hacer primero. */}
      {instalada !== null && (
        <p className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed ${instalada
          ? "bg-green-50 panel-oscuro:bg-green-500/10 text-green-800 panel-oscuro:text-green-300"
          : "bg-gray-50 panel-oscuro:bg-gray-800/60 text-gray-600 panel-oscuro:text-gray-300"}`}>
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {instalada
              ? "Estás usando el panel instalado como app: los avisos llegan aunque lo tengas cerrado."
              : iphone
                ? "Estás en el navegador. En iPhone los avisos sólo llegan con la app instalada: Compartir → «Agregar a inicio», y abrila desde ahí."
                : "Estás en el navegador. Para que los avisos lleguen con el navegador cerrado, instalá el panel como app: en el menú del navegador, «Instalar» o «Agregar a inicio»."}
          </span>
        </p>
      )}
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void alternar()}
        disabled={estado === "cargando"}
        aria-pressed={activo}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${activo
          ? "border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
          : "bg-orange-600 text-white hover:bg-orange-500"}`}
      >
        {estado === "cargando" ? <Loader2 className="h-4 w-4 animate-spin" /> : activo ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {estado === "cargando" ? "Un momento…" : activo ? "Apagar los avisos" : "Activar avisos"}
      </button>
      <span className="text-sm text-gray-600 panel-oscuro:text-gray-300">
        {activo
          ? "Activos en este navegador: cuando se concreta una venta, te avisamos."
          : estado === "sin-servidor"
            ? "Los avisos no están configurados en este servidor (falta la clave). No es algo tuyo: avisanos."
            : estado === "error"
              ? "No pudimos activarlos. Probá de nuevo, o revisá el candadito al lado de la dirección."
              : "Apenas se concreta una venta, un aviso en este dispositivo."}
      </span>
    </div>
    </div>
  );
}
