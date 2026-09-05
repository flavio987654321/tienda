import Link from "next/link";
import {
  UserRound, Package, Receipt, ArrowRight, Globe, Pencil, Settings, Plus,
  AlertTriangle, Clock, CircleDot, ExternalLink, Sparkles, ListChecks, ShoppingCart,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { primerosPasos, terminado, elQueSigue, cuantosHechos } from "@/lib/primeros-pasos";
import { fotoDelPanel, type NumerosDelPanel, type ProductoDelPanel } from "@/lib/panel-inicio";
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
 * Y en la vista de un producto está lo que esta pantalla venía a resolver de
 * verdad: **su dirección y su dominio, para copiar**. Esa es la operación real —
 * se pega en un anuncio, en un mensaje, en una historia.
 *
 * ── Los pasos son de la PRIMERA VEZ, no del panel ──────────────────────────
 *
 * Estaban en el medio de la pantalla, y ahí no van: alguien que ya vendió
 * cuarenta veces no tiene por qué seguir viendo una lista de tareas de arranque
 * ocupándole el panel entero. Los pasos son el recibimiento — la pantalla
 * completa mientras la cuenta está vacía — y en cuanto hay un producto se
 * corren a la columna de la derecha, chiquitos, hasta que se terminan y se van
 * solos.
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

  /* Sin `Store` no hay nada cargado todavía, y eso no es un error: el espacio se
     crea recién al guardar el primer producto. Entrar a mirar no tiene por qué
     dejar una tienda vacía colgando. */
  const foto = store ? await fotoDelPanel(store.id, p ?? null) : null;

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
  const tier = (sub?.tier ?? "FREE") as TierDigital;

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
          <p className="mt-3 text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
            Cargá tu producto, publicá su página y cobrá con Mercado Pago. La entrega del archivo
            la hacemos nosotros: apenas se acredita el pago, sale solo.
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

        <Link
          href="/digitales/mi-cuenta"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-400 transition-colors"
        >
          Plan {COPY_DIGITAL[tier].nombre}
        </Link>
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

          {/* ── Un producto: dónde vive ──────────────────────────────────────── */}
          {elegido && (
            <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">
                <Globe className="h-3.5 w-3.5" /> Su dirección
              </p>

              <div className="mt-3">
                {elegido.slugDigital || elegido.dominioPropio ? (
                  <Direcciones
                    slug={elegido.slugDigital}
                    dominioBase={dominioBase}
                    dominioPropio={elegido.dominioPropio}
                  />
                ) : (
                  /* Sin dirección no se puede repartir nada, así que no alcanza
                     con dejar el hueco vacío: hay que decir qué falta y dónde. */
                  <Link
                    href={`/digitales/productos/${elegido.id}/direccion`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 px-3.5 py-3 hover:border-orange-400 transition-colors"
                  >
                    <span className="min-w-0 text-[12.5px] font-bold text-orange-800 panel-oscuro:text-orange-300">
                      Todavía no tiene dirección. Elegila para poder repartirla.
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-orange-500" />
                  </Link>
                )}
              </div>

              {!elegido.publicado && (
                /* Que no esté publicado explica por qué no hay ventas, y eso hay
                   que decirlo acá y no dejar que se deduzca de un cero. */
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 panel-oscuro:bg-gray-950/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  Está sin publicar: por ahora la dirección no abre para nadie más que vos.
                </p>
              )}
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
                  <Rapido href="/digitales/productos" Icon={Plus} texto="Cargar un producto" fuerte />
                  <Rapido href="/digitales/productos" Icon={Package} texto="Tus productos" />
                  <Rapido href="/digitales/ventas" Icon={Receipt} texto="Tus ventas" />
                  <Rapido href="/digitales/carritos" Icon={ShoppingCart} texto="Carritos abandonados" />
                </>
              )}
              <Rapido href="/digitales/configuracion" Icon={Settings} texto="Configuración" />
              <Rapido href="/digitales/mi-cuenta" Icon={UserRound} texto="Mi cuenta" />
            </div>
          </div>

          {/* ⚠️ Los pasos, chiquitos y a un costado. Ocupaban el medio de la
              pantalla y ahí no van: el que ya vendió cuarenta veces no tiene por
              qué seguir viendo la lista de arranque. Se van solos al terminar. */}
          {!terminado(pasos) && (
            <Link
              href={elQueSigue(pasos)?.href ?? "/digitales/productos"}
              className="block rounded-2xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 p-4 hover:border-orange-400 transition-colors"
            >
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-orange-700 panel-oscuro:text-orange-400">
                <ListChecks className="h-3.5 w-3.5" />
                Te falta {5 - cuantosHechos(pasos)} de 5
              </p>
              <p className="mt-1.5 text-[13px] font-bold text-orange-900 panel-oscuro:text-orange-200">
                {elQueSigue(pasos)?.titulo}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-orange-800 panel-oscuro:text-orange-300/80">
                {elQueSigue(pasos)?.porque}
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-orange-700 panel-oscuro:text-orange-400">
                Hacerlo <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── Las piezas ───────────────────────────────────────────────────────────── */

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
