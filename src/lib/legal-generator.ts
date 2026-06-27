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

export function generatePolicyShipping(store: LegalStoreInfo, answers: LegalWizardAnswers): string {
  const blocks: string[] = [];

  if (answers.shipsNationwide) {
    blocks.push(
      `Realizamos envíos a todo el país. El tiempo estimado de entrega es de ${answers.avgDeliveryDays || "3 a 7"} días hábiles desde la confirmación del pago.`
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
  const totalDays = 10 + Math.max(0, answers.extraReturnDays);
  const blocks: string[] = [];

  blocks.push(
    `Tenés derecho a cancelar tu compra sin necesidad de justificar el motivo dentro de los 10 días corridos desde que recibís el producto (derecho de arrepentimiento, Ley 24.240 art. 34). Para ejercerlo, escribinos${store.contact ? ` por WhatsApp (${store.contact})` : ""} o por email indicando tu número de pedido.`
  );

  if (answers.extraReturnDays > 0) {
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

  if (answers.cancellationFeePercent > 0) {
    blocks.push(
      `Si cancelás un pedido luego de haber sido confirmado, podemos aplicar un cargo administrativo del ${answers.cancellationFeePercent}% del valor de la compra.`
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
