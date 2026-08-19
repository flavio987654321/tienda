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
import PanelSplash from "@/components/panel/PanelSplash";
import PanelRolAjeno from "@/components/panel/PanelRolAjeno";
import LoginGate from "@/components/panel/LoginGate";
import { DASHBOARD_VERSION } from "@/lib/app-versions";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/api/manifest/dashboard",
  // iOS saca el ícono de acá y no del manifest; sin esto usaba una captura de la
  // pantalla. Ver el comentario largo en la metadata de la tienda.
  icons: { apple: [{ url: "/api/icons/dashboard?size=180", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Panel", statusBarStyle: "default" },
  // El prefijado de Apple va a mano, igual que en la tienda: `appleWebApp.capable`
  // emite el nombre estándar, que entiende Safari 17.4 para arriba. Sin esta línea,
  // en un iPhone más viejo el panel se instalaba como un simple marcador de Safari
  // en vez de abrirse a pantalla completa.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  /* La guarda va acá arriba, ANTES de cualquier consulta, por lo mismo que en
     los otros tres paneles: si se decide más abajo, el layout ya empezó a
     mandar HTML y Next no puede contestar un redirect de verdad — mete un
     `<meta http-equiv="refresh" content="1;url=/login">` y la persona ve el
     panel dibujado un segundo entero antes de que la pantalla salte.
     Estaba en `page.tsx`, o sea después de todo esto. */

  /* ── Y por qué las páginas de abajo dicen `return null` y no `redirect` ─────
   *
   * Todas las pantallas del panel se guardan también a sí mismas, y está bien
   * que lo hagan: este layout esconde la pantalla, pero NO evita que la página
   * se ejecute. Comprobado pidiendo cualquier ruta sin sesión — la página corre
   * igual y su resultado viaja en el payload de React aunque no se dibuje.
   *
   * Lo que hacían era `redirect("/login")`, dieciséis veces. Y `/login` está
   * FUERA del `scope` del manifiesto, así que cada una de esas líneas era la
   * misma fuga que este layout vino a cerrar, escrita una vez por pantalla: a la
   * primera sesión vencida, el panel instalado se llenaba con el sitio comercial
   * entero, sin barra de direcciones y sin forma de volver.
   *
   * Hoy no se disparaban —este layout les gana— pero eso es un detalle de cómo
   * Next resuelve layout y página, no una decisión de nadie. Dieciséis fugas
   * apagadas por accidente es una actualización de Next de distancia.
   *
   * Con `return null` la página no navega a ningún lado: deja de trabajar y
   * manda el layout, que ya sabe mostrar el login adentro de la app. Los
   * `redirect("/dashboard")` de las mismas páginas se quedan como estaban:
   * ésos apuntan adentro del `scope` y no tienen este problema.
   */
  /* Sin sesión se DIBUJA el login acá, no se redirige a `/login`.
     `/login` está fuera del `scope` del manifest (`/dashboard`), y como los
     `<Link>` de Next navegan del lado del cliente, el panel instalado como app
     terminaba mostrando la web comercial adentro de su propia ventana, sin barra
     de direcciones ni forma de volver. Dibujándolo acá no hay ninguna navegación
     que pueda salirse, y de paso quien entró a `/dashboard/pedidos` sin sesión
     vuelve a `/dashboard/pedidos` al loguearse en vez de terminar en `/panel`.
     El detalle largo está en el comentario de `PanelLogin`. */
  if (!user) {
    /* La web sigue yendo a `/login` y la app instalada se queda acá: lo decide
       `LoginGate`, que es cliente porque el servidor no tiene forma de saberlo.
       `PWAManager` va también acá: es lo único que puede avisar de una versión
       nueva, y en standalone no hay F5 ni barra de direcciones. Sin esto, una app
       que quedó en la pantalla de login se congelaba en su build para siempre.
       Sí va sin el pedido de notificaciones: no hay a quién notificarle todavía. */
    return (
      <>
        <PWAManager appVersion={DASHBOARD_VERSION} versionKey="pwa_dashboard_version" disableNotifPrompt scope="/dashboard" />
        <PanelSplash nombre="TiendaApps Panel" />
        <LoginGate />
      </>
    );
  }
  /* Cuenta que no es de tienda: se DIBUJA el aviso, no se redirige.
     Un `redirect` acá era correcto en la web y un desastre en la app instalada:
     en Android las dos apps comparten las cookies, así que entrar a la app de
     afiliados con una cuenta de afiliado dejaba esa sesión puesta para las dos, y
     abrir el ícono del panel de tiendas terminaba mostrando el panel de
     AFILIADOS adentro de esta ventana — fuera de su propio `scope`, sin barra de
     direcciones y sin forma de volver.
     `PanelRolAjeno` decide: en la web redirige igual que siempre, y adentro de la
     app explica qué pasó y ofrece salir para entrar con la cuenta correcta. */
  if (user.role !== "OWNER") {
    const destino =
      user.role === "ADMIN" ? "/admin" : user.role === "SELLER" ? "/afiliados" : "/mi-cuenta";
    const cuenta =
      user.role === "ADMIN" ? "de administrador" : user.role === "SELLER" ? "de afiliado" : "de cliente";
    return (
      <>
        <PWAManager appVersion={DASHBOARD_VERSION} versionKey="pwa_dashboard_version" disableNotifPrompt scope="/dashboard" />
        <PanelSplash nombre="TiendaApps Panel" />
        <PanelRolAjeno destino={destino} raiz="/dashboard" panel="el panel de tu tienda" cuenta={cuenta} />
      </>
    );
  }

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
      <PWAManager appVersion={DASHBOARD_VERSION} versionKey="pwa_dashboard_version" scope="/dashboard" />
      <PanelSplash nombre="TiendaApps Panel" />
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
