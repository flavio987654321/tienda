/**
 * Chequeos del primer botón de IA: armar el embudo.
 *
 *   npx tsx src/lib/embudo-ia.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * Dos cosas, y las dos son de confianza.
 *
 * **Lo que vuelve del modelo no es un dato: es una propuesta.** Va a terminar
 * dibujada en una página pública que cobra plata, así que pasa por la misma
 * lima que el texto de una persona. El esquema de la herramienta garantiza que
 * `precio` sea un número — no que sea un número sensato.
 *
 * **Y la IA cuesta plata.** Ninguna función sale sin tope, ni en el plan más
 * caro, y los topes globales van últimos porque los contadores suman aunque el
 * pedido se rechace.
 */

import { readFileSync } from "fs";
import {
  normalizarEmbudo, precioSano, INSTRUCCIONES, ESQUEMA_DEL_EMBUDO,
  LARGO_TITULO_IA, LARGO_BAJADA_IA, PRECIO_MINIMO_IA, PRECIO_MAXIMO_IA,
  MINIMO_DEL_NICHO, LARGO_DEL_NICHO,
} from "./embudo-ia";
import { LARGO_TITULO, PRECIO_MAXIMO } from "./productos-digitales";
import {
  permitirGeneracion, RAFAGA_IA, GLOBAL_DIARIO, GLOBAL_PRUEBA_DIARIO,
} from "./ia-digitales";
import { CUPO_EMBUDO, claveDelMes, mesSiguiente } from "./cupo-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const bueno = {
  principal: { titulo: "Arreglá tu auto sin taller", bajada: "Vas a poder hacer los arreglos básicos.", precio: 25000 },
  bono: { titulo: "Checklist de mantenimiento", bajada: "Para tener a mano.", precio: 0 },
  upsell: { titulo: "Los 40 arreglos completos", bajada: "El paso siguiente.", precio: 45000 },
};

/* ── Lo que vuelve del modelo ───────────────────────────────────────────── */

check("EMB-A", normalizarEmbudo(bueno) !== null, "una respuesta bien formada pasa");
check("EMB-B",
  normalizarEmbudo(null) === null && normalizarEmbudo("texto") === null && normalizarEmbudo(42) === null,
  "basura en vez de un objeto no pasa");

/* Falta una ficha entera: media pantalla con una tarjeta buena y dos vacías es
   peor que decir "probá de nuevo". */
check("EMB-C",
  normalizarEmbudo({ principal: bueno.principal, bono: bueno.bono }) === null,
  "si falta una de las tres fichas, no se muestra nada");

/* Un título vacío es una tarjeta sin nombre. Una bajada vacía se completa a
   mano en dos minutos, así que ésa sí se deja pasar. */
check("EMB-D",
  normalizarEmbudo({ ...bueno, principal: { ...bueno.principal, titulo: "   " } }) === null,
  "un título que queda vacío al limpiarlo tumba la generación");
check("EMB-E",
  normalizarEmbudo({ ...bueno, principal: { ...bueno.principal, bajada: 123 } })?.principal.bajada === "",
  "una bajada que no vino se deja vacía, no tumba nada");

/* ⚠️ Un bono que se cobra no es un regalo. Da igual qué precio venga. */
check("EMB-F",
  normalizarEmbudo({ ...bueno, bono: { ...bueno.bono, precio: 9999 } })?.bono.precio === 0,
  "el bono va en 0 aunque el modelo le ponga precio");

/* Del modelo puede volver NaN o Infinity: el esquema dice "number" y los dos lo
   son. Los dos pasan cualquier comparación hasta que un total sale en "NaN". */
check("EMB-G",
  precioSano(Number.NaN) === PRECIO_MINIMO_IA && precioSano(Number.POSITIVE_INFINITY) === PRECIO_MINIMO_IA,
  "NaN e Infinity no llegan a la pantalla");
check("EMB-H",
  precioSano(-500) === PRECIO_MINIMO_IA && precioSano(99_000_000) === PRECIO_MAXIMO_IA,
  "un precio fuera de rango se acomoda al borde, no tira las tres fichas");
check("EMB-I", precioSano(24_999.6) === 25_000, "un precio con decimales se redondea");
check("EMB-J", precioSano("25000") === PRECIO_MINIMO_IA && precioSano(null) === PRECIO_MINIMO_IA,
  "un precio que no es número tampoco pasa");

/* Lo que vuelve se dibuja en una página pública: un salto de línea o un
   carácter de control adentro de un título rompe el mismo renglón que rompería
   si lo hubiera tipeado una persona. */
const sucio = normalizarEmbudo({
  ...bueno,
  principal: { ...bueno.principal, titulo: "Arreglá\ntu\tauto", bajada: "Una\nbajada" },
});
check("EMB-K",
  !/[\n\t]/.test(sucio?.principal.titulo ?? "x\n") && !/[\n\t]/.test(sucio?.principal.bajada ?? "x\n"),
  "los saltos de línea y los caracteres de control se limpian");

const largo = normalizarEmbudo({
  ...bueno,
  principal: { ...bueno.principal, titulo: "a".repeat(500), bajada: "b".repeat(5000) },
});
check("EMB-L",
  (largo?.principal.titulo.length ?? 0) === LARGO_TITULO_IA &&
  (largo?.principal.bajada.length ?? 0) === LARGO_BAJADA_IA,
  "un modelo que se va de largo se corta acá, no en el CSS");

/* ⚠️ COHERENCIA CON LA RUTA DE CREAR. Si esta lima aceptara más de lo que acepta
   el producto, la IA propondría fichas que la creación rechaza: tres tarjetas
   lindas que no se pueden guardar. */
check("EMB-M", LARGO_TITULO_IA <= LARGO_TITULO,
  `el título que acepta la IA entra en el del producto (${LARGO_TITULO_IA} ≤ ${LARGO_TITULO})`);
check("EMB-N", PRECIO_MAXIMO_IA <= PRECIO_MAXIMO && PRECIO_MINIMO_IA > 0,
  "el precio que acepta la IA entra en el del producto, y nunca es 0 ni negativo");

/* ── El prompt ──────────────────────────────────────────────────────────── */

/* Lo que NO puede inventar. No es una preferencia de estilo: una promesa de
   resultados es publicidad engañosa, y quien responde es quien vende. */
check("EMB-O",
  /No prometas resultados/.test(INSTRUCCIONES) && /publicidad engañosa/.test(INSTRUCCIONES),
  "el prompt prohíbe prometer resultados, y dice por qué");
check("EMB-P",
  /No inventes títulos, matrículas/.test(INSTRUCCIONES) &&
  /salud, medicamentos, inversiones ni apuestas/.test(INSTRUCCIONES),
  "y prohíbe inventar respaldos, y los rubros que no se tocan");

/* Las tres fichas son obligatorias en el esquema: es lo que hace que la forma la
   garantice la API y no una frase pidiendo JSON. */
check("EMB-Q",
  ESQUEMA_DEL_EMBUDO.required.length === 3 &&
  ["principal", "bono", "upsell"].every((k) => ESQUEMA_DEL_EMBUDO.required.includes(k)),
  "el esquema exige las tres fichas");

/* La descripción del bono le explica al modelo que es un regalo. Está adentro
   del esquema a propósito: es la parte del prompt que más se confunde. */
check("EMB-R", /Siempre 0: el bono es gratis/.test(JSON.stringify(ESQUEMA_DEL_EMBUDO)),
  "el esquema le dice al modelo que el bono va gratis");

/* ── La ruta ────────────────────────────────────────────────────────────── */

const ruta = readFileSync("src/app/api/digitales/ia/embudo/route.ts", "utf8");

/* ⚠️ Rol DIGITAL, no OWNER. Es el error que ya está cometido al revés en la ruta
   de Sasha, que pide OWNER y por eso le contesta 403 a una cuenta digital. */
check("RUT-A", /user\.role !== "DIGITAL"/.test(ruta) && !/role !== "OWNER"/.test(ruta),
  "la puerta es el rol DIGITAL, no el de tiendas");

/* Los topes van ANTES de leer el cuerpo y antes de tocar la base: un pedido
   rechazado no tiene que costar nada. */
check("RUT-B",
  ruta.indexOf("permitirGeneracion") < ruta.indexOf("req.json()"),
  "los topes se aplican antes de leer el pedido");

/* ⚠️ Y si Redis no contesta, se FRENA. Del otro lado hay algo que se paga: "no
   pude contar" tiene que cortar, nunca dejar pasar. */
check("RUT-C",
  /catch \(e\) \{[\s\S]{0,200}no se pudieron contar los topes, se rechaza[\s\S]{0,300}status: 503/.test(ruta),
  "si no se puede contar el tope, se rechaza en vez de dejar pasar");

/* ⚠️ NO GUARDA NADA. Lo que se publica en una página que cobra lo firma quien
   vende: tiene que haberlo leído antes. Y así los topes del plan y la validación
   de campos siguen viviendo en un solo lugar, la ruta de crear. */
check("RUT-D",
  !/prisma\.product\.create/.test(ruta) && !/prisma\.product\.createMany/.test(ruta),
  "propone y no crea: ningún producto entra a la base por acá");

/* La forma la garantiza la API, no una frase pidiendo JSON. */
check("RUT-E",
  /tool_choice: \{ type: "tool", name: "armar_embudo" \}/.test(ruta),
  "la respuesta se fuerza por herramienta, no por texto");

/* Y lo que vuelve pasa igual por la lima antes de que nadie lo vea. */
check("RUT-F", /normalizarEmbudo\(/.test(ruta), "lo que devuelve el modelo se normaliza antes de mostrarlo");

/* El texto de la persona es lo único no confiable del pedido, así que va
   marcado y al final. Lo que de verdad lo frena es la forma de la salida. */
check("RUT-G", /<negocio>\\n\$\{nicho\}\\n<\/negocio>/.test(ruta),
  "lo que escribe la persona va marcado y al final del mensaje");

/* Y viene recortado y con mínimo: con dos palabras no se puede armar nada, y
   sin tope alguien manda un libro entero por el mismo precio que una frase. */
check("RUT-H",
  new RegExp(`slice\\(0, LARGO_DEL_NICHO\\)`).test(ruta) && /< MINIMO_DEL_NICHO/.test(ruta) &&
  MINIMO_DEL_NICHO > 0 && LARGO_DEL_NICHO <= 2000,
  "el texto de la persona entra recortado y con un mínimo");

/* Sin la clave no se promete nada: la persona aprieta, espera, y recibe el error
   de una librería. */
check("RUT-I", /if \(!process\.env\.ANTHROPIC_API_KEY\)/.test(ruta),
  "sin la clave de Anthropic se avisa antes de hacer esperar");

/* ⚠️ EL CUPO SE GASTA ANTES DE LLAMAR AL MODELO. Después sería tarde: ocho
   pedidos en paralelo pasarían todos el control —porque ninguno gastó todavía—
   y generarían los ocho. */
check("RUT-J",
  ruta.indexOf("consumirDelCupo") < ruta.indexOf("anthropic.messages.create"),
  "el cupo se gasta antes de llamar al modelo, no después");

/* Y si la llamada falla, se devuelve: la persona no recibió nada y el fallo fue
   nuestro. Cobrarle una generación por un error nuestro termina en un reclamo. */
const devoluciones = (ruta.match(/devolverAlCupo\(/g) ?? []).length;
check("RUT-K", devoluciones === 2,
  `los dos caminos de error devuelven la generación (${devoluciones} de 2)`);

/* La respuesta dice de qué bolsa salió. Es lo que le deja avisar a la pantalla
   cuando se acabaron las del mes y se está empezando a comer las de bienvenida,
   que no vuelven. Sin eso, la persona gasta su reserva sin enterarse. */
check("RUT-L", /salioDe: bolsa/.test(ruta) && /cupo: await estadoDelCupo/.test(ruta),
  "la respuesta dice de qué bolsa salió y cuánto queda");

/* ── La ventana que la usa ──────────────────────────────────────────────── */

const ventana = readFileSync("src/app/digitales/productos/EmbudoIA.tsx", "utf8");

/* ⚠️ El paso de revisar no se puede saltear: lo que se publica en una página que
   cobra lo firma quien vende, así que tiene que haberlo visto ANTES de que
   exista. Nada se crea derecho desde la generación. */
check("VEN-A",
  /setPaso\("revisar"\)/.test(ventana) &&
  ventana.indexOf("setPaso(\"revisar\")") < ventana.indexOf("crearLosTres"),
  "primero se revisa y recién después se crea");

/* Los tres se crean por la ruta de siempre, la que cuenta los topes del plan.
   Esta pantalla no reimplementa ninguno de los dos controles. */
check("VEN-B",
  /fetch\("\/api\/digitales\/productos"/.test(ventana) &&
  !/TOPES_DIGITALES|topeDe\(/.test(ventana),
  "los productos se crean por la ruta de siempre, con sus topes de plan");

/* ⚠️ El principal PRIMERO y esperando su id: el bono y el upsell cuelgan de él y
   sin `padreId` la ruta los rechaza. Por eso no van los tres en paralelo. */
check("VEN-C",
  ventana.indexOf('rol: "PRINCIPAL"') < ventana.indexOf('rol: "BONO"') &&
  ventana.indexOf('rol: "BONO"') < ventana.indexOf('rol: "UPSELL"') &&
  /const padreId = principal\?\.id/.test(ventana),
  "el principal se crea primero y los otros dos cuelgan de su id");

/* ⚠️ Si falla en el medio, lo que se creó QUEDÓ y el botón NO puede volver:
   apretarlo de nuevo crearía el principal por segunda vez y gastaría otro lugar
   del plan. */
check("VEN-D",
  /if \(!huboAlgo\.current\) enVuelo\.current = false/.test(ventana) &&
  /Ver qué quedó en la lista/.test(ventana),
  "si quedó algo a medias, no se ofrece reintentar: se manda a mirar la lista");

/* El freno del doble clic, que acá gasta cupo de verdad. */
check("VEN-E", /useRef\(false\)/.test(ventana) && /if \(enVuelo\.current/.test(ventana),
  "el doble clic no dispara dos generaciones");

/* Los topes del campo son los mismos que corta el servidor. Puestos sólo allá,
   el campo deja escribir de más y se recorta sin avisar. */
check("VEN-F",
  /maxLength=\{LARGO_DEL_NICHO\}/.test(ventana) && /MINIMO_DEL_NICHO/.test(ventana),
  "el campo del nicho tiene el mismo tope que el servidor");

/* ⚠️ LAS DOS BOLSAS SE MUESTRAN POR SEPARADO. Con sólo el total, alguien gasta
   su bolsa permanente creyendo que se le renueva el mes que viene. */
check("VEN-G",
  /de este mes/.test(ventana) && /de bienvenida/.test(ventana) && /no se renuevan/.test(ventana),
  "se muestran las dos bolsas y se dice cuál no vuelve");

/* Y se avisa fuerte al cruzar a la que no vuelve. Es el único momento en que
   esta pantalla interrumpe, porque es el único cambio que no se puede deshacer. */
check("VEN-H",
  /salioDe === "bienvenida"/.test(ventana) && /Se te acabaron las de este mes/.test(ventana),
  "se avisa cuando la generación salió de la bolsa que no vuelve");

/* "Probar de nuevo" gasta otra, y eso se dice ANTES de apretarlo. */
check("VEN-I", /Probar de nuevo usa otra generación/.test(ventana),
  "se avisa que regenerar gasta cupo, antes de apretarlo");

/* Los precios son lo que la IA no puede saber: no conoce el dólar de hoy. */
check("VEN-J", /Los precios son una sugerencia/.test(ventana),
  "se dice que los precios hay que revisarlos");

/* ── El cupo ────────────────────────────────────────────────────────────── */

/* Ninguna función de IA sale sin límite, **ni en el plan más caro**. Es la regla
   que se escribió mirando el "Todos los ebooks con IA" de la competencia. */
check("CUP-A",
  Object.values(CUPO_EMBUDO).every((c) =>
    Number.isFinite(c.bienvenida) && Number.isFinite(c.mes) && c.bienvenida > 0 && c.mes >= 0),
  "los tres planes tienen cupo, y ninguno es infinito");

/* ⚠️ FREE NO TIENE BOLSA MENSUAL, y es la única decisión de plata acá. En
   Starter y Pro hay un abono pagando la cuenta; en Free no entra un peso hasta
   que la persona vende algo, y Free no vence nunca ni pide tarjeta. Con cupo
   mensual, veinte cuentas truchas serían un gasto para siempre. */
check("CUP-B", CUPO_EMBUDO.FREE.mes === 0 && CUPO_EMBUDO.FREE.bienvenida === 3,
  "Free son 3 de por vida, sin bolsa mensual");

/* Y el cupo sube con el plan, en las dos bolsas. */
check("CUP-C",
  CUPO_EMBUDO.FREE.bienvenida < CUPO_EMBUDO.STARTER.bienvenida &&
  CUPO_EMBUDO.STARTER.bienvenida < CUPO_EMBUDO.PRO.bienvenida &&
  CUPO_EMBUDO.STARTER.mes < CUPO_EMBUDO.PRO.mes,
  "el cupo sube con el plan");

/* El arranque es más grande que el mensual, a propósito: el primer día es cuando
   la persona está probando, no sabe qué escribir y regenera varias veces — y es
   el día que decide si se queda. Para el mes 6 ya entendió cómo funciona. */
check("CUP-D",
  CUPO_EMBUDO.STARTER.bienvenida > CUPO_EMBUDO.STARTER.mes &&
  CUPO_EMBUDO.PRO.bienvenida > CUPO_EMBUDO.PRO.mes,
  "la bolsa de bienvenida es más grande que la del mes");

/* La clave del mes es la de Argentina y tiene la forma que el `where` espera. */
check("CUP-E", /^\d{4}-\d{2}$/.test(claveDelMes()), "la clave del mes tiene la forma AAAA-MM");
check("CUP-F",
  mesSiguiente("2026-09") === "2026-10" && mesSiguiente("2026-12") === "2027-01",
  "el mes que viene se calcula bien, y en diciembre cambia de año");

/* ── Cómo se gasta ──────────────────────────────────────────────────────── */

const cupo = readFileSync("src/lib/cupo-ia.ts", "utf8");

/* ⚠️ SE GASTA PRIMERO LA DEL MES, porque es la que se vence. Al revés le
   quemaríamos a la persona su bolsa permanente mientras se le pierden sin usar
   las del mes: una estafa silenciosa, de las que nadie nota hasta que le
   faltan. */
check("CUP-G",
  cupo.indexOf("mesUsadas: { increment: 1 }") < cupo.indexOf("bienvenidaUsadas: { increment: 1 }"),
  "se gasta primero la del mes y después la de bienvenida");

/* ⚠️ LA CONDICIÓN VA ADENTRO DEL `where`. Leer "¿le quedan?" y después restar es
   la carrera clásica: dos pedidos en paralelo leen los dos "te queda 1" y los
   dos gastan, y la cuenta termina en -1. */
check("CUP-H",
  /mesUsadas: \{ lt: tope\.mes \}/.test(cupo) &&
  /bienvenidaUsadas: \{ lt: tope\.bienvenida \}/.test(cupo),
  "el 'todavía le queda' es parte del UPDATE, no un if después de leer");

/* Y la fila se crea con `upsert` sobre la clave única: un "¿existe? entonces
   creá" deja dos filas cuando llegan dos pedidos juntos, o sea el doble de cupo. */
check("CUP-I", /prisma\.cupoIA\.upsert/.test(cupo), "la fila del cupo se crea con upsert");

/* Devolver no puede dejar el contador en negativo: eso sería cupo infinito. */
check("CUP-J",
  /mesUsadas: \{ gt: 0 \}/.test(cupo) && /bienvenidaUsadas: \{ gt: 0 \}/.test(cupo),
  "devolver una generación no puede dejar el contador en negativo");

/* El mes se reinicia al usarlo, sin cron: en este plan de Vercel el cron es uno
   solo por día, y un cupo que depende de que corra es un cupo que algún día no
   vuelve. */
check("CUP-K",
  /NOT: \{ mesClave: mes \}/.test(cupo) &&
  /* El reinicio va ADENTRO del camino de gastar y antes de contar: así pasa
     cuando alguien usa el botón, no cuando corre un proceso. */
  cupo.indexOf("NOT: { mesClave: mes }") < cupo.indexOf("mesUsadas: { increment: 1 }"),
  "el mes se reinicia al gastar, sin depender de ningún proceso nocturno");

/* ── Los topes que quedan (los invisibles) ──────────────────────────────── */

check("TOP-A", RAFAGA_IA > 0 && GLOBAL_DIARIO > 0 && GLOBAL_PRUEBA_DIARIO > 0,
  "la ráfaga y los dos globales existen y ninguno es infinito");

/* El global de las cuentas sin abono va por debajo del total: es un presupuesto
   chico y aparte, para que el que abusa no deje sin IA al que paga. */
check("TOP-C", GLOBAL_PRUEBA_DIARIO < GLOBAL_DIARIO,
  "las cuentas sin abono compiten contra un presupuesto más chico y aparte");

/* ⚠️ EL ORDEN. Los contadores suman aunque el pedido se rechace, así que los
   globales van ÚLTIMOS: si fueran primero, alguien ya bloqueado por su tope
   personal seguiría comiéndose el presupuesto de todos con cada intento. */
/* Los de los topes son los únicos que necesitan esperar, así que van adentro de
   una función: `tsx` compila estos archivos a CommonJS y ahí un `await` suelto
   arriba de todo no existe. */
async function losTopes() {
  const llamadas: string[] = [];
  await permitirGeneracion(
    { userId: "u1", sinAbono: true, day: "2026-09-04", que: "embudo" },
    (clave) => {
      llamadas.push(clave);
      /* La ráfaga corta al primer intento; lo que importa es que después de
         cortar no se haya tocado ningún contador global. */
      return Promise.resolve({ permitido: false, cuenta: 99 });
    },
  );
  check("TOP-D",
    llamadas.length === 1 && llamadas[0].startsWith("ia-dig:embudo:") &&
    !llamadas.some((c) => c.includes("global") || c.includes("gratis")),
    "cortado por ráfaga, no se toca ningún contador global");

  /* Y con todo permitido, se cuentan las tres capas en orden. */
  const todas: string[] = [];
  const veredicto = await permitirGeneracion(
    { userId: "u1", sinAbono: true, day: "2026-09-04", que: "embudo" },
    (c) => { todas.push(c); return Promise.resolve({ permitido: true, cuenta: 1 }); },
  );
  check("TOP-E",
    veredicto.permitido === true && todas.length === 3 &&
    todas[0].startsWith("ia-dig:") &&
    todas[1].startsWith("ia-dig-gratis-dia:") && todas[2].startsWith("ia-dig-global-dia:"),
    "las tres capas se cuentan, y los globales van últimos");

  /* Una cuenta que paga no toca el presupuesto de las que no pagan. */
  const dePago: string[] = [];
  await permitirGeneracion(
    { userId: "u2", sinAbono: false, day: "2026-09-04", que: "embudo" },
    (c) => { dePago.push(c); return Promise.resolve({ permitido: true, cuenta: 1 }); },
  );
  check("TOP-F", !dePago.some((c) => c.includes("gratis")),
    "una cuenta que paga no gasta el presupuesto de las que no pagan");

  /* ⚠️ Y FREE ENTRA EN ESE PRESUPUESTO, no sólo la prueba. Es el agujero que
     tenía esto el 04/09/26: miraba `TRIAL`, y una cuenta Free digital es
     `ACTIVE`, así que quedaba afuera del único freno que ve las cuentas en
     serie — siendo la más expuesta de las dos, porque no vence nunca. */
  check("TOP-G",
    /sinAbono: estado === "TRIAL" \|\| tier === "FREE"/.test(ruta),
    "Free entra en el global de las cuentas sin abono, no sólo la prueba");
}

losTopes().then(() => {
  console.log(fallos === 0
    ? "\nok — lo que devuelve el modelo se lima, y ninguna generación sale sin tope"
    : `\nFALLA — ${fallos} chequeo(s) del embudo con IA`);
  process.exit(fallos === 0 ? 0 : 1);
});
