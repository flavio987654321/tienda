import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining, reactivationCredit } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import StoreClosedGate from "@/components/dashboard/StoreClosedGate";
import CelebrationManager from "@/components/dashboard/CelebrationManager";
import SubscriptionRealtimeRefresher from "@/components/subscription/SubscriptionRealtimeRefresher";
import SubscriptionSuccessBanner from "@/components/subscription/SubscriptionSuccessBanner";
import StoreTypeModal from "./productos/StoreTypeModal";
import PWAManager from "@/components/PWAManager";
import { DASHBOARD_VERSION } from "@/lib/app-versions";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/api/manifest/dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  /* La guarda va acá arriba, ANTES de cualquier consulta, por lo mismo que en
     los otros tres paneles: si se decide más abajo, el layout ya empezó a
     mandar HTML y Next no puede contestar un redirect de verdad — mete un
     `<meta http-equiv="refresh" content="1;url=/login">` y la persona ve el
     panel dibujado un segundo entero antes de que la pantalla salte.
     Estaba en `page.tsx`, o sea después de todo esto. */
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "SELLER") redirect("/afiliados");
  if (user.role === "BUYER") redirect("/mi-cuenta");

  const isOwner = user.role === "OWNER";

  // Una sola query de tienda para los dos gates de abajo — antes eran dos
  // findUnique separados sobre la misma fila.
  const store = isOwner
    ? await prisma.store.findUnique({
        where: { ownerId: user.id },
        select: { id: true, tipoTiendaConfigurado: true, closedAt: true },
      })
    : null;

  // El plan de afiliados (SELLER) es gratuito — el gate de suscripción es solo para OWNER
  let gate = null;
  if (isOwner) {
    const sub = await getUserSubscription(user.id);

    if (store?.closedAt) {
      // El cierre le gana al estado de la suscripción. Cerrar deja la suscripción
      // en CANCELLED, así que SubscriptionGate mostraría el modal bloqueante de
      // "tu suscripción venció — renová": un mensaje falso (la cerró ella a
      // propósito) que además taparía el botón de reactivar.
      //
      // El mismo cálculo que hace /api/tienda/reactivar al escribir, así la
      // pantalla no promete algo distinto de lo que va a pasar: prometer lo que
      // no pasa fue justo el bug anterior.
      const credito = reactivationCredit(sub);

      gate = (
        <StoreClosedGate
          closedAt={store.closedAt.toISOString()}
          credit={credito && { status: credito.status, until: credito.until.toISOString() }}
        />
      );
    } else {
      if (sub) {
        const status = getSubscriptionStatus(sub);
        const relevantDate =
          status === "TRIAL" ? sub.trialEndsAt :
          status === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd!) :
          sub.currentPeriodEnd ?? sub.trialEndsAt;
        const days = daysRemaining(relevantDate);

        gate = (
          <SubscriptionGate
            status={status}
            daysLeft={days}
            role="OWNER"
            tier={(sub.tier ?? "BASIC") as "BASIC" | "PREMIUM"}
            plan={sub.plan as "MONTHLY" | "ANNUAL"}
          />
        );
      }
    }
  }

  // Gate de tipo de tienda: solo para dueños que aún no configuraron su tipo.
  // Con la tienda cerrada no tiene sentido pedirle que elija rubro.
  const storeTypeGate =
    store && !store.tipoTiendaConfigurado && !store.closedAt ? <StoreTypeModal /> : null;

  return (
    <>
      <PWAManager appVersion={DASHBOARD_VERSION} versionKey="pwa_dashboard_version" />
      {user && <SubscriptionRealtimeRefresher userId={user.id} />}
      <Suspense><SubscriptionSuccessBanner /></Suspense>
      {gate && <div className="pt-14 lg:pt-0 lg:pl-14 bg-gray-50 [color-scheme:light]">{gate}</div>}
      {storeTypeGate}
      {/* Las celebraciones van acá y no adentro del componente DashboardLayout,
          que es donde estaban.
          Ese componente recibía `storeId` por prop, y de las 21 pantallas del
          panel se lo pasaba UNA sola: /dashboard. En las otras veinte el
          festejo directamente no existía — incluida /dashboard/vendedoras, que
          es justo donde se aprueba a un afiliado. Por eso el cartel de
          "primer afiliado" no aparecía al aceptarlo sino recién al volver al
          inicio: no llegaba tarde, aparecía en otra pantalla.
          Desde el layout cubre las 21 sin pasar nada por prop. */}
      {store && <CelebrationManager storeId={store.id} />}
      {children}
    </>
  );
}
