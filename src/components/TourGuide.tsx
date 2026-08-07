"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X, ChevronRight, ChevronLeft, Compass } from "lucide-react";
import type { Guion, Texto } from "@/components/tours";

/* Motor de los tours guiados. No sabe de qué pantalla habla: recibe un guion
   —los textos, indexados por `data-tour`— y el nombre de un ámbito, y de ahí
   en más trabaja mirando el DOM. Los pasos son los elementos `[data-tour]` que
   estén dentro de `[data-tour-scope="<ámbito>"]`, así que un botón que no está
   en pantalla no genera un paso que señale al vacío.

   Los guiones viven en `@/components/tours`. */

const ANCHO_MAX = 304;  // ancho del globo cuando hay lugar
const AIRE = 14;        // separación entre el elemento resaltado y el globo
const BORDE = 12;       // margen mínimo contra el borde de la ventana
const GRACIA = 500;     // ms de espera antes de dar por perdida la pantalla

function acotar(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

/* Dos rects se consideran iguales por debajo del medio píxel. El seguimiento
   corre en cada cuadro para pegarse a la animación del menú; sin esta
   comparación cada cuadro era un `setState` con un objeto nuevo, o sea un
   re-render de todo el tour a 60 por segundo. */
function mismoRect(a: DOMRect | null, b: DOMRect | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
  );
}

type Lado = "izq" | "arriba" | "abajo" | null;

/* Dónde entra el globo, en orden de preferencia: al costado del elemento,
   abajo, arriba, y si no entra en ningún lado, apoyado contra el pie de la
   ventana. Es una sola regla para todos los anchos y sale distinta en cada uno
   sin tener que preguntarlo: al costado del menú de escritorio sobra lugar, en
   360 no y cae debajo del ítem, y contra un botón pegado al borde derecho
   —como "Usar este diseño"— también cae debajo, que es donde tiene que ir. */
function ubicar(r: DOMRect, ancho: number, alto: number, vw: number, vh: number) {
  const izq = acotar(r.left, BORDE, Math.max(BORDE, vw - ancho - BORDE));

  if (r.right + AIRE + ancho <= vw - BORDE) {
    return {
      left: r.right + AIRE,
      top: acotar(r.top + r.height / 2 - alto / 2, BORDE, Math.max(BORDE, vh - alto - BORDE)),
      lado: "izq" as Lado,
    };
  }
  if (r.bottom + AIRE + alto <= vh - BORDE) {
    return { left: izq, top: r.bottom + AIRE, lado: "arriba" as Lado };
  }
  if (r.top - AIRE - alto >= BORDE) {
    return { left: izq, top: r.top - AIRE - alto, lado: "abajo" as Lado };
  }
  return { left: (vw - ancho) / 2, top: Math.max(BORDE, vh - alto - 16), lado: null as Lado };
}

export default function TourGuide({
  guion,
  ambito: ambitoProp,
  storageKey,
  orden = "dom",
  respaldo,
  onDone,
  storeType,
  onMenu,
}: {
  /** Textos de cada paso, indexados por el `data-tour` del elemento. */
  guion: Guion;
  /** Valor de `data-tour-scope` donde buscar. Con dos, elige según el ancho. */
  ambito: string | { desktop: string; mobile: string };
  /** Clave de localStorage donde queda marcado que este tour ya se vio. */
  storageKey: string;
  /** `dom`: los pasos van en el orden en que están en pantalla — sirve para el
      menú, que así se sigue solo si mañana se reordena. `guion`: en el orden
      del guion, para pantallas donde lo que hay que mirar primero no es lo
      primero del DOM. */
  orden?: "dom" | "guion";
  /** Qué decir si no se encontró ni un elemento del ámbito. */
  respaldo?: Texto;
  onDone: () => void;
  storeType?: string | null;
  /** Abrir y cerrar el menú lateral mobile: abajo de 1024 el tour del panel lo
      necesita desplegado para poder resaltar los links de verdad. */
  onMenu?: (abierto: boolean) => void;
}) {
  const [paso, setPaso] = useState(0);
  const [ids, setIds] = useState<string[]>([]);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [alto, setAlto] = useState(230);
  const [seRindio, setSeRindio] = useState(false);

  const globoRef = useRef<HTMLDivElement>(null);
  const cuadroRef = useRef<number | null>(null);
  const idsRef = useRef<string[]>([]);
  const rectRef = useRef<DOMRect | null>(null);
  const altoRef = useRef(230);

  /* Se pregunta el ancho en vez de guardarlo al montar, así el tour se entera
     de que giraste el teléfono o achicaste la ventana. El `false` del final es
     lo que contesta el servidor, donde no hay `window`. */
  const esMobile = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("resize", avisar);
      return () => window.removeEventListener("resize", avisar);
    },
    () => window.innerWidth < 1024,
    () => false,
  );

  const ambito = typeof ambitoProp === "string"
    ? ambitoProp
    : esMobile ? ambitoProp.mobile : ambitoProp.desktop;

  // Abajo de 1024 el menú del panel vive detrás del botón hamburguesa: el tour
  // lo abre mientras dura y lo vuelve a cerrar al salir.
  useEffect(() => {
    onMenu?.(esMobile);
    return () => onMenu?.(false);
  }, [esMobile, onMenu]);

  /* Un solo lazo por cuadro que hace las tres cosas: leer qué pasos existen,
     medir el elemento del paso actual y medir el alto real del globo. Va por
     rAF y no por eventos porque tiene que seguir animaciones —el menú de
     escritorio que se ensancha, el cajón mobile que entra deslizándose— que no
     avisan cuadro a cuadro. Todo se escribe con `setState` solo si cambió. */
  useEffect(() => {
    function medir() {
      cuadroRef.current = requestAnimationFrame(medir);

      const raiz = document.querySelector<HTMLElement>(`[data-tour-scope="${ambito}"]`);
      const presentes = raiz
        ? Array.from(raiz.querySelectorAll<HTMLElement>("[data-tour]"))
            .map((el) => el.dataset.tour ?? "")
            .filter((id, i, todos) => id in guion && todos.indexOf(id) === i)
        : [];
      const leidos = orden === "guion"
        ? Object.keys(guion).filter((id) => presentes.includes(id))
        : presentes;

      if (leidos.join("|") !== idsRef.current.join("|")) {
        idsRef.current = leidos;
        setIds(leidos);
      }

      const id = leidos[Math.min(paso, leidos.length - 1)];
      const el = raiz && id ? raiz.querySelector<HTMLElement>(`[data-tour="${id}"]`) : null;
      /* Cuando no aparece se limpia. Antes era `if (el) setRect(...)`: un paso
         sin elemento en pantalla dejaba el resaltado clavado en el anterior,
         señalando una cosa mientras el globo hablaba de otra. */
      const medido = el ? el.getBoundingClientRect() : null;
      if (!mismoRect(medido, rectRef.current)) {
        rectRef.current = medido;
        setRect(medido);
      }

      const altoGlobo = globoRef.current?.offsetHeight ?? 0;
      if (altoGlobo > 0 && Math.abs(altoGlobo - altoRef.current) > 0.5) {
        altoRef.current = altoGlobo;
        setAlto(altoGlobo);
      }
    }
    cuadroRef.current = requestAnimationFrame(medir);
    return () => { if (cuadroRef.current) cancelAnimationFrame(cuadroRef.current); };
  }, [ambito, paso, guion, orden]);

  /* Red de contención: si pasado medio segundo no se encontró un solo elemento
     del ámbito, el tour se muestra igual como tarjeta suelta. Es la falla del
     primer ingreso: antes, si la pantalla no estaba lista, `return null` no
     dibujaba nada, el usuario nunca llegaba a "Listo" y como el "ya lo vi" se
     guarda recién ahí, el tour fantasma volvía a intentarlo en cada recarga. */
  useEffect(() => {
    if (ids.length > 0) return;
    const t = setTimeout(() => setSeRindio(true), GRACIA);
    return () => clearTimeout(t);
  }, [ids.length]);

  // La pantalla se desplaza sola hasta el paso: si no, en ventanas bajas el
  // resaltado quedaba fuera de la vista.
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(`[data-tour-scope="${ambito}"]`);
    const id = ids[paso];
    if (!raiz || !id) return;
    raiz.querySelector<HTMLElement>(`[data-tour="${id}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [paso, ids, ambito]);

  const total = ids.length;

  // Si quedan menos pasos que el índice actual (cambió el ámbito al pasar de
  // escritorio a mobile, o desapareció un botón), se corrige durante el render
  // en vez de con un efecto, para no encadenar un re-render de más.
  if (total > 0 && paso > total - 1) setPaso(total - 1);

  const terminar = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    onDone();
  }, [onDone, storageKey]);

  const siguiente = useCallback(() => {
    if (paso < total - 1) setPaso(paso + 1);
    else terminar();
  }, [paso, total, terminar]);

  const anterior = useCallback(() => setPaso((p) => Math.max(0, p - 1)), []);

  // Escape para salir y flechas para moverse: el tour tapa la pantalla entera,
  // hay que poder sacárselo de encima sin buscar la cruz.
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") terminar();
      else if (e.key === "ArrowRight") siguiente();
      else if (e.key === "ArrowLeft") anterior();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [terminar, siguiente, anterior]);

  if (total === 0 && !seRindio) return null;

  const actual = total > 0 ? guion[ids[Math.min(paso, total - 1)]] : null;
  const texto: Texto = actual
    ? (storeType && actual.porTipo?.[storeType]) || { title: actual.title, body: actual.body }
    : respaldo ?? {
        title: "Bienvenido",
        body: "Explorá la pantalla con calma. Si algo no se entiende, el botón de ayuda vuelve a abrir esta guía cuando quieras.",
      };
  const Icono = actual?.icon ?? Compass;
  const ultimo = total === 0 || paso >= total - 1;

  const contenido = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 shrink-0">
          <Icono className="h-[18px] w-[18px] text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 id="tour-titulo" className="font-bold text-gray-900 text-[15px] leading-tight">
            {texto.title}
          </h3>
          {total > 0 && (
            <span className="text-[11px] font-medium text-gray-400">
              Paso {paso + 1} de {total}
            </span>
          )}
        </div>
        <button
          onClick={terminar}
          aria-label="Cerrar la guía"
          className="-mt-1 -mr-1 flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-[13px] text-gray-500 leading-relaxed mt-2.5">{texto.body}</p>

      {total > 1 && (
        <div className="flex items-center gap-1 mt-3.5" role="tablist" aria-label="Pasos de la guía">
          {ids.map((id, i) => (
            <button
              key={id}
              role="tab"
              aria-selected={i === paso}
              aria-label={`Paso ${i + 1}: ${guion[id].title}`}
              onClick={() => setPaso(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === paso ? "bg-indigo-500 w-5" : i < paso ? "bg-indigo-200 w-1.5" : "bg-gray-200 w-1.5 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-4">
        <button
          onClick={anterior}
          disabled={paso === 0}
          className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 disabled:invisible transition-colors py-1.5 pr-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <div className="flex items-center gap-1">
          {!ultimo && (
            <button
              onClick={terminar}
              className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors px-2 py-1.5"
            >
              Saltar
            </button>
          )}
          <button
            onClick={siguiente}
            className="flex items-center gap-1 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 px-3.5 py-2 rounded-xl shadow-sm shadow-indigo-500/30 transition-colors"
          >
            {ultimo ? "Listo" : "Siguiente"}
            {!ultimo && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );

  const claseGlobo =
    "bg-white rounded-2xl shadow-2xl shadow-slate-900/20 ring-1 ring-black/5 p-4 animate-fade-slide";

  /* Sin elemento que señalar, el tour se planta en el medio con su propio
     fondo oscuro. Nunca queda invisible. */
  if (!rect) {
    return (
      <>
        <div className="fixed inset-0 bg-slate-900/55 z-[9997]" onClick={terminar} />
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 pointer-events-none">
          <div
            ref={globoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-titulo"
            className={`${claseGlobo} w-full max-w-[304px] pointer-events-auto`}
          >
            {contenido}
          </div>
        </div>
      </>
    );
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ancho = Math.min(ANCHO_MAX, vw - BORDE * 2);
  const { left, top, lado } = ubicar(rect, ancho, alto, vw, vh);

  /* La flecha apunta al elemento, no al medio del globo: en un ítem alto o
     pegado al borde de la ventana el globo se corre y una flecha fija al 50%
     terminaba señalando al aire. */
  const flecha: Record<string, React.CSSProperties> = {
    izq:    { borderStyle: "solid", left: -6,   top:  acotar(rect.top + rect.height / 2 - top, 14, alto - 14),   borderLeftWidth: 1,  borderBottomWidth: 1 },
    arriba: { borderStyle: "solid", top: -6,    left: acotar(rect.left + rect.width / 2 - left, 14, ancho - 14), borderLeftWidth: 1,  borderTopWidth: 1 },
    abajo:  { borderStyle: "solid", bottom: -6, left: acotar(rect.left + rect.width / 2 - left, 14, ancho - 14), borderRightWidth: 1, borderBottomWidth: 1 },
  };

  return (
    <>
      {/* Atrapa el clic para salir. Transparente: la penumbra la pone el
          recorte del resaltado, no una capa aparte. */}
      <div className="fixed inset-0 z-[9997]" onClick={terminar} />

      {/* El resaltado y la penumbra son la misma sombra: 3px de anillo índigo y
          después un desborde enorme que oscurece el resto de la pantalla. Deja
          el elemento calado y a pleno color en vez de gris abajo de un velo,
          que era lo que lo hacía ver apagado. */}
      <div
        aria-hidden
        className="fixed z-[9998] rounded-xl pointer-events-none transition-[top,left,width,height] duration-150 ease-out"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 3px #6366f1, 0 0 0 7px rgba(99,102,241,0.22), 0 0 0 9999px rgba(15,23,42,0.6)",
        }}
      />

      <div
        ref={globoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        className={`fixed z-[9999] ${claseGlobo} transition-[top,left] duration-150 ease-out`}
        style={{ width: ancho, left, top }}
      >
        {lado && (
          <div
            aria-hidden
            className="absolute w-3 h-3 bg-white border-black/5 rotate-45"
            style={flecha[lado]}
          />
        )}
        {contenido}
      </div>
    </>
  );
}
