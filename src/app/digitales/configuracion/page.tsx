import { getCurrentUser } from "@/lib/auth-session";
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
/** Los datos de transferencia que guarda `storeConfig`, o vacíos. */
function leerTransferencia(raw: string | null | undefined) {
  const vacio = { enabled: false, titular: "", cbu: "", alias: "", banco: "", instrucciones: "" };
  try {
    const c = JSON.parse(raw || "{}") as {
      paymentInfo?: { transferencia?: Record<string, unknown> };
    };
    const t = c.paymentInfo?.transferencia ?? {};
    const texto = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      enabled: Boolean(t.enabled),
      titular: texto(t.titular),
      cbu: texto(t.cbu),
      alias: texto(t.alias),
      banco: texto(t.banco),
      instrucciones: texto(t.instrucciones),
    };
  } catch {
    return vacio;
  }
}

/** Los tres IDs de medición que guarda `storeConfig`, o vacíos. */
function leerAnalytics(raw: string | null | undefined): { pixelId: string; gaId: string; clarityId: string } {
  try {
    const c = JSON.parse(raw || "{}") as { analytics?: Record<string, unknown> };
    const a = c.analytics ?? {};
    return {
      pixelId: typeof a.facebookPixelId === "string" ? a.facebookPixelId : "",
      gaId: typeof a.googleAnalyticsId === "string" ? a.googleAnalyticsId : "",
      clarityId: typeof a.clarityProjectId === "string" ? a.clarityProjectId : "",
    };
  } catch {
    return { pixelId: "", gaId: "", clarityId: "" };
  }
}

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  /* El resultado de volver de Mercado Pago viaja en la URL, y se lee ACÁ y no en
     el navegador: leerlo con un efecto obligaba a guardarlo en estado, o sea un
     segundo dibujo completo de la pantalla por un cartel que ya se sabía antes
     de dibujar el primero. Se compara contra los dos valores que existen, así
     que lo que venga escrito en la URL no llega a ningún lado. */
  const { mp } = await searchParams;
  const avisoMp = mp === "connected" || mp === "error" ? mp : null;

  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [sub, store] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
    prisma.store.findUnique({
      where: { ownerId: user.id },
      select: {
        id: true, name: true, slug: true, logo: true, mpConnectedAt: true,
        checkoutName: true, supportEmail: true, iaProducto: true, iaDescripcion: true,
        storeConfig: true,
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
  const medicion = leerAnalytics(store?.storeConfig);
  const transferencia = leerTransferencia(store?.storeConfig);

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
        tier={tier}
        nombre={store?.name ?? ""}
        checkoutName={store?.checkoutName ?? ""}
        slug={store?.slug ?? ""}
        logo={store?.logo ?? null}
        supportEmail={store?.supportEmail ?? ""}
        pixelId={medicion.pixelId}
        gaId={medicion.gaId}
        clarityId={medicion.clarityId}
        transferencia={transferencia}
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
