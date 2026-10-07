/**
 * El botón "Instalar la app".
 *
 * Chrome, Edge y Android avisan que la página se puede instalar con el evento
 * `beforeinstallprompt`. Si nadie lo guarda, la única puerta es el ícono chico
 * de la barra de direcciones, que casi nadie ve. Acá se guarda una vez, en
 * el layout (`PWAManager` llama a `escucharInstalacion`), y cualquier pantalla
 * puede ofrecer el botón con `useInstalarApp`.
 *
 * En iPhone el evento no existe: ahí el botón no se muestra y la pantalla da
 * las instrucciones (Compartir → «Agregar a inicio»). Y una vez instalada,
 * el navegador dispara `appinstalled` y el botón se va solo.
 *
 * Es un almacén externo, no estado de React: el evento llega antes o después
 * de que se monte cualquier pantalla, y `useSyncExternalStore` es la forma de
 * leerlo sin escribir estado adentro de un efecto.
 */

import { useSyncExternalStore } from "react";

type EventoDeInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let evento: EventoDeInstalacion | null = null;
let escuchando = false;
const oyentes = new Set<() => void>();

const avisar = () => { for (const f of oyentes) f(); };

/* ── ¿Ya la instaló en este aparato? ──────────────────────────────────────────
   Desde la pestaña del navegador no hay forma directa de saberlo: Chrome
   simplemente deja de ofrecer `beforeinstallprompt`, y sin el botón la
   pantalla decía "instalala desde el menú" a alguien que ya la tenía.
   Se anota cuando se instala (o cuando se abre adentro de la app), y se
   borra en cuanto Chrome vuelve a ofrecer instalar: eso sólo pasa si la
   desinstaló. En Android y en la compu la app y el navegador comparten este
   almacenamiento; en iPhone no (Safari no se entera), y ahí la pantalla
   igual muestra los pasos.
   Una marca por panel (/dashboard, /digitales): son apps distintas del mismo
   sitio, y instalar una no instala la otra. */
const claveInstalada = () => `panel_app_instalada:${location.pathname.split("/")[1] ?? ""}`;
function anotarInstalada(si: boolean) {
  try { if (si) localStorage.setItem(claveInstalada(), "1"); else localStorage.removeItem(claveInstalada()); } catch { /* sin almacenamiento */ }
  avisar();
}
const laInstalo = () => { try { return localStorage.getItem(claveInstalada()) === "1"; } catch { return false; } };

/** Una sola vez, lo antes posible: el evento no se repite. */
export function escucharInstalacion(): void {
  if (typeof window === "undefined" || escuchando) return;
  escuchando = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoDeInstalacion;
    anotarInstalada(false);
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    anotarInstalada(true);
  });
}

/** Desde adentro de la app instalada: que la pestaña del navegador se entere. */
export function anotarQueCorreInstalada(): void {
  if (!laInstalo()) anotarInstalada(true);
}

function suscribir(f: () => void): () => void {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

const sePuede = () => evento !== null;
const nuncaEnElServidor = () => false;

/** Abre el cartel del navegador. `true` si aceptó. Sin evento guardado, no hace nada. */
export async function instalarLaApp(): Promise<boolean> {
  const e = evento;
  if (!e) return false;
  /* Se suelta antes de usarlo: el navegador no deja llamarlo dos veces, y si
     lo rechaza, no vuelve a ofrecerlo hasta la próxima visita. */
  evento = null;
  avisar();
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") anotarInstalada(true);
    return outcome === "accepted";
  } catch {
    return false;
  }
}

/** Si el navegador ofreció instalar y todavía no se usó. */
export function useSePuedeInstalar(): boolean {
  return useSyncExternalStore(suscribir, sePuede, nuncaEnElServidor);
}

/** Si la instaló en este aparato y no la desinstaló (ver arriba). */
export function useYaLaInstalo(): boolean {
  return useSyncExternalStore(suscribir, laInstalo, nuncaEnElServidor);
}
