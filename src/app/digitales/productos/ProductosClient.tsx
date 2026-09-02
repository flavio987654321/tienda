"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Plus, Gift, TrendingUp, BookOpen, Loader2, Pencil, Trash2, AlertTriangle, Image as ImageIcon,
  Eye, EyeOff, X, ArrowUpRight, Upload,
} from "lucide-react";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import {
  COPY_ROL, topeDe, loQueFalta, validarCampos, LARGO_TITULO, LARGO_DESCRIPCION,
  type RolDigital,
} from "@/lib/productos-digitales";
import { MAX_PDF_MB, TIPO_PDF, validarSubida } from "@/lib/subida-digital";

export type ProductoEnPantalla = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  rol: RolDigital;
  padreId: string | null;
  /** La portada. `null` mientras no se suba ninguna. */
  imagen: string | null;
  tieneArchivo: boolean;
  archivoNombre: string | null;
  archivoPeso: number | null;
  publicado: boolean;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const ICONO: Record<RolDigital, React.ElementType> = {
  PRINCIPAL: BookOpen,
  BONO: Gift,
  UPSELL: TrendingUp,
};

const TINTA: Record<RolDigital, { borde: string; fondo: string; texto: string; suave: string }> = {
  PRINCIPAL: { borde: "border-orange-200 panel-oscuro:border-orange-500/30", fondo: "bg-orange-100 panel-oscuro:bg-orange-500/15", texto: "text-orange-600", suave: "bg-orange-50 panel-oscuro:bg-orange-500/10" },
  BONO:      { borde: "border-amber-200 panel-oscuro:border-amber-500/30",  fondo: "bg-amber-100 panel-oscuro:bg-amber-500/15",  texto: "text-amber-600",  suave: "bg-amber-50 panel-oscuro:bg-amber-500/10" },
  UPSELL:    { borde: "border-rose-200 panel-oscuro:border-rose-500/30",   fondo: "bg-rose-100 panel-oscuro:bg-rose-500/15",   texto: "text-rose-600",   suave: "bg-rose-50/40 panel-oscuro:bg-rose-500/10" },
};

type Borrador = {
  id: string | null;
  rol: RolDigital;
  padreId: string | null;
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  imagen: string | null;
};

function borradorNuevo(rol: RolDigital, padreId: string | null): Borrador {
  return { id: null, rol, padreId, name: "", description: "", price: "", comparePrice: "", imagen: null };
}

/** El tope real de `/api/upload`: lo pone la plataforma, no nosotros. */
const MAX_IMAGEN_MB = 4;

/**
 * Lo que la tarjeta y el grupo necesitan de la pantalla.
 *
 * Va como un objeto en vez de ocho props sueltas porque los dos componentes lo
 * pasan hacia abajo tal cual: con props sueltas, agregar una acción obliga a
 * tocar los tres lugares por los que viaja.
 */
type Acciones = {
  tier: TierDigital;
  trabajando: string | null;
  /** El id del producto cuyo archivo se está subiendo, o `null`. */
  subiendoArchivo: string | null;
  setBorrador: (b: Borrador) => void;
  publicar: (p: ProductoEnPantalla, publicado: boolean) => void;
  borrar: (p: ProductoEnPantalla) => void;
  subirArchivo: (p: ProductoEnPantalla, file: File) => void;
  hijosDe: (padreId: string, rol: RolDigital) => ProductoEnPantalla[];
};

/* ⚠️ Tarjeta y Grupo viven ACÁ AFUERA y no adentro de la pantalla.
 *
 * Un componente definido adentro del cuerpo de otro se vuelve a crear en cada
 * dibujo, así que React lo trata como un componente distinto: desmonta y vuelve
 * a montar todo lo que hay abajo en cada tecla que se escribe en el formulario.
 * Acá adentro hay un `<img>` por tarjeta, y eso se ve como un parpadeo de todas
 * las portadas mientras escribís. Mismo motivo que en `configuracion/piezas.tsx`. */

/* ── Una tarjeta, igual para los tres roles ──────────────────────────────── */
function Tarjeta({ p, acc }: { p: ProductoEnPantalla; acc: Acciones }) {
  const Icono = ICONO[p.rol];
  const tinta = TINTA[p.rol];
  const falta = loQueFalta({
    rolDigital: p.rol,
    archivoPath: p.tieneArchivo ? "hay" : null,
    price: p.price,
    name: p.name,
  });
  const ocupado = acc.trabajando === p.id;
  const subiendoEste = acc.subiendoArchivo === p.id;

  return (
    <div className={`rounded-2xl border ${tinta.borde} bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5 shadow-sm`}>
      <div className="flex gap-4">
        {/* La portada si la hay; si no, el ícono del rol. Un cuadro vacío en su
            lugar se lee como que la imagen se rompió. */}
        {p.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen}
            alt=""
            className="w-14 h-14 shrink-0 rounded-xl object-cover border border-gray-100 panel-oscuro:border-gray-800"
          />
        ) : (
          <div className={`w-14 h-14 shrink-0 rounded-xl ${tinta.fondo} flex items-center justify-center`}>
            <Icono className={`h-6 w-6 ${tinta.texto}`} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold text-gray-900 panel-oscuro:text-gray-100 leading-snug break-words">{p.name}</p>
            <span
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                p.publicado
                  ? "bg-emerald-50 panel-oscuro:bg-emerald-500/10 text-emerald-700 panel-oscuro:text-emerald-300 border-emerald-200 panel-oscuro:border-emerald-500/30"
                  : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400 border-gray-200 panel-oscuro:border-gray-700"
              }`}
            >
              {p.publicado ? "Publicado" : "Borrador"}
            </span>
          </div>

          {p.description && (
            <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-1 line-clamp-2 break-words">{p.description}</p>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            {p.rol === "BONO" ? (
              <span className="text-emerald-600 font-black">GRATIS</span>
            ) : (
              <span className="text-gray-900 panel-oscuro:text-gray-100 font-black">{money(p.price)}</span>
            )}
            {p.comparePrice !== null && p.comparePrice > 0 && (
              <span className="text-sm text-gray-400 panel-oscuro:text-gray-500 line-through">{money(p.comparePrice)}</span>
            )}
          </div>

          {/* El aviso va ACÁ adentro y no en un panel de errores aparte: el
              lugar donde se ve el problema tiene que ser el lugar donde se
              arregla. */}
          {falta && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 border border-red-100 panel-oscuro:border-red-500/25 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 panel-oscuro:text-red-300 font-medium">{falta}</p>
            </div>
          )}

          {p.tieneArchivo && p.archivoNombre && (
            <p className="mt-2 text-xs text-gray-400 panel-oscuro:text-gray-500 truncate">
              Archivo: {p.archivoNombre}
              {p.archivoPeso ? ` · ${Math.round(p.archivoPeso / 1024 / 1024 * 10) / 10} MB` : ""}
            </p>
          )}

          {/* ⚠️ El aviso del peso va ANTES de elegir el archivo, no después.
              La competencia abre el explorador directo y no dice el límite hasta
              que ya elegiste: con el caso real que tenemos anotado —una guía de
              46 páginas de 117 MB— eso es esperar la subida entera para que
              falle. Y no dice "máximo 50 MB", que no le indica a nadie qué
              hacer, sino la instrucción que resuelve el problema. */}
          {!p.tieneArchivo && (
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
              PDF de hasta {MAX_PDF_MB} MB. Si te pasás, exportalo en calidad para pantalla.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* La etiqueta ES el botón: un `<input type="file">` no se puede
                disfrazar, así que se esconde y se lo dispara desde acá. */}
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                subiendoEste || ocupado
                  ? "opacity-50 cursor-not-allowed border border-gray-200 panel-oscuro:border-gray-700 text-gray-500"
                  : p.tieneArchivo
                    ? "cursor-pointer border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                    : "cursor-pointer bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {subiendoEste ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {subiendoEste ? "Subiendo…" : p.tieneArchivo ? "Reemplazar PDF" : "Subir PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={subiendoEste || ocupado}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  /* Se limpia el input para que elegir el MISMO archivo dos
                     veces seguidas vuelva a disparar el `onChange`: si el valor
                     no cambia, el navegador no avisa nada. */
                  e.target.value = "";
                  if (file) acc.subirArchivo(p, file);
                }}
              />
            </label>

            <button
              onClick={() =>
                acc.setBorrador({
                  id: p.id,
                  rol: p.rol,
                  padreId: p.padreId,
                  name: p.name,
                  description: p.description ?? "",
                  imagen: p.imagen,
                  price: p.price ? String(p.price) : "",
                  comparePrice: p.comparePrice ? String(p.comparePrice) : "",
                })
              }
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>

            <button
              onClick={() => acc.publicar(p, !p.publicado)}
              disabled={ocupado || (!p.publicado && falta !== null)}
              title={!p.publicado && falta ? falta : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ocupado ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : p.publicado ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {p.publicado ? "Despublicar" : "Publicar"}
            </button>

            <button
              onClick={() => acc.borrar(p)}
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors disabled:opacity-50 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" /> Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Un grupo de hijos (bonos o upsells) de un principal ─────────────────── */
function Grupo({ padre, rol, acc }: { padre: ProductoEnPantalla; rol: "BONO" | "UPSELL"; acc: Acciones }) {
  const items = acc.hijosDe(padre.id, rol);
  const tope = topeDe(acc.tier, rol);
  const lleno = items.length >= tope;
  const tinta = TINTA[rol];

  return (
    <div className={`rounded-2xl border ${tinta.borde} ${tinta.suave} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
            {COPY_ROL[rol].titulo}{" "}
            <span className="text-xs font-medium text-gray-400 panel-oscuro:text-gray-500">
              {items.length} de {tope}
            </span>
          </p>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">{COPY_ROL[rol].bajada}</p>
        </div>

        {lleno ? (
          <Link
            href="/digitales/mi-cuenta"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-orange-600 hover:border-orange-300 transition-colors"
          >
            {tope === 0 ? "Tu plan no los incluye" : "Llegaste al tope"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => acc.setBorrador(borradorNuevo(rol, padre.id))}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:border-gray-300 panel-oscuro:hover:border-gray-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {rol === "BONO" ? "Agregar bono" : "Agregar upsell"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Todavía no cargaste ninguno.</p>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <Tarjeta key={h.id} p={h} acc={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * La pantalla de productos.
 *
 * ── Por qué una sola lista y no tres ─────────────────────────────────────────
 * Un producto, un bono y un upsell son la misma cosa con distinto papel, así que
 * comparten formulario, tarjeta y validación. Tres pantallas serían tres copias
 * que se desincronizan de a una.
 *
 * ── Las dos subidas de esta pantalla son distintas a propósito ───────────────
 * La **portada** pasa por `/api/upload`, o sea por nuestro servidor: una imagen
 * entra cómoda en el cuerpo de un pedido, y así se pueden mirar los BYTES y
 * confirmar que un "image/png" es de verdad un png.
 *
 * El **archivo del producto** no puede hacer eso: un ebook de 30 MB no entra en
 * un pedido. Va derecho a Supabase con un permiso firmado, en tres pasos, y la
 * validación de verdad vive en el bucket. Ver `subirArchivo` más abajo y el
 * porqué largo en `lib/subida-digital`.
 *
 * ── Publicar sigue cerrado hasta que haya archivo ────────────────────────────
 * Lo corta `loQueFalta`, acá y otra vez en el servidor. Un producto publicado sin
 * archivo se puede comprar y no se puede entregar — se cobra la plata y no llega
 * nada. Es el peor final posible de este ecosistema.
 */
export default function ProductosClient({
  tier,
  productos,
}: {
  tier: TierDigital;
  productos: ProductoEnPantalla[];
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  /* Aparte de `subiendo`, que es el de la portada adentro del modal: los dos
     pueden estar prendidos a la vez y son botones distintos. Guarda el ID del
     producto y no un booleano, para prender la tarjeta que corresponde. */
  const [subiendoArchivo, setSubiendoArchivo] = useState<string | null>(null);

  /**
   * El cerrojo del doble clic.
   *
   * `guardando` y `trabajando` son estado, y el estado se ve recién en el
   * siguiente dibujo: dos clics en el mismo cuadro leen los dos el valor viejo,
   * los dos pasan, y salen dos pedidos. El botón apagado llega tarde.
   *
   * Un ref cambia en el acto, así que el segundo clic encuentra la puerta ya
   * cerrada. Importa de verdad acá: dos altas seguidas crean dos productos y
   * gastan dos lugares del plan, y dos borrados dejan el segundo en un 404 que
   * la persona lee como que algo salió mal.
   *
   * Es uno solo para toda la pantalla porque desde acá nunca hay dos cosas
   * legítimas escribiendo a la vez.
   */
  const enVuelo = useRef(false);

  /**
   * La portada, subida por `/api/upload`.
   *
   * Pasa por nuestro servidor a propósito, al revés que el archivo del producto:
   * una imagen entra cómoda en los 4 MB que aguanta el cuerpo de un pedido, y así
   * el servidor puede mirar los BYTES y confirmar que un "image/png" es de verdad
   * un png. El archivo pago no puede hacer eso —pesa demasiado— y por eso va
   * derecho a Supabase con un permiso firmado.
   */
  async function subirImagen(file: File) {
    if (enVuelo.current) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Eso no es una imagen.");
      return;
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      setError(`La imagen no puede pesar más de ${MAX_IMAGEN_MB} MB.`);
      return;
    }
    enVuelo.current = true;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) {
        setError(data.error ?? "No pudimos subir la imagen.");
        return;
      }
      setBorrador((b) => (b ? { ...b, imagen: data.url as string } : b));
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      enVuelo.current = false;
      setSubiendo(false);
    }
  }

  /**
   * El archivo del producto: el PDF que se lleva quien compra.
   *
   * Son tres pasos y **ninguno se puede saltear**:
   *
   *   1. Le pedimos permiso a nuestro servidor. Ahí no viaja el archivo, sólo su
   *      tipo y su tamaño. El servidor elige la ruta —si la eligiera el
   *      navegador podría escribir sobre el archivo de otra cuenta—.
   *   2. Los bytes van DERECHO a Supabase. No pasan por nosotros: un ebook no
   *      entra en el cuerpo de un pedido, que Next corta bastante antes.
   *   3. Recién ahí se confirma, y el servidor va a MIRAR que el archivo esté.
   *
   * El paso 3 no es burocracia. Como el 2 no pasa por nosotros, "ya lo subí" es
   * una afirmación de la parte interesada: sin comprobarla, alcanzaría con
   * llamar a confirmar sin haber subido nada para marcar el producto como
   * entregable, publicarlo y cobrar por un archivo que no existe.
   */
  async function subirArchivo(p: ProductoEnPantalla, file: File) {
    if (enVuelo.current) return;
    setError("");

    /* La MISMA función que usa el servidor. No lo reemplaza —lo que valida el
       navegador no protege nada— pero evita empezar a subir 60 MB para que el
       servidor los rechace al final. */
    const problema = validarSubida({ tipo: file.type, tamano: file.size });
    if (problema) {
      setError(problema);
      return;
    }

    enVuelo.current = true;
    setSubiendoArchivo(p.id);
    try {
      const permisoRes = await fetch("/api/digitales/archivo/firma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: p.id, tipo: file.type, tamano: file.size }),
      });
      const permiso = await permisoRes.json().catch(() => ({}));
      if (!permisoRes.ok || !permiso.urlDeSubida || !permiso.ruta) {
        setError(permiso.error ?? "No pudimos preparar la subida.");
        return;
      }

      const subida = await fetch(permiso.urlDeSubida as string, {
        method: "PUT",
        headers: { "Content-Type": TIPO_PDF },
        body: file,
      });
      if (!subida.ok) {
        /* Supabase contesta con su propio texto. Se registra el crudo y se
           muestra algo que se entienda: la vez pasada, en los videos, un error
           de este paso llegó como "no se pudo" a secas y no había forma de saber
           que el problema era el tope del bucket. */
        console.error("[archivo] Supabase rechazó la subida:", subida.status, await subida.text().catch(() => ""));
        setError("El archivo no se pudo subir. Probá de nuevo.");
        return;
      }

      const cierre = await fetch("/api/digitales/archivo/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: p.id, ruta: permiso.ruta, nombre: file.name }),
      });
      const datos = await cierre.json().catch(() => ({}));
      if (!cierre.ok) {
        setError(datos.error ?? "El archivo subió pero no lo pudimos guardar.");
        return;
      }

      /* El aviso de peso no bloquea nada: el archivo ya está. Se muestra en el
         mismo lugar que los errores porque es lo que la persona está mirando. */
      if (datos.aviso) setError(datos.aviso as string);
      window.location.reload();
    } catch {
      setError("No pudimos subir el archivo. Revisá tu conexión.");
    } finally {
      /* Igual que en el resto de la pantalla: el cerrojo se suelta sólo en los
         caminos que NO recargan. Después de un `reload` no hay nada que soltar,
         y soltarlo antes deja una ventana para el segundo clic. */
      enVuelo.current = false;
      setSubiendoArchivo(null);
    }
  }

  const principales = productos.filter((p) => p.rol === "PRINCIPAL");
  const hijosDe = (padreId: string, rol: RolDigital) =>
    productos.filter((p) => p.padreId === padreId && p.rol === rol);

  /* Lo que la tarjeta y el grupo necesitan de acá. Se arma una vez y se pasa
     hacia abajo: las funciones se declaran en el cuerpo del componente, así que
     memorizarlo no ganaría nada —el objeto cambiaría igual en cada dibujo—. */
  const acc: Acciones = { tier, trabajando, subiendoArchivo, setBorrador, publicar, borrar, subirArchivo, hijosDe };

  const topePrincipales = topeDe(tier, "PRINCIPAL");
  const llegoAlTope = principales.length >= topePrincipales;

  /* La pantalla usa la MISMA función que valida el servidor. No la reemplaza
     —lo que valida el navegador no protege nada— pero dice qué está mal al lado
     del campo en vez de después del viaje.
     El título va como `undefined` mientras esté vacío, que para `validarCampos`
     significa "no vino" y no lo revisa. Antes iba como cadena vacía, así que el
     formulario recién abierto ya te retaba con "el título tiene que tener al
     menos 2 letras" por un campo que todavía no habías tocado. Lo que impide
     guardar vacío es el botón apagado, no un reto. */
  const precioNum = borrador ? Number(borrador.price.replace(",", ".")) : 0;
  const comparaNum = borrador?.comparePrice ? Number(borrador.comparePrice.replace(",", ".")) : null;
  const problema = borrador
    ? validarCampos(
        {
          name: borrador.name.trim() === "" ? undefined : borrador.name.trim(),
          description: borrador.description,
          price: borrador.rol === "BONO" ? 0 : (borrador.price === "" ? undefined : precioNum),
          comparePrice: comparaNum,
        },
        borrador.rol
      )
    : null;
  const puedeGuardar = Boolean(borrador && borrador.name.trim().length >= 2 && !problema && !guardando);

  async function guardar() {
    if (!borrador || !puedeGuardar || enVuelo.current) return;
    enVuelo.current = true;
    setError("");
    setGuardando(true);
    try {
      const cuerpo = {
        rol: borrador.rol,
        padreId: borrador.padreId,
        name: borrador.name.trim(),
        description: borrador.description,
        price: borrador.rol === "BONO" ? 0 : (borrador.price === "" ? 0 : precioNum),
        comparePrice: comparaNum && comparaNum > 0 ? comparaNum : null,
        imagen: borrador.imagen,
      };
      const r = await fetch(
        borrador.id ? `/api/digitales/productos/${borrador.id}` : "/api/digitales/productos",
        {
          method: borrador.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos guardar el producto.");
        enVuelo.current = false;
        setGuardando(false);
        return;
      }
      /* La lista la arma el servidor: recargar es lo único que garantiza que lo
         que se ve sea lo que quedó guardado.
         El cerrojo NO se suelta acá: la página se está yendo, y devolverle el
         botón a alguien durante ese rato es ofrecerle guardar dos veces. */
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  async function publicar(p: ProductoEnPantalla, publicado: boolean) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(p.id);
    try {
      const r = await fetch(`/api/digitales/productos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicado }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos cambiarlo.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  async function borrar(p: ProductoEnPantalla) {
    if (enVuelo.current) return;
    const cuantosHijos = p.rol === "PRINCIPAL"
      ? productos.filter((h) => h.padreId === p.id).length
      : 0;
    const aviso = cuantosHijos > 0
      ? `Se borra "${p.name}" y también sus ${cuantosHijos} bono/upsell. No se puede deshacer.`
      : `Se borra "${p.name}". No se puede deshacer.`;
    // El cerrojo se cierra DESPUÉS de preguntar: si dice que no, no hubo nada
    // en vuelo y la pantalla tiene que seguir respondiendo.
    if (!window.confirm(aviso)) return;

    enVuelo.current = true;
    setTrabajando(p.id);
    try {
      const r = await fetch(`/api/digitales/productos/${p.id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "No pudimos borrarlo.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cuánto usaste de tu plan. Se dice "páginas de venta" y nunca "tiendas":
          la competencia vende tiendas y nosotros no. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
            {principales.length} de {topePrincipales} página{topePrincipales === 1 ? "" : "s"} de venta
          </p>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">Tu plan {COPY_DIGITAL[tier].nombre}</p>
        </div>

        {llegoAlTope ? (
          <Link
            href="/digitales/mi-cuenta"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 text-sm font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-100 transition-colors"
          >
            Llegaste al tope de tu plan
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={() => setBorrador(borradorNuevo("PRINCIPAL", null))}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-200"
          >
            <Plus className="h-4 w-4" /> Crear producto
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-5 py-4">
          <p className="text-sm font-medium text-red-700 panel-oscuro:text-red-300">{error}</p>
        </div>
      )}

      {principales.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-10 text-center shadow-sm">
          <div className="w-14 h-14 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-orange-600" />
          </div>
          <p className="text-gray-900 panel-oscuro:text-gray-100 font-bold text-lg mb-1">Todavía no cargaste ningún producto</p>
          <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Un producto es tu ebook, tu plantilla o tu guía. Después le vas a poder sumar bonos de
            regalo y upsells.
          </p>
          <button
            onClick={() => setBorrador(borradorNuevo("PRINCIPAL", null))}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-200"
          >
            <Plus className="h-4 w-4" /> Crear mi primer producto
          </button>
        </div>
      ) : (
        principales.map((p) => (
          <div key={p.id} className="space-y-3">
            <Tarjeta p={p} acc={acc} />
            <div className="pl-0 sm:pl-8 space-y-3">
              <Grupo padre={p} rol="BONO" acc={acc} />
              <Grupo padre={p} rol="UPSELL" acc={acc} />
            </div>
          </div>
        ))
      )}

      {/* ── El formulario ─────────────────────────────────────────────────── */}
      {borrador && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setBorrador(null)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between">
              <p className="font-black text-gray-900 panel-oscuro:text-gray-100">
                {borrador.id ? "Editar" : `Nuevo ${borrador.rol === "PRINCIPAL" ? "producto" : borrador.rol === "BONO" ? "bono" : "upsell"}`}
              </p>
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 flex items-center justify-center text-gray-500 panel-oscuro:text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* La portada. Va primera porque es lo primero que ve quien entra a
                  la página de venta. */}
              <div className="flex items-start gap-4">
                {borrador.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={borrador.imagen}
                    alt=""
                    className="w-24 h-24 shrink-0 rounded-2xl object-cover border border-gray-200 panel-oscuro:border-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-100 panel-oscuro:bg-gray-800 border border-dashed border-gray-300 panel-oscuro:border-gray-600 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7 text-gray-400 panel-oscuro:text-gray-500" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Portada</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
                    Es la imagen que se ve en tu página de venta. Hasta {MAX_IMAGEN_MB} MB.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors cursor-pointer">
                      {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {subiendo ? "Subiendo..." : borrador.imagen ? "Cambiar" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={subiendo}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          // Se limpia el input para que elegir el MISMO archivo dos
                          // veces seguidas vuelva a disparar el cambio.
                          e.target.value = "";
                          if (f) subirImagen(f);
                        }}
                      />
                    </label>
                    {borrador.imagen && (
                      <button
                        onClick={() => setBorrador({ ...borrador, imagen: null })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Sacar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="titulo" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Título</label>
                <input
                  id="titulo"
                  value={borrador.name}
                  maxLength={LARGO_TITULO}
                  onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
                  placeholder="Guía práctica de mecánica del automotor"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="desc" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Descripción</label>
                <textarea
                  id="desc"
                  value={borrador.description}
                  maxLength={LARGO_DESCRIPCION}
                  rows={5}
                  onChange={(e) => setBorrador({ ...borrador, description: e.target.value })}
                  placeholder="Qué se lleva la persona que lo compra."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-y"
                />
                <p className="text-xs text-gray-400 panel-oscuro:text-gray-500 mt-1.5">
                  Se usa en la página de venta. {borrador.description.length.toLocaleString("es-AR")} / {LARGO_DESCRIPCION.toLocaleString("es-AR")}
                </p>
              </div>

              {/* Un bono va gratis por definición, así que no se le pide precio:
                  un campo apagado que siempre dice 0 sólo confunde. */}
              {borrador.rol === "BONO" ? (
                <div className="rounded-2xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/25 px-4 py-3">
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Un bono va gratis</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">
                    No se cobra: se entrega junto con la compra del producto principal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="precio" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Precio</label>
                    <input
                      id="precio"
                      inputMode="decimal"
                      value={borrador.price}
                      onChange={(e) => setBorrador({ ...borrador, price: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="16990"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="antes" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
                      Precio original <span className="font-normal text-gray-400 panel-oscuro:text-gray-500">(opcional)</span>
                    </label>
                    <input
                      id="antes"
                      inputMode="decimal"
                      value={borrador.comparePrice}
                      onChange={(e) => setBorrador({ ...borrador, comparePrice: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="84950"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {problema && <p className="text-sm text-red-600 font-medium">{problema}</p>}
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-white panel-oscuro:bg-gray-900 border-t border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="px-5 py-3 rounded-2xl text-sm font-bold text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={!puedeGuardar}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
