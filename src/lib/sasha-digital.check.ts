/**
 * Chequeos de Sasha en Productos Digitales.
 *
 *   npx tsx src/lib/sasha-digital.check.ts
 *
 * Lo que se cuida, en orden de gravedad:
 *
 *   1. QUE NO SE NOS VAYA LA PLATA. Los topes existen, cortan, van en el
 *      orden correcto, Free no entra, y si Redis no contesta se frena.
 *   2. Que Sasha no cuente lo que el plan no compró (las visitas de Free).
 *   3. Que sepa explicar el negocio desde cero, y que no invente.
 */

import { readFileSync } from "node:fs";
import {
  permitirMensajeSasha, DIARIO_POR_PLAN, RAFAGA_SASHA, GLOBAL_SASHA_DIARIO,
  mensajeDeTope, horasHastaManana, costoEnDolares, type Contador,
} from "./sasha-digital-limites";
import { buscarArticulos, ARTICULOS, LO_BASICO, normalizar } from "./sasha-digital-saber";
import { armarPromptDigital, PROMPT_ESTATICO } from "./sasha-digital-prompt";
import { textoDelSnapshot, type SnapshotDigital } from "./sasha-digital-datos";
import { PANTALLAS_DEL_PANEL } from "./sasha-digital-saber";
import { leerMarcaDeIr } from "@/app/digitales/Sasha";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8");

/* ── 1. Los topes ──────────────────────────────────────────────────────── */

/** Un contador de mentira que lleva la cuenta en memoria, como Redis. */
function contadorFalso(opciones?: { sinRafaga?: boolean }): { contar: Contador; llamadas: string[] } {
  const cuentas = new Map<string, number>();
  const llamadas: string[] = [];
  const contar: Contador = async (clave, limite) => {
    llamadas.push(clave);
    /* `sinRafaga` simula que pasó el tiempo entre mensaje y mensaje: sirve
       para probar el cupo del DÍA sin que corte antes el anti-script, que es
       una ventana de diez minutos. */
    if (opciones?.sinRafaga && clave.startsWith("sasha-digital:")) return { permitido: true, cuenta: 1 };
    const n = (cuentas.get(clave) ?? 0) + 1;
    cuentas.set(clave, n);
    return { permitido: n <= limite, cuenta: n };
  };
  return { contar, llamadas };
}

const base = { userId: "u1", day: "2026-09-22", hora: 17 };

(async () => {
  /* Free: se rechaza ANTES de contar nada. Si tocara un contador, veinte
     cuentas Free fabricadas en serie gastarían el presupuesto global sólo
     con intentar. */
  const f = contadorFalso();
  const libre = await permitirMensajeSasha({ ...base, tier: "FREE" }, f.contar);
  check("SAS-A", !libre.permitido && libre.motivo === "plan" && f.llamadas.length === 0 && DIARIO_POR_PLAN.FREE === 0,
    "Free no tiene Sasha, y se rechaza sin tocar ningún contador", f.llamadas);

  /* El tope diario de cada plan corta justo donde dice, ni uno más. */
  for (const tier of ["STARTER", "PRO"] as const) {
    const c = contadorFalso({ sinRafaga: true });
    const tope = DIARIO_POR_PLAN[tier];
    let ultimo = await permitirMensajeSasha({ ...base, tier }, c.contar);
    for (let i = 1; i < tope; i++) ultimo = await permitirMensajeSasha({ ...base, tier }, c.contar);
    const pasado = await permitirMensajeSasha({ ...base, tier }, c.contar);
    check(`SAS-B-${tier}`, ultimo.permitido && !pasado.permitido && pasado.motivo === "diario",
      `${tier} entra ${tope} veces y la ${tope + 1} se rechaza por el cupo del día`, { tope, ultimo, pasado });
  }

  /* El orden: ráfaga, después el diario, y el global ÚLTIMO. Los contadores
     suman aunque el pedido se rechace, así que uno ya bloqueado por su cupo
     personal no puede seguir comiéndose el presupuesto de todos. */
  const o = contadorFalso();
  await permitirMensajeSasha({ ...base, tier: "PRO" }, o.contar);
  check("SAS-C", o.llamadas.length === 3
    && o.llamadas[0].startsWith("sasha-digital:") && o.llamadas[1].startsWith("sasha-digital-dia:") && o.llamadas[2].startsWith("sasha-digital-global:"),
    "el orden es ráfaga → diario → global, y el global va último", o.llamadas);

  /* Claves propias: no comparten presupuesto con la Sasha de tiendas
     (`asistente:`) ni con los ebooks (`ia-digitales`). */
  check("SAS-D", o.llamadas.every((k) => k.startsWith("sasha-digital")) && o.llamadas[1].includes(base.day) && o.llamadas[2].includes(base.day),
    "las claves son propias del panel digital y el contador diario lleva el día adentro", o.llamadas);

  /* La ráfaga corta antes que el diario: es el anti-script. */
  const r = contadorFalso();
  let ultimoR = await permitirMensajeSasha({ ...base, tier: "PRO" }, r.contar);
  for (let i = 1; i < RAFAGA_SASHA; i++) ultimoR = await permitirMensajeSasha({ ...base, tier: "PRO" }, r.contar);
  const pasadoR = await permitirMensajeSasha({ ...base, tier: "PRO" }, r.contar);
  check("SAS-E", RAFAGA_SASHA < DIARIO_POR_PLAN.PRO && ultimoR.permitido && !pasadoR.permitido && pasadoR.motivo === "rafaga",
    "la ráfaga corta antes que el cupo del día: un script no se lleva el cupo entero de una", { RAFAGA_SASHA, pasadoR });

  /* Los números tienen que ser un techo de gasto que cierre con el plan.
     Con Haiku y el prompt corto un mensaje ronda medio centavo: 80 por día
     en Pro son ~US$12 por mes contra un plan muy arriba de eso. Si alguien
     sube estos números sin pensar, este chequeo se lo dice. */
  const costoMensajeCaro = costoEnDolares({ tokensEntrada: 1_200, tokensSalida: 400, tokensCacheLeido: 4_000, tokensCacheEscrito: 0 });
  const peorMesPro = costoMensajeCaro * DIARIO_POR_PLAN.PRO * 30;
  check("SAS-F", costoMensajeCaro < 0.01 && peorMesPro < 15 && GLOBAL_SASHA_DIARIO <= DIARIO_POR_PLAN.PRO * 15,
    "el peor mes posible de una cuenta Pro sigue siendo chico al lado del abono, y el global no es diez veces el tope de nadie",
    { costoMensajeCaro: costoMensajeCaro.toFixed(5), peorMesPro: peorMesPro.toFixed(2), GLOBAL_SASHA_DIARIO });

  /* El mensaje de "se te acabó" tiene que decir CUÁNDO vuelve. "Esperá un
     rato" es justo lo que no queremos decirle a alguien que paga. */
  const diario = mensajeDeTope("diario", 17);
  check("SAS-G", /Se te acabaron los mensajes de hoy/.test(diario) && /00:00/.test(diario) && /7 horas/.test(diario)
    && horasHastaManana(23) === "menos de una hora" && !/l[íi]mite|rate|tope/i.test(diario),
    "cuando se acaba el cupo se dice cuándo vuelve, en castellano y sin jerga", diario);

  check("SAS-H", /pasarte desde Mi cuenta/.test(mensajeDeTope("plan", 10)) && !/error|no autorizado/i.test(mensajeDeTope("plan", 10)),
    "a quien está en Free se le dice qué plan la incluye, no un error");

  /* ── 2. Que no cuente lo que el plan no compró ───────────────────────── */

  const cuenta = (tier: SnapshotDigital["tier"]): SnapshotDigital => ({
    tier, nombre: "Mi negocio", mpConectado: true, sinEspacio: false,
    productos: [{ nombre: "Guía", publicado: true, precio: 12000, bonos: 1, upsells: 0, tienePagina: true, tieneArchivo: true, ventas: 4, visitas: tier === "FREE" ? null : 200, conversion: tier === "FREE" ? null : 2, opinionesPublicadas: 2 }],
    ventasDelMes: 4, netoDelMes: 48000, clientes: 4, repiten: 1, sinBajar: 1, carritos: 2, opinionesPendientes: 1,
  });
  const textoFree = textoDelSnapshot(cuenta("FREE"));
  const textoPro = textoDelSnapshot(cuenta("PRO"));
  /* Se mira la línea del producto: el pie sí nombra las visitas, justamente
     para decirle a Sasha que NO las tiene y que las ofrece Starter. */
  const filaFree = textoFree.split("\n").find((l) => l.startsWith('- "Guía"')) ?? "";
  check("SAS-I", !/visita|convierte/i.test(filaFree) && /no muestra visitas/.test(textoFree)
    && /200 visitas/.test(textoPro) && /convierte 2%/.test(textoPro),
    "en Free no se le pasa ni una visita ni la conversión —el panel tampoco las muestra—, y en Pro sí", filaFree);

  const fuente = leer("src/lib/sasha-digital-datos.ts");
  check("SAS-J", /const verVisitas = puedeVer\(tier, "visitas"\)/.test(fuente) && /verVisitas\s*\n?\s*\?\s*prisma\.digitalVisita\.groupBy/.test(fuente),
    "y ni siquiera se consulta: lo que el plan no ve, no se pregunta a la base");

  /* Por producto, que es lo que se pidió: cada uno con su precio, sus
     ventas, sus bonos y qué le falta. */
  check("SAS-K", /"Guía" \$12\.000 · publicado · 4 ventas/.test(textoPro) && /1 bono, 0 upsells/.test(textoPro)
    && /2 opiniones publicadas/.test(textoPro) && /Carritos abandonados sin recuperar: 2/.test(textoPro),
    "el resumen va producto por producto, con precio, ventas, embudo y opiniones", textoPro);

  const faltante = textoDelSnapshot({ ...cuenta("PRO"), mpConectado: false, productos: [{ ...cuenta("PRO").productos[0], publicado: false, tieneArchivo: false, tienePagina: false }] });
  check("SAS-L", /SIN CONECTAR/.test(faltante) && /SIN PUBLICAR/.test(faltante) && /SIN ARCHIVO CARGADO/.test(faltante) && /sin página armada/.test(faltante),
    "lo que falta se marca fuerte: sin Mercado Pago, sin publicar, sin archivo y sin página");

  const vacia = textoDelSnapshot({ ...cuenta("FREE"), sinEspacio: true });
  check("SAS-M", /Todavía no creó ningún producto/.test(vacia) && !/venta|cliente/i.test(vacia),
    "una cuenta recién creada se describe como tal y no con una lista de ceros");

  /* ── 3. Que sepa explicar, y que no invente ──────────────────────────── */

  check("SAS-N", /QUÉ ES UN EBOOK/.test(LO_BASICO) && /BONO/.test(LO_BASICO) && /UPSELL/.test(LO_BASICO) && /Mercado Pago/.test(LO_BASICO) && /30 días/.test(LO_BASICO),
    "lo básico —qué es un producto digital, qué es un ebook, el embudo, cómo cobra y cómo entrega— va en cada mensaje");

  const casos: [string, string][] = [
    ["no se por donde empezar", "primer-producto"],
    ["cuanto tengo que cobrar?", "precio"],
    ["cómo subo el PDF?", "subir-pdf"],
    ["no me conecta mercado pago", "mercado-pago"],
    ["un cliente dice que no le llegó la descarga", "entrega"],
    ["qué es un upsell", "bono-y-upsell"],
    ["cuál de mis productos vende mejor", "estadisticas"],
    ["cómo pido opiniones", "clientes-y-opiniones"],
  ];
  const fallados = casos.filter(([q, slug]) => !buscarArticulos(q).some((a) => a.slug === slug));
  check("SAS-O", fallados.length === 0, "cada pregunta típica encuentra su artículo", fallados);

  check("SAS-P", buscarArticulos("hola qué tal").length === 0 && buscarArticulos("cuanto cobrar y como subo el pdf").length <= 2,
    "una pregunta sin tema no arrastra artículos, y nunca van más de dos: cada uno se paga");

  check("SAS-Q", ARTICULOS.every((a) => a.texto.length < 800) && new Set(ARTICULOS.map((a) => a.slug)).size === ARTICULOS.length
    && ARTICULOS.every((a) => a.palabras.every((p) => normalizar(p) === p)),
    "los artículos son cortos, con slug único, y sus palabras están normalizadas (si no, no encuentran nada)");

  check("SAS-R", /No inventás datos/.test(PROMPT_ESTATICO) && /no hablás de otros paneles/i.test(PROMPT_ESTATICO)
    && /decí que no lo sabés/.test(PROMPT_ESTATICO) && /qué plan lo incluye/.test(PROMPT_ESTATICO),
    "tiene prohibido inventar, hablar de los otros paneles, y saltear un plan");

  const prompt = armarPromptDigital({ snapshot: cuenta("STARTER"), nombreDeQuienVende: "Ana", pregunta: "cuanto cobrar?", momento: { fechaTexto: "martes 22 de septiembre", hora: 10 } });
  check("SAS-S", prompt.estatico === PROMPT_ESTATICO && !/Ana|Guía|12\.000/.test(prompt.estatico)
    && /Ana/.test(prompt.variable) && /Guía/.test(prompt.variable) && /Cuánto cobrar/.test(prompt.variable),
    "el bloque que se cachea es igual para todas las cuentas; el nombre, los datos y el artículo van en el variable");

  /* El caché es la mitad del costo: si el bloque estático creciera sin
     control, el primer mensaje de cada charla se vuelve caro. */
  check("SAS-T", PROMPT_ESTATICO.length < 7_000,
    "el bloque fijo se mantiene corto: es lo que se paga entero en el primer mensaje de cada charla", PROMPT_ESTATICO.length);

  /* ── 4. La ruta ──────────────────────────────────────────────────────── */

  const ruta = leer("src/app/api/digitales/sasha/route.ts");
  check("SAS-U", /user\.role !== "DIGITAL"/.test(ruta)
    && ruta.indexOf("permitirMensajeSasha") < ruta.indexOf("await req.json()")
    && ruta.indexOf("permitirMensajeSasha") < ruta.indexOf("snapshotDigital"),
    "sólo cuentas digitales, y el tope se aplica ANTES de leer el pedido o tocar la base");

  check("SAS-V", /catch \(err\) \{[\s\S]*?se apaga el chat[\s\S]*?status: 503/.test(ruta) && !/permitido: true/.test(ruta),
    "si Redis no contesta, Sasha se apaga: nunca se deja pasar sin contar");

  check("SAS-W", /cache_control: \{ type: "ephemeral" \}/.test(ruta) && /text: prompt\.estatico, cache_control/.test(ruta),
    "el caché se marca en el bloque estático, que es donde pega");

  check("SAS-X", /tokensEntrada: final\.usage\.input_tokens/.test(ruta) && /tokensCacheLeido: final\.usage\.cache_read_input_tokens/.test(ruta)
    && /role: "assistant", content: texto, day, \.\.\.uso/.test(ruta),
    "cada respuesta guarda cuánto costó: cuánto sale un plan por mes es una consulta, no una estimación");

  check("SAS-Y", /status: veredicto\.motivo === "plan" \? 402 : 429/.test(ruta),
    "el plan que no la incluye y el cupo agotado se contestan distinto, para que la pantalla los dibuje distinto");

  const esquema = leer("prisma/schema.prisma");
  const migracion = leer("prisma/migrations/20260922120000_asistente_tokens/migration.sql");
  check("SAS-Z", /tokensEntrada\s+Int\?/.test(esquema) && /ADD COLUMN IF NOT EXISTS "tokensCacheLeido"/.test(migracion),
    "las columnas existen en el esquema y la migración es idempotente");

  /* ── 5. La burbuja ───────────────────────────────────────────────────── */

  const burbuja = leer("src/app/digitales/Sasha.tsx");
  const layout = leer("src/app/digitales/layout.tsx");

  /* El saludo es texto NUESTRO. En el panel de tiendas el "hola" de cada día
     es una llamada al modelo: un mensaje entero por persona por día para
     decir algo que ya sabemos escribir. */
  check("SAS-AA", /const SALUDO = "/.test(burbuja) && !/greet/.test(burbuja),
    "el saludo de cada día no gasta un mensaje: es texto nuestro");

  /* Free ni siquiera puede mandar: la burbuja le muestra qué es Sasha y con
     qué plan viene, y no hay pedido que contar ni que pagar. */
  check("SAS-AB", /const esFree = estado !== null && estado\.tope === 0;/.test(burbuja)
    && /Sasha viene con Starter y Pro/.test(burbuja) && /esFree \? \(/.test(burbuja),
    "en Free la burbuja explica y ofrece el plan, sin caja para escribir");

  /* Cuando el cupo del día cortó, el cuadro se apaga: mandar otra vez sólo
     suma un rechazo más al contador. */
  check("SAS-AC", /if \(r\.status === 429 \|\| r\.status === 402\) setCortado\(true\)/.test(burbuja)
    && /disabled=\{enviando \|\| cortado\}/.test(burbuja) && /Volvé mañana/.test(burbuja),
    "con el cupo agotado el cuadro de escribir se apaga hasta mañana");

  check("SAS-AD", /Te quedan \$\{quedan\} mensaje/.test(burbuja),
    "cuando quedan pocos mensajes del día se avisa antes de que se acaben");

  /* El botón de "ir a" sale de una lista blanca compartida con el prompt: el
     texto lo escribe un modelo y puede inventar una dirección que suene bien. */
  check("SAS-AE", leerMarcaDeIr("Andá a Productos. [[IR:/digitales/productos]]").ir?.href === "/digitales/productos"
    && leerMarcaDeIr("Probá esto [[IR:/digitales/inventada]]").ir === null
    && leerMarcaDeIr("Probá esto [[IR:/dashboard]]").ir === null
    && leerMarcaDeIr("Sin marca").ir === null
    && leerMarcaDeIr("Hola [[IR:/digitales/ventas]]").texto === "Hola",
    "una dirección que el modelo inventó no se dibuja, y la marca no queda a la vista");

  check("SAS-AF", Object.keys(PANTALLAS_DEL_PANEL).every((r) => PROMPT_ESTATICO.includes(r)),
    "el prompt le dice exactamente qué pantallas existen, desde la misma lista que dibuja el botón");

  check("SAS-AG", /<Sasha \/>/.test(layout) && layout.indexOf("<Sasha />") > layout.indexOf("cuenta?.closedAt"),
    "la burbuja se monta en el panel, y no con la cuenta cerrada");

  /* SASHA ES LA MISMA EN LOS DOS PANELES. Adentro sabe de otra cosa —acá de
     embudos y descargas, allá de stock y envíos— pero la cara, el cajón que
     entra desde la derecha y la escala de las burbujas son las mismas: si se
     dibujan distinto, parecen dos productos. Se compara contra la del panel
     de tiendas, que es el molde. */
  const deTiendas = leer("src/components/dashboard/AsistenteIA.tsx");
  const mismoAspecto = [
    /AsistentePersonaje estado=\{[^}]*\} size=\{56\}/,               // el personaje ES el botón, sin círculo
    /fixed right-0 top-0 z-\[60\] flex h-full w-full flex-col/,       // el cajón desde la derecha
    /md:w-\[380px\] md:rounded-l-2xl/,
    /fixed inset-0 z-\[60\] bg-black\/30 md:hidden print:hidden/,     // el fondo del celular
    /AsistentePersonaje estado=\{enviando \? "pensando" : "sonriente"\} size=\{36\}/,
    /max-w-\[85%\][^"]*rounded-2xl px-4 py-2\.5 text-sm/,             // la burbuja
    /rounded-xl bg-orange-500 p-2\.5 text-white/,                     // el botón de enviar
  ];
  const distintos = mismoAspecto.filter((re) => !(re.test(burbuja) && re.test(deTiendas)));
  check("SAS-AH", distintos.length === 0,
    "Sasha se ve igual que en el panel de tiendas: mismo personaje, mismo cajón, mismas burbujas",
    distintos.map(String));

  console.log(fallos === 0 ? "\nok — Sasha digital: los topes cortan, no cuenta lo que el plan no compró, y sabe explicar desde cero" : `\nFALLA — ${fallos} chequeo(s) de Sasha digital`);
  process.exit(fallos === 0 ? 0 : 1);
})();
