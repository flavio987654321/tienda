"use client";
import { useEffect, useMemo, useState } from "react";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext } from "@/contexts/EditContext";
import { TEMPLATE_CATEGORIES } from "@/lib/templateRegistry";
import type { StoreConfig } from "@/types/store-config";
import { AVISO_ALINEABLE, AVISO_CONFIG, AVISO_INDICE, AVISO_LISTA, AVISO_LLAMADA, type Edicion, type ItemIndice, type Llamada } from "./avisos";

/**
 * La tienda tal como la ve alguien desde el celular, para el editor de Diseño.
 *
 * ── Por qué es otra página y no la misma previa angostada ───────────────────
 *
 * Los templates deciden si dibujan la versión de celular mirando
 * `window.innerWidth`, y además tienen `@media` en sus estilos. Las dos cosas
 * miran la VENTANA, no el recuadro donde está el template. Angostar la previa
 * del editor mostraba el diseño de escritorio apretado: una pantalla que ningún
 * visitante ve nunca. El editor la mete en un `iframe` de 390 px, y un `iframe`
 * tiene su propia ventana: ahí el template se entera de verdad de que está en un
 * celular.
 *
 * Es la misma idea que la previa de la página de venta de digitales.
 *
 * ── Cómo se entera de los cambios ────────────────────────────────────────────
 *
 * Es otra ventana, así que no ve el estado del editor. Al cargar avisa que está
 * lista y el editor le manda el borrador entero (sin guardar incluido); después
 * se lo vuelve a mandar con cada cambio.
 *
 * ── Cómo se edita desde acá ──────────────────────────────────────────────────
 *
 * Cuando el editor dice que se está editando, se arma un `EditContext` en modo
 * edición: los textos se marcan al pasar y se pueden tocar. Pero la config vive
 * en el editor, así que cada función que la cambiaría —abrir un campo, cambiar
 * un ícono, mover una sección— no hace nada acá: se le reenvía por nombre y el
 * editor la aplica. El resultado vuelve en el próximo borrador.
 *
 * Solo se aceptan avisos de nuestro propio origen: la config decide qué se dibuja.
 */

/* El dibujo ya armado de cada template, y no el componente suelto: sacar un
   componente de un mapa en pleno dibujado hace que React lo trate como uno nuevo
   en cada render y lo vuelva a montar (lo marca `react-hooks/static-components`),
   y eso tira el estado del template —la pantalla abierta, el carrusel— a cada tecla. */
const DIBUJOS = new Map(
  TEMPLATE_CATEGORIES.flatMap((c) => c.templates).map((t) => {
    const Template = t.component;
    return [t.id as string, <Template key={t.id} />];
  }),
);

/** El último campo que se abrió tocándolo acá adentro. Ver el efecto que centra. */
const tocadoAca: { campo: string | null } = { campo: null };

/** Cuántos renglones ocupa un texto y de qué tamaño es la letra: con eso la
    lista marca los títulos que en el celular quedaron larguísimos. */
function medida(el: HTMLElement) {
  const tamano = parseFloat(getComputedStyle(el).fontSize) || 0;
  const r = document.createRange(); r.selectNodeContents(el);
  const tops = [...r.getClientRects()].filter(x => x.width > 0).map(x => x.top).sort((a, b) => a - b);
  // Dos pedazos del mismo renglón (una palabra en negrita, un ícono) no caen
  // exactamente a la misma altura: es otro renglón sólo si baja más de media letra.
  let renglones = 0, ultimo = -Infinity;
  for (const t of tops) if (t - ultimo > tamano / 2) { renglones++; ultimo = t; }
  return { renglones, tamano: Math.round(tamano) };
}

/** Está dibujado: no escondido con `display: none` (propio o de un contenedor). */
const seVe = (el: HTMLElement) => el.getClientRects().length > 0;

/** Lo que dice un texto, sin el globito "✏ Título" que se le cuelga al pasar el mouse. */
function textoDe(el: HTMLElement) {
  const copia = el.cloneNode(true) as HTMLElement;
  copia.querySelectorAll("[data-edit-globito]").forEach(g => g.remove());
  return (copia.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function pedir(fn: Llamada, ...args: unknown[]) {
  if (fn === "setActiveField") tocadoAca.campo = (args[0] as string | null) ?? null;
  window.parent?.postMessage({ tipo: AVISO_LLAMADA, fn, args }, window.location.origin);
}

export default function PreviaCelular() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  useEffect(() => {
    const alAviso = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { tipo?: unknown; config?: unknown; edicion?: unknown } | null;
      if (d?.tipo === AVISO_CONFIG && d.config && typeof d.config === "object") {
        setConfig(d.config as StoreConfig);
        setEdicion((d.edicion as Edicion | null | undefined) ?? null);
      }
    };
    window.addEventListener("message", alAviso);
    // Recién ahora, con el oído puesto: si se avisara antes, la respuesta
    // podría llegar sin nadie escuchando.
    window.parent?.postMessage({ tipo: AVISO_LISTA }, window.location.origin);
    return () => window.removeEventListener("message", alAviso);
  }, []);

  /* Escape cierra el panel también con el foco acá adentro: la tecla la recibe
     esta ventana, y el editor, que es el que escucha Escape, no se entera. */
  useEffect(() => {
    if (!edicion?.activeField) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") pedir("setActiveField", null); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [edicion?.activeField]);

  /* ── La lista de textos del panel ────────────────────────────────────────────
     El panel del editor muestra todos los textos que se pueden tocar, agrupados
     por bloque. Quién sabe cuáles son es esta ventana, que es la que los dibuja:
     cada template tiene los suyos, y algunos aparecen o desaparecen según la
     config (un bloque oculto, un carrusel). Se leen de la pantalla —las marcas
     `data-edit-field` de `EditableZone` y `data-chapita` de cada bloque— en el
     orden en que se ven, y se mandan cada vez que algo cambia. */
  const editando = !!edicion;
  useEffect(() => {
    if (!editando) return;
    let ultimo = "";
    let espera: ReturnType<typeof setTimeout> | undefined;
    const armar = () => {
      const items: ItemIndice[] = [];
      const vistos = new Set<string>();
      let bloque: string | null = null;
      document.querySelectorAll<HTMLElement>("[data-chapita], [data-edit-field]").forEach(el => {
        if (el.dataset.chapita !== undefined) { bloque = el.dataset.chapita || null; return; }
        const field = el.dataset.editField!;
        // Un mismo campo puede dibujarse dos veces —una versión por pantalla,
        // con la otra escondida: Urban Pulse lo hace en el pie—. Va el que se ve,
        // y una sola vez.
        if (vistos.has(field) || !seVe(el)) return;
        vistos.add(field);
        items.push({
          field, bloque,
          label: el.dataset.editLabel || field,
          texto: textoDe(el),
          original: el.dataset.editOriginal ?? "",
          ...medida(el),
        });
      });
      const json = JSON.stringify(items);
      if (json === ultimo) return;
      ultimo = json;
      window.parent?.postMessage({ tipo: AVISO_INDICE, items }, window.location.origin);
    };
    const pedirArmado = () => { clearTimeout(espera); espera = setTimeout(armar, 250); };
    const obs = new MutationObserver(pedirArmado);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    pedirArmado();
    return () => { obs.disconnect(); clearTimeout(espera); };
  }, [editando]);

  /* Elegido desde la lista del panel: se lo trae a la vista. Si lo tocaron acá
     no: ya se está viendo, y centrarlo haría saltar la pantalla bajo el dedo. */
  const activo = edicion?.activeField ?? null;
  useEffect(() => {
    if (!activo) return;
    // Se consume: si después lo eligen desde la lista, ahí sí hay que ir a buscarlo.
    if (activo === tocadoAca.campo) { tocadoAca.campo = null; return; }
    [...document.querySelectorAll<HTMLElement>(`[data-edit-field="${CSS.escape(activo)}"]`)]
      .find(seVe)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activo]);

  /* ── ¿Alinear este texto lo mueve? ───────────────────────────────────────────
     No siempre: el nombre de la tienda en la barra, el nombre de un
     departamento abajo de su ícono o una etiqueta de estadística ocupan justo
     su lugar, y no hay regla que los pueda correr sin desarmar el template
     (medido el 30/09/26: 36 de los 347 textos de los 11). Ofrecer los botones
     ahí es un clic que no hace nada.
     Se prueba en vivo, que es lo único que no miente: se lo alinea a la
     izquierda, se mide, a la derecha, se mide, y se deja como estaba. Todo en
     el mismo instante, sin que el navegador llegue a pintar nada en el medio. */
  useEffect(() => {
    if (!activo || activo.startsWith("img:") || activo.startsWith("bg:")) return;
    const t = setTimeout(() => {
      const el = [...document.querySelectorAll<HTMLElement>(`[data-edit-field="${CSS.escape(activo)}"]`)].find(seVe);
      if (!el) return;
      const antes = el.getAttribute("data-cel-align");
      const varAntes = el.style.getPropertyValue("--cel-align");
      const bordes = (align: string) => {
        el.setAttribute("data-cel-align", align);
        el.style.setProperty("--cel-align", align);
        const r = document.createRange(); r.selectNodeContents(el);
        return [...r.getClientRects()].filter(x => x.width > 0).map(x => x.left);
      };
      const izq = bordes("left");
      const der = bordes("right");
      if (antes === null) el.removeAttribute("data-cel-align"); else el.setAttribute("data-cel-align", antes);
      if (varAntes) el.style.setProperty("--cel-align", varAntes); else el.style.removeProperty("--cel-align");
      const movio = izq.reduce((a, x, i) => a + Math.abs((der[i] ?? x) - x), 0);
      window.parent?.postMessage({ tipo: AVISO_ALINEABLE, field: activo, puede: movio >= 3 }, window.location.origin);
    }, 50);
    return () => clearTimeout(t);
  }, [activo]);

  /* El contexto va SIEMPRE, también cuando sólo se mira: los textos leen sus
     ajustes (el texto cambiado, el color, lo del celular) de acá y no de la
     config. Sin él la tienda salía con los textos de fábrica — en la publicada
     no pasa porque lo arma `StorefrontTemplateRenderer`.
     Cuando sólo se mira, las funciones no piden nada: no hay panel que abrir. */
  const contexto = useMemo(() => {
    if (!config) return null;
    const p = (fn: Llamada) => (...a: unknown[]) => { if (edicion) pedir(fn, ...a); };
    return {
      editMode: !!edicion,
      activeField: edicion?.activeField ?? null,
      activeLabel: edicion?.activeLabel ?? null,
      overrides: config.textOverrides ?? {},
      imageOverrides: config.imageOverrides ?? {},
      sectionColors: config.sectionColors ?? {},
      imageLoading: edicion?.imageLoading ?? {},
      hiddenSections: config.hiddenSections ?? [],
      sectionOrder: config.sectionOrder ?? [],
      setActiveField: p("setActiveField"),
      setOverride: p("setOverride"),
      resetOverride: p("resetOverride"),
      setImageOverride: p("setImageOverride"),
      setSectionColor: p("setSectionColor"),
      toggleHiddenSection: p("toggleHiddenSection"),
      moveSection: p("moveSection"),
      vistaCelular: !!edicion,
      setHiddenSectionCelular: p("setHiddenSectionCelular"),
    };
  }, [edicion, config]);

  const dibujo = config ? DIBUJOS.get(config.template) : undefined;
  if (!config || !dibujo) return null;

  return (
    <EditContext.Provider value={contexto!}>
      <StoreConfigContext.Provider value={config}>
        {dibujo}
      </StoreConfigContext.Provider>
    </EditContext.Provider>
  );
}
