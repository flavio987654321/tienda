"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Upload, Copy, Check, Monitor, Smartphone, ExternalLink, AlertTriangle, Image as IconoImagen, Lock, RotateCcw,
} from "lucide-react";
import type { EstadoDeLanding, InventarioDeLanding, QuitadoDeLanding } from "@/lib/landing-estado";
import { LANDING_MAX_BYTES } from "@/lib/landing-estado";
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
const MAX_FOTO_MB = 5;

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
 * subió, y marca en rojo los huecos vacíos.
 */
export default function LandingClient({ productoId, nombre, publicado, esPago, estado, versiones, instrucciones }: {
  productoId: string;
  nombre: string;
  publicado: boolean;
  esPago: boolean;
  estado: EstadoDeLanding;
  versiones: VersionEnPantalla[];
  instrucciones: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pantalla, setPantalla] = useState<"pc" | "celular">("pc");
  const [enlaces, setEnlaces] = useState<Record<string, string>>(estado.enlaces);
  const [guardando, setGuardando] = useState<string | null>(null);
  const enVuelo = useRef(false);
  const archivo = useRef<HTMLInputElement>(null);
  /* Cambia con cada guardado: la previa se recarga sola al subir una versión
     o al cambiar una foto. */
  const [refresco, setRefresco] = useState(0);

  const version = versiones.find((v) => v.id === estado.versionId) ?? null;
  const inv = version?.inventario ?? null;
  const fotosFaltan = inv ? inv.fotos.filter((f) => !estado.fotos[f]) : [];
  const linksFaltan = inv ? inv.linksVacios.filter((t) => !enlaces[claveDeLink(t)]) : [];
  const sinGuardar = JSON.stringify(enlaces) !== JSON.stringify(estado.enlaces);
  useAvisoSinGuardar(sinGuardar && !guardando);

  async function pedir(cuerpo: Record<string, unknown>, metodo: "POST" | "PATCH" = "PATCH"): Promise<boolean> {
    if (enVuelo.current) return false;
    enVuelo.current = true;
    setError(null);
    try {
      const r = await fetch(`/api/digitales/productos/${productoId}/landing`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "No se pudo guardar. Probá de nuevo."); return false; }
      setRefresco((n) => n + 1);
      router.refresh();
      return true;
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
      return false;
    } finally {
      enVuelo.current = false;
    }
  }

  async function subirArchivo(file: File) {
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") return setError("Tiene que ser el archivo .html que te dio Claude.");
    if (file.size > LANDING_MAX_BYTES) return setError(`El archivo pesa más de ${Math.round(LANDING_MAX_BYTES / 1000)} KB. Las fotos no van adentro del HTML: se suben aparte.`);
    setSubiendo(true);
    const html = await file.text().catch(() => "");
    await pedir({ html }, "POST");
    setSubiendo(false);
    if (archivo.current) archivo.current.value = "";
  }

  async function subirFoto(clave: string, file: File) {
    if (!file.type.startsWith("image/")) return setError("Eso no es una imagen.");
    if (file.size > MAX_FOTO_MB * 1024 * 1024) return setError(`La imagen no puede pesar más de ${MAX_FOTO_MB} MB.`);
    setGuardando(clave);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) { setError(d.error ?? "No pudimos subir la imagen."); return; }
      await pedir({ foto: { clave, url: d.url } });
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setGuardando(null);
    }
  }

  async function guardarEnlace(texto: string) {
    const clave = claveDeLink(texto);
    setGuardando(clave);
    await pedir({ enlace: { clave, url: enlaces[clave] ?? "" } });
    setGuardando(null);
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

  return (
    <div className="space-y-4">
      {/* ── 1. El pedido para Claude ──────────────────────────────────────── */}
      <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">1. Pedile la página a Claude</p>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Copiá este texto, pegalo en Claude y abajo escribí cómo la querés: colores, estilo, a quién le
          hablás. Ya lleva el nombre y el precio de «{nombre}», y las reglas para que la página nos llegue
          lista para enchufar. Probá las veces que quieras: volver a subirla no te hace perder las fotos.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(instrucciones);
                setCopiado(true);
                window.setTimeout(() => setCopiado(false), 2000);
              } catch { setError("No pudimos copiar. Seleccioná el texto a mano."); }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2.5 text-sm font-bold text-white panel-oscuro:text-gray-900 hover:opacity-90 transition-opacity"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar el pedido"}
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
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors">
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {version ? "Subir otra versión" : "Elegir el archivo"}
            <input
              ref={archivo} type="file" accept=".html,text/html" className="hidden" disabled={subiendo}
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
      </section>

      {version && inv && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_500px] items-start">
          <div className="space-y-4">
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
                {(inv.reloj || inv.opiniones || inv.avisoVentas) && (
                  <li className="flex gap-2 text-gray-500 panel-oscuro:text-gray-400">
                    <span aria-hidden="true">•</span>
                    <span>
                      Dejó lugar para {[inv.reloj && "el reloj", inv.opiniones && "las opiniones", inv.avisoVentas && "el aviso de ventas"].filter(Boolean).join(", ")}.
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

            {/* ── 4. Las fotos ─────────────────────────────────────────── */}
            {inv.fotos.length > 0 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">4. Tus fotos</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Una por cada lugar que dejó Claude. Quedan guardadas: si mañana subís otra versión del diseño, se ponen solas.
                </p>
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
              </section>
            )}

            {/* ── 5. Los links del pie ─────────────────────────────────── */}
            {inv.linksVacios.length > 0 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">5. Los links que quedaron sueltos</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Pegá a dónde lleva cada uno. Los que dejes vacíos no se van a poder tocar.
                </p>
                <ul className="mt-3 space-y-2">
                  {inv.linksVacios.map((texto) => {
                    const clave = claveDeLink(texto);
                    return (
                      <li key={clave} className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                        <span className="truncate text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300">{texto}</span>
                        <input
                          value={enlaces[clave] ?? ""}
                          onChange={(e) => setEnlaces((m) => ({ ...m, [clave]: e.target.value }))}
                          onBlur={() => { if ((enlaces[clave] ?? "") !== (estado.enlaces[clave] ?? "")) void guardarEnlace(texto); }}
                          placeholder="https://…"
                          className={CLASE_INPUT}
                        />
                      </li>
                    );
                  })}
                </ul>
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
                  {!publicado && <p className="mt-1.5 text-[12.5px] text-amber-700 panel-oscuro:text-amber-300">Ojo: el producto todavía no está publicado, así que la dirección no la ve nadie.</p>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={estado.activa}
                  aria-label="Usar mi propio diseño"
                  onClick={() => void pedir({ activa: !estado.activa })}
                  className={`mt-0.5 h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${estado.activa ? "bg-orange-600" : "bg-gray-300 panel-oscuro:bg-gray-700"}`}
                >
                  <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${estado.activa ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </section>

            {/* ── Versiones ────────────────────────────────────────────── */}
            {versiones.length > 1 && (
              <section className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Lo que fuiste subiendo</p>
                <ul className="mt-3 space-y-2">
                  {versiones.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 px-3 py-2">
                      <span className="text-[12.5px] text-gray-700 panel-oscuro:text-gray-300">
                        {new Date(v.cuando).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {v.titulo ? ` · ${v.titulo}` : ""} · {Math.round(v.bytes / 1000)} KB
                      </span>
                      {v.id === estado.versionId ? (
                        <span className="text-[12px] font-bold text-gray-400">La que estás usando</span>
                      ) : (
                        <button type="button" onClick={() => void pedir({ versionId: v.id })} className="inline-flex items-center gap-1 text-[12px] font-bold text-orange-600 hover:text-orange-500">
                          <RotateCcw className="h-3 w-3" /> Volver a esta
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ConsejoDeUso>
              El diseño lo hacés en Claude y lo cambiás ahí las veces que quieras: acá sólo se cargan las fotos,
              el precio y los links. Mirala en el celular antes de prenderla — ahí se compra.
            </ConsejoDeUso>
          </div>

          {/* ── La previa ──────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-4">
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
                src={`/p/${productoId}?landing=previa`}
                title="Vista previa de tu diseño"
                className={`w-full rounded-2xl bg-white ${pantalla === "celular" ? "h-[620px]" : "h-[560px]"}`}
                /* Sin permisos: la previa mira, no hace. */
                sandbox=""
              />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              Es tu página de verdad, con tu precio y tus fotos. Lo que salga marcado en rojo es una foto que falta.{" "}
              <a href={`/p/${productoId}?landing=previa`} target="_blank" rel="noopener noreferrer" className="font-bold text-orange-600 hover:text-orange-500">Abrirla en grande</a>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Renglon({ ok, bien, mal }: { ok: boolean; bien: string; mal: string }) {
  return (
    <li className={`flex gap-2 ${ok ? "text-gray-700 panel-oscuro:text-gray-300" : "text-amber-800 panel-oscuro:text-amber-200"}`}>
      {ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span>{ok ? bien : mal}</span>
    </li>
  );
}

/** "portada-del-ebook" → "Portada del ebook". */
function enPalabras(clave: string): string {
  const t = clave.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** La misma cuenta que hace el servidor: el navegador la necesita para saber qué link ya tiene destino. */
function claveDeLink(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
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
