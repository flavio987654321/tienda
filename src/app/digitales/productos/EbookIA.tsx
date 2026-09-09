"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2, Sparkles, X, AlertTriangle, Check, BookOpen, RotateCcw, Download,
  ListChecks, Trash2, Plus, ArrowUp, ArrowDown, Lock, Pencil,
} from "lucide-react";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
/* `import type` se borra al compilar, así que esto NO arrastra al navegador
   nada de lo que ese archivo importa —prisma incluido—. Es sólo la forma. */
import type { EstadoDelBorrador } from "@/lib/ebook-borrador";
import {
  LARGO_TEMA, MINIMO_TEMA, LARGO_PUBLICO, CAPITULOS_MIN, CAPITULOS_MAX,
  LARGO_TITULO_EBOOK, LARGO_TITULO_CAPITULO, LARGO_RESUMEN_CAPITULO, LARGO_FOTO,
  type CapituloPlaneado,
} from "@/lib/ebook-ia";
/* ⚠️ LA MISMA FUNCIÓN QUE USA EL SERVIDOR PARA DECIDIR SI EL TEMARIO SIRVE.
   No es un ahorro de código: es lo que hace imposible que la pantalla habilite
   el botón y el servidor conteste que no, o que los dos digan cosas distintas
   sobre el mismo capítulo. `ebook-temario` no toca la base a propósito. */
import { revisarTemario, sePuedeEditarElTemario } from "@/lib/ebook-temario";
import {
  FORMATOS, TEMAS, QUE_ES_CADA_FORMATO, QUE_ES_CADA_TEMA,
  OPCIONES_DE_FABRICA, FORMATOS_LISTOS, RECETAS_OPCIONES, COMO_SE_LLAMA,
  type FormatoDeEbook, type TemaDeEbook,
} from "@/lib/ebook-opciones";
import {
  ESTILOS, ESTILOS_LISTOS, QUE_ES_CADA_ESTILO, type EstiloDeEbook,
} from "@/lib/ebook-estilos";
import { PALETAS } from "@/lib/pagina-venta";
import { MiniaturaDeEstilo } from "./MiniaturaDeEstilo";
import { useSalida } from "@/app/digitales/SalidaSinGuardar";

/**
 * Escribir el ebook con IA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTA VENTANA MANEJA UN TRABAJO DE VARIOS MINUTOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No es un botón que espera una respuesta: es un trabajo de varias llamadas.
 * Pide el temario, y después se escribe **un capítulo por vez** —porque una
 * función del servidor tiene 60 segundos y se corta— hasta que están todos.
 * Recién ahí se arma el PDF.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ESTA PANTALLA YA NO MANEJA ESE TRABAJO: LO MIRA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 08/09/26 el bucle vivía acá: esta ventana pedía cada capítulo. Lo
 * escrito quedaba guardado —irse no perdía nada ni costaba otra generación—
 * pero **la escritura se frenaba**, y el cartel tenía que decirlo.
 *
 * Ahora cada capítulo llama al siguiente del lado del servidor, y el último
 * llama a armar el PDF (ver `ebook-cadena`). Esta pantalla hace dos cosas
 * chicas: **empuja el primer eslabón** y después **pregunta cómo viene** cada
 * cuatro segundos, para dibujar la barra. Cerrarla no frena nada.
 *
 * ⚠️ El cartel de abajo ya dijo las dos cosas contrarias y las dos veces dijo
 * la verdad del día: primero "sigue desde donde iba" (mentira, no seguía),
 * después "tenés que dejar esta ventana abierta" (cierto mientras lo fue), y
 * hoy otra vez que se puede ir. Si algún día la cadena se saca, el párrafo
 * vuelve atrás **en el mismo commit**.
 *
 * ── Por qué no reintenta solo al primer error ──────────────────────────────
 *
 * Porque cada intento **nos cuesta plata**, aunque falle y aunque a la persona
 * no se le cobre. Un bucle que reintenta solo, contra un modelo que está
 * teniendo un mal día, gasta diez veces sin que nadie mire. Así que un error
 * frena y pone un botón: seguir es una decisión de la persona, no del código.
 */

/**
 * ── El paso "revisar", y por qué está en el medio ──────────────────────────
 *
 * Entre armar el temario y escribirlo. Es el único momento en que cambiar una
 * línea cambia el ebook entero **sin costar nada**: cada capítulo se escribe
 * leyendo su título y su resumen del temario, así que corregir un título acá es
 * gratis y corregirlo después es rehacer el ebook.
 *
 * ⚠️ Y por eso el bucle YA NO ARRANCA SOLO después del temario. Antes seguía de
 * largo: se armaban diez capítulos sobre un temario que nadie había leído.
 */
/**
 * ── Y corregir el texto NO es un paso de acá ───────────────────────────────
 *
 * Estuvo un rato: fue un quinto paso adentro de esta ventana, y estaba mal. Un
 * modal de 576 px es para decidir una cosa —"¿lo escribo?", "¿lo rehago?"—, no
 * para sentarse a corregir diez capítulos de novecientas palabras en una
 * ventana que se cierra con un clic al costado.
 *
 * Se mudó a `productos/[id]/ebook`, que es una pantalla entera con su "volver",
 * igual que el editor de la página de venta. Desde acá se linkea, nada más.
 */
/**
 * ⚠️ "confirmar" ES UN PASO, Y SALIÓ DE UN AGUJERO DE VERDAD.
 *
 * Hasta el 09/09/26 el botón "Rehacerlo" devolvía a `contar`, y ahí el botón
 * de generar mandaba SIEMPRE `rehacer: false` — a `empezar(true)` no lo llamaba
 * nadie, nunca. Quien apretaba rehacer volvía a contar el tema, elegía formato
 * y colores, apretaba… y el servidor le devolvía **el mismo ebook de antes**
 * por el camino de "retomar". La pantalla no rehacía nada y no decía por qué.
 *
 * Y rehacer de verdad **borra el texto entero** (`capitulos: "[]"`), pisa el
 * temario y se lleva las fotos elegidas de cada capítulo. Eso no puede pasar
 * apretando un botón que dice "Escribir el ebook". Así que en el medio hay un
 * paso que dice qué se pierde, qué se conserva, qué sale y desde dónde bajar el
 * que ya está — que sigue estando hasta que el nuevo termine de armarse.
 */
type Paso = "contar" | "confirmar" | "revisar" | "escribiendo" | "listo";

/** Cada cuánto se le pregunta al servidor cómo viene. */
const MIRAR_CADA_MS = 4_000;
/**
 * Sin novedades por más de esto, se asume que la cadena se cortó.
 *
 * Un capítulo tarda alrededor de medio minuto, así que noventa segundos son tres
 * capítulos de margen: no se acusa de colgado a un modelo que está teniendo un
 * día lento. Y cuando se acusa no pasa nada malo —aparece un botón— porque lo
 * escrito está guardado y seguir cuesta lo mismo que costaba.
 */
const SIN_NOVEDADES_MS = 90_000;

/** El temario como lo devuelven las dos rutas que lo entregan. */
type TemarioEnPantalla = {
  titulo: string;
  promesa: string;
  capitulos: CapituloPlaneado[];
  /** Cuántas entradas ya están escritas. Esas no se tocan. */
  escritos: number;
  formato: FormatoDeEbook;
  /** Lo decide el servidor: con todo escrito, el temario ya no dirige nada. */
  editable: boolean;
};

export default function EbookIA({
  producto,
  padre,
  cupoInicial,
  estadoInicial,
  contado,
  onCerrar,
}: {
  producto: { id: string; name: string; tieneArchivo: boolean };
  /** De qué producto es bono o upsell, o `null` si es un principal. */
  padre: { nombre: string; rol: "BONO" | "UPSELL" } | null;
  cupoInicial: EstadoDelCupo;
  estadoInicial: EstadoDelBorrador | null;
  /**
   * Lo que contó la última vez, para no hacerlo escribir de nuevo.
   *
   * ⚠️ El formulario de "rehacerlo" arrancaba EN BLANCO. Y lo que sale depende
   * justo de eso: quien quería rehacer su ebook tenía que reescribir de memoria
   * el tema que había contado —normalmente más corto, con menos ganas— y el
   * ebook nuevo salía peor que el que estaba pisando. Y encima pagado.
   */
  contado: { tema: string; publico: string } | null;
  onCerrar: () => void;
}) {
  const [cupo, setCupo] = useState(cupoInicial);
  const [ebook, setEbook] = useState<EstadoDelBorrador | null>(estadoInicial);
  const [paso, setPaso] = useState<Paso>(() => {
    if (!estadoInicial) return "contar";
    if (estadoInicial.estado === "LISTO") return "listo";
    return "escribiendo";
  });

  const [tema, setTema] = useState(contado?.tema ?? "");

  /* Cómo quiere que salga. El formato hay que elegirlo ANTES de generar porque
     cambia lo que se le pide al modelo; el tema y el color no tocan el texto.

     ⚠️ ARRANCAN EN LO QUE YA HABÍA ELEGIDO, no en lo de fábrica. El botón
     "Rehacerlo" devuelve a esta misma pantalla, y con los valores de fábrica
     quien había hecho un recetario de 30 recetas volvía a una pantalla que
     decía "Ebook de texto": si apretaba sin mirar, recibía otro producto y una
     generación cobrada. */
  const elegidas = estadoInicial?.opciones ?? OPCIONES_DE_FABRICA;
  const [formato, setFormato] = useState<FormatoDeEbook>(elegidas.formato);
  const [temaVisual, setTemaVisual] = useState<TemaDeEbook>(elegidas.tema);
  const [cuantasRecetas, setCuantasRecetas] = useState<number>(elegidas.recetas);
  const [paleta, setPaleta] = useState<string>(elegidas.paleta);
  const [estilo, setEstilo] = useState<EstiloDeEbook>(elegidas.estilo);
  const [publico, setPublico] = useState(contado?.publico ?? "");

  /* Con qué color se pintan las miniaturas de los estilos: el que la persona
     acaba de elegir abajo, para que las cuatro se vean con SU color y no con
     uno de muestra. Sin paleta elegida —"la de tu página"— va el naranja del
     panel, que es lo que la mayoría termina viendo. */
  /* Un recetario no tiene prosa adentro, así que el estilo le cambia sólo la
     tapa. La pantalla tiene que decir eso y no otra cosa. */
  const esRecetario = formato === "recetario";

  const colorDeLaMiniatura =
    PALETAS.find((p) => p.clave === paleta)?.acento ?? "#c2410c";

  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gastoReserva, setGastoReserva] = useState(false);
  /* `true` cuando el ebook ya empezó: cerrar tiene que recargar, porque la
     tarjeta de atrás quedó vieja. */
  const [huboAlgo, setHuboAlgo] = useState(!!estadoInicial);

  /* El temario que se está revisando. Llega por dos puertas: pegado a la
     respuesta del temario recién armado —ya está en la mano, pedirlo de nuevo
     sería un viaje más que puede fallar justo después de una generación
     cobrada— o buscándolo cuando se vuelve a abrir. */
  const [temario, setTemario] = useState<TemarioEnPantalla | null>(null);
  /* Si se entró al editor desde la pantalla de escritura, hay a dónde volver
     sin guardar. Recién armado no: ahí "volver" no significa nada. */
  const [vengoDeEscribir, setVengoDeEscribir] = useState(false);

  /* ⚠️ Hay algo escrito a mano que se pierde si se cierra.
     Esta ventana se cierra con el fondo, y hasta acá eso no tenía nada que
     perder: lo escrito se guardaba solo, capítulo por capítulo. El editor del
     temario sí, y un clic al costado no puede llevarse diez renglones que
     alguien acaba de corregir. Es la misma guarda del editor de la página de
     venta, que además tapa la barra lateral. */
  const [sinGuardar, setSinGuardar] = useState(false);
  const { setBloqueado, avisar } = useSalida();
  useEffect(() => {
    setBloqueado(sinGuardar);
    /* Sin la limpieza, el aviso sobrevive a la ventana y sigue preguntando
       desde otra pantalla: el interruptor vive arriba, no acá. */
    return () => setBloqueado(false);
  }, [sinGuardar, setBloqueado]);

  /* ⚠️ Dos candados distintos, y hacen falta los dos.
     - `enVuelo` corta el doble clic: sin él, dos clics rápidos mandan dos
       pedidos y el segundo se choca contra el candado del servidor.
     - `vivo` corta el bucle cuando la ventana se cierra: sin él, el bucle
       sigue pidiendo capítulos contra un componente que ya no existe. */
  const enVuelo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const pedir = useCallback(async (url: string, cuerpo: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId: producto.id, ...cuerpo }),
    });
    const datos = await res.json().catch(() => null);
    return { ok: res.ok, datos: (datos ?? {}) as Record<string, unknown> };
  }, [producto.id]);

  /* ── Arrancar la cadena ───────────────────────────────────────────────────
     ══════════════════════════════════════════════════════════════════════════
     ACÁ HABÍA UN BUCLE, Y ESE BUCLE ERA EL PROBLEMA
     ══════════════════════════════════════════════════════════════════════════

     Antes esta función pedía un capítulo, esperaba, pedía el que sigue, y así
     hasta armar el PDF. O sea que quien manejaba la escritura era **esta
     pestaña**: irse la frenaba, y el cartel de abajo tenía que decirlo porque
     era la verdad.

     Ahora esto empuja UN eslabón y se corre. Del otro lado, cada capítulo
     llama al siguiente y el último llama a armar el PDF (ver `ebook-cadena`).
     La ventana pasa a mirar, no a manejar: el reloj de más abajo pregunta cómo
     viene, y si la persona cierra todo el ebook se termina igual. */
  const seguir = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      /* Con todos los capítulos escritos lo que falta es el PDF, no otro
         capítulo. Es el caso de quien vuelve a un ebook que quedó a un paso del
         final: la cadena se le cortó justo ahí, o cerró antes de que armara. */
      const yaEstaTodo = !!ebook && ebook.total > 0 && ebook.escritos >= ebook.total;
      const { ok, datos } = await pedir(
        yaEstaTodo ? "/api/digitales/ia/ebook/armar" : "/api/digitales/ia/ebook/paso",
        {},
      );
      if (!vivo.current) return;

      if (!ok) {
        setError(typeof datos.error === "string" ? datos.error : "No pudimos seguir. Probá de nuevo.");
        return;
      }

      const estado = datos.ebook as EstadoDelBorrador | undefined;
      if (estado) setEbook(estado);
      if (estado?.estado === "LISTO") setPaso("listo");

      /* `esperando` es el candado del servidor: ya hay alguien escribiendo este
         mismo capítulo. Antes eso era un error que frenaba el bucle; ahora es la
         respuesta normal si la cadena ya venía andando. No hay nada que avisar:
         el reloj va a mostrar el avance igual. */
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Lo escrito quedó guardado: probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }
  }, [pedir, ebook]);

  /* ── El reloj: cómo viene ─────────────────────────────────────────────────
     Mira, no escribe. Pregunta el estado cada pocos segundos mientras haya algo
     escribiéndose, y para cuando el ebook está listo o dio error.

     ⚠️ `preguntando` corta el solapamiento. Sin él, un servidor lento junta
     preguntas: se dispara la siguiente antes de que vuelva la anterior y quedan
     cinco en el aire pisándose el resultado. */
  const preguntando = useRef(false);
  /* Cuándo se vio avanzar por última vez. Si pasa demasiado sin novedades, se
     asume que la cadena se cortó en silencio y se ofrece el botón. */
  const ultimoAvance = useRef({ cuando: 0, escritos: -1 });
  const [seFreno, setSeFreno] = useState(false);

  useEffect(() => {
    if (paso !== "escribiendo") return;

    /* ⚠️ El reloj se pone en hora ACÁ y no en el `useRef` de arriba. `Date.now()`
       en el cuerpo del componente es impuro: se ejecuta en cada dibujo aunque
       sólo sirva el primero, y el linter lo corta. Además así se pone en hora
       cuando empieza a mirar, que es cuando empieza a contar la paciencia. */
    ultimoAvance.current = { cuando: Date.now(), escritos: -1 };

    const mirar = async () => {
      if (preguntando.current || !vivo.current) return;
      preguntando.current = true;
      try {
        const res = await fetch(
          `/api/digitales/ia/ebook/estado?productoId=${encodeURIComponent(producto.id)}`,
        );
        if (!res.ok || !vivo.current) return;
        const datos = (await res.json()) as { ebook?: EstadoDelBorrador };
        const fresco = datos.ebook;
        if (!fresco || !vivo.current) return;

        setEbook(fresco);
        if (fresco.escritos !== ultimoAvance.current.escritos) {
          ultimoAvance.current = { cuando: Date.now(), escritos: fresco.escritos };
          setSeFreno(false);
        } else if (Date.now() - ultimoAvance.current.cuando > SIN_NOVEDADES_MS) {
          setSeFreno(true);
        }

        if (fresco.estado === "LISTO") setPaso("listo");
        /* El error que guardó el servidor gana sobre el que tenga la pantalla:
           el que sabe por qué se cortó es el eslabón que se cortó. */
        if (fresco.error) setError(fresco.error);
      } catch {
        /* Una consulta que falla no es noticia: se vuelve a preguntar en cuatro
           segundos. Poner un cartel acá sería asustar por un hipo de red
           mientras el ebook se sigue escribiendo perfecto del otro lado. */
      } finally {
        preguntando.current = false;
      }
    };

    void mirar();
    const tic = setInterval(() => void mirar(), MIRAR_CADA_MS);
    return () => clearInterval(tic);
  }, [paso, producto.id]);

  /* ── Empezar (o rehacer) ──────────────────────────────────────────────── */
  const empezar = useCallback(async (rehacer: boolean) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      const { ok, datos } = await pedir("/api/digitales/ia/ebook", {
        tema, publico, rehacer,
        opciones: { formato, estilo, tema: temaVisual, paleta, recetas: cuantasRecetas },
      });
      if (!vivo.current) return;

      if (!ok) {
        setError(typeof datos.error === "string" ? datos.error : "No pudimos empezar. Probá de nuevo.");
        if (datos.cupo) setCupo(datos.cupo as EstadoDelCupo);
        return;
      }

      setHuboAlgo(true);
      if (datos.cupo) setCupo(datos.cupo as EstadoDelCupo);
      /* Sale de la bolsa que no vuelve: es el único momento en que esta
         ventana interrumpe. Misma decisión que en el embudo. */
      setGastoReserva(datos.salioDe === "bienvenida");

      const estado = datos.ebook as EstadoDelBorrador | undefined;
      if (estado) setEbook(estado);

      /* ⚠️ ACÁ SE FRENA, Y ANTES SEGUÍA DE LARGO.
         El temario está armado y pagado, pero todavía no se escribió una
         palabra: es el momento en que corregir sale gratis. Se muestra y se
         espera. Si el temario no vino —un ebook retomado, o una respuesta
         vieja— se sigue como siempre, que es mejor que una pantalla vacía. */
      const nuevo = datos.temario as TemarioEnPantalla | undefined;
      if (nuevo) {
        setTemario(nuevo);
        setVengoDeEscribir(false);
        setPaso("revisar");
        return;
      }
      setPaso("escribiendo");
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
      return;
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }

    /* Sólo si no hubo temario que revisar: con temario, escribir lo dispara el
       botón del editor. */
    if (vivo.current) void seguir();
  }, [pedir, tema, publico, formato, estilo, temaVisual, paleta, cuantasRecetas, seguir]);

  /* ── Abrir el temario desde la pantalla de escritura ──────────────────────
     Se busca en el momento y no viaja en cada vuelta del bucle: son varios
     miles de caracteres que la barra de progreso no usa para nada. Mismo
     criterio que con el texto de los capítulos. */
  const abrirTemario = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/digitales/ia/ebook/indice?productoId=${encodeURIComponent(producto.id)}`,
      );
      const datos = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!vivo.current) return;

      if (!res.ok || !datos?.ok) {
        setError(typeof datos?.error === "string" ? datos.error : "No pudimos abrir el temario.");
        return;
      }

      /* ⚠️ Manda lo que dice el SERVIDOR, no el estado que tiene la pantalla.
         El botón se dibuja mirando `ebook.estado`, que puede estar viejo: si el
         último capítulo se terminó de escribir en otra pestaña, acá seguiría
         diciendo ESCRIBIENDO y se abriría un editor que ya no cambia nada. */
      if (datos.editable !== true) {
        setError("El ebook ya está escrito, así que el temario no cambia nada. Si querés otro, hay que rehacerlo.");
        return;
      }

      setTemario(datos as unknown as TemarioEnPantalla);
      setVengoDeEscribir(true);
      setPaso("revisar");
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }
  }, [producto.id]);

  /* ── Guardar lo corregido y arrancar (o seguir) ───────────────────────────
     Si no se tocó nada no se guarda: escribir en la base para dejar todo igual
     es un pedido que puede fallar y arruinar un camino que iba bien. */
  const guardarYEscribir = useCallback(async (
    corregido: { titulo: string; promesa: string; capitulos: CapituloPlaneado[] },
    cambiado: boolean,
  ) => {
    if (enVuelo.current) return;

    if (!cambiado) {
      setPaso("escribiendo");
      void seguir();
      return;
    }

    enVuelo.current = true;
    setTrabajando(true);
    setError(null);

    try {
      const { ok, datos } = await pedir("/api/digitales/ia/ebook/indice", corregido);
      if (!vivo.current) return;

      if (!ok) {
        /* Se queda en el editor con el motivo escrito: mandarlo a escribir con
           lo que el servidor no aceptó sería escribir contra el temario viejo
           mientras la pantalla muestra el nuevo. */
        setError(typeof datos.error === "string" ? datos.error : "No pudimos guardar el temario.");
        return;
      }

      const estado = datos.ebook as EstadoDelBorrador | undefined;
      if (estado) setEbook(estado);
      setTemario(datos as unknown as TemarioEnPantalla);
      setPaso("escribiendo");
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
      return;
    } finally {
      enVuelo.current = false;
      if (vivo.current) setTrabajando(false);
    }

    if (vivo.current) void seguir();
  }, [pedir, seguir]);


  const cerrar = () => {
    if (trabajando) return;
    /* Pregunta sólo si hay algo a mano sin guardar; si no, cierra derecho. */
    if (!avisar()) return;
    if (huboAlgo) window.location.reload(); else onCerrar();
  };

  const temaCorto = tema.trim().length < MINIMO_TEMA;
  const sinCupo = cupo.quedan <= 0;

  /* ── ¿Esto va a pisar un ebook que ya existe? ────────────────────────────
     Generar con uno empezado NO es lo mismo que generar de cero: del otro lado
     el texto se borra entero. Ver el comentario de `Paso`. */
  const rehaciendo = !!ebook;
  /* Uno incluido por ebook. Es la misma cuenta que hace el servidor
     (`esGratis`), y por eso mira `reintentos`, no cuántas veces se apretó acá. */
  const rehacerEsGratis = rehaciendo && (ebook?.reintentos ?? 0) < 1;
  /* ⚠️ El cupo frena lo que se cobra, y el rehacer incluido no sale de ninguna
     bolsa: sin esta distinción, quien se quedó sin generaciones tampoco podía
     usar el rehacer que ya tenía pagado. */
  const frenaElCupo = sinCupo && !rehacerEsGratis;
  const escritos = ebook?.escritos ?? 0;
  const total = ebook?.total ?? 0;
  const porcentaje = total > 0 ? Math.round((escritos / total) * 100) : 0;

  /* ── ¿La cadena está andando del otro lado? ───────────────────────────────
     No se puede preguntar directo: entre un capítulo y el siguiente hay un
     hueco de un segundo en el que no hay nadie escribiendo, y `trabajando` del
     servidor está en falso. Un botón que aparece y desaparece cada treinta
     segundos es peor que no tenerlo.

     Así que se deduce del estado, que sí es estable: mientras falte algo por
     hacer y no haya un error, hay un eslabón en camino. Las tres formas de que
     no lo haya son las tres que se restan.

     `seFreno` es la red: si pasaron noventa segundos sin que avance el contador,
     algún eslabón se cayó sin dejar error —una función que la plataforma mató,
     una red que se cortó— y hay que devolverle el botón a la persona. Sin eso,
     un ebook trabado se vería "escribiéndose" para siempre. */
  const cadenaAndando =
    !!ebook
    && (ebook.estado === "ESCRIBIENDO" || ebook.estado === "COMPLETO")
    && !ebook.error
    && !error
    && !seFreno;

  /* ── ¿Se puede corregir a mano? ───────────────────────────────────────────
     Los dos formatos tienen su editor desde el 09/09/26. Acá decía que un
     recetario no, porque sus recetas son campos y aquel editor dibujaba
     párrafos; ahora hay uno para cada uno.

     ⚠️ Esto NO es la decisión: la toma el servidor. Acá sólo se evita ofrecer
     un botón que ya sabemos que va a contestar que no. */
  const puedeCorregir = !!ebook;

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrar} />

      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-black text-gray-900 panel-oscuro:text-gray-100">
            {paso === "revisar"
              ? <ListChecks className="h-4 w-4 text-orange-500" />
              : <BookOpen className="h-4 w-4 text-orange-500" />}
            {paso === "listo"
              ? "Tu ebook está listo"
              : paso === "revisar"
                ? "Revisá el temario"
                : "Escribí tu ebook con IA"}
          </p>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            disabled={trabajando}
            className="w-8 h-8 shrink-0 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 flex items-center justify-center text-gray-500 panel-oscuro:text-gray-400 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Contar de qué se trata ──────────────────────────────────── */}
          {paso === "contar" && (
            <>
              <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Contame de qué se trata <strong>{producto.name}</strong> y lo escribo entero:
                el temario y todos los capítulos, en un PDF listo para vender.
              </p>

              {/* ⚠️ ESTE RENGLÓN LE SACA TRABAJO A LA PERSONA, no le agrega
                  información. Hasta el 08/09/26 el ebook de un bono se escribía
                  sin saber de qué producto colgaba, así que había que volver a
                  explicar todo el contexto acá abajo —en cada bono y en cada
                  upsell— o pagar una generación por algo que no servía. Ahora el
                  servidor se lo manda al modelo, y esto es lo único que hace que
                  se note: sin el cartel, el dato existe y nadie lo sabe. */}
              {padre && (
                <p className="mt-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-800/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                  Es {padre.rol === "BONO" ? "un bono de" : "un upsell de"}{" "}
                  <strong className="text-gray-900 panel-oscuro:text-gray-100">{padre.nombre}</strong>.
                  Ya sé de qué se trata ese producto, así que no hace falta que lo repitas: contame
                  sólo lo de {padre.rol === "BONO" ? "este bono" : "este upsell"}.
                </p>
              )}

              {/* ⚠️ Se avisa ANTES de apretar, no después. Reemplazar un archivo
                  que la persona subió a mano sin avisarle es perderle el
                  trabajo. */}
              {producto.tieneArchivo && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Este producto ya tiene un PDF cargado. Si escribimos el ebook, lo reemplaza.</span>
                </p>
              )}

              <label className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                ¿De qué se trata?
              </label>
              <textarea
                value={tema}
                onChange={(e) => setTema(e.target.value.slice(0, LARGO_TEMA))}
                rows={5}
                maxLength={LARGO_TEMA}
                disabled={trabajando}
                placeholder="Contá qué vas a enseñar, con tus palabras. Si ya tenés el índice pensado, pegalo tal cual."
                className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                {tema.trim().length} de {LARGO_TEMA} · cuanto más cuentes, mejor sale
              </p>

              <label className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                ¿Para quién es? <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                value={publico}
                onChange={(e) => setPublico(e.target.value.slice(0, LARGO_PUBLICO))}
                maxLength={LARGO_PUBLICO}
                disabled={trabajando}
                placeholder="Ej: gente que recién arranca y no tiene herramientas"
                className="mt-1.5 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60"
              />

              {/* ── Cómo querés que salga ──────────────────────────────── */}

              <p className="mt-5 text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                ¿Cómo querés que salga?
              </p>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FORMATOS.map((f) => {
                  /* ⚠️ Apagado si el modelo todavía no lo sabe escribir. Ver
                     `FORMATOS_LISTOS`: elegirlo daría un ebook de otro tipo. */
                  const listo = FORMATOS_LISTOS.includes(f);
                  return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => listo && setFormato(f)}
                    disabled={trabajando || !listo}
                    title={listo ? undefined : "Todavía no está disponible"}
                    aria-pressed={formato === f}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-60 ${
                      formato === f
                        ? "border-orange-400 bg-orange-50 panel-oscuro:bg-orange-500/10"
                        : "border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                      {QUE_ES_CADA_FORMATO[f].nombre}
                      {!listo && (
                        <span className="rounded-full bg-gray-200 panel-oscuro:bg-gray-700 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-gray-600 panel-oscuro:text-gray-300">
                          Muy pronto
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
                      {QUE_ES_CADA_FORMATO[f].explica}
                    </span>
                  </button>
                  );
                })}
              </div>

              {/* ⚠️ Sólo para el recetario, y no es un adorno: este número va
                  en la tapa —"30 RECETAS"— y es lo que justifica el precio.
                  Dejárselo decidir al modelo sería que el producto salga
                  distinto del que la persona pensaba vender.
                  En un ebook de texto no aparece porque no significa nada. */}
              {formato === "recetario" && (
                <div className="mt-3 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3.5 py-3">
                  <p className="text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                    ¿Cuántas recetas?
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                    Una por hoja. El número va en la tapa.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RECETAS_OPCIONES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCuantasRecetas(n)}
                        disabled={trabajando}
                        aria-pressed={cuantasRecetas === n}
                        className={`min-w-[64px] rounded-lg border px-3 py-2 text-[13px] font-bold transition-colors disabled:opacity-60 ${
                          cuantasRecetas === n
                            ? "border-orange-400 bg-orange-50 text-orange-800 panel-oscuro:bg-orange-500/10 panel-oscuro:text-orange-300"
                            : "border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  EL ESTILO — Y QUE SE PUEDE CAMBIAR DESPUÉS, DICHO ACÁ
                  ══════════════════════════════════════════════════════════

                  ⚠️ El renglón de abajo no es un consuelo: sin él, esto parece
                  una elección definitiva como el formato, y alguien se queda
                  media hora comparando cuatro miniaturas de 44 píxeles antes de
                  gastar una generación. Sabiendo que se cambia gratis con el
                  ebook ya escrito —y viéndolo con su texto, que es cuando se
                  puede juzgar de verdad— la decisión de acá deja de pesar. */}
              {/* ⚠️ Y en un RECETARIO dice otra cosa, porque hace otra cosa.
                  El estilo cambia la hoja de adentro sólo donde hay prosa; la
                  hoja de una receta tiene su propio molde y todavía no lo
                  escucha, así que las cuatro salen iguales adentro. Prometer
                  "dos columnas" ahí sería que alguien elija mirando una hoja
                  que ese archivo nunca va a tener. Ver `MiniaturaDeEstilo`. */}
              <p className="mt-5 text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                {esRecetario ? "¿Cómo querés que sea la tapa?" : "¿Cómo querés que esté armada la hoja?"}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                {esRecetario
                  ? "En un recetario esto cambia la tapa. La hoja de cada receta es la misma en los cuatro. Lo podés cambiar después, gratis."
                  : "Esto lo podés cambiar después, gratis y sin volver a escribirlo."}
              </p>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ESTILOS.map((x) => {
                  /* Mismo criterio que los formatos: un molde a medias se apaga
                     acá y no entrega una hoja que no es la que se eligió. */
                  const listo = ESTILOS_LISTOS.includes(x);
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={() => listo && setEstilo(x)}
                      disabled={trabajando || !listo}
                      title={listo ? (esRecetario ? QUE_ES_CADA_ESTILO[x].tapa : QUE_ES_CADA_ESTILO[x].explica) : "Todavía no está disponible"}
                      aria-pressed={estilo === x}
                      className={`rounded-xl border p-2 text-left transition-colors disabled:opacity-60 ${
                        estilo === x
                          ? "border-orange-400 bg-orange-50 panel-oscuro:bg-orange-500/10"
                          : "border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                      }`}
                    >
                      <span className="block overflow-hidden rounded-md ring-1 ring-black/10 panel-oscuro:ring-white/10">
                        <MiniaturaDeEstilo
                          estilo={x}
                          muestra={esRecetario ? "tapa" : "hoja"}
                          acento={colorDeLaMiniatura}
                          tinta="#0f172a"
                          papel="#FCFAF7"
                        />
                      </span>
                      <span className="mt-1.5 block text-[12px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                        {QUE_ES_CADA_ESTILO[x].nombre}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lo que hace y lo que le cuesta, del que está elegido. Uno solo
                  y no los cuatro: cuatro descripciones abajo de cuatro
                  miniaturas es una pared de texto que nadie lee. */}
              <p className="mt-2 text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
                {esRecetario ? (
                  QUE_ES_CADA_ESTILO[estilo].tapa
                ) : (
                  <>
                    {QUE_ES_CADA_ESTILO[estilo].explica}{" "}
                    <span className="text-gray-500 panel-oscuro:text-gray-500">
                      {QUE_ES_CADA_ESTILO[estilo].contra}
                    </span>
                  </>
                )}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {TEMAS.map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setTemaVisual(x)}
                    disabled={trabajando}
                    aria-pressed={temaVisual === x}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors disabled:opacity-60 ${
                      temaVisual === x
                        ? "border-orange-400 bg-orange-50 panel-oscuro:bg-orange-500/10"
                        : "border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-7 w-5 shrink-0 rounded border ${
                        x === "oscuro"
                          ? "border-gray-700 bg-gray-900"
                          : "border-gray-300 bg-[#FCFAF7]"
                      }`}
                    />
                    <span className="text-left">
                      <span className="block text-[12.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                        {QUE_ES_CADA_TEMA[x].nombre}
                      </span>
                      <span className="block text-[11px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                        {QUE_ES_CADA_TEMA[x].explica}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* ⚠️ Los colores salen de `PALETAS` y no hay selector libre: cada
                  paleta trae su acento Y el texto que va encima, medidos entre
                  sí. Con un color a elección, una franja clara con texto blanco
                  encima queda ilegible adentro de un archivo que ya se vendió y
                  ya se mandó, y eso no se arregla después. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaleta("")}
                  disabled={trabajando}
                  aria-pressed={paleta === ""}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold transition-colors disabled:opacity-60 ${
                    paleta === ""
                      ? "border-orange-400 bg-orange-50 text-orange-800 panel-oscuro:bg-orange-500/10 panel-oscuro:text-orange-300"
                      : "border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                  }`}
                >
                  El de tu página
                </button>

                {PALETAS.map((p) => (
                  <button
                    key={p.clave}
                    type="button"
                    onClick={() => setPaleta(p.clave)}
                    disabled={trabajando}
                    aria-pressed={paleta === p.clave}
                    aria-label={p.nombre}
                    title={p.nombre}
                    className={`h-8 w-8 rounded-full border-2 transition-transform disabled:opacity-60 ${
                      paleta === p.clave
                        ? "border-gray-900 panel-oscuro:border-gray-100 scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: p.acento }}
                  />
                ))}
              </div>

              <Cupo cupo={cupo} />

              {error && <Aviso>{error}</Aviso>}

              {/* ⚠️ Con un ebook empezado esto NO genera: lleva al paso que
                  dice qué se pierde. Generar de una desde acá es lo que borraba
                  el texto sin preguntar. */}
              <button
                onClick={() => (rehaciendo ? setPaso("confirmar") : empezar(false))}
                disabled={trabajando || temaCorto || frenaElCupo}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {trabajando ? "Armando el temario…" : rehaciendo ? "Rehacer el ebook" : "Escribir el ebook"}
              </button>

              {/* ⚠️ Sólo se promete lo que existe. Acá decía "vas a poder
                  leerlo y cambiarlo antes de publicar" cuando no había ningún
                  editor, y eso es lo que después se reclama.

                  Hoy hay editor DEL TEMARIO —primero se muestra la lista de
                  capítulos y se puede corregir— pero **no del texto escrito**.
                  Así que la frase dice temario, no ebook. */}
              <p className="mt-2 text-center text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                Primero te muestro el temario para que lo corrijas. Después tarda unos
                minutos y se escribe solo: podés cerrar la ventana.
              </p>
            </>
          )}

          {/* ── Confirmar que se pisa el que ya está ─────────────────────
              ══════════════════════════════════════════════════════════════
              ⚠️ ESTE PASO ES EL FRENO DE MANO, Y ANTES NO EXISTÍA.
              ══════════════════════════════════════════════════════════════

              Rehacer no agrega un ebook al lado del que hay: **pisa el que
              hay**. Del otro lado el texto se borra entero, el temario se
              reemplaza y las fotos elegidas de cada capítulo se van con él.

              Todo eso, escrito, ANTES de apretar. No alcanza con un "¿estás
              segura?": lo que hace que alguien decida bien es saber qué pierde,
              qué se queda, cuánto sale, y que el archivo de ahora se puede bajar
              en este mismo momento. Por eso el botón de descargar está ACÁ
              ADENTRO y no en un consejo que se lee después: quien está por
              rehacer no cierra la ventana, busca la tarjeta y vuelve. */}
          {paso === "confirmar" && (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-[13px] font-bold text-amber-900 panel-oscuro:text-amber-200">
                    Esto reemplaza el ebook que ya tenés
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-amber-800 panel-oscuro:text-amber-300">
                    No se guarda una copia. Se escribe otro desde cero con lo que contaste acá
                    arriba, y el de ahora no se puede recuperar.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
                Qué se pierde
              </p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                <li>
                  El texto{escritos > 0 && (escritos === 1
                    ? " del capítulo que ya está escrito"
                    : ` de los ${escritos} capítulos que ya están escritos`)}, y todo lo que
                  hayas corregido a mano.
                </li>
                <li>El temario, con los títulos que le hayas cambiado.</li>
                <li>Las fotos que hayas elegido en cada capítulo.</li>
              </ul>

              <p className="mt-3.5 text-[12px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
                Qué se queda
              </p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                {/* ⚠️ La tapa se conserva a propósito, y por eso se dice. Si la
                    subiste vos no está en ningún otro lado: tirarla sería
                    perderte un archivo tuyo por apretar un botón que hablaba del
                    texto. Ver el `tapa:` de la ruta que rehace. */}
                <li>La foto de la tapa, la hayas buscado o subido vos. Después la podés cambiar.</li>
                <li>Lo que elegiste acá arriba: el formato, el tema y el color.</li>
                {producto.tieneArchivo && (
                  <li>
                    El PDF que está colgado del producto <strong>sigue estando</strong> mientras se
                    escribe el nuevo. Recién lo reemplaza cuando el otro está armado.
                  </li>
                )}
              </ul>

              {producto.tieneArchivo && (
                <a
                  href={`/api/digitales/productos/${producto.id}/archivo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Bajar el que tengo ahora
                </a>
              )}

              {/* Cuánto sale, con las palabras del cupo. El primero por ebook
                  está incluido —lo decide el servidor mirando `reintentos`, no
                  esta pantalla— y del segundo en adelante sale una generación. */}
              <p className="mt-4 rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                {rehacerEsGratis
                  ? "Este rehacer está incluido: no gasta ninguna generación. Del segundo en adelante sí."
                  : "Este rehacer gasta una generación de tu cupo."}
              </p>

              {!rehacerEsGratis && <Cupo cupo={cupo} />}

              {error && <Aviso>{error}</Aviso>}

              <button
                onClick={() => empezar(true)}
                disabled={trabajando || temaCorto || frenaElCupo}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {trabajando ? "Armando el temario…" : "Sí, rehacerlo"}
              </button>

              <button
                onClick={() => { setPaso("contar"); setError(null); }}
                disabled={trabajando}
                className="mt-2 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                No, dejalo como está
              </button>
            </>
          )}

          {/* ── Revisar el temario ──────────────────────────────────────── */}
          {paso === "revisar" && (temario ? (
            <Temario
              inicial={temario}
              guardando={trabajando}
              error={error}
              onCambio={setSinGuardar}
              onEscribir={guardarYEscribir}
              onVolver={vengoDeEscribir ? () => { setError(null); setPaso("escribiendo"); } : null}
            />
          ) : (
            /* No debería pasar —siempre se guarda el temario antes de venir
               acá— pero una ventana en blanco arriba de un ebook pagado no es
               una opción. */
            <>
              <Aviso>No pudimos mostrar el temario.</Aviso>
              <button
                onClick={() => setPaso("escribiendo")}
                className="mt-3 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
              >
                Seguir igual
              </button>
            </>
          ))}

          {/* ── Escribiendo ─────────────────────────────────────────────── */}
          {paso === "escribiendo" && (
            <>
              {gastoReserva && (
                <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Este salió de tus ebooks de bienvenida, que <strong>no se renuevan</strong>.
                    Te quedan {cupo.quedanDeBienvenida}.
                  </span>
                </p>
              )}

              <p className="text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">
                {ebook?.titulo ?? producto.name}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 panel-oscuro:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                {/* ⚠️ Con la palabra de su formato. Un recetario contaba
                    secciones, así que a alguien que eligió 10 recetas le decía
                    "2 de 4": el número que ve tiene que ser el que eligió. */}
                <span className="shrink-0 text-[12px] font-bold text-gray-500 panel-oscuro:text-gray-400">
                  {escritos} de {total} {COMO_SE_LLAMA[ebook?.opciones.formato ?? formato].partes}
                </span>
              </div>

              <ul className="mt-4 space-y-1.5">
                {(ebook?.capitulos ?? []).map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                    <span className="mt-0.5 shrink-0">
                      {c.listo
                        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                        : i === escritos && (trabajando || cadenaAndando)
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                          : <span className="block h-3.5 w-3.5 rounded-full border border-gray-200 panel-oscuro:border-gray-700" />}
                    </span>
                    <span className={c.listo
                      ? "text-gray-500 panel-oscuro:text-gray-500 line-through"
                      : "text-gray-800 panel-oscuro:text-gray-200"}>
                      {c.titulo}
                    </span>
                  </li>
                ))}
              </ul>

              {error && <Aviso>{error}</Aviso>}

              {/* ⚠️ EL BOTÓN VA SIEMPRE QUE NO SE ESTÉ TRABAJANDO, no sólo
                  cuando hubo error.

                  Dos motivos, y el segundo era un agujero: cuando alguien vuelve
                  a una ventana que dejó a medias, el bucle NO arranca solo —cada
                  vuelta cuesta plata, así que seguir lo decide la persona—. Sin
                  el botón acá, volver con todos los capítulos escritos y el PDF
                  sin armar dejaba la lista entera tildada y nada que apretar: el
                  ebook pago quedaba a un paso del final, sin salida.

                  Y el otro: un bucle que reintenta solo contra un modelo que está
                  fallando gasta diez veces sin que nadie mire.

                  ⚠️ Y AHORA TAMPOCO MIENTRAS LA CADENA ANDA. Desde que la
                  escritura pasa del lado del servidor, `trabajando` sólo es
                  cierto durante el pedido que la arranca: un segundo. Con esa
                  sola condición, el botón "Seguir escribiendo" quedaba a la
                  vista los tres minutos enteros, al lado de una barra que
                  avanzaba sola. Quien lo apretara no rompería nada —el candado
                  lo rebota— pero es un botón que se ofrece a hacer algo que ya
                  está pasando. Ver `cadenaAndando`. */}
              {!trabajando && !cadenaAndando && (
                <button
                  onClick={() => void seguir()}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  {error
                    ? "Seguir desde donde iba"
                    : escritos >= total && total > 0
                      ? "Armar el PDF"
                      : "Seguir escribiendo"}
                </button>
              )}

              {/* ⚠️ Corregir lo que FALTA, que todavía se puede.
                  Aparece sólo mientras el temario dirige algo: con todo escrito
                  los títulos del PDF salen de cada capítulo y no de acá, así que
                  el botón haría sentir que se está arreglando algo mientras el
                  archivo sale igual. Lo decide `sePuedeEditarElTemario`, la
                  misma función con la que el servidor acepta o rechaza. */}
              {!trabajando && !cadenaAndando && ebook && sePuedeEditarElTemario(ebook.estado) && (
                <button
                  onClick={() => void abrirTemario()}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <ListChecks className="h-4 w-4" />
                  {escritos > 0 ? "Corregir lo que falta" : "Revisar el temario"}
                </button>
              )}

              {/* ⚠️ ESTE CARTEL YA DIJO LAS DOS COSAS CONTRARIAS, Y LAS DOS
                  VECES DIJO LA VERDAD DEL DÍA.

                  Primero decía "cuando vuelvas sigue desde donde iba", que se
                  leía como que seguía solo — y no seguía: el bucle vivía en esta
                  pantalla. Se cambió por "tenés que dejar esta ventana abierta",
                  que era honesto mientras fue cierto.

                  Hoy la escritura la maneja el servidor (ver `ebook-cadena`), y
                  la ventana sólo mira. Así que vuelve a decir que se puede ir,
                  pero ahora porque es verdad.

                  La regla es la misma de siempre: acá se dice lo que el código
                  hace, no lo que quedaría lindo. Si alguna vez la cadena se
                  saca, este párrafo vuelve atrás en el mismo commit. */}
              <p className="mt-4 rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Tarda unos minutos y <strong>podés cerrar esto tranquila</strong>: se sigue
                escribiendo solo, aunque apagues la computadora.
                <br />
                Cada {COMO_SE_LLAMA[ebook?.opciones.formato ?? formato].parte} queda guardado apenas
                se escribe. Cuando el PDF esté armado lo vas a ver colgado del producto, sin
                tener que apretar nada.
              </p>
            </>
          )}

          {/* ── Listo ───────────────────────────────────────────────────── */}
          {paso === "listo" && (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-4 py-3.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-900 panel-oscuro:text-emerald-300">
                    {ebook?.titulo ?? producto.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-emerald-800 panel-oscuro:text-emerald-400">
                    Ya está cargado como el archivo de este producto. Es el que se le va a
                    entregar a quien compre.
                  </p>
                </div>
              </div>

              {/* ⚠️ Que lo LEA antes de publicar. Lo que se vende lo firma quien
                  vende: nosotros no podemos garantizar que un modelo no escribió
                  una macana, y quien cobra es quien responde.

                  ⚠️ Y este párrafo terminaba en "cambiá lo que contaste y volvé
                  a escribirlo", que era el único camino que había: rehacer el
                  ebook entero —y pagar otra generación— para arreglar un dato.
                  Ahora hay un botón que lo corrige a mano y gratis, así que el
                  consejo cambió. Si algún día ese botón se saca, esta frase
                  vuelve atrás EN EL MISMO COMMIT. */}
              <p className="mt-4 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                <strong>Leelo antes de publicarlo.</strong> Lo escribió una IA a partir de lo
                que le contaste, y quien vende es quien responde por lo que dice.{" "}
                {puedeCorregir
                  ? "Si algo no te cierra, corregilo acá abajo: no gasta ninguna generación."
                  : "Si algo no te cierra, cambiá lo que contaste y volvé a escribirlo."}
              </p>

              <Cupo cupo={cupo} />

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={cerrar}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
                >
                  Listo
                </button>
                {/* Al lado de "Listo" y no abajo de "Rehacerlo": es el arreglo
                    que no cuesta nada, y tiene que ser el primero que se ve.
                    Rehacer —que tira el ebook y cobra otra generación— queda en
                    su propio renglón, donde no se aprieta sin querer. */}
                {/* ⚠️ Un enlace de verdad, no un botón que cambia de paso: el
                    editor es OTRA PANTALLA. Y por eso lleva a una dirección que
                    se puede guardar, compartir y recargar — un paso adentro de
                    un modal no tiene ninguna de las tres. */}
                {puedeCorregir && (
                  <a
                    href={`/digitales/productos/${producto.id}/ebook`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 px-4 py-3 text-sm font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar el contenido
                  </a>
                )}
              </div>

              {error && <Aviso>{error}</Aviso>}

              <button
                onClick={() => { setPaso("contar"); setError(null); }}
                disabled={trabajando}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-3 text-sm font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {ebook && ebook.reintentos < 1 ? "Rehacerlo (uno gratis)" : "Rehacerlo"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * El editor del temario.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA PANTALLA MÁS BARATA DE TODO EL EBOOK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cada capítulo se escribe leyendo **su título y su resumen** de esta lista, y
 * nada más (ver `pedidoDelCapitulo`). O sea que un renglón cambiado acá cambia
 * el capítulo entero antes de que exista, gratis. El mismo arreglo después de
 * escrito cuesta rehacer el ebook.
 *
 * ── ⚠️ Por qué el botón se prende con la función del servidor ───────────────
 *
 * `revisarTemario` es la misma que decide del otro lado si el temario entra.
 * Escribir acá una versión "parecida" de las reglas es el camino conocido a que
 * la pantalla habilite el botón y el servidor conteste que no —o peor, a que
 * los dos digan cosas distintas sobre el mismo capítulo—. Una regla, un
 * mensaje, las dos puntas.
 *
 * ── Lo que no se puede tocar, y se ve ──────────────────────────────────────
 *
 * Lo ya escrito sale con candado y sin campos. No es una restricción de
 * cortesía: el capítulo escrito Nº 3 es el de la entrada Nº 3 por posición y
 * por nada más, así que moverla dejaría el texto de uno abajo del título de
 * otro — y eso no falla, sale un PDF perfecto que dice cualquier cosa.
 */
function Temario({
  inicial,
  guardando,
  error,
  onCambio,
  onEscribir,
  onVolver,
}: {
  inicial: TemarioEnPantalla;
  guardando: boolean;
  error: string | null;
  /** Avisa hacia arriba si hay algo escrito a mano que se perdería al cerrar. */
  onCambio: (hay: boolean) => void;
  onEscribir: (
    corregido: { titulo: string; promesa: string; capitulos: CapituloPlaneado[] },
    cambiado: boolean,
  ) => void;
  onVolver: (() => void) | null;
}) {
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [promesa, setPromesa] = useState(inicial.promesa);
  const [capitulos, setCapitulos] = useState<CapituloPlaneado[]>(inicial.capitulos);

  const esRecetario = inicial.formato === "recetario";
  const nombres = COMO_SE_LLAMA[inicial.formato];
  /* Las primeras `escritos` entradas ya tienen su capítulo escrito y pagado. */
  const escritos = Math.min(inicial.escritos, capitulos.length);
  const faltan = capitulos.length - escritos;

  /* La misma revisión que hace el servidor, con el mismo mensaje. */
  const revision = revisarTemario(
    { titulo, promesa, capitulos },
    { capitulos: inicial.capitulos, escritos: inicial.escritos, esRecetario },
  );
  const falta = revision.ok ? null : revision.error;

  /* Se compara el resultado LIMADO contra lo guardado: así un espacio de más al
     final no cuenta como un cambio y no dispara un guardado al pedo. */
  const cambiado = revision.ok && JSON.stringify(revision.temario) !== JSON.stringify({
    titulo: inicial.titulo,
    promesa: inicial.promesa,
    capitulos: inicial.capitulos,
  });

  /* Se avisa hacia arriba, que es donde está el botón de cerrar. Dos efectos y
     no uno: la limpieza del segundo corre SÓLO al desmontarse, así que apagar
     el aviso al salir del editor no se mezcla con prenderlo al escribir. */
  useEffect(() => { onCambio(cambiado); }, [cambiado, onCambio]);
  useEffect(() => () => onCambio(false), [onCambio]);

  const cambiar = (i: number, campo: keyof CapituloPlaneado, valor: string) =>
    setCapitulos((cs) => cs.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));

  const borrar = (i: number) => setCapitulos((cs) => cs.filter((_, j) => j !== i));

  const mover = (i: number, hacia: -1 | 1) =>
    setCapitulos((cs) => {
      const j = i + hacia;
      /* Nunca por arriba de lo escrito: ahí empieza lo que no se toca. */
      if (j < escritos || j >= cs.length) return cs;
      const copia = [...cs];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const agregar = () =>
    setCapitulos((cs) =>
      cs.length >= CAPITULOS_MAX ? cs : [...cs, { titulo: "", resumen: "", foto: "" }]);

  /* Agregar y borrar sólo en un ebook de texto: las secciones de un recetario
     son el reparto de las recetas que se eligieron y se pagaron. */
  const sePuedeAgregar = !esRecetario && capitulos.length < CAPITULOS_MAX;
  /* Y no por debajo del mínimo: dejar borrar hasta tres para después apagar el
     botón con un cartel es hacerle deshacer el trabajo a alguien. */
  const sePuedeBorrar = !esRecetario && capitulos.length > CAPITULOS_MIN && faltan > 1;

  const campo =
    "w-full rounded-lg border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3 py-2 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60";
  const chico =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <>
      <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
        Esto es lo que armó la IA.{" "}
        {escritos === 0 ? (
          <>
            Todavía <strong>no se escribió nada</strong>: lo que corrijas acá sale gratis y
            cambia el ebook entero.
          </>
        ) : (
          <>
            Los primeros {escritos} ya están escritos y no se tocan. Podés corregir{" "}
            <strong>lo que falta</strong>.
          </>
        )}
      </p>

      <label className="mt-4 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
        Título
      </label>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value.slice(0, LARGO_TITULO_EBOOK))}
        maxLength={LARGO_TITULO_EBOOK}
        disabled={guardando}
        className={`mt-1.5 ${campo}`}
      />

      <label className="mt-3 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
        La promesa de la tapa <span className="font-normal text-gray-400">(opcional)</span>
      </label>
      <textarea
        value={promesa}
        onChange={(e) => setPromesa(e.target.value.slice(0, LARGO_RESUMEN_CAPITULO))}
        rows={2}
        maxLength={LARGO_RESUMEN_CAPITULO}
        disabled={guardando}
        placeholder="Qué va a poder hacer quien lo lea cuando termine."
        className={`mt-1.5 ${campo}`}
      />

      <div className="mt-5 flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
          {/* Con la palabra de su formato: las de un recetario son secciones que
              agrupan recetas, no recetas sueltas. Ver `COMO_SE_LLAMA.tramo`. */}
          {capitulos.length} {capitulos.length === 1 ? nombres.tramo : nombres.tramos}
        </p>
        {esRecetario && (
          <p className="text-[11px] text-gray-400 panel-oscuro:text-gray-500">
            Se pueden renombrar, no agregar ni quitar
          </p>
        )}
      </div>

      <p className="mt-1 text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
        El resumen es lo único que se lee para escribir cada {nombres.tramo}. La foto se
        busca tal cual: describí una escena que se pueda fotografiar.
      </p>

      <ul className="mt-3 space-y-2.5">
        {capitulos.map((c, i) => {
          const trabado = i < escritos;
          return (
            <li
              key={i}
              className={`rounded-xl border p-3 ${
                trabado
                  ? "border-gray-100 bg-gray-50 panel-oscuro:border-gray-800 panel-oscuro:bg-gray-800/40"
                  : "border-gray-200 panel-oscuro:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
                  {nombres.tramo} {i + 1}
                </span>

                {trabado ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 panel-oscuro:text-emerald-400">
                    <Lock className="h-3 w-3" /> Ya escrito
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      disabled={guardando || i <= escritos}
                      aria-label={`Subir ${nombres.tramo} ${i + 1}`}
                      className={chico}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      disabled={guardando || i >= capitulos.length - 1}
                      aria-label={`Bajar ${nombres.tramo} ${i + 1}`}
                      className={chico}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {sePuedeBorrar && (
                      <button
                        type="button"
                        onClick={() => borrar(i)}
                        disabled={guardando}
                        aria-label={`Borrar ${nombres.tramo} ${i + 1}`}
                        className={`${chico} hover:text-red-600`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {trabado ? (
                <p className="mt-1.5 text-[13px] font-bold text-gray-500 panel-oscuro:text-gray-400">
                  {c.titulo}
                </p>
              ) : (
                <>
                  <input
                    value={c.titulo}
                    onChange={(e) => cambiar(i, "titulo", e.target.value.slice(0, LARGO_TITULO_CAPITULO))}
                    maxLength={LARGO_TITULO_CAPITULO}
                    disabled={guardando}
                    placeholder={`Título del ${nombres.tramo}`}
                    className={`mt-1.5 ${campo} font-bold`}
                  />
                  <textarea
                    value={c.resumen}
                    onChange={(e) => cambiar(i, "resumen", e.target.value.slice(0, LARGO_RESUMEN_CAPITULO))}
                    rows={2}
                    maxLength={LARGO_RESUMEN_CAPITULO}
                    disabled={guardando}
                    placeholder="De qué se trata, en dos renglones."
                    className={`mt-1.5 ${campo}`}
                  />
                  {/* El tope aparece recién cuando falta poco. Un contador
                      siempre a la vista es ruido en diez renglones; un campo
                      que deja de aceptar letras sin decir por qué se siente
                      como que la pantalla se colgó. */}
                  {c.resumen.length > LARGO_RESUMEN_CAPITULO * 0.8 && (
                    <p className="mt-0.5 text-right text-[10.5px] text-gray-400 panel-oscuro:text-gray-500">
                      {c.resumen.length} de {LARGO_RESUMEN_CAPITULO}
                    </p>
                  )}
                  <input
                    value={c.foto}
                    onChange={(e) => cambiar(i, "foto", e.target.value.slice(0, LARGO_FOTO))}
                    maxLength={LARGO_FOTO}
                    disabled={guardando}
                    placeholder="Qué foto buscar: manos amasando harina"
                    className={`mt-1.5 ${campo} text-[12px]`}
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>

      {sePuedeAgregar && (
        <button
          type="button"
          onClick={agregar}
          disabled={guardando}
          className="mt-2.5 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2.5 text-[12.5px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Agregar {nombres.tramo}
        </button>
      )}

      {error && <Aviso>{error}</Aviso>}

      {/* El motivo por el que el botón está apagado, escrito. Un botón gris sin
          explicación deja a alguien tocándolo sin entender qué le falta. */}
      {falta && (
        <p className="mt-3 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
          {falta}
        </p>
      )}

      <button
        onClick={() => revision.ok && onEscribir(revision.temario, cambiado)}
        disabled={guardando || !revision.ok}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {guardando
          ? "Guardando…"
          : escritos === 0
            ? `Escribir ${capitulos.length === 1 ? "el" : "los"} ${capitulos.length} ${capitulos.length === 1 ? nombres.tramo : nombres.tramos}`
            : "Guardar y seguir escribiendo"}
      </button>

      {onVolver && (
        <button
          onClick={onVolver}
          disabled={guardando}
          className="mt-2 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Volver sin guardar
        </button>
      )}

      <p className="mt-3 text-center text-[11px] text-gray-400 panel-oscuro:text-gray-500">
        Corregir el temario no gasta otra generación.
      </p>
    </>
  );
}

/**
 * Las dos bolsas del cupo, a la vista.
 *
 * Se muestran separadas porque son distintas y la diferencia importa: las del
 * mes vuelven el 1°, las de bienvenida se dan una vez y no vuelven nunca.
 * Mostrando sólo el total, alguien gasta su reserva permanente creyendo que se
 * le renueva.
 */
function Cupo({ cupo }: { cupo: EstadoDelCupo }) {
  const vacio = cupo.quedan <= 0;
  return (
    <div className={`mt-4 rounded-xl px-3.5 py-2.5 ${
      vacio ? "bg-gray-100 panel-oscuro:bg-gray-800" : "bg-orange-50 panel-oscuro:bg-orange-500/10"
    }`}>
      <p className={`text-[13px] font-bold ${
        vacio ? "text-gray-600 panel-oscuro:text-gray-300" : "text-orange-800 panel-oscuro:text-orange-300"
      }`}>
        {vacio
          ? "No te quedan ebooks con IA"
          : `Te ${cupo.quedan === 1 ? "queda" : "quedan"} ${cupo.quedan} ${cupo.quedan === 1 ? "ebook" : "ebooks"} con IA`}
      </p>

      <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
        <strong>{cupo.quedanDelMes} de este mes</strong>
        {cupo.proximoMes && ` (vuelven a ser ${cupo.topeDelMes} el 1°)`}
        {" · "}
        <strong>{cupo.quedanDeBienvenida} de bienvenida</strong> (no se renuevan)
      </p>

      {vacio && cupo.topeDelMes > 0 && (
        <p className="mt-1 text-[11.5px] text-gray-600 panel-oscuro:text-gray-400">
          El 1° del mes que viene tenés {cupo.topeDelMes} nuevos.
        </p>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 panel-oscuro:border-red-500/25 bg-red-50 panel-oscuro:bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-800 panel-oscuro:text-red-300"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
