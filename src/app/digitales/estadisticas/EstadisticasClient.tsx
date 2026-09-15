import Link from "next/link";
import { Lock, ArrowRight, TrendingUp, Receipt, Wallet, Percent, Download, Undo2, PackagePlus, Mail, Users, Smartphone, FileDown, Lightbulb } from "lucide-react";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import {
  puedeVer, DESDE_QUE_PLAN, RANGOS, NOMBRE_RANGO,
  type Estadisticas, type Bloque,
} from "@/lib/estadisticas-digitales";
import { NOMBRE_ORIGEN } from "@/lib/origen-visita";
import { consejoPara, type BloqueConConsejo } from "@/lib/consejos-estadisticas";
import { NOMBRE_MEDIO, OTRAS, PARAMETROS_PARA_META } from "@/lib/utm-digital";
import BotonCopiar from "../ventas/BotonCopiar";
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
  vista: Vista;
};

export const VISTAS = ["general", "campanias"] as const;
export type Vista = (typeof VISTAS)[number];
const NOMBRE_VISTA: Record<Vista, string> = { general: "General", campanias: "Campañas" };

export function esVista(v: unknown): v is Vista {
  return typeof v === "string" && (VISTAS as readonly string[]).includes(v);
}

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const entero = (n: number) => new Intl.NumberFormat("es-AR").format(n);
const porcentaje = (n: number | null) =>
  n === null ? "—" : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n)} %`;

export default function EstadisticasClient({ tier, principales, elegido, datos, recortado, vista }: Props) {
  const { rango, kpis, serie, embudo, porProducto, origenes, posventa, cuando, dispositivos, carritos, campanias } = datos;
  const href = (cambios: { p?: string | null; rango?: string; vista?: Vista }) => {
    const q = new URLSearchParams();
    const prod = cambios.p === undefined ? elegido : cambios.p;
    const r = cambios.rango ?? rango.clave;
    const v = cambios.vista ?? vista;
    if (v !== "general") q.set("vista", v);
    if (prod) q.set("p", prod);
    if (r !== "30") q.set("rango", r);
    const s = q.toString();
    return `/digitales/estadisticas${s ? `?${s}` : ""}`;
  };

  const veVisitas = puedeVer(tier, "visitas");
  const nombreDelElegido = principales.find((p) => p.id === elegido)?.name ?? null;
  /* Hay algo que exportar en la solapa que se mira: en General, alguna venta,
     devolución o visita; en Campañas, alguna visita o venta con etiqueta. */
  const hayQueExportar = vista === "general"
    ? kpis.ventas + kpis.devueltas + kpis.visitas > 0
    : campanias.kpis.visitas + campanias.kpis.ventas + origenes.conocidas > 0;

  return (
    <div className="space-y-4">
      {/* ── Las dos solapas ───────────────────────────────────────────────────
          General contesta "¿vendí, y la página funciona?"; Campañas contesta
          "¿me rinde el anuncio?". Son dos personas distintas mirando —o la misma
          en dos momentos— y en una sola página larga se pisaban. Van como
          solapas y no como dos entradas de la barra lateral: la barra es un
          riel de íconos y un árbol adentro serían dos íconos sin nombre. */}
      <div className="flex items-end gap-1 border-b border-gray-200 panel-oscuro:border-gray-800">
        {(Object.keys(NOMBRE_VISTA) as Vista[]).map((v) => (
          <Link
            key={v}
            href={href({ vista: v })}
            aria-current={vista === v ? "page" : undefined}
            className={`-mb-px px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              vista === v
                ? "border-orange-600 text-orange-700 panel-oscuro:text-orange-400"
                : "border-transparent text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-800 panel-oscuro:hover:text-gray-200"
            }`}
          >
            {NOMBRE_VISTA[v]}
          </Link>
        ))}
        {/* Exportar la solapa que se está mirando, como planilla. Un enlace a la
            ruta —el navegador baja el archivo— con la misma consulta que la
            pantalla. Con candado en Free (y en Starter para Campañas): la regla
            es la de `DESDE_QUE_PLAN`, la ruta la vuelve a mirar. Y apagado si
            en este rango no hay nada: una planilla vacía parece un error. El
            candado manda sobre el apagado. */}
        {puedeVer(tier, "exportar") && (vista === "general" || puedeVer(tier, "campanias")) && !hayQueExportar ? (
          <span
            aria-disabled="true"
            title="Nada para exportar en este período"
            className="ml-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-800 px-2.5 py-1.5 text-[12px] font-semibold text-gray-300 panel-oscuro:text-gray-600"
          >
            <FileDown className="h-3.5 w-3.5" /> Exportar
          </span>
        ) : puedeVer(tier, "exportar") && (vista === "general" || puedeVer(tier, "campanias")) ? (
          <a
            href={`/api/digitales/estadisticas/exportar?${new URLSearchParams({ vista, ...(elegido ? { p: elegido } : {}), rango: rango.clave }).toString()}`}
            className="ml-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-400"
          >
            <FileDown className="h-3.5 w-3.5" /> Exportar
          </a>
        ) : (
          <Link
            href="/digitales/mi-cuenta"
            aria-label={`Exportar: disponible desde ${COPY_DIGITAL[vista === "campanias" ? DESDE_QUE_PLAN.campanias : DESDE_QUE_PLAN.exportar].nombre}`}
            className="ml-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 panel-oscuro:border-gray-700 px-2.5 py-1.5 text-[12px] font-semibold text-gray-400 panel-oscuro:text-gray-500"
          >
            <Lock className="h-3.5 w-3.5 text-orange-500" /> Exportar<span className="hidden sm:inline"> · desde {COPY_DIGITAL[vista === "campanias" ? DESDE_QUE_PLAN.campanias : DESDE_QUE_PLAN.exportar].nombre}</span>
          </Link>
        )}
      </div>

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

      {vista === "general" && (<>
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
            <Tarjeta titulo="Visitas" bajada={pieDeSerie(serie.grano, kpis.visitas, "visitas")} consejo={{ bloque: "visitas", datos }}>
              <Grafico puntos={serie.visitas} color="#ea580c" />
              {dispositivos.pctMovil !== null && (
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
                  <Smartphone className="h-3.5 w-3.5 text-orange-500" />
                  {porcentaje(dispositivos.pctMovil)} desde el celular · {porcentaje(100 - dispositivos.pctMovil)} desde una computadora.
                </p>
              )}
            </Tarjeta>
          ) : (
            <Bloqueado bloque="visitas">
              <Tarjeta titulo="Visitas" bajada="Cuánta gente entra a tu página cada día.">
                <Grafico puntos={muestra(serie.ventas.length, 40)} color="#ea580c" />
              </Tarjeta>
            </Bloqueado>
          )}
          <Tarjeta titulo="Ventas" bajada={pieDeSerie(serie.grano, kpis.ventas, "ventas")} consejo={{ bloque: "ventas", datos }}>
            <Grafico puntos={serie.ventas} color="#059669" />
          </Tarjeta>
        </div>

        {/* ── Después de la venta ────────────────────────────────────────────────
            Lo que pasa con el que ya pagó. Es de todos los planes: Free también
            vende y también tiene que atender al que compró. */}
        <Tarjeta titulo="Después de la venta" bajada="Qué pasó con cada compra una vez cobrada." consejo={{ bloque: "posventa", datos }}>
          <Posventa p={posventa} />
        </Tarjeta>

        {/* ── Cuándo se vende ────────────────────────────────────────────────── */}
        {puedeVer(tier, "cuando") ? (
          <Tarjeta titulo="Cuándo se vende" bajada="En qué día y a qué hora cierran las compras. Sirve para elegir cuándo publicar o cuándo correr un anuncio." consejo={{ bloque: "cuando", datos }}>
            <CuandoSeVende c={cuando} />
          </Tarjeta>
        ) : (
          <Bloqueado bloque="cuando">
            <Tarjeta titulo="Cuándo se vende" bajada="En qué día y a qué hora cierran las compras.">
              <CuandoSeVende c={{ porDiaSemana: [6, 3, 4, 5, 4, 7, 9], porHora: muestra(24, 6).map((p) => p.value) }} />
            </Tarjeta>
          </Bloqueado>
        )}

        {/* ── El embudo ──────────────────────────────────────────────────────── */}
        {puedeVer(tier, "embudo") ? (
          <Tarjeta titulo="Embudo" bajada="De los que entraron, cuántos quisieron pagar y cuántos pagaron." consejo={{ bloque: "embudo", datos }}>
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
          <Tarjeta titulo="Por producto" bajada="Cuál de tus páginas anda." consejo={{ bloque: "porProducto", datos }}>
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

        {/* ── Carritos recuperados por el mail automático ─────────────────────
            El mail es de Pro, así que el número que lo mide también. */}
        {puedeVer(tier, "carritos") ? (
          <Tarjeta titulo="Carritos recuperados" bajada="Compras que quedaron en la puerta, a cuántas les escribió el mail automático y cuántas volvieron a pagar." consejo={{ bloque: "carritos", datos }}>
            <CarritosDibujados c={carritos} />
          </Tarjeta>
        ) : (
          <Bloqueado bloque="carritos">
            <Tarjeta titulo="Carritos recuperados" bajada="Compras que quedaron en la puerta, a cuántas les escribió el mail automático y cuántas volvieron a pagar.">
              <CarritosDibujados c={{ abandonados: 31, recordados: 28, recuperados: 6, pctRecuperados: 21.4 }} />
            </Tarjeta>
          </Bloqueado>
        )}
      </>)}

      {vista === "campanias" && (<>
        {/* ── Los números de la solapa, siempre a la vista ──────────────────────
            En cero también: una solapa que sólo dice "todavía no hay nada" parece
            rota; con los cuatro números en cero parece lo que es, esperando datos.
            Son sólo lo que vino ETIQUETADO: visitas con campaña y ventas con
            campaña. Lo que no trae etiqueta está en General. */}
        {puedeVer(tier, "campanias") ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Numero Icon={TrendingUp} titulo="Visitas con campaña" valor={entero(campanias.kpis.visitas)} pie={kpis.visitas > 0 ? `de ${entero(kpis.visitas)} visitas en total` : "de las que traen etiqueta"} />
            <Numero Icon={Receipt} titulo="Ventas atribuidas" valor={entero(campanias.kpis.ventas)} pie={kpis.ventas > 0 ? `de ${entero(kpis.ventas)} ventas en total` : "a alguna campaña"} />
            <Numero Icon={Wallet} titulo="Te quedó por campañas" valor={plata(campanias.kpis.neto)} pie="después de la comisión" destacado />
            <Numero Icon={Percent} titulo="Conversión" valor={porcentaje(campanias.kpis.conversion)} pie={campanias.kpis.ticket !== null ? `ticket ${plata(campanias.kpis.ticket)}` : "de las visitas con campaña"} />
          </div>
        ) : (
          <Bloqueado bloque="campanias" compacto>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Numero Icon={TrendingUp} titulo="Visitas con campaña" valor="310" pie="de 620 visitas en total" />
              <Numero Icon={Receipt} titulo="Ventas atribuidas" valor="8" pie="de 11 ventas en total" />
              <Numero Icon={Wallet} titulo="Te quedó por campañas" valor="$ 104.000" pie="después de la comisión" destacado />
              <Numero Icon={Percent} titulo="Conversión" valor="2,6 %" pie="ticket $ 13.000" />
            </div>
          </Bloqueado>
        )}

        {/* ── De dónde vinieron: visitas Y ventas ─────────────────────────────── */}
        {puedeVer(tier, "origenes") ? (
          <Tarjeta
            titulo="De dónde vienen"
            consejo={{ bloque: "origenes", datos }}
            bajada={
              origenes.conocidas > 0
                ? `El embudo de cada canal: cuántos entraron, cuántos abrieron el pago y cuántos pagaron. Agregá ?utm_source=instagram (o whatsapp, facebook, email…) al link que compartís y quedan anotadas ahí.${origenes.ventasSinOrigen > 0 ? ` ${entero(origenes.ventasSinOrigen)} ${origenes.ventasSinOrigen === 1 ? "venta no tiene" : "ventas no tienen"} origen anotado.` : ""}`
                : "Agregá ?utm_source=instagram (o whatsapp, facebook, email…) al link que compartís, y cada visita y cada venta quedan anotadas con su canal."
            }
          >
            <Origenes filas={origenes.filas} />
          </Tarjeta>
        ) : (
          <Bloqueado bloque="origenes">
            <Tarjeta titulo="De dónde vienen" bajada="Instagram, WhatsApp, un anuncio, un mail: qué canal trae las visitas y cuál trae las ventas.">
              <Origenes filas={[
                { origen: "instagram", visitas: 120, pct: 48, checkouts: 18, ventas: 5, neto: 65000, pctCheckout: 15, conversion: 4.2, porProducto: [] },
                { origen: "whatsapp", visitas: 70, pct: 28, checkouts: 12, ventas: 4, neto: 52000, pctCheckout: 17.1, conversion: 5.7, porProducto: [] },
                { origen: "facebook", visitas: 35, pct: 14, checkouts: 2, ventas: 0, neto: 0, pctCheckout: 5.7, conversion: 0, porProducto: [] },
                { origen: "directo", visitas: 25, pct: 10, checkouts: 3, ventas: 1, neto: 13000, pctCheckout: 12, conversion: 4, porProducto: [] },
              ]} />
            </Tarjeta>
          </Bloqueado>
        )}

        {/* ── Campañas: qué anuncio vende ───────────────────────────────────────
            El escalón de abajo de "De dónde vienen". Para el que paga publicidad
            es la tabla que le dice qué anuncio apagar. Con el texto para pegar en
            Meta arriba, porque sin eso nadie arma las etiquetas a mano. */}
        {puedeVer(tier, "campanias") ? (
          <Tarjeta
            titulo="Campañas"
            bajada="Qué campaña y qué anuncio traen visitas, y cuáles terminan en venta. Se arma con las etiquetas UTM del link."
            consejo={{ bloque: "campanias", datos }}
          >
            <ParaMeta />
            <PorMedio filas={campanias.porMedio} />
            <Campanias filas={campanias.filas} conVisitas={campanias.conVisitas} ventasConCampania={campanias.ventasConCampania} ventas={kpis.ventas} />
          </Tarjeta>
        ) : (
          <Bloqueado bloque="campanias">
            <Tarjeta titulo="Campañas" bajada="Qué campaña y qué anuncio traen visitas, y cuáles terminan en venta.">
              <ParaMeta />
              <PorMedio filas={[
                { medio: "pago", nombre: "Anuncio pago", visitas: 220, ventas: 6, neto: 78000, conversion: 2.7, porProducto: [] },
                { medio: "historia", nombre: "Historia", visitas: 90, ventas: 2, neto: 26000, conversion: 2.2, porProducto: [] },
              ]} />
              <Campanias
                ventas={9}
                conVisitas={310}
                ventasConCampania={8}
                filas={[
                  { medio: "pago", campania: "lanzamiento", productId: null, producto: null, visitas: 220, ventas: 6, neto: 78000, conversion: 2.7, anuncios: [
                    { anuncio: "video 2", visitas: 140, ventas: 5, neto: 65000, conversion: 3.6 },
                    { anuncio: "foto", visitas: 80, ventas: 1, neto: 13000, conversion: 1.3 },
                  ] },
                  { medio: "historia", campania: "promo septiembre", productId: null, producto: null, visitas: 90, ventas: 2, neto: 26000, conversion: 2.2, anuncios: [
                    { anuncio: "", visitas: 90, ventas: 2, neto: 26000, conversion: 2.2 },
                  ] },
                ]}
              />
            </Tarjeta>
          </Bloqueado>
        )}

      </>)}
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

/**
 * Una tarjeta con título, bajada y, abajo, el consejo del bloque. El consejo lo
 * elige `consejoPara` mirando los datos: sin datos explica para qué sirve el
 * bloque, con datos dice qué hacer con ellos. Los bloques bloqueados no lo
 * llevan: se los pasa borrosos y con números de muestra, y un consejo sobre
 * números de muestra sería una mentira.
 */
function Tarjeta({ titulo, bajada, consejo, children }: {
  titulo: string; bajada: string; consejo?: { bloque: BloqueConConsejo; datos: Estadisticas }; children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{titulo}</p>
      <p className="mt-0.5 mb-4 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">{bajada}</p>
      {children}
      {consejo && <Consejo {...consejoPara(consejo.bloque, consejo.datos)} />}
    </div>
  );
}

/** El consejo al pie de una tarjeta: una lamparita, el texto y, si hay, a dónde ir. */
function Consejo({ texto, accion }: { texto: string; accion?: { texto: string; href: string } }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50/70 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/20 px-3.5 py-3">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      <p className="text-[12.5px] leading-relaxed text-amber-950 panel-oscuro:text-amber-100/90">
        {texto}
        {accion && (
          <>
            {" "}
            <Link href={accion.href} className="inline-flex items-center gap-0.5 font-bold text-orange-700 panel-oscuro:text-orange-400 hover:underline">
              {accion.texto} <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </p>
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
    <div className="relative h-full">
      <div className="h-full pointer-events-none select-none blur-[3px] opacity-60" aria-hidden="true">{children}</div>
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
function Grafico({ puntos, color, todasLasEtiquetas = false }: { puntos: Punto[]; color: string; todasLasEtiquetas?: boolean }) {
  const W = 600, H = 180, PIE = 24, ARRIBA = 6;
  const max = Math.max(1, ...puntos.map((p) => p.value));
  const n = Math.max(1, puntos.length);
  const paso = W / n;
  const ancho = Math.max(2, Math.min(paso * 0.7, 28));
  /* Una etiqueta cada tantos puntos para que no se pisen; con pocas barras
     —los siete días de la semana— van todas, y los puntos sin etiqueta la
     traen vacía. */
  const cadaCuanto = todasLasEtiquetas ? 1 : Math.max(1, Math.ceil(n / 7));
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

/**
 * Cada canal con su embudo: entraron → abrieron el pago → pagaron. Las tres
 * barras van sobre la misma escala (el canal con más visitas llena la suya),
 * así que a simple vista se ve dónde se cae cada canal: Instagram trae mucho
 * y pocos abren el pago; WhatsApp trae menos y casi todos pagan.
 */
function Origenes({ filas }: { filas: Estadisticas["origenes"]["filas"] }) {
  if (filas.length === 0) {
    return <p className="text-[12.5px] text-gray-400 panel-oscuro:text-gray-500">Todavía no hay visitas con origen en este período.</p>;
  }
  const max = Math.max(1, ...filas.map((f) => f.visitas));
  const ancho = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <ul className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
      {filas.map((f) => (
        <li key={f.origen} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <p className="text-sm font-semibold text-gray-800 panel-oscuro:text-gray-200">{NOMBRE_ORIGEN[f.origen]}</p>
            <p className="text-[12px] tabular-nums text-gray-500 panel-oscuro:text-gray-400 shrink-0">{porcentaje(f.pct)} de las visitas</p>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="text-gray-500 panel-oscuro:text-gray-400">Entraron</span>
            <div className="h-2 rounded-full bg-gray-100 panel-oscuro:bg-gray-800 overflow-hidden"><div className="h-full rounded-full bg-orange-500" style={{ width: ancho(f.visitas) }} /></div>
            <span className="tabular-nums font-semibold text-gray-900 panel-oscuro:text-gray-100 text-right min-w-[8ch]">{entero(f.visitas)}</span>
            <span className="text-gray-500 panel-oscuro:text-gray-400">Al pago</span>
            <div className="h-2 rounded-full bg-gray-100 panel-oscuro:bg-gray-800 overflow-hidden"><div className="h-full rounded-full bg-amber-500" style={{ width: ancho(f.checkouts) }} /></div>
            <span className="tabular-nums text-gray-700 panel-oscuro:text-gray-300 text-right min-w-[8ch]">{entero(f.checkouts)}{f.pctCheckout !== null ? <span className="text-gray-400 panel-oscuro:text-gray-500"> · {porcentaje(f.pctCheckout)}</span> : null}</span>
            <span className="text-gray-500 panel-oscuro:text-gray-400">Pagaron</span>
            <div className="h-2 rounded-full bg-gray-100 panel-oscuro:bg-gray-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: ancho(f.ventas) }} /></div>
            <span className="tabular-nums text-gray-700 panel-oscuro:text-gray-300 text-right min-w-[8ch]">{entero(f.ventas)}{f.conversion !== null ? <span className="text-gray-400 panel-oscuro:text-gray-500"> · {porcentaje(f.conversion)}</span> : null}</span>
          </div>
          {f.ventas > 0 && (
            <p className="mt-1.5 text-right text-[12px] text-gray-500 panel-oscuro:text-gray-400">
              Te quedó <span className="font-semibold text-gray-800 panel-oscuro:text-gray-200">{plata(f.neto)}</span> por este canal.
            </p>
          )}
          <Reparto filas={f.porProducto} />
        </li>
      ))}
    </ul>
  );
}

/** Un número chico con su título y su pie, para las filas de "Después de la venta". */
function Dato({ Icon, titulo, valor, pie, alerta = false }: { Icon: React.ElementType; titulo: string; valor: string; pie: string; alerta?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-gray-50/60 panel-oscuro:bg-gray-800/40 p-3.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${alerta ? "text-amber-500" : "text-orange-500"}`} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">{titulo}</p>
      </div>
      <p className="mt-1 text-lg font-black tabular-nums text-gray-900 panel-oscuro:text-gray-100 [overflow-wrap:anywhere]">{valor}</p>
      <p className={`mt-0.5 text-[12px] leading-snug ${alerta ? "text-amber-700 panel-oscuro:text-amber-400" : "text-gray-500 panel-oscuro:text-gray-400"}`}>{pie}</p>
    </div>
  );
}

/**
 * Qué pasó con cada compra una vez cobrada. Las descargas se cuentan por
 * compra: el que pagó y no bajó es el que va a escribir "no me llegó" o pedir
 * la devolución, y es el número que hay que mirar primero.
 */
function Posventa({ p }: { p: Estadisticas["posventa"] }) {
  const d = p.descargas;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Dato
        Icon={Download}
        titulo="Bajaron el archivo"
        valor={d.conPermiso > 0 ? porcentaje(d.pctBajaron) : "—"}
        pie={
          d.conPermiso === 0
            ? "todavía sin compras"
            : d.sinBajar === 0
              ? `${entero(d.bajaron)} de ${entero(d.conPermiso)} compras`
              : `${entero(d.sinBajar)} ${d.sinBajar === 1 ? "compra sin bajar" : "compras sin bajar"}${d.vencidosSinBajar > 0 ? `, ${entero(d.vencidosSinBajar)} ya ${d.vencidosSinBajar === 1 ? "vencida" : "vencidas"}` : ""}`
        }
        alerta={d.vencidosSinBajar > 0}
      />
      <Dato
        Icon={Undo2}
        titulo="Devoluciones"
        valor={p.devoluciones.tasa === null ? "—" : porcentaje(p.devoluciones.tasa)}
        pie={
          p.devoluciones.total === 0
            ? "ninguna en el período"
            : `${entero(p.devoluciones.arrepentimiento)} por arrepentimiento, ${entero(p.devoluciones.contracargo)} por contracargo`
        }
        alerta={p.devoluciones.contracargo > 0}
      />
      <Dato
        Icon={PackagePlus}
        titulo="Llevaron el upsell"
        valor={p.upsell.pct === null ? "—" : porcentaje(p.upsell.pct)}
        pie={p.upsell.ventas > 0 ? `${plata(p.upsell.plata)} extra en ${entero(p.upsell.ventas)} ${p.upsell.ventas === 1 ? "compra" : "compras"}` : "ninguna compra lo llevó"}
      />
      <Dato
        Icon={Mail}
        titulo="Mail de entrega"
        valor={p.mails.enviados + p.mails.fallados === 0 ? "—" : entero(p.mails.enviados)}
        pie={p.mails.fallados > 0 ? `${entero(p.mails.fallados)} ${p.mails.fallados === 1 ? "falló" : "fallaron"}: revisá esas ventas` : p.mails.enviados > 0 ? "salieron todos" : "todavía sin compras"}
        alerta={p.mails.fallados > 0}
      />
      <div className="col-span-2 lg:col-span-4 flex items-center gap-2 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
        <Users className="h-3.5 w-3.5 text-orange-500 shrink-0" />
        {p.compradores.unicos === 0
          ? "Todavía no hay compradores en este período."
          : `${entero(p.compradores.unicos)} ${p.compradores.unicos === 1 ? "comprador" : "compradores"} distintos; ${entero(p.compradores.repiten)} ${p.compradores.repiten === 1 ? "compró" : "compraron"} más de una vez.`}
      </div>
    </div>
  );
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** En qué día y a qué hora cierran las compras: dos gráficos de barras. */
function CuandoSeVende({ c }: { c: Estadisticas["cuando"] }) {
  const total = c.porDiaSemana.reduce((s, n) => s + n, 0);
  /* Los días arrancan el lunes, que es como se lee una semana acá. */
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const porDia: Punto[] = orden.map((i) => ({ dia: String(i), label: DIAS_CORTOS[i], value: c.porDiaSemana[i] }));
  const porHora: Punto[] = c.porHora.map((v, h) => ({ dia: String(h), label: h % 3 === 0 ? `${h} h` : "", value: v }));
  if (total === 0) {
    return <p className="text-[12.5px] text-gray-400 panel-oscuro:text-gray-500">Todavía no hay ventas en este período.</p>;
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500 mb-1">Por día de la semana</p>
        <Grafico puntos={porDia} color="#ea580c" todasLasEtiquetas />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500 mb-1">Por hora</p>
        <Grafico puntos={porHora} color="#ea580c" todasLasEtiquetas />
      </div>
    </div>
  );
}

/**
 * El texto para pegar en Meta. Meta reemplaza los dos comodines por el nombre
 * real de la campaña y del anuncio, así que se pega una vez y listo. Va con
 * botón de copiar: es largo y con llaves, a mano se escribe mal.
 */
function ParaMeta() {
  return (
    <div className="mb-4 rounded-2xl border border-orange-100 panel-oscuro:border-orange-500/20 bg-orange-50/60 panel-oscuro:bg-orange-500/10 p-3.5">
      <p className="text-[12.5px] font-bold text-gray-800 panel-oscuro:text-gray-200">Si hacés anuncios en Meta, pegá esto una sola vez</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
        En cada anuncio: <strong>Seguimiento → Parámetros de URL</strong>. Meta completa solo el nombre de la campaña y del
        anuncio, y acá aparece cuál vendió. Para un posteo o un mensaje, agregale al link{" "}
        <code className="rounded bg-white panel-oscuro:bg-gray-900 px-1 break-all">?utm_source=instagram&utm_campaign=promo</code>.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-3 py-2 text-[11.5px] text-gray-700 panel-oscuro:text-gray-300">
          {PARAMETROS_PARA_META}
        </code>
        <BotonCopiar valor={PARAMETROS_PARA_META} que="los parámetros para Meta" />
      </div>
    </div>
  );
}

/**
 * Por medio: pago, orgánico, mail, historia. Es la primera pregunta de quien
 * paga anuncios —¿lo pago rinde más que lo gratis?— y va antes del detalle por
 * campaña. Chips, no tabla: son cuatro o cinco cosas.
 */
function PorMedio({ filas }: { filas: Estadisticas["campanias"]["porMedio"] }) {
  if (filas.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500 mb-2">Por medio</p>
      <div className="flex flex-wrap gap-2">
        {filas.map((m) => (
          <div key={m.medio} className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-gray-50/60 panel-oscuro:bg-gray-800/40 px-3.5 py-2.5 min-w-[150px]">
            <p className="text-[12.5px] font-bold text-gray-800 panel-oscuro:text-gray-200">{m.nombre}</p>
            <p className="text-[12px] tabular-nums text-gray-600 panel-oscuro:text-gray-400">
              {entero(m.visitas)} visitas · {entero(m.ventas)} {m.ventas === 1 ? "venta" : "ventas"}{m.conversion !== null ? ` · ${porcentaje(m.conversion)}` : ""}
            </p>
            {m.ventas > 0 && <p className="text-[12px] font-semibold tabular-nums text-gray-900 panel-oscuro:text-gray-100">{plata(m.neto)}</p>}
            <Reparto filas={m.porProducto} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Las campañas, y adentro sus anuncios. Una campaña sin anuncio distinguido no repite la fila. */
function Campanias({ filas, conVisitas, ventasConCampania, ventas }: {
  filas: Estadisticas["campanias"]["filas"]; conVisitas: number; ventasConCampania: number; ventas: number;
}) {
  if (filas.length === 0) {
    return (
      <p className="text-[12.5px] text-gray-400 panel-oscuro:text-gray-500">
        Todavía no llegó ninguna visita con campaña en este período.
      </p>
    );
  }
  const sinCampania = ventas - ventasConCampania;
  return (
    <div>
      <p className="mb-3 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
        {entero(conVisitas)} {conVisitas === 1 ? "visita vino" : "visitas vinieron"} con campaña
        {sinCampania > 0 ? ` · ${entero(sinCampania)} ${sinCampania === 1 ? "venta no tiene" : "ventas no tienen"} campaña anotada` : ""}.
      </p>
      {/* Ancho mínimo y números sin cortar: en el celular la tabla desplaza de
          costado en vez de apretarse hasta que las columnas se pisan. */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[540px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
              <th className="pb-2 font-bold">Campaña · anuncio</th>
              <th className="pb-2 pl-3 font-bold text-right">Visitas</th>
              <th className="pb-2 pl-3 font-bold text-right">Ventas</th>
              <th className="pb-2 pl-3 font-bold text-right">Conv.</th>
              <th className="pb-2 pl-3 font-bold text-right">Te quedó</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {filas.map((f) => {
              /* Si la campaña tiene un solo anuncio y es el vacío, la fila de la
                 campaña ya lo dice todo. */
              const conAnuncios = f.anuncios.some((a) => a.anuncio !== "") || f.anuncios.length > 1;
              return [
                <tr key={`${f.medio}\u0000${f.campania}\u0000${f.productId ?? ""}`} className="text-gray-900 panel-oscuro:text-gray-100 font-semibold">
                  <td className="py-2.5 pr-3 max-w-[260px]">
                    <span className="block truncate">{f.campania === OTRAS ? "Otras campañas" : f.campania}</span>
                    {/* En "Todos" con varios productos, cada campaña dice de qué
                        página es: la misma etiqueta en dos páginas son dos filas. */}
                    <span className="block truncate text-[11px] font-medium text-gray-400 panel-oscuro:text-gray-500">
                      {NOMBRE_MEDIO[f.medio]}{f.producto ? <> · <span className="text-orange-700 panel-oscuro:text-orange-400">{f.producto}</span></> : null}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{entero(f.visitas)}</td>
                  <td className="py-2.5 text-right tabular-nums">{entero(f.ventas)}</td>
                  <td className="py-2.5 text-right tabular-nums">{porcentaje(f.conversion)}</td>
                  <td className="py-2.5 text-right tabular-nums">{plata(f.neto)}</td>
                </tr>,
                ...(conAnuncios
                  ? f.anuncios.map((a) => (
                      <tr key={`${f.medio}\u0000${f.campania}\u0000${f.productId ?? ""}\u0000${a.anuncio}`} className="text-gray-600 panel-oscuro:text-gray-400">
                        <td className="py-2 pl-4 pr-3 max-w-[260px]">
                          <span className="block truncate">↳ {a.anuncio || "sin anuncio"}</span>
                        </td>
                        <td className="py-2 text-right tabular-nums">{entero(a.visitas)}</td>
                        <td className="py-2 text-right tabular-nums">{entero(a.ventas)}</td>
                        <td className="py-2 text-right tabular-nums">{porcentaje(a.conversion)}</td>
                        <td className="py-2 text-right tabular-nums">{plata(a.neto)}</td>
                      </tr>
                    ))
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Cuánto de un canal o un medio fue a cada producto. Sólo llega con filas
 * mirando "Todos" con más de un producto (ver `Reparto` en la cuenta); con uno, o
 * con uno elegido, no se dibuja nada.
 */
function Reparto({ filas }: { filas: Estadisticas["origenes"]["filas"][number]["porProducto"] }) {
  if (filas.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
      {filas.map((r) => (
        <li key={r.productId} className="tabular-nums">
          <span className="font-semibold text-gray-700 panel-oscuro:text-gray-300">{r.producto}</span>
          {" "}{entero(r.visitas)} {r.visitas === 1 ? "visita" : "visitas"} · {entero(r.ventas)} {r.ventas === 1 ? "venta" : "ventas"}
          {r.ventas > 0 ? <> · {plata(r.neto)}</> : null}
        </li>
      ))}
    </ul>
  );
}

function CarritosDibujados({ c }: { c: Estadisticas["carritos"] }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <Dato Icon={Receipt} titulo="Quedaron en la puerta" valor={entero(c.abandonados)} pie="llegaron al pago y no pagaron" />
      <Dato Icon={Mail} titulo="Les escribió el mail" valor={entero(c.recordados)} pie="recordatorio automático" />
      <Dato
        Icon={Wallet}
        titulo="Volvieron a pagar"
        valor={entero(c.recuperados)}
        pie={c.pctRecuperados === null ? "todavía sin recordatorios" : `${porcentaje(c.pctRecuperados)} de los que recibieron el mail`}
      />
    </div>
  );
}
