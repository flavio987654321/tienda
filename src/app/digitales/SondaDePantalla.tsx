"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * La sonda del panel. **Sólo existe en desarrollo**: el layout la dibuja detrás
 * de `process.env.NODE_ENV === "development"`, así que no viaja al build ni se
 * ve nunca en una tienda de verdad.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DICE LO QUE LA PANTALLA NO DICE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Tiene dos mitades, y son de dos personas distintas.
 *
 * **Cerrada — el ancho.** Todo cambio visual se revisa en 360, 768 y 1280, y
 * 768 es donde más se rompe. Achicando el navegador a ojo no se sabe si ya se
 * cruzó el corte: 1025 y 1023 se ven casi iguales y son dos diseños distintos.
 * Esto lo dice en número, en vivo, y avisa cuando estás parado en uno de los
 * tres anchos de prueba.
 *
 * **Abierta — el scroll.** Ésta es de depuración pura y no dice nada mientras
 * todo ande bien. Escucha el scroll de CUALQUIER elemento —en captura, que es la
 * única forma de enterarse de un scroll que no burbujea— y qué tenía el foco
 * cuando pasó.
 *
 * ⚠️ El renglón que importa ahí es `html: alto N · contenido N`. **Adentro del
 * panel esos dos números tienen que dar IGUALES.** El panel es una caja del alto
 * exacto de la ventana con el scroll adentro del `<main>`; si el contenido mide
 * más que el alto, el documento tiene sobrante para scrollear y la franja va a
 * volver. Así se cazó la de septiembre: un `<label>` sin `relative` le colgaba
 * un input absoluto al documento (ver `ProductosClient`).
 *
 * Se dibuja en pantalla y no en la consola a propósito: la consola de Chrome no
 * deja pegar nada sin escribir "allow pasting" primero, y esto tiene que poder
 * leerse de una captura.
 */

/* Los cortes de Tailwind v4, que este proyecto no toca. Van de mayor a menor
   porque se busca el PRIMERO que entra. */
const CORTES: { desde: number; sigla: string; nombre: string }[] = [
  { desde: 1536, sigla: "2xl", nombre: "escritorio ancho" },
  { desde: 1280, sigla: "xl", nombre: "escritorio" },
  { desde: 1024, sigla: "lg", nombre: "escritorio chico" },
  { desde: 768, sigla: "md", nombre: "tablet" },
  { desde: 640, sigla: "sm", nombre: "celular ancho" },
  { desde: 0, sigla: "—", nombre: "celular" },
];

/** Los tres de la regla de la casa. Ver `AGENTS.md` y las notas del proyecto. */
const ANCHOS_DE_PRUEBA = [360, 768, 1280];

type Linea = { que: string; detalle: string; hora: string };

export default function SondaDePantalla() {
  const [abierta, setAbierta] = useState(false);
  const [oculta, setOculta] = useState(false);

  /* ⚠️ Arranca en `null` y se llena en el efecto. Leer `window` durante el
     dibujo rompe la hidratación: el servidor no tiene ventana y pondría otra
     cosa que el navegador. */
  const [medidas, setMedidas] = useState<{ ancho: number; alto: number } | null>(null);
  const [tema, setTema] = useState<string | null>(null);

  useEffect(() => {
    /* Con `requestAnimationFrame`: arrastrar el borde de la ventana dispara
       cientos de `resize` por segundo, y un `setState` en cada uno hace que la
       sonda se sienta pegajosa justo cuando se la está usando. */
    let pedido = 0;
    const medir = () => {
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() =>
        setMedidas({ ancho: window.innerWidth, alto: window.innerHeight }));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => { cancelAnimationFrame(pedido); window.removeEventListener("resize", medir); };
  }, []);

  /* El tema sale del atributo que el panel escribe en `<html>` y borra al salir
     (ver `TemaDelPanel`). Se mira con un observador y no con un intervalo porque
     cambia cuando alguien lo toca, no cada tanto. */
  useEffect(() => {
    const leer = () => setTema(document.documentElement.getAttribute("data-panel-tema"));
    leer();
    const obs = new MutationObserver(leer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-panel-tema"] });
    return () => obs.disconnect();
  }, []);

  /* ── La mitad de depuración ───────────────────────────────────────────────
     Los oyentes y el reloj se enganchan SÓLO con la sonda abierta. Escuchar
     todos los scrolls en captura y medir el documento cuatro veces por segundo
     no es gratis, y cerrada no lo mira nadie. */
  const [lineas, setLineas] = useState<Linea[]>([]);
  /* Los números crudos, no un texto ya armado: el sobrante se saca restando dos
     de ellos, y volver a leerlo de una frase con una expresión regular es
     inventarse un problema. */
  const [doc, setDoc] = useState<{ alto: number; contenido: number; top: number } | null>(null);

  const nombre = useCallback((n: EventTarget | null): string => {
    if (n === document || n === null) return "DOCUMENTO";
    const el = n as HTMLElement;
    if (el === document.documentElement) return "<html>";
    if (el === document.body) return "<body>";
    const clases = typeof el.className === "string" ? el.className.slice(0, 50) : "";
    return `<${el.tagName.toLowerCase()}> ${clases}`;
  }, []);

  useEffect(() => {
    if (!abierta) return;

    const anotar = (que: string, detalle: string) =>
      setLineas((v) => [{ que, detalle, hora: new Date().toLocaleTimeString("es-AR") }, ...v].slice(0, 8));

    /* ⚠️ EN CAPTURA (`true`). El scroll de un elemento NO burbujea: escuchando
       de la forma normal, un `<main>` que se mueve no se entera nadie. */
    const alScrollear = (e: Event) => {
      const el = e.target === document ? document.documentElement : (e.target as HTMLElement);
      anotar("SCROLL", `${nombre(e.target)} → top ${Math.round(el.scrollTop)}`);
    };
    const alEnfocar = (e: FocusEvent) => anotar("FOCO", nombre(e.target));

    document.addEventListener("scroll", alScrollear, true);
    document.addEventListener("focusin", alEnfocar, true);

    const tic = setInterval(() => {
      const h = document.documentElement;
      setDoc({ alto: h.clientHeight, contenido: h.scrollHeight, top: Math.round(h.scrollTop) });
    }, 400);

    return () => {
      document.removeEventListener("scroll", alScrollear, true);
      document.removeEventListener("focusin", alEnfocar, true);
      clearInterval(tic);
    };
  }, [abierta, nombre]);

  if (!medidas) return null;

  /* ⚠️ Ocultarla la deja en un punto y no la borra. Con `return null` había que
     recargar la página para recuperarla, que es justo lo que uno no quiere hacer
     en el medio de una prueba. */
  if (oculta) {
    return (
      <button
        onClick={() => setOculta(false)}
        aria-label="Mostrar la sonda"
        className="fixed bottom-2 left-2 z-[200] rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-lime-300 hover:bg-black/90"
      >
        sonda
      </button>
    );
  }

  const corte = CORTES.find((c) => medidas.ancho >= c.desde)!;
  /* "Estás en uno de los tres" con tolerancia: nadie clava 768 exacto
     arrastrando el borde, y avisar sólo en el número justo no serviría. */
  const dePrueba = ANCHOS_DE_PRUEBA.find((a) => Math.abs(medidas.ancho - a) <= 4);
  /* El sobrante del documento: si no es cero adentro del panel, algo anda mal.
     Ver el comentario de arriba. */
  const sobrante = doc ? doc.contenido - doc.alto : 0;

  return (
    <div className="fixed bottom-2 left-2 z-[200] w-[min(92vw,420px)] rounded-lg bg-black/85 font-mono text-[10px] leading-tight text-lime-300 shadow-xl backdrop-blur">
      {/* ── Cerrada: el ancho, que es lo que se mira todo el día ───────────── */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="text-sm font-bold text-white">{medidas.ancho}</span>
        <span className="text-lime-300/70">× {medidas.alto}</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300">
          {corte.sigla} · {corte.nombre}
        </span>
        {dePrueba && (
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-bold text-amber-300">
            ancho de prueba {dePrueba}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {/* Un punto rojo cuando el documento tiene sobrante: es el aviso de
              que la franja está por volver, sin tener que abrir nada. */}
          {sobrante > 0 && <span className="h-2 w-2 rounded-full bg-red-500" title="el documento tiene sobrante" />}
          <button
            onClick={() => setAbierta((v) => !v)}
            className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20"
          >
            {abierta ? "menos" : "scroll"}
          </button>
          <button
            onClick={() => setOculta(true)}
            aria-label="Ocultar la sonda"
            className="rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20"
          >
            ×
          </button>
        </span>
      </div>

      {/* ── Abierta: la parte de depuración ─────────────────────────────────── */}
      {abierta && (
        <div className="max-h-[38vh] overflow-auto border-t border-white/15 px-2 py-1.5">
          <p className="text-white/60">
            tema del panel: <span className="text-cyan-300">{tema ?? "sin atributo"}</span>
          </p>
          <p className={sobrante > 0 ? "font-bold text-red-400" : "text-cyan-300"}>
            {doc
              ? `html: alto ${doc.alto} · contenido ${doc.contenido} · top ${doc.top}`
              : "midiendo…"}
          </p>
          {sobrante > 0 && (
            <p className="mb-1 text-red-400">
              ⚠️ el documento tiene {sobrante}px de sobrante. Adentro del panel eso
              tiene que ser 0, o la franja vuelve.
            </p>
          )}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-white/40">últimos movimientos</span>
            <button onClick={() => setLineas([])} className="rounded bg-white/10 px-1.5">limpiar</button>
          </div>
          {lineas.length === 0 && <p className="text-lime-300/50">nada todavía…</p>}
          {lineas.map((l, i) => (
            <p key={i} className={l.que === "SCROLL" ? "text-amber-300" : "text-lime-300/60"}>
              {l.hora} · {l.que} · {l.detalle}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
