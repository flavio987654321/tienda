"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Eye, EyeOff, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus, Trash2,
  Loader2, ExternalLink, Save, Monitor, Smartphone, Lock, ImageIcon, AlertTriangle,
} from "lucide-react";
import {
  SECCIONES, ESTILOS, PALETAS, buscarSeccion, porQueNoSeDibuja,
  AVISO_BORRADOR, AVISO_LISTA, AVISO_TOCAR,
  type Campo, type PaginaVenta, type SeccionGuardada,
} from "@/lib/pagina-venta";

/**
 * El editor de la página de venta.
 *
 * ── La previa es la página de verdad ────────────────────────────────────────
 *
 * A la derecha va un `iframe` apuntando a la página pública, no una imitación
 * dibujada acá. El motivo es concreto y no es de prolijidad: un recuadro angosto
 * adentro de esta pantalla **no reacomoda el diseño**, porque las medidas de
 * Tailwind miran el ancho de la ventana y no el del recuadro. Una "previa de
 * celular" hecha así mostraría el diseño de escritorio apretado — o sea, algo
 * que ningún visitante va a ver nunca. Un `iframe` tiene su propia ventana, así
 * que al angostarlo el diseño se reacomoda de verdad.
 *
 * Y sigue lo que se escribe: como es otra ventana, no se entera sola, así que se
 * le manda el borrador por `postMessage` y ella se redibuja. Es la página de
 * verdad dibujando el texto de ahora — no una imitación.
 */

const MAX_IMAGEN_MB = 4;

type Props = {
  productoId: string;
  nombre: string;
  publicado: boolean;
  pagina: PaginaVenta;
  cuantosBonos: number;
};

/* ── Fechas ─────────────────────────────────────────────────────────────────
 * El `datetime-local` habla en hora local y sin zona; la base guarda ISO. */

function isoALocal(iso: unknown): string {
  if (typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}T${dd(d.getHours())}:${dd(d.getMinutes())}`;
}

function localAIso(valor: string): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ── Piezas del formulario ──────────────────────────────────────────────────
 *
 * Todas las casillas llevan `maxLength` con el tope del catálogo. No reemplaza a
 * la validación del servidor —que recorta igual—, pero evita que alguien escriba
 * 400 caracteres para que después se le corten 120 sin avisarle. */

function Contador({ valor, tope }: { valor: string; tope: number }) {
  /* Sólo aparece cerca del límite: un contador permanente al lado de cada
     casilla es ruido en una pantalla que ya tiene trece secciones. */
  if (valor.length < tope * 0.8) return null;
  return (
    <span className={`text-[11px] font-medium ${valor.length >= tope ? "text-red-500" : "text-gray-400"}`}>
      {valor.length}/{tope}
    </span>
  );
}

function CasillaTexto({
  campo, valor, onChange,
}: { campo: Campo; valor: string; onChange: (v: string) => void }) {
  const comun =
    "w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 " +
    "px-3 py-2 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 " +
    "focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 panel-oscuro:focus:ring-orange-500/20";

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
          {campo.etiqueta}
        </span>
        <Contador valor={valor} tope={campo.largo} />
      </span>
      {campo.tipo === "parrafo" ? (
        <textarea
          value={valor}
          maxLength={campo.largo}
          rows={3}
          placeholder={campo.ejemplo}
          onChange={(e) => onChange(e.target.value)}
          className={`${comun} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={valor}
          maxLength={campo.largo}
          placeholder={campo.ejemplo}
          onChange={(e) => onChange(e.target.value)}
          className={comun}
        />
      )}
      {campo.ayuda && (
        <span className="mt-1 block text-[11px] text-gray-500 panel-oscuro:text-gray-400">
          {campo.ayuda}
        </span>
      )}
    </label>
  );
}

function CasillaImagen({
  campo, valor, onChange, onError,
}: { campo: Campo; valor: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const enVuelo = useRef(false);

  async function subir(file: File) {
    if (enVuelo.current) return;
    if (!file.type.startsWith("image/")) return onError("Eso no es una imagen.");
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      return onError(`La imagen no puede pesar más de ${MAX_IMAGEN_MB} MB.`);
    }
    enVuelo.current = true;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) return onError(data.error ?? "No pudimos subir la imagen.");
      onChange(data.url as string);
    } catch {
      onError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      enVuelo.current = false;
      setSubiendo(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">{campo.etiqueta}</p>
      <div className="flex flex-wrap items-center gap-2">
        {valor ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={valor} alt="" className="h-16 w-16 rounded-xl border border-gray-200 object-cover panel-oscuro:border-gray-700" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700">
            <ImageIcon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 panel-oscuro:border-gray-700 panel-oscuro:text-gray-300 panel-oscuro:hover:bg-gray-800">
          {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          {valor ? "Cambiar" : "Subir imagen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) subir(f);
            }}
          />
        </label>
        {valor && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 panel-oscuro:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Sacar
          </button>
        )}
      </div>
      {!valor && (
        <p className="mt-1 text-[11px] text-gray-500 panel-oscuro:text-gray-400">
          Sin imagen propia se usa la portada del producto.
        </p>
      )}
    </div>
  );
}

function CasillaLista({
  campo, items, onChange,
}: {
  campo: Campo;
  items: Array<Record<string, string>>;
  onChange: (v: Array<Record<string, string>>) => void;
}) {
  const hijos = campo.campos ?? [];
  const tope = campo.maxItems ?? 0;
  const vacio = () => Object.fromEntries(hijos.map((h) => [h.clave, ""]));

  const cambiar = (i: number, k: string, v: string) =>
    onChange(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));

  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copia = [...items];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };

  return (
    <div>
      <p className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
        {campo.etiqueta}
        <span className="font-medium text-gray-400">{items.length} de {tope}</span>
      </p>

      <div className="grid gap-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-800/40">
            <div className="grid gap-2">
              {hijos.map((h) => (
                <CasillaTexto
                  key={h.clave}
                  campo={h}
                  valor={typeof it[h.clave] === "string" ? it[h.clave] : ""}
                  onChange={(v) => cambiar(i, h.clave, v)}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label="Subir"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 disabled:opacity-30 panel-oscuro:hover:bg-gray-700"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Bajar"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 disabled:opacity-30 panel-oscuro:hover:bg-gray-700"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, n) => n !== i))}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-50 panel-oscuro:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Sacar
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length < tope ? (
        <button
          type="button"
          onClick={() => onChange([...items, vacio()])}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:border-gray-400 panel-oscuro:border-gray-700 panel-oscuro:text-gray-300"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      ) : (
        <p className="mt-2 text-[11px] text-gray-500 panel-oscuro:text-gray-400">
          Llegaste al máximo de {tope}.
        </p>
      )}
    </div>
  );
}

/* ── La pantalla ────────────────────────────────────────────────────────────*/

export default function EditorDePagina({ productoId, nombre, publicado, pagina: inicial, cuantosBonos }: Props) {
  const [pagina, setPagina] = useState<PaginaVenta>(inicial);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ancho, setAncho] = useState<"pc" | "celular">("pc");
  const [vista, setVista] = useState<"editar" | "previa">("editar");
  const [solapa, setSolapa] = useState<"estilo" | "contenido">("contenido");
  /* La que se acaba de abrir desde la previa. Se destaca un rato y se apaga:
     sin eso, la lista se movió sola y no queda claro dónde caíste. */
  const [recienAbierta, setRecienAbierta] = useState<string | null>(null);
  useEffect(() => {
    if (!recienAbierta) return;
    const t = setTimeout(() => setRecienAbierta(null), 1600);
    return () => clearTimeout(t);
  }, [recienAbierta]);
  const enVuelo = useRef(false);
  const marco = useRef<HTMLIFrameElement>(null);

  /* ── La previa sigue lo que se escribe ──────────────────────────────────────
   *
   * La previa es un `iframe` a la página real, así que es OTRA ventana y no se
   * entera de lo que se tipea acá. Se le manda el borrador y ella se redibuja.
   *
   * Va con un respiro de 150 ms: sin él se manda un aviso por tecla, y en un
   * párrafo largo son cientos de dibujos de una página entera.
   *
   * ⚠️ El destino del aviso es nuestro propio origen y no `"*"`. Con `"*"`, si
   * algún día ese iframe apuntara a otro lado, le estaríamos entregando el
   * borrador a un dominio ajeno. */
  useEffect(() => {
    const t = setTimeout(() => {
      marco.current?.contentWindow?.postMessage(
        { tipo: AVISO_BORRADOR, pagina },
        window.location.origin
      );
    }, 150);
    return () => clearTimeout(t);
  }, [pagina]);

  /* La previa tarda en cargar. Cuando termina, saluda — y recién ahí tiene
     sentido mandarle el borrador de nuevo: lo que se haya escrito mientras
     cargaba se perdió, y sin esto la previa arranca desfasada. */
  useEffect(() => {
    const alSaludo = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { tipo?: unknown; clave?: unknown } | null;
      if (!d || typeof d !== "object") return;

      if (d.tipo === AVISO_LISTA) {
        marco.current?.contentWindow?.postMessage(
          { tipo: AVISO_BORRADOR, pagina },
          window.location.origin
        );
        return;
      }

      /* Tocaron una sección en la previa: se abre su casilla de este lado.
         Cambia de solapa si hacía falta, la abre y la trae a la vista.
         ⚠️ La clave se comprueba contra el catálogo: llega de otra ventana. */
      if (d.tipo === AVISO_TOCAR && typeof d.clave === "string" && buscarSeccion(d.clave)) {
        const clave = d.clave;
        setSolapa("contenido");
        setAbierta(clave);
        setRecienAbierta(clave);
        /* Después de dibujar: si se busca ahora, la sección todavía está
           cerrada y el navegador la centra en el lugar equivocado. */
        requestAnimationFrame(() => {
          document
            .querySelector('[data-seccion="' + clave + '"]')
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    };
    window.addEventListener("message", alSaludo);
    return () => window.removeEventListener("message", alSaludo);
  }, [pagina]);

  /* Avisar antes de irse con cambios sin guardar. La página es larga y se pierde
     un rato de trabajo sin que nada lo insinúe. */
  useEffect(() => {
    if (!sucio) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  function actualizar(clave: string, cambio: (s: SeccionGuardada) => SeccionGuardada) {
    setPagina((p) => ({ ...p, secciones: p.secciones.map((s) => (s.clave === clave ? cambio(s) : s)) }));
    setSucio(true);
    setError("");
  }

  function setEstilo(clave: string) {
    setPagina((p) => ({ ...p, estilo: clave }));
    setSucio(true);
    setError("");
  }

  function setPaleta(clave: string) {
    setPagina((p) => ({ ...p, paleta: clave }));
    setSucio(true);
    setError("");
  }

  const setCampo = (clave: string, k: string, v: unknown) =>
    actualizar(clave, (s) => ({ ...s, campos: { ...s.campos, [k]: v } }));

  function alternar(clave: string) {
    /* Lo que no se puede ocultar no tiene botón, así que acá no debería llegar
       nunca. Igual se comprueba: es la misma regla que el servidor aplica de
       nuevo al guardar, y de las dos la que manda es la del servidor. */
    if (buscarSeccion(clave)?.sePuedeOcultar === false) return;
    actualizar(clave, (s) => ({ ...s, visible: !s.visible }));
  }

  function mover(clave: string, dir: -1 | 1) {
    setPagina((p) => {
      const i = p.secciones.findIndex((s) => s.clave === clave);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.secciones.length) return p;
      /* Ni se mueve una clavada ni se salta por encima de una: la portada es
         siempre la primera y el pie siempre el último. */
      if (buscarSeccion(p.secciones[i].clave)?.sePuedeMover === false) return p;
      if (buscarSeccion(p.secciones[j].clave)?.sePuedeMover === false) return p;
      const copia = [...p.secciones];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return { ...p, secciones: copia };
    });
    setSucio(true);
  }

  async function guardar() {
    /* Doble clic: sin esto se mandan dos guardados iguales y el segundo pisa al
       primero con lo mismo, pero gasta un lugar del tope por hora. */
    if (enVuelo.current) return;
    enVuelo.current = true;
    setGuardando(true);
    setError("");
    try {
      const r = await fetch(`/api/digitales/productos/${productoId}/pagina`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagina),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.pagina) {
        setError(data.error ?? "No pudimos guardar los cambios.");
        return;
      }
      /* Se pisa el estado con lo que devolvió el servidor. Si allá se recortó un
         texto o se descartó algo, se ve ahora y no la próxima vez que se entre. */
      setPagina(data.pagina as PaginaVenta);
      setSucio(false);
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  return (
    <div>
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-50">Página de venta</h1>
          <p className="mt-1 truncate text-sm text-gray-500 panel-oscuro:text-gray-400">
            {nombre}
            {!publicado && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 panel-oscuro:bg-gray-800 panel-oscuro:text-gray-400">
                sin publicar
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/p/${productoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 panel-oscuro:border-gray-700 panel-oscuro:text-gray-300 panel-oscuro:hover:bg-gray-800"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrirla
          </Link>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !sucio}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {sucio ? "Guardar cambios" : "Guardado"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 panel-oscuro:border-red-500/30 panel-oscuro:bg-red-500/10 panel-oscuro:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* En el celular no entran las dos columnas, así que se elige una. */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 panel-oscuro:bg-gray-800 lg:hidden">
        {(["editar", "previa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              vista === v
                ? "bg-white text-gray-900 shadow-sm panel-oscuro:bg-gray-900 panel-oscuro:text-gray-100"
                : "text-gray-500 panel-oscuro:text-gray-400"
            }`}
          >
            {v === "editar" ? "Editar" : "Vista previa"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Estilo y contenido ────────────────────────────────────────────── */}
        <div className={vista === "editar" ? "" : "hidden lg:block"}>
          {/* El estilo va PRIMERO: se elige cómo se ve y después se escribe.
              Es una solapa y no un ítem de la barra lateral porque el diseño es
              de ESTE producto — una cuenta Pro tiene hasta cinco páginas con su
              propio estilo cada una. */}
          <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1 panel-oscuro:bg-gray-800">
            {(["estilo", "contenido"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSolapa(s)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition-colors ${
                  solapa === s
                    ? "bg-white text-gray-900 shadow-sm panel-oscuro:bg-gray-900 panel-oscuro:text-gray-100"
                    : "text-gray-500 panel-oscuro:text-gray-400"
                }`}
              >
                {s === "estilo" ? "Estilo y paleta" : "Contenido"}
              </button>
            ))}
          </div>

          {solapa === "estilo" && (
            <div className="grid gap-4">
              <div>
                <p className="mb-2 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
                  Estilo
                </p>
                <div className="grid gap-2">
                  {ESTILOS.map((e) => (
                    <button
                      key={e.clave}
                      type="button"
                      onClick={() => setEstilo(e.clave)}
                      className={`rounded-2xl border p-3 text-left transition-colors ${
                        pagina.estilo === e.clave
                          ? "border-orange-400 bg-orange-50/60 panel-oscuro:border-orange-500/50 panel-oscuro:bg-orange-500/10"
                          : "border-gray-200 bg-white hover:border-gray-300 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
                      }`}
                    >
                      <span className="block text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                        {e.nombre}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                        {e.para}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
                  Paleta
                </p>
                {/* ⚠️ Son combinaciones armadas y no un selector de colores. Con
                    colores libres alguien elige amarillo sobre blanco y el botón
                    de comprar desaparece — y no lo ve, porque en su pantalla se
                    distingue. Hay un chequeo que calcula el contraste de cada
                    una y falla si alguna baja del mínimo. */}
                <p className="mb-2 text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                  Todas se leen bien. Por eso no hay colores sueltos.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PALETAS.map((p) => (
                    <button
                      key={p.clave}
                      type="button"
                      onClick={() => setPaleta(p.clave)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                        pagina.paleta === p.clave
                          ? "border-orange-400 bg-orange-50/60 panel-oscuro:border-orange-500/50 panel-oscuro:bg-orange-500/10"
                          : "border-gray-200 bg-white hover:border-gray-300 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                        style={{ background: p.acento }}
                      />
                      <span className="truncate text-xs font-bold text-gray-800 panel-oscuro:text-gray-200">
                        {p.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={solapa === "contenido" ? "grid gap-2" : "hidden"}>
            {pagina.secciones.map((s, i) => {
              const def = buscarSeccion(s.clave);
              if (!def) return null;
              const abierto = abierta === s.clave;
              const reciente = recienAbierta === s.clave;
              /* ⚠️ El motivo sale de la MISMA función que usa la página pública
                 para decidir qué pinta. Si acá se escribiera aparte, el panel
                 diría una cosa y la página haría otra. */
              const porQueNo = porQueNoSeDibuja(s, { hayBonos: cuantosBonos > 0 });

              return (
                <div
                  key={s.clave}
                  data-seccion={s.clave}
                  className={`rounded-2xl border bg-white transition-colors panel-oscuro:bg-gray-900 ${
                    abierto
                      ? "border-orange-300 panel-oscuro:border-orange-500/40"
                      : "border-gray-200 panel-oscuro:border-gray-700"
                  } ${porQueNo ? "opacity-60" : ""} ${
                    reciente ? "ring-2 ring-sky-400 ring-offset-2 panel-oscuro:ring-offset-gray-950" : ""
                  }`}
                >
                  <div className="flex items-center gap-1 p-3">
                    <button
                      type="button"
                      onClick={() => setAbierta(abierto ? null : s.clave)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                          {def.nombre}
                        </span>
                        {/* Cuando no se va a ver, el renglón lo dice y dice por
                            qué. "No se dibuja" a secas se lee como un error
                            nuestro; con el motivo, se lee como algo que falta
                            escribir. */}
                        <span
                          className={`block truncate text-[11px] ${
                            porQueNo
                              ? "font-medium text-amber-600 panel-oscuro:text-amber-400"
                              : "text-gray-500 panel-oscuro:text-gray-400"
                          }`}
                        >
                          {porQueNo ? `No se ve: ${porQueNo.toLowerCase()}` : def.para}
                        </span>
                      </span>
                      {abierto ? (
                        <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
                      )}
                    </button>

                    <span className="flex shrink-0 items-center gap-0.5">
                      {def.sePuedeMover ? (
                        <>
                          <button
                            type="button"
                            onClick={() => mover(s.clave, -1)}
                            disabled={i === 0 || buscarSeccion(pagina.secciones[i - 1]?.clave)?.sePuedeMover === false}
                            aria-label={`Subir ${def.nombre}`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-25 panel-oscuro:hover:bg-gray-800"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(s.clave, 1)}
                            disabled={
                              i === pagina.secciones.length - 1 ||
                              buscarSeccion(pagina.secciones[i + 1]?.clave)?.sePuedeMover === false
                            }
                            aria-label={`Bajar ${def.nombre}`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-25 panel-oscuro:hover:bg-gray-800"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}

                      {def.sePuedeOcultar ? (
                        <button
                          type="button"
                          onClick={() => alternar(s.clave)}
                          aria-label={s.visible ? `Ocultar ${def.nombre}` : `Mostrar ${def.nombre}`}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
                        >
                          {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      ) : (
                        /* Sin botón, y con el motivo a la vista al pasar el mouse:
                           que no se pueda apagar no puede parecer un error. */
                        <span
                          title={MOTIVO_FIJO[s.clave] ?? "Esta sección va siempre."}
                          className="grid h-7 w-7 place-items-center text-gray-300 panel-oscuro:text-gray-600"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  </div>

                  {abierto && (
                    <div className="grid gap-3 border-t border-gray-100 px-3 pb-4 pt-3 panel-oscuro:border-gray-800">
                      {def.campos.length === 0 && (
                        <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                          Esta sección no tiene nada para escribir: se llena sola.
                        </p>
                      )}
                      {def.campos.map((campo) => {
                        const valor = s.campos[campo.clave];
                        if (campo.tipo === "lista") {
                          return (
                            <CasillaLista
                              key={campo.clave}
                              campo={campo}
                              items={Array.isArray(valor) ? (valor as Array<Record<string, string>>) : []}
                              onChange={(v) => setCampo(s.clave, campo.clave, v)}
                            />
                          );
                        }
                        if (campo.tipo === "imagen") {
                          return (
                            <CasillaImagen
                              key={campo.clave}
                              campo={campo}
                              valor={typeof valor === "string" ? valor : ""}
                              onChange={(v) => setCampo(s.clave, campo.clave, v)}
                              onError={setError}
                            />
                          );
                        }
                        if (campo.tipo === "numero") {
                          return (
                            <label key={campo.clave} className="block">
                              <span className="mb-1 block text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
                                {campo.etiqueta}
                              </span>
                              {/* `min`/`max` en la casilla ADEMÁS del recorte del
                                  servidor: sin ellos las flechitas del navegador
                                  te dejan bajar a cero y el aviso llega recién
                                  al guardar. */}
                              <input
                                type="number"
                                inputMode="numeric"
                                min={campo.min}
                                max={campo.max}
                                value={typeof valor === "number" ? valor : (campo.porDefecto ?? "")}
                                onChange={(e) => setCampo(s.clave, campo.clave, e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-32 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900 panel-oscuro:text-gray-100"
                              />
                              {campo.ayuda && (
                                <span className="mt-1 block text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                                  {campo.ayuda}
                                </span>
                              )}
                            </label>
                          );
                        }
                        if (campo.tipo === "fecha") {
                          return (
                            <label key={campo.clave} className="block">
                              <span className="mb-1 block text-xs font-bold text-gray-600 panel-oscuro:text-gray-300">
                                {campo.etiqueta}
                              </span>
                              <input
                                type="datetime-local"
                                value={isoALocal(valor)}
                                onChange={(e) => setCampo(s.clave, campo.clave, localAIso(e.target.value))}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900 panel-oscuro:text-gray-100"
                              />
                              {campo.ayuda && (
                                <span className="mt-1 block text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                                  {campo.ayuda}
                                </span>
                              )}
                            </label>
                          );
                        }
                        return (
                          <CasillaTexto
                            key={campo.clave}
                            campo={campo}
                            valor={typeof valor === "string" ? valor : ""}
                            onChange={(v) => setCampo(s.clave, campo.clave, v)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── La previa ─────────────────────────────────────────────────────── */}
        <div className={vista === "previa" ? "" : "hidden lg:block"}>
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                {sucio ? "Así va a quedar · sin guardar" : "Así se ve"}
              </p>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 panel-oscuro:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setAncho("pc")}
                  aria-label="Ver en computadora"
                  className={`rounded-md p-1.5 ${ancho === "pc" ? "bg-white shadow-sm panel-oscuro:bg-gray-900" : "text-gray-400"}`}
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAncho("celular")}
                  aria-label="Ver en celular"
                  className={`rounded-md p-1.5 ${ancho === "celular" ? "bg-white shadow-sm panel-oscuro:bg-gray-900" : "text-gray-400"}`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-800">
              <div className={`mx-auto bg-white ${ancho === "celular" ? "max-w-[390px]" : ""}`}>
                {/* `?previa=1` hace dos cosas: la página escucha el borrador que
                    le mandamos, y apaga el botón de comprar para que un clic acá
                    adentro no arranque un pago.
                    Y NO lleva `key`: si se volviera a montar en cada cambio,
                    perdería el scroll y arrancaría de arriba a cada tecla. */}
                <iframe
                  ref={marco}
                  src={`/p/${productoId}?previa=1`}
                  title="Vista previa de la página de venta"
                  className="h-[70vh] w-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Por qué esta sección no se puede apagar. Se lee al pasar el mouse por el candado. */
const MOTIVO_FIJO: Record<string, string> = {
  portada: "Es la primera pantalla: sin ella la página arranca por la mitad.",
  producto: "Una página que cobra tiene que decir qué entrega.",
  precio: "El precio se ve antes de pagar, siempre.",
  pie: "Ahí está tu contacto: quien compra tiene que saber a quién reclamarle.",
};
