import { Preference } from "mercadopago";
import { platformClient } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * Crea la preferencia de Checkout Pro para una donación ya existente (PENDING).
 * Reusado tanto por el formulario standalone (/canasta/donar) como por el toggle
 * de donación dentro del checkout de una tienda — en los dos casos la plata va
 * siempre a la cuenta de la plataforma, nunca a la tienda.
 *
 * Vive separado de lib/canasta a propósito: esto arrastra el SDK de MercadoPago,
 * y las constantes de canasta (mínimo, tope por persona, cálculo de la meta) las
 * necesitan también las pantallas del navegador. Con todo en el mismo archivo,
 * el formulario de donación no podía importarlas sin llevarse el SDK al bundle,
 * y por eso terminaban copiadas a mano.
 */
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
