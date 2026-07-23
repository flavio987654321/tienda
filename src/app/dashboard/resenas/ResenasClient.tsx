"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Trash2, Package, Store, Clock, Search, ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  verified: boolean;
  verifiedBy: string | null;
  createdAt: string;
  /** "APPROVED" | "PENDING" | "REJECTED". Solo las de tienda salen de APPROVED. */
  status: string;
  /** `null` = habla de la tienda entera, no de un producto. */
  product: { id: string; name: string; image: string | null } | null;
};

/** Cuántas se muestran por página en el panel. */
const POR_PAGINA = 20;

export default function ResenasClient({
  initialReviews,
  slug,
  aceptaResenaTienda,
}: {
  initialReviews: Review[];
  slug: string;
  /** ¿El diseño puesto dibuja el formulario de reseñas de tienda? */
  aceptaResenaTienda: boolean;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [moderando, setModerando] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "verified" | 1 | 2 | 3 | 4 | 5>("all");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  // Las dos listas son cosas distintas y no se pueden mezclar en un promedio:
  // "me encantó el pantalón" y "la atención fue mala" no se suman para sacar un
  // número que sirva para decidir algo.
  const deProducto = reviews.filter(r => r.product);
  const deTienda   = reviews.filter(r => !r.product);
  const pendientes = deTienda.filter(r => r.status === "PENDING");
  const rechazadas = deTienda.filter(r => r.status === "REJECTED");

  // Si hay algo esperando, se abre ahí. Es lo único de esta pantalla que pide una
  // decisión: abrirla en la otra pestaña sería esconder el trabajo pendiente.
  const [tab, setTab] = useState<"producto" | "tienda">(
    pendientes.length > 0 ? "tienda" : "producto"
  );

  async function handleDelete(reviewId: string) {
    if (deleting || verifying) return;
    if (!confirm("¿Eliminar esta reseña? Esta acción no se puede deshacer.")) return;
    setDeleting(reviewId);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (res.ok) {
        setReviews(r => r.filter(x => x.id !== reviewId));
      } else {
        alert("No se pudo eliminar la reseña. Intentá de nuevo.");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleVerify(reviewId: string, currentVerified: boolean) {
    if (deleting || verifying) return;
    setVerifying(reviewId);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, verified: !currentVerified }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(r =>
          r.map(x =>
            x.id === reviewId
              ? { ...x, verified: data.review.verified, verifiedBy: data.review.verifiedBy }
              : x
          )
        );
      } else {
        alert("No se pudo actualizar la verificación. Intentá de nuevo.");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally {
      setVerifying(null);
    }
  }

  async function handleEstado(reviewId: string, status: "APPROVED" | "REJECTED") {
    if (deleting || verifying || moderando) return;
    setModerando(reviewId);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(r => r.map(x => (x.id === reviewId ? { ...x, status: data.review.status } : x)));
      } else {
        alert("No se pudo actualizar. Intentá de nuevo.");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally {
      setModerando(null);
    }
  }

  // Todo lo de abajo mira SOLO la pestaña abierta. Un promedio que mezcla los dos
  // tipos no le dice nada al dueño: no sabe si tiene que mejorar un producto o la
  // forma en que atiende.
  const delTab = tab === "producto" ? deProducto : deTienda;
  // Las pendientes y las rechazadas no están publicadas, así que no cuentan para
  // el promedio ni aparecen en la lista de abajo: viven en la cola de arriba.
  const publicadas = delTab.filter(r => r.status === "APPROVED");

  const filtered =
    filter === "all"      ? publicadas
    : filter === "verified" ? publicadas.filter(r => r.verified)
    : publicadas.filter(r => r.rating === filter);

  const avgRating = publicadas.length
    ? publicadas.reduce((s, r) => s + r.rating, 0) / publicadas.length
    : 0;
  const verifiedCount = publicadas.filter(r => r.verified).length;

  // Busca en las tres cosas por las que uno se acuerda de una reseña: quién la
  // escribió, qué producto era, y alguna palabra de lo que decía.
  const q = busqueda.trim().toLowerCase();
  const buscadas = q
    ? filtered.filter(r =>
        r.reviewer.toLowerCase().includes(q) ||
        (r.comment?.toLowerCase().includes(q) ?? false) ||
        (r.product?.name.toLowerCase().includes(q) ?? false)
      )
    : filtered;

  const totalPaginas = Math.max(1, Math.ceil(buscadas.length / POR_PAGINA));
  // La página se acota al calcular y no con un efecto. Si estabas en la 5 y
  // filtrás hasta que quedan 3 reseñas, sin esto verías una lista vacía sin
  // entender por qué: hay resultados, pero en una página que ya no existe.
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPantalla = buscadas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  return (
    <div>
      {/* Pestañas: lo mismo que ve la clienta en la tienda, del lado de acá. */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {([
          { key: "producto" as const, label: "Los productos", n: deProducto.length, icon: <Package className="w-4 h-4" /> },
          { key: "tienda"   as const, label: "La tienda",     n: deTienda.length,   icon: <Store className="w-4 h-4" /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setFilter("all"); setBusqueda(""); setPagina(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
            <span className="text-xs font-normal text-gray-400">({t.n})</span>
            {/* El numerito solo en la de tienda: es la única que tiene cola. */}
            {t.key === "tienda" && pendientes.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendientes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Qué es cada pestaña. Sin esto, "La tienda" con 0 parece un error. */}
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        {tab === "producto"
          ? "Opiniones sobre un producto puntual. Se publican solas: están atadas a algo concreto y le sirven a quien está por comprar ese producto."
          : "Opiniones sobre tu tienda en general — la atención, el envío, la experiencia. Se dejan desde tu portada y no apuntan a ningún producto, así que las revisás vos antes de que se publiquen."}
      </p>

      {/* Si el diseño puesto no dibuja el formulario, se dice. Sin esto, el dueño
          ve una pestaña vacía esperando reseñas que nadie puede escribirle, y no
          hay forma de que se entere salvo esperando para siempre. */}
      {tab === "tienda" && !aceptaResenaTienda && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Tu diseño actual todavía no tiene el formulario</strong> para que te dejen
            opiniones sobre la tienda, así que por ahora esta pestaña no va a recibir nada.
            Las reseñas de tus productos siguen funcionando normal.
          </p>
        </div>
      )}

      {/* ── Cola de aprobación ── */}
      {tab === "tienda" && pendientes.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900">
              Esperando tu aprobación ({pendientes.length})
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {pendientes.map(r => (
              <div key={r.id} className="bg-amber-50/50 rounded-xl border border-amber-200 p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{r.reviewer}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                  </span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Compró en tu tienda
                    </span>
                  )}
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">&ldquo;{r.comment}&rdquo;</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleEstado(r.id, "APPROVED")}
                    disabled={!!moderando || !!deleting || !!verifying}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  >
                    Publicar en mi tienda
                  </button>
                  <button
                    onClick={() => handleEstado(r.id, "REJECTED")}
                    disabled={!!moderando || !!deleting || !!verifying}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    No publicar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            &ldquo;No publicar&rdquo; no la borra: queda guardada y la podés publicar más adelante si cambiás de idea.
          </p>
        </div>
      )}

      {/* Rechazadas, para que no queden invisibles */}
      {tab === "tienda" && rechazadas.length > 0 && (
        <details className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
          <summary className="text-xs font-semibold text-gray-600 cursor-pointer">
            {rechazadas.length} que decidiste no publicar
          </summary>
          <div className="flex flex-col gap-2 mt-3">
            {rechazadas.map(r => (
              <div key={r.id} className="flex items-start gap-3 text-xs text-gray-500 border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-600 flex-shrink-0">{r.rating}★ {r.reviewer}</span>
                <span className="flex-1">{r.comment}</span>
                <button
                  onClick={() => handleEstado(r.id, "APPROVED")}
                  disabled={!!moderando}
                  className="flex-shrink-0 text-indigo-600 font-semibold hover:underline disabled:opacity-40"
                >
                  Publicar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {/* Los números son de la pestaña abierta, y el título lo dice. Un
              "Total reseñas: 31" que mezcla productos con atención no le sirve
              para decidir nada: no sabe qué tiene que mejorar. */}
          <p className="text-xs text-gray-400 mb-1">
            {tab === "producto" ? "Sobre productos" : "Sobre la tienda"}
          </p>
          <p className="text-2xl font-bold text-gray-900">{publicadas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Promedio</p>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">5 estrellas</p>
          <p className="text-2xl font-bold text-gray-900">{publicadas.filter(r => r.rating === 5).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Compra verificada</p>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-bold text-gray-900">{verifiedCount}</p>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Info verificación */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 mb-0.5">¿Qué es “Compra verificada”?</p>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Una reseña se verifica <strong>automáticamente</strong> cuando el cliente deja su email y coincide con una compra entregada en tu tienda.
            También podés verificarla <strong>manualmente</strong> desde acá para ventas por WhatsApp, efectivo o transferencia.
            El badge “✓ Compra verificada” aparece visible en tu tienda.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          placeholder={tab === "producto" ? "Buscar por persona, producto o texto..." : "Buscar por persona o texto..."}
          className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-400"
        />
        {busqueda && (
          <button
            onClick={() => { setBusqueda(""); setPagina(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
            aria-label="Limpiar búsqueda"
          >×</button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: "all",      label: "Todas" },
          { key: "verified", label: `✓ Verificadas (${verifiedCount})` },
          { key: 5, label: `${"★".repeat(5)} (${publicadas.filter(r => r.rating === 5).length})` },
          { key: 4, label: `${"★".repeat(4)} (${publicadas.filter(r => r.rating === 4).length})` },
          { key: 3, label: `${"★".repeat(3)} (${publicadas.filter(r => r.rating === 3).length})` },
          { key: 2, label: `${"★".repeat(2)} (${publicadas.filter(r => r.rating === 2).length})` },
          { key: 1, label: `${"★".repeat(1)} (${publicadas.filter(r => r.rating === 1).length})` },
        ] as { key: typeof filter; label: string }[]).map(f => (
          <button
            key={String(f.key)}
            onClick={() => { setFilter(f.key); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {buscadas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {q
              ? `No hay ninguna que diga “${busqueda.trim()}”.`
              : publicadas.length > 0
              ? "No hay reseñas con ese filtro."
              : tab === "producto"
                ? "Todavía nadie opinó sobre un producto. Cuando lo hagan, aparece acá — se publican solas."
                : pendientes.length > 0
                  ? "No tenés ninguna publicada todavía: las de arriba están esperando que las apruebes."
                  : "Todavía nadie opinó sobre tu tienda. El formulario está en tu portada, abajo de las reseñas."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {enPantalla.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-xl border p-4 flex gap-4 transition-colors ${
                r.verified ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
              }`}
            >
              {/* Imagen del producto */}
              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 self-start">
                {/* Sin producto es una reseña de la tienda entera: lleva el ícono
                    de local en vez del de paquete, para distinguirlas de un
                    vistazo en una lista que ahora mezcla las dos. */}
                {r.product?.image ? (
                  <Image src={r.product.image} alt={r.product.name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {r.product
                      ? <Package className="w-5 h-5 text-gray-300" />
                      : <Store className="w-5 h-5 text-indigo-300" />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Cabecera: estrellas + nombre + fecha */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{r.reviewer}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                  </span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      {r.verifiedBy === "auto" ? "Compra verificada" : "Verificada por vos"}
                    </span>
                  )}
                </div>

                {/* Comentario */}
                {r.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">&ldquo;{r.comment}&rdquo;</p>
                )}

                {/* De qué habla la reseña */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  {/* El nombre del producto era texto plano: leías una reseña
                      mala y tenías que ir a buscar el producto a mano. Ahora
                      lleva a la ficha, en otra pestaña para no perder el lugar
                      en la lista que venías revisando. */}
                  {r.product
                    ? (
                      <a
                        href={`/tienda/${slug}/producto/${r.product.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-500 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        {r.product.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )
                    : <span className="font-medium text-indigo-500">Sobre la tienda</span>}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {/* Botón verificar / desverificar */}
                <button
                  onClick={() => handleVerify(r.id, r.verified)}
                  disabled={!!deleting || !!verifying}
                  title={r.verified ? "Quitar verificación" : "Marcar como compra real"}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                    r.verified
                      ? "text-emerald-600 hover:text-gray-400 hover:bg-gray-50"
                      : "text-gray-300 hover:text-emerald-600 hover:bg-emerald-50"
                  } ${verifying === r.id ? "animate-pulse" : ""}`}
                >
                  {r.verified
                    ? <ShieldOff className="w-4 h-4" />
                    : <ShieldCheck className="w-4 h-4" />
                  }
                </button>

                {/* Botón eliminar */}
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={!!deleting || !!verifying}
                  title="Eliminar reseña"
                  className={`p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 ${
                    deleting === r.id ? "animate-pulse" : ""
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Paginación. Aparece solo si hay más de una página: unos controles
              que nunca se pueden usar son ruido. */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <p className="text-xs text-gray-400">
                {(paginaSegura - 1) * POR_PAGINA + 1}–{Math.min(paginaSegura * POR_PAGINA, buscadas.length)} de {buscadas.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:border-gray-200"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  {paginaSegura} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:border-gray-200"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
