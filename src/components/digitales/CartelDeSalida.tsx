import { Clock, X } from "lucide-react";

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
 * Lo que dice es lo que es: el plazo viene calculado del servidor y se
 * cumple. Sin "quedan pocos", sin reloj que cuenta hacia atrás.
 */

export type ContenidoDelCartel = {
  titulo: string;
  texto: string;
  boton: string;
  /** "hasta mañana a las 18:23". */
  vence: string;
  imagen: string | null;
  /** Qué se ofrece. */
  oferta:
    | { tipo: "DESCUENTO"; nombre: string; antes: number; despues: number; porcentaje: number }
    | { tipo: "PRODUCTO"; nombre: string; precio: number; descripcion: string | null };
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function CartelDeSalida({ c, tarjeta, botonRedondo, onAceptar, onCerrar, yendo = false, error = "", href }: {
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
}) {
  const claseBoton = `flex w-full items-center justify-center gap-2 bg-[color:var(--pv-acento)] px-5 py-3.5 text-[15px] font-extrabold text-[color:var(--pv-sobre)] transition hover:opacity-90 disabled:opacity-60 ${botonRedondo}`;
  return (
    <div className={`relative w-full max-w-md border-2 border-[color:var(--pv-acento)] bg-[color:var(--pv-tarjeta)] p-5 shadow-2xl sm:p-6 ${tarjeta}`}>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full p-1 text-[color:var(--pv-tenue)] hover:text-[color:var(--pv-tinta)]">
          <X className="h-4 w-4" />
        </button>
      )}
      <p className="pr-6 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-acento)]">Antes de irte</p>
      <h2 className="mt-1 text-xl font-extrabold leading-tight text-[color:var(--pv-tinta)]">{c.titulo}</h2>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[color:var(--pv-tenue)]">{c.texto}</p>

      <div className="mt-4 flex items-center gap-3 border-t-2 border-[color:var(--pv-linea)] pt-4">
        {c.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imagen} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[color:var(--pv-tinta)]">{c.oferta.nombre}</p>
          {c.oferta.tipo === "DESCUENTO" ? (
            <p className="mt-0.5 text-base font-extrabold text-[color:var(--pv-tinta)]">
              <s className="mr-2 text-sm font-normal opacity-55">{plata(c.oferta.antes)}</s>
              {plata(c.oferta.despues)}
              <span className="ml-2 rounded-full bg-[color:var(--pv-fuerte)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--pv-tinta)]">−{c.oferta.porcentaje} %</span>
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-base font-extrabold text-[color:var(--pv-tinta)]">{plata(c.oferta.precio)}</p>
              {c.oferta.descripcion && <p className="mt-0.5 line-clamp-2 text-[12px] text-[color:var(--pv-tenue)]">{c.oferta.descripcion}</p>}
            </>
          )}
        </div>
      </div>

      {/* El plazo: es cierto, lo hace cumplir el servidor. */}
      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--pv-tenue)]">
        <Clock className="h-3.5 w-3.5" /> Vale {c.vence}.
      </p>

      {error && <p role="alert" className="mt-3 bg-[color:var(--pv-fuerte)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--pv-tinta)]">{error}</p>}

      <div className="mt-4 space-y-2">
        {href ? (
          <a href={href} className={claseBoton}>{c.boton}</a>
        ) : (
          <button type="button" onClick={onAceptar} disabled={yendo} className={claseBoton}>{yendo ? "Un momento…" : c.boton}</button>
        )}
        {onCerrar && (
          <button type="button" onClick={onCerrar} className="w-full py-2 text-[13px] font-semibold text-[color:var(--pv-tenue)] hover:text-[color:var(--pv-tinta)]">
            No, gracias
          </button>
        )}
      </div>
    </div>
  );
}
