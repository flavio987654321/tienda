/**
 * Chequeos del panel de Productos Digitales.
 *
 *   npx tsx src/lib/panel-inicio.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Que la plata dé bien, y que dé LO MISMO que en Ventas.** Dos pantallas que
 * muestran la misma plata no pueden decir números distintos: el que ve $170.000
 * en una y $168.000 en la otra deja de creerle a las dos.
 *
 * **Que un producto no se lleve las ventas de otro.** Los bonos y los upsells
 * suman al principal del que cuelgan; las ventas se cuentan una sola vez.
 *
 * **Y que el panel se pueda usar sin JavaScript**, porque el selector es lo
 * primero que se toca y son enlaces, no botones.
 */

import { readFileSync } from "fs";
import { repartirPorProducto, sumarPorTasa, type FilaCruda } from "./panel-inicio";
import { comisionCongelada } from "./compra-digital";
import { COMISION_DIGITAL } from "./planLimits";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const pagina = readFileSync("src/app/digitales/page.tsx", "utf8");
const direcciones = readFileSync("src/app/digitales/Direcciones.tsx", "utf8");
const lib = readFileSync("src/lib/panel-inicio.ts", "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   LA CUENTA
   ══════════════════════════════════════════════════════════════════════════ */

/* Una cuenta de ejemplo: un principal con un bono (gratis) y un upsell, vendido
   dos veces al 8% (Free), y un segundo producto vendido una vez al 2% (Pro). */
const MAPA = new Map<string, string>([
  ["mecanica", "mecanica"],
  ["bono-mecanica", "mecanica"],
  ["upsell-mecanica", "mecanica"],
  ["tortas", "tortas"],
]);

const FILAS: FilaCruda[] = [
  { producto: "mecanica",        tasa: 8, bruto: 20_000, lineas: 2, brutoMes: 10_000, lineasMes: 1 },
  { producto: "bono-mecanica",   tasa: 8, bruto: 0,      lineas: 2, brutoMes: 0,      lineasMes: 1 },
  { producto: "upsell-mecanica", tasa: 8, bruto: 5_000,  lineas: 1, brutoMes: 5_000,  lineasMes: 1 },
  { producto: "tortas",          tasa: 2, bruto: 30_000, lineas: 1, brutoMes: 0,      lineasMes: 0 },
];

const { total, mes } = repartirPorProducto(FILAS, MAPA);

/* ⚠️ Las ventas se cuentan SÓLO en la línea del principal. Con los bonos
   adentro, esta compra figuraría como cuatro ventas y no como dos. */
check("PAN-A",
  total.get("mecanica")?.ventas === 2 && total.get("tortas")?.ventas === 1,
  "las ventas se cuentan una vez, no una por bono");

/* El upsell suma al producto del que cuelga: es parte de esa venta, no un
   negocio aparte. El que pregunta cuánto le dejó mecánica lo quiere adentro. */
check("PAN-B",
  total.get("mecanica")?.bruto === 25_000,
  "el bono y el upsell suman al principal del que cuelgan");

/* La comisión se descuenta con el porcentaje de CADA venta, no con el plan de
   hoy: quien vendió en Free al 8% y hoy está en Pro no puede ver esas ventas
   recalculadas al 2%. */
check("PAN-C",
  total.get("mecanica")!.comision === comisionCongelada(25_000, 8) &&
  total.get("tortas")!.comision === comisionCongelada(30_000, 2),
  "cada producto se descuenta con el porcentaje que le tocó a sus ventas");

check("PAN-D",
  mes.get("mecanica")?.bruto === 15_000 && mes.get("mecanica")?.ventas === 1 &&
  mes.get("tortas")?.bruto === 0,
  "el mes en curso se cuenta aparte y en la misma pasada");

/* Una línea de un producto que no está en el mapa se descarta. Es mejor perder
   una fila que atribuírsela a quien no le corresponde. */
const { total: conIntrusa } = repartirPorProducto(
  [...FILAS, { producto: "de-otra-tienda", tasa: 8, bruto: 999_999, lineas: 9, brutoMes: 0, lineasMes: 0 }],
  MAPA,
);
check("PAN-E",
  conIntrusa.get("mecanica")?.bruto === 25_000 && conIntrusa.size === 2,
  "una línea de un producto desconocido no se le suma a nadie");

/* Sin ventas, ceros — no `undefined` ni `NaN` colándose a la pantalla. */
const vacio = repartirPorProducto([], MAPA);
check("PAN-F", vacio.total.size === 0 && vacio.mes.size === 0,
  "sin ventas no se inventa ninguna fila");

/* ⚠️ EL TOTAL SALE DE LAS ÓRDENES, y tiene que dar lo mismo que Ventas. */
const GRUPOS = [
  { lockedCommissionRate: 8, _sum: { total: 25_000 }, _count: { _all: 2 } },
  { lockedCommissionRate: 2, _sum: { total: 30_000 }, _count: { _all: 1 } },
];
const general = sumarPorTasa(GRUPOS);

check("PAN-G",
  general.ventas === 3 && general.bruto === 55_000 &&
  general.comision === comisionCongelada(25_000, 8) + comisionCongelada(30_000, 2),
  "el total agrupa por porcentaje y suma las tres ventas");

/* La misma cuenta que hace Ventas, escrita al lado: si alguna de las dos cambia,
   esto se pone en rojo antes de que las pantallas se separen. */
let brutoVentas = 0, comisionVentas = 0, ventasVentas = 0;
for (const g of GRUPOS) {
  const s = g._sum.total ?? 0;
  brutoVentas += s;
  comisionVentas += comisionCongelada(s, g.lockedCommissionRate);
  ventasVentas += g._count._all;
}
check("PAN-H",
  general.ventas === ventasVentas &&
  general.bruto - general.comision === brutoVentas - comisionVentas,
  "el panel y la pantalla de Ventas dan el mismo número");

/* Un total sin porcentaje guardado —una orden vieja— no descuenta nada en vez de
   explotar o descontar de más. */
const sinTasa = sumarPorTasa([{ lockedCommissionRate: null, _sum: { total: 10_000 }, _count: { _all: 1 } }]);
check("PAN-I", sinTasa.comision === 0 && sinTasa.bruto === 10_000,
  "una venta sin porcentaje guardado no descuenta nada");

const sinTotal = sumarPorTasa([{ lockedCommissionRate: 8, _sum: { total: null }, _count: { _all: 1 } }]);
check("PAN-J", sinTotal.bruto === 0 && sinTotal.comision === 0 && sinTotal.ventas === 1,
  "una suma vacía no se convierte en NaN");

/* Los porcentajes que usa el ecosistema pasan por la misma puerta. */
check("PAN-K",
  Object.values(COMISION_DIGITAL).every((pct) => comisionCongelada(10_000, pct) <= 10_000),
  "ninguna comisión de ningún plan puede superar la venta");

/* ══════════════════════════════════════════════════════════════════════════
   DE DÓNDE SALEN LOS NÚMEROS
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ El total NO puede salir de sumar ítems: un producto borrado o un ítem
   huérfano alcanza para separarlo del de Ventas. */
check("PAN-L",
  /prisma\.order\.groupBy\(\{[\s\S]{0,120}by: \["lockedCommissionRate"\]/.test(lib),
  "el total se saca de las órdenes agrupadas por su porcentaje");

/* Y los productos borrados SÍ entran al mapeo: una venta vieja de un producto
   que ya no está sigue siendo plata que entró. */
check("PAN-M",
  /where: \{ storeId \},/.test(lib) && /deletedAt: true,/.test(lib) &&
  /p\.deletedAt === null/.test(lib),
  "los productos borrados cuentan para la plata y no para las tarjetas");

/* Una consulta por producto en una cuenta con cinco productos son cinco viajes a
   la base por cada visita al panel.

   ⚠️ El techo se subió de 7 a 9 el 22/09/26, al agregar las visitas y las
   últimas ventas. Lo que este chequeo cuida NO es el número —ese va a seguir
   subiendo cada vez que el panel muestre algo más— sino que las consultas sean
   una cantidad FIJA y en paralelo: todas adentro del mismo `Promise.all`, y
   ninguna adentro de un bucle. Con cinco productos tienen que ser las mismas
   nueve que con uno. */
check("PAN-N",
  (lib.match(/prisma\.\w+\.(findMany|groupBy|count|findUnique)/g) ?? []).length <= 9 &&
  !/for \(const p of productos\)[\s\S]{0,200}await prisma/.test(lib) &&
  !/\.map\([\s\S]{0,120}await prisma/.test(lib),
  "no hay una consulta por producto: son una cantidad fija y en paralelo");

/* ⚠️ EL CANDADO DE LAS VISITAS VA ANTES DE LA CONSULTA, no después. Tapar el
   número en pantalla igual paga el viaje a la base y deja el dato en el HTML
   de una cuenta que no lo compró. Es el mismo patrón que usa Sasha para no
   mirar lo que el plan no ve. */
check("VIS-A",
  /conVisitas[\s\S]{0,80}\? prisma\.digitalVisita\.groupBy/.test(lib) &&
  /: Promise\.resolve\(\[\]\)/.test(lib) &&
  /puedeVer\(tier, "visitas"\)/.test(pagina) &&
  /fotoDelPanel\(store\.id, p \?\? null, veVisitas\)/.test(pagina),
  "en Free las visitas ni se consultan, y quien decide es la misma función que Estadísticas");

/* `null` es "tu plan no las ve" y un cero es un dato. Dibujarlos igual esconde
   algo que ya se sabe, o promete algo que no se midió. */
check("VIS-B",
  /numeros\.visitas === null \?/.test(pagina) && /Con Starter →/.test(pagina) &&
  /numeros\.visitas > 0 \?/.test(pagina),
  "sin plan va el candado, con plan va el número, y la conversión sólo si hubo visitas");

/* ⚠️ Es una función de datos, no una puerta: quien la llama tiene que traer el
   `storeId` ya verificado. Queda escrito para que nadie la use de otra forma. */
check("PAN-O",
  /* Se busca la frase que NO está partida en dos renglones. Buscar "no se
     comprueba nada" fallaba porque ahí el comentario corta y entre las dos
     palabras hay un salto y un asterisco — la sexta vez que pasa en este
     proyecto. */
  /función de datos, no una puerta/.test(lib),
  "queda escrito que esta función no verifica permisos");

/* ══════════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ══════════════════════════════════════════════════════════════════════════ */

/* El producto elegido va en la DIRECCIÓN: así el link se comparte, el botón
   atrás funciona y recargar no pierde nada. */
check("PAN-P",
  /searchParams: Promise<\{ p\?: string \}>/.test(pagina) && /\/digitales\?p=\$\{prod\.id\}/.test(pagina),
  "el producto elegido viaja en la dirección, no en un estado");

/* Y el selector son ENLACES, no botones: el panel se puede usar aunque el
   navegador todavía no haya despertado el JavaScript. */
check("PAN-Q",
  !/"use client"/.test(pagina) && /function Chip\(/.test(pagina) && /<Link\s+href=\{href\}/.test(pagina),
  "el selector son enlaces y la pantalla no necesita JavaScript");

/* ⚠️ Un `?p=` ajeno no muestra nada ajeno: `fotoDelPanel` sólo mira los
   productos de esa tienda, así que cae solo en la vista de todos. */
check("PAN-R",
  /where: \{ ownerId: user\.id \}/.test(pagina) && /no existe para `fotoDelPanel`/.test(pagina),
  "pedir un producto ajeno no muestra nada ajeno");

/* "Lo que te quedó", no "lo que vendiste": es el número que la gente busca. */
check("PAN-S",
  /Lo que te quedó/.test(pagina) && /plata\(numeros\.neto\)/.test(pagina),
  "el número destacado es el neto, no el bruto");

/* Un panel lleno de ceros enseña a no mirarlo: los avisos aparecen sólo cuando
   hay algo que hacer, y llevan a donde se hace. */
check("PAN-T",
  /foto\.total\.sinBajar > 0 \|\| foto\.total\.esperando > 0/.test(pagina) &&
  /href="\/digitales\/ventas/.test(pagina),
  "los avisos aparecen sólo cuando hay algo que hacer, y llevan a Ventas");

/* Sin dirección no se puede repartir nada: no alcanza con dejar el hueco vacío. */
check("PAN-U",
  /Todavía no tiene dirección/.test(pagina) && /\/direccion/.test(pagina),
  "si al producto le falta la dirección, se dice y se lleva a elegirla");

/* Que no esté publicado explica por qué no hay ventas, y eso hay que decirlo, no
   dejar que se deduzca de un cero. */
check("PAN-V",
  /Está sin publicar/.test(pagina),
  "un producto sin publicar lo dice, en vez de mostrar un cero sin explicación");

/* ⚠️ Se muestran LAS DOS direcciones cuando hay dos. Mostrar sólo el dominio
   propio haría pensar que la de tiendaapps se apagó, y no se apaga nunca. */
check("PAN-W",
  /dominioPropio \? \[\{ texto: dominioPropio/.test(direcciones) &&
  /slug \? \[\{\s*texto: `\$\{slug\}\.\$\{dominioBase\}`/.test(direcciones),
  "se muestran el dominio propio y la dirección de siempre, no una sola");

/* La operación real es COPIARLA: se pega en un anuncio o en un mensaje, y en un
   teléfono seleccionarla a mano con el dedo es un castigo. */
check("PAN-X",
  /navigator\.clipboard\.writeText/.test(direcciones) && /aria-label=\{`Copiar/.test(direcciones),
  "la dirección se copia con un botón, y el botón dice qué hace");

/* La página en vivo se abre aparte: es lo que ve el comprador, y reemplazar el
   panel por ella deja a la persona sin forma clara de volver. */
check("PAN-Y",
  /target="_blank"/.test(direcciones) && /rel="noopener noreferrer"/.test(direcciones) &&
  /target="_blank"/.test(pagina) && /rel="noopener noreferrer"/.test(pagina),
  "lo que se abre hacia afuera va en otra pestaña, y sin dejar pasar el referente");

/* El único pedazo con JavaScript es el de copiar. */
check("PAN-Z",
  /"use client"/.test(direcciones) && !/@\/lib\/prisma/.test(direcciones),
  "el componente de las direcciones es de navegador y no arrastra Prisma");

/* Con un solo producto, un selector de un elemento es ruido. */
check("PAN-AA",
  /productos\.length > 1 && \(/.test(pagina),
  "el selector aparece recién cuando hay más de un producto");

/* ══════════════════════════════════════════════════════════════════════════
   LOS PASOS SON DE LA PRIMERA VEZ, NO DEL PANEL
   ══════════════════════════════════════════════════════════════════════════ */

/* Sin un solo producto, los pasos SON la pantalla: mostrar tres ceros y una
   lista vacía es peor que no mostrar nada. */
check("PAN-AB",
  /if \(productos\.length === 0\) \{/.test(pagina) &&
  pagina.indexOf("if (productos.length === 0) {") < pagina.indexOf("<PrimerosPasos pasos={pasos} />"),
  "sin ningún producto, los pasos son la pantalla entera");

/* ══════════════════════════════════════════════════════════════════════════
   CON PRODUCTOS, LOS PASOS SIGUEN ESTANDO HASTA QUE ESTÉN LOS CINCO
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ Este chequeo decía lo contrario —"con productos, lo que falta va chiquito
   en la columna de al lado"— y así estaba escrito el error: la lista entera
   vivía sólo en la pantalla de cuenta vacía, así que **desaparecía al cargar el
   primer producto**, con cuatro pasos sin hacer. Lo que quedaba era una
   tarjetita en la columna de al lado, que en el teléfono va al fondo de todo.

   Reportado probando una cuenta Free de verdad: *"cuando entré al panel y
   empecé a usar todo, ya no me aparecían más"*.

   La condición correcta nunca fue "¿ya tiene un producto?" sino
   `terminado(pasos)`. La objeción que los sacó del medio sigue respetada: el
   que ya vendió cuarenta veces terminó los cinco y no ve nada. */
const conProductos = pagina.slice(pagina.indexOf("max-w-6xl"));

check("PAN-AC",
  /\{!terminado\(pasos\) && <PrimerosPasos pasos=\{pasos\} \/>\}/.test(conProductos),
  "con productos, la lista entera sigue estando mientras falte alguno");

/* Y va en la columna PRINCIPAL, no en la de al lado: es lo que hay que hacer
   ahora, y en el teléfono la columna de al lado se apila al fondo de todo. */
check("PAN-AC2",
  conProductos.indexOf("<PrimerosPasos") < conProductos.indexOf("<aside"),
  "y va en la columna principal, no arrinconada al costado");

/* Una sola vez. Dos avisos de lo mismo en la misma pantalla es peor que uno: el
   chiquito de al lado era el que se veía, así que el de verdad no se buscaba. */
check("PAN-AC3",
  (conProductos.match(/<PrimerosPasos/g) ?? []).length === 1,
  "y una sola vez, no dos avisos de lo mismo");

/* Y se va solo cuando están los cinco: no hay nada que cerrar a mano. */
check("PAN-AD",
  /!terminado\(pasos\)/.test(pagina),
  "lo que falta desaparece solo al terminar los cinco pasos");

/* Los accesos rápidos a la derecha, y el primero destacado: la pantalla tiene
   que decir no sólo cómo va, también qué hacer ahora. */
check("PAN-AE",
  /Accesos rápidos/.test(pagina) && /fuerte/.test(pagina),
  "hay accesos rápidos y uno se destaca sobre los demás");

/* ⚠️ Dos columnas RECIÉN en pantalla grande. En un teléfono esto se apila, y el
   orden correcto ahí es primero cómo va y después qué hacer. */
check("PAN-AF",
  /grid lg:grid-cols-\[minmax\(0,1fr\)_270px\]/.test(pagina),
  "las dos columnas son sólo de pantalla grande; en el teléfono se apilan");

/* ══════════════════════════════════════════════════════════════════════════
   LA PRIMERA PANTALLA DICE LO QUE LA HERRAMIENTA HACE
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ Decía "Cargá tu producto, publicá su página y cobrá con Mercado Pago": el
   camino A MANO, en la primera pantalla de una cuenta nueva. Los pasos de abajo
   ya ofrecían la IA, pero se leen después — y el párrafo de arriba es el que
   decide si sigue leyendo. Alguien que entra y lee "cargá tu producto" ya
   entendió que le toca a ella.

   Se chequea el BLOQUE de la primera vez y no el archivo entero: el resto del
   panel nombra la IA por otros motivos y el chequeo pasaría sin mirar nada. */
const arranca = pagina.indexOf("if (productos.length === 0)");
const termina = pagina.indexOf("No lleva `min-h-screen`");
const primeraVez = arranca >= 0 && termina > arranca ? pagina.slice(arranca, termina) : "";

/* ⚠️ Las dos marcas se comprueban ANTES de cortar. Con `indexOf` devolviendo -1
   el corte se lleva medio archivo y el chequeo pasa sin mirar lo que dice
   mirar — es la misma trampa que ya apareció seis veces en este proyecto. Si
   alguien renombra una de las dos, esto se pone en rojo y se arregla el corte,
   que es lo correcto. */
check("PAN-AG0", primeraVez.length > 200 && primeraVez.length < 4000,
  "el bloque de la primera vez se encontró entero");

check("PAN-AG",
  /\bIA\b/.test(primeraVez),
  "la primera pantalla nombra la IA, no sólo el camino a mano");

/* Y sigue prometiendo lo único que ningún competidor hace por vos: la entrega.
   Es la mitad que NO se puede perder al reescribir el arranque. */
/* Dos palabras sueltas y no la frase entera, por dos motivos: el texto se parte
   en renglones distintos según dónde caiga —una frase escrita tal cual se pone
   en rojo por un salto de línea que no cambia nada— y lo que hay que cuidar es
   LA PROMESA, no la redacción. Entrega + apenas: se entrega solo, al pagar. */
check("PAN-AH",
  /entrega/.test(primeraVez) && /apenas/.test(primeraVez),
  "y no se perdió la promesa de la entrega automática");

console.log(fallos === 0
  ? "\nok — la plata da lo mismo que en Ventas, y cada producto se lleva lo suyo"
  : `\nFALLA — ${fallos} chequeo(s) del panel`);
process.exit(fallos === 0 ? 0 : 1);
