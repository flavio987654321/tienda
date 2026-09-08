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
  MINIMO_DEL_NICHO, LARGO_DEL_NICHO, LARGO_TITULO_PROPIO, MINIMO_BAJADA_IA,
} from "./embudo-ia";
import { LARGO_TITULO, PRECIO_MAXIMO } from "./productos-digitales";
import {
  permitirGeneracion, RAFAGA_IA, GLOBAL_DIARIO, GLOBAL_PRUEBA_DIARIO,
} from "./ia-digitales";
import { CUPO_EMBUDO, CUPO_EBOOK, claveDelMes, mesSiguiente, topeDelCupo } from "./cupo-ia";
import { EBOOKS_IA_ARRANQUE, TOPES_DIGITALES } from "./planLimits";

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
/* ⚠️ SE BUSCA LA LLAMADA Y NO EL NOMBRE. Un archivo empieza por sus imports,
   así que `indexOf("permitirGeneracion")` encontraba el renglón 4 —el import— y
   no dónde se cuentan los topes de verdad. Comparado contra cualquier otra cosa
   daba siempre "primero", y este chequeo pasaba sin haber mirado nada.
   Encontrado el 04/09/26 mientras se escribían los del ebook. El código estaba
   bien; el chequeo no lo estaba mirando. */
check("RUT-A", /user\.role !== "DIGITAL"/.test(ruta) && !/role !== "OWNER"/.test(ruta),
  "la puerta es el rol DIGITAL, no el de tiendas");

/* Los topes van ANTES de leer el cuerpo y antes de tocar la base: un pedido
   rechazado no tiene que costar nada. */
check("RUT-B",
  ruta.indexOf("await permitirGeneracion") < ruta.indexOf("req.json()"),
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
  MINIMO_DEL_NICHO > 0 && LARGO_DEL_NICHO <= 4000,
  "el texto de la persona entra recortado y con un mínimo");

/* ⚠️ EL TÍTULO PROPIO SE IMPONE AL NORMALIZAR, no sólo se le pide al prompt.
   Un modelo puede "mejorar" un título aunque se le diga que no, y el resultado
   sería que alguien ve cambiado el nombre de un ebook que ya escribió. Pedirlo
   es una sugerencia; escribirlo de vuelta es la garantía. */
check("RUT-M",
  /normalizarEmbudo\(bloque\.input, tituloPropio\)/.test(ruta) &&
  /usá este nombre tal cual/.test(ruta),
  "si la persona trae su título, se le pide al modelo y además se impone");

const conTitulo = normalizarEmbudo(bueno, "Hamburguesas Irresistibles — 50 recetas");
check("RUT-N",
  conTitulo?.principal.titulo === "Hamburguesas Irresistibles — 50 recetas" &&
  /* Y sólo pisa el principal: el bono y el upsell los sigue proponiendo la IA. */
  conTitulo?.bono.titulo === bueno.bono.titulo,
  "el título propio pisa el del principal y no toca el bono ni el upsell");

check("RUT-O",
  normalizarEmbudo(bueno, "  ")?.principal.titulo === bueno.principal.titulo &&
  normalizarEmbudo(bueno, null)?.principal.titulo === bueno.principal.titulo &&
  (normalizarEmbudo(bueno, "x".repeat(400))?.principal.titulo.length ?? 0) === LARGO_TITULO_PROPIO,
  "un título vacío no pisa nada, y uno larguísimo se recorta");

/* Sin la clave no se promete nada: la persona aprieta, espera, y recibe el error
   de una librería. */
check("RUT-I", /if \(!process\.env\.ANTHROPIC_API_KEY\)/.test(ruta),
  "sin la clave de Anthropic se avisa antes de hacer esperar");

/* ⚠️ EL CUPO SE GASTA ANTES DE LLAMAR AL MODELO. Después sería tarde: ocho
   pedidos en paralelo pasarían todos el control —porque ninguno gastó todavía—
   y generarían los ocho. */
check("RUT-J",
  ruta.indexOf("await consumirDelCupo") < ruta.indexOf("anthropic.messages.create"),
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

/* ── El cupo del ebook ──────────────────────────────────────────────────── */

/* ⚠️ Los números del ebook NO se escriben en `cupo-ia`: se leen de
   `planLimits`, que es de donde los saca también la tarjeta de planes. Este
   chequeo es el que se rompe el día que alguien los copie a mano en un tercer
   lugar y se desincronicen — que ya pasó dos veces con este mismo archivo. */
check("CUP-L",
  CUPO_EBOOK.FREE.bienvenida === EBOOKS_IA_ARRANQUE.FREE &&
  CUPO_EBOOK.STARTER.bienvenida === EBOOKS_IA_ARRANQUE.STARTER &&
  CUPO_EBOOK.PRO.bienvenida === EBOOKS_IA_ARRANQUE.PRO &&
  CUPO_EBOOK.FREE.mes === TOPES_DIGITALES.FREE.ebooksIA &&
  CUPO_EBOOK.STARTER.mes === TOPES_DIGITALES.STARTER.ebooksIA &&
  CUPO_EBOOK.PRO.mes === TOPES_DIGITALES.PRO.ebooksIA,
  "el cupo de ebooks sale de planLimits y no de una copia a mano");

/* ⚠️ FREE NO ESCRIBE EBOOKS, en ninguna de las dos bolsas. Es la diferencia con
   el embudo: aquél cuesta centavos y por eso Free tiene 3; un ebook cuesta
   dólares, y en Free no entra un peso hasta que la persona vende. Free igual
   puede publicar: sube el PDF que ya tenía. */
check("CUP-M", CUPO_EBOOK.FREE.bienvenida === 0 && CUPO_EBOOK.FREE.mes === 0,
  "Free no tiene ebooks con IA, ni de arranque ni por mes");

/* Y el ebook siempre da menos que el embudo, en todos los planes y en las dos
   bolsas: es cien veces más caro por tiro. El día que este chequeo falle, o se
   subió el ebook sin mirar la factura o se bajó el embudo sin motivo. */
check("CUP-N",
  (["FREE", "STARTER", "PRO"] as const).every((t) =>
    CUPO_EBOOK[t].bienvenida <= CUPO_EMBUDO[t].bienvenida &&
    CUPO_EBOOK[t].mes <= CUPO_EMBUDO[t].mes),
  "el cupo de ebooks nunca es más grande que el del embudo");

/* ⚠️ EL TOPE SE ELIGE POR PLAN **Y POR CONCEPTO**. Las tres funciones recibían
   `concepto`, lo usaban para elegir la fila, y después leían el tope de
   `CUPO_EMBUDO` a secas. Con un solo concepto no se notaba; con el segundo,
   pedir el cupo de ebooks contestaba con el del embudo —12 en Pro en vez de 6, y
   3 en Free en vez de 0, o sea la IA cara abierta justo en el plan que no la
   paga—. Si vuelve a aparecer `CUPO_EMBUDO[tier]` suelto, es esa regresión. */
check("CUP-O",
  !/CUPO_EMBUDO\[tier\]/.test(cupo) && /topeDelCupo\(tier, concepto, enPrueba\)/.test(cupo),
  "el tope se elige mirando el plan, el concepto y si la cuenta ya pagó");

/* ══════════════════════════════════════════════════════════════════════════
   ⚠️ EL REGALO DE BIENVENIDA NO SE ENTREGA EN LA PRUEBA
   ══════════════════════════════════════════════════════════════════════════

   Los días de prueba son SIN TARJETA: no hay un dato de cobro y nada impide
   abrir otra cuenta. Con el arranque de Pro en 12, entregarlo ahí es regalar
   hasta 12 ebooks por cuenta abierta, tantas veces como cuentas quiera abrir
   alguien — y un ebook escrito con IA sirve fuera de la plataforma, que es
   justo lo que se puede cosechar.

   ⚠️ Esta regla estaba escrita en `planLimits.ts` desde el 01/09/26 y **no
   estaba en el código**: `consumirDelCupo` recibía la cuenta y el plan y nunca
   preguntaba si había pagado. Se encontró el 08/09/26 al ir a subir el arranque
   de 6 a 12. Estos chequeos existen para que no se vuelva a caer, porque es la
   clase de agujero que no se ve: nada falla, sólo se regala. */
check("CUP-Q",
  /const CUPO_DE_PRUEBA/.test(cupo) &&
  /if \(!enPrueba \|\| concepto !== "EBOOK"\) return tope;/.test(cupo),
  "el cupo de la prueba existe y sólo aprieta los ebooks, no el embudo");

/* ⚠️ Y esto se comprueba LLAMANDO A LA FUNCIÓN, no leyendo el archivo. Un
   chequeo de texto pasa igual si la regla está escrita y no se aplica — que es
   exactamente lo que pasó: la regla estaba escrita en `planLimits.ts` y el
   código no la miraba. */
check("CUP-R",
  (["STARTER", "PRO"] as const).every((t) => {
    const prueba = topeDelCupo(t, "EBOOK", true);
    const pago = topeDelCupo(t, "EBOOK", false);
    return prueba.bienvenida === 0
      && prueba.mes === 1
      && pago.bienvenida === EBOOKS_IA_ARRANQUE[t]
      && pago.mes === TOPES_DIGITALES[t].ebooksIA;
  }),
  "en la prueba queda 1 ebook y cero de bienvenida; pagando, el cupo entero");

/* Free no pasa a tener uno por estar en prueba: no tiene ebooks y punto. */
check("CUP-R2",
  topeDelCupo("FREE", "EBOOK", true).mes === 0 &&
  topeDelCupo("FREE", "EBOOK", true).bienvenida === 0,
  "un plan sin ebooks no gana uno por estar en prueba");

/* Y el embudo NO se toca: es el gancho de la prueba y cuesta centavos. */
check("CUP-R3",
  (["FREE", "STARTER", "PRO"] as const).every((t) => {
    const prueba = topeDelCupo(t, "EMBUDO", true);
    return prueba.bienvenida === CUPO_EMBUDO[t].bienvenida && prueba.mes === CUPO_EMBUDO[t].mes;
  }),
  "el cupo del embudo es el mismo en la prueba: es lo barato y es el gancho");

/* Y las dos puntas tienen que preguntarlo. Si lo pregunta el que gasta pero no
   el que muestra, la pantalla dibuja el cupo del plan pagado y el botón después
   dice que no queda — que es peor que no darlo. */
{
  const ruta = readFileSync("src/app/api/digitales/ia/ebook/route.ts", "utf8");
  check("CUP-S",
    /const enPrueba = estado === "TRIAL";/.test(ruta) &&
    /consumirDelCupo\(user\.id, tier, "EBOOK", enPrueba\)/.test(ruta) &&
    /estadoDelCupo\(user\.id, tier, "EBOOK", enPrueba\)/.test(ruta),
    "la ruta que gasta el cupo del ebook mira si la cuenta está en prueba");
}

/* Un plan sin nada de esto se contesta sin tocar la base. Sin este corte, cada
   clic de una cuenta Free en un botón que no le corresponde deja una fila de
   cupo en cero que no sirve para nada. */
check("CUP-P",
  /if \(tope\.bienvenida <= 0 && tope\.mes <= 0\) return null;/.test(cupo) &&
  cupo.indexOf("if (tope.bienvenida <= 0 && tope.mes <= 0) return null;") <
    cupo.indexOf("prisma.cupoIA.upsert"),
  "un plan con cupo cero se rechaza antes de escribir en la base");

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

/* ── El prompt no se puede contradecir a sí mismo (08/09/26) ───────────────
 *
 * ⚠️ ESTE ES EL ERROR QUE MÁS VECES SE REPITIÓ EN ESTE PROYECTO, y nunca falla
 * nada: sale una respuesta perfecta que dice otra cosa.
 *
 * Las instrucciones decían "Cortito. Nadie lee un párrafo en una tarjeta." para
 * TODO, y el esquema pedía "dos o tres oraciones" en la bajada. El modelo
 * obedeció la regla más corta y más memorable: las bajadas salieron con **53 y
 * 75 caracteres**, la mitad de lo que pone la competencia — y esa bajada es lo
 * primero que ve alguien que entra, y después es el texto de su página de venta.
 *
 * Ya había pasado igual en el recetario: las reglas prohibían las promesas y el
 * temario pedía "una promesa", así que la tapa salía vacía (REC-O).
 *
 * Lo que de verdad cambia la salida es el NÚMERO escrito, no el adjetivo. Por
 * eso las dos puntas tienen que nombrar el mismo mínimo. */
{
  const bajada = (ESQUEMA_DEL_EMBUDO.properties.principal as {
    properties: { bajada: { description: string } };
  }).properties.bajada.description;

  check("EMB-BA",
    bajada.includes(String(MINIMO_BAJADA_IA)) && bajada.includes(String(LARGO_BAJADA_IA)),
    "el esquema le dice al modelo cuántos caracteres entran en la bajada, no 'dos o tres oraciones'");

  const texto = INSTRUCCIONES;
  check("EMB-BB",
    texto.includes(String(MINIMO_BAJADA_IA)),
    "y las instrucciones nombran el mismo mínimo, así que no pueden pedir cosas distintas");

  /* Y que "cortito" quede atado al TÍTULO. Suelto vuelve a ganarle a la bajada,
     que es exactamente como empezó esto. */
  check("EMB-BC",
    !/^- Cortito\./m.test(texto),
    "no se le pide 'cortito' a todo: el título va corto y la bajada no");
}

/* ── Una ficha suelta para un producto que ya existe (08/09/26) ────────────
 *
 * ⚠️ EL AGUJERO QUE TAPA: `/ia/embudo` propone los tres y la pantalla los crea
 * empezando por el principal. En Free el tope de principales es UNO, así que
 * apenas alguien tiene su producto el botón "Armar con IA" desaparece y el
 * embudo no se puede correr nunca más. Quien hizo su producto a mano quedaba
 * sin ninguna forma de pedirle a la IA el bono ni el upsell.
 *
 * Visto en la base: una cuenta con el principal creado a las 18:30 y los bonos
 * cuatro horas después. El upsell no existía **ni borrado**. */
{
  const ruta = readFileSync("src/app/api/digitales/ia/ficha/route.ts", "utf8");

  /* ⚠️ EL MÁS IMPORTANTE. Esta ruta LEE el título, la descripción y el precio de
     un producto y los devuelve escritos en la respuesta. Sin el dueño adentro
     del `where`, mandando el id de otro se le leen los datos a un producto
     ajeno — y encima se los contestamos. */
  check("FIC-A",
    /store: \{ ownerId: user\.id \}/.test(ruta) && /rolDigital: "PRINCIPAL"/.test(ruta),
    "la ruta de la ficha pide que el producto sea de esta cuenta, adentro del where");

  /* El cupo se gasta ANTES de llamar al modelo y se devuelve si falla: si se
     gastara después, ocho pedidos en paralelo pasarían todos el control. */
  const gasta = ruta.indexOf("consumirDelCupo");
  const llama = ruta.indexOf("anthropic.messages.create");
  check("FIC-B",
    gasta > 0 && llama > gasta && (ruta.match(/devolverAlCupo/g) ?? []).length >= 2,
    "el cupo se gasta antes de llamar al modelo, y se devuelve en los dos caminos que fallan");

  /* El rol sale de una lista y no de un cast: con uno inventado, el esquema se
     armaría con la descripción de otra cosa y saldría un bono cobrado. */
  check("FIC-C",
    /body\?\.rol === "BONO" \|\| body\?\.rol === "UPSELL"/.test(ruta),
    "el rol sale de una lista cerrada, nunca de un cast");

  /* Y la pantalla tiene que tener el botón: la ruta sola no la ve nadie. */
  const grupo = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
  check("FIC-D",
    /acc\.pedirFicha\(padre, rol\)/.test(grupo) && /FichaIA/.test(grupo),
    "la pantalla ofrece pedir un bono o un upsell con IA desde su sección");

  /* Y la ventana crea por la ruta de SIEMPRE, que es la que cuenta los topes
     del plan. Creando desde la suya, una cuenta Free se llenaría de bonos. */
  const ficha = readFileSync("src/app/digitales/productos/FichaIA.tsx", "utf8");
  check("FIC-E",
    /fetch\("\/api\/digitales\/productos"/.test(ficha),
    "la ventana crea por la ruta de siempre, que es la que tiene los topes del plan");

  /* ── El embudo termina con la página escrita ─────────────────────────────
     Esto creaba las tres FICHAS —título, descripción, precio— y se detenía.
     Quien entraba después a la página de venta se encontraba doce renglones que
     decían "todavía no escribiste nada", y el botón para llenarla estaba arriba
     en el encabezado, fuera de la vista al scrollear.

     O sea: prometíamos resolver la pantalla en blanco y la resolvíamos a
     medias. La competencia pide UNA descripción y devuelve el embudo Y la
     página. */
  check("EMB-CA",
    /setCreando\("tu página de venta"\)/.test(ventana) &&
    /fetch\("\/api\/digitales\/ia\/pagina"/.test(ventana) &&
    /\$\{productoId\}\/pagina`, \{\s*\n\s*method: "PUT"/.test(ventana),
    "armar el embudo también escribe y guarda la página de venta");

  /* ⚠️ Y ESA ÚLTIMA PARTE NO PUEDE VOLTEAR LO DEMÁS. Los tres productos ya
     están creados y guardados cuando corre: si la IA está caída y el error
     sube, la pantalla dice "no pudimos crearlos" sobre un embudo que SÍ se
     creó, con el cartel de "ojo, lo que se alcanzó a crear quedó guardado".
     Asustar por algo que salió bien es peor que quedarse sin la página, que
     además se puede escribir después y sigue siendo gratis. */
  check("EMB-CB",
    /const escribirLaPagina = async \(productoId: string\) => \{\s*\n\s*try \{/.test(ventana) &&
    /\} catch \{[\s\S]{0,400}?console\.warn\("\[embudo-ia\]/.test(ventana),
    "y si la página falla, el embudo que ya se creó no se reporta como error");

  /* Y se promete lo que ahora hace: la ventana nombra la página de venta antes
     de apretar, no después. */
  check("EMB-CC",
    /tu página\s*\n?\s*de venta/.test(ventana) && /Crear todo/.test(ventana),
    "la ventana dice de entrada que también sale la página de venta");
}

losTopes().then(() => {
  console.log(fallos === 0
    ? "\nok — lo que devuelve el modelo se lima, y ninguna generación sale sin tope"
    : `\nFALLA — ${fallos} chequeo(s) del embudo con IA`);
  process.exit(fallos === 0 ? 0 : 1);
});
