/**
 * Genera el texto de las 3 políticas legales de una tienda combinando cláusulas
 * fijas (exigidas por la ley argentina, iguales para cualquier rubro) con las
 * respuestas del wizard de /dashboard/pagos. No usa IA: el contenido legal
 * nunca queda a criterio de un modelo, solo se completan variables en un texto
 * que ya está redactado.
 */

export type LegalWizardAnswers = {
  shipsNationwide: boolean;
  avgDeliveryDays: string;
  extraReturnDays: number;
  cancellationFeePercent: number;
};

export type LegalStoreInfo = {
  name: string;
  contact: string;
};

/* ── Los topes de los campos numéricos ─────────────────────────────────────────
 *
 * Los dos inputs del asistente se clampeaban solo por abajo (`Math.max(0, …)`),
 * y el `max={100}` del input no frena nada cuando alguien tipea. O sea que se
 * podía generar "te damos un total de 100000009 días corridos" o "un cargo
 * administrativo del 5000%" — y eso quedaba escrito como la política legal de
 * la tienda, que es exactamente el documento donde un número absurdo hace daño.
 *
 * Un año de plazo de devolución ya es tres veces más de lo que da cualquier
 * tienda grande, y un cargo por cancelar no puede pasar del 100% de la compra
 * porque entonces el comprador estaría pagando por no comprar.
 */
export const MAX_DIAS_EXTRA_DEVOLUCION = 365;
export const MAX_PORCENTAJE_CANCELACION = 100;
/** El texto libre del asistente entra en la política; se corta antes, no después. */
export const MAX_LARGO_DEMORA = 40;

export function acotarDiasExtra(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(MAX_DIAS_EXTRA_DEVOLUCION, Math.max(0, Math.floor(valor)));
}

export function acotarPorcentaje(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(MAX_PORCENTAJE_CANCELACION, Math.max(0, Math.floor(valor)));
}

/**
 * "por WhatsApp (11 5555-5555) o por email" / "por email".
 *
 * Antes cada cláusula lo armaba sola con
 * `escribinos${contact ? " por WhatsApp (…)" : ""} o por email`, y la tienda que
 * no tiene WhatsApp cargado terminaba con **"Escribinos o por email"** — una
 * frase rota, en la oración donde se le explica al comprador cómo ejercer sus
 * derechos. Salió al revisar el texto real de una tienda, no en los chequeos:
 * los de entonces miraban que no quedara un paréntesis vacío, no cómo se leía.
 */
export function porDondeEscribir(contacto: string): string {
  const limpio = contacto.trim();
  return limpio ? `por WhatsApp (${limpio}) o por email` : "por email";
}

export function generatePolicyShipping(store: LegalStoreInfo, answers: LegalWizardAnswers): string {
  const blocks: string[] = [];

  if (answers.shipsNationwide) {
    const demora = (answers.avgDeliveryDays || "").trim().slice(0, MAX_LARGO_DEMORA) || "3 a 7";
    blocks.push(
      `Realizamos envíos a todo el país. El tiempo estimado de entrega es de ${demora} días hábiles desde la confirmación del pago.`
    );
  } else {
    blocks.push(
      `La entrega de los productos es en persona, coordinando lugar y horario por WhatsApp${store.contact ? ` (${store.contact})` : ""}. No realizamos envíos por correo.`
    );
  }

  blocks.push(
    "El costo y la disponibilidad de cada método de envío se muestran en el checkout antes de confirmar la compra."
  );

  return blocks.join("\n\n");
}

export function generatePolicyReturns(store: LegalStoreInfo, answers: LegalWizardAnswers): string {
  const totalDays = 10 + acotarDiasExtra(answers.extraReturnDays);
  const blocks: string[] = [];

  blocks.push(
    `Tenés derecho a cancelar tu compra sin necesidad de justificar el motivo dentro de los 10 días corridos desde que recibís el producto (derecho de arrepentimiento, Ley 24.240 art. 34). Para ejercerlo, escribinos ${porDondeEscribir(store.contact)} indicando tu número de pedido.`
  );

  if (acotarDiasExtra(answers.extraReturnDays) > 0) {
    blocks.push(
      `Además del mínimo legal, en ${store.name || "nuestra tienda"} te damos un total de ${totalDays} días corridos desde la entrega para solicitar un cambio o devolución.`
    );
  } else {
    blocks.push(
      "Fuera del plazo legal de 10 días no se aceptan cambios ni devoluciones, salvo lo indicado en la garantía legal."
    );
  }

  blocks.push(
    "Todos los productos cuentan con garantía legal: 6 meses si son nuevos, 3 meses si son usados, contados desde la entrega (Ley 24.240)."
  );

  blocks.push(
    "El producto a devolver debe estar en las mismas condiciones en que fue entregado, sin uso, con sus etiquetas y embalaje original, salvo que la devolución se deba a un defecto de fabricación o a un error nuestro en el envío."
  );

  return blocks.join("\n\n");
}

export function generatePolicyTerms(store: LegalStoreInfo, answers: LegalWizardAnswers): string {
  const blocks: string[] = [];

  blocks.push(
    `Al confirmar una compra en ${store.name || "nuestra tienda"} aceptás estos términos y condiciones en su totalidad.`
  );

  blocks.push(
    "Los precios se publican en pesos argentinos e incluyen los impuestos correspondientes. Nos reservamos el derecho de modificarlos sin previo aviso, sin afectar compras ya confirmadas."
  );

  blocks.push(
    "Tus datos personales se utilizan exclusivamente para gestionar tu pedido, conforme a la Ley 25.326 de Protección de Datos Personales."
  );

  const cargo = acotarPorcentaje(answers.cancellationFeePercent);
  if (cargo > 0) {
    blocks.push(
      `Si cancelás un pedido luego de haber sido confirmado, podemos aplicar un cargo administrativo del ${cargo}% del valor de la compra.`
    );
  } else {
    blocks.push(
      "Podés cancelar un pedido confirmado sin cargo, salvo que ya haya sido despachado."
    );
  }

  blocks.push(
    "Cualquier disputa derivada de una compra en esta tienda se resuelve conforme a la legislación vigente en la República Argentina, sin perjuicio de tus derechos como consumidor."
  );

  return blocks.join("\n\n");
}

/* ── Política de privacidad ────────────────────────────────────────────────────
 *
 * Esta no sale de preguntas: sale de lo que la tienda YA tiene configurado.
 *
 * Preguntarle al dueño "¿usás Meta Pixel?" es pedirle que se acuerde de algo
 * que el sistema sabe con certeza — y si se equivoca, la política declara un
 * tracker que no existe, o peor, calla uno que sí está corriendo. Los hechos se
 * leen de la configuración real y el texto se arma solo.
 *
 * Lo que se declara acá tiene que coincidir con lo que la plataforma dice de sí
 * misma en /privacidad. Si esas dos páginas se contradicen, la que queda mal
 * parada es TiendaApps.
 */
export type HechosPrivacidad = {
  /** El dueño cargó su propio Google Analytics para esta tienda. */
  usaAnalytics: boolean;
  /** El dueño cargó su propio Meta Pixel para esta tienda. */
  usaPixel: boolean;
  /** Cobra con MercadoPago (los datos del pago los procesa MP, no la tienda). */
  usaMercadoPago: boolean;
  /** Tiene el programa de afiliados prendido. */
  usaAfiliados: boolean;
  /** Tiendas de consulta: no hay checkout, los datos que llegan son de un lead. */
  esAutos: boolean;

  /* ── Datos que deja alguien que TODAVÍA NO COMPRÓ ──────────────────────────
   *
   * Los tres de abajo son la misma categoría que el carrito abandonado: la
   * tienda se queda con el contacto de una persona que no le compró nada, para
   * escribirle después. Es exactamente lo que la Ley 25.326 pide informar, y es
   * lo que más se olvida porque no se siente como "juntar datos" — se siente
   * como una ruleta, un formulario de novedades y una campanita.
   *
   * Ninguno aplica a Auto Motor / Auto Drive: esas tiendas no tienen ruleta
   * (`GAMIFICATION_EXCLUDED_TEMPLATES`) ni formulario de novedades
   * (`TEMPLATES_CON_NEWSLETTER`). Igual el generador los ignora si
   * `esAutos` es true, para que no dependa de que quien arme los hechos se
   * acuerde de la regla.
   */

  /** La ruleta/raspadita está activa Y pide el email antes de dejar jugar. */
  juegoConEmail: "ruleta" | "raspadita" | null;
  /** El template de la tienda dibuja el formulario de novedades. */
  tieneNewsletter: boolean;
  /** Premium: la gente puede seguir la tienda y recibir notificaciones push. */
  tienePushDeSeguidores: boolean;
};

export function generatePolicyPrivacy(store: LegalStoreInfo, hechos: HechosPrivacidad): string {
  const tienda = store.name || "esta tienda";
  const blocks: string[] = [];

  blocks.push(
    `En ${tienda} tratamos tus datos personales conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina. Esta política explica qué datos recibimos, para qué los usamos y cómo podés pedirnos que los borremos.`
  );

  blocks.push(
    hechos.esAutos
      ? "Qué datos recibimos: los que dejás al hacernos una consulta — nombre, email, teléfono y el mensaje que nos escribas. No pedimos ni recibimos datos de tarjetas: la operación se cierra en persona."
      : "Qué datos recibimos: los que cargás al comprar — nombre, email, teléfono y la dirección de entrega. Si dejás tus datos en el checkout y no llegás a confirmar la compra, guardamos ese contacto para poder escribirte una vez y recordarte el pedido que quedó a medias."
  );

  blocks.push(
    hechos.esAutos
      ? "Para qué los usamos: exclusivamente para responder tu consulta y coordinar la operación. No los vendemos ni los cedemos a terceros con fines publicitarios."
      : "Para qué los usamos: exclusivamente para preparar y entregarte tu pedido, avisarte de su estado y responder cualquier consulta sobre esa compra. No los vendemos ni los cedemos a terceros con fines publicitarios."
  );

  // Lo que se junta sin que la persona compre nada. En autos no existe ninguna
  // de las tres, así que ni se evalúan.
  if (!hechos.esAutos) {
    const sinComprar: string[] = [];
    if (hechos.tieneNewsletter) {
      sinComprar.push(
        "Si te suscribís a nuestras novedades, guardamos tu email para avisarte de productos nuevos y ofertas. Antes de mandarte nada te pedimos que confirmes la suscripción desde tu correo, y podés darte de baja desde el pie de cualquiera de esos emails."
      );
    }
    if (hechos.juegoConEmail) {
      sinComprar.push(
        `Si jugás a la ${hechos.juegoConEmail} para ganar un cupón, te pedimos el email para poder entregarte el código del premio.`
      );
    }
    if (hechos.tienePushDeSeguidores) {
      sinComprar.push(
        "Si activás las notificaciones de esta tienda en tu celular, guardamos que la seguís para poder avisarte de novedades. Podés dejar de seguirla cuando quieras desde la misma tienda o desde los ajustes de tu navegador."
      );
    }
    if (sinComprar.length > 0) {
      blocks.push(`Datos que podés dejarnos sin comprar:\n${sinComprar.map((t) => `- ${t}`).join("\n")}`);
    }
  }

  // Los terceros: solo se nombran los que de verdad están funcionando en esta
  // tienda. Una lista genérica "podemos compartir datos con proveedores" no
  // informa nada y es justamente lo que la ley pide evitar.
  const terceros: string[] = [
    "TiendaApps, la plataforma donde funciona esta tienda, que aloja los datos y envía los emails de confirmación (ver tiendaapps.com/privacidad).",
  ];
  if (hechos.usaMercadoPago) {
    terceros.push(
      "Mercado Pago, que procesa el pago. Los datos de tu tarjeta los recibe Mercado Pago directamente: nosotros nunca los vemos ni los guardamos."
    );
  }
  if (hechos.usaAnalytics) {
    terceros.push(
      "Google Analytics, que nos deja ver de forma estadística cómo se navega la tienda. Los datos que recibe Google se rigen por su propia política (policies.google.com/privacy)."
    );
  }
  if (hechos.usaPixel) {
    terceros.push(
      "Meta Pixel, que nos deja medir la publicidad de esta tienda en Facebook e Instagram. Los datos que recibe Meta se rigen por su propia política (facebook.com/privacy). Podés ajustar tus preferencias en facebook.com/adpreferences."
    );
  }
  if (hechos.usaAfiliados) {
    terceros.push(
      "Si llegaste por el link de una persona afiliada a esta tienda, registramos que la venta vino de ese link para liquidarle su comisión. Esa persona no accede a tus datos de contacto."
    );
  }
  blocks.push(`Con quién los compartimos:\n${terceros.map((t) => `- ${t}`).join("\n")}`);

  blocks.push(
    hechos.usaAnalytics || hechos.usaPixel
      ? "Cookies: además de las cookies necesarias para que funcione el carrito y tu sesión, esta tienda usa las herramientas de medición nombradas arriba, que instalan sus propias cookies. Podés bloquearlas desde la configuración de tu navegador; la tienda sigue funcionando igual."
      : "Cookies: esta tienda usa solo las cookies necesarias para que funcionen el carrito y tu sesión. No usamos cookies de publicidad ni de seguimiento de terceros."
  );

  // Decir "cuánto se guardan" y después callar el plazo de la mitad de los
  // datos que se nombraron arriba es peor que no decirlo: da por cerrado un
  // punto que quedó abierto.
  const plazos = [
    hechos.esAutos
      ? "los datos de una consulta se conservan mientras dure el trato y el plazo que exijan las obligaciones fiscales y contables"
      : "los datos de una compra se conservan mientras dure la relación comercial y el plazo que exigen las obligaciones fiscales y contables",
  ];
  if (!hechos.esAutos) {
    plazos.push("los contactos que quedaron sin concretar una compra se borran solos a los 45 días");
    if (hechos.tieneNewsletter) plazos.push("tu suscripción a las novedades queda hasta que te des de baja");
    if (hechos.tienePushDeSeguidores) plazos.push("dejamos de guardar que seguís la tienda apenas dejás de seguirla");
  }
  blocks.push(`Cuánto los guardamos: ${plazos.join("; ")}.`);

  blocks.push(
    `Tus derechos: podés pedirnos en cualquier momento acceder a tus datos, corregirlos o que los borremos, sin costo. Escribinos ${porDondeEscribir(store.contact)} y lo resolvemos. La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias de quienes vean afectado su derecho.`
  );

  return blocks.join("\n\n");
}

/**
 * Para tiendas de rubro AUTOS: no hay checkout ni envío real, la operación
 * se cierra en persona después de una consulta. Las cláusulas evitan afirmar
 * que es una "venta a distancia" (no lo es) y se centran en lo que sí aplica:
 * cómo se coordina la entrega y las condiciones de una reserva/seña.
 */
export type LegalWizardAnswersAutos = {
  hasWarranty: boolean;
  requiresDeposit: boolean;
  depositRefundable: boolean;
};

export function generatePolicyDeliveryAutos(store: LegalStoreInfo, _answers: LegalWizardAnswersAutos): string {
  const blocks: string[] = [];

  blocks.push(
    `La entrega del vehículo se coordina en persona${store.contact ? ` por WhatsApp (${store.contact})` : ""}, una vez que ambas partes acuerdan los detalles de la operación.`
  );

  blocks.push(
    "Antes de cerrar la operación te recomendamos verificar la documentación del vehículo (título, cédula, deudas, infracciones) y, si es posible, hacer una revisión mecánica independiente."
  );

  return blocks.join("\n\n");
}

export function generatePolicyOperationAutos(store: LegalStoreInfo, answers: LegalWizardAnswersAutos): string {
  const blocks: string[] = [];

  if (answers.requiresDeposit) {
    blocks.push(
      answers.depositRefundable
        ? "Para reservar el vehículo podemos solicitar una seña. Si la operación no se concreta por motivos ajenos a quien reserva, la seña se devuelve en su totalidad."
        : "Para reservar el vehículo podemos solicitar una seña. La seña no es reembolsable si quien reserva decide no continuar con la compra."
    );
  } else {
    blocks.push(
      "No solicitamos seña para reservar un vehículo: la operación se concreta cuando ambas partes acuerdan el pago total."
    );
  }

  blocks.push(
    answers.hasWarranty
      ? `Los vehículos de ${store.name || "esta tienda"} pueden tener garantía vigente. Consultá las condiciones específicas de cada unidad antes de confirmar la compra.`
      : "Los vehículos se venden en el estado en que se exhiben, sin garantía adicional más allá de la que pueda ofrecer el fabricante o un seguro vigente, si corresponde."
  );

  blocks.push(
    "Te recomendamos revisar el vehículo en persona y confirmar el estado de la documentación antes de pagar cualquier monto."
  );

  return blocks.join("\n\n");
}

export function generatePolicyTermsAutos(store: LegalStoreInfo, _answers: LegalWizardAnswersAutos): string {
  const blocks: string[] = [];

  blocks.push(
    `Al iniciar una consulta o reserva en ${store.name || "esta tienda"} aceptás estos términos.`
  );

  blocks.push(
    "Toda la información del vehículo (kilometraje, estado, documentación) es la declarada por quien lo publica. Te recomendamos verificarla en persona antes de pagar cualquier monto."
  );

  blocks.push(
    "Tus datos personales se usan exclusivamente para gestionar tu consulta, conforme a la Ley 25.326 de Protección de Datos Personales."
  );

  blocks.push(
    "Esta operación se concreta de forma presencial, después de un contacto inicial por WhatsApp — no es una venta a distancia con pago online a través de la plataforma."
  );

  blocks.push(
    "Cualquier disputa derivada de esta operación se resuelve conforme a la legislación vigente en la República Argentina, sin perjuicio de tus derechos como consumidor."
  );

  return blocks.join("\n\n");
}
