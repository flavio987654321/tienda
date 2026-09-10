"use client";

import { useState } from "react";
import { Search, Download, Smartphone, Monitor, Loader2, ExternalLink } from "lucide-react";
import type { VideoDeStock } from "@/lib/videos-pexels";

/**
 * Videos de stock para los reels.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA DESCARGA NO PASA POR NUESTRO SERVIDOR, Y ESO ES EL DISEÑO ENTERO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un video son entre 5 y 20 MB, y en pantalla hay dos docenas. Si la descarga
 * fuera por una ruta nuestra, cada "Descargar" sería ancho de banda nuestro —
 * el mismo problema que ya nos costó plata con el egress del depósito.
 *
 * La otra salida obvia, un `<a href>` al CDN de Pexels, no sirve: el atributo
 * `download` **no funciona entre dominios**, así que el video se abriría en una
 * pestaña y la persona tendría que guardarlo a mano desde el reproductor. En un
 * celular eso es directamente no poder bajarlo.
 *
 * La salida es que el NAVEGADOR baje el archivo y lo guarde él. Se puede porque
 * el CDN de Pexels manda `access-control-allow-origin: *` —comprobado el
 * 10/09/26 con un pedido de rango: contesta 206 con esa cabecera—, así que
 * `fetch` puede leer los bytes, armar un blob y disparar la descarga con nombre
 * propio. Los megas viajan de Pexels a la persona y no nos tocan.
 *
 * ⚠️ Si algún día Pexels saca esa cabecera, esto deja de funcionar EN SILENCIO:
 * el `fetch` falla y no baja nada. Por eso hay un plan B explícito —abrir el
 * video en una pestaña— y no un `catch` vacío.
 */
export default function ReelsClient({
  busquedaInicial,
  deQueProducto,
  videosIniciales,
  totalInicial,
  sinClave,
  sinCupo,
}: {
  /**
   * Con qué se busca al entrar, sin que nadie escriba nada.
   *
   * Sale del producto que ya está cargado, igual que la frase con la que se
   * busca la foto de un capítulo. Es la diferencia entre entrar y ver material
   * de lo tuyo, o entrar y ver un campo de texto vacío.
   */
  busquedaInicial: string;
  /** De qué producto salió, para poder decirlo. Vacío si no había ninguno. */
  deQueProducto: string;
  /** La primera búsqueda, ya hecha en el servidor. Ver el comentario de `page`. */
  videosIniciales: VideoDeStock[];
  totalInicial: number;
  sinClave: boolean;
  sinCupo: boolean;
}) {
  const [texto, setTexto] = useState(busquedaInicial);
  const [vertical, setVertical] = useState(true);
  const [videos, setVideos] = useState<VideoDeStock[]>(videosIniciales);
  const [total, setTotal] = useState<number | null>(videosIniciales.length > 0 ? totalInicial : null);
  const [buscando, setBuscando] = useState(false);
  /* El aviso de la primera pantalla se decide en el servidor y con las mismas
     palabras que el de después: los tres casos —sin clave, sin cupo, sin
     resultados— se arreglan de tres formas distintas y hay que poder decir cuál
     es. Ver `buscar`, más abajo, que repite exactamente este criterio. */
  const [aviso, setAviso] = useState<string | null>(
    sinClave ? "Esta instalación todavía no tiene conectado el banco de videos."
      : sinCupo ? "El banco de videos está al tope por ahora. Probá en un rato: no es tu búsqueda."
        : busquedaInicial && videosIniciales.length === 0
          ? `No encontramos videos de "${busquedaInicial}". Probá con menos palabras.`
          : null,
  );
  const [bajando, setBajando] = useState<string | null>(null);

  async function buscar(consulta: string, alto: boolean) {
    if (!consulta.trim()) return;
    setBuscando(true);
    setAviso(null);
    try {
      const r = await fetch(
        `/api/digitales/marketing/videos?q=${encodeURIComponent(consulta)}&formato=${alto ? "alto" : "ancho"}`,
      );
      const j = await r.json();
      if (!r.ok) {
        setAviso(j?.error ?? "No se pudo buscar. Probá de nuevo en un rato.");
        setVideos([]);
        setTotal(null);
        return;
      }
      /* ⚠️ Los tres casos se dicen distinto. "No hay videos de eso" se arregla
         cambiando las palabras; el tope y la falta de clave, no — y decirle a
         alguien que cambie las palabras cuando el problema es el tope lo deja
         reescribiendo la búsqueda veinte minutos al pedo. */
      if (j.sinClave) setAviso("Esta instalación todavía no tiene conectado el banco de videos.");
      else if (j.sinCupo) setAviso("El banco de videos está al tope por ahora. Probá en un rato: no es tu búsqueda.");
      else if ((j.videos?.length ?? 0) === 0) setAviso(`No encontramos videos de "${consulta}". Probá con menos palabras.`);
      setVideos(j.videos ?? []);
      setTotal(typeof j.total === "number" ? j.total : null);
    } catch {
      setAviso("Se cortó la búsqueda. Probá de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  async function descargar(v: VideoDeStock) {
    setBajando(v.id);
    try {
      const res = await fetch(v.archivo);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      /* El nombre importa: "video-8470297.mp4" en la carpeta de descargas se
         encuentra; el nombre que trae el CDN es una ristra de números. */
      a.download = `reel-${v.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      /* Sin esto el blob se queda en memoria hasta que se cierre la pestaña, y
         son 12 MB por video bajado. */
      URL.revokeObjectURL(url);
    } catch {
      /* El plan B, dicho: se abre en una pestaña para guardarlo a mano. Es peor
         que la descarga directa, pero es muchísimo mejor que un botón que no
         hace nada. */
      setAviso("No se pudo bajar acá. Se abrió en otra pestaña: guardalo desde ahí.");
      window.open(v.archivo, "_blank", "noopener,noreferrer");
    } finally {
      setBajando(null);
    }
  }

  return (
    <div>
      {/* ── La búsqueda ──────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => { e.preventDefault(); buscar(texto, vertical); }}
        className="rounded-2xl border border-gray-200 bg-white p-3 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Qué querés mostrar: pan casero, taller mecánico…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-orange-400 panel-oscuro:border-gray-700 panel-oscuro:bg-gray-800 panel-oscuro:text-gray-100"
            />
          </div>

          {/* ⚠️ Vertical primero y elegido de fábrica: un reel es vertical. Lo
              apaisado está porque el mismo material sirve para una publicación
              o un anuncio, que no lo son. */}
          <div className="flex rounded-xl border border-gray-200 p-0.5 panel-oscuro:border-gray-700">
            {([[true, "Vertical", Smartphone], [false, "Horizontal", Monitor]] as const).map(
              ([alto, nombre, Icono]) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => { setVertical(alto); if (videos.length > 0 || total !== null) buscar(texto, alto); }}
                  aria-pressed={vertical === alto}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold transition-colors ${
                    vertical === alto
                      ? "bg-orange-50 text-orange-700 panel-oscuro:bg-orange-500/15 panel-oscuro:text-orange-300"
                      : "text-gray-500 hover:bg-gray-50 panel-oscuro:text-gray-400 panel-oscuro:hover:bg-gray-800"
                  }`}
                >
                  <Icono className="h-4 w-4" />
                  {nombre}
                </button>
              ),
            )}
          </div>

          <button
            type="submit"
            disabled={buscando || !texto.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {deQueProducto && (
          <p className="mt-2 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
            Lo llenamos con lo que vende <strong className="font-bold">{deQueProducto}</strong>. Cambialo por lo que quieras mostrar.
          </p>
        )}
      </form>

      {aviso && (
        <p className="mt-3 rounded-xl bg-orange-50 px-4 py-3 text-[12.5px] leading-snug text-orange-800 panel-oscuro:bg-orange-500/10 panel-oscuro:text-orange-200">
          {aviso}
        </p>
      )}

      {total !== null && videos.length > 0 && (
        <p className="mt-4 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
          {total.toLocaleString("es-AR")} videos en el banco · te mostramos los primeros {videos.length}
        </p>
      )}

      {/* ── La grilla ────────────────────────────────────────────────────── */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {videos.map((v) => (
          <div
            key={v.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white panel-oscuro:border-gray-700 panel-oscuro:bg-gray-900"
          >
            <div className="relative bg-gray-100 panel-oscuro:bg-gray-800" style={{ aspectRatio: vertical ? "9 / 16" : "16 / 9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.portada} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                {Math.floor(v.duracion / 60)}:{String(v.duracion % 60).padStart(2, "0")}
              </span>
            </div>

            <div className="p-2">
              {/* ⚠️ EL CRÉDITO NO ES UN ADORNO: las reglas de la API de Pexels
                  piden acreditar a quien filmó y un enlace visible a Pexels. Es
                  la misma condición que obliga a la hoja de créditos del ebook.
                  Sin esto estaríamos usando su API afuera de sus condiciones. */}
              <a
                href={v.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-orange-600 panel-oscuro:text-gray-400"
              >
                <span className="truncate">{v.fotografo}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>

              <button
                type="button"
                onClick={() => descargar(v)}
                disabled={bajando === v.id}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-60 panel-oscuro:bg-gray-800 panel-oscuro:text-gray-200 panel-oscuro:hover:bg-gray-700"
              >
                {bajando === v.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />}
                {v.alto >= 1080 ? "1080p" : `${v.alto}p`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {videos.length > 0 && (
        <p className="mt-6 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Los videos son de <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">Pexels</a> y
          se pueden usar gratis, también en avisos pagos. Acreditar a quien filmó no es obligatorio, pero se agradece y no cuesta nada.
        </p>
      )}
    </div>
  );
}
