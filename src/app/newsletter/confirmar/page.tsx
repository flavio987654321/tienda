import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Marco } from "../Marco";
import { AccionNewsletter } from "../AccionNewsletter";

// Un mail viejo no puede mostrar una respuesta cacheada de otro: cada token es
// de una persona distinta.
export const dynamic = "force-dynamic";

// `noindex` porque estas URLs llevan un token en la query. Indexadas, Google
// publicaría links que confirman la suscripción de alguien.
export const metadata: Metadata = {
  title: "Confirmar suscripción",
  robots: { index: false, follow: false },
};

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  // Sólo se LEE. Confirmar es cosa del botón: ver el comentario del endpoint.
  const suscriptor = token
    ? await prisma.newsletterSubscriber.findUnique({
        where: { token },
        select: { confirmed: true, email: true, store: { select: { name: true } } },
      })
    : null;

  if (!suscriptor) {
    return (
      <Marco>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 12 }}>🔗</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>Este link ya no sirve</h1>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
            Puede que hayas pedido el alta de nuevo —en ese caso vale el mail más reciente— o que la
            suscripción ya no exista. Podés volver a suscribirte desde la tienda.
          </p>
        </div>
      </Marco>
    );
  }

  const tienda = suscriptor.store.name;

  if (suscriptor.confirmed) {
    return (
      <Marco tienda={tienda}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Ya estabas suscripto
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
            No hace falta que hagas nada más. Vas a recibir las novedades de {tienda} en {suscriptor.email}.
          </p>
        </div>
      </Marco>
    );
  }

  return (
    <Marco tienda={tienda}>
      <AccionNewsletter
        token={token}
        endpoint="/api/newsletter/confirmar"
        boton="Sí, confirmo mi suscripción"
        botonCargando="Confirmando…"
        exito="¡Listo!"
        detalleExito={`Ya estás suscripto a las novedades de ${tienda}.`}
        nota={
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.7, margin: "18px 0 0", textAlign: "center" }}>
            Si no fuiste vos quien cargó esta dirección, cerrá esta página: sin confirmar no vas a recibir nada.
          </p>
        }
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em", textAlign: "center" }}>
          Confirmá tu suscripción
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px", textAlign: "center" }}>
          Vas a recibir las novedades y ofertas de <strong style={{ color: "#111827" }}>{tienda}</strong> en{" "}
          <strong style={{ color: "#111827" }}>{suscriptor.email}</strong>. Podés darte de baja cuando quieras,
          con un clic desde cualquiera de los mails.
        </p>
      </AccionNewsletter>
    </Marco>
  );
}
