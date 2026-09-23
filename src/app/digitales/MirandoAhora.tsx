"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REFRESCO_DEL_PANEL_MS } from "@/lib/mirando-ahora";

/**
 * El puntito verde: cuántos están mirando las páginas de esta cuenta AHORA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES UN CARTELITO, PERO TIENE QUE SER DE AHORA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Por eso es un componente de navegador y no un número dibujado en el
 * servidor: si no volviera a preguntar, el número quedaría congelado en el
 * momento en que se cargó la pantalla. El que se fue seguiría contado hasta
 * que alguien recargue, y un cartel que dice "ahora" y no se mueve parece
 * roto —porque lo está—.
 *
 * ── Lo que dibuja ─────────────────────────────────────────────────────────
 *
 * Con gente: verde, con el puntito latiendo. Sin gente: gris y quieto,
 * "nadie mirando ahora". Antes, sin gente no se dibujaba nada; se cambió
 * porque un cartelito que aparece y desaparece solo se lee como una falla,
 * y porque el gris dice algo verdadero —no hay nadie— en vez de callarse.
 *
 * ⚠️ Lo que NO se dibuja es "no sé". Si Redis no contesta, el número llega en
 * `null` y se deja el último que sí supimos: un cero inventado diría "no hay
 * nadie", que es otra afirmación. Y si nunca supimos ninguno, el panel no
 * pone el cartelito.
 *
 * ── Por qué el detalle por producto ───────────────────────────────────────
 *
 * En Pro una cuenta puede tener cinco páginas de venta. "12 mirando ahora"
 * no le dice CUÁL de las cinco, que es justo lo que quiere saber cuando
 * acaba de publicar un anuncio. Al pasar el mouse —o tocarlo en el celular—
 * se abre el detalle. Con un solo producto no hay nada que abrir.
 *
 * Las reglas y los plazos están en `lib/mirando-ahora`.
 */

type Fila = { id: string; n: number };

/**
 * Cuándo fue la última vez que se recargó la pantalla para pedir un permiso
 * nuevo, y cuánto hay que esperar antes de volver a hacerlo.
 *
 * ⚠️ VIVE AFUERA DEL COMPONENTE A PROPÓSITO. Cuando el panel se recarga, el
 * cartelito se vuelve a armar de cero —le llega un permiso nuevo, que es toda
 * la gracia—, así que cualquier "ya recargué una vez" guardado adentro se
 * perdería en el camino. Si el permiso nuevo también fuera rechazado, sería
 * una recarga atrás de otra para siempre. Acá afuera el reloj sobrevive a esa
 * vuelta y el peor caso pasa a ser una recarga cada cinco minutos, que no le
 * hace mal a nadie.
 *
 * (Se borra solo al recargar la página de verdad, que es lo que uno quiere.)
 */
let ultimaRecarga = 0;
const ESPERA_ENTRE_RECARGAS_MS = 5 * 60_000;

export default function MirandoAhora({ permiso, inicial, detalleInicial, productos }: {
  permiso: string;
  inicial: number;
  detalleInicial: Fila[];
  productos: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(inicial);
  const [detalle, setDetalle] = useState<Fila[]>(detalleInicial);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;

    const preguntar = async () => {
      /* Con la pestaña escondida no se pregunta: el panel puede quedar abierto
         toda la tarde en una pestaña del fondo y nadie está mirando ese
         número. Al volver se pregunta enseguida. */
      if (!vivo || document.visibilityState !== "visible") return;
      try {
        /* ⚠️ El permiso va en una CABECERA y no en la dirección. Dos motivos:
           en la dirección quedaría escrito en los registros del servidor —es
           una llave, aunque sea chica—, y una cabecera inventada obliga al
           navegador a pedir permiso antes (preflight), que es lo que impide
           que otra página le haga esta pregunta al pasar por acá. */
        const r = await fetch("/api/digitales/mirando", {
          cache: "no-store",
          headers: { "x-mirando": permiso },
        });
        if (!vivo) return;
        /* El permiso venció: se recarga la pantalla para llevarse uno nuevo,
           pero como mucho una vez cada tanto. Un 401 que no se arregla solo
           —y los hay: una clave que cambió en el medio— se convertiría si no
           en una recarga atrás de otra. Ver `ultimaRecarga`. */
        if (r.status === 401) {
          const cuando = Date.now();
          if (cuando - ultimaRecarga > ESPERA_ENTRE_RECARGAS_MS) {
            ultimaRecarga = cuando;
            router.refresh();
          }
          return;
        }
        if (!r.ok) return;
        const datos: unknown = await r.json();
        if (!vivo || typeof datos !== "object" || datos === null) return;
        const { mirando, porProducto } = datos as { mirando?: unknown; porProducto?: unknown };
        /* `null` es "no se pudo averiguar": se deja el último número que sí
           supimos y se vuelve a intentar en el próximo. */
        if (typeof mirando !== "number" || !Number.isFinite(mirando)) return;
        setTotal(mirando);
        setDetalle(Array.isArray(porProducto) ? (porProducto as Fila[]) : []);
        /* Si se fueron todos, el detalle se queda sin renglones y deja de
           dibujarse. Sin esto quedaría marcado como "abierto" por dentro y
           volvería a aparecer solo —sin que nadie pase el mouse— en cuanto
           entrara la próxima persona. */
        if (mirando === 0) setAbierto(false);
      } catch {
        /* Sin internet no hay número nuevo. Se deja el viejo y se calla: es un
           cartelito y no puede ensuciar la consola del panel. */
      }
    };

    void preguntar();
    const reloj = window.setInterval(() => void preguntar(), REFRESCO_DEL_PANEL_MS);
    const alVolver = () => void preguntar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [permiso, router]);

  /* En el celular no existe "sacar el mouse de encima": sin esto, el detalle
     que se abrió de un toque se queda abierto tapando el resto hasta que se
     vuelva a tocar el cartelito justo. Se cierra tocando afuera o con Escape,
     que es lo que hace cualquiera. */
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const hayGente = total > 0;

  /* El detalle: sólo los que tienen a alguien, el más mirado primero. Los
     ceros no se muestran —son la mayoría y no dicen nada—, y con un solo
     producto el detalle sería el mismo número dos veces. */
  const nombres = new Map(productos.map((x) => [x.id, x.nombre]));
  const filas = productos.length > 1
    ? detalle
        .filter((f) => f.n > 0 && nombres.has(f.id))
        .sort((a, b) => b.n - a.n)
    : [];
  const hayDetalle = filas.length > 0;

  const cartel = (
    <>
      {hayGente ? (
        /* El puntito que late. `relative`/`absolute` porque el latido es una
           copia del punto que se agranda por detrás.
           `shrink-0`: es un punto y tiene que seguir siendo redondo — sin eso,
           en un flex apretado se achica a un óvalo.
           `motion-safe`: quien pidió menos movimiento en su sistema ve el
           punto quieto. Un cartelito no es motivo para marearlo. */
        <span aria-hidden className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-gray-400 panel-oscuro:bg-gray-500" />
      )}
      {hayGente ? (
        <>
          {/* "mirando ahora" sirve para uno y para muchos, así que no lleva
              plural: "1 mirando ahora" y "3 mirando ahora". */}
          <span className="tabular-nums">{total}</span> mirando ahora
        </>
      ) : (
        "nadie mirando ahora"
      )}
    </>
  );

  const pinta = hayGente
    ? "bg-emerald-50 panel-oscuro:bg-emerald-500/15 text-emerald-700 panel-oscuro:text-emerald-400"
    : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400";
  const forma = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-bold ${pinta}`;

  if (!hayDetalle) return <span className={forma}>{cartel}</span>;

  return (
    /* El detalle se abre con el mouse encima y también con un toque: en el
       celular no existe "pasar por encima", y éste es un panel que se mira
       desde el teléfono. */
    <div
      ref={caja}
      className="relative"
      /* ⚠️ `pointerType === "mouse"` Y NO `onMouseEnter`. En el celular el
         navegador finge un mouse: al tocar dispara primero el "entró el
         mouse" —que abría el detalle— y enseguida el clic, que lo volvía a
         cerrar. Resultado: tocarlo no hacía nada. Con el tipo de puntero, el
         dedo sólo dispara el clic y el mouse sólo el pasar por encima. */
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setAbierto(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setAbierto(false); }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`${forma} cursor-pointer transition-colors hover:brightness-95`}
      >
        {cartel}
      </button>

      {abierto && (
        /* ⚠️ Los seis pixeles de separación van como RELLENO de esta caja
           invisible, no como margen de la de abajo. Con margen, ese huequito
           no es parte de nada: al mover el mouse del cartelito hacia la lista
           se pasa por ahí, el navegador avisa que el puntero se fue, y la
           lista desaparece justo cuando uno la iba a leer. Con relleno, el
           huequito es parte de la lista y el puntero nunca sale. */
        <div className="absolute right-0 top-full z-30 pt-1.5">
          <div
            className="w-60 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-2 shadow-lg"
            role="group"
          >
            <p className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              En qué página
            </p>
            <ul className="space-y-0.5">
              {filas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[12px]">
                  <span className="truncate text-gray-700 panel-oscuro:text-gray-300">{nombres.get(f.id)}</span>
                  <span className="shrink-0 tabular-nums font-bold text-emerald-700 panel-oscuro:text-emerald-400">
                    {f.n}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
