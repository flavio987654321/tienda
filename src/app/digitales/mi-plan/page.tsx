import { getCurrentUser } from "@/lib/auth-session";
import {
  getUserSubscription,
  getSubscriptionStatus,
  daysRemaining,
  pruebaYaUsada,
} from "@/lib/subscription";
import type { TierDigital } from "@/lib/planes-digitales";
import MiPlanDigitalClient from "./MiPlanDigitalClient";

/**
 * Mi plan, del panel de Productos Digitales.
 *
 * Es la primera pantalla del panel que dice la verdad entera: el plan, el estado,
 * los días que quedan y qué pasa cuando se terminan. Todo sale de la suscripción
 * que ya está en la base — no depende de ningún modelo nuevo.
 *
 * Las cuentas se hacen ACÁ, en el servidor, y bajan como números y textos ya
 * resueltos. El panel de tiendas hace lo contrario —le pasa la suscripción cruda
 * al componente de navegador, que importa `@/lib/subscription` para calcular el
 * estado— y esa librería arrastra Prisma. Funciona por cómo se corta el paquete,
 * pero es una cadena que no hay por qué volver a tender.
 *
 * Sin sesión no se redirige a `/login`: esa ruta está fuera del `scope` del
 * manifiesto y desde la app instalada abría el sitio comercial entero. La
 * pantalla la dibuja el layout.
 */
export default async function MiPlanDigitalPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const sub = await getUserSubscription(user.id);

  /* Una cuenta digital sin suscripción no debería existir —el alta la crea en el
     mismo pedido— pero si pasa, se muestra Free: es lo que la cuenta puede hacer
     de verdad, y es el lado seguro para equivocarse. */
  if (!sub) {
    return (
      <MiPlanDigitalClient
        tier="FREE"
        billing="MONTHLY"
        estado="ACTIVE"
        dias={0}
        renovacion={null}
        pruebaDisponible
      />
    );
  }

  const estado = getSubscriptionStatus(sub);
  const tier = (sub.tier ?? "FREE") as TierDigital;

  /* De qué fecha se cuentan los días que quedan. En prueba, la de la prueba; en
     gracia, la del corte; si no, la de la renovación. Free no tiene ninguna, y
     por eso puede quedar en cero sin que signifique nada. */
  const fechaClave =
    estado === "TRIAL" ? sub.trialEndsAt :
    estado === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd) :
    sub.currentPeriodEnd;

  return (
    <MiPlanDigitalClient
      tier={tier}
      billing={sub.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY"}
      estado={estado}
      dias={fechaClave ? daysRemaining(fechaClave) : 0}
      /* Ya formateada acá: el servidor y el navegador pueden tener zonas horarias
         distintas, y una fecha armada en los dos lados es un aviso de hidratación
         seguro. */
      renovacion={
        estado === "ACTIVE" && sub.currentPeriodEnd
          ? sub.currentPeriodEnd.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
          : null
      }
      pruebaDisponible={!pruebaYaUsada(sub)}
    />
  );
}
