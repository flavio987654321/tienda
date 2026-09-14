import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  getUserSubscription,
  getSubscriptionStatus,
  daysRemaining,
  pruebaYaUsada,
} from "@/lib/subscription";
import type { TierDigital } from "@/lib/planes-digitales";
import { TOPES_DIGITALES } from "@/lib/planLimits";
import { estadoDelCupo } from "@/lib/cupo-ia";
import { armarUso } from "@/lib/uso-digital";
import BotonVolver from "../BotonVolver";
import MiCuentaClient from "./MiCuentaClient";

/**
 * Mi cuenta, del panel de Productos Digitales.
 *
 * Junta en una pantalla el plan y los datos de la persona, que es como lo tiene
 * la competencia y está bien: son dos cosas que se miran juntas y el panel
 * todavía no tiene tantas pantallas como para separarlas. Se llamaba "Mi plan" y
 * era sólo la mitad de arriba.
 *
 * Todo lo que muestra sale de la base. Las cuentas se hacen ACÁ, en el servidor,
 * y bajan como números y textos ya resueltos. El panel de tiendas hace lo
 * contrario —le pasa la suscripción cruda al componente de navegador, que importa
 * `@/lib/subscription`, y esa librería arrastra Prisma— y es una cadena que no
 * hay por qué volver a tender.
 *
 * El encabezado y el "volver" viven acá y no adentro del componente de navegador,
 * a propósito: son iguales en todas las pantallas del panel, no dependen de
 * ningún estado, y así el chequeo que verifica que ninguna pantalla se quede sin
 * salida sólo tiene que mirar los `page.tsx`.
 *
 * Sin sesión no se redirige a `/login`: esa ruta está fuera del `scope` del
 * manifiesto y desde la app instalada abría el sitio comercial entero. La
 * pantalla la dibuja el layout.
 */

/**
 * Cuántas filas puede llegar a traer "Tu uso", con el doble de margen. Es el
 * mismo techo que la pantalla de productos, calculado igual y por el mismo
 * motivo: una consulta sin límite contra una tabla que crece.
 */
const TECHO_DE_FILAS =
  TOPES_DIGITALES.PRO.paginas * (1 + TOPES_DIGITALES.PRO.bonos + TOPES_DIGITALES.PRO.upsells) * 2;

/**
 * Lo que la cuenta tiene contra lo que el plan permite. Sin `Store` todavía
 * —nunca guardó un producto— es todo cero, que es la verdad y no un caso aparte.
 *
 * `enPrueba` va al cupo de ebooks por el mismo motivo que en la pantalla de
 * productos: el número que se muestra tiene que ser el que aplica el servidor.
 * La cuenta en sí la hace `armarUso`, que es pura y está probada.
 */
async function usoDeLaCuenta(userId: string, tier: TierDigital, enPrueba: boolean) {
  const [store, embudo, ebook] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } }),
    estadoDelCupo(userId, tier),
    estadoDelCupo(userId, tier, "EBOOK", enPrueba),
  ]);

  const filas = store
    ? await prisma.product.findMany({
        where: { storeId: store.id, deletedAt: null, rolDigital: { not: null } },
        orderBy: { createdAt: "asc" },
        take: TECHO_DE_FILAS,
        select: { id: true, name: true, rolDigital: true, padreId: true, isActive: true, archivoPeso: true },
      })
    : [];

  return { ...armarUso(filas, tier), ia: { embudo, ebook } };
}

export default async function MiCuentaPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [sub, perfil] = await Promise.all([
    getUserSubscription(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
  ]);

  const cuenta = {
    nombre: perfil?.name ?? "",
    email: perfil?.email ?? "",
    telefono: perfil?.phone ?? "",
    /* Ya formateada acá: el servidor y el navegador pueden estar en zonas
       horarias distintas, y una fecha armada en los dos lados es un aviso de
       hidratación seguro. */
    alta: perfil?.createdAt
      ? perfil.createdAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : "",
  };

  const estado = sub ? getSubscriptionStatus(sub) : "ACTIVE";
  /* Una cuenta digital sin suscripción no debería existir —el alta la crea en el
     mismo pedido— pero si pasa, se muestra Free: es lo que la cuenta puede hacer
     de verdad, y es el lado seguro para equivocarse. */
  const tier = (sub?.tier ?? "FREE") as TierDigital;

  /* De qué fecha se cuentan los días que quedan. En prueba, la de la prueba; en
     gracia, la del corte; si no, la de la renovación. Free no tiene ninguna, y
     por eso puede quedar en cero sin que signifique nada. */
  const fechaClave = !sub
    ? null
    : estado === "TRIAL" ? sub.trialEndsAt
    : estado === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd)
    : sub.currentPeriodEnd;

  /* Páginas, bonos, archivos y el cupo de IA, contados acá y bajados resueltos
     como todo lo demás de esta pantalla. */
  const uso = await usoDeLaCuenta(user.id, tier, estado === "TRIAL");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Mi cuenta</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">Tu plan y tus datos personales.</p>
      </div>

      <MiCuentaClient
        tier={tier}
        billing={sub?.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY"}
        estado={estado}
        dias={fechaClave ? daysRemaining(fechaClave) : 0}
        renovacion={
          sub && estado === "ACTIVE" && sub.currentPeriodEnd
            ? sub.currentPeriodEnd.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
            : null
        }
        pruebaDisponible={!sub || !pruebaYaUsada(sub)}
        uso={uso}
        cuenta={cuenta}
      />
    </div>
  );
}
