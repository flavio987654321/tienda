"use client";
import type { CSSProperties } from "react";

/* ══════════════════════════════════════════════════════════════════════════
   CAMPO DE FECHA (y hora), en castellano y igual en todas las compus
   ══════════════════════════════════════════════════════════════════════════

   Reemplaza a `<input type="date">` y `<input type="datetime-local">`. Esos los
   dibuja el navegador con SU formato: en un Chrome en inglés salen como
   "mm/dd/yyyy", y ya pasó que un "07/10" se guardara como 10 de julio en vez de
   7 de octubre (avisos del admin, 01/10/26). Flavio lo vio otra vez en el
   lanzamiento de Aurora (04/10/26): "es muy confuso".

   Acá son desplegables: día, MES CON NOMBRE, año, y si hace falta hora y
   minutos. No hay forma de leerlo al revés.

   Guarda en el MISMO formato que el campo del navegador ("2026-10-07" o
   "2026-10-07T20:30"), así se cambia uno por otro sin tocar nada más.

   - Vacío ("") está permitido: los desplegables muestran "—". Al tocar
     cualquiera, lo que falta se completa con hoy (y la hora con la próxima en
     punto), para que nunca quede una fecha a medias.
   - Un día que el mes no tiene (31 de febrero) se baja al último del mes.
   - `min` (mismo formato): las fechas anteriores no se ofrecen. */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dos = (n: number) => String(n).padStart(2, "0");
const diasDelMes = (anio: number, mes: number) => new Date(anio, mes, 0).getDate();

type Partes = { anio: number; mes: number; dia: number; hora: number; min: number };

function leer(valor: string): Partes | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(valor);
  if (!m) return null;
  return { anio: +m[1], mes: +m[2], dia: +m[3], hora: m[4] ? +m[4] : 0, min: m[5] ? +m[5] : 0 };
}

function escribir(p: Partes, conHora: boolean): string {
  const dia = Math.min(p.dia, diasDelMes(p.anio, p.mes));
  const fecha = `${p.anio}-${dos(p.mes)}-${dos(dia)}`;
  return conHora ? `${fecha}T${dos(p.hora)}:${dos(p.min)}` : fecha;
}

/** Hoy, con la próxima hora en punto: lo que se completa cuando se arranca de vacío. */
function ahora(): Partes {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate(), hora: d.getHours(), min: 0 };
}

export function CampoFecha({ valor, onCambio, conHora = false, min, clase, estilo, estiloOpciones, etiqueta, id }: {
  valor: string;
  onCambio: (v: string) => void;
  conHora?: boolean;
  /** La fecha más temprana que se puede elegir, en el mismo formato. */
  min?: string;
  /** Clase de cada desplegable (para los paneles con Tailwind). */
  clase?: string;
  /** Estilo de cada desplegable (para los que van con estilos en línea). */
  estilo?: CSSProperties;
  /** Estilo de las opciones de la lista desplegada. Hace falta cuando el
   *  desplegable es oscuro pero su lista abre blanca (Aurora): sin esto las
   *  opciones heredan la letra clara y no se leen. Sin pasar, heredan. */
  estiloOpciones?: CSSProperties;
  /** Para los lectores de pantalla: de qué fecha se trata ("Fecha del lanzamiento"). */
  etiqueta: string;
  /** El id del primer desplegable, para que un `<label htmlFor>` lo encuentre. */
  id?: string;
}) {
  const p = leer(valor);
  const piso = min ? leer(min) : null;
  const base = p ?? ahora();

  const cambiar = (cambio: Partial<Partes>) => onCambio(escribir({ ...base, ...cambio }, conHora));

  const hoy = new Date().getFullYear();
  const desde = Math.min(piso?.anio ?? hoy - 1, p?.anio ?? hoy);
  const anios = Array.from({ length: Math.max(hoy + 4, p?.anio ?? 0) - desde + 1 }, (_, i) => desde + i)
    .filter(a => !piso || a >= piso.anio);
  const meses = MESES.map((nombre, i) => ({ nombre, n: i + 1 }))
    .filter(m => !piso || base.anio > piso.anio || m.n >= piso.mes);
  const dias = Array.from({ length: diasDelMes(base.anio, base.mes) }, (_, i) => i + 1)
    .filter(d => !piso || base.anio > piso.anio || base.mes > piso.mes || d >= piso.dia);
  // Minutos de a 5; si lo guardado no cae justo (ej. :07), se agrega para no perderlo.
  const minutos = Array.from({ length: 12 }, (_, i) => i * 5);
  if (p && !minutos.includes(p.min)) minutos.push(p.min);
  minutos.sort((a, b) => a - b);

  const sel = (props: { valor: string; opciones: { v: number; t: string }[]; al: (n: number) => void; aria: string; vacio: string; id?: string; ancho?: number }) => (
    <select id={props.id} aria-label={props.aria} className={clase} value={props.valor}
      onChange={e => props.al(Number(e.target.value))}
      style={{ ...estilo, ...(props.ancho ? { flex: `0 0 ${props.ancho}px`, minWidth: 0 } : { flex: 1, minWidth: 0 }) }}>
      {!p && <option value="">{props.vacio}</option>}
      {props.opciones.map(o => <option key={o.v} value={o.v} style={estiloOpciones}>{o.t}</option>)}
    </select>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", minWidth: 0 }}>
      <div style={{ display: "flex", gap: 6, flex: "1 1 220px", minWidth: 0 }}>
        {sel({ id, valor: p ? String(p.dia) : "", opciones: dias.map(d => ({ v: d, t: String(d) })), al: dia => cambiar({ dia }), aria: `${etiqueta}: día`, vacio: "Día", ancho: 64 })}
        {sel({ valor: p ? String(p.mes) : "", opciones: meses.map(m => ({ v: m.n, t: m.nombre })), al: mes => cambiar({ mes }), aria: `${etiqueta}: mes`, vacio: "Mes" })}
        {sel({ valor: p ? String(p.anio) : "", opciones: anios.map(a => ({ v: a, t: String(a) })), al: anio => cambiar({ anio }), aria: `${etiqueta}: año`, vacio: "Año", ancho: 78 })}
      </div>
      {conHora && (
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: "0 0 auto" }}>
          {sel({ valor: p ? String(p.hora) : "", opciones: Array.from({ length: 24 }, (_, h) => ({ v: h, t: dos(h) })), al: hora => cambiar({ hora }), aria: `${etiqueta}: hora`, vacio: "hh", ancho: 60 })}
          <span aria-hidden style={{ opacity: 0.6 }}>:</span>
          {sel({ valor: p ? String(p.min) : "", opciones: minutos.map(m => ({ v: m, t: dos(m) })), al: min => cambiar({ min }), aria: `${etiqueta}: minutos`, vacio: "mm", ancho: 60 })}
          <span style={{ fontSize: "0.85em", opacity: 0.6 }}>hs</span>
        </div>
      )}
    </div>
  );
}
