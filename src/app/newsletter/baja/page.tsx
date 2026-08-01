import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Marco } from "../Marco";
import { AccionNewsletter } from "../AccionNewsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cancelar suscripción",
  robots: { index: false, follow: false },
};

export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  const suscriptor = token
    ? await prisma.newsletterSubscriber.findUnique({
        where: { token },
        select: { bajaEn: true, email: true, store: { select: { name: true } } },
      })
    : null;

  // Un token que no encontramos NO se trata como error. El que llegó hasta acá
  // se quiere ir; si le mostramos "link inválido", el botón que le queda a mano
  // es el de spam — y esa denuncia la pagan todas las tiendas del proyecto,
  // porque comparten el dominio de envío. Se le dice que ya está afuera, que es
  // la verdad: con ese token no le va a llegar nada.
  if (!suscriptor || suscriptor.bajaEn) {
    return (
      <Marco tienda={suscriptor?.store.name}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Suscripción cancelada
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
            No vas a recibir más novedades a esta dirección.
          </p>
        </div>
      </Marco>
    );
  }

  const tienda = suscriptor.store.name;

  return (
    <Marco tienda={tienda}>
      <AccionNewsletter
        token={token}
        endpoint="/api/newsletter/baja"
        boton="Cancelar mi suscripción"
        botonCargando="Cancelando…"
        exito="Suscripción cancelada"
        detalleExito={`No vas a recibir más novedades de ${tienda}. Si cambiás de idea, podés volver a suscribirte desde la tienda.`}
        nota={
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.7, margin: "18px 0 0", textAlign: "center" }}>
            Esto no cancela ningún pedido ni tu cuenta: sólo los mails de novedades.
          </p>
        }
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em", textAlign: "center" }}>
          ¿Cancelar la suscripción?
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px", textAlign: "center" }}>
          Dejás de recibir las novedades de <strong style={{ color: "#111827" }}>{tienda}</strong> en{" "}
          <strong style={{ color: "#111827" }}>{suscriptor.email}</strong>.
        </p>
      </AccionNewsletter>
    </Marco>
  );
}
