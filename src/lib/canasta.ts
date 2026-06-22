import { Preference } from "mercadopago";
import { platformClient } from "@/lib/mp";

// La meta de una campaña nunca es un valor fijo guardado: siempre se
// recalcula a partir de los precios actuales de los productos + el % de
// reserva. Centralizado acá para que el tope de donación, el progreso
// público y el clonado de campaña usen siempre el mismo número.
export function calculateGoalAmount(products: { targetPrice: number }[], reservePct: number) {
  const productsTotal = products.reduce((sum, p) => sum + p.targetPrice, 0);
  return Math.round(productsTotal / (1 - reservePct / 100));
}

export const MIN_DONATION = 1000;
// Tope por persona para que la campaña sea un aporte colectivo y no la
// financie una sola persona.
export const MAX_DONATION_PCT_OF_GOAL = 0.2;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Crea la preferencia de Checkout Pro para una donación ya existente
// (PENDING). Reusado tanto por el formulario standalone (/canasta/donar)
// como por el toggle de donación dentro del checkout de una tienda — en los
// dos casos la plata va siempre a la cuenta de la plataforma, nunca a la
// tienda.
export async function createDonationCheckout(donation: { id: string; amount: number }, campaignName: string) {
  const client = platformClient();
  const preference = new Preference(client);
  const pref = await preference.create({
    body: {
      items: [
        {
          id: donation.id,
          title: `Donación a ${campaignName}`,
          unit_price: donation.amount,
          quantity: 1,
          currency_id: "ARS",
        },
      ],
      external_reference: donation.id,
      back_urls: {
        success: `${APP_URL}/comunidad/campana?donacion=ok`,
        failure: `${APP_URL}/comunidad/campana?donacion=error`,
        pending: `${APP_URL}/comunidad/campana?donacion=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/canasta/webhook`,
      metadata: { donationId: donation.id },
    },
  });
  return process.env.NODE_ENV === "production" ? pref.init_point : pref.sandbox_init_point;
}
