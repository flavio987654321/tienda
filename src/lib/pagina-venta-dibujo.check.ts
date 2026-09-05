/**
 * Chequeos del DIBUJO de la página de venta.
 *
 *   npx tsx src/lib/pagina-venta-dibujo.check.ts
 *
 * ── Por qué éste dibuja de verdad y no lee el archivo ───────────────────────
 *
 * `pagina-venta.check.ts` cuida el CATÁLOGO: qué secciones existen, con qué
 * campos y con qué topes. Éste cuida lo otro: qué sale en la pantalla.
 *
 * Y para eso no alcanza con buscar texto en el componente. Las cosas que se
 * rompieron en la pasada del 05/09 —un hueco colgando de un título borrado, la
 * misma lista de bonos dos veces en la misma pantalla, un precio partido al
 * medio— no se ven leyendo el código: se ven mirando el HTML que sale. Así que
 * acá se dibuja la página con contenido de prueba y se mira el resultado.
 *
 * Los pocos chequeos que sí leen el archivo están al final, y son los que un
 * render no puede mostrar: por qué una clase NO está.
 */

import { readFileSync } from "fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contenidoPorDefecto, type PaginaVenta } from "./pagina-venta";
import PaginaDeVenta, {
  type DatosDePagina, type ProductoParaPagina,
} from "../components/digitales/PaginaDeVenta";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const cuantas = (texto: string, aguja: string) => texto.split(aguja).length - 1;

/* ══════════════════════════════════════════════════════════════════════════
   EL CONTENIDO DE PRUEBA
   ══════════════════════════════════════════════════════════════════════════ */

const bono = (n: number, valor: number, conTapa: boolean): ProductoParaPagina => ({
  id: `b${n}`, name: `Bono de prueba ${n}`, description: "Una descripción corta.",
  price: 0, comparePrice: valor, imagen: conTapa ? `https://ejemplo.test/tapa-${n}.jpg` : null,
});

/** Tres bonos: CANTIDAD IMPAR a propósito, que es donde se rompía la grilla. */
const BONOS = [bono(1, 8000, true), bono(2, 4500, true), bono(3, 6000, false)];
const VALOR_BONOS = 8000 + 4500 + 6000;
const PRECIO = 15000;
const REGULAR = 20000;

function paginaDePrueba(): PaginaVenta {
  const p = contenidoPorDefecto();
  const s = (clave: string) => p.secciones.find((x) => x.clave === clave)!;

  s("opiniones").visible = true;
  s("opiniones").campos.items = [
    { nombre: "María Fernández", texto: "Lo compré un domingo y el lunes ya lo estaba usando." },
    { nombre: "Diego", texto: "Muy claro." },
    { nombre: "", texto: "Una opinión sin nombre, que también tiene que salir." },
  ];
  s("garantia").visible = true;
  s("garantia").campos.dias = 15;
  s("beneficios").campos.items = [{ icono: "🧪", titulo: "Un beneficio", detalle: "Por qué sirve." }];
  s("dolores").campos.items = [{ icono: "😵", titulo: "Una situación", detalle: "Por qué duele." }];
  s("comoFunciona").campos.pasos = [
    { titulo: "Comprás", detalle: "Con Mercado Pago." },
    { titulo: "Te llega", detalle: "Por mail." },
  ];
  s("preguntas").campos.items = [{ pregunta: "¿Sirve?", respuesta: "Sí." }];
  return p;
}

function datosDePrueba(cambios?: Partial<DatosDePagina>): DatosDePagina {
  return {
    pagina: paginaDePrueba(),
    producto: {
      id: "demo", name: "Producto de prueba", description: "Una descripción.",
      price: PRECIO, comparePrice: REGULAR, imagen: "https://ejemplo.test/portada.jpg",
    },
    bonos: BONOS,
    vendedor: { nombre: "Quien Vende", contacto: "hola@ejemplo.test" },
    anio: 2026,
    esPrevia: true,
    ...cambios,
  };
}

const dibujar = (datos: DatosDePagina) => renderToStaticMarkup(createElement(PaginaDeVenta, datos));

const html = dibujar(datosDePrueba());

/* ══════════════════════════════════════════════════════════════════════════
   1. LOS BONOS SE VEN, Y SE VE CUÁNTO VALEN
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ Cada bono es un producto y tiene su tapa cargada, y la sección la tenía a
   mano y dibujaba texto pelado. Un regalo que no se ve no parece un regalo. */
check("DIB-A",
  html.includes("https://ejemplo.test/tapa-1.jpg") && html.includes("https://ejemplo.test/tapa-2.jpg"),
  "la tapa de cada bono se dibuja");

/* Y el que no tiene tapa no deja un hueco ni una imagen rota. */
check("DIB-B",
  !html.includes('src=""') && !html.includes("src=\"null\""),
  "un bono sin tapa no deja una imagen rota");

/* El número sale de la POSICIÓN. Sin campo que se escriba a mano no hay forma
   de que borrar el segundo bono deje un "Bono 3" con dos bonos en pantalla. */
check("DIB-C",
  html.includes("Bono 1") && html.includes("Bono 2") && html.includes("Bono 3") && !html.includes("Bono 4"),
  "los bonos se numeran solos, por su posición");

check("DIB-D",
  html.includes(`Los 3 bonos valen ${plata(VALOR_BONOS)} y van incluidos`),
  "la suma de los bonos es la suma de verdad", plata(VALOR_BONOS));

/* ⚠️ El último de una cantidad IMPAR toma el ancho entero. Con tres bonos y dos
   columnas, el tercero quedaba solo en media columna con un agujero al lado.
   Son dos: el tercer bono y la tercera opinión. */
check("DIB-E",
  cuantas(html, "sm:col-span-2") === 2,
  "el último impar toma el ancho entero, en bonos y en opiniones",
  cuantas(html, "sm:col-span-2"));

/* ══════════════════════════════════════════════════════════════════════════
   2. LA MISMA LISTA NO APARECE DOS VECES PEGADA
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ La ficha del producto tenía la lista corta de bonos adentro, y la sección
   de Bonos —con foto y descripción— arranca tres centímetros más abajo.
   Repetir la oferta al final de la página está bien; repetirla pegada no es
   insistir, es que sobra. */
check("DIB-F",
  cuantas(html, "Incluye 3 bonos gratis") === 1,
  "con la sección de Bonos encendida, la ficha no repite la lista",
  cuantas(html, "Incluye 3 bonos gratis"));

/* Y si esa sección se apaga, la lista VUELVE a la ficha: el dato no se pierde,
   cambia de lugar. Sin esto, apagar Bonos escondería los regalos entero. */
const sinSeccionDeBonos = (() => {
  const datos = datosDePrueba();
  datos.pagina.secciones.find((s) => s.clave === "bonos")!.visible = false;
  return dibujar(datos);
})();
check("DIB-G",
  cuantas(sinSeccionDeBonos, "Incluye 3 bonos gratis") === 2,
  "apagando la sección de Bonos, la lista vuelve a la ficha",
  cuantas(sinSeccionDeBonos, "Incluye 3 bonos gratis"));

/* ⚠️ En el resumen de precio, la lista termina con "Valor total $38.500" y el
   tachado de abajo decía EL MISMO NÚMERO CON LA MISMA PALABRA, dos renglones
   después. Se dibuja sólo el resumen para poder mirarlo aislado. */
const soloPrecio = (() => {
  const datos = datosDePrueba();
  for (const s of datos.pagina.secciones) if (s.clave !== "precio") s.visible = false;
  return dibujar(datos);
})();
check("DIB-H",
  soloPrecio.includes("Valor total") && !soloPrecio.includes("valor total"),
  "el resumen de precio no dice dos veces el valor total");

/* Pero el tachado sigue estando donde es lo ÚNICO que compara: la ficha. */
const soloFicha = (() => {
  const datos = datosDePrueba();
  for (const s of datos.pagina.secciones) if (s.clave !== "producto") s.visible = false;
  return dibujar(datos);
})();
check("DIB-I",
  soloFicha.includes("valor total") && soloFicha.includes(plata(VALOR_BONOS + REGULAR)),
  "en la ficha el tachado se queda: ahí es lo único que compara");

/* ══════════════════════════════════════════════════════════════════════════
   3. UN TÍTULO BORRADO NO DEJA UN HUECO
   ══════════════════════════════════════════════════════════════════════════

   La pregunta que quedó abierta el 02/09 mirando el editor de la competencia,
   que avisa "si los dejás vacíos se usa el texto por defecto". Acá vacío es
   vacío —no se inventa un título— y por eso había que mirar el hueco: el
   título no se dibuja, y el margen de arriba del contenido quedaba colgando de
   nada. 32 píxeles de aire que se leen como un error de la página. */

const sinTitulos = (() => {
  const datos = datosDePrueba();
  for (const s of datos.pagina.secciones) {
    for (const k of ["titulo", "subtitulo", "rotulo"]) {
      if (typeof s.campos[k] === "string") s.campos[k] = "";
    }
  }
  return dibujar(datos);
})();

check("DIB-J", html.includes("mt-8"), "con título, el contenido lleva su aire");
check("DIB-K",
  !sinTitulos.includes("mt-8"),
  "sin título, no queda ningún hueco colgando");

/* Y borrar el título NO borra la sección: el contenido sigue estando. */
check("DIB-L",
  sinTitulos.includes("Bono 1") && sinTitulos.includes("Un beneficio"),
  "borrar el título no se lleva puesto el contenido");

/* ══════════════════════════════════════════════════════════════════════════
   4. EL PRECIO NO SE PARTE AL MEDIO
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ Medido a 768 en la ficha del producto: "$ 15.0" en un renglón y "00" en el
   siguiente. La página entera lleva `overflow-wrap: anywhere` para que un
   título pegado sin espacios no le rompa el ancho —eso se queda, es la red— y
   como entre dos `span` seguidos JSX no deja ningún espacio, el tachado y el
   precio eran UNA sola palabra larguísima: cortar adentro del número era el
   único lugar que le habíamos dejado al navegador. */

check("DIB-M",
  /whitespace-nowrap[^"]*text-4xl/.test(html),
  "el precio grande no se puede partir");

check("DIB-N",
  html.includes("[overflow-wrap:anywhere]"),
  "y la red contra el título pegado sin espacios sigue puesta");

/* ══════════════════════════════════════════════════════════════════════════
   5. LA GARANTÍA DICE LO MISMO EN TODA LA PÁGINA
   ══════════════════════════════════════════════════════════════════════════ */

check("DIB-O",
  html.includes("Garantía de 15 días"),
  "con la garantía encendida, el sello la anuncia");

const sinGarantia = (() => {
  const datos = datosDePrueba();
  datos.pagina.secciones.find((s) => s.clave === "garantia")!.visible = false;
  return dibujar(datos);
})();
/* ⚠️ Un sello de garantía en una página que no la tiene es una promesa que
   nadie escribió y que después hay que cumplir igual. */
check("DIB-P",
  !sinGarantia.includes("Garantía de 15 días"),
  "apagada, no queda ningún sello prometiéndola");

/* ══════════════════════════════════════════════════════════════════════════
   6. LO QUE UN RENDER NO PUEDE MOSTRAR: POR QUÉ UNA CLASE NO ESTÁ
   ══════════════════════════════════════════════════════════════════════════ */

const fuente = readFileSync("src/components/digitales/PaginaDeVenta.tsx", "utf8");
const bloqueBonos = fuente.slice(fuente.indexOf('case "bonos"'), fuente.indexOf('case "beneficios"'));

/* La miniatura va SIN `estilo.tarjeta`: en Editorial esa clase es una línea
   arriba con 24 píxeles de espacio, y aplicada a una miniatura la baja media
   tarjeta. Chequeado en los cinco estilos el 05/09. */
check("DIB-Q",
  bloqueBonos.includes("<img") && !/(<img[\s\S]{0,400}?estilo\.tarjeta)/.test(bloqueBonos),
  "la tapa del bono no hereda la tarjeta del estilo");

/* La suma sale de `valorDeLosBonos`, la misma que usan el resumen y la barra.
   Escrita de nuevo acá, el día que cambie qué entra en la cuenta cambiaría en
   un lugar y en los otros no — que ya pasó una vez con los bonos. */
check("DIB-R",
  bloqueBonos.includes("valorDeLosBonos(bonos)"),
  "el total de los bonos sale de la cuenta compartida");

/**
 * El código sin sus comentarios.
 *
 * ⚠️ Hace falta porque los dos chequeos de abajo buscan palabras que NO tienen
 * que estar —"estrellas", `charAt`— y el comentario que explica por qué no
 * están las nombra las dos. Sin esto, los dos se ponían en rojo por su propia
 * explicación. Es la sexta vez que aparece esta trampa en el proyecto.
 */
const sinComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const bloqueOpiniones = sinComentarios(
  fuente.slice(fuente.indexOf('case "opiniones"'), fuente.indexOf('case "precio"')),
);

/* ⚠️ NI ESTRELLAS NI FOTO. La sección de la competencia dibuja esto como una
   captura de WhatsApp —con hora, señal y doble tilde— abajo de un título que
   dice "TESTIMONIOS REALES", y su IA la llena sola con tres personas
   inventadas. Una inicial es lo máximo que se puede dibujar sin agregarle a la
   opinión una prueba que nadie dio. */
check("DIB-S",
  !/rating|estrella|★|⭐/i.test(bloqueOpiniones),
  "las opiniones no llevan estrellas ni puntaje");

/* La inicial se saca con el desparramo y no con `charAt`: un nombre que arranca
   con un emoji o con una letra acentuada compuesta se parte por la mitad y sale
   un carácter roto adentro del círculo. */
check("DIB-T",
  bloqueOpiniones.includes("[...(i.nombre") && !bloqueOpiniones.includes("charAt"),
  "la inicial no parte un emoji por la mitad");

/* Una opinión sin nombre no dibuja un círculo vacío. */
check("DIB-U",
  cuantas(html, "grid h-10 w-10 shrink-0 place-items-center rounded-full") === 2,
  "una opinión sin nombre no deja un círculo vacío",
  cuantas(html, "grid h-10 w-10 shrink-0 place-items-center rounded-full"));

/* Las dos banderas de `Numeros` son distintas y tienen que seguir siéndolo: en
   la ficha la lista va aparte pero el tachado se queda; en el resumen es al
   revés. Con una sola, arreglar una rompía la otra. */
check("DIB-V",
  fuente.includes("listaAparte?: boolean") && fuente.includes("totalAparte?: boolean"),
  "la lista y el total se apagan por separado");

console.log(fallos === 0
  ? "\nok — la página se dibuja entera, sin huecos ni números repetidos"
  : `\nFALLA — ${fallos} chequeo(s) del dibujo de la página`);
process.exit(fallos === 0 ? 0 : 1);
