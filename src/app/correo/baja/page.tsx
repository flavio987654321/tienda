import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { leerTokenDeBaja } from "@/lib/correos-compradores";
import { Marco } from "../../newsletter/Marco";
import { AccionNewsletter } from "../../newsletter/AccionNewsletter";

/**
 * "No quiero recibir más mails": la página a la que lleva el pie del mail
 * a compradores de Productos Digitales.
 *
 * Reusa el marco y el botón del newsletter de tiendas —la misma tarjeta
 * neutra, el mismo POST con una persona apretando— porque el problema es el
 * mismo: abrir un link no puede dar de baja a nadie, porque los links de
 * los mails los abren solos Gmail y los antivirus.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "No recibir más mails",
  robots: { index: false, follow: false },
};

export default async function BajaDeCorreoPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const datos = leerTokenDeBaja(typeof t === "string" ? t : "");

  const store = datos
    ? await prisma.store.findUnique({ where: { id: datos.storeId }, select: { owner: { select: { name: true } } } })
    : null;
  const vendedor = store?.owner.name?.trim() || null;

  /* Un token que no sirve NO es un error para quien lo trae: se quiere ir y
     con ese token no le va a llegar nada. Se le dice que ya está afuera. */
  if (!datos || !store) {
    return (
      <Marco tienda={vendedor}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>Listo</h1>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
            No vas a recibir más mails en esta dirección.
          </p>
        </div>
      </Marco>
    );
  }

  const quien = vendedor ?? "esta vendedora";

  return (
    <Marco tienda={vendedor}>
      <AccionNewsletter
        token={typeof t === "string" ? t : ""}
        endpoint="/api/digitales/baja"
        boton="No quiero recibir más mails"
        botonCargando="Un momento…"
        exito="Listo"
        detalleExito={`No vas a recibir más mails de ${quien}. Lo que compraste sigue siendo tuyo: los enlaces de descarga que ya tenés siguen andando.`}
        nota={
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.7, margin: "18px 0 0", textAlign: "center" }}>
            Esto no toca tus compras: sólo los mails con novedades.
          </p>
        }
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em", textAlign: "center" }}>
          ¿No querés recibir más mails?
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px", textAlign: "center" }}>
          Dejás de recibir los mails de <strong style={{ color: "#111827" }}>{quien}</strong> en{" "}
          <strong style={{ color: "#111827" }}>{datos.email}</strong>.
        </p>
      </AccionNewsletter>
    </Marco>
  );
}
