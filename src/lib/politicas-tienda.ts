/**
 * Las políticas legales de una tienda: cuáles hay, cómo se llaman, cuáles se
 * publican y cuánto texto se acepta.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 * Los mismos cuatro campos los escribían tres rutas distintas con tres reglas
 * distintas (`/api/pagos` cortaba en 2000, `/api/configuracion` no cortaba
 * nada, `/api/ajustes/politicas` tampoco y encima no la llamaba nadie), y los
 * leían catorce lugares: la página legal pública, el pie de cada uno de los
 * once templates, la ficha de producto y el mail de confirmación.
 *
 * De esa dispersión salieron dos bugs de verdad:
 *
 *  1. El interruptor "Visible / Oculta" del panel no hacía nada en la tienda.
 *     Las banderas `...Active` se respetaban SOLO en el mail. La página pública
 *     miraba nada más si había texto, así que el dueño apagaba "Términos y
 *     condiciones", el panel le decía "Oculta", y seguía visible para cualquiera.
 *
 *  2. Los pies de página listaban las tres políticas siempre, tuviera o no
 *     tuviera algo cargado. Una tienda recién hecha mostraba tres links que
 *     llevaban a "Esta tienda aún no publicó esta política".
 *
 * Acá vive la decisión una sola vez —`documentosPublicados`— y la usan todos.
 */

/** Las cuatro. El orden es el que se ve en las pestañas y en el pie. */
export const CLAVES_LEGALES = ["devoluciones", "envios", "terminos", "privacidad"] as const;
export type ClaveLegal = (typeof CLAVES_LEGALES)[number];

/**
 * La quinta solapa, que NO es un documento.
 *
 * El botón de arrepentimiento que exige la Resolución 424/2020 no es un texto
 * que la dueña escribe y decide si publicar: es un formulario, está siempre, y
 * no se puede apagar. Por eso vive fuera de `CLAVES_LEGALES` —esa lista es la
 * de las columnas de la base— y se suma aparte donde hace falta.
 *
 * ── Por qué acá y no en una ruta propia ──────────────────────────────────────
 *
 * Los pies de las once plantillas ya linkean a esta página, y **arman el link
 * ellos**: `/tienda/<slug>/politicas?tipo=<clave>`. Metiéndolo como una solapa
 * más, los once lo muestran sin tocar ni uno. Una ruta aparte habría obligado a
 * editar once archivos para agregar un link — once oportunidades de olvidarse de
 * uno, y ese uno sería una tienda sin botón, que es la que incumple.
 */
export const CLAVE_ARREPENTIMIENTO = "arrepentimiento";
export type ClaveDePagina = ClaveLegal | typeof CLAVE_ARREPENTIMIENTO;

/**
 * Cuánto texto se guarda por política.
 *
 * Eran 2000 y quedaban cortos: unos términos y condiciones de verdad —con
 * garantía, arrepentimiento, datos personales y jurisdicción— pasan los 2000
 * sin esfuerzo, y el que los estaba escribiendo se encontraba con el campo
 * frenado a mitad de una oración. 6000 entra cómodo y sigue siendo un tope:
 * el campo es texto de una persona, no un depósito.
 */
export const MAX_LARGO_POLITICA = 6000;

/**
 * Los campos tal como están en la tabla `Store`.
 *
 * Los nombres son los de Prisma a propósito: así una fila de la base entra acá
 * sin traducción y no hay un mapeo intermedio donde equivocarse.
 */
export type FilaPoliticas = {
  policyReturns?: string | null;
  policyShipping?: string | null;
  policyTerms?: string | null;
  policyPrivacy?: string | null;
  policyReturnsActive?: boolean | null;
  policyShippingActive?: boolean | null;
  policyTermsActive?: boolean | null;
  policyPrivacyActive?: boolean | null;
};

const CAMPO: Record<ClaveLegal, { texto: keyof FilaPoliticas; activa: keyof FilaPoliticas }> = {
  devoluciones: { texto: "policyReturns", activa: "policyReturnsActive" },
  envios: { texto: "policyShipping", activa: "policyShippingActive" },
  terminos: { texto: "policyTerms", activa: "policyTermsActive" },
  privacidad: { texto: "policyPrivacy", activa: "policyPrivacyActive" },
};

/**
 * Cómo se llama cada política.
 *
 * Para autos cambian dos: esa tienda no envía ni acepta devoluciones —la
 * operación se cierra en persona— así que llamarlas "Política de envíos" sería
 * prometerle al comprador algo que no existe. Los nombres son los mismos que
 * usa el panel, para que el dueño reconozca en su tienda lo que escribió.
 */
export function titulosLegales(esAutos: boolean): Record<ClaveDePagina, { corto: string; largo: string }> {
  return {
    // Se llama igual en todos los rubros: es el nombre que le puso la
    // resolución, y cambiárselo haría que no se reconozca.
    [CLAVE_ARREPENTIMIENTO]: { corto: "Arrepentimiento", largo: "Botón de arrepentimiento" },
    devoluciones: esAutos
      ? { corto: "Operación", largo: "Condiciones de la operación" }
      : { corto: "Devoluciones", largo: "Política de devoluciones y cambios" },
    envios: esAutos
      ? { corto: "Entrega", largo: "Cómo se coordina la entrega" }
      : { corto: "Envíos", largo: "Política de envíos" },
    terminos: { corto: "Términos", largo: "Términos y condiciones" },
    privacidad: { corto: "Privacidad", largo: "Política de privacidad" },
  };
}

/**
 * Qué políticas ve el público: las que tienen texto Y están activas.
 *
 * Las dos condiciones son distintas y las dos hacen falta. Sin texto no hay
 * nada que mostrar; apagada, el dueño decidió que no se muestre. Antes se
 * miraba solo la primera y la segunda no servía para nada.
 */
export function documentosPublicados(fila: FilaPoliticas | null | undefined): ClaveLegal[] {
  if (!fila) return [];
  return CLAVES_LEGALES.filter((clave) => {
    const texto = fila[CAMPO[clave].texto];
    if (typeof texto !== "string" || texto.trim().length === 0) return false;
    // `false` apaga; `null`/`undefined` no. Una tienda vieja que nunca tocó la
    // bandera tiene el default `true` de la base, pero si la fila llega de una
    // query que no seleccionó la columna, no hay que apagarle la política.
    return fila[CAMPO[clave].activa] !== false;
  });
}

/** El texto de una política puntual, o null si esa no se publica. */
export function textoPublicado(fila: FilaPoliticas | null | undefined, clave: ClaveLegal): string | null {
  if (!fila || !documentosPublicados(fila).includes(clave)) return null;
  const texto = fila[CAMPO[clave].texto];
  return typeof texto === "string" ? texto : null;
}

/**
 * Deja el texto listo para guardar.
 *
 * Se corta ANTES del trim, no después: al revés, un texto de puros espacios al
 * final se recortaba a 6000 con espacios adentro del tope y ocupaba lugar de
 * texto real. Los `\r` de Windows se normalizan porque el mismo texto se
 * renderiza partido por `\n` en la página pública.
 */
export function limpiarTextoLegal(crudo: unknown, max = MAX_LARGO_POLITICA): string {
  if (typeof crudo !== "string") return "";
  return crudo.replace(/\r\n?/g, "\n").slice(0, max).trim();
}

/**
 * Los links del pie de la tienda.
 *
 * En el editor se muestran las cuatro aunque estén vacías —el dueño tiene que
 * poder ver dónde van a caer— y en la tienda pública solo las publicadas. Es el
 * mismo criterio que ya usaban los íconos de redes sociales en esos mismos
 * pies: `if (!fromEditor && !url) return null`.
 */
export function linksLegales(
  slug: string | undefined,
  publicadas: ClaveLegal[] | undefined,
  opciones: { esAutos?: boolean; enEditor?: boolean; cortos?: boolean } = {}
): { clave: ClaveDePagina; label: string; href: string }[] {
  const titulos = titulosLegales(!!opciones.esAutos);
  /* El arrepentimiento va SIEMPRE y va último. Siempre, porque no depende de que
     la dueña haya escrito nada —es un formulario, no un texto— y porque la
     resolución no lo hace opcional. Último, porque los otros cuatro son lo que
     alguien viene a leer antes de comprar y este es lo que viene a usar después. */
  const visibles: ClaveDePagina[] = [
    ...(opciones.enEditor ? [...CLAVES_LEGALES] : (publicadas ?? [])),
    CLAVE_ARREPENTIMIENTO,
  ];
  return visibles.map((clave) => ({
    clave,
    // Algunos pies son de una sola línea y no entran cuatro nombres largos.
    label: opciones.cortos ? titulos[clave].corto : titulos[clave].largo,
    href: `/tienda/${slug ?? ""}/politicas?tipo=${clave}`,
  }));
}
