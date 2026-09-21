"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Upload, Copy, Check, Monitor, Smartphone, ExternalLink, AlertTriangle, Image as IconoImagen, Lock, RotateCcw, Wrench, Trash2,
} from "lucide-react";
import type { EstadoDeLanding, InventarioDeLanding, QuitadoDeLanding } from "@/lib/landing-estado";
import type { Bienvenida } from "@/lib/bienvenida";
/* `claveDeLink` y `acomodarEnlace` son las mismas del servidor, a propósito:
   si la pantalla calculara la clave por su cuenta, un acento de más guardaría
   el link en un cajón que nadie lee después. */
import { LANDING_MAX_BYTES, LANDING_VERSIONES, acomodarEnlace, claveDeLink, leerInventario, leerQuitado } from "@/lib/landing-estado";
import { instruccionesParaClaude, pedidoDeCambios, INDICACIONES_MAX, type ProductoParaInstrucciones } from "@/lib/landing-instrucciones";
import { tieneTraba } from "@/lib/landing-revision";
import ConsejoDeUso from "../../../ConsejoDeUso";
import { useAvisoSinGuardar } from "../../../useAvisoSinGuardar";

export type VersionEnPantalla = {
  id: string;
  bytes: number;
  titulo: string | null;
  /** ISO: la fecha se arma en el navegador, con la hora de quien mira. */
  cuando: string;
  inventario: InventarioDeLanding;
  quitado: QuitadoDeLanding;
};

const CLASE_INPUT = "w-full px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:opacity-50";
/* ⚠️ 4 y no 5: `/api/upload` corta en 4 MB porque el techo de una función en
   producción es 4,5. Con 5 acá, una foto de 4,5 pasaba nuestro control y la
   rebotaba el servidor con un error que no explica nada. Es el mismo número
   que usa `ElegirFoto`, que es de donde salió esto. */
const MAX_FOTO_MB = 4;

/**
 * Subir la landing propia, cargarle las fotos y prenderla.
 *
 * La pantalla es una lista de control: qué encontró el archivo, qué le
 * sacamos y qué falta. Nada de esto es un error — un HTML hecho sin nuestras
 * instrucciones entra igual —, así que se dice en orden de "esto te falta
 * para que quede bien", no en rojo.
 *
 * La previa es la página de verdad (`/p/<id>?landing=previa`) adentro de un
 * marco: no una imitación. Por eso muestra el precio real y las fotos que ya
 * subió, y marca con un borde punteado —y el nombre que pide el paso 4— cada
 * lugar de foto que todavía está vacío.
 */
export default function LandingClient({ productoId, nombre, publicado, esPago, estado, versiones, producto, bienvenida }: {
  productoId: string;
  nombre: string;
  publicado: boolean;
  esPago: boolean;
  estado: EstadoDeLanding;
  versiones: VersionEnPantalla[];
  producto: ProductoParaInstrucciones;
  bienvenida: Bienvenida;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /* En qué anda el botón de subir. No alcanza con cambiarle el ícono: si el
     texto no cambia, no se nota que está haciendo algo. Y la segunda subida
     tiene que avisar igual que la primera. */
  const [subiendo, setSubiendo] = useState<"archivo" | "revisando" | null>(null);
  const [copiado, setCopiado] = useState<"pedido" | "cambios" | null>(null);
  /* El informe de la última subida: los pasos con lo que encontró cada uno,
     que aparecen de a uno para poder leerlos. Ver `pasosDeLaSubida`. */
  const [informe, setInforme] = useState<{ pasos: Paso[]; visibles: number } | null>(null);
  const subida = useRef(0);
  const [pantalla, setPantalla] = useState<"pc" | "celular">("pc");
  const [enlaces, setEnlaces] = useState<Record<string, string>>(estado.enlaces);
  const [guardando, setGuardando] = useState<string | null>(null);
  /* Lo que pasó con cada link, AL LADO del campo: qué está mal, o el visto
     de que se guardó. El aviso de arriba queda a media pantalla de distancia
     y ahí no lo lee nadie. */
  const [linkMal, setLinkMal] = useState<Record<string, string>>({});
  /* Uno para los cuatro, porque ahora se guardan juntos. Ver `guardarLosLinks`. */
  const [guardandoLinks, setGuardandoLinks] = useState(false);
  const [linksOk, setLinksOk] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [vaABorrar, setVaABorrar] = useState(false);
  const enVuelo = useRef(false);
  const archivo = useRef<HTMLInputElement>(null);
  /* Cambia con cada guardado: la previa se recarga sola al subir una versión
     o al cambiar una foto. */
  const [refresco, setRefresco] = useState(0);
  /* A qué hueco de foto vuelve la previa al recargarse. Ver `MARCA_HUECO`. */
  const [mirando, setMirando] = useState<string | null>(null);
  const [indicaciones, anotar] = usePedidoGuardado(productoId);
  const instrucciones = instruccionesParaClaude(producto, indicaciones);

  const version = versiones.find((v) => v.id === estado.versionId) ?? null;
  const inv = version?.inventario ?? null;
  const fotosFaltan = inv ? inv.fotos.filter((f) => !estado.fotos[f]) : [];
  const linksFaltan = inv ? inv.linksVacios.filter((t) => !enlaces[claveDeLink(t)]) : [];
  const hallazgos = inv?.hallazgos ?? [];
  const trabada = tieneTraba(hallazgos);
  /* Lo que hay que pedirle a Claude, ya escrito para él. Vacío si no hay
     nada que pedir. Ver `pedidoDeCambios`. */
  const cambios = inv ? pedidoDeCambios(inv) : "";
  /* ⚠️ Se comparan sólo los que tienen algo escrito, y ordenados.
     El servidor no guarda los vacíos: los borra del mapa. Así que después de
     guardar un campo que ella dejó en blanco, acá quedaba la clave con `""` y
     allá no quedaba nada — y la pantalla se declaraba "sin guardar" para
     siempre, con el aviso de salida saltando cada vez. El orden importa por lo
     mismo: dos mapas iguales escritos en distinto orden no dan el mismo texto. */
  const soloLosLlenos = (m: Record<string, string>) =>
    JSON.stringify(Object.entries(m).filter(([, v]) => v.trim() !== "").sort());
  const sinGuardar = soloLosLlenos(enlaces) !== soloLosLlenos(estado.enlaces);
  useAvisoSinGuardar(sinGuardar && !guardandoLinks);

  async function pedir(cuerpo: Record<string, unknown>, metodo: "POST" | "PATCH" = "PATCH"): Promise<Record<string, unknown> | null> {
    /* Uno por vez, porque cada guardado manda el mapa entero de fotos y
       links y dos encimados se pisan. Pero ESPERA el turno en vez de tirar el
       pedido: salir de un campo y entrar al siguiente antes de que termine el
       primero es lo normal, y así el segundo link se perdía en silencio. */
    for (let i = 0; enVuelo.current && i < 40; i++) await new Promise((seguir) => window.setTimeout(seguir, 100));
    if (enVuelo.current) return null;
    enVuelo.current = true;
    setError(null);
    try {
      const r = await fetch(`/api/digitales/productos/${productoId}/landing`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) { setError(typeof d.error === "string" ? d.error : "No se pudo guardar. Probá de nuevo."); return null; }
      setRefresco((n) => n + 1);
      router.refresh();
      return d;
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
      return null;
    } finally {
      enVuelo.current = false;
    }
  }

  async function subirArchivo(file: File) {
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") return setError("Tiene que ser el archivo .html que te dio Claude.");
    if (file.size > LANDING_MAX_BYTES) return setError(`El archivo pesa más de ${Math.round(LANDING_MAX_BYTES / 1000)} KB. Las fotos no van adentro del HTML: se suben aparte.`);
    setSubiendo("archivo");
    setInforme(null);
    /* Diseño nuevo: la previa arranca de arriba, no donde quedó la última foto. */
    setMirando(null);
    const turno = ++subida.current;
    const html = await file.text().catch(() => "");
    const d = await pedir({ html }, "POST");
    if (archivo.current) archivo.current.value = "";
    if (!d) { if (subida.current === turno) setSubiendo(null); return; }
    /* El trabajo tarda menos de lo que se tarda en leerlo: los pasos no son
       una barra de progreso (sería teatro), son el informe de lo que pasó,
       que aparece de a uno para que se pueda seguir. Mientras aparecen, el
       botón sigue ocupado: si volviera a estar libre antes de terminar de
       contar lo que hizo, parecería que no pasó nada. */
    const pasos = pasosDeLaSubida(d, estado.fotos);
    setSubiendo("revisando");
    setInforme({ pasos, visibles: 0 });
    for (let i = 1; i <= pasos.length; i++) {
      await new Promise((seguir) => window.setTimeout(seguir, 260));
      if (subida.current !== turno) return;
      setInforme({ pasos, visibles: i });
    }
    setSubiendo(null);
  }

  async function subirFoto(clave: string, file: File) {
    if (!file.type.startsWith("image/")) return setError("Eso no es una imagen.");
    if (file.size > MAX_FOTO_MB * 1024 * 1024) return setError(`La imagen no puede pesar más de ${MAX_FOTO_MB} MB. Exportala más chica y probá de nuevo.`);
    setGuardando(clave);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) { setError(d.error ?? "No pudimos subir la imagen."); return; }
      /* Y la previa, que se recarga sola, arranca MIRANDO esta foto en vez de
         arriba de todo: con catorce, volver arriba catorce veces cansa. */
      setMirando(clave);
      await pedir({ foto: { clave, url: d.url } });
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setGuardando(null);
    }
  }

  async function copiar(texto: string, cual: "pedido" | "cambios") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch { setError("No pudimos copiar. Seleccioná el texto a mano."); }
  }

  /**
   * Guardar TODOS los links del paso 5, de una, cuando ella lo pide.
   *
   * ── Por qué con botón y no al salir de cada campo ───────────────────────
   *
   * Porque completar cuatro links es UN trabajo, no cuatro. Antes esto
   * guardaba al perder el foco de cada campo: andaba, pero no se veía.
   * Quedaba un visto chiquito al costado que aparecía y se iba, y la pregunta
   * "¿esto se guardó?" no tenía respuesta en ningún lado de la pantalla.
   *
   * Es distinto de las fotos, que sí se guardan solas: elegir un archivo ya es
   * una acción con final propio —lo elegiste, subió, listo—, y ponerle un
   * Guardar aparte sería pedir dos gestos para una sola cosa.
   *
   * ── Y por qué van todos juntos en un pedido ─────────────────────────────
   *
   * Guardar de a uno obligaba a que cada guardado esperara su turno, porque
   * cada uno manda el mapa entero y dos encimados se pisan. Pasar de campo en
   * campo rápido hacía esperar 100 ms por vez. En un solo pedido eso no existe.
   *
   * Nadie escribe `https://`: escribe `instagram.com/ella`, o pega el correo
   * de contacto. `acomodarEnlace` lo completa —y lo que queda escrito en el
   * campo es exactamente lo que se guarda, para que no haya sorpresa—. Si uno
   * no es una dirección, se marca ESE y no se manda nada: guardar tres de
   * cuatro y no decir cuál faltó es peor que no guardar.
   */
  async function guardarLosLinks() {
    /* Y la previa deja de mirar la última foto: esto no es una foto. */
    setMirando(null);
    const problemas: Record<string, string> = {};
    const acomodados: Record<string, string> = {};
    for (const texto of inv?.linksVacios ?? []) {
      const clave = claveDeLink(texto);
      const { url, error } = acomodarEnlace(enlaces[clave] ?? "");
      problemas[clave] = error ?? "";
      acomodados[clave] = error ? (enlaces[clave] ?? "") : url;
    }
    setLinkMal(problemas);
    setEnlaces((m) => ({ ...m, ...acomodados }));
    if (Object.values(problemas).some(Boolean)) return;

    setGuardandoLinks(true);
    const d = await pedir({ enlaces: acomodados });
    setGuardandoLinks(false);
    if (!d) return;
    setLinksOk(true);
    window.setTimeout(() => setLinksOk(false), 3000);
  }

  /**
   * Borrar la landing entera y volver a la página nuestra.
   *
   * Se pregunta antes porque no se puede deshacer: se van las cinco versiones
   * del archivo y el estado entero. Lo que NO se va —y por eso lo dice el
   * cartel— es la página de secciones, que quedó guardada todo este tiempo.
   */
  async function borrarTodo() {
    setBorrando(true);
    setError(null);
    try {
      const r = await fetch(`/api/digitales/productos/${productoId}/landing`, { method: "DELETE" });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "No se pudo borrar. Probá de nuevo.");
        return;
      }
      /* A la página de secciones, que es lo que la dirección va a mostrar de
         ahora en más. Quedarse acá mostraría la pantalla vacía de "subí tu
         archivo", que es justo lo que ella acaba de decir que no quiere. */
      router.push(`/digitales/productos/${productoId}/pagina`);
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setBorrando(false);
    }
  }

  /* ── Sin plan ─────────────────────────────────────────────────────────── */
  if (!esPago) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-800 panel-oscuro:text-gray-200">
          <Lock className="h-4 w-4" /> Publicar tu propio diseño es de los planes Starter y Pro
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Con tu plan actual tenés la página de venta nuestra, que también vende y no necesita que toques nada.
          Si querés traer una página hecha por vos, es con plan.
        </p>
        <Link href="/digitales/mi-cuenta" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
          Ver los planes <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  /* Ancho completo y dos columnas, igual que el editor de nuestra página:
     lo que se toca a la izquierda, la previa grande y pegada a la derecha.
     Abajo de `lg` se apilan y la previa queda al final.

     `grid-cols-1` y los `min-w-0` no son decoración: sin ellos una columna
     mide lo más ancho que tenga adentro y empuja a la otra afuera de la
     pantalla. Es el mismo cuidado que ya estaba escrito en el editor.

     ⚠️ Y NADA de `items-start`: con eso la columna de la derecha mide lo
     mismo que la previa, y algo pegado (`sticky`) sólo puede viajar adentro
     de su propia caja. O sea que se iba para arriba apenas bajabas y dejaba
     media pantalla vacía. Estirándose hasta el alto de la otra columna, la
     previa te acompaña hasta abajo de todo. */
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {/* ── 1. El pedido para Claude ──────────────────────────────────────── */}
        <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">1. Pedile la página a Claude</p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            Copiá este texto, pegalo en Claude y abajo escribí cómo la querés: colores, estilo, a quién le
            hablás. Ya lleva el nombre y el precio de «{nombre}», y las reglas para que la página nos llegue
            lista para enchufar. Probá las veces que quieras: volver a subirla no te hace perder las fotos.
          </p>
          <div className="mt-3">
            <label htmlFor="pedido" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
              Cómo la querés <span className="font-normal text-gray-400">(colores, tipografía, estilo, a quién le hablás)</span>
            </label>
            <textarea
              id="pedido" value={indicaciones} onChange={(e) => anotar(e.target.value)} maxLength={INDICACIONES_MAX} rows={3}
              placeholder="Cálida y apetitosa, en bordó y crema, con una tipografía con serif para los títulos. Le hablo a mujeres de 30 a 55 que cocinan en casa."
              className={`${CLASE_INPUT} resize-y`}
            />
            <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
              Esto se copia junto con las reglas, así no lo escribís de nuevo cada vez. Queda guardado en este navegador.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copiar(instrucciones, "pedido")}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2.5 text-sm font-bold text-white panel-oscuro:text-gray-900 hover:opacity-90 transition-opacity"
            >
              {copiado === "pedido" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado === "pedido" ? "Copiado" : "Copiar el pedido"}
            </button>
            <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
              Abrir Claude <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-gray-500 panel-oscuro:text-gray-400">Ver el texto</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-gray-50 panel-oscuro:bg-gray-950 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap text-gray-700 panel-oscuro:text-gray-300">{instrucciones}</pre>
          </details>
        </section>

        {/* ── 2. Subir ──────────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">2. Subí el archivo que te dio</p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            El .html, tal como lo bajaste. Le sacamos lo que no puede correr en tu página (programas, contadores
            falsos) y te decimos qué encontró.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Un `<label>` con el input adentro: deshabilitar el input no lo
                apaga a él, así que mientras trabaja le sacamos el clic y el
                hover a mano. */}
            <label
              aria-busy={subiendo !== null}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${
                subiendo
                  ? "pointer-events-none cursor-wait bg-orange-400"
                  : "cursor-pointer bg-orange-600 hover:bg-orange-500"
              }`}
            >
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {subiendo === "archivo"
                ? "Subiendo el archivo…"
                : subiendo === "revisando"
                  ? "Revisándolo…"
                  : version
                    ? "Subir otra versión"
                    : "Elegir el archivo"}
              <input
                ref={archivo} type="file" accept=".html,text/html" className="hidden" disabled={subiendo !== null}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirArchivo(f); }}
              />
            </label>
            {version && (
              <span className="text-xs text-gray-500 panel-oscuro:text-gray-400">
                Última: {new Date(version.cuando).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {Math.round(version.bytes / 1000)} KB
              </span>
            )}
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
          {informe && (
            <ol className="mt-4 space-y-2.5 border-t border-gray-100 panel-oscuro:border-gray-800 pt-4">
              {informe.pasos.map((paso, i) => (
                <li
                  key={paso.titulo}
                  aria-hidden={i >= informe.visibles}
                  className={`flex gap-2.5 transition-opacity duration-500 ${i < informe.visibles ? "opacity-100" : "opacity-0"}`}
                >
                  <span className="mt-0.5 shrink-0">
                    {paso.estado === "ok"
                      ? <Check className="h-4 w-4 text-green-600" />
                      : <AlertTriangle className={`h-4 w-4 ${paso.estado === "traba" ? "text-red-600" : "text-amber-600"}`} />}
                  </span>
                  <span className="min-w-0">
                    <span className="text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">{paso.titulo}</span>
                    <span className="block whitespace-pre-line text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">{paso.detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {version && inv && (
          <>
            {/* ── 3. La lista de control ───────────────────────────────── */}
            <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">3. Cómo quedó</p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                <Renglon ok={inv.precio > 0} bien="El precio se pone solo, con el de tu producto" mal="No encontramos dónde va el precio: pedile a Claude que use el hueco del precio" />
                <Renglon ok={inv.comprar > 0} bien={`${inv.comprar} ${inv.comprar === 1 ? "botón lleva" : "botones llevan"} al pago`} mal="Ningún botón lleva al pago: pedile a Claude que marque los botones de comprar" />
                <Renglon
                  ok={fotosFaltan.length === 0}
                  bien={inv.fotos.length ? `Las ${inv.fotos.length} fotos, cargadas` : "No pide fotos"}
                  mal={`Faltan ${fotosFaltan.length} de ${inv.fotos.length} fotos`}
                />
                <Renglon ok={linksFaltan.length === 0} bien="Los links del pie, completos" mal={`${linksFaltan.length} ${linksFaltan.length === 1 ? "link va" : "links van"} a ninguna parte`} />
                {/* El reloj no es "cuando lo tengas prendido" a secas: la pantalla
                    sabe si lo está. Apagado, la barra del archivo no se muestra,
                    y sin decirlo ella creería que se perdió. */}
                {inv.reloj && (bienvenida.activa
                  ? <Renglon ok bien={`El reloj, adentro de tu diseño: ${bienvenida.minutos} minutos al ${bienvenida.porcentaje}% desde que entran`} mal="" />
                  : (
                    <li className="flex gap-2 text-gray-500 panel-oscuro:text-gray-400">
                      <span aria-hidden="true">•</span>
                      <span>
                        Dejó lugar para el reloj, pero está apagado: esa barra no se muestra.{" "}
                        <Link href={`/digitales/marketing/bienvenida?p=${productoId}`} className="font-semibold text-orange-600 underline-offset-2 hover:underline">Prendelo en Marketing</Link>
                        {" "}y aparece ahí, con tu diseño.
                      </span>
                    </li>
                  ))}
                {(inv.opiniones || inv.avisoVentas) && (
                  <li className="flex gap-2 text-gray-500 panel-oscuro:text-gray-400">
                    <span aria-hidden="true">•</span>
                    <span>
                      Dejó lugar para {[inv.opiniones && "las opiniones", inv.avisoVentas && "el aviso de ventas"].filter(Boolean).join(" y ")}.
                      Eso lo ponemos nosotros, con datos de verdad, cuando lo tengas prendido.
                    </span>
                  </li>
                )}
                {quitadoEnPalabras(version.quitado).map((t) => (
                  <li key={t} className="flex gap-2 text-gray-500 panel-oscuro:text-gray-400"><span aria-hidden="true">•</span><span>{t}</span></li>
                ))}
              </ul>
              {inv.avisos.length > 0 && (
                <div className="mt-3 rounded-2xl bg-amber-50 panel-oscuro:bg-amber-500/10 p-3">
                  {inv.avisos.map((a) => (
                    <p key={a} className="flex gap-2 text-[12.5px] leading-relaxed text-amber-800 panel-oscuro:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{a}</span>
                    </p>
                  ))}
                </div>
              )}
              {inv.imagenesExternas.length > 0 && (
                <p className="mt-3 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Hay {inv.imagenesExternas.length} {inv.imagenesExternas.length === 1 ? "imagen que vive" : "imágenes que viven"} en otro lado
                  (las trajo el archivo). Si las borran de ahí, desaparecen de tu página.
                </p>
              )}
            </section>

            {/* ── Lo que acomodamos solos ──────────────────────────────── */}
            {(inv.arreglos.length > 0 || inv.sueltos.length > 0) && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                  <Wrench className="h-4 w-4 text-green-600" /> Lo que acomodamos solos
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Al sacarle los programas quedan cosas que se ven bien y no funcionan. Esto lo arreglamos al subir,
                  sin tocarte el diseño.
                </p>
                <ul className="mt-3 space-y-2">
                  {inv.arreglos.map((t) => (
                    <li key={t} className="flex gap-2 rounded-2xl bg-green-50 panel-oscuro:bg-green-500/10 p-3 text-[12.5px] leading-relaxed text-green-900 panel-oscuro:text-green-200">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{t}</span>
                    </li>
                  ))}
                  {inv.sueltos.map((t) => (
                    <li key={t} className="flex gap-2 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                      <span aria-hidden="true">•</span> <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── La revisión: qué DICE la página ──────────────────────── */}
            {hallazgos.length > 0 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Lo que le miramos a tu página</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Miramos lo que dice y lo que se puede ver. Claude escribe lo que le pidas, y la página la firmás vos;
                  {" "}decidís vos, salvo lo que diga «hay que arreglarlo».
                </p>
                <ul className="mt-3 space-y-2.5">
                  {hallazgos.map((x) => (
                    <li key={x.que} className={`rounded-2xl p-3 ${x.nivel === "traba" ? "bg-red-50 panel-oscuro:bg-red-500/10" : "bg-amber-50 panel-oscuro:bg-amber-500/10"}`}>
                      <p className={`flex gap-2 text-[13px] font-bold ${x.nivel === "traba" ? "text-red-800 panel-oscuro:text-red-200" : "text-amber-900 panel-oscuro:text-amber-200"}`}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{x.que}{x.nivel === "traba" ? " Hay que arreglarlo." : ""}</span>
                      </p>
                      {x.arreglo && <p className="mt-1 pl-5 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">{x.arreglo}</p>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-gray-400">
                  Miramos palabras y CSS, no entendemos tu texto: puede saltar de más o pasarle algo por alto. La última palabra es tuya.
                </p>
              </section>
            )}

            {/* ── Devolvérselo a Claude ────────────────────────────────── */}
            {cambios && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">¿Querés que lo arregle Claude?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Armamos el mensaje con todo lo que te marcamos, escrito para él y con el hueco exacto que tiene
                  que usar. Copialo, pegalo en la misma conversación donde te hizo la página y subí el archivo
                  nuevo acá arriba: tus fotos y tus links no se pierden.
                </p>
                <button
                  type="button"
                  onClick={() => void copiar(cambios, "cambios")}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2.5 text-sm font-bold text-white panel-oscuro:text-gray-900 hover:opacity-90 transition-opacity"
                >
                  {copiado === "cambios" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiado === "cambios" ? "Copiado" : "Copiar los cambios"}
                </button>
                <details className="mt-3">
                  <summary className="cursor-pointer text-[12.5px] font-semibold text-gray-500 panel-oscuro:text-gray-400">Ver el texto</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-gray-50 panel-oscuro:bg-gray-950 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap text-gray-700 panel-oscuro:text-gray-300">{cambios}</pre>
                </details>
              </section>
            )}

            {/* ── 4. Las fotos ─────────────────────────────────────────── */}
            {/* ⚠️ Esta sección se muestra SIEMPRE, también sin ningún lugar de
                foto. Antes desaparecía entera y era lo peor que podía pasar:
                quien abría la pantalla no tenía forma de saber si las fotos se
                cargaban en otro lado, si todavía no estaban, o si su archivo
                no tenía. La respuesta hay que darla acá, no esconderla. */}
            <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">4. Tus fotos</p>
              {inv.fotos.length === 0 ? (
                <div className="mt-1 space-y-2 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  <p className="font-semibold text-gray-700 panel-oscuro:text-gray-300">
                    En este archivo no encontramos ningún lugar donde vaya una foto.
                  </p>
                  <p>
                    Las fotos no van adentro del .html: cada lugar tiene que estar marcado, y vos las subís acá. Si tu
                    diseño tiene fotos y no aparecen abajo, puede ser una de dos:
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>
                      <b>Lo subiste antes de que supiéramos leerlos.</b> Lo que ves acá se calcula al subir el archivo y
                      queda guardado con esa versión. Volvé a subir el mismo .html en el paso 2 y aparecen.
                    </li>
                    <li>
                      <b>El archivo no los marca.</b> Copiá el texto del paso 1, pegáselo a Claude y pedile que marque
                      cada foto así: <code className="rounded bg-gray-100 panel-oscuro:bg-gray-800 px-1">{`data-tienda="foto:Portada"`}</code>.
                    </li>
                  </ul>
                </div>
              ) : (
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Una por cada lugar donde va una foto. El nombre es el que ves en la previa, en el cartelito
                  «Falta: …». Quedan guardadas: si mañana subís otra versión del diseño, se ponen solas.
                </p>
              )}
              {inv.fotos.length > 0 && (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {inv.fotos.map((clave) => (
                    <li key={clave} className="flex items-center gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-2">
                      {estado.fotos[clave] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={estado.fotos[clave]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 text-gray-400">
                          <IconoImagen className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold text-gray-800 panel-oscuro:text-gray-200">{enPalabras(clave)}</p>
                        <label className="mt-0.5 inline-flex cursor-pointer items-center gap-1 text-[12px] font-bold text-orange-600 hover:text-orange-500">
                          {guardando === clave ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {estado.fotos[clave] ? "Cambiar" : "Subir"}
                          <input
                            type="file" accept="image/*" className="hidden" disabled={guardando !== null}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirFoto(clave, f); }}
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── 5. Los links del pie ─────────────────────────────────── */}
            {inv.linksVacios.length > 0 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">5. Los links que quedaron sueltos</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Pegá a dónde lleva cada uno. Los que dejes vacíos no se van a poder tocar. No hace falta
                  escribir el <code className="rounded bg-gray-100 panel-oscuro:bg-gray-800 px-1">https://</code>:
                  ponelo como te lo copia el navegador y lo acomodamos. También vale un correo o un teléfono.
                </p>
                <ul className="mt-3 space-y-2">
                  {inv.linksVacios.map((texto) => {
                    const clave = claveDeLink(texto);
                    const mal = linkMal[clave];
                    return (
                      <li key={clave} className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <span className="truncate text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300 sm:mt-2.5">{texto}</span>
                        <div className="min-w-0">
                          <div className="relative">
                            <input
                              value={enlaces[clave] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEnlaces((m) => ({ ...m, [clave]: v }));
                                if (mal) setLinkMal((m) => ({ ...m, [clave]: "" }));
                              }}
                              /* Enter guarda todo, igual que el botón: en el
                                 celular el teclado tapa la mitad de la pantalla
                                 y bajar hasta el botón es un viaje. */
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); void guardarLosLinks(); } }}
                              disabled={guardandoLinks}
                              inputMode="url"
                              autoComplete="off"
                              spellCheck={false}
                              aria-label={`A dónde lleva "${texto}"`}
                              aria-invalid={!!mal}
                              placeholder={ejemploDeLink(texto)}
                              className={`${CLASE_INPUT} pr-9 ${mal ? "border-red-300 panel-oscuro:border-red-800 focus:border-red-400 focus:ring-red-100" : ""}`}
                            />
                          </div>
                          {mal ? (
                            <p role="alert" className="mt-1 text-[12px] font-medium text-red-600">{mal}</p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* El botón vive acá abajo y no arriba: es el final del paso.
                    Apagado mientras no haya nada distinto que guardar, así el
                    propio botón contesta "¿me quedó algo sin guardar?" sin que
                    haya que acordarse. */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 panel-oscuro:border-gray-800 pt-4">
                  {linksOk && !sinGuardar ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-green-700 panel-oscuro:text-green-400">
                      <Check className="h-4 w-4" /> Guardado
                    </span>
                  ) : sinGuardar ? (
                    <span className="text-[12.5px] text-amber-700 panel-oscuro:text-amber-300">Te falta guardar</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void guardarLosLinks()}
                    disabled={!sinGuardar || guardandoLinks}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 panel-oscuro:disabled:bg-gray-800 panel-oscuro:disabled:text-gray-600"
                  >
                    {guardandoLinks ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : "Guardar los links"}
                  </button>
                </div>
              </section>
            )}

            {/* ── 6. Prender ───────────────────────────────────────────── */}
            <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{estado.activa ? "Está prendida" : "Prenderla"}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                    {estado.activa
                      ? "Quien entra a la dirección de tu producto ve esta página. Apagala y vuelve la nuestra, tal como la tenías."
                      : "Tu dirección va a mostrar esta página en vez de la nuestra. El pago, los cupones y las estadísticas siguen igual."}
                  </p>
                  {trabada && !estado.activa && (
                    <p className="mt-1.5 text-[12.5px] font-semibold text-red-700 panel-oscuro:text-red-300">
                      No se puede prender todavía: mirá lo que está marcado en rojo más arriba.
                    </p>
                  )}
                  {!publicado && <p className="mt-1.5 text-[12.5px] text-amber-700 panel-oscuro:text-amber-300">Ojo: el producto todavía no está publicado, así que la dirección no la ve nadie.</p>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={estado.activa}
                  aria-label="Usar mi propio diseño"
                  disabled={trabada && !estado.activa}
                  title={trabada && !estado.activa ? "Primero arreglá lo que está marcado en rojo" : undefined}
                  onClick={() => { setMirando(null); void pedir({ activa: !estado.activa }); }}
                  className={`mt-0.5 h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${estado.activa ? "bg-orange-600" : "bg-gray-300 panel-oscuro:bg-gray-700"}`}
                >
                  <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${estado.activa ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </section>

            {/* ── Versiones ────────────────────────────────────────────── */}
            {versiones.length > 1 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Lo que fuiste subiendo</p>
                {/* No hay páginas que pasar ni lista que crezca sin fin: al
                    subir una nueva, la más vieja se borra sola. Se dice acá
                    para que no busque la de hace dos semanas. */}
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Guardamos las últimas {LANDING_VERSIONES}. Cuando subís una nueva, la más vieja se borra.
                </p>
                <ul className="mt-3 space-y-2">
                  {versiones.map((v, i) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 px-3 py-2">
                      <span className="text-[12.5px] text-gray-700 panel-oscuro:text-gray-300">
                        {new Date(v.cuando).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {v.titulo ? ` · ${v.titulo}` : ""} · {Math.round(v.bytes / 1000)} KB
                        {/* Dos subidas del mismo archivo se ven idénticas: si
                            volvió a una vieja, esto le dice cuál era la última. */}
                        {i === 0 && v.id !== estado.versionId ? " · la última que subiste" : ""}
                      </span>
                      {v.id === estado.versionId ? (
                        <span className="text-[12px] font-bold text-gray-400">La que estás usando</span>
                      ) : (
                        <button type="button" onClick={() => { setMirando(null); void pedir({ versionId: v.id }); }} className="inline-flex items-center gap-1 text-[12px] font-bold text-orange-600 hover:text-orange-500">
                          <RotateCcw className="h-3 w-3" /> Volver a esta
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Borrar todo ──────────────────────────────────────────────
                Al final, apartado del resto y en letra chica: es la salida, no
                una opción más. Antes no existía — se podía apagar, pero no
                deshacer: el archivo y las versiones quedaban guardados para
                siempre y la pantalla seguía mostrando todo como si el diseño
                propio siguiera siendo el plan. */}
            <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
              {!vaABorrar ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">¿No querés usar tu propio diseño?</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                      Podés borrar todo lo que subiste y quedarte con nuestra página, que está intacta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVaABorrar(true)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-red-300 hover:text-red-700 panel-oscuro:hover:border-red-800 panel-oscuro:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" /> Borrar mi diseño
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-200 panel-oscuro:border-red-900/50 bg-red-50 panel-oscuro:bg-red-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-red-800 panel-oscuro:text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> Esto no se puede deshacer
                  </p>
                  {/* Qué se lleva y qué no, con números: "borrar todo" no dice
                      nada, y lo que más tranquiliza es enterarse de que la
                      página de secciones sigue ahí. */}
                  <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-red-800 panel-oscuro:text-red-200">
                    <li>· Se borran las {versiones.length === 1 ? "versión que subiste" : `${versiones.length} versiones que subiste`}, y con eso el diseño.</li>
                    <li>· Se borran los lugares de foto que completaste y los links del pie.</li>
                    <li>· <strong className="font-bold">Tu página de secciones queda como está</strong>, y tu dirección vuelve a mostrarla.</li>
                  </ul>
                  <p className="mt-2 text-[12.5px] text-red-700 panel-oscuro:text-red-300">
                    Las fotos que subiste no se borran: siguen en tus archivos por si las usás en otro lado.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void borrarTodo()}
                      disabled={borrando}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                    >
                      {borrando ? <><Loader2 className="h-4 w-4 animate-spin" /> Borrando…</> : <><Trash2 className="h-4 w-4" /> Sí, borrar todo</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaABorrar(false)}
                      disabled={borrando}
                      className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-gray-600 panel-oscuro:text-gray-300 hover:bg-white panel-oscuro:hover:bg-gray-800 disabled:opacity-60"
                    >
                      Mejor no
                    </button>
                  </div>
                </div>
              )}
            </section>

            <ConsejoDeUso>
              El diseño lo hacés en Claude y lo cambiás ahí las veces que quieras: acá sólo se cargan las fotos,
              el precio y los links. Mirala en el celular antes de prenderla — ahí se compra.
            </ConsejoDeUso>
          </>
        )}
      </div>

      {/* ── La previa ────────────────────────────────────────────────────── */}
      <div className="min-w-0">
        <div className="lg:sticky lg:top-4">
          {!(version && inv) ? (
            <div className="grid h-[60vh] place-items-center rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-6 text-center">
              <p className="max-w-xs text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                Acá vas a ver tu página apenas subas el archivo, con tu precio y tus fotos puestos.
              </p>
            </div>
          ) : (
            <>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Así queda</p>
            <div role="tablist" aria-label="Dónde se ve" className="inline-flex rounded-full border border-gray-200 panel-oscuro:border-gray-700 p-0.5">
              {([["pc", Monitor, "Computadora"], ["celular", Smartphone, "Celular"]] as const).map(([clave, Icono, texto]) => (
                <button
                  key={clave} type="button" role="tab" aria-selected={pantalla === clave} onClick={() => setPantalla(clave)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition-colors ${pantalla === clave ? "bg-gray-900 text-white panel-oscuro:bg-gray-100 panel-oscuro:text-gray-900" : "text-gray-500 hover:text-gray-800 panel-oscuro:hover:text-gray-200"}`}
                >
                  <Icono className="h-3.5 w-3.5" /> {texto}
                </button>
              ))}
            </div>
          </div>
          {/* La página de verdad adentro de un marco: el precio y las fotos
              son los que va a ver quien compre. Los huecos sin foto salen
              marcados. */}
          <div className={`overflow-hidden rounded-3xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-100 panel-oscuro:bg-gray-800 ${pantalla === "celular" ? "mx-auto w-full max-w-[380px] p-3" : "p-2"}`}>
            <iframe
              key={`${pantalla}-${refresco}`}
              src={`/p/${productoId}?landing=previa${mirando ? `#hueco=${mirando}` : ""}`}
              title="Vista previa de tu diseño"
              className={`w-full rounded-2xl bg-white ${pantalla === "celular" ? "h-[calc(100vh-11rem)] min-h-[560px]" : "h-[calc(100vh-11rem)] min-h-[520px]"}`}
              /* Deja correr JavaScript —el nuestro: el que hace bajar suave
                 y aparecer al bajar— pero NO le da nuestro origen: adentro del
                 marco no hay cookies ni sesión, y no puede sacar la pestaña de
                 su lugar. Sin esto la previa mentiría: mostraría quieta una
                 página que se mueve. */
              sandbox="allow-scripts"
            />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            Es tu página de verdad, con tu precio y tus fotos. Lo que salga con el borde naranja punteado y un
            cartelito <b>«Falta: …»</b> es un lugar de foto vacío: ese nombre es el que te pide el paso 4.{" "}
            <a href={`/p/${productoId}?landing=previa`} target="_blank" rel="noopener noreferrer" className="font-bold text-orange-600 hover:text-orange-500">Abrirla en grande</a>.
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lo que quiere del diseño, guardado en el navegador ───────────────────
   Es el borrador de un pedido a Claude, no parte de la página: no va a la
   base ni le hace falta una ruta. Se lee con `useSyncExternalStore` y no con
   un efecto que escribe estado, para que el dibujo del servidor (vacío) y el
   del navegador no se peleen: acá el servidor no tiene con qué leerlo. */
const oyentesDelPedido = new Set<() => void>();
function suscribirPedido(avisar: () => void) {
  oyentesDelPedido.add(avisar);
  return () => { oyentesDelPedido.delete(avisar); };
}
function leerPedido(clave: string): string {
  try { return window.localStorage.getItem(clave) ?? ""; } catch { return ""; }
}

function usePedidoGuardado(productoId: string): [string, (v: string) => void] {
  const clave = `pv_landing_pedido_${productoId}`;
  const valor = useSyncExternalStore(suscribirPedido, () => leerPedido(clave), () => "");
  const anotar = useCallback((v: string) => {
    try { window.localStorage.setItem(clave, v); } catch { /* sin almacenamiento se escribe igual, pero no sobrevive a recargar */ }
    oyentesDelPedido.forEach((f) => f());
  }, [clave]);
  return [valor, anotar];
}

function Renglon({ ok, bien, mal }: { ok: boolean; bien: string; mal: string }) {
  return (
    <li className={`flex gap-2 ${ok ? "text-gray-700 panel-oscuro:text-gray-300" : "text-amber-800 panel-oscuro:text-amber-200"}`}>
      {ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span>{ok ? bien : mal}</span>
    </li>
  );
}

/**
 * El ejemplo que va de fondo en cada link, según lo que diga el link.
 *
 * Un mismo "https://…" en los cinco campos no enseña nada; ver
 * `instagram.com/tu-usuario` en el de Instagram sí: se entiende de una que
 * ahí va la dirección del perfil y no el arroba.
 */
function ejemploDeLink(texto: string): string {
  const t = texto.toLowerCase();
  if (/instagram|insta\b/.test(t)) return "instagram.com/tu-usuario";
  if (/facebook/.test(t)) return "facebook.com/tu-pagina";
  if (/tiktok/.test(t)) return "tiktok.com/@tu-usuario";
  if (/youtube/.test(t)) return "youtube.com/@tu-canal";
  if (/whatsapp|wpp/.test(t)) return "+54 9 11 2345-6789";
  if (/contacto|correo|mail|escrib|consulta|soporte|ayuda/.test(t)) return "hola@tutienda.com";
  return "tutienda.com/la-pagina";
}

/** "portada-del-ebook" → "Portada del ebook". */
function enPalabras(clave: string): string {
  const t = clave.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** El recibo de lo que se sacó, en castellano. Nada si no se sacó nada. */
function quitadoEnPalabras(q: QuitadoDeLanding): string[] {
  const t: string[] = [];
  if (q.scripts) t.push(`Le sacamos ${q.scripts === 1 ? "un programa" : `${q.scripts} programas`} que traía adentro: en tu página no puede correr código de otro lado.`);
  if (q.contadores) t.push("Le sacamos un contador de los que se reinician solos. El nuestro cuenta de verdad y lo ponés desde Marketing.");
  if (q.formularios) t.push(`Le sacamos ${q.formularios === 1 ? "un formulario" : `${q.formularios} formularios`}: los datos de quien compra se piden en el pago.`);
  if (q.marcos) t.push(`Le sacamos ${q.marcos === 1 ? "un video o página incrustada" : `${q.marcos} videos o páginas incrustadas`}.`);
  if (q.imagenesIncrustadas) t.push(`Le sacamos ${q.imagenesIncrustadas === 1 ? "una imagen pegada adentro del archivo" : `${q.imagenesIncrustadas} imágenes pegadas adentro del archivo`}: las fotos se suben acá.`);
  return t;
}

/* ── El informe de la subida ──────────────────────────────────────────────
   Lo que pasó con el archivo, en pasos, sobre lo que contestó el servidor.
   No hay adivinanza: cada paso muestra un número que ya vino calculado. */

type Paso = { titulo: string; detalle: string; estado: "ok" | "aviso" | "traba" };

function pasosDeLaSubida(d: Record<string, unknown>, cargadas: Record<string, string>): Paso[] {
  /* Lo que contesta el servidor se vuelve a leer con los mismos validadores
     que usa la base: en el navegador nada es de fiar por venir de una
     respuesta. */
  const inv = leerInventario(JSON.stringify(d.inventario ?? {}));
  const q = leerQuitado(JSON.stringify(d.quitado ?? {}));
  const bytes = typeof d.bytes === "number" ? d.bytes : 0;
  const titulo = typeof d.titulo === "string" ? d.titulo : "";
  const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

  const sacado = [
    q.scripts && cuenta(q.scripts, "programa", "programas"),
    q.eventos && cuenta(q.eventos, "acción de botón", "acciones de botón"),
    q.contadores && cuenta(q.contadores, "contador", "contadores"),
    q.formularios && cuenta(q.formularios, "formulario", "formularios"),
    q.marcos && cuenta(q.marcos, "video o página incrustada", "videos o páginas incrustadas"),
    q.imagenesIncrustadas && cuenta(q.imagenesIncrustadas, "imagen pegada adentro", "imágenes pegadas adentro"),
  ].filter(Boolean).join(", ");

  const enchufes = [
    inv.precio > 0 && "el precio",
    inv.comprar > 0 && cuenta(inv.comprar, "botón de compra", "botones de compra"),
    inv.nombre > 0 && "el nombre",
    inv.fotos.length > 0 && cuenta(inv.fotos.length, "lugar para foto", "lugares para fotos"),
  ].filter(Boolean).join(", ");

  const faltan = inv.fotos.filter((x) => !cargadas[x]).length;
  const trabada = tieneTraba(inv.hallazgos);

  return [
    {
      estado: "ok",
      titulo: "Leímos tu archivo",
      detalle: `${Math.round(bytes / 1000)} KB${titulo ? ` · «${titulo}»` : ""}`,
    },
    {
      estado: "ok",
      titulo: "Le sacamos lo que no puede correr acá",
      detalle: sacado || "No traía nada para sacar.",
    },
    {
      estado: inv.comprar > 0 ? (inv.precio > 0 ? "ok" : "aviso") : "traba",
      titulo: "Buscamos los enchufes",
      detalle: enchufes ? `Encontramos ${enchufes}.` : "No encontramos ninguno: hay que pedírselos a Claude.",
    },
    {
      estado: "ok",
      titulo: "Acomodamos lo que quedó suelto",
      detalle: inv.arreglos.length ? `${cuenta(inv.arreglos.length, "cosa acomodada", "cosas acomodadas")}, acá abajo.` : "No hizo falta: entró derecho.",
    },
    {
      estado: trabada ? "traba" : inv.hallazgos.length ? "aviso" : "ok",
      titulo: "Revisamos lo que dice y lo que se ve",
      detalle: inv.hallazgos.length ? `${cuenta(inv.hallazgos.length, "cosa", "cosas")} para mirar, acá abajo.` : "Nada que marcarte.",
    },
    trabada
      ? { estado: "traba", titulo: "Todavía no se puede prender", detalle: "Mirá lo que está en rojo, arreglalo y volvé a subirla." }
      : {
        estado: faltan ? "aviso" : "ok",
        titulo: "Lista para mirar",
        detalle: faltan
          ? `Te ${faltan === 1 ? "falta 1 foto" : `faltan ${faltan} fotos`}. Cargalas acá abajo y mirala en la previa.`
          : "Mirala en la previa de al lado y prendela cuando te guste.",
      },
  ];
}
