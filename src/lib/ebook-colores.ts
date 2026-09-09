/**
 * Los colores del ebook, sin nada que los dibuje.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ SALIERON DE `ebook-pdf`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Porque ahora hay **dos** cosas que pintan el mismo ebook: el PDF, que lo
 * dibuja de verdad, y la vista previa del editor, que lo muestra mientras se
 * corrige. Y `ebook-pdf` importa pdfkit, o sea que no puede entrar en el
 * navegador: importarlo desde la pantalla arrastraría la biblioteca entera al
 * paquete que baja cada persona.
 *
 * La otra salida era escribir los colores otra vez en la pantalla. Eso es el
 * camino conocido a que la previa muestre un verde y el archivo salga con otro
 * —dos copias de una regla se desincronizan de a una, y la que queda vieja es
 * la que nadie mira—. Acá no hay copia: es el mismo cálculo para los dos.
 *
 * Adentro no se importa nada. Entran colores en texto y salen colores en texto.
 */

/**
 * Lo único que un ebook necesita de una `Paleta`.
 *
 * Se define acá y no se importa `Paleta` de `pagina-venta` a propósito: aquel
 * archivo es enorme y trae sus secciones, estilos y tipografías. Con estos
 * colores alcanza, y quien llama le pasa los que ya tiene.
 */
export type ColoresDeTapa = {
  /** El texto oscuro. */
  tinta: string;
  /** El color fuerte de la marca. */
  acento: string;
  /** El texto que va ARRIBA del acento. Viene con el contraste ya verificado. */
  sobreAcento: string;
  /** El tinte clarito, para los recuadros. */
  suave: string;
  /**
   * El acento para fondo oscuro, y su texto encima.
   *
   * ⚠️ Las paletas del proyecto YA TRAEN este par (`acentoOscuro` /
   * `sobreAcentoOscuro`) y está elegido a mano para el modo oscuro del panel.
   * Un color elegido por una persona le gana siempre al que calcula
   * `acentoQueSeVe`, que aclara a ciegas y puede sacar un pastel lavado.
   *
   * Opcionales porque la paleta de fábrica no los tiene. Sin ellos se cae al
   * cálculo, que para eso está.
   */
  acentoOscuro?: string;
  sobreAcentoOscuro?: string;
};

/** Cuando el producto todavía no tiene página de venta. Gris, sobrio, imprimible. */
export const TAPA_DE_FABRICA: ColoresDeTapa = {
  tinta: "#0f172a", acento: "#1e293b", sobreAcento: "#ffffff", suave: "#e9eaeb",
};

/**
 * Los colores del texto que va ENCIMA de una foto oscurecida.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ NO SALEN DE LA PALETA, Y POR ESO ESTÁN ACÁ Y NO ESCRITOS EN DOS LADOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Abajo hay un velo negro, no papel: el color de la marca desaparecería contra
 * él. Son tres blancos rotos, elegidos para que el título pegue y la promesa y
 * el nombre queden un escalón atrás sin dejar de leerse.
 *
 * Los usan **la tapa a sangre del PDF** (`tapaASangre`) y **la misma tapa en la
 * vista previa** (`TapaDeLaPrevia`). Escritos en los dos archivos, alcanzaba con
 * aclarar uno para que la previa mostrara un gris y el archivo saliera con otro
 * — que es exactamente lo que ya pasó con los colores de la hoja, y el motivo
 * por el que existe este archivo.
 */
export const SOBRE_LA_FOTO = {
  titulo: "#FFFFFF",
  promesa: "#E9E2D8",
  autor: "#CFC5B8",
} as const;

/** Contra qué se mide el acento cuando va sobre una foto oscurecida. */
const VELO = "#141210";

/**
 * El acento, corrido hasta que se vea sobre el velo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL ACENTO DE LA PALETA ESTÁ MEDIDO CONTRA PAPEL, NO CONTRA UN VELO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 09/09/26 la tapa a sangre salía sólo en tema oscuro, y ahí el acento
 * ya venía aclarado por `coloresDelEbook`. Con el molde `cartel` esa tapa sale
 * **también en tema claro**, y entonces el rótulo "GUÍA COMPLETA" y la rayita
 * quedan con un bordó de fondo claro encima de un velo casi negro: se pierden.
 *
 * Se descubrió mirando la portada generada, no leyendo el código: en la hoja se
 * ve enseguida y en el código no se ve nunca.
 */
export function acentoSobreLaFoto(t: ColoresDelEbook): string {
  return acentoQueSeVe(t.acento, t.sobreAcento, VELO).acento;
}

/** Claro es una hoja de papel; oscuro es una revista. Los dos con la marca. */
export type ModoDelEbook = "claro" | "oscuro";

/** El tema, ya resuelto: los seis colores con los que se pinta cada cosa. */
export type ColoresDelEbook = {
  modo: ModoDelEbook;
  fondo: string;
  tinta: string;
  /** El texto de segunda: bajadas, encabezados, créditos. */
  suave: string;
  /** El relleno de los recuadros. */
  caja: string;
  acento: string;
  sobreAcento: string;
};

function canales(hex: string): [number, number, number] {
  const limpio = hex.replace("#", "").trim();
  const corto = limpio.length === 3;
  const leer = (i: number) =>
    parseInt(corto ? limpio[i].repeat(2) : limpio.slice(i * 2, i * 2 + 2), 16) || 0;
  return [leer(0), leer(1), leer(2)];
}

function aHex(r: number, g: number, b: number): string {
  const dos = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${dos(r)}${dos(g)}${dos(b)}`;
}

/** La luminancia de la norma de accesibilidad. 0 es negro, 1 es blanco. */
function luz(hex: string): number {
  const [r, g, b] = canales(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cuánto se distinguen dos colores. 1 es indistinguible, 21 es negro sobre blanco. */
export function contraste(a: string, b: string): number {
  const la = luz(a);
  const lb = luz(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mezclar(a: string, b: string, cuanto: number): string {
  const [r1, g1, b1] = canales(a);
  const [r2, g2, b2] = canales(b);
  return aHex(r1 + (r2 - r1) * cuanto, g1 + (g2 - g1) * cuanto, b1 + (b2 - b1) * cuanto);
}

/**
 * El acento, corrido hasta que se vea contra el fondo de la hoja.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIN ESTO EL TEMA OSCURO PIERDE MEDIO EBOOK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las seis paletas están pensadas para una página de venta **de fondo claro**,
 * así que varias tienen un acento bien oscuro —un azul noche, un bordó—. Ese
 * mismo color sobre el fondo casi negro del tema oscuro desaparece: el número
 * del capítulo, las rayas y los títulos de los recuadros quedan invisibles en
 * un archivo que ya se vendió.
 *
 * Acá se lo aclara —o se lo oscurece, en el tema claro— hasta que se despegue
 * del fondo. Y si hubo que tocarlo, **el texto que va encima se recalcula**:
 * el `sobreAcento` de la paleta estaba verificado contra el acento original, y
 * ese par deja de valer apenas se corre el color.
 */
export function acentoQueSeVe(
  acento: string, sobreAcento: string, fondo: string,
): { acento: string; sobreAcento: string } {
  const hacia = luz(fondo) > 0.5 ? "#000000" : "#ffffff";
  let usado = acento;

  /* 3 es el escalón de la norma para texto grande y para lo que no es texto.
     Alcanza: el acento se usa en números grandes, rayas y franjas, nunca en un
     párrafo. */
  for (let paso = 0; paso < 12 && contraste(usado, fondo) < 3.2; paso++) {
    usado = mezclar(usado, hacia, 0.12);
  }

  if (usado === acento) return { acento, sobreAcento };

  /* Se corrió: el par de la paleta ya no aplica. Blanco o negro, el que se lea
     mejor sobre el color nuevo. */
  return {
    acento: usado,
    sobreAcento:
      contraste(usado, "#ffffff") >= contraste(usado, "#111111") ? "#ffffff" : "#111111",
  };
}

/**
 * Los colores con los que sale el ebook.
 *
 * ⚠️ Es lo que usan **el PDF y la vista previa**, y por eso vive acá. Si esto
 * cambia, cambian los dos juntos: no hay forma de que la previa muestre una
 * cosa y el archivo salga con otra.
 */
export function coloresDelEbook(
  paleta: ColoresDeTapa,
  modo: ModoDelEbook,
): ColoresDelEbook {
  if (modo === "oscuro") {
    const fondo = "#14120F";
    /* Primero el par que la paleta ya trae para fondo oscuro; el cálculo queda
       de red, por si ese par tampoco alcanzara contra este fondo o por si la
       paleta no lo tiene. */
    return {
      modo, fondo,
      tinta: "#F6F1E9",
      suave: "#B0A597",
      caja: "#211D18",
      ...acentoQueSeVe(
        paleta.acentoOscuro ?? paleta.acento,
        paleta.sobreAcentoOscuro ?? paleta.sobreAcento,
        fondo,
      ),
    };
  }

  /* Blanco cálido y no blanco puro: en pantalla el blanco puro deslumbra, y el
     papel de un libro nunca es blanco. */
  const fondo = "#FCFAF7";
  return {
    modo, fondo,
    tinta: paleta.tinta,
    suave: mezclar(paleta.tinta, fondo, 0.42),
    caja: paleta.suave,
    ...acentoQueSeVe(paleta.acento, paleta.sobreAcento, fondo),
  };
}
