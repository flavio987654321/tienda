import type { ProductoEnPantalla } from "./ProductosClient";

/**
 * Un producto de mentira, con su ebook ya escrito, para ver cómo queda.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SÓLO EN DESARROLLO, Y NO TOCA LA BASE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Existe por un problema concreto: para ver la tarjeta de un producto con el
 * archivo listo hay que **tener uno**, y tenerlo cuesta una generación de IA
 * contra la base de PRODUCCIÓN. Y el otro camino era peor: meter un producto
 * falso en esa base, que queda ahí hasta que alguien se acuerde de borrarlo —ya
 * nos pasó con un upsell de demostración que sigue anotado como pendiente—.
 *
 * Así que el ejemplo está escrito acá, se dibuja arriba de la lista con la
 * MISMA tarjeta que los productos de verdad, y ninguno de sus botones le pega a
 * la base: quien lo dibuja le pasa acciones que no hacen nada.
 *
 * Se usa detrás de `process.env.NODE_ENV === "development"`, así que no viaja al
 * build. Ver dónde se dibuja, en `ProductosClient`.
 */
export const ID_DEL_EJEMPLO = "ejemplo-de-tarjeta";

export const PRODUCTO_DE_EJEMPLO: ProductoEnPantalla = {
  id: ID_DEL_EJEMPLO,
  name: "Vendé tu conocimiento: de la idea al primer cobro",
  description:
    "Cómo pasar de \"tengo algo para enseñar\" a la primera venta cobrada, sin público y sin publicidad. Seis capítulos con lo que hay que hacer cada semana.",
  price: 15000,
  comparePrice: 20000,
  rol: "PRINCIPAL",
  padreId: null,
  imagen: null,
  /* El estado que casi nunca se ve mientras se programa, y el que importa: con
     el archivo puesto aparecen la caja del archivo, el botón de bajarlo y el de
     corregir el texto. */
  tieneArchivo: true,
  archivoNombre: "Vendé tu conocimiento.pdf",
  archivoPeso: 2_310_144,
  publicado: false,
  ebook: {
    estado: "LISTO",
    titulo: "Vendé tu conocimiento: de la idea al primer cobro",
    opciones: { formato: "texto", estilo: "libro", tema: "claro", paleta: "", recetas: 20, laminas: 10 },
    capitulos: [
      { titulo: "Qué vendés en realidad, y por qué no es el archivo", listo: true },
      { titulo: "El precio no se calcula, se prueba", listo: true },
      { titulo: "Escribir la página de venta sin dar vueltas", listo: true },
      { titulo: "Los primeros diez compradores", listo: true },
      { titulo: "El bono que hace que digan que sí", listo: true },
      { titulo: "Qué hacer la semana después de la primera venta", listo: true },
    ],
    escritos: 6,
    total: 6,
    trabajando: false,
    error: null,
    reintentos: 0,
    /* En falso: el ejemplo muestra la tarjeta como sale cuando todo anduvo.
       Para mirar el aviso de "salió sin fotos", poner esto en `true`. */
    fotosAlTope: false,
  },
  /* Lo que habría contado para generarlo. Es lo que llena el formulario cuando
     se aprieta "Rehacerlo": sin esto, el ejemplo mostraría el formulario en
     blanco, que es justo lo que se arregló. */
  contado: {
    tema: "Cómo alguien que ya sabe hacer algo puede venderlo por internet sin público, sin publicidad y sin gastar en herramientas. Que se note qué hacer cada semana.",
    publico: "gente que recién arranca y no tiene lista de correos ni seguidores",
  },
  slugDigital: "ejemplo",
  dominioPropio: null,
  vendido: false,
};
