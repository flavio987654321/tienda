import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import { CLAVE_ARREPENTIMIENTO, type ClaveLegal } from "@/lib/politicas-tienda";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES: las respuestas, armadas con los datos de la tienda
   ══════════════════════════════════════════════════════════════════════════

   Nació en Aurora (`aurora/PreguntasAurora`) y ahora la usan todos los
   templates de moda. Acá vive SOLO lo que se dice; cómo se ve lo dibuja cada
   template a su manera (Flavio, 04/10/26: "obvio que cada uno con su estilo").

   Las respuestas NO se escriben dos veces: salen de lo que la tienda ya cargó
   —sus envíos con sus precios, Mercado Pago, transferencia, efectivo, las
   políticas que publicó—. Así no se contradicen con el checkout. Y nunca
   prometen algo que la tienda no cargó: sin política de cambios publicada, la
   respuesta manda a consultar en vez de inventar un plazo.

   La dueña igual puede reescribir cualquier pregunta o respuesta en el editor
   (campos `faqP1`…`faqR5`, los mismos en todos los templates, así lo que
   escribió la sigue si cambia de diseño). */

export type TemaPregunta = "envios" | "pagos" | "cambios" | "talles" | "contacto";

export type PreguntaFrecuente = {
  tema: TemaPregunta;
  p: string;
  r: string;
  /** Las políticas a las que manda, con el texto del link. */
  politicas: { tipo: string; texto: string }[];
  /** Si lleva el "Ir a contacto →". */
  contacto: boolean;
};

export function armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp }: {
  envios: ShippingMethod[] | null | undefined;
  mercadoPago: boolean;
  pagos: StorePaymentInfo | undefined;
  legales: ClaveLegal[] | undefined;
  fmt: (n: number) => string;
  /** Si el botón de WhatsApp está prendido: la respuesta de contacto lo nombra. */
  conWhatsapp: boolean;
}): PreguntaFrecuente[] {
  const activos = (envios ?? []).filter(m => m.enabled);
  const precioEnvio = (m: ShippingMethod) =>
    m.liveQuote ? "se calcula con tu código postal" : m.coordinar ? "a coordinar" : m.price > 0 ? fmt(m.price) : "sin cargo";
  const rEnvios = activos.length
    ? `Podés elegir entre: ${activos.map(m => `${m.label} (${precioEnvio(m)})`).join(", ")}. Lo elegís al finalizar la compra.`
    : "Coordinamos la entrega con vos después de la compra.";

  const medios = [
    mercadoPago && "Mercado Pago (tarjeta de crédito, débito o dinero en cuenta)",
    pagos?.transferencia?.enabled && "transferencia bancaria",
    pagos?.efectivo?.enabled && "efectivo",
  ].filter((x): x is string => !!x);
  const rPagos = medios.length
    ? `Aceptamos ${medios.length > 1 ? medios.slice(0, -1).join(", ") + " y " + medios[medios.length - 1] : medios[0]}.`
    : "Al confirmar tu pedido te pasamos los medios de pago disponibles.";

  const hayCambios = !!legales?.includes("devoluciones");
  const rCambios = (hayCambios
    ? "Sí. Las condiciones están en nuestra política de cambios y devoluciones."
    : "Escribinos y te contamos cómo hacerlo.")
    + " Además, por ley tenés 10 días desde que lo recibís para arrepentirte de una compra online.";

  return [
    { tema: "envios", p: "¿Cómo me llega el pedido?", r: rEnvios, contacto: false,
      politicas: legales?.includes("envios") ? [{ tipo: "envios", texto: "Política de envíos" }] : [] },
    { tema: "pagos", p: "¿Cómo puedo pagar?", r: rPagos, contacto: false, politicas: [] },
    { tema: "cambios", p: "¿Puedo cambiar o devolver?", r: rCambios, contacto: false,
      politicas: [
        ...(hayCambios ? [{ tipo: "devoluciones", texto: "Cambios y devoluciones" }] : []),
        { tipo: CLAVE_ARREPENTIMIENTO, texto: "Botón de arrepentimiento" },
      ] },
    { tema: "talles", p: "¿Cómo sé cuál es mi talle?", contacto: false, politicas: [],
      r: "En cada producto ves los talles que hay. Si tenés dudas entre dos, escribinos y te ayudamos a elegir." },
    { tema: "contacto", p: "¿Cómo me comunico con ustedes?", contacto: true, politicas: [],
      r: conWhatsapp ? "Por WhatsApp, con el botón verde de abajo, o desde la página de contacto." : "Desde la página de contacto: dejanos tu mensaje y te escribimos." },
  ];
}

/** La dirección de una política de la tienda. */
export const rutaPolitica = (slug: string | undefined, tipo: string) => `/tienda/${slug ?? ""}/politicas?tipo=${tipo}`;
