import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-session";
import { panelDeRol, nombreDeCuenta } from "@/lib/panel-de-rol";
import PWAManager from "@/components/PWAManager";
import PanelSplash from "@/components/panel/PanelSplash";
import PanelRolAjeno from "@/components/panel/PanelRolAjeno";
import LoginGate from "@/components/panel/LoginGate";
import { DIGITALES_VERSION } from "@/lib/app-versions";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import DigitalesSidebar from "./DigitalesSidebar";

export const metadata: Metadata = {
  title: "Productos Digitales — TiendaApps",
  manifest: "/api/manifest/digitales",
  // iOS saca el ícono de acá y no del manifest; sin esto usaba una captura de la
  // pantalla. Ver el comentario largo en la metadata del panel de tiendas.
  icons: { apple: [{ url: "/api/icons/digitales?size=180&purpose=any", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Digitales", statusBarStyle: "default" },
  // El prefijado de Apple va a mano, igual que en los otros dos paneles:
  // `appleWebApp.capable` emite el nombre estándar, que entiende Safari 17.4 para
  // arriba. Sin esta línea, en un iPhone más viejo esto se instala como un simple
  // marcador de Safari en vez de abrirse a pantalla completa.
  other: { "apple-mobile-web-app-capable": "yes" },
};

/* El panel de Productos Digitales.
 *
 * La guarda va ACÁ y no en la página, por lo mismo que en los otros dos paneles:
 * el layout se dibuja antes de que la página alcance a patearte, así que desde
 * la página se ve el panel aparecer un segundo y parece que se rompe. Ver el
 * comentario largo en `afiliados/layout.tsx`.
 *
 * Y decide dos cosas, no una: la sesión y el ROL. Acá entra sólo quien se
 * registró en Productos Digitales — una cuenta es una sola cosa y los paneles no
 * se cruzan.
 *
 * Sin sesión se DIBUJA el login acá, no se redirige a `/login`: esa ruta está
 * fuera del `scope` del manifiesto, y como los `<Link>` de Next navegan del lado
 * del cliente, la app instalada se comía la web comercial entera adentro de su
 * propia ventana, sin barra de direcciones ni forma de volver. `LoginGate`
 * decide qué dibujar según dónde esté.
 *
 * `PWAManager` va en las tres ramas —incluida la del login— porque es lo único
 * que puede avisar de una versión nueva, y en standalone no hay F5 ni barra de
 * direcciones: una app que quedó en la pantalla de login se congelaría en su
 * build para siempre.
 *
 * `disableNotifPrompt` a propósito, igual que en afiliados: hoy a una cuenta
 * digital NO le llega ningún push. El único aviso que existe —"tu plan terminó,
 * volviste a Free"— lo escribe el cron como notificación de la campanita, que se
 * lee al entrar. Pedirle permiso de notificaciones a alguien que después no va a
 * recibir ninguna es prometer algo que no se cumple; cuando haya una venta que
 * justifique interrumpirlo, se saca esta bandera y el cartel aparece solo.
 */
export default async function DigitalesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" disableNotifPrompt scope="/digitales" />
        <PanelSplash nombre="TiendaApps Digitales" />
        <LoginGate titulo="Ingresá a tu panel" subtitulo="Usá tu cuenta de Productos Digitales." />
      </>
    );
  }

  /* Acá un `redirect` metería el otro panel adentro de esta ventana, fuera de su
     `scope`. Ver el comentario largo en `PanelRolAjeno`. */
  if (user.role !== "DIGITAL") {
    return (
      <>
        <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" disableNotifPrompt scope="/digitales" />
        <PanelSplash nombre="TiendaApps Digitales" />
        <PanelRolAjeno
          destino={panelDeRol(user.role).href}
          raiz="/digitales"
          panel="el panel de Productos Digitales"
          cuenta={nombreDeCuenta(user.role)}
        />
      </>
    );
  }

  /* El plan, sólo para la tarjeta de abajo de la barra. Se lee acá y no en la
     barra porque la barra es del navegador y no puede tocar la base; y se lee
     una vez para todo el panel en vez de una por pantalla.
     `?? "FREE"` porque el menú se tiene que dibujar igual: una cuenta digital sin
     suscripción no debería existir —el alta la crea en el mismo pedido— y si
     pasa, Free es lo que esa cuenta puede hacer de verdad. */
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const tier = (sub?.tier ?? "FREE") as TierDigital;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden text-gray-900 [color-scheme:light]">
      <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" disableNotifPrompt scope="/digitales" />
      <PanelSplash nombre="TiendaApps Digitales" />
      <DigitalesSidebar tier={tier} />
      {/* `lg:ml-14` deja libre la franja de la barra, que es `fixed`; `pt-14` hace
          lo mismo con la barra de arriba del celular. El scroll va acá adentro y
          no en el `body`: si no, la barra lateral se va con la página. Mismo
          molde que `DashboardLayout`. */}
      <main className="lg:ml-14 flex-1 flex flex-col bg-gray-50 pt-14 lg:pt-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
