"use client";

import { useSyncExternalStore } from "react";
import { Clock, X } from "lucide-react";
import { cuentaRegresiva, mostrarReloj, venceEnTexto } from "@/lib/oferta-salida";

/**
 * El cartel de la oferta de salida. Uno solo para dos lugares: el checkout
 * lo muestra cuando la persona se va, y el panel lo dibuja como vista previa
 * con los mismos props. Así lo que la vendedora ve al editar es EXACTAMENTE
 * lo que va a ver quien compra — no una aproximación.
 *
 * Se viste con las variables de la página de venta (`--pv-*`), como el
 * checkout: no tiene colores propios. En el panel, la vista previa las pone
 * con `variablesDePagina` del producto elegido.
 *
 * ── El reloj ────────────────────────────────────────────────────────────────
 *
 * Con menos de una hora por delante el cartel cuenta hacia atrás; con más,
 * dice "vale hasta mañana a las 18:23". Las dos cosas son ciertas: la hora
 * en que vence viene firmada por el servidor y la ruta que cobra la hace
 * cumplir. Recargar no lo reinicia (el checkout guarda el primer token), y
 * cuando llega a cero el botón se apaga: no se ofrece lo que ya no aplica.
 * Es lo que diferencia este reloj del de la competencia, que vuelve a
 * 15:00 con F5.
 *
 * ── Nada se corta ───────────────────────────────────────────────────────────
 *
 * El nombre del producto y el texto van enteros: si la oferta no se lee
 * completa, la persona no sabe qué está por comprar. El cartel crece lo que
 * haga falta; en un celular chico, el fondo se desplaza.
 *
 * ── Tocar para editar ───────────────────────────────────────────────────────
 *
 * Con `alTocar`, el título, el texto y el botón son clicables y avisan qué
 * parte se tocó: la vista previa del panel lleva al campo. Sin `alTocar`
 * (el checkout) son texto común.
 */

export type ParteDelCartel = "titulo" | "texto" | "boton";

export type ContenidoDelCartel = {
  titulo: string;
  texto: string;
  boton: string;
  /** Hasta cuándo vale, en milisegundos: la hora firmada. */
  venceEn: number;
  imagen: string | null;
  /** Qué se ofrece. */
  oferta:
    | { tipo: "DESCUENTO"; nombre: string; antes: number; despues: number; porcentaje: number }
    | { tipo: "PRODUCTO"; nombre: string; precio: number; descripcion: string | null };
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/* ── "Ahora" ────────────────────────────────────────────────────────────────
   Un reloj compartido que late cada segundo mientras algún cartel con menos
   de una hora por delante lo escucha; los carteles largos leen la hora una
   vez y no se vuelven a dibujar. Es un `useSyncExternalStore` y no un
   `setInterval` con estado: en el servidor la hora es 0 (no hay reloj que
   leer) y la hidratación no choca con un segundo que ya pasó. */
let ahoraCache = 0;
const oyentes = new Set<() => void>();
let latido: number | null = null;
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  ahoraCache = Date.now();
  if (latido === null) latido = window.setInterval(() => { ahoraCache = Date.now(); oyentes.forEach((f) => f()); }, 1000);
  return () => {
    oyentes.delete(avisar);
    if (oyentes.size === 0 && latido !== null) { window.clearInterval(latido); latido = null; }
  };
}
const sinSuscribir = () => () => {};
function leerAhora(): number {
  if (ahoraCache === 0) ahoraCache = Date.now();
  return ahoraCache;
}
const enElServidor = () => 0;

function useAhora(venceEn: number): number {
  return useSyncExternalStore(mostrarReloj(venceEn, leerAhora()) ? suscribir : sinSuscribir, leerAhora, enElServidor);
}

export default function CartelDeSalida({ c, tarjeta, botonRedondo, onAceptar, onCerrar, yendo = false, error = "", href, alTocar }: {
  c: ContenidoDelCartel;
  tarjeta: string;
  botonRedondo: string;
  /** Para el descuento: aplica el cupón. */
  onAceptar?: () => void;
  onCerrar?: () => void;
  yendo?: boolean;
  error?: string;
  /** Para el producto más barato: el botón es un link a su pago. */
  href?: string;
  /** Sólo en la vista previa del panel: qué parte se tocó. */
  alTocar?: (parte: ParteDelCartel) => void;
}) {
  const ahora = useAhora(c.venceEn);
  /* Con hora 0 (el servidor) no hay reloj ni vencida: se dice la hora y listo. */
  const reloj = ahora > 0 && mostrarReloj(c.venceEn, ahora) ? cuentaRegresiva(c.venceEn, ahora) : null;
  const vencida = ahora > 0 && c.venceEn <= ahora;

  const claseBoton = `flex w-full items-center justify-center gap-2 bg-[color:var(--pv-acento)] px-5 py-3.5 text-[15px] font-extrabold text-[color:var(--pv-sobre)] transition hover:opacity-90 disabled:opacity-60 ${botonRedondo}`;
  /* En la previa, cada parte editable se marca al pasar el mouse. */
  const editable = alTocar ? "cursor-pointer rounded-md outline-offset-4 hover:outline hover:outline-2 hover:outline-dashed hover:outline-[color:var(--pv-acento)]" : "";
  const tocar = (parte: ParteDelCartel) => (alTocar ? { onClick: () => alTocar(parte), title: "Tocá para editar" } : {});

  return (
    <div className={`relative w-full max-w-md border-2 border-[color:var(--pv-acento)] bg-[color:var(--pv-tarjeta)] p-5 shadow-2xl sm:p-6 ${tarjeta}`}>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full p-1 text-[color:var(--pv-tenue)] hover:text-[color:var(--pv-tinta)]">
          <X className="h-4 w-4" />
        </button>
      )}
      <p className="pr-6 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-acento)]">Antes de irte</p>
      <h2 {...tocar("titulo")} className={`mt-1 text-xl font-extrabold leading-tight text-[color:var(--pv-tinta)] [overflow-wrap:anywhere] ${editable}`}>{c.titulo}</h2>
      <p {...tocar("texto")} className={`mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[color:var(--pv-tenue)] [overflow-wrap:anywhere] ${editable}`}>{c.texto}</p>

      <div className="mt-4 flex items-start gap-3 border-t-2 border-[color:var(--pv-linea)] pt-4">
        {c.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imagen} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-[color:var(--pv-tinta)] [overflow-wrap:anywhere]">{c.oferta.nombre}</p>
          {c.oferta.tipo === "DESCUENTO" ? (
            <p className="mt-1 text-base font-extrabold text-[color:var(--pv-tinta)]">
              <s className="mr-2 text-sm font-normal opacity-55">{plata(c.oferta.antes)}</s>
              {plata(c.oferta.despues)}
              <span className="ml-2 rounded-full bg-[color:var(--pv-fuerte)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--pv-tinta)]">−{c.oferta.porcentaje} %</span>
            </p>
          ) : (
            <>
              <p className="mt-1 text-base font-extrabold text-[color:var(--pv-tinta)]">{plata(c.oferta.precio)}</p>
              {c.oferta.descripcion && <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--pv-tenue)] [overflow-wrap:anywhere]">{c.oferta.descripcion}</p>}
            </>
          )}
        </div>
      </div>

      {/* El plazo: es cierto, lo hace cumplir el servidor. Reloj con menos de
          una hora; la hora, con más. */}
      {vencida ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--pv-tenue)]">
          <Clock className="h-3.5 w-3.5" /> La oferta venció.
        </p>
      ) : reloj ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[color:var(--pv-tenue)]">
          <Clock className="h-3.5 w-3.5" /> Te queda
          <span className="rounded-md bg-[color:var(--pv-fuerte)] px-2 py-0.5 font-mono text-[14px] font-extrabold tabular-nums text-[color:var(--pv-tinta)]" aria-live="off">{reloj}</span>
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--pv-tenue)]">
          <Clock className="h-3.5 w-3.5" /> Vale {venceEnTexto(new Date(c.venceEn), new Date(ahora > 0 ? ahora : c.venceEn))}.
        </p>
      )}

      {error && <p role="alert" className="mt-3 bg-[color:var(--pv-fuerte)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--pv-tinta)]">{error}</p>}

      <div className="mt-4 space-y-2">
        {alTocar ? (
          <button type="button" onClick={() => alTocar("boton")} title="Tocá para editar" className={`${claseBoton} ${editable}`}>{c.boton}</button>
        ) : vencida ? (
          <button type="button" disabled className={claseBoton}>{c.boton}</button>
        ) : href ? (
          <a href={href} className={claseBoton}>{c.boton}</a>
        ) : (
          <button type="button" onClick={onAceptar} disabled={yendo} className={claseBoton}>{yendo ? "Un momento…" : c.boton}</button>
        )}
        {onCerrar && (
          <button type="button" onClick={onCerrar} className="w-full py-2 text-[13px] font-semibold text-[color:var(--pv-tenue)] hover:text-[color:var(--pv-tinta)]">
            {vencida ? "Cerrar" : "No, gracias"}
          </button>
        )}
      </div>
    </div>
  );
}
