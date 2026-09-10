"use client";

import { useRef, useState } from "react";
import {
  Sparkles, FileUp, Pencil, CreditCard, Rocket, ArrowRight, LogOut, Loader2, Send,
} from "lucide-react";
import type { Paso, ClavePaso } from "@/lib/primeros-pasos";
import { elQueSigue, NOMBRE_CORTO } from "@/lib/primeros-pasos";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import { useAuth } from "@/components/AuthProvider";
import { AppLogo } from "@/components/AppLogo";
import BarraDePasos, { NOMBRE_ESTILO, NOMBRE_LISTO, type CirculoDePaso } from "./BarraDePasos";
import Consejo from "./Consejo";
import EmbudoIA from "./productos/EmbudoIA";

/**
 * EL RECIBIMIENTO: la pantalla entera, hasta que la cuenta esté armada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES UNA LISTA DE TAREAS: ES LO ÚNICO QUE HAY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Sin barra lateral, sin Configuración, sin Mi cuenta, sin números. Una cuenta
 * recién creada no tiene nada que mirar en un panel —tres ceros y una lista
 * vacía— y sí tiene una cosa que hacer. El panel aparece cuando están los pasos
 * de la puerta, y aparece con todo ya creado.
 *
 * Quién decide que se muestre esto es el layout, una sola vez para las nueve
 * pantallas. Ver `lib/recibimiento`.
 *
 * ⚠️ Acá NO llega el paso de publicar, y no es un olvido: se hace desde el
 * panel, después de mirar cómo quedó la página. Pedirlo para entrar sería
 * ponerla a la vista antes de haberla visto. Esta pantalla dibuja los pasos que
 * le pasan y no sabe cuáles son; quien los elige es `pasosDeLaPuerta`.
 *
 * ── Por qué no hay "Atrás" ─────────────────────────────────────────────────
 *
 * Porque no es un formulario partido en pasos: **cada paso es un cambio real**
 * —se creó el producto, se subió el archivo, se conectó Mercado Pago— y ya está
 * hecho cuando se ve el tilde. Volver atrás no tendría qué deshacer, y el botón
 * prometería algo que no pasa. Lo que sí se puede es cambiarlo todo después,
 * desde el panel, que es donde vive la edición.
 *
 * Y por lo mismo no hay estado local de "en qué paso voy": el paso sale del
 * ESTADO REAL de la cuenta, igual que los pasos del panel. Un contador propio se
 * desincroniza —cerrás la ventana en el 3 y volvés al 1— y encima podría dejar
 * pasar a alguien al panel con la cuenta a medio armar.
 *
 * ── Lo que se reusa ────────────────────────────────────────────────────────
 *
 * Todo. El armado con IA es `EmbudoIA`, el mismo de la pantalla de Productos; la
 * subida es `subirPdfDigital`; la página la escribe la misma ruta de IA; y el
 * texto de cada paso sale de `lib/primeros-pasos`, así que el recibimiento y el
 * panel nunca pueden decir cosas distintas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA BIENVENIDA: POR QUÉ ESTA PANTALLA NO ES SÓLO LA TARJETA — 10/09/26
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta hoy era una tarjeta chica en el medio de una pantalla vacía. En un
 * teléfono se veía bien; en una computadora de 1920 son dos metros de gris
 * alrededor de un botón, sin el logo por ningún lado. Reportado mirándolo al
 * lado del recibimiento de un competidor: *"me da tristeza ver esa imagen, ni
 * el logo de TiendaApps aparece"*.
 *
 * Y el problema no era estético. **Es la primera pantalla de alguien que acaba
 * de pagar o de anotarse**, y no decía en ningún lado qué hace la plataforma
 * por esa persona: sólo le daba una orden ("Armá tu producto"). Quien nunca vio
 * el panel no tiene forma de saber que la IA le escribe la página, que cobra
 * con su propio Mercado Pago o que la entrega la hacemos nosotros.
 *
 * Así que el espacio vacío se llena con eso, y con nada más: el saludo por su
 * nombre y las tres cosas que la plataforma hace sola.
 *
 * ⚠️ Las tres salen de `LO_QUE_PONEMOS` y **no prometen nada que no esté
 * andando hoy**. Es la misma regla que la pantalla de Marketing: acá no va una
 * fila apagada que diga "próximamente". Antes de agregar una cuarta, mirá que
 * exista de verdad — esta pantalla la lee alguien que todavía puede pedir la
 * devolución.
 *
 * ── El orden se da vuelta en el teléfono ───────────────────────────────────
 *
 * En pantalla grande la bienvenida va a la izquierda y la tarjeta a la derecha.
 * En el teléfono se apila, y ahí la bienvenida va DEBAJO (`order-2`): puesta
 * arriba, empuja el único botón de la pantalla abajo del pliegue, que es
 * exactamente el error que esto venía a arreglar. Primero la acción, después el
 * relato.
 */

/**
 * Las tres cosas que la plataforma hace sola.
 *
 * ⚠️ Cada una tiene que ser verificable en el código de hoy. "La IA escribe" es
 * `EmbudoIA` + `/api/digitales/ia/pagina`; "vos cobrás" es el Mercado Pago de la
 * persona, conectado en Configuración → Pagos; "nosotros entregamos" es el mail
 * de entrega que sale solo al confirmarse el cobro. Ninguna es una intención.
 *
 * ── ⚠️ FRASES CORTAS, Y NO ES UNA PREFERENCIA ──────────────────────────────
 *
 * La primera versión decía cosas como *"Apenas te pagan, el archivo le llega
 * solo a quien compró. No tenés que estar mirando"*: correcto, y con dos
 * subordinadas antes del punto. Probado en pantalla, la devolución fue *"se
 * traba mucho leyendo"*.
 *
 * Esto lo lee alguien que recién entró y todavía no sabe si se quedó con algo
 * bueno. Una frase que hay que releer se saltea, y salteadas estas tres no
 * dicen nada. La regla acá es: **una idea por oración, sujeto adelante, y nada
 * de aclaraciones colgadas atrás del punto**.
 */
const LO_QUE_PONEMOS = [
  {
    Icon: Sparkles,
    titulo: "La IA lo escribe",
    /* Se nombra qué escribe, no "te ayuda a crear contenido": lo que hace de
       verdad es más de lo que la gente supone y es lo que la convence. */
    detalle: "Tu producto, tus ofertas y tu página de venta. Después cambiás lo que quieras.",
  },
  {
    Icon: CreditCard,
    titulo: "Vos cobrás",
    /* La segunda frase es la misma que el paso de `primeros-pasos`, y no una
       parecida: es la promesa de plata de todo el ecosistema y no puede sonar
       distinta según la pantalla en la que se lea. */
    detalle: "Con tu Mercado Pago. La plata va derecho a tu cuenta.",
  },
  {
    Icon: Send,
    titulo: "Nosotros entregamos",
    detalle: "Te pagan y el archivo sale solo. Vos no hacés nada.",
  },
] as const;

/** El ícono de cada paso. El orden es el de `primerosPasos`. */
const ICONO: Record<ClavePaso, typeof Sparkles> = {
  producto: Sparkles,
  archivo: FileUp,
  pagina: Pencil,
  cobro: CreditCard,
  publicar: Rocket,
};

/* El nombre corto de la barra sale de `NOMBRE_CORTO`, en `lib/primeros-pasos`:
   lo dibuja también la pantalla de "Todo listo", pegada a ésta en el mismo
   recorrido, y escrito dos veces se renombra uno y la barra cambia de palabra a
   mitad de camino. */

export default function Recibimiento({
  pasos,
  productoId,
  cupoIA,
  nombre,
}: {
  /** Sólo los de la puerta. Ver `pasosDeLaPuerta` en `lib/primeros-pasos`. */
  pasos: Paso[];
  /** El producto principal, cuando ya existe. Todos menos el primero lo necesitan. */
  productoId: string | null;
  cupoIA: EstadoDelCupo;
  /** El nombre de la cuenta, para saludar. Puede no estar: se entra con Google o con mail. */
  nombre: string | null;
}) {
  const { signOut } = useAuth();
  const [embudo, setEmbudo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  /* El mismo cerrojo que el resto del panel: un `ref` y no estado, porque el
     segundo clic llega antes de que React vuelva a dibujar. */
  const enVuelo = useRef(false);

  const sigue = elQueSigue(pasos);

  /* Si no queda ninguno, el layout ya habría mostrado el panel. Esto es la red
     por si alguna vez se dibuja igual: mejor no dibujar nada que romper. */
  if (!sigue) return null;

  /* ⚠️ El número es la POSICIÓN del paso, no cuántos van hechos. No es lo mismo
     en cuanto los pasos se completan salteados, que es el caso de toda cuenta
     que ya existía cuando apareció el recibimiento: con la página y el cobro
     hechos y el archivo sin subir van tres, y el cartel decía "Paso 4 de 5"
     arriba del título "Subí el archivo", con la barra marcando el 2. Tres
     números distintos para el mismo paso, en la misma pantalla. */
  const numero = pasos.indexOf(sigue) + 1;

  const Icono = ICONO[sigue.clave];

  /* ⚠️ Sólo el primer nombre, y puede quedar vacío. Se entra con Google —que
     manda "Flavio Soltero"— o con mail y contraseña, que puede no mandar nada:
     `name` es `string | null` en `AppSessionUser`. Un saludo con el nombre
     completo suena a carta del banco, y uno con el hueco vacío ("Hola, .") es
     peor que no saludar. Por eso el texto se elige, no se interpola. */
  /* ══════════════════════════════════════════════════════════════════════════
     LOS CUATRO CÍRCULOS ESTÁN DESDE EL PRINCIPIO — 10/09/26
     ══════════════════════════════════════════════════════════════════════════

     Acá se dibujaban SÓLO los pasos de la puerta, que hoy son dos: Producto y
     Página. Y el asistente hace los dos de una —crea el producto y escribe la
     página, ver `EmbudoIA`—, así que la barra prometía dos pasos, la persona
     apretaba un botón y caía en el panel.

     Reportado probándolo: *"cuando puse generar se saltó el último paso y me
     llevó directo al panel"*. No se salteaba nada: se tildaban los dos juntos y
     no había nada después.

     Ahora se ven los cuatro del recorrido completo —los de la puerta más los dos
     del cierre— así que se VE que el asistente tacha dos de una, y la barra de
     esta pantalla es la misma que la de las dos que siguen. Los del cierre
     todavía no están hechos, y por eso van en `falta`. */
  const circulos: CirculoDePaso[] = [
    ...pasos.map((p) => ({
      nombre: NOMBRE_CORTO[p.clave],
      estado: p.hecho ? "hecho" as const : p.clave === sigue.clave ? "actual" as const : "falta" as const,
    })),
    { nombre: NOMBRE_ESTILO, estado: "falta" },
    { nombre: NOMBRE_LISTO, estado: "falta" },
  ];

  const primerNombre = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  const arrancando = sigue.clave === "producto";
  const saludo = arrancando
    ? primerNombre
      ? `Hola, ${primerNombre}.`
      : "Te damos la bienvenida."
    : primerNombre
      ? `Vas bien, ${primerNombre}.`
      : "Vas bien.";

  async function salir() {
    setSaliendo(true);
    /* A `/login` y no a `/digitales`: sin panel al que volver, quedarse en la
       misma dirección después de salir dibuja la pantalla de ingreso adentro de
       lo que la persona acaba de cerrar. */
    await signOut("/login");
  }

  /* Quedó un solo paso con botón que hace algo acá adentro —escribir la página—:
     el archivo y publicar se hacen en el panel, y Mercado Pago es un enlace que
     te saca de la aplicación. Se deja igual porque el cerrojo y el manejo del
     error valen lo mismo con uno que con tres. */
  async function conCerrojo(hacer: () => Promise<string | null>) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError("");
    const problema = await hacer();
    if (problema) {
      setError(problema);
      enVuelo.current = false;
      setTrabajando(false);
      return;
    }
    /* No se suelta el cerrojo: la página se está recargando y devolverle el
       botón durante ese rato es ofrecerle hacerlo dos veces. */
    window.location.reload();
  }

  async function escribirPagina() {
    await conCerrojo(async () => {
      if (!productoId) return "Primero hay que crear el producto.";
      try {
        const r = await fetch("/api/digitales/ia/pagina", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productoId }),
        });
        const d = await r.json().catch(() => ({}));
        return r.ok && d.ok ? null : (d.error ?? "No pudimos escribirla. Probá de nuevo.");
      } catch {
        return "No pudimos conectarnos. Revisá tu conexión.";
      }
    });
  }

  const ocupado = trabajando;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 panel-oscuro:bg-gray-950 text-gray-900 panel-oscuro:text-gray-100 flex flex-col">

      {/* ══════════════════════════════════════════════════════════════════════
          EL RESPLANDOR
          ══════════════════════════════════════════════════════════════════════

          Toda la pantalla era `gray-50` de punta a punta y la marca es naranja:
          quedaba una hoja en blanco con un botón. Estas dos manchas desenfocadas
          le ponen el color de la casa sin tocar un solo texto.

          ⚠️ Van como elementos y no como `background-image` del contenedor por
          el tema oscuro: el degradado tiene que cambiar de intensidad con
          `panel-oscuro:`, y esa variante se aplica a clases, no a un `style`.

          ⚠️ Y el `header` y el `main` llevan `relative` por esto mismo. Un
          elemento posicionado se pinta arriba de los hermanos que no lo están,
          así que sin eso las manchas taparían la barra y el texto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[10%] h-[420px] w-[900px] max-w-[150%] -translate-x-1/2 rounded-full bg-orange-200/40 blur-[100px] panel-oscuro:bg-orange-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 bottom-[-6rem] h-[360px] w-[560px] rounded-full bg-amber-100/60 blur-[100px] panel-oscuro:bg-amber-500/[0.06]"
      />

      {/* ── La barra de progreso ─────────────────────────────────────────────
          La dibuja `BarraDePasos`, compartida con las dos pantallas del cierre:
          van una atrás de la otra y tienen que ser la misma barra. */}
      <header className="relative shrink-0 border-b border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* ⚠️ EL LOGO, y en el teléfono también. Acá había sólo la palabra
              "TiendaApps" escrita, y encima escondida hasta `sm` — o sea que la
              primera pantalla de una cuenta nueva no tenía ninguna marca en un
              celular. Es la pantalla donde alguien que acaba de pagar tiene que
              reconocer dónde entró. La palabra sigue escondiéndose en pantalla
              chica —ahí manda el ancho de la barra de pasos— pero la imagen no.

              `AppLogo` es el mismo de la barra lateral del panel, así que al
              entrar la marca no cambia de dibujo a mitad de camino. */}
          <span className="flex shrink-0 items-center gap-2">
            <AppLogo size={34} />
            <span className="hidden text-[13px] font-black tracking-tight sm:block">
              TiendaApps
            </span>
          </span>

          <BarraDePasos circulos={circulos} />

          {/* ⚠️ Cerrar sesión SIEMPRE a la vista. Es lo único que hay que poder
              hacer siempre: sin panel, sin menú y sin barra lateral, sin esto
              alguien que entró por error se queda encerrado en su propia cuenta.

              Va con `signOut` del proveedor y no con un enlace: la sesión vive
              en Supabase del lado del navegador, así que un link a una ruta no
              la cierra — la deja abierta y sólo parece que salió. Es el mismo
              camino que usa la barra lateral. */}
          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </header>

      {/* ── La bienvenida y la tarjeta del paso ──────────────────────────────
          Dos columnas en pantalla grande, apiladas en el teléfono — y ahí la
          bienvenida queda ABAJO, ver el comentario del encabezado. */}
      <main className="relative flex flex-1 items-start justify-center px-4 py-8 sm:py-12 lg:items-center">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-14">

        {/* ⚠️ Los retrasos van a mano y en el ORDEN EN QUE SE LEE, que no es el
            orden del HTML: la tarjeta está escrita después y entra primero (0ms),
            porque es la que tiene el botón. Ver `.entra-suave` en `globals.css`. */}
        <section className="order-2 mx-auto w-full max-w-lg lg:order-1 lg:mx-0 lg:max-w-none">
          <p className="entra-suave text-[11px] font-bold uppercase tracking-widest text-orange-600" style={{ animationDelay: "60ms" }}>
            Productos digitales
          </p>
          <h2
            className="entra-suave mt-2 text-balance text-2xl font-black leading-tight text-gray-950 panel-oscuro:text-gray-50 sm:text-3xl"
            style={{ animationDelay: "110ms" }}
          >
            {saludo}
          </h2>
          <p
            className="entra-suave mt-3 max-w-md text-pretty text-[14px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400"
            style={{ animationDelay: "170ms" }}
          >
            {/* ⚠️ No repite el "porque" de la tarjeta: ahí se explica qué pasa si
                el paso falta, acá quién hace qué. Dos párrafos que dicen lo mismo
                en la misma pantalla se leen como relleno.

                Y va en dos oraciones cortas, por lo mismo que las tres filas de
                abajo. Ver el aviso de `LO_QUE_PONEMOS`. */}
            {arrancando
              ? "Vos ponés lo que sabés. El resto lo hacemos nosotros."
              : "Tu producto ya está. Falta la página que lo vende."}
          </p>

          <ul className="mt-7 space-y-4">
            {LO_QUE_PONEMOS.map(({ Icon, titulo, detalle }, n) => (
              <li
                key={titulo}
                className="entra-suave flex items-start gap-3.5"
                style={{ animationDelay: `${230 + n * 70}ms` }}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white panel-oscuro:bg-gray-900 ring-1 ring-gray-200 panel-oscuro:ring-gray-800">
                  <Icon className="h-4 w-4 text-orange-600" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                    {titulo}
                  </span>
                  <span className="mt-0.5 block max-w-sm text-pretty text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                    {detalle}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* El consejo del paso donde estás. Va al final de la columna y no
              arriba: primero qué hace la plataforma —que es lo que decide si
              sigue— y recién después el consejo, que se lee si sobra atención.
              Ver `Consejo`. */}
          <div className="entra-suave mt-7 max-w-md" style={{ animationDelay: "440ms" }}>
            <Consejo momento={arrancando ? "producto" : "pagina"} />
          </div>
        </section>

        <div className="entra-suave order-1 mx-auto w-full max-w-lg lg:order-2 lg:mx-0">

          {/* La sombra subió de `shadow-sm` a ésta cuando apareció el resplandor:
              con el fondo tibio detrás, una tarjeta blanca casi sin sombra se
              confunde con la mancha. Tirada al naranja y no al negro, para que
              levante sin ensuciar el color de atrás. */}
          <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-6 text-center shadow-xl shadow-orange-950/[0.06] panel-oscuro:shadow-black/20 sm:p-8">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 panel-oscuro:bg-orange-500/15">
              <Icono className="h-7 w-7 text-orange-600" />
            </div>

            {/* ⚠️ El total son los círculos de la barra, no los pasos de la
                puerta: si acá dijera "de 2" y arriba hubiera cuatro bolitas, la
                misma pantalla estaría contando dos cosas distintas. Los dos del
                cierre —el estilo y la felicitación— también hay que hacerlos. */}
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
              Paso {numero} de {circulos.length}
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-black text-gray-950 panel-oscuro:text-gray-50">
              {sigue.titulo}
            </h1>
            {/* La consecuencia, no la tarea: la tarea ya está en el título. Sale
                de `primeros-pasos`, la misma que lee el panel. */}
            <p className="mx-auto mt-2.5 max-w-sm text-pretty text-[13.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              {sigue.porque}
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-700 panel-oscuro:text-red-300"
              >
                {error}
              </p>
            )}

            <div className="mt-6">
              {sigue.clave === "producto" && (
                <Boton onClick={() => setEmbudo(true)} disabled={ocupado}>
                  <Sparkles className="h-4 w-4" /> {sigue.accion}
                </Boton>
              )}

              {/* Tampoco hay rama para "archivo". Salió de la puerta el
                  07/09/26: tiene DOS caminos —subir un PDF propio, o que la IA
                  escriba el ebook desde Starter— y acá entraba uno solo, así que
                  a quien pagó para que se lo escribamos le pedía justo lo que no
                  tiene. Los dos botones viven juntos en Productos. Ver
                  `PASOS_DE_ADENTRO` en `lib/primeros-pasos`. */}

              {sigue.clave === "pagina" && (
                <>
                  <Boton onClick={escribirPagina} disabled={ocupado} cargando={trabajando}>
                    <Sparkles className="h-4 w-4" />
                    {trabajando ? "Escribiéndola…" : "Escribirla con IA"}
                  </Boton>
                  <p className="mt-3 text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
                    Después la editás entera: los textos, los colores y qué secciones se ven.
                  </p>
                </>
              )}

              {/* No hay rama para "cobro" ni para "publicar": esos pasos no
                  llegan acá, así que dibujarlos sería código muerto con forma de
                  botón. Los dos se hacen desde el panel — Mercado Pago en
                  Configuración → Pagos, y publicar después de mirar cómo quedó
                  la página. Ver `pasosDeLaPuerta` en `lib/primeros-pasos`.

                  ⚠️ El de cobro estuvo acá hasta el 08/09/26, y sacarlo fue el
                  punto del cambio: la puerta pedía Mercado Pago y escondía la
                  pantalla donde se conecta, con el reloj de la prueba corriendo.
                  El botón no se perdió, vive en `TabPagos`. */}
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
            {/* Que se pueda ir y volver hay que DECIRLO. Sin panel ni menú, una
                pantalla que sólo ofrece seguir se lee como un trámite que hay que
                terminar de una sentada, y quien no puede lo abandona. */}
            Podés cerrar esto y volver cuando quieras: lo que ya hiciste queda guardado.
          </p>
        </div>

        </div>
      </main>

      {/* El mismo asistente de la pantalla de Productos. Al crear el embudo
          recarga, el layout vuelve a mirar el estado real y muestra el paso 2. */}
      {embudo && <EmbudoIA cupoInicial={cupoIA} onCerrar={() => setEmbudo(false)} />}
    </div>
  );
}

/**
 * El botón grande del paso. Uno solo por pantalla: no hay nada más que hacer.
 *
 * Con `href` se dibuja como enlace de verdad —lo necesita Mercado Pago, que te
 * saca de la aplicación— y no como un botón que navega. Va acá adentro y no
 * copiado al lado: escrito aparte, ese paso era el único de los cinco sin la
 * flecha, porque la flecha vive en este componente.
 */
function Boton({ children, onClick, href, disabled, cargando }: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  cargando?: boolean;
}) {
  const clases =
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60";

  const adentro = (
    <>
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!cargando && <ArrowRight className="h-4 w-4" />}
    </>
  );

  /* Un `<a>` no se apaga con `disabled`: hay que sacarle el `href`, o sigue
     navegando igual mientras otra cosa está en vuelo. */
  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={`${clases} ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {adentro}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={clases}>
      {adentro}
    </button>
  );
}
