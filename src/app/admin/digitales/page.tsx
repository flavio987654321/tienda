import Link from "next/link";
import { BookOpen, AlertTriangle, Gift, Globe, ExternalLink } from "lucide-react";
import { fotoDeDigitales, necesitanAtencion, type CuentaDigital } from "@/lib/admin-digitales";
import { COMISION_DIGITAL } from "@/lib/planLimits";
import type { TierDigital } from "@/lib/planes-digitales";
import { topeDe } from "@/lib/productos-digitales";

export const dynamic = "force-dynamic";

/**
 * Productos Digitales, visto desde adentro.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ES UNA PANTALLA Y NO UNA FILA MÁS EN EL DASHBOARD
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Porque la plata entra distinto. En las tiendas todo lo que se cobra es la
 * suscripción; acá hay DOS ingresos que no se pueden sumar en un solo número:
 * lo fijo del plan y la comisión de cada venta. Una cuenta Free no paga un
 * peso de plan y puede ser la que más deja; una Pro puede pagar todos los
 * meses y no vender nada. Un contador solo tapa las dos cosas.
 *
 * Y porque el ecosistema era invisible: hasta este cambio una cuenta digital
 * no aparecía en ningún número del panel.
 *
 * ── Lo que esta pantalla NO hace ──────────────────────────────────────────
 *
 * No tiene gráficos. Hoy hay dos cuentas y cero ventas cobradas: un gráfico
 * de una línea en cero no informa nada y ocupa media pantalla. Cuando haya
 * meses para comparar, el gráfico va a tener algo que decir; hasta entonces
 * los números alcanzan y no mienten.
 *
 * No repite lo que ya está en Usuarios. Para banear, borrar o cambiarle el
 * plan a alguien se va a Usuarios, que es donde viven esas acciones — y desde
 * cada fila de acá hay un link directo a esa cuenta.
 */

const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0,
});
const FECHA = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

const PINTA_PLAN: Record<TierDigital, string> = {
  FREE: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  STARTER: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  PRO: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const PINTA_ESTADO: Record<string, string> = {
  TRIAL: "text-blue-400 bg-blue-500/10",
  ACTIVE: "text-emerald-400 bg-emerald-500/10",
  GRACE: "text-yellow-400 bg-yellow-500/10",
  EXPIRED: "text-red-400 bg-red-500/10",
  CANCELLED: "text-gray-400 bg-gray-500/10",
};
const NOMBRE_ESTADO: Record<string, string> = {
  TRIAL: "Prueba", ACTIVE: "Activa", GRACE: "Gracia", EXPIRED: "Vencida", CANCELLED: "Cancelada",
};

function Numero({ valor, titulo, detalle, acento }: {
  valor: string; titulo: string; detalle?: string; acento?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-black ${acento ?? "text-white"}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-gray-500">{detalle}</p>}
    </div>
  );
}

/**
 * Una cuenta en una lista de "mirá esto". Dice el qué y el cuándo.
 *
 * ⚠️ El link va con la búsqueda sola, SIN el filtro de digitales. Ese filtro
 * deja afuera a las cuentas baneadas, así que justo la fila que uno toca para
 * ir a ver qué pasa con una cuenta con problemas abría una lista vacía. Con la
 * búsqueda sola se cae siempre en la persona.
 */
function Renglon({ cuenta, cuando }: { cuenta: CuentaDigital; cuando: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <Link
        href={`/admin/usuarios?q=${encodeURIComponent(cuenta.email)}`}
        className="min-w-0 truncate text-gray-300 hover:text-white transition-colors"
      >
        {cuenta.nombre ?? cuenta.email}
      </Link>
      <span className="shrink-0 text-xs text-gray-500">{cuando}</span>
    </li>
  );
}

function Lista({ titulo, porque, children, vacia }: {
  titulo: string; porque: string; children: React.ReactNode; vacia: boolean;
}) {
  if (vacia) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-bold text-white">{titulo}</p>
        <p className="text-xs text-gray-500">{porque}</p>
      </div>
      <ul className="divide-y divide-white/5">{children}</ul>
    </div>
  );
}

export default async function AdminDigitalesPage() {
  const ahora = new Date();
  const foto = await fotoDeDigitales(ahora);
  const atencion = necesitanAtencion(foto.cuentas, ahora);
  const hayQueMirar = atencion.pruebaPorVencer.length > 0 || atencion.enGracia.length > 0
    || atencion.vencidas.length > 0 || atencion.dominioEnRiesgo.length > 0;
  const mes = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(foto.desde);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
          <BookOpen className="h-4 w-4 text-orange-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Productos Digitales</h1>
          <p className="text-gray-400 text-sm">
            Las cuentas del ecosistema, y lo que deja cada una. Los números del mes son de {mes}.
          </p>
        </div>
      </div>

      {/* ⚠️ Si alguna vez hay más cuentas que el tope, la pantalla lo dice. Un
          panel que muestra de menos sin avisar es peor que uno que no muestra. */}
      {foto.hayMas && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200">
            Hay más cuentas de las que entran en esta pantalla, así que estos números son de las
            primeras que se cargaron y no del total. Hay que pasar la cuenta del estado a la base
            antes de seguir usando esta pantalla para decidir.
          </p>
        </div>
      )}

      {/* Las cuentas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Numero titulo="Cuentas" valor={String(foto.cuentas.length)}
          detalle={`${foto.porPlan.FREE} Free · ${foto.porPlan.STARTER} Starter · ${foto.porPlan.PRO} Pro`} />
        <Numero titulo="En prueba" valor={String(foto.enPrueba)}
          detalle={foto.enPrueba > 0 ? "todavía no pagaron nada" : "ninguna probando ahora"}
          acento={foto.enPrueba > 0 ? "text-blue-400" : undefined} />
        <Numero titulo={`Fijo de ${mes}`} valor={PESOS.format(foto.fijoDelMes)}
          detalle="planes al día, el anual dividido por 12"
          acento={foto.fijoDelMes > 0 ? "text-emerald-400" : undefined} />
        <Numero titulo={`Comisión de ${mes}`} valor={PESOS.format(foto.comisionDelMes)}
          detalle={`${foto.ventasDelMes} venta${foto.ventasDelMes === 1 ? "" : "s"} · ${PESOS.format(foto.brutoDelMes)} vendidos`}
          acento={foto.comisionDelMes > 0 ? "text-emerald-400" : undefined} />
      </div>

      {/* ⚠️ Las regaladas se dicen SIEMPRE que haya alguna, y al lado del fijo.
          Un plan puesto a mano queda ACTIVE igual que uno pago: sin este
          renglón, el "fijo del mes" se infla solo con nuestras propias cuentas
          de prueba y nadie se entera de por qué. */}
      {foto.regaladas > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-white/10 bg-gray-900/60 px-4 py-3">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p className="text-xs text-gray-400">
            <span className="font-bold text-gray-300">
              {foto.regaladas} cuenta{foto.regaladas === 1 ? "" : "s"} con plan pago sin ningún pago registrado
            </span>
            {" "}— regaladas, de prueba o nuestras. No suman al fijo del mes, para que ese número
            sea plata que entró de verdad.
          </p>
        </div>
      )}

      {/* Lo que hay que mirar. Cada lista se borra sola cuando está vacía, así
          que el bloque entero se saca cuando no hay ninguna: si no, quedaba un
          hueco con margen en el medio de la pantalla sin nada adentro. */}
      <div className={`grid gap-3 md:grid-cols-2 ${hayQueMirar ? "mb-6" : ""}`}>
        <Lista titulo="Pruebas que se terminan" porque="Todavía se les puede escribir a tiempo."
          vacia={atencion.pruebaPorVencer.length === 0}>
          {atencion.pruebaPorVencer.map((c) => (
            <Renglon key={c.userId} cuenta={c} cuando={`vence el ${FECHA.format(c.trialEndsAt)}`} />
          ))}
        </Lista>

        <Lista titulo="En gracia" porque="Se les venció el plan y todavía no perdieron nada."
          vacia={atencion.enGracia.length === 0}>
          {atencion.enGracia.map((c) => (
            <Renglon key={c.userId} cuenta={c}
              cuando={c.currentPeriodEnd ? `venció el ${FECHA.format(c.currentPeriodEnd)}` : "sin fecha"} />
          ))}
        </Lista>

        <Lista titulo="Vencidas" porque="Ya perdieron las funciones del plan que pagaban."
          vacia={atencion.vencidas.length === 0}>
          {atencion.vencidas.map((c) => (
            <Renglon key={c.userId} cuenta={c}
              cuando={c.currentPeriodEnd ? `desde el ${FECHA.format(c.currentPeriodEnd)}` : "sin fecha"} />
          ))}
        </Lista>

        <Lista titulo="Dominios por soltarse" porque="Cayeron a Free y su dominio propio tiene fecha de corte."
          vacia={atencion.dominioEnRiesgo.length === 0}>
          {atencion.dominioEnRiesgo.map(({ cuenta, dias }) => (
            <Renglon key={cuenta.userId} cuenta={cuenta}
              cuando={dias <= 0 ? "se suelta en el próximo cron" : `en ${dias} día${dias === 1 ? "" : "s"}`} />
          ))}
        </Lista>
      </div>

      {/* La tabla */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5">
          <p className="text-sm font-bold text-white">Las cuentas</p>
          <p className="text-xs text-gray-500">Primero la que más comisión dejó este mes.</p>
        </div>

        {foto.cuentas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Todavía no hay ninguna cuenta de Productos Digitales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 text-left font-semibold">Cuenta</th>
                  <th className="px-5 py-3 text-left font-semibold">Plan</th>
                  <th className="px-5 py-3 text-right font-semibold">Páginas</th>
                  <th className="px-5 py-3 text-right font-semibold">Ventas del mes</th>
                  <th className="px-5 py-3 text-right font-semibold">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {foto.cuentas.map((c) => (
                  <tr key={c.userId} className={c.banned ? "bg-red-950/20" : "hover:bg-white/[0.02] transition-colors"}>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/usuarios?q=${encodeURIComponent(c.email)}`}
                        className="group inline-flex items-center gap-1.5"
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${c.banned ? "text-red-400 line-through" : "text-white"}`}>
                            {c.nombre ?? "—"}
                          </span>
                          <span className="block text-xs text-gray-600">{c.email}</span>
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-gray-700 group-hover:text-gray-400 transition-colors" />
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${PINTA_PLAN[c.tier]}`}>
                          {c.tier === "FREE" ? "Free" : c.tier === "STARTER" ? "Starter" : "Pro"}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PINTA_ESTADO[c.estado]}`}>
                          {NOMBRE_ESTADO[c.estado]}
                        </span>
                        {/* La comisión que le cobramos a ESTA cuenta hoy. Es el
                            dato que explica por qué dos cuentas con las mismas
                            ventas dejan distinto. */}
                        <span className="text-[11px] text-gray-500">{COMISION_DIGITAL[c.tier]}%</span>
                        {c.tier !== "FREE" && c.estado === "ACTIVE" && !c.pago && (
                          <span title="Plan puesto a mano: no hay ningún pago registrado">
                            <Gift className="h-3 w-3 text-gray-600" />
                          </span>
                        )}
                        {c.freeDesde && (
                          <span title={`Cayó a Free el ${FECHA.format(c.freeDesde)}`}>
                            <Globe className="h-3 w-3 text-gray-600" />
                          </span>
                        )}
                      </div>
                    </td>
                    {/* ⚠️ El segundo número es EL TOPE DEL PLAN, no lo que
                        tiene cargado. Antes era "publicadas / cargadas", y
                        "1 / 1" se lee solo de una manera: "usa 1 de la 1 que
                        puede". Justo en la columna de al lado del plan, eso
                        hacía parecer que Pro permite una sola página. Lo que
                        tiene cargado va abajo, con todas las letras. */}
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                      <span className={c.publicados > 0 ? "text-white" : "text-gray-500"}>{c.publicados}</span>
                      <span className="text-gray-600"> / {topeDe(c.tier, "PRINCIPAL")}</span>
                      <span className="block text-[11px] text-gray-600">
                        publicadas · {c.productos} cargada{c.productos === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                      <span className="text-white">{c.ventasDelMes}</span>
                      <span className="block text-[11px] text-gray-600">{PESOS.format(c.brutoDelMes)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums">
                      <span className={c.comisionDelMes > 0 ? "font-bold text-emerald-400" : "text-gray-500"}>
                        {PESOS.format(c.comisionDelMes)}
                      </span>
                      <span className="block text-[11px] text-gray-600">
                        {PESOS.format(c.comisionTotal)} en total
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
