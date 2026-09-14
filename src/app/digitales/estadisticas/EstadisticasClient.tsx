import Link from "next/link";
import { Lock, ArrowRight, TrendingUp, Receipt, Wallet, Percent } from "lucide-react";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import {
  puedeVer, DESDE_QUE_PLAN, RANGOS, NOMBRE_RANGO,
  type Estadisticas, type Bloque,
} from "@/lib/estadisticas-digitales";
import { NOMBRE_ORIGEN } from "@/lib/origen-visita";
import type { Punto } from "@/lib/serie-grafico";

/**
 * La pantalla de Estadísticas. No tiene estado: los dos selectores son
 * enlaces —el panel entero anda sin JavaScript y el link de un producto en un
 * rango se puede compartir— y los gráficos son SVG dibujados en el servidor.
 *
 * ── Lo que se bloquea, y cómo ──────────────────────────────────────────────
 *
 * Cada bloque pregunta `puedeVer(tier, bloque)`. Un bloque bloqueado se
 * dibuja IGUAL, borroso y con el candado encima, pero con números de muestra
 * y no con los de la cuenta: borroso con los números reales, cualquiera los
 * lee con el inspector del navegador. Lo que se enseña es la forma de lo que
 * se gana al cambiar de plan, no el dato.
 */

type Props = {
  tier: TierDigital;
  principales: { id: string; name: string; publicada: boolean }[];
  elegido: string | null;
  datos: Estadisticas;
  /** Se llegó al techo de órdenes: los números del rango están incompletos. */
  recortado: boolean;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const entero = (n: number) => new Intl.NumberFormat("es-AR").format(n);
const porcentaje = (n: number | null) =>
  n === null ? "—" : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n)} %`;

export default function EstadisticasClient({ tier, principales, elegido, datos, recortado }: Props) {
  const { rango, kpis, serie, embudo, porProducto, origenes } = datos;
  const href = (cambios: { p?: string | null; rango?: string }) => {
    const q = new URLSearchParams();
    const prod = cambios.p === undefined ? elegido : cambios.p;
    const r = cambios.rango ?? rango.clave;
    if (prod) q.set("p", prod);
    if (r !== "30") q.set("rango", r);
    const s = q.toString();
    return `/digitales/estadisticas${s ? `?${s}` : ""}`;
  };

  const veVisitas = puedeVer(tier, "visitas");
  const nombreDelElegido = principales.find((p) => p.id === elegido)?.name ?? null;

  return (
    <div className="space-y-4">
      {/* ── Los selectores ─────────────────────────────────────────────────── */}
      {principales.length > 1 && (
        <Fila>
          <Chip href={href({ p: null })} activo={!elegido}>Todos</Chip>
          {principales.map((p) => (
            <Chip key={p.id} href={href({ p: p.id })} activo={elegido === p.id}>{p.name}</Chip>
          ))}
        </Fila>
      )}
      <Fila>
        {RANGOS.map((r) => (
          <Chip key={r} href={href({ rango: r })} activo={rango.clave === r}>{NOMBRE_RANGO[r]}</Chip>
        ))}
      </Fila>

      {recortado && (
        <p className="rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-800 panel-oscuro:text-amber-300">
          Hay más ventas en este rango de las que se pueden contar de una: los números están incompletos.
          Elegí un rango más corto.
        </p>
      )}

      {/* ── Los cuatro números ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero
          Icon={Receipt}
          titulo="Ventas"
          valor={entero(kpis.ventas)}
          pie={kpis.devueltas > 0 ? `${kpis.devueltas} ${kpis.devueltas === 1 ? "devuelta" : "devueltas"}` : nombreDelElegido ?? "cobradas"}
        />
        <Numero
          Icon={Wallet}
          titulo="Te quedó"
          valor={plata(kpis.neto)}
          pie={kpis.ventas > 0 ? `${plata(kpis.bruto)} cobrados, ${plata(kpis.comision)} de comisión` : "después de la comisión"}
          destacado
        />
        <Numero
          Icon={TrendingUp}
          titulo="Ticket promedio"
          valor={kpis.ticket === null ? "—" : plata(kpis.ticket)}
          pie="por venta"
        />
        {veVisitas ? (
          <Numero
            Icon={Percent}
            titulo="Conversión"
            valor={porcentaje(kpis.conversion)}
            pie={kpis.visitas > 0 ? `${entero(kpis.ventas)} de ${entero(kpis.visitas)} visitas` : "todavía sin visitas"}
          />
        ) : (
          <Bloqueado bloque="visitas" compacto>
            <Numero Icon={Percent} titulo="Conversión" valor="3,2 %" pie="8 de 250 visitas" />
          </Bloqueado>
        )}
      </div>

      {/* ── Visitas y ventas por día ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        {veVisitas ? (
          <Tarjeta titulo="Visitas" bajada={pieDeSerie(serie.grano, kpis.visitas, "visitas")}>
            <Grafico puntos={serie.visitas} color="#ea580c" />
          </Tarjeta>
        ) : (
          <Bloqueado bloque="visitas">
            <Tarjeta titulo="Visitas" bajada="Cuánta gente entra a tu página cada día.">
              <Grafico puntos={muestra(serie.ventas.length, 40)} color="#ea580c" />
            </Tarjeta>
          </Bloqueado>
        )}
        <Tarjeta titulo="Ventas" bajada={pieDeSerie(serie.grano, kpis.ventas, "ventas")}>
          <Grafico puntos={serie.ventas} color="#059669" />
        </Tarjeta>
      </div>

      {/* ── El embudo ──────────────────────────────────────────────────────── */}
      {puedeVer(tier, "embudo") ? (
        <Tarjeta titulo="Embudo" bajada="De los que entraron, cuántos quisieron pagar y cuántos pagaron.">
          <EmbudoDibujado visitas={embudo.visitas} checkouts={embudo.checkouts} ventas={embudo.ventas}
            pctCheckout={embudo.pctCheckout} pctVenta={embudo.pctVenta} />
        </Tarjeta>
      ) : (
        <Bloqueado bloque="embudo">
          <Tarjeta titulo="Embudo" bajada="De los que entraron, cuántos quisieron pagar y cuántos pagaron.">
            <EmbudoDibujado visitas={250} checkouts={40} ventas={8} pctCheckout={16} pctVenta={20} />
          </Tarjeta>
        </Bloqueado>
      )}

      {/* ── Por producto, mirando todo ─────────────────────────────────────── */}
      {!elegido && principales.length > 1 && (
        <Tarjeta titulo="Por producto" bajada="Cuál de tus páginas anda.">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                  <th className="pb-2 font-bold">Producto</th>
                  <th className="pb-2 font-bold text-right">Ventas</th>
                  <th className="pb-2 font-bold text-right">Te quedó</th>
                  {veVisitas && <th className="pb-2 font-bold text-right">Visitas</th>}
                  {veVisitas && <th className="pb-2 font-bold text-right">Conversión</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
                {porProducto.map((p) => (
                  <tr key={p.id} className="text-gray-700 panel-oscuro:text-gray-300">
                    <td className="py-2.5 pr-3 max-w-[220px]">
                      <Link href={href({ p: p.id })} className="hover:text-orange-700 panel-oscuro:hover:text-orange-400">
                        <span className="block truncate">{p.name}</span>
                      </Link>
                      {!p.publicada && <span className="text-[11px] text-gray-400 panel-oscuro:text-gray-500">borrador</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{entero(p.ventas)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-gray-900 panel-oscuro:text-gray-100">{plata(p.neto)}</td>
                    {veVisitas && <td className="py-2.5 text-right tabular-nums">{entero(p.visitas)}</td>}
                    {veVisitas && <td className="py-2.5 text-right tabular-nums">{porcentaje(p.conversion)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {/* ── De dónde vinieron ──────────────────────────────────────────────── */}
      {puedeVer(tier, "origenes") ? (
        <Tarjeta
          titulo="De dónde vienen"
          bajada={
            origenes.conocidas > 0
              ? `De ${entero(kpis.visitas)} visitas, sabemos de dónde vinieron ${entero(origenes.conocidas)}. Agregá ?utm_source=instagram al link que compartís y la visita queda anotada ahí.`
              : "Agregá ?utm_source=instagram (o whatsapp, facebook, email…) al link que compartís, y cada visita queda anotada con su origen."
          }
        >
          <Origenes filas={origenes.filas} />
        </Tarjeta>
      ) : (
        <Bloqueado bloque="origenes">
          <Tarjeta titulo="De dónde vienen" bajada="Instagram, WhatsApp, un anuncio, un mail: qué canal trae las visitas.">
            <Origenes filas={[
              { origen: "instagram", visitas: 120, pct: 48 },
              { origen: "whatsapp", visitas: 70, pct: 28 },
              { origen: "facebook", visitas: 35, pct: 14 },
              { origen: "directo", visitas: 25, pct: 10 },
            ]} />
          </Tarjeta>
        </Bloqueado>
      )}
    </div>
  );
}

/* ── Piezas ────────────────────────────────────────────────────────────────── */

function pieDeSerie(grano: string, total: number, cosa: string): string {
  const por = grano === "dia" ? "por día" : grano === "semana" ? "por semana" : "por mes";
  return `${entero(total)} ${cosa} en el período, ${por}.`;
}

/** Números de muestra para un bloque bloqueado: una curva, no la cuenta. */
function muestra(cuantos: number, tope: number): Punto[] {
  const n = Math.max(cuantos, 7);
  return Array.from({ length: n }, (_, i) => ({
    dia: String(i), label: "",
    value: Math.round(tope * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.9 + 1)))),
  }));
}

function Fila({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">{children}</div>
    </div>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 max-w-[180px] truncate rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
        activo
          ? "bg-orange-600 text-white"
          : "border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-400"
      }`}
    >
      {children}
    </Link>
  );
}

function Tarjeta({ titulo, bajada, children }: { titulo: string; bajada: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{titulo}</p>
      <p className="mt-0.5 mb-4 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">{bajada}</p>
      {children}
    </div>
  );
}

function Numero({ Icon, titulo, valor, pie, destacado = false }: {
  Icon: React.ElementType; titulo: string; valor: string; pie: string; destacado?: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${
      destacado
        ? "border-orange-200 panel-oscuro:border-orange-500/30 bg-gradient-to-br from-orange-50 to-amber-50 panel-oscuro:from-orange-500/10 panel-oscuro:to-amber-500/5"
        : "border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900"
    }`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-orange-500" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">{titulo}</p>
      </div>
      {/* Sin `truncate` en el número: en 360 dos tarjetas por fila dejan 150 px,
          y "$ 627.886" cortado a "$ 627.8…" es un número distinto. Se achica la
          letra y, si aun así no entra, se parte. */}
      <p className="mt-1.5 text-xl lg:text-2xl font-black tabular-nums text-gray-900 panel-oscuro:text-gray-100 [overflow-wrap:anywhere]">{valor}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-gray-500 panel-oscuro:text-gray-400">{pie}</p>
    </div>
  );
}

/**
 * Un bloque que este plan no ve: lo de adentro borroso y sin poder tocarse, y
 * encima desde qué plan se ve. Lo de adentro son números de muestra —quien
 * pone este componente lo decide—, nunca los de la cuenta.
 */
function Bloqueado({ bloque, compacto = false, children }: { bloque: Bloque; compacto?: boolean; children: React.ReactNode }) {
  const desde = COPY_DIGITAL[DESDE_QUE_PLAN[bloque]].nombre;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60" aria-hidden="true">{children}</div>
      <Link
        href="/digitales/mi-cuenta"
        className={`absolute inset-0 flex items-center justify-center rounded-3xl ${compacto ? "p-2" : "p-4"}`}
        aria-label={`Disponible desde el plan ${desde}. Ver planes.`}
      >
        <span className={`flex items-center gap-2 rounded-full border border-gray-200 panel-oscuro:border-gray-700 bg-white/95 panel-oscuro:bg-gray-900/95 shadow-sm font-bold text-gray-700 panel-oscuro:text-gray-200 ${compacto ? "px-3 py-1.5 text-[11.5px]" : "px-4 py-2 text-[12.5px]"}`}>
          <Lock className="h-3.5 w-3.5 text-orange-500" />
          {compacto ? `Desde ${desde}` : `Disponible desde ${desde}`}
          {!compacto && <ArrowRight className="h-3.5 w-3.5 text-gray-400" />}
        </span>
      </Link>
    </div>
  );
}

/**
 * Barras por día (o por semana o mes). SVG dibujado en el servidor, sin
 * librerías: son barras y cuatro etiquetas. El eje muestra una etiqueta cada
 * tantos puntos para que no se pisen; el alto se escala al máximo del período,
 * y con todo en cero se dibuja el piso y nada más.
 */
function Grafico({ puntos, color }: { puntos: Punto[]; color: string }) {
  const W = 600, H = 180, PIE = 24, ARRIBA = 6;
  const max = Math.max(1, ...puntos.map((p) => p.value));
  const n = Math.max(1, puntos.length);
  const paso = W / n;
  const ancho = Math.max(2, Math.min(paso * 0.7, 28));
  const cadaCuanto = Math.max(1, Math.ceil(n / 7));
  const todoCero = puntos.every((p) => p.value === 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de barras">
        <line x1={0} x2={W} y1={H - PIE} y2={H - PIE} stroke="currentColor" strokeOpacity={0.12} />
        {puntos.map((p, i) => {
          const alto = ((H - PIE - ARRIBA) * p.value) / max;
          const x = i * paso + (paso - ancho) / 2;
          return (
            <g key={p.dia}>
              {p.value > 0 && (
                <rect x={x} y={H - PIE - alto} width={ancho} height={alto} rx={Math.min(3, ancho / 2)} fill={color}>
                  <title>{`${p.label}: ${entero(p.value)}`}</title>
                </rect>
              )}
              {i % cadaCuanto === 0 && p.label && (
                <text
                  /* La primera etiqueta va pegada al borde y anclada a la izquierda:
                     centrada sobre una barra angosta, "16/8" se leía "6/8". */
                  x={i === 0 ? 2 : i * paso + paso / 2}
                  y={H - 3}
                  textAnchor={i === 0 ? "start" : "middle"}
                  fontSize={15}
                  fill="currentColor"
                  fillOpacity={0.55}
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {todoCero && (
        <p className="mt-1 text-center text-[12px] text-gray-400 panel-oscuro:text-gray-500">Nada en este período.</p>
      )}
    </div>
  );
}

function EmbudoDibujado({ visitas, checkouts, ventas, pctCheckout, pctVenta }: {
  visitas: number; checkouts: number; ventas: number; pctCheckout: number | null; pctVenta: number | null;
}) {
  const max = Math.max(1, visitas);
  const filas = [
    { nombre: "Entraron a la página", valor: visitas, pct: null as number | null, color: "bg-orange-500" },
    { nombre: "Abrieron el pago", valor: checkouts, pct: pctCheckout, color: "bg-amber-500" },
    { nombre: "Pagaron", valor: ventas, pct: pctVenta, color: "bg-emerald-500" },
  ];
  return (
    <div className="space-y-3">
      {filas.map((f, i) => (
        <div key={f.nombre}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm text-gray-700 panel-oscuro:text-gray-300">{f.nombre}</p>
            <p className="text-sm font-bold tabular-nums text-gray-900 panel-oscuro:text-gray-100 shrink-0 text-right">
              {entero(f.valor)}
              {/* En el celular el porcentaje baja de renglón; al lado no entra. */}
              {i > 0 && f.pct !== null && (
                <span className="block sm:inline sm:ml-1.5 font-medium text-gray-400 panel-oscuro:text-gray-500">
                  {porcentaje(f.pct)} del anterior
                </span>
              )}
            </p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 panel-oscuro:bg-gray-800 overflow-hidden">
            <div className={`h-full rounded-full ${f.color}`} style={{ width: `${Math.min(100, (f.valor / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {visitas === 0 && (
        <p className="text-[12px] text-gray-400 panel-oscuro:text-gray-500">Todavía no entró nadie en este período.</p>
      )}
    </div>
  );
}

function Origenes({ filas }: { filas: { origen: keyof typeof NOMBRE_ORIGEN; visitas: number; pct: number }[] }) {
  if (filas.length === 0) {
    return <p className="text-[12.5px] text-gray-400 panel-oscuro:text-gray-500">Todavía no hay visitas con origen en este período.</p>;
  }
  const max = Math.max(1, ...filas.map((f) => f.visitas));
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => (
        <li key={f.origen}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm text-gray-700 panel-oscuro:text-gray-300">{NOMBRE_ORIGEN[f.origen]}</p>
            <p className="text-sm font-bold tabular-nums text-gray-900 panel-oscuro:text-gray-100 shrink-0">
              {entero(f.visitas)} <span className="font-medium text-gray-400 panel-oscuro:text-gray-500">{porcentaje(f.pct)}</span>
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 panel-oscuro:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${(f.visitas / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
