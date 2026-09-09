import type { CapituloEscrito } from "@/lib/ebook-ia";

/**
 * El texto del ebook de ejemplo.
 *
 * ⚠️ Va en su propio archivo y no adentro de la pantalla: son seis capítulos
 * enteros, y mezclados con el dibujo no se puede leer ni una cosa ni la otra.
 *
 * Es creíble a propósito —capítulos de largo distinto, párrafos largos de los
 * que se van a varios renglones, viñetas, subtítulos y recuadros—: con un ebook
 * de tres palabras la pantalla siempre se ve bien, y no es lo que hay que
 * probar. Ver `ejemploDeTarjeta`, que es el producto al que cuelga.
 */
export const CAPITULOS_DE_EJEMPLO: CapituloEscrito[] = [
  {
    titulo: "Qué vendés en realidad, y por qué no es el archivo",
    bloques: [
      { tipo: "parrafo", texto: "Cuando alguien te compra un PDF no está pagando por un PDF. Está pagando por dejar de perder tiempo en algo que vos ya resolviste. Esa diferencia parece un juego de palabras hasta que te sentás a escribir la página de venta: si creés que vendés un archivo, vas a hablar de cuántas páginas tiene y en qué formato viene, que es exactamente lo que a nadie le importa." },
      { tipo: "parrafo", texto: "Probá esto: escribí en un renglón qué va a poder hacer tu comprador el martes que viene que hoy no puede hacer. Si no te sale, todavía no tenés el producto, tenés el archivo." },
      { tipo: "subtitulo", texto: "Las tres preguntas antes de escribir una línea" },
      { tipo: "vineta", texto: "¿Qué problema concreto resuelve, dicho como lo diría quien lo tiene?" },
      { tipo: "vineta", texto: "¿Cuánto tarda en resolverlo con esto, y cuánto tardaba antes?" },
      { tipo: "vineta", texto: "¿Qué se lleva puesto: una plantilla, un método, una lista?" },
      { tipo: "aviso", texto: "Si tu respuesta a las tres es la misma frase, tenés un solo producto. Si son tres respuestas distintas, tenés tres, y conviene separarlos." },
      { tipo: "parrafo", texto: "Esto no es un ejercicio de marketing: es lo que después va a leer quien decide si te compra o cierra la pestaña, y va a decidirlo en menos de diez segundos." },
    ],
  },
  {
    titulo: "El precio no se calcula, se prueba",
    bloques: [
      { tipo: "parrafo", texto: "La cuenta de \"cuánto me costó hacerlo\" no sirve para nada acá: hacerlo te costó una vez y lo vas a vender mil. Lo único que importa es cuánto vale para quien lo compra, y eso no lo sabés hasta que alguien lo paga." },
      { tipo: "parrafo", texto: "Empezá por un número que te dé un poco de vergüenza pedir. Casi siempre está bien. Si vendés tres seguidos sin que nadie pregunte nada, está barato." },
      { tipo: "vineta", texto: "Menos de $5.000: se compra sin pensar, pero también se abandona sin pensar." },
      { tipo: "vineta", texto: "Entre $5.000 y $20.000: la mayoría de los productos digitales que funcionan." },
      { tipo: "vineta", texto: "Más que eso: necesitás una página de venta que trabaje, no un botón." },
      { tipo: "aviso", texto: "No arranques con descuento. El precio con el que salís es el que la gente recuerda, y bajarlo después es fácil; subirlo, no." },
    ],
  },
  {
    titulo: "Escribir la página de venta sin dar vueltas",
    bloques: [
      { tipo: "parrafo", texto: "Una página de venta tiene un solo trabajo: que quien llegó por curiosidad entienda en el primer pantallazo si esto es para él. Todo lo demás —la historia, los testimonios, la garantía— sirve para el que ya dijo que sí y busca una excusa para confirmarlo." },
      { tipo: "subtitulo", texto: "El orden que funciona" },
      { tipo: "parrafo", texto: "Arriba, qué es y para quién. Abajo, qué se lleva. Más abajo, quién sos vos. Al final, el precio y el botón. Ese orden no es un gusto: es el orden en que la cabeza de quien lee hace las preguntas." },
      { tipo: "vineta", texto: "Nada de \"bienvenido a mi página\"." },
      { tipo: "vineta", texto: "Nada de explicar qué es un ebook." },
      { tipo: "vineta", texto: "El botón, repetido tres veces: arriba, en el medio y al final." },
    ],
  },
  {
    titulo: "Los primeros diez compradores",
    bloques: [
      { tipo: "parrafo", texto: "Los primeros diez no llegan de la publicidad. Llegan de gente que ya te conoce, y ése es el trabajo más incómodo y el más rentable: escribirle de a uno a quince personas que sabés que tienen ese problema." },
      { tipo: "parrafo", texto: "No les vendas. Contales qué hiciste y preguntales si les sirve. La mitad te va a decir que no, y de esa mitad vas a sacar las tres frases que te faltaban para la página de venta." },
      { tipo: "aviso", texto: "Guardá lo que te contestan, tal cual, con sus palabras. Eso es el texto de tu página; no hay nada que puedas inventar que funcione mejor." },
      { tipo: "parrafo", texto: "Recién con esos diez tenés algo que vale la pena mostrarle a desconocidos, porque ya sabés qué preguntan antes de comprar." },
    ],
  },
  {
    titulo: "El bono que hace que digan que sí",
    bloques: [
      { tipo: "parrafo", texto: "Un bono no es un regalo: es lo que saca la última duda. Si el producto principal enseña a hacer algo, el bono es lo que ahorra el trabajo de hacerlo: la plantilla, la lista, el archivo ya armado." },
      { tipo: "vineta", texto: "Tiene que complementar, no repetir." },
      { tipo: "vineta", texto: "Tiene que ser chico: si es más grande que el principal, algo está al revés." },
      { tipo: "vineta", texto: "Tiene que poder explicarse en un renglón." },
      { tipo: "parrafo", texto: "Y va nombrado en la página, con su propio título, como si tuviera precio. Un bono que aparece como \"y además material extra\" no convence a nadie de nada." },
    ],
  },
  {
    titulo: "Qué hacer la semana después de la primera venta",
    bloques: [
      { tipo: "parrafo", texto: "La primera venta demuestra una sola cosa: que el problema existe y que alguien paga por resolverlo. No demuestra que el precio esté bien ni que la página funcione, porque una venta no es una muestra." },
      { tipo: "subtitulo", texto: "Lo que sí conviene hacer" },
      { tipo: "vineta", texto: "Escribirle a quien compró a los tres días y preguntarle si lo usó." },
      { tipo: "vineta", texto: "Anotar qué le costó entender, y arreglar eso en el producto." },
      { tipo: "vineta", texto: "Recién ahí, pensar en el segundo producto." },
      { tipo: "aviso", texto: "El error clásico es sacar el segundo producto antes de haber arreglado el primero. Duplica el trabajo y no duplica nada más." },
      { tipo: "parrafo", texto: "El negocio no es el producto: es el circuito que lleva a alguien de no conocerte a comprarte. El producto es una pieza, y casi nunca es la que está rota." },
    ],
  },
];

/**
 * Con qué se busca la foto de cada capítulo, en el mismo orden.
 *
 * Son frases que describen UNA ESCENA, no el título del capítulo: es lo que le
 * pedimos al modelo y es lo que hace la diferencia en el banco de imágenes.
 * Buscando por título, "Primeros pasos para arrancar esta semana" trajo una
 * guitarra acústica. Ver `CapituloPlaneado.foto`.
 */
export const FOTOS_DE_EJEMPLO: string[] = [
  "escritorio con anotador y birome, luz de mañana",
  "manos contando billetes sobre una mesa de madera",
  "pantalla de computadora con una página web abierta",
  "dos personas conversando en un café",
  "caja de regalo abierta con papel de seda",
  "calendario de pared con días marcados",
];
