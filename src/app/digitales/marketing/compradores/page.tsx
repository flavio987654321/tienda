import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { MAX_CORREOS_EN_PANTALLA, MAX_CORREOS_POR_DIA, resumenDelEnvio } from "@/lib/correos-compradores";
import { cuantosRecibirian } from "@/lib/correos-compradores-db";
import BotonVolver from "../../BotonVolver";
import CompradoresClient, { type CorreoEnPantalla } from "./CompradoresClient";

/**
 * Mail a tus compradores.
 *
 * Escribirle a todos los que compraron un producto —o cualquiera de la
 * cuenta—: para lanzar el siguiente, avisar que se actualizó el archivo,
 * pedir una opinión. Es de Pro, y **al día**: con la tarjeta rebotada no se
 * manda nada, igual que el recordatorio de carritos.
 *
 * Los que se dieron de baja no aparecen en ningún número: para la vendedora
 * simplemente no están. Ver `lib/correos-compradores`.
 */

export const dynamic = "force-dynamic";

const AR_TZ = "America/Argentina/Buenos_Aires";
const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: AR_TZ });

export default async function CompradoresPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    getUserSubscription(user.id),
  ]);
  const esPro = sub?.tier === "PRO" && !!sub && isSubscriptionActive(sub);

  const productos = store
    ? await prisma.product.findMany({
        where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: MAX_PRODUCTOS_DIGITALES_CREADOS,
        select: { id: true, name: true },
      })
    : [];

  const [cuantos, filas] = store
    ? await Promise.all([
        cuantosRecibirian(store.id, productos.map((p) => p.id)),
        prisma.correoDigital.findMany({
          where: { storeId: store.id },
          orderBy: { createdAt: "desc" },
          take: MAX_CORREOS_EN_PANTALLA,
          select: {
            id: true, asunto: true, destinatarios: true, enviados: true, fallidos: true, estado: true, createdAt: true,
            product: { select: { name: true } },
          },
        }),
      ])
    : [{ todos: 0, porProducto: {} }, []];

  const correos: CorreoEnPantalla[] = filas.map((f) => ({
    id: f.id,
    asunto: f.asunto,
    producto: f.product?.name ?? null,
    cuando: fecha.format(f.createdAt),
    resumen: resumenDelEnvio(f),
    enviando: f.estado === "ENVIANDO",
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/marketing">Volver a Marketing</BotonVolver>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Mail a tus compradores</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Escribiles a todos los que te compraron: para lanzar el siguiente, avisar que actualizaste el
          archivo, o pedirles una opinión. Sale con tu nombre y te contestan a tu correo.
        </p>
      </div>

      <CompradoresClient
        esPro={esPro}
        productos={productos}
        cuantos={cuantos}
        correos={correos}
        topePorDia={MAX_CORREOS_POR_DIA}
        vendedor={user.name ?? null}
      />
    </div>
  );
}
