"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Radio, Loader2, Pencil, Trash2, Power, Eye, X as Cerrar, MousePointerClick, Plus, Users, User, Search, ThumbsUp, ThumbsDown } from "lucide-react";
import { CartelAviso } from "@/components/AvisoDelPanel";
import {
  validarAviso, validarAudiencia, conNombre, linkDelBoton, esCondicion, ROLES_AVISO, NOMBRE_DEL_ROL, TONOS, CONDICIONES,
  LARGO_TITULO, LARGO_TEXTO, LARGO_BOTON, LARGO_LINK, type RolAviso, type TonoAviso, type CondicionAviso,
} from "@/lib/avisos-admin";

/** Como llega del servidor: las fechas, como texto. */
type Aviso = {
  id: string; titulo: string; texto: string; botonTexto: string | null; botonLink: string | null;
  roles: string[]; soloNuevosDias: number | null; tono: string;
  condicion: string | null; paraUserId: string | null; paraUser: { name: string | null; email: string } | null;
  desde: string; hasta: string | null; activo: boolean; createdAt: string;
  vistos: number; cerrados: number; clicks: number; meGusta: number; noMeGusta: number;
};

type Persona = { id: string; name: string | null; email: string; role: string };

type Borrador = {
  titulo: string; texto: string; botonTexto: string; botonLink: string;
  /** "paneles": a todos los de unos paneles (con filtros). "persona": a una sola. */
  modo: "paneles" | "persona";
  roles: RolAviso[]; soloNuevos: boolean; dias: string; condicion: CondicionAviso | "";
  persona: Persona | null;
  tono: TonoAviso; desde: string; hasta: string;
};

const VACIO: Borrador = {
  titulo: "", texto: "", botonTexto: "", botonLink: "",
  modo: "paneles", roles: [], soloNuevos: false, dias: "7", condicion: "", persona: null,
  tono: "verde", desde: "", hasta: "",
};

const nombreDe = (p: { name: string | null; email: string }) => p.name?.trim() || p.email;

/* ── El reloj de la pantalla ──────────────────────────────────────────────
   Para decidir "al aire / programado / vencido" hace falta la hora, y la hora
   no puede leerse en pleno dibujo (cambia en cada llamada y React lo marca).
   Es un valor que se guarda y avisa cuando cambia: solo, cada 30 segundos, y
   a mano (`tic`) apenas se publica o se cambia algo — si no, un aviso recién
   publicado salía un instante como "Programado", porque su "desde" era más
   nuevo que la última hora guardada. En el servidor no hay hora (null): ver el
   comentario de `ahora` adentro del componente. */
const reloj = (() => {
  let hora = 0;
  const oyentes = new Set<() => void>();
  let intervalo: ReturnType<typeof setInterval> | undefined;
  const tic = () => { hora = Date.now(); oyentes.forEach((o) => o()); };
  return {
    tic,
    leer: () => { if (!hora) hora = Date.now(); return hora; },
    suscribir: (o: () => void) => {
      oyentes.add(o);
      if (oyentes.size === 1) intervalo = setInterval(tic, 30_000);
      return () => { oyentes.delete(o); if (oyentes.size === 0) clearInterval(intervalo); };
    },
  };
})();

/** El nombre de ejemplo de la vista previa: así se ve qué hace `{nombre}`. */
const NOMBRE_DE_EJEMPLO = "Jorge";

/* `datetime-local` habla en hora de la computadora y sin zona. Se convierte a
   ISO ACÁ, en el navegador, que sabe cuál es: el servidor corre en UTC y leería
   "15:00" como las 12 de Argentina. */
const aIso = (local: string) => (local ? new Date(local).toISOString() : "");
const aLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/* "jueves 1 de octubre de 2026, 22:10". Sólo se llama con algo que la persona
   escribió en el navegador, así que no hay diferencia servidor/navegador. */
const enPalabras = (local: string) => {
  const d = new Date(local);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
};

function fechasEnPalabras(desde: string, hasta: string): string {
  const d = desde ? enPalabras(desde) : null;
  const h = hasta ? enPalabras(hasta) : null;
  return `${d ? `Sale el ${d}` : "Sale ya"} · ${h ? `termina el ${h}` : "sin fecha de fin"}.`;
}

function audienciaDe(b: Borrador) {
  return b.modo === "persona"
    ? { paraUserId: b.persona?.id ?? "__falta__", roles: [], soloNuevosDias: null, condicion: null }
    : { paraUserId: null, roles: b.roles, soloNuevosDias: b.soloNuevos ? b.dias : null, condicion: b.condicion || null };
}

function cuerpoDe(b: Borrador) {
  return {
    titulo: b.titulo, texto: b.texto, botonTexto: b.botonTexto, botonLink: b.botonLink,
    ...audienciaDe(b), tono: b.tono,
    desde: aIso(b.desde) || undefined, hasta: aIso(b.hasta) || null,
  };
}

/** A quién va, en una línea, para la lista. */
function aQuien(a: Aviso): string {
  if (a.paraUser) return `Sólo para ${nombreDe(a.paraUser)}`;
  const partes = [a.roles.map((r) => NOMBRE_DEL_ROL[r as RolAviso] ?? r).join(" · ")];
  if (esCondicion(a.condicion)) partes.push(CONDICIONES[a.condicion].nombre.toLowerCase());
  if (a.soloNuevosDias !== null) partes.push(`sólo nuevos (${a.soloNuevosDias} días)`);
  return partes.join(" · ");
}

type Pestana = "aire" | "programado" | "vencido" | "apagado";
const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "aire", texto: "Al aire" },
  { clave: "programado", texto: "Programados" },
  { clave: "vencido", texto: "Vencidos" },
  { clave: "apagado", texto: "Apagados" },
];

function estadoDe(a: Aviso, ahora: number): { clave: Pestana; texto: string; clase: string } {
  if (!a.activo) return { clave: "apagado", texto: "Apagado", clase: "text-gray-400 bg-white/5 border-white/10" };
  if (new Date(a.desde).getTime() > ahora) return { clave: "programado", texto: "Programado", clase: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
  if (a.hasta && new Date(a.hasta).getTime() <= ahora) return { clave: "vencido", texto: "Vencido", clase: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
  return { clave: "aire", texto: "Al aire", clase: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

/**
 * Si un aviso ya publicado le puede salir a la misma gente que el borrador.
 * Es "puede": dos avisos de Digitales con condiciones distintas quizás no se
 * crucen nunca, pero el admin lo tiene que saber antes, no descubrirlo después.
 */
function seCruzan(a: Aviso, b: Borrador): boolean {
  if (b.modo === "persona") {
    if (!b.persona) return false;
    return a.paraUserId === b.persona.id || (!a.paraUserId && a.roles.includes(b.persona.role));
  }
  if (a.paraUserId) return false;
  return a.roles.some((r) => (b.roles as string[]).includes(r));
}

/* Con la zona escrita: el servidor dibuja en UTC y el navegador en hora de
   Argentina, y sin esto cada uno mostraba un horario distinto. */
const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

export default function AvisosAdmin({ inicial }: { inicial: Aviso[] }) {
  const [avisos, setAvisos] = useState<Aviso[]>(inicial);
  const [b, setB] = useState<Borrador>(VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  /* El freno del doble click: dos clicks seguidos leen el mismo `guardando`
     antes de que React vuelva a dibujar, y saldrían dos avisos iguales. */
  const enVuelo = useRef(false);
  /* La hora y las fechas se dibujan SÓLO en el navegador. El servidor y el
     navegador formatean distinto ("p. m." con un espacio especial de un lado y
     normal del otro), y `Date.now()` da otro número en cada uno: dibujarlas en
     los dos rompía la hidratación de la lista entera. En el servidor es null;
     en el navegador, la del `reloj`. (Con un efecto que la guardaba al montar,
     React dibujaba todo dos veces seguidas.) */
  const ahora = useSyncExternalStore<number | null>(reloj.suscribir, reloj.leer, () => null);
  const [pestana, setPestana] = useState<Pestana>("aire");

  /* Los que ya están al aire (o por salir) para la misma gente. Cada persona ve
     UNO a la vez: si hay otros, el admin tiene que saber que van a esperar. */
  const choques = ahora === null ? [] : avisos.filter((a) => {
    if (a.id === editando) return false;
    const k = estadoDe(a, ahora).clave;
    return (k === "aire" || k === "programado") && seCruzan(a, b);
  });

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => { setB((x) => ({ ...x, [k]: v })); setError(""); };

  /* ── A cuántos le llegaría ────────────────────────────────────────────
     Se pregunta al servidor medio segundo después de dejar de tocar la
     audiencia, con la MISMA consulta que decide quién lo ve. `pedido` descarta
     la respuesta de una pregunta vieja que llega tarde.

     La respuesta se guarda junto con QUÉ se preguntó (`clave`): si la
     audiencia cambió, la vieja no se muestra, sin tener que borrarla. */
  type Alcance = { total: number; nombres: string[] } | { error: string };
  const [respuestaAlcance, setRespuestaAlcance] = useState<{ clave: string; r: Alcance } | null>(null);
  const pedido = useRef(0);
  const claveAudiencia = JSON.stringify(audienciaDe(b));
  const contable = b.modo === "paneles" && validarAudiencia(audienciaDe(b)).ok;
  useEffect(() => {
    if (!contable) return;
    const n = ++pedido.current;
    const guardar = (r: Alcance) => { if (n === pedido.current) setRespuestaAlcance({ clave: claveAudiencia, r }); };
    const t = setTimeout(() => {
      fetch("/api/admin/avisos/alcance", { method: "POST", headers: { "Content-Type": "application/json" }, body: claveAudiencia })
        .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => null) }))
        .then(({ ok, d }) => guardar(ok && d ? d : { error: d?.error ?? "No se pudo contar." }))
        .catch(() => guardar({ error: "No se pudo contar." }));
    }, 500);
    return () => clearTimeout(t);
  }, [claveAudiencia, contable]);
  const alcance = contable && respuestaAlcance?.clave === claveAudiencia ? respuestaAlcance.r : null;

  /* ── Buscar a una persona ─────────────────────────────────────────── */
  const [busqueda, setBusqueda] = useState("");
  /* Igual que el contador: la respuesta va con la búsqueda que la pidió, y
     "buscando" es simplemente que todavía no llegó la de lo que está escrito. */
  const [respuestaBusqueda, setRespuestaBusqueda] = useState<{ q: string; lista: Persona[] } | null>(null);
  const pedidoBusqueda = useRef(0);
  const q = busqueda.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const n = ++pedidoBusqueda.current;
    const guardar = (lista: Persona[]) => { if (n === pedidoBusqueda.current) setRespuestaBusqueda({ q, lista }); };
    const t = setTimeout(() => {
      fetch(`/api/admin/avisos/personas?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => guardar(Array.isArray(d) ? d : []))
        .catch(() => guardar([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const buscando = q.length >= 2 && respuestaBusqueda?.q !== q;
  const encontrados = q.length >= 2 && respuestaBusqueda?.q === q ? respuestaBusqueda.lista : [];

  /* La MISMA validación que la ruta: el error aparece antes de mandar. */
  const validado = validarAviso(cuerpoDe(b));
  const linkArmado = b.botonLink.trim() ? linkDelBoton(b.botonLink) : null;

  async function guardar() {
    if (enVuelo.current) return;
    if (b.modo === "persona" && !b.persona) { setError("Buscá y elegí a la persona."); return; }
    if (!validado.ok) { setError(validado.error); return; }
    enVuelo.current = true;
    setGuardando(true);
    setError("");
    try {
      const r = await fetch(editando ? `/api/admin/avisos/${editando}` : "/api/admin/avisos", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDe(b)),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError(d?.error ?? "No se pudo guardar."); return; }
      setAvisos(d);
      reloj.tic();
      setB(VACIO);
      setEditando(null);
    } catch {
      setError("No se pudo guardar. Revisá la conexión.");
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  /* El mismo freno que `guardar`, para prender, apagar y borrar: `ocupado` es
     estado, y dos clicks seguidos lo leen vacío los dos. */
  const accionEnVuelo = useRef(false);
  async function accion(id: string, metodo: "PATCH" | "DELETE", cuerpo?: unknown) {
    if (accionEnVuelo.current) return;
    accionEnVuelo.current = true;
    setOcupado(id);
    try {
      const r = await fetch(`/api/admin/avisos/${id}`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const d = await r.json().catch(() => null);
      if (r.ok) { setAvisos(d); reloj.tic(); }
      else alert(d?.error ?? "No se pudo.");
    } catch {
      alert("No se pudo. Revisá la conexión.");
    } finally {
      accionEnVuelo.current = false;
      setOcupado(null);
    }
  }

  function editar(a: Aviso) {
    setEditando(a.id);
    setError("");
    setB({
      titulo: a.titulo, texto: a.texto, botonTexto: a.botonTexto ?? "", botonLink: a.botonLink ?? "",
      modo: a.paraUserId ? "persona" : "paneles",
      persona: a.paraUserId && a.paraUser ? { id: a.paraUserId, name: a.paraUser.name, email: a.paraUser.email, role: a.roles[0] ?? "" } : null,
      roles: a.paraUserId ? [] : a.roles.filter((r): r is RolAviso => (ROLES_AVISO as readonly string[]).includes(r)),
      soloNuevos: a.soloNuevosDias !== null, dias: String(a.soloNuevosDias ?? 7),
      condicion: esCondicion(a.condicion) ? a.condicion : "",
      tono: (Object.keys(TONOS) as TonoAviso[]).includes(a.tono as TonoAviso) ? (a.tono as TonoAviso) : "verde",
      desde: aLocal(a.desde), hasta: aLocal(a.hasta),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const campo = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/50";
  const etiqueta = "mb-1.5 block text-xs font-semibold text-gray-400";

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-1 flex items-center gap-2">
        <Radio className="h-5 w-5 text-emerald-400" />
        <h1 className="text-xl font-bold text-white">Avisos</h1>
      </motion.div>
      <p className="mb-6 text-sm text-gray-500">
        El cartel de arriba del inicio de los paneles. Se ve uno a la vez, y quien lo cierra no lo vuelve a ver.
        No manda mails ni notificaciones: aparece cuando la persona entra al panel.
      </p>

      {/* ── El formulario ─────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-4 text-sm font-bold text-white">{editando ? "Editar aviso" : "Nuevo aviso"}</p>

        <div className="grid gap-4">
          <div>
            <label htmlFor="av-titulo" className={etiqueta}>Título</label>
            <input id="av-titulo" className={campo} value={b.titulo} maxLength={LARGO_TITULO} onChange={(e) => set("titulo", e.target.value)}
              placeholder="¡Hola {nombre}, bienvenido a TiendaApps!" />
          </div>
          <div>
            <label htmlFor="av-texto" className={etiqueta}>Texto <span className="font-normal text-gray-600">· {b.texto.length}/{LARGO_TEXTO}</span></label>
            <textarea id="av-texto" className={`${campo} min-h-[96px] resize-y`} value={b.texto} maxLength={LARGO_TEXTO} onChange={(e) => set("texto", e.target.value)}
              placeholder="Si tenés cualquier duda o te trabás con algo, escribinos por WhatsApp y te ayudamos." />
            <p className="mt-1 text-[11.5px] text-gray-600">
              Escribí <code className="text-gray-400">{"{nombre}"}</code> y se cambia por el nombre de cada persona.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="av-boton" className={etiqueta}>Texto del botón <span className="font-normal text-gray-600">(opcional)</span></label>
              <input id="av-boton" className={campo} value={b.botonTexto} maxLength={LARGO_BOTON} onChange={(e) => set("botonTexto", e.target.value)} placeholder="Escribinos por WhatsApp" />
            </div>
            <div>
              <label htmlFor="av-link" className={etiqueta}>Link del botón</label>
              <input id="av-link" inputMode="url" autoComplete="off" className={campo} value={b.botonLink} maxLength={LARGO_LINK} onChange={(e) => set("botonLink", e.target.value)} placeholder="2254447183 o https://…" />
              {linkArmado && linkArmado !== b.botonLink.trim() && (
                <p className="mt-1 truncate text-[11.5px] text-emerald-500/80">→ {linkArmado}</p>
              )}
            </div>
          </div>

          {/* ── A quién va ── */}
          <div>
            <p className={etiqueta}>A quién va</p>
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1" role="tablist">
              {([["paneles", "Paneles", Users], ["persona", "Una persona", User]] as const).map(([m, texto, Icono]) => (
                <button key={m} type="button" role="tab" aria-selected={b.modo === m} onClick={() => set("modo", m)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${b.modo === m ? "bg-emerald-500/20 text-emerald-300" : "text-gray-400 hover:text-white"}`}>
                  <Icono className="h-4 w-4" /> {texto}
                </button>
              ))}
            </div>
          </div>

          {b.modo === "persona" ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              {b.persona ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{nombreDe(b.persona)}</p>
                    <p className="truncate text-xs text-gray-500">{b.persona.email} · {NOMBRE_DEL_ROL[b.persona.role as RolAviso] ?? b.persona.role}</p>
                  </div>
                  <button type="button" onClick={() => { set("persona", null); setBusqueda(""); }} className="text-xs text-gray-400 underline underline-offset-2 hover:text-white">
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="av-persona" className="sr-only">Buscar persona</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input id="av-persona" className={`${campo} pl-9`} value={busqueda} maxLength={80} autoComplete="off"
                      onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscá por nombre o mail…" />
                  </div>
                  {buscando && <p className="mt-2 text-xs text-gray-500">Buscando…</p>}
                  {!buscando && busqueda.trim().length >= 2 && encontrados.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">Nadie con panel se llama así.</p>
                  )}
                  {encontrados.length > 0 && (
                    <ul className="mt-2 grid gap-1">
                      {encontrados.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => { set("persona", p); setBusqueda(""); }}
                            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5">
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-white">{nombreDe(p)}</span>
                              <span className="block truncate text-xs text-gray-500">{p.email}</span>
                            </span>
                            <span className="shrink-0 text-[11px] text-gray-500">{NOMBRE_DEL_ROL[p.role as RolAviso] ?? p.role}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ) : (<>
          <div>
            <p className={etiqueta}>A qué paneles</p>
            <div className="flex flex-wrap gap-2">
              {ROLES_AVISO.map((r) => {
                const on = b.roles.includes(r);
                return (
                  <button key={r} type="button" aria-pressed={on}
                    onClick={() => set("roles", on ? b.roles.filter((x) => x !== r) : [...b.roles, r])}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${on ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-gray-400 hover:text-white"}`}>
                    {NOMBRE_DEL_ROL[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white">
              <input type="checkbox" checked={b.soloNuevos} onChange={(e) => set("soloNuevos", e.target.checked)} className="h-4 w-4 accent-emerald-500" />
              Sólo los nuevos
            </label>
            {b.soloNuevos && (
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-6 text-sm text-gray-400">
                Durante sus primeros
                <input type="text" inputMode="numeric" aria-label="Cantidad de días" maxLength={2} value={b.dias}
                  /* Sólo dígitos: un `type="number"` deja escribir "e", "-" y "2.5". El
                     servidor igual lo valida; esto evita el error. */
                  onChange={(e) => set("dias", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-white outline-none" />
                días desde que se registran.
              </div>
            )}
            <p className="mt-1.5 pl-6 text-[11.5px] text-gray-600">
              {b.soloNuevos ? "Le sale a cada cuenta nueva, también a las que se registren mañana." : "Apagado: le sale a todas las cuentas de esos paneles."}
            </p>
          </div>

          <div>
            <label htmlFor="av-condicion" className={etiqueta}>Sólo a quienes les falta algo <span className="font-normal text-gray-600">(opcional)</span></label>
            <select id="av-condicion" className={campo} value={b.condicion} onChange={(e) => set("condicion", e.target.value as CondicionAviso | "")}>
              <option value="" className="bg-gray-900">A todos</option>
              {(Object.keys(CONDICIONES) as CondicionAviso[]).map((c) => (
                <option key={c} value={c} className="bg-gray-900">
                  {CONDICIONES[c].nombre} ({CONDICIONES[c].roles.map((r) => NOMBRE_DEL_ROL[r]).join(" y ")})
                </option>
              ))}
            </select>
            {b.condicion && (
              <p className="mt-1 text-[11.5px] text-gray-600">Cuando lo resuelve, el aviso se le va solo.</p>
            )}
          </div>

          {/* ── A cuántos le llegaría ── */}
          {alcance && (
            "error" in alcance ? (
              <p className="text-[12.5px] text-amber-400">{alcance.error}</p>
            ) : alcance.total === 0 ? (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-300">
                Hoy no le llegaría a nadie.{b.soloNuevos ? " Le va a ir llegando a quienes se registren." : ""}
              </p>
            ) : (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-300 [overflow-wrap:anywhere]">
                Hoy le llegaría a <strong>{alcance.total} {alcance.total === 1 ? "persona" : "personas"}</strong>:{" "}
                {alcance.nombres.join(", ")}{alcance.total > alcance.nombres.length ? ` y ${alcance.total - alcance.nombres.length} más` : ""}.
                {b.soloNuevos ? " Y a quienes se registren." : ""}
              </p>
            )
          )}
          </>)}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="av-tono" className={etiqueta}>Color</label>
              <select id="av-tono" className={campo} value={b.tono} onChange={(e) => set("tono", e.target.value as TonoAviso)}>
                {(Object.keys(TONOS) as TonoAviso[]).map((t) => <option key={t} value={t} className="bg-gray-900">{TONOS[t].nombre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="av-desde" className={etiqueta}>Desde <span className="font-normal text-gray-600">(vacío = ya)</span></label>
              <input id="av-desde" type="datetime-local" className={`${campo} [color-scheme:dark]`} value={b.desde} onChange={(e) => set("desde", e.target.value)} />
            </div>
            <div>
              <label htmlFor="av-hasta" className={etiqueta}>Hasta <span className="font-normal text-gray-600">(vacío = siempre)</span></label>
              <input id="av-hasta" type="datetime-local" className={`${campo} [color-scheme:dark]`} value={b.hasta} onChange={(e) => set("hasta", e.target.value)} />
            </div>
          </div>
          {/* Las fechas, dichas en castellano. El campo de fecha lo dibuja el
              navegador con SU formato: en uno configurado en inglés es mes/día,
              y el 01/10/26 "07/10" se guardó como 10 de julio en vez de 7 de
              octubre. Leído en palabras, el error se ve antes de publicar. */}
          <p className="-mt-1 text-[12.5px] text-gray-400">{fechasEnPalabras(b.desde, b.hasta)}</p>
        </div>

        {/* ── La vista previa: el MISMO componente que ve el panel ── */}
        <p className="mb-2 mt-6 text-xs font-semibold text-gray-400">Así se ve (con el nombre {NOMBRE_DE_EJEMPLO})</p>
        <div className="rounded-2xl bg-gray-100 p-4">
          <CartelAviso
            className="!mb-0"
            aviso={{
              titulo: conNombre(b.titulo || "El título del aviso", NOMBRE_DE_EJEMPLO),
              texto: conNombre(b.texto || "El texto del aviso.", NOMBRE_DE_EJEMPLO),
              botonTexto: b.botonTexto.trim() ? conNombre(b.botonTexto.trim(), NOMBRE_DE_EJEMPLO) : null,
              botonLink: linkArmado,
              tono: b.tono,
            }}
            onCerrar={() => {}}
            onVotar={() => {}}
          />
        </div>

        {choques.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[12.5px] text-amber-300">
            <p>
              {choques.length === 1 ? "Ya hay 1 aviso" : `Ya hay ${choques.length} avisos`} al aire o programados para esta misma gente.
              Cada persona ve uno a la vez: {b.modo === "persona" ? "el que es sólo para ella sale primero" : "el más nuevo sale primero"}, y {choques.length === 1 ? "el otro espera" : "los otros esperan"} a que lo cierre.
            </p>
            <ul className="mt-1.5 list-disc pl-5 text-amber-300/80">
              {choques.slice(0, 3).map((a) => <li key={a.id} className="[overflow-wrap:anywhere]">{a.titulo}</li>)}
            </ul>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={guardar} disabled={guardando}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : editando ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editando ? "Guardar cambios" : "Publicar aviso"}
          </button>
          {editando && (
            <button type="button" onClick={() => { setEditando(null); setB(VACIO); setError(""); }}
              className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* ── La lista ──────────────────────────────────────────────────── */}
      {/* Pestañas: con muchos avisos, lo vencido y lo apagado no tapa lo que
          está al aire. Se dibujan recién en el navegador, por la misma razón que
          las fechas: el estado depende de la hora. */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="tablist">
        {PESTANAS.map((p) => {
          const n = ahora === null ? null : avisos.filter((a) => estadoDe(a, ahora).clave === p.clave).length;
          const on = pestana === p.clave;
          return (
            <button key={p.clave} type="button" role="tab" aria-selected={on} onClick={() => setPestana(p.clave)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${on ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}>
              {p.texto}{n !== null && <span className="ml-1.5 text-gray-500">{n}</span>}
            </button>
          );
        })}
      </div>
      {(() => {
        const visibles = ahora === null ? [] : avisos.filter((a) => estadoDe(a, ahora).clave === pestana);
        if (ahora !== null && visibles.length === 0) {
          return <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
            {avisos.length === 0 ? "Todavía no hay ningún aviso." : "No hay avisos en esta pestaña."}
          </p>;
        }
        return (
        <div className="grid gap-3">
          {visibles.map((a) => {
            const est = ahora === null ? null : estadoDe(a, ahora);
            const tocado = ocupado === a.id;
            return (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {est && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${est.clase}`}>{est.texto}</span>}
                      <p className="min-w-0 font-semibold text-white [overflow-wrap:anywhere]">{a.titulo}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {aQuien(a)}
                      {ahora !== null && <>{` · desde ${fecha(a.desde)}`}{a.hasta && ` hasta ${fecha(a.hasta)}`}</>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {a.vistos} lo vieron</span>
                      <span className="inline-flex items-center gap-1"><Cerrar className="h-3.5 w-3.5" /> {a.cerrados} lo cerraron</span>
                      {a.botonLink && <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> {a.clicks} tocaron el botón</span>}
                      <span className="inline-flex items-center gap-1 text-emerald-400/90"><ThumbsUp className="h-3.5 w-3.5" /> {a.meGusta}</span>
                      <span className="inline-flex items-center gap-1 text-rose-400/90"><ThumbsDown className="h-3.5 w-3.5" /> {a.noMeGusta}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {tocado && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                    <button type="button" title="Editar" disabled={!!ocupado} onClick={() => editar(a)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                    <button type="button" title={a.activo ? "Apagar" : "Prender"} disabled={!!ocupado} onClick={() => accion(a.id, "PATCH", { activo: !a.activo })}
                      className={`rounded-lg p-2 transition hover:bg-white/10 disabled:opacity-40 ${a.activo ? "text-emerald-400" : "text-gray-500"}`}><Power className="h-4 w-4" /></button>
                    <button type="button" title="Borrar" disabled={!!ocupado}
                      onClick={() => { if (confirm(`¿Borrar "${a.titulo}"? Se pierden también sus números.`)) accion(a.id, "DELETE"); }}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}
