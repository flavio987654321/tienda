import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-session";
import TermsUpdateBanner from "@/components/TermsUpdateBanner";
import PWAManager from "@/components/PWAManager";
import PanelSplash from "@/components/panel/PanelSplash";
import PanelRolAjeno from "@/components/panel/PanelRolAjeno";
import LoginGate from "@/components/panel/LoginGate";
import { AFILIADOS_VERSION } from "@/lib/app-versions";
import AfiliadosNav from "./AfiliadosNav";

export const metadata: Metadata = {
  manifest: "/api/manifest/afiliados",
  // iOS saca el ícono de acá y no del manifest; sin esto usaba una captura de la
  // pantalla. Ver el comentario largo en la metadata del panel de tiendas.
  icons: { apple: [{ url: "/api/icons/afiliados?size=180&purpose=any", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Afiliados", statusBarStyle: "default" },
  // El prefijado de Apple va a mano, igual que en los otros dos paneles:
  // `appleWebApp.capable` emite el nombre estándar, que entiende Safari 17.4 para
  // arriba. Sin esta línea, en un iPhone más viejo esto se instalaba como un
  // simple marcador de Safari en vez de abrirse a pantalla completa.
  other: { "apple-mobile-web-app-capable": "yes" },
};

/* La guarda va ACÁ y no en la página, y ese es todo el punto.
 *
 * Estaba en `page.tsx`, pero el layout se dibuja ANTES de que la página alcance
 * a mandarte al login. O sea que el que tocaba "Postularme" sin sesión veía el
 * panel de afiliados aparecer un segundo —barra, menú y todo— y recién después
 * lo pateaba. Parecía que la página se rompía.
 *
 * Desde el layout no se dibuja nada: se decide antes de que exista la pantalla.
 *
 * Y decide DOS cosas, no una: la sesión y el ROL.
 *
 * Acá entra sólo quien se registró como afiliado. Una cuenta es una sola cosa
 * —tienda, afiliado o cliente—, cada una tiene su panel y no se cruzan. Antes
 * alcanzaba con estar logueado, así que una dueña terminaba mirando un panel
 * que no es el suyo, con "Postularme" en su propia tienda.
 *
 * En la web a cada uno se lo manda a SU panel, no a un error ni al login: el que
 * se equivocó de puerta necesita que le abran la correcta, no que le cierren
 * ésta. Adentro de la app instalada eso no se puede hacer —mandarlo al otro panel
 * es meterlo fuera del scope de ESTA app—, así que ahí se le explica y se le
 * ofrece salir. Lo decide `PanelRolAjeno`.
 *
 * El login sólo es para el que no tiene sesión.
 */
export default async function AfiliadosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  /* Sin sesión se DIBUJA el login acá, no se redirige a `/login`.
   *
   * Es la misma corrección que se le hizo al panel de tiendas, por el mismo
   * motivo: `/login` está fuera del `scope` del manifiesto (`/afiliados`), y como
   * los `<Link>` de Next navegan del lado del cliente, la app instalada se comía
   * la página comercial entera —con su embudo de registro y sus links al listado
   * de tiendas— adentro de su propia ventana, sin barra de direcciones ni forma
   * de volver.
   *
   * `LoginGate` decide qué mostrar: en la web sigue yendo a `/login`, que no
   * cambia para nadie, y adentro de la app instalada dibuja el formulario sin
   * ningún link. Y quien pidió `/afiliados/billetera` vuelve a `/afiliados/billetera`
   * al entrar, en vez de terminar en otra pantalla.
   *
   * `PWAManager` va también acá: es lo único que puede avisar de una versión
   * nueva, y en standalone no hay F5 ni barra de direcciones. Sin esto, una app
   * que quedó en la pantalla de login se congelaba en su build para siempre.
   */
  if (!user) {
    return (
      <>
        <PWAManager appVersion={AFILIADOS_VERSION} versionKey="pwa_afiliados_version" disableNotifPrompt scope="/afiliados" />
        <PanelSplash nombre="TiendaApps Afiliados" />
        <LoginGate titulo="Ingresá a tu panel" subtitulo="Usá tu cuenta de afiliado." />
      </>
    );
  }

  /* Mismo caso que el panel de tiendas, y por el mismo motivo: acá un `redirect`
     metía el otro panel adentro de esta ventana, fuera de su `scope`. Ver el
     comentario largo en `PanelRolAjeno`. */
  if (user.role !== "SELLER") {
    const destino =
      user.role === "ADMIN" ? "/admin" : user.role === "OWNER" ? "/dashboard" : "/mi-cuenta";
    const cuenta =
      user.role === "ADMIN" ? "de administrador" : user.role === "OWNER" ? "de tienda" : "de cliente";
    return (
      <>
        <PWAManager appVersion={AFILIADOS_VERSION} versionKey="pwa_afiliados_version" disableNotifPrompt scope="/afiliados" />
        <PanelRolAjeno destino={destino} raiz="/afiliados" panel="el panel de afiliados" cuenta={cuenta} />
      </>
    );
  }

  return (
    <>
      {/* `disableNotifPrompt` a propósito: hoy no le llega NINGÚN push al
          afiliado. Los cuatro avisos que suenan —pedido nuevo, solicitud de
          afiliado, sin stock y venta caída— van todos al dueño de la tienda.
          Pedirle permiso de notificaciones a alguien que después no va a recibir
          ninguna es prometer algo que no se cumple: cuando haya un aviso que
          justifique interrumpirlo (una comisión acreditada, por ejemplo), se
          saca esta bandera y el cartel aparece solo. */}
      <PWAManager appVersion={AFILIADOS_VERSION} versionKey="pwa_afiliados_version" disableNotifPrompt scope="/afiliados" />
      <PanelSplash nombre="TiendaApps Afiliados" />
      <AfiliadosNav />
      <div className="px-4 pt-3 max-w-5xl mx-auto"><TermsUpdateBanner /></div>
      {children}
    </>
  );
}
