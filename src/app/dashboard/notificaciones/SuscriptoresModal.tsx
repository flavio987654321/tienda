"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Loader2, X, Trash2, Clock, UserRound, Search } from "lucide-react";

/**
 * Las dos listas de gente a la que le puede llegar una campaña.
 *
 * Van separadas y no en una sola lista mezclada porque no reciben lo mismo: al
 * seguidor le entra un push en el dispositivo, al suscriptor le entra un mail.
 * Ese es también el motivo de que el número de arriba se muestre desglosado —
 * "6" a secas haría creer que los 6 reciben lo mismo.
 */

type Seguidor = { id: string; nombre: string; imagen: string | null; desde: string };
type Suscriptor = { id: string; email: string; estado: "confirmado" | "pendiente" | "baja"; desde: string };

/**
 * A partir de cuántos en la lista aparece el buscador.
 *
 * Por debajo de esto la lista entra scrolleando de un tirón y buscar es más
 * trabajo que mirar. Está calibrado para que el que recién arranca no vea un
 * campo vacío que no le sirve.
 */
const UMBRAL_BUSCADOR = 15;

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

const ETIQUETA_ESTADO: Record<Suscriptor["estado"], { texto: string; clase: string; ayuda: string }> = {
  confirmado: {
    texto: "Confirmado",
    clase: "bg-emerald-50 text-emerald-600",
    ayuda: "Recibe las campañas.",
  },
  pendiente: {
    // Este es el estado que explica por qué "tengo 20 y le llegó a 12".
    texto: "Sin confirmar",
    clase: "bg-amber-50 text-amber-600",
    ayuda: "Le mandamos el mail de confirmación y todavía no lo tocó. No recibe campañas.",
  },
  baja: {
    texto: "Se dio de baja",
    clase: "bg-gray-100 text-gray-400",
    ayuda: "Pidió no recibir más. No recibe campañas.",
  },
};

export function SuscriptoresModal({ onClose }: { onClose: () => void }) {
  const [seguidores, setSeguidores] = useState<Seguidor[]>([]);
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  // Los totales de la base, que pueden ser mayores que lo que se trajo.
  const [totales, setTotales] = useState<{ seguidores: number; suscriptores: number } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"mail" | "push">("mail");
  const [borrando, setBorrando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/api/newsletter/suscriptores")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!vivo) return;
        setSeguidores(d.seguidores ?? []);
        setSuscriptores(d.suscriptores ?? []);
        setTotales(d.totales ?? null);
        // Se abre en la pestaña que tenga gente. Abrir siempre en "mail" con la
        // lista vacía y 40 seguidores del otro lado haría pensar que no hay nadie.
        if ((d.suscriptores ?? []).length === 0 && (d.seguidores ?? []).length > 0) setPestana("push");
      })
      .catch(() => vivo && setError("No pudimos cargar las listas."))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, []);

  async function darDeBaja(id: string) {
    if (!confirm("Esta persona deja de recibir tus novedades. ¿Seguro?")) return;
    setBorrando(id);
    try {
      const res = await fetch("/api/newsletter/suscriptores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSuscriptores((prev) => prev.map((s) => (s.id === id ? { ...s, estado: "baja" } : s)));
      }
    } finally {
      setBorrando(null);
    }
  }

  const confirmados = suscriptores.filter((s) => s.estado === "confirmado").length;

  // Cuántos quedaron afuera de lo que se trajo, por pestaña. Se mide contra la
  // lista COMPLETA que llegó, no contra la filtrada: buscar no cambia cuánta
  // gente hay.
  const lista = pestana === "mail" ? suscriptores : seguidores;
  const totalDeLaPestana = pestana === "mail" ? totales?.suscriptores : totales?.seguidores;
  const ocultos = totalDeLaPestana != null ? totalDeLaPestana - lista.length : 0;

  const q = busqueda.trim().toLowerCase();
  const suscriptoresVisibles = q ? suscriptores.filter((s) => s.email.toLowerCase().includes(q)) : suscriptores;
  const seguidoresVisibles   = q ? seguidores.filter((f) => f.nombre.toLowerCase().includes(q)) : seguidores;
  const visibles = pestana === "mail" ? suscriptoresVisibles.length : seguidoresVisibles.length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Tu audiencia</p>
            <p className="text-[11px] text-gray-400 mt-0.5">A quiénes les llega una campaña</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3 pb-2 border-b border-gray-100">
          <button
            onClick={() => { setPestana("mail"); setBusqueda(""); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "mail" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Por mail ({confirmados})
          </button>
          <button
            onClick={() => { setPestana("push"); setBusqueda(""); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "push" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <Bell className="h-3.5 w-3.5" /> Por push ({seguidores.length})
          </button>
        </div>

        {/* El buscador aparece solo cuando la lista deja de entrar de un vistazo.
            Un campo de búsqueda vacío arriba de tres renglones es ruido — le
            ocupa lugar y atención al que todavía no tiene a quién buscar.
            Filtra sobre lo que ya está cargado, en el navegador: no hay consulta
            nueva ni endpoint. Por eso NO encuentra a los que quedaron fuera del
            tope de 500; el aviso del pie lo aclara. */}
        {!cargando && !error && lista.length > UMBRAL_BUSCADOR && (
          <div className="px-5 py-2.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={pestana === "mail" ? "Buscar por correo…" : "Buscar por nombre…"}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-xs text-gray-700 outline-none focus:border-indigo-300 focus:bg-white transition-colors"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {/* Sin resultados es distinto de lista vacía: acá SÍ hay gente, no
              coincide con lo que se escribió. Si cayera en el "nadie se
              suscribió todavía", diría una mentira. */}
          {!cargando && !error && q && visibles === 0 && lista.length > 0 && (
            <div className="px-6 py-10 text-center">
              <Search className="h-6 w-6 text-gray-200 mx-auto mb-3" />
              <p className="text-xs font-medium text-gray-600">Sin resultados para “{busqueda}”</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {ocultos > 0
                  ? `Ojo: la búsqueda mira los ${lista.length} que están cargados, no los ${ocultos} más antiguos.`
                  : "Probá con una parte más corta."}
              </p>
            </div>
          )}
          {cargando && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {error && <p className="px-5 py-8 text-center text-xs text-red-500">{error}</p>}

          {!cargando && !error && pestana === "mail" && (
            suscriptores.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Mail className="h-7 w-7 text-gray-200 mx-auto mb-3" />
                <p className="text-xs font-medium text-gray-600">Nadie se suscribió todavía</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[16rem] mx-auto leading-relaxed">
                  El formulario está en el bloque de novedades de tu tienda. Cuando alguien deje su
                  correo y lo confirme, aparece acá.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {suscriptoresVisibles.map((s) => {
                  const et = ETIQUETA_ESTADO[s.estado];
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-3 group">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 shrink-0">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{s.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${et.clase}`} title={et.ayuda}>
                            {et.texto}
                          </span>
                          <span className="text-[10px] text-gray-400">{fecha(s.desde)}</span>
                        </div>
                      </div>
                      {s.estado !== "baja" && (
                        <button
                          onClick={() => darDeBaja(s.id)}
                          disabled={borrando === s.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                          title="Sacar de la lista"
                        >
                          {borrando === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {!cargando && !error && pestana === "push" && (
            seguidores.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="h-7 w-7 text-gray-200 mx-auto mb-3" />
                <p className="text-xs font-medium text-gray-600">Todavía no te sigue nadie</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[16rem] mx-auto leading-relaxed">
                  Los clientes registrados que toquen 👍 en tu tienda aparecen acá.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {seguidoresVisibles.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 shrink-0 overflow-hidden">
                      {f.imagen
                        // eslint-disable-next-line @next/next/no-img-element -- foto de perfil externa (Google), sin dominio fijo que configurar en next.config
                        ? <img src={f.imagen} alt="" className="h-full w-full object-cover" />
                        : <UserRound className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{f.nombre}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Sigue tu tienda desde el {fecha(f.desde)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>

        {/* El aviso de truncado. Va antes que el de pendientes porque contradice
            lo que la lista parece decir: sin esto, 500 se leen como "todos". */}
        {!cargando && ocultos > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-[11px] text-gray-500">
              Mostrando los <strong>{lista.length}</strong> más recientes de <strong>{totalDeLaPestana}</strong>.
              Los otros {ocultos} reciben las campañas igual.
            </p>
          </div>
        )}

        {!cargando && pestana === "mail" && suscriptores.some((s) => s.estado === "pendiente") && (
          <div className="px-5 py-3 border-t border-gray-100 bg-amber-50/60 flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Los que dicen <strong>sin confirmar</strong> todavía no tocaron el link del mail. No les
              llega nada hasta que lo hagan — es lo que evita que alguien anote una dirección ajena.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
