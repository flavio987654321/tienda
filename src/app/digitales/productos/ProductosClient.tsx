"use client";

import { useRef, useState } from "react";
import {
  Plus, Gift, TrendingUp, BookOpen, Loader2, Pencil, Trash2, AlertTriangle, Image as ImageIcon,
  Eye, EyeOff, X, ArrowUpRight,
} from "lucide-react";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import {
  COPY_ROL, topeDe, loQueFalta, validarCampos, LARGO_TITULO, LARGO_DESCRIPCION,
  type RolDigital,
} from "@/lib/productos-digitales";

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
  PRINCIPAL: { borde: "border-orange-200", fondo: "bg-orange-100", texto: "text-orange-600", suave: "bg-orange-50/40" },
  BONO:      { borde: "border-amber-200",  fondo: "bg-amber-100",  texto: "text-amber-600",  suave: "bg-amber-50/40" },
  UPSELL:    { borde: "border-rose-200",   fondo: "bg-rose-100",   texto: "text-rose-600",   suave: "bg-rose-50/40" },
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
 * La pantalla de productos.
 *
 * ── Por qué una sola lista y no tres ─────────────────────────────────────────
 * Un producto, un bono y un upsell son la misma cosa con distinto papel, así que
 * comparten formulario, tarjeta y validación. Tres pantallas serían tres copias
 * que se desincronizan de a una.
 *
 * ── Qué NO hace todavía ──────────────────────────────────────────────────────
 * Subir el archivo. Y por eso **publicar está bloqueado hasta que exista**: lo
 * corta `loQueFalta`, acá y otra vez en el servidor. Un producto publicado sin
 * archivo se puede comprar y no se puede entregar — se cobra la plata y no llega
 * nada. Es el peor final posible de este ecosistema, así que la puerta queda
 * cerrada hasta que la subida esté hecha de verdad.
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

  const principales = productos.filter((p) => p.rol === "PRINCIPAL");
  const hijosDe = (padreId: string, rol: RolDigital) =>
    productos.filter((p) => p.padreId === padreId && p.rol === rol);

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

  /* ── Una tarjeta, igual para los tres roles ──────────────────────────────── */
  function Tarjeta({ p }: { p: ProductoEnPantalla }) {
    const Icono = ICONO[p.rol];
    const tinta = TINTA[p.rol];
    const falta = loQueFalta({
      rolDigital: p.rol,
      archivoPath: p.tieneArchivo ? "hay" : null,
      price: p.price,
      name: p.name,
    });
    const ocupado = trabajando === p.id;

    return (
      <div className={`rounded-2xl border ${tinta.borde} bg-white p-4 sm:p-5 shadow-sm`}>
        <div className="flex gap-4">
          {/* La portada si la hay; si no, el ícono del rol. Un cuadro vacío en su
              lugar se lee como que la imagen se rompió. */}
          {p.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imagen}
              alt=""
              className="w-14 h-14 shrink-0 rounded-xl object-cover border border-gray-100"
            />
          ) : (
            <div className={`w-14 h-14 shrink-0 rounded-xl ${tinta.fondo} flex items-center justify-center`}>
              <Icono className={`h-6 w-6 ${tinta.texto}`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-gray-900 leading-snug break-words">{p.name}</p>
              <span
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  p.publicado
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}
              >
                {p.publicado ? "Publicado" : "Borrador"}
              </span>
            </div>

            {p.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2 break-words">{p.description}</p>
            )}

            <div className="flex items-baseline gap-2 mt-2">
              {p.rol === "BONO" ? (
                <span className="text-emerald-600 font-black">GRATIS</span>
              ) : (
                <span className="text-gray-900 font-black">{money(p.price)}</span>
              )}
              {p.comparePrice !== null && p.comparePrice > 0 && (
                <span className="text-sm text-gray-400 line-through">{money(p.comparePrice)}</span>
              )}
            </div>

            {/* El aviso va ACÁ adentro y no en un panel de errores aparte: el
                lugar donde se ve el problema tiene que ser el lugar donde se
                arregla. */}
            {falta && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{falta}</p>
              </div>
            )}

            {p.tieneArchivo && p.archivoNombre && (
              <p className="mt-2 text-xs text-gray-400 truncate">
                Archivo: {p.archivoNombre}
                {p.archivoPeso ? ` · ${Math.round(p.archivoPeso / 1024 / 1024 * 10) / 10} MB` : ""}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setBorrador({
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>

              <button
                onClick={() => publicar(p, !p.publicado)}
                disabled={ocupado || (!p.publicado && falta !== null)}
                title={!p.publicado && falta ? falta : undefined}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                onClick={() => borrar(p)}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
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
  function Grupo({ padre, rol }: { padre: ProductoEnPantalla; rol: "BONO" | "UPSELL" }) {
    const items = hijosDe(padre.id, rol);
    const tope = topeDe(tier, rol);
    const lleno = items.length >= tope;
    const tinta = TINTA[rol];

    return (
      <div className={`rounded-2xl border ${tinta.borde} ${tinta.suave} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {COPY_ROL[rol].titulo}{" "}
              <span className="text-xs font-medium text-gray-400">
                {items.length} de {tope}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{COPY_ROL[rol].bajada}</p>
          </div>

          {lleno ? (
            <a
              href="/digitales/mi-cuenta"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-colors"
            >
              {tope === 0 ? "Tu plan no los incluye" : "Llegaste al tope"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              onClick={() => setBorrador(borradorNuevo(rol, padre.id))}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-gray-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {rol === "BONO" ? "Agregar bono" : "Agregar upsell"}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-gray-400">Todavía no cargaste ninguno.</p>
        ) : (
          <div className="space-y-3">
            {items.map((h) => (
              <Tarjeta key={h.id} p={h} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cuánto usaste de tu plan. Se dice "páginas de venta" y nunca "tiendas":
          la competencia vende tiendas y nosotros no. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {principales.length} de {topePrincipales} página{topePrincipales === 1 ? "" : "s"} de venta
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Tu plan {COPY_DIGITAL[tier].nombre}</p>
        </div>

        {llegoAlTope ? (
          <a
            href="/digitales/mi-cuenta"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700 hover:bg-orange-100 transition-colors"
          >
            Llegaste al tope de tu plan
            <ArrowUpRight className="h-4 w-4" />
          </a>
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {principales.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-orange-600" />
          </div>
          <p className="text-gray-900 font-bold text-lg mb-1">Todavía no cargaste ningún producto</p>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
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
            <Tarjeta p={p} />
            <div className="pl-0 sm:pl-8 space-y-3">
              <Grupo padre={p} rol="BONO" />
              <Grupo padre={p} rol="UPSELL" />
            </div>
          </div>
        ))
      )}

      {/* ── El formulario ─────────────────────────────────────────────────── */}
      {borrador && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setBorrador(null)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <p className="font-black text-gray-900">
                {borrador.id ? "Editar" : `Nuevo ${borrador.rol === "PRINCIPAL" ? "producto" : borrador.rol === "BONO" ? "bono" : "upsell"}`}
              </p>
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
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
                    className="w-24 h-24 shrink-0 rounded-2xl object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7 text-gray-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">Portada</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Es la imagen que se ve en tu página de venta. Hasta {MAX_IMAGEN_MB} MB.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
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
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Sacar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="titulo" className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                <input
                  id="titulo"
                  value={borrador.name}
                  maxLength={LARGO_TITULO}
                  onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
                  placeholder="Guía práctica de mecánica del automotor"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="desc" className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción</label>
                <textarea
                  id="desc"
                  value={borrador.description}
                  maxLength={LARGO_DESCRIPCION}
                  rows={5}
                  onChange={(e) => setBorrador({ ...borrador, description: e.target.value })}
                  placeholder="Qué se lleva la persona que lo compra."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-y"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Se usa en la página de venta. {borrador.description.length.toLocaleString("es-AR")} / {LARGO_DESCRIPCION.toLocaleString("es-AR")}
                </p>
              </div>

              {/* Un bono va gratis por definición, así que no se le pide precio:
                  un campo apagado que siempre dice 0 sólo confunde. */}
              {borrador.rol === "BONO" ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-sm font-bold text-gray-900">Un bono va gratis</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No se cobra: se entrega junto con la compra del producto principal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="precio" className="block text-xs font-semibold text-gray-600 mb-1.5">Precio</label>
                    <input
                      id="precio"
                      inputMode="decimal"
                      value={borrador.price}
                      onChange={(e) => setBorrador({ ...borrador, price: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="16990"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="antes" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Precio original <span className="font-normal text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="antes"
                      inputMode="decimal"
                      value={borrador.comparePrice}
                      onChange={(e) => setBorrador({ ...borrador, comparePrice: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="84950"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {problema && <p className="text-sm text-red-600 font-medium">{problema}</p>}
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="px-5 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
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
