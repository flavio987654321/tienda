import { getCurrentUser } from "@/lib/auth-session";
import { medicionDeLaTienda } from "@/lib/medicion-digital";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import BotonVolver from "../BotonVolver";
import ConfiguracionClient from "./ConfiguracionClient";

/**
 * Configuración: lo del NEGOCIO.
 *
 * Lo de la persona —nombre, teléfono, contraseña— vive en Mi cuenta. La línea
 * entre las dos pantallas es "¿esto lo ve el comprador?": el logo sí, el
 * teléfono personal no.
 *
 * **No crea el espacio de la cuenta.** Igual que Productos, esta pantalla sólo
 * lee: la `Store` que le presta el motor se crea recién cuando se guarda algo
 * (ver `espacioDigital`). Entrar a mirar no tiene por qué dejar una tienda vacía
 * colgando.
 *
 * ⚠️ De Mercado Pago se leen SOLO las fechas y el identificador de vendedor.
 * `mpAccessToken` y `mpRefreshToken` no se seleccionan ni por casualidad: esto
 * es un componente de servidor que le pasa sus datos al del navegador, así que
 * todo lo que se lea acá termina viajando adentro del HTML.
 */
export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string; tab?: string }>;
}) {
  /* El resultado de volver de Mercado Pago viaja en la URL, y se lee ACÁ y no en
     el navegador: leerlo con un efecto obligaba a guardarlo en estado, o sea un
     segundo dibujo completo de la pantalla por un cartel que ya se sabía antes
     de dibujar el primero. Se compara contra los dos valores que existen, así
     que lo que venga escrito en la URL no llega a ningún lado. */
  const { mp, tab } = await searchParams;
  const avisoMp = mp === "connected" || mp === "error" ? mp : null;

  /* Con qué solapa abrir. Lo usan los primeros pasos del inicio, que llevan
     derecho a Pagos: el sentido de ese paso es dejar a la persona donde se hace
     la tarea, no en la puerta de Configuración para que la busque.
     Se compara contra la lista nuestra y nunca se pasa el texto crudo — una
     solapa inventada dibujaría una pantalla vacía. */
  const SOLAPAS = ["general", "pagos", "meta", "legales"] as const;
  const abrirEn = SOLAPAS.find((s) => s === tab) ?? null;

  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [sub, store] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
    prisma.store.findUnique({
      where: { ownerId: user.id },
      select: {
        id: true, name: true, slug: true, logo: true, mpConnectedAt: true,
        checkoutName: true, supportEmail: true, iaProducto: true, iaDescripcion: true,
        storeConfig: true, avisoMailVentas: true,
        /* Las politicas que publica quien vende. Ver TabLegales. */
        policyReturns: true, policyReturnsActive: true,
        policyTerms: true, policyTermsActive: true,
        policyPrivacy: true, policyPrivacyActive: true,
      },
    }),
  ]);

  const tier = (sub?.tier ?? "FREE") as TierDigital;

  /* Los IDs de medición viven adentro de `storeConfig`, que es un JSON. Un
     config roto no puede tumbar la pantalla entera: se lee lo que se puede y lo
     demás queda vacío. */
  const medicion = medicionDeLaTienda(store?.storeConfig);

  /* Cuántas páginas hay publicadas, para el aviso de cambiar la dirección: si
     hay links compartidos por ahí, cambiarla los rompe. Se cuenta acá y no se
     estima en la pantalla — un aviso con un número inventado no se cree. */
  const publicados = store
    ? await prisma.product.count({
        where: { storeId: store.id, rolDigital: "PRINCIPAL", isActive: true, deletedAt: null },
      })
    : 0;

  /* Y a que producto apunta el link de "ver como quedaron": la pagina legal
     cuelga del producto, no de la tienda -la tienda de una cuenta digital es
     invisible-. Se toma el primero que exista; con ninguno, no hay link, y el
     boton no se dibuja en vez de llevar a un 404. */
  const primerProducto = store
    ? await prisma.product.findFirst({
        where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    : null;

  const politicas = {
    devoluciones: { texto: store?.policyReturns ?? "", visible: store?.policyReturnsActive !== false },
    terminos: { texto: store?.policyTerms ?? "", visible: store?.policyTermsActive !== false },
    privacidad: { texto: store?.policyPrivacy ?? "", visible: store?.policyPrivacyActive !== false },
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Configuración</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Con qué cobrás y cómo te ve quien te compra.
        </p>
      </div>

      <ConfiguracionClient
        abrirEn={abrirEn}
        tier={tier}
        nombre={store?.name ?? ""}
        checkoutName={store?.checkoutName ?? ""}
        slug={store?.slug ?? ""}
        logo={store?.logo ?? null}
        supportEmail={store?.supportEmail ?? ""}
        avisoMailVentas={store?.avisoMailVentas ?? false}
        pixelId={medicion.pixelId}
        gaId={medicion.gaId}
        clarityId={medicion.clarityId}
        iaProducto={store?.iaProducto ?? ""}
        iaDescripcion={store?.iaDescripcion ?? ""}
        publicados={publicados}
        avisoMp={avisoMp}
        cobroConectado={Boolean(store?.mpConnectedAt)}
        conectadoEl={store?.mpConnectedAt ? store.mpConnectedAt.toISOString() : null}
        base={process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com"}
        politicas={politicas}
        hrefLegales={primerProducto ? `/p/${primerProducto.id}/legales` : null}
      />
    </div>
  );
}
