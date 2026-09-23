import Link from "next/link";
import {
  UserRound, Package, Receipt, ArrowRight, Globe, Pencil, Settings, Plus,
  AlertTriangle, Clock, CircleDot, ExternalLink, Sparkles, ShoppingCart,
  Lock, Megaphone, BarChart3, Mail,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { primerosPasos, terminado } from "@/lib/primeros-pasos";
import { fotoDelPanel, type NumerosDelPanel, type ProductoDelPanel, type VentaReciente } from "@/lib/panel-inicio";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { cuantosMirando } from "@/lib/mirando-ahora-servidor";
import { haceCuanto } from "@/lib/carritos-digitales";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import PrimerosPasos from "./PrimerosPasos";
import Direcciones from "./Direcciones";

/**
 * El panel.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TIENE DOS NIVELES PORQUE UNA CUENTA PUEDE SER CINCO NEGOCIOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Alguien en Pro vende un ebook de mecánica y uno de tortas. Un solo número de
 * "ventas" no le sirve para nada: lo que necesita saber es **cuál de los dos
 * anda**. Por eso arriba hay un selector —Todos, o un producto— y todo lo de
 * abajo cambia con él.
 *
 * ── La dirección, arriba y para todos ─────────────────────────────────────
 *
 * Es lo que esta pantalla venía a resolver de verdad: **la dirección y el
 * dominio, para copiar**. Esa es la operación real — se pega en un anuncio, en
 * un mensaje, en una historia.
 *
 * ⚠️ Estuvo sólo en la vista de un producto, y eso la dejaba escondida justo
 * para quien más la necesita: a esa vista se llega por el selector, que con UN
 * producto ni se dibuja. O sea que quien recién empieza no veía su link en
 * ninguna parte del panel. Ahora está arriba de la columna principal siempre
 * que haya una sola dirección posible —el producto elegido, o el único que
 * hay—; con varios productos y sin elegir no existe "la" dirección, así que
 * cada una vive en la tarjeta de su producto.
 *
 * ── Los pasos se van al TERMINARLOS, no al empezarlos ──────────────────────
 *
 * Con la cuenta vacía son la pantalla entera. Con productos siguen arriba de la
 * columna principal **hasta que los cinco estén hechos**. Ahí desaparecen para
 * siempre. Los que ya se hicieron se pliegan en un renglón —ver
 * `PrimerosPasos`—, así la tarjeta encoge a medida que la persona avanza en
 * vez de ocupar lo mismo el primer día que el cuarto.
 *
 * ⚠️ Acá hubo un error y conviene que quede escrito. La objeción original era
 * correcta —el que ya vendió cuarenta veces no tiene por qué seguir viendo una
 * lista de arranque ocupándole el panel— pero se tradujo mal: se tomó *"ya tiene
 * un producto"* como equivalente a *"ya no los necesita"*. No es lo mismo. Tener
 * un producto es el paso 1 de 5: quedan el archivo, la página, Mercado Pago y
 * publicar. Así que la lista se iba justo cuando más falta hacía, y lo único que
 * sobrevivía era una tarjetita en la columna de al lado que en el teléfono cae
 * al fondo de todo.
 *
 * Lo reportó Flavio probando una cuenta Free de verdad: *"cuando entré al panel
 * y empecé a usar todo, ya no me aparecían más, habían dejado de existir"*.
 *
 * La condición que de verdad quiere decir "ya no los necesita" es
 * `terminado(pasos)`, y con ella la objeción original se sigue cumpliendo sola:
 * el que vendió cuarenta veces terminó los cinco y no ve nada.
 *
 * ⚠️ Lo que NO cambia es de dónde salen: del estado REAL de la cuenta, sin
 * ninguna bandera guardada. Una bandera se desincroniza el día que alguien borra
 * su producto o desconecta Mercado Pago, y la lista diría "listo" con la cuenta
 * rota. Ver `lib/primeros-pasos`.
 *
 * ── Por qué el selector va en la dirección y no en un estado ────────────────
 *
 * Porque así el link se comparte, el botón atrás funciona, recargar no pierde
 * nada y el panel entero anda sin JavaScript. Es la misma decisión que ya se
 * tomó en Ventas con el filtro y la página, por los mismos motivos.
 */

export const dynamic = "force-dynamic";

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/**
 * Qué parte de las visitas terminó comprando.
 *
 * Con un decimal y no redondeada a entero: en este rubro una página buena
 * convierte al 2 %, así que redondeando, "1,8 %" y "2,4 %" —que son negocios
 * distintos— se dibujan los dos como "2 %".
 *
 * Quien llama se encarga de que `visitas` no sea cero: no hay conversión de
 * cero visitas, y dibujar "0 %" ahí es inventar un dato.
 */
function conversion(ventas: number, visitas: number): string {
  const p = (ventas / visitas) * 100;
  return `${p.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
}

export default async function DigitalesPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
  ]);

  const { p } = await searchParams;
  const tier = (sub?.tier ?? "FREE") as TierDigital;

  /* ⚠️ EL CANDADO DE LAS VISITAS, DECIDIDO ACÁ Y CON LA MISMA FUNCIÓN QUE
     ESTADÍSTICAS. `puedeVer(tier, "visitas")` es Starter para arriba, y con
     `false` la consulta de visitas NI SE HACE: el panel de una cuenta Free no
     paga ese viaje a la base ni deja el número en el HTML.

     Se decidió NO abrirlas en Free. Lo que Free ve es el bloque con candado,
     que dice qué son y lleva a los planes — el mismo criterio que Carritos:
     se ve que la función existe, y usarla se cobra. */
  const veVisitas = puedeVer(tier, "visitas");

  /* Sin `Store` no hay nada cargado todavía, y eso no es un error: el espacio se
     crea recién al guardar el primer producto. Entrar a mirar no tiene por qué
     dejar una tienda vacía colgando. */
  const foto = store ? await fotoDelPanel(store.id, p ?? null, veVisitas) : null;

  /* ── Cuántos están mirando ahora ────────────────────────────────────────
     El puntito verde. Va con el MISMO candado que las visitas —es de la
     misma familia y se decidió que esa familia es de Starter para arriba— y
     se pregunta sólo por los productos de ESTA cuenta.

     `null` es "no se pudo averiguar" (Redis caído o sin configurar) y
     entonces no se dibuja nada: un cero inventado diría "no hay nadie", que
     es una afirmación distinta de "no sé". Ver `lib/mirando-ahora`. */
  const mirando = veVisitas && foto
    ? await cuantosMirando(
        (foto.elegido ? [foto.elegido] : foto.productos).map((x) => x.id),
      )
    : null;

  /* ⚠️ Un `?p=` que no es de esta persona no existe para `fotoDelPanel` —sólo
     mira los productos de su tienda—, así que cae solo en la vista de todos.
     No hace falta un error: pedir algo ajeno simplemente no muestra nada ajeno. */
  const elegido = foto?.elegido ?? null;
  const productos = foto?.productos ?? [];

  /* Los pasos se calculan del producto que se está mirando, o del más VIEJO si
     se están mirando todos: es el que la persona armó primero, y por lo tanto el
     que tiene en la cabeza cuando la lista le dice "subí el archivo". */
  const paraLosPasos = elegido ?? productos[0] ?? null;
  const pasos = primerosPasos({
    principalId: paraLosPasos?.id ?? null,
    tieneArchivo: paraLosPasos?.tieneArchivo === true,
    paginaArmada: paraLosPasos?.paginaArmada === true,
    cobroConectado: foto?.cobroConectado === true,
    publicado: paraLosPasos?.publicado === true,
  });

  const numeros: NumerosDelPanel | null = elegido ? foto!.numerosDelElegido : foto?.total ?? null;
  const dominioBase = dominioDeLaPlataforma();
  /* ⚠️ "Ahora" se calcula ACÁ, en el servidor, y viaja a los renglones ya
     resuelto. Hecho en el navegador da distinto —el servidor corre en UTC— y
     React avisa que el texto no coincide. Es la misma decisión que en
     Carritos, y por el mismo motivo. */
  const ahora = new Date();
  /* El que se muestra arriba, para copiar: el elegido, o —con uno solo— ese.
     Con varios y sin elegir no hay UNA dirección, así que no se muestra
     ninguna y las direcciones viven en las tarjetas de cada producto. */
  const paraElLink = elegido ?? (productos.length === 1 ? productos[0] : null);

  /* ── La primera vez ──────────────────────────────────────────────────────
     Sin un solo producto no hay panel que mostrar: mostrar tres ceros y una
     lista vacía es peor que no mostrar nada. Acá los pasos SON la pantalla. */
  if (productos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10">
        <div className="text-center">
          <div className="w-14 h-14 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-7 w-7 text-orange-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950 panel-oscuro:text-gray-50">
            Tu cuenta ya está lista
          </h1>
          {/* ⚠️ ARRANCA POR LA IA, y no es adorno: es la primera pantalla de una
              cuenta nueva y decía "Cargá tu producto, publicá su página y cobrá
              con Mercado Pago" — o sea, describía el camino A MANO justo en la
              pantalla que existe para vender el otro.

              Los pasos de abajo ya lo dicen bien ("Armarlo con IA"), pero se
              leen después: el párrafo de arriba es lo que decide si sigue
              leyendo. Alguien que entra por primera vez y lee "cargá tu
              producto" ya entendió que le toca a ella.

              Es cierto en los tres planes: Free nace con 3 generaciones, que
              alcanzan para armar el embudo y escribir la página. Por eso se
              puede prometer acá sin letra chica. */}
          <p className="mt-3 text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
            Escribí de qué se trata lo tuyo y la IA te arma el producto, un bono de regalo y un
            upsell. Vos los editás, subís el archivo y publicás; la entrega la hacemos nosotros
            apenas te pagan.
          </p>
        </div>

        <div className="mt-8">
          <PrimerosPasos pasos={pasos} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 panel-oscuro:text-gray-500 leading-relaxed">
          Podés cerrar esta página y volver cuando quieras: el plan Free no vence, así que no hay
          nada que se te pase.
        </p>
      </div>
    );
  }

  return (
    /* No lleva `min-h-screen`: el scroll vive en el `<main>` del layout, al lado
       de la barra lateral. Con la altura forzada acá quedaban dos barras de
       desplazamiento, una adentro de la otra. */
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950 panel-oscuro:text-gray-50 break-words">
            {elegido ? elegido.nombre : "Tu panel"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 panel-oscuro:text-gray-400">
            {elegido
              ? "Cómo va este producto, y dónde vive."
              : productos.length > 1
                ? "Todo junto, o un producto a la vez."
                : "Cómo va tu negocio."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* ── El puntito verde ──────────────────────────────────────────
              ⚠️ Sólo cuando hay ALGUIEN. Un "0 mirando ahora" fijo en una
              cuenta nueva es un cartel triste sobre algo que ya se sabe, y
              además no es información: nadie necesita que le confirmen cada
              vez que entra al panel que su página está vacía. Cuando hay
              alguien, en cambio, es la única cosa de esta pantalla que pasa
              en este momento.

              Y `null` —no se pudo averiguar— tampoco dibuja nada: no es cero. */}
          {mirando !== null && mirando > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 panel-oscuro:bg-emerald-500/15 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700 panel-oscuro:text-emerald-400">
              <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
              {/* "mirando ahora" sirve para uno y para muchos, así que no
                  lleva plural: "1 mirando ahora" y "3 mirando ahora". */}
              <span className="tabular-nums">{mirando}</span> mirando ahora
            </span>
          )}

          <Link
            href="/digitales/mi-cuenta"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-400 transition-colors"
          >
            Plan {COPY_DIGITAL[tier].nombre}
          </Link>
        </div>
      </div>

      {/* ── El selector ──────────────────────────────────────────────────────
          Son enlaces, no botones: el panel entero anda sin JavaScript y el link
          de un producto se puede compartir. Aparece recién con dos productos —
          con uno solo, un selector de un elemento es ruido. */}
      {productos.length > 1 && (
        <div className="mt-5 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
          <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
            <Chip href="/digitales" activo={!elegido}>Todos</Chip>
            {productos.map((prod) => (
              <Chip key={prod.id} href={`/digitales?p=${prod.id}`} activo={elegido?.id === prod.id}>
                {prod.nombre}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ Dos columnas recién en pantalla grande. En 360 y en 768 esto se apila
          y los accesos rápidos quedan ABAJO de los números, que es el orden
          correcto en un teléfono: primero cómo va, después qué hacer. */}
      <div className="mt-5 grid lg:grid-cols-[minmax(0,1fr)_270px] gap-5 items-start">

        {/* ── Lo de la izquierda: cómo va ──────────────────────────────────── */}
        <div className="min-w-0 space-y-4">

          {/* ══════════════════════════════════════════════════════════════════
              LOS PASOS SE VAN AL TERMINARLOS, NO AL EMPEZARLOS
              ══════════════════════════════════════════════════════════════════

              ⚠️ Acá estaba el error, y era grande: la lista entera vivía sólo en
              la pantalla de cuenta vacía, así que **al cargar el primer producto
              desaparecía**. O sea que se iba justo después del paso 1 de 5, con
              cuatro sin hacer — subir el archivo, armar la página, conectar
              Mercado Pago y publicar—, y lo único que quedaba era una tarjetita
              en la columna de al lado, que en el teléfono va al fondo de todo.

              Reportado probando una cuenta Free de verdad: *"esos pasos, cuando
              entré al panel y empecé a usar todo, ya no me aparecían más, habían
              dejado de existir"*.

              El motivo del error: cuando se sacaron del panel, tomé "ya tiene un
              producto" como equivalente a "ya no los necesita". No es lo mismo.
              Lo que de verdad quiere decir "ya no los necesita" es
              `terminado(pasos)`, y esa condición ya existía dos renglones más
              abajo — sólo estaba puesta sobre la versión chiquita.

              Y la objeción original que los sacó de acá sigue respetada: el que
              ya vendió cuarenta veces terminó los cinco, así que no ve nada. */}
          {/* ══════════════════════════════════════════════════════════════════
              EL LINK, ARRIBA Y SIEMPRE
              ══════════════════════════════════════════════════════════════════

              ⚠️ Antes la dirección se veía SÓLO en la vista de un producto — y
              esa vista se llega por el selector, que con un producto ni siquiera
              se dibuja. O sea que quien tiene un producto, que es el caso de
              casi todo el mundo al empezar, **no veía su link en ningún lado**
              del panel. Y el link es la operación real de esta pantalla: se
              copia y se pega en un anuncio, en un mensaje, en una historia. */}
          {paraElLink && (paraElLink.slugDigital || paraElLink.dominioPropio) && (
            <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 shadow-sm">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                <Globe className="h-3.5 w-3.5" />
                {elegido ? "Su dirección" : "Tu dirección, para compartir"}
              </p>
              <div className="mt-3">
                <Direcciones
                  slug={paraElLink.slugDigital}
                  dominioBase={dominioBase}
                  dominioPropio={paraElLink.dominioPropio}
                  conPago
                />
              </div>
              {!paraElLink.publicado && (
                /* Que no esté publicado explica por qué no hay visitas ni
                   ventas, y eso hay que decirlo acá y no dejar que se deduzca
                   de un cero. */
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 panel-oscuro:bg-gray-950/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  Está sin publicar: por ahora esa dirección no abre para nadie más que vos.
                </p>
              )}
            </div>
          )}

          {!terminado(pasos) && <PrimerosPasos pasos={pasos} />}

          {numeros && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Numero titulo="Ventas cobradas" valor={String(numeros.ventas)} />
              {/* ⚠️ "Lo que te quedó", no "lo que vendiste": es el número que la
                  gente busca y el que nadie muestra. Ya se descontó la comisión. */}
              <Numero titulo="Lo que te quedó" valor={plata(numeros.neto)} destacado />
              <Numero
                titulo="Este mes"
                valor={plata(numeros.netoDelMes)}
                pie={`${numeros.ventasDelMes} ${numeros.ventasDelMes === 1 ? "venta" : "ventas"}`}
              />

              {/* ── Las visitas ─────────────────────────────────────────────
                  `null` es "tu plan no las ve" y se dibuja con candado; un cero
                  es un dato y se dibuja como número. No son lo mismo y no se
                  pueden mezclar: un candado donde hay un cero esconde algo que
                  ya se sabe, y un cero donde hay candado promete algo que no se
                  midió. */}
              {numeros.visitas === null ? (
                <Link
                  href="/digitales/mi-cuenta"
                  className="rounded-2xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-4 transition-colors hover:border-orange-400"
                >
                  <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                    <Lock className="h-3 w-3" /> Visitas
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                    Cuántas personas entraron y cuántas compraron.
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-orange-600">Con Starter →</p>
                </Link>
              ) : (
                <Numero
                  titulo="Visitas este mes"
                  valor={String(numeros.visitas)}
                  /* ⚠️ `ventasDelMes` contra visitas DEL MISMO MES. Con las
                     ventas de siempre arriba, una cuenta con un año vendido y
                     diez visitas este mes mostraba 1200 %.

                     Y sólo cuando el número significa algo: sin visitas no hay
                     conversión que calcular, y con más ventas que visitas
                     tampoco —eso pasa cuando alguien compra por el link
                     directo al pago sin pasar por la página, y dibujar 300 %
                     parecería un error nuestro—. */
                  pie={
                    numeros.visitas > 0 && numeros.ventasDelMes <= numeros.visitas
                      ? `${conversion(numeros.ventasDelMes, numeros.visitas)} compró`
                      : undefined
                  }
                />
              )}

              {/* El ticket sólo con ventas. Un "promedio $0" no es un promedio. */}
              {numeros.ventas > 0 && (
                <Numero titulo="Cada venta, promedio" valor={plata(numeros.ticket)} />
              )}
            </div>
          )}

          {/* Los avisos van juntos y sólo cuando hay algo que hacer. Un panel
              lleno de ceros enseña a no mirarlo. */}
          {!elegido && foto && (foto.total.sinBajar > 0 || foto.total.esperando > 0) && (
            <div className="space-y-2">
              {foto.total.sinBajar > 0 && (
                <Aviso
                  Icon={AlertTriangle}
                  tono="ambar"
                  href="/digitales/ventas"
                  texto={
                    foto.total.sinBajar === 1
                      ? "1 persona pagó y todavía no bajó su archivo"
                      : `${foto.total.sinBajar} personas pagaron y todavía no bajaron su archivo`
                  }
                  /* Es un reclamo que todavía no llegó: el mail se fue a spam, el
                     enlace venció. Verlo antes es la diferencia entre resolverlo
                     y enterarse por una queja. */
                  bajada="Puede ser el mail en spam. Desde Ventas les reenviás el enlace."
                />
              )}
              {foto.total.esperando > 0 && (
                <Aviso
                  Icon={Clock}
                  tono="gris"
                  /* A Carritos y no a Ventas: allá se ve la fila, acá se ve el
                     correo de la persona y el botón para escribirle. El aviso
                     tiene que llevar a donde se ACTÚA. */
                  href="/digitales/carritos"
                  texto={
                    foto.total.esperando === 1
                      ? "1 compra empezada sin pagar"
                      : `${foto.total.esperando} compras empezadas sin pagar`
                  }
                  bajada="Podés ver quién es y escribirle: no es una venta perdida."
                />
              )}
            </div>
          )}

          {/* ⚠️ Sin dirección no se puede repartir nada, así que no alcanza con
              dejar el hueco vacío: hay que decir qué falta y dónde. Va aparte
              del bloque de arriba porque aquél muestra una dirección y éste
              dice que no hay ninguna. */}
          {paraElLink && !paraElLink.slugDigital && !paraElLink.dominioPropio && (
            <Link
              href={`/digitales/productos/${paraElLink.id}/direccion`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 px-4 py-3.5 hover:border-orange-400 transition-colors"
            >
              <span className="min-w-0 text-[12.5px] font-bold text-orange-800 panel-oscuro:text-orange-300">
                Todavía no tiene dirección. Elegila para poder repartirla.
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-orange-500" />
            </Link>
          )}

          {/* ── Lo último que pasó ──────────────────────────────────────────
              ⚠️ Sólo con ventas. Un "todavía no hay actividad" es un cartel
              triste sobre algo que ya dicen los tres ceros de arriba, y llena
              la pantalla justo cuando está más vacía — que es lo contrario de
              lo que hay que hacer. Con la cuenta nueva, lo que ocupa ese lugar
              son los pasos. */}
          {!elegido && foto && foto.ultimas.length > 0 && (
            <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 shadow-sm">
              {/* `shrink-0` en los dos: son hijos de un flex en fila y ninguno
                  tiene por qué achicarse para hacerle lugar al otro. Si no
                  entran, el `flex-wrap` los pone uno abajo del otro. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                  Lo último que pasó
                </p>
                <Link href="/digitales/ventas" className="shrink-0 text-[12px] font-bold text-orange-600 hover:text-orange-500">
                  Ver todas
                </Link>
              </div>
              <ul className="mt-2 divide-y divide-gray-100 panel-oscuro:divide-gray-800">
                {foto.ultimas.map((v) => (
                  <Reciente key={v.ordenId} v={v} ahora={ahora} />
                ))}
              </ul>
            </div>
          )}

          {/* ── Todos: cuál de los productos anda ────────────────────────────── */}
          {!elegido && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                {productos.length === 1 ? "Tu producto" : "Tus productos"}
              </p>
              <div className="mt-2 space-y-2">
                {productos.map((prod) => (
                  <TarjetaDeProducto key={prod.id} prod={prod} dominioBase={dominioBase} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Lo de la derecha: qué hacer ──────────────────────────────────────
            Los accesos rápidos, y —mientras falte algo— lo que falta. Van
            juntos porque son la misma pregunta: "¿y ahora qué?". */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">

          <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
              Accesos rápidos
            </p>

            <div className="mt-3 space-y-1.5">
              {elegido ? (
                <>
                  <Rapido href={`/digitales/productos/${elegido.id}/pagina`} Icon={Pencil} texto="Su página de venta" fuerte />
                  <Rapido href={`/digitales/productos/${elegido.id}/direccion`} Icon={Globe} texto="Su dirección" />
                  {/* La página en vivo se abre aparte a propósito: es lo que ve
                      el comprador, y reemplazar el panel por ella deja a la
                      persona sin forma clara de volver. */}
                  <Rapido href={`/p/${elegido.id}`} Icon={ExternalLink} texto="Ver la página" afuera />
                  <Rapido href="/digitales/productos" Icon={Package} texto="Todos tus productos" />
                </>
              ) : (
                <>
                  {/* ⚠️ El primero cambia según dónde está parada la cuenta.
                      "Cargar un producto" arriba de todo le sirve al que no
                      tiene ninguno; al que ya vendió, lo que le sirve es
                      vender más — y eso vive en Marketing, que hasta ahora no
                      figuraba acá. */}
                  {productos.length === 0
                    ? <Rapido href="/digitales/productos" Icon={Plus} texto="Cargar un producto" fuerte />
                    : <Rapido href="/digitales/marketing" Icon={Megaphone} texto="Vender más" fuerte />}
                  <Rapido href="/digitales/productos" Icon={Package} texto="Tus productos" />
                  <Rapido href="/digitales/ventas" Icon={Receipt} texto="Tus ventas" />
                  <Rapido href="/digitales/carritos" Icon={ShoppingCart} texto="Carritos abandonados" />
                  <Rapido href="/digitales/estadisticas" Icon={BarChart3} texto="Estadísticas" />
                </>
              )}
              {/* Marketing y Estadísticas también en la vista de un producto:
                  son las dos pantallas que se usan DESPUÉS de publicar, que es
                  justo el momento en que alguien mira un producto en particular. */}
              {elegido && (
                <>
                  <Rapido href={`/digitales/marketing/upsells?p=${elegido.id}`} Icon={Megaphone} texto="Sus ofertas" />
                  <Rapido href="/digitales/estadisticas" Icon={BarChart3} texto="Estadísticas" />
                </>
              )}
              <Rapido href="/digitales/marketing/compradores" Icon={Mail} texto="Escribirles a tus compradores" />
              <Rapido href="/digitales/configuracion" Icon={Settings} texto="Configuración" />
              <Rapido href="/digitales/mi-cuenta" Icon={UserRound} texto="Mi cuenta" />
            </div>
          </div>

          {/* ⚠️ Acá vivía la versión chiquita de los pasos, y se sacó: ahora la
              lista entera está arriba de la columna principal mientras falte
              alguno. Dos avisos de lo mismo en la misma pantalla es peor que
              uno — y el de al lado era el que se veía, así que el de verdad no
              se buscaba nunca. */}
        </aside>
      </div>
    </div>
  );
}

/* ── Las piezas ───────────────────────────────────────────────────────────── */

/**
 * Un renglón de "lo último que pasó".
 *
 * El correo entero, no recortado: es lo único que identifica a un comprador
 * digital, y medio correo no sirve para buscarlo ni para reconocerlo. Por eso
 * `min-w-0` + `break-all`: corta donde haga falta en vez de estirar la fila.
 */
function Reciente({ v, ahora }: { v: VentaReciente; ahora: Date }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="min-w-0 break-all text-[13px] font-semibold text-gray-900 panel-oscuro:text-gray-100">
          {v.email}
        </p>
        <p className="mt-0.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
          {v.producto ? `${v.producto} · ` : ""}{haceCuanto(v.cuando, ahora)}
        </p>
      </div>
      <p className="shrink-0 whitespace-nowrap text-[13px] font-black tabular-nums text-gray-900 panel-oscuro:text-gray-100">
        {plata(v.total)}
      </p>
    </li>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      /* `max-w-[180px]` + `truncate`: un nombre largo no puede empujar la fila
         entera. `shrink-0` para que en 360 la fila desplace en vez de apretarse. */
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

function Numero({
  titulo, valor, pie, destacado,
}: {
  titulo: string; valor: string; pie?: string; destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destacado
          ? "border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10"
          : "border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900"
      }`}
    >
      <p className={`text-[10.5px] font-bold uppercase tracking-widest ${
        destacado ? "text-emerald-700 panel-oscuro:text-emerald-400" : "text-gray-400 panel-oscuro:text-gray-500"
      }`}>
        {titulo}
      </p>
      {/* `tabular-nums` para que dos tarjetas al lado no bailen al cambiar. */}
      <p className={`mt-1 text-xl sm:text-2xl font-black tabular-nums ${
        destacado ? "text-emerald-900 panel-oscuro:text-emerald-300" : "text-gray-900 panel-oscuro:text-gray-100"
      }`}>
        {valor}
      </p>
      {pie && <p className="mt-0.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">{pie}</p>}
    </div>
  );
}

function Aviso({
  Icon, tono, href, texto, bajada,
}: {
  Icon: React.ElementType; tono: "ambar" | "gris"; href: string; texto: string; bajada: string;
}) {
  const ambar = tono === "ambar";
  return (
    <Link
      href={href}
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 transition-colors ${
        ambar
          ? "border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 hover:border-amber-400"
          : "border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 hover:border-gray-300"
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ambar ? "text-amber-600" : "text-gray-400"}`} />
      <span className="min-w-0">
        <span className={`block text-[13px] font-bold ${
          ambar ? "text-amber-900 panel-oscuro:text-amber-200" : "text-gray-800 panel-oscuro:text-gray-200"
        }`}>
          {texto}
        </span>
        <span className={`block text-[11.5px] leading-relaxed ${
          ambar ? "text-amber-800 panel-oscuro:text-amber-300/80" : "text-gray-500 panel-oscuro:text-gray-400"
        }`}>
          {bajada}
        </span>
      </span>
      <ArrowRight className={`mt-0.5 ml-auto h-4 w-4 shrink-0 ${ambar ? "text-amber-500" : "text-gray-300 panel-oscuro:text-gray-600"}`} />
    </Link>
  );
}

/** Un acceso rápido de la columna de la derecha. */
function Rapido({
  href, Icon, texto, fuerte, afuera,
}: {
  href: string; Icon: React.ElementType; texto: string; fuerte?: boolean; afuera?: boolean;
}) {
  const clases = `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition-colors ${
    fuerte
      ? "bg-orange-600 text-white hover:bg-orange-500"
      : "text-gray-700 panel-oscuro:text-gray-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 hover:text-orange-700 panel-oscuro:hover:text-orange-400"
  }`;
  const contenido = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${fuerte ? "text-white/90" : "text-gray-400"}`} />
      <span className="min-w-0 truncate">{texto}</span>
      {!fuerte && <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300 panel-oscuro:text-gray-600" />}
    </>
  );
  return afuera
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>{contenido}</a>
    : <Link href={href} className={clases}>{contenido}</Link>;
}

function TarjetaDeProducto({ prod, dominioBase }: { prod: ProductoDelPanel; dominioBase: string }) {
  return (
    <Link
      href={`/digitales?p=${prod.id}`}
      className="block rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-4 py-3.5 hover:border-orange-300 panel-oscuro:hover:border-orange-500/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 truncate">{prod.nombre}</p>
          {/* La dirección va acá aunque esté también adentro: es lo que se copia,
              y tiene que estar donde la persona ya está mirando. Sin botón: acá
              la tarjeta entera es un enlace y meter otro botón adentro pelea. */}
          <p className="mt-0.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400 break-all">
            {prod.dominioPropio ?? (prod.slugDigital ? `${prod.slugDigital}.${dominioBase}` : "Sin dirección todavía")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black tabular-nums text-gray-900 panel-oscuro:text-gray-100">
            {plata(prod.neto)}
          </p>
          <p className="text-[11px] text-gray-500 panel-oscuro:text-gray-400 tabular-nums">
            {prod.ventas} {prod.ventas === 1 ? "venta" : "ventas"}
          </p>
        </div>
      </div>

      {!prod.publicado && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 panel-oscuro:text-gray-400">
          <CircleDot className="h-3 w-3" /> Sin publicar
        </p>
      )}
    </Link>
  );
}
