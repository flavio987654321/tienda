"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

/**
 * Llevar al dueño hasta los pasos, en vez de dejarlo adivinando.
 *
 * El problema: al terminar el login de Facebook el popup avisa y se hace
 * `router.refresh()`. La página se rearma con la cuenta conectada y con el
 * bloque de pasos ya visible… varias pantallas más abajo. Pero la ventana no se
 * mueve, así que lo único que cambia a la vista es que el botón se puso verde.
 * Parecía que la instalación había terminado ahí. Había que descubrir, solo,
 * que quedaba trabajo abajo.
 *
 * El aviso tiene que sobrevivir a un `router.refresh()` —que desmonta el botón
 * que disparó todo— así que se deja escrito en `sessionStorage` y lo levanta el
 * bloque de destino cuando se vuelve a montar. Una variable en memoria no
 * serviría: el componente que la guardaría es justamente el que desaparece.
 *
 * Se limpia apenas se lee. Si no, la próxima visita a la ficha volvería a saltar
 * sola hasta abajo sin motivo.
 */

const SENAL = "apps:ir-a-instalacion";

/** Lo llama quien completó un paso, justo antes de refrescar. */
export function pedirFocoInstalacion() {
  try {
    sessionStorage.setItem(SENAL, "1");
  } catch {
    // Modo incógnito con storage bloqueado: sin señal no hay salto, y el
    // usuario baja a mano. Es una ayuda, no puede romper la instalación.
  }
}

function habiaPedido(): boolean {
  try {
    if (sessionStorage.getItem(SENAL) !== "1") return false;
    sessionStorage.removeItem(SENAL);
    return true;
  } catch {
    return false;
  }
}

// Quien pidió no ver animaciones no las ve: el salto es instantáneo y no hay
// resaltado. Es la misma preferencia del sistema que respeta el resto de la web.
function prefiereSinMovimiento(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function irHasta(el: HTMLElement, resaltar: () => void) {
  const suave = !prefiereSinMovimiento();
  el.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  if (suave) resaltar();
}

/**
 * El bloque de instalación. Se resalta un instante al llegar, para que quede
 * claro adónde se movió la pantalla: sin eso, un salto largo desorienta más de
 * lo que ayuda.
 */
export function SeccionInstalacion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [destacado, setDestacado] = useState(false);

  function resaltar() {
    setDestacado(true);
    setTimeout(() => setDestacado(false), 1800);
  }

  useEffect(() => {
    if (!habiaPedido() || !ref.current) return;
    // Un tick para que el bloque ya esté dibujado en su lugar definitivo; sin
    // esto el navegador calcula la posición sobre el layout viejo y cae corto.
    const t = setTimeout(() => ref.current && irHasta(ref.current, resaltar), 80);
    return () => clearTimeout(t);
  }, []);

  // El botón "Instalar" del encabezado pide el resaltado por acá: el efecto vive
  // en este componente, así que se llega desde el popup o desde el botón sin
  // escribirlo dos veces.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alPedir = () => { if (!prefiereSinMovimiento()) resaltar(); };
    el.addEventListener("apps:resaltar", alPedir);
    return () => el.removeEventListener("apps:resaltar", alPedir);
  }, []);

  return (
    <section
      ref={ref}
      id="instalacion"
      className={`scroll-mt-6 rounded-xl transition-shadow duration-500 ${
        destacado ? "ring-2 ring-indigo-400 ring-offset-4 ring-offset-slate-50" : "ring-0"
      }`}
    >
      {children}
    </section>
  );
}

/**
 * El botón "Instalar" del encabezado.
 *
 * Era un `<a href="#instalacion">`, que salta de golpe: la pantalla aparece en
 * otro lado sin que nada explique el corte. Con el scroll suave se ve el
 * recorrido, y el destino se resalta igual que cuando se llega desde el popup.
 */
export function BotonInstalar() {
  function bajar() {
    const el = document.getElementById("instalacion");
    if (!el) return;
    el.scrollIntoView({ behavior: prefiereSinMovimiento() ? "auto" : "smooth", block: "start" });
    // El resaltado lo maneja la sección; acá se pide por el mismo canal para no
    // duplicar la lógica del efecto.
    el.dispatchEvent(new CustomEvent("apps:resaltar", { bubbles: false }));
  }

  return (
    <button
      onClick={bajar}
      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors"
    >
      Instalar <ArrowDown className="h-4 w-4" />
    </button>
  );
}
