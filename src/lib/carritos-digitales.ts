import { prisma } from "@/lib/prisma";

/**
 * Los carritos abandonados de una cuenta digital.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ACÁ UN CARRITO ABANDONADO ES UNA ORDEN QUE NUNCA SE PAGÓ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Del lado de tiendas hay un modelo aparte —`AbandonedCart`— que se llena
 * mientras la persona mete cosas en el carrito, antes de ir a pagar. **Acá no
 * hace falta y sería peor.**
 *
 * En este ecosistema no hay carrito: se aprieta comprar, se escribe el correo y
 * se sale derecho a Mercado Pago. En ese momento ya existe una `Order` en
 * PENDING con el correo, el producto y el monto. O sea que el dato que del otro
 * lado hay que ir a juntar, acá ya está — y es **mejor dato**: no es alguien que
 * miró, es alguien que llegó hasta la pantalla de pago.
 *
 * Copiar el modelo de tiendas habría significado guardar dos veces lo mismo y
 * tener dos verdades que se pueden contradecir.
 *
 * ── Por qué no se muestra al instante ──────────────────────────────────────
 *
 * Porque una orden recién creada es alguien que **está pagando ahora**. Mostrarla
 * como "abandonada" es decirle al vendedor que perdió una venta que se está
 * cerrando en ese mismo momento, y peor todavía si algún día eso dispara un mail.
 *
 * ── ⚠️ Y por qué "pendiente" no siempre es "abandonado" ────────────────────
 *
 * Mercado Pago deja pagar en efectivo, en un kiosco, con un cupón que dura días.
 * Esa compra queda pendiente y **se va a pagar**. Tratarla como abandonada sería
 * escribirle "te olvidaste de pagar" a alguien que tiene el cupón en la mano.
 *
 * Por eso el webhook ahora anota el estado que manda Mercado Pago aunque no sea
 * aprobado, y acá se lo mira: una orden cuyo pago está EN CAMINO no es un
 * carrito abandonado, es una venta en curso. Se cuenta aparte.
 */

/** Antes de esto, la persona todavía puede estar en la pantalla de pago. */
export const MADURACION_MS = 60 * 60 * 1000;

/**
 * Estados que Mercado Pago manda cuando el pago no está aprobado pero tampoco
 * muerto: efectivo por pagar, revisión manual, débito en proceso.
 *
 * Se guardan en mayúscula, como el resto de `Payment.status`.
 */
export const PAGO_EN_CAMINO = ["PENDING_MP", "IN_PROCESS", "AUTHORIZED"] as const;

export type CarritoDigital = {
  ordenId: string;
  email: string;
  nombre: string | null;
  /** El celular que dejó en el checkout, si lo dejó. Es OPCIONAL allá. */
  telefono: string | null;
  /** Lo que iba a comprar: el principal primero. */
  productos: string[];
  total: number;
  /** Cuándo empezó la compra. */
  cuando: Date;
  /** El pago está en camino —efectivo, revisión— y no es un abandono. */
  enCamino: boolean;
  /** Ya se le mandó el recordatorio, y cuándo. */
  recordadoEl: Date | null;
};

export type CarritosDeLaCuenta = {
  /** Los abandonados de verdad, del más nuevo al más viejo. */
  carritos: CarritoDigital[];
  /** Cuánta plata quedó sin cobrar ahí adentro. */
  sinCobrar: number;
  /** Los que todavía se pueden pagar solos. No son un abandono. */
  enCamino: number;
};

/**
 * ⚠️ El `storeId` tiene que venir ya verificado como de esta persona: acá no se
 * comprueba nada. Es una función de datos, no una puerta.
 */
export async function carritosDeLaCuenta(
  storeId: string,
  ahora: Date = new Date(),
): Promise<CarritosDeLaCuenta> {
  const maduros = new Date(ahora.getTime() - MADURACION_MS);

  const filas = await prisma.order.findMany({
    where: { storeId, status: "PENDING", createdAt: { lt: maduros } },
    orderBy: { createdAt: "desc" },
    /* Un tope: una cuenta con mucho tráfico puede juntar miles, y esta pantalla
       existe para actuar sobre los últimos, no para ser un archivo histórico. */
    take: 200,
    select: {
      id: true, total: true, createdAt: true,
      recordatorioAt: true,
      telefonoDigital: true,
      buyer: { select: { email: true, name: true } },
      payment: { select: { status: true } },
      items: {
        select: {
          price: true,
          product: { select: { name: true, rolDigital: true } },
        },
      },
    },
  });

  const carritos: CarritoDigital[] = [];
  let sinCobrar = 0;
  let enCamino = 0;

  for (const o of filas) {
    const camino = (PAGO_EN_CAMINO as readonly string[]).includes(o.payment?.status ?? "");
    if (camino) { enCamino++; continue; }

    /* El principal primero: es el que la persona reconoce. Los bonos van en cero
       y no se nombran acá — quien mira quiere saber qué se perdió de vender. */
    const nombres = o.items
      .filter((i) => i.product.rolDigital !== "BONO")
      .sort((a, b) => (a.product.rolDigital === "PRINCIPAL" ? -1 : b.product.rolDigital === "PRINCIPAL" ? 1 : 0))
      .map((i) => i.product.name);

    carritos.push({
      ordenId: o.id,
      email: o.buyer.email ?? "",
      nombre: o.buyer.name,
      telefono: o.telefonoDigital,
      productos: nombres,
      total: o.total,
      cuando: o.createdAt,
      enCamino: false,
      recordadoEl: o.recordatorioAt,
    });
    sinCobrar += o.total;
  }

  return { carritos, sinCobrar, enCamino };
}

/**
 * Hace cuánto, en castellano.
 *
 * Se arma acá y no en el navegador: la lista la dibuja el servidor, y una hora
 * calculada en el cliente da distinta y React avisa que no coincide.
 */
export function haceCuanto(cuando: Date, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - cuando.getTime()) / 60_000);
  if (minutos < 90) return "hace un rato";
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "hace un mes" : `hace ${meses} meses`;
}
