"use client";

import { useEffect, useState } from "react";

/**
 * Sonda de scroll. **Sólo existe en desarrollo**: el layout la dibuja detrás de
 * `process.env.NODE_ENV === "development"`, así que no viaja al build.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE: CUATRO ARREGLOS A CIEGAS PARA UNA SOLA FRANJA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Se pintó el fondo del body, se puso `shrink-0` en el armazón, se puso
 * `overflow: hidden` y después `overflow: clip`. Cada uno salió de una teoría
 * sobre qué se movía y ninguna se midió; la franja seguía apareciendo. La causa
 * real era un `<label>` sin `relative` (ver `ProductosClient`), y se encontró
 * leyendo, no con esto.
 *
 * Queda igual, y por eso: **esto no arregla, mira**. Escucha el scroll de
 * CUALQUIER elemento —en captura, que es la única forma de enterarse de un
 * scroll que no burbujea— y dice quién se movió, cuánto, y qué tenía el foco
 * cuando pasó. Arriba muestra el alto del documento contra su contenido: si esos
 * dos números no son iguales adentro del panel, algo le está dando sobrante y
 * la franja va a volver.
 *
 * Se dibuja en pantalla y no en la consola a propósito: la consola de Chrome no
 * deja pegar nada sin escribir "allow pasting" primero, y esto tiene que poder
 * leerse de una captura.
 *
 * Se cierra con la ×, y queda un botoncito para volver a abrirla.
 */
type Linea = { que: string; detalle: string; hora: string };

export default function SondaDeScroll() {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [abierta, setAbierta] = useState(true);

  useEffect(() => {
    const anotar = (que: string, detalle: string) =>
      setLineas((v) => [
        { que, detalle, hora: new Date().toLocaleTimeString("es-AR") },
        ...v,
      ].slice(0, 8));

    /* Cómo se llama el elemento que se movió, en corto. */
    const nombre = (n: EventTarget | null): string => {
      if (n === document || n === null) return "DOCUMENTO";
      const el = n as HTMLElement;
      if (el === document.documentElement) return "<html>";
      if (el === document.body) return "<body>";
      const clases = typeof el.className === "string" ? el.className.slice(0, 60) : "";
      return `<${el.tagName.toLowerCase()}> ${clases}`;
    };

    /* ⚠️ EN CAPTURA (`true`). El scroll de un elemento NO burbujea: escuchando
       en el body de la forma normal, un `<main>` que se mueve no se entera
       nadie. En captura pasan todos. */
    const alScrollear = (e: Event) => {
      const el = e.target === document ? document.documentElement : (e.target as HTMLElement);
      anotar("SCROLL", `${nombre(e.target)} → top ${Math.round(el.scrollTop)}`);
    };

    const alEnfocar = (e: FocusEvent) => {
      anotar("FOCO", nombre(e.target));
    };

    document.addEventListener("scroll", alScrollear, true);
    document.addEventListener("focusin", alEnfocar, true);
    return () => {
      document.removeEventListener("scroll", alScrollear, true);
      document.removeEventListener("focusin", alEnfocar, true);
    };
  }, []);

  /* El estado del documento, releído cada segundo: si `scrollHeight` es mayor
     que `clientHeight`, el documento TIENE sobrante aunque no se vea la barra. */
  const [medida, setMedida] = useState("");
  useEffect(() => {
    const tic = setInterval(() => {
      const h = document.documentElement;
      const b = document.body;
      setMedida(
        `html: alto ${h.clientHeight} · contenido ${h.scrollHeight} · top ${Math.round(h.scrollTop)}\n` +
        `body: alto ${b.clientHeight} · contenido ${b.scrollHeight} · top ${Math.round(b.scrollTop)}\n` +
        `ventana: ${window.innerHeight} · scrollY ${Math.round(window.scrollY)}`,
      );
    }, 400);
    return () => clearInterval(tic);
  }, []);

  if (!abierta) {
    return (
      <button
        onClick={() => setAbierta(true)}
        className="fixed bottom-2 left-2 z-[200] rounded bg-black/80 px-2 py-1 text-[10px] font-mono text-lime-300"
      >
        sonda
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 z-[200] max-h-[45vh] w-[min(92vw,420px)] overflow-auto rounded-lg bg-black/85 p-2 font-mono text-[10px] leading-tight text-lime-300 shadow-xl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <strong className="text-lime-200">sonda de scroll (sólo dev)</strong>
        <button onClick={() => setLineas([])} className="rounded bg-white/10 px-1.5">limpiar</button>
        <button onClick={() => setAbierta(false)} className="rounded bg-white/10 px-1.5">×</button>
      </div>
      <pre className="mb-1 whitespace-pre-wrap text-cyan-300">{medida}</pre>
      {lineas.length === 0 && <p className="text-lime-300/60">sin movimiento todavía…</p>}
      {lineas.map((l, i) => (
        <p key={i} className={l.que === "SCROLL" ? "text-amber-300" : "text-lime-300/70"}>
          {l.hora} · {l.que} · {l.detalle}
        </p>
      ))}
    </div>
  );
}
