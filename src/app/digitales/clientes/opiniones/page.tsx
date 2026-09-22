import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import BotonVolver from "../../BotonVolver";
import OpinionesClient, { type OpinionEnPantalla } from "./OpinionesClient";

/**
 * Las opiniones verificadas de la cuenta: las que llegaron por el link de
 * la compra, para publicar o esconder. Ver `lib/opiniones-digitales`.
 *
 * Pendientes primero: es lo que hay que hacer. Después las publicadas y las
 * escondidas, por si cambia de idea.
 */

export const dynamic = "force-dynamic";

const TECHO = 300;
const AR_TZ = "America/Argentina/Buenos_Aires";
const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: AR_TZ });

export default async function OpinionesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  const filas = store
    ? await prisma.opinionDigital.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: TECHO,
        select: {
          id: true, nombre: true, texto: true, estado: true, createdAt: true,
          product: { select: { id: true, name: true } },
          order: { select: { buyer: { select: { email: true } } } },
        },
      })
    : [];

  const opiniones: OpinionEnPantalla[] = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    texto: f.texto,
    estado: f.estado as OpinionEnPantalla["estado"],
    cuando: fecha.format(f.createdAt),
    producto: f.product.name,
    productoId: f.product.id,
    email: f.order.buyer.email,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/clientes">Volver a Clientes</BotonVolver>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Opiniones verificadas</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Las escribió gente que pagó, desde el link de su compra. Vos decidís cuáles se ven en tu página.
        </p>
      </div>
      <OpinionesClient opiniones={opiniones} />
    </div>
  );
}
