import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-session";
import { panelDeRol, nombreDeCuenta } from "@/lib/panel-de-rol";
import PWAManager from "@/components/PWAManager";
import { estadoDelRecibimiento } from "@/lib/recibimiento";
import { estadoDelCupo } from "@/lib/cupo-ia";
import Recibimiento from "./Recibimiento";
import PanelSplash from "@/components/panel/PanelSplash";
import PanelRolAjeno from "@/components/panel/PanelRolAjeno";
import LoginGate from "@/components/panel/LoginGate";
import NotificationBell from "@/components/NotificationBell";
import { DIGITALES_VERSION } from "@/lib/app-versions";
import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import DigitalesSidebar from "./DigitalesSidebar";
import TemaDelPanel from "./TemaDelPanel";
import Cierre from "./Cierre";
import CuentaCerrada from "./CuentaCerrada";
import { pausadosPorCierreDe } from "@/lib/cierre-digital";
import { puedeVer } from "@/lib/estadisticas-digitales";
/* Sólo desarrollo: se dibuja detrás de `NODE_ENV`, no viaja al build. */
import SondaDePantalla from "./SondaDePantalla";
import { ProveedorDeSalida } from "./SalidaSinGuardar";
import { SCRIPT_TEMA } from "@/lib/tema-digitales";

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
 * ── El push, prendido el 05/09/26 ──────────────────────────────────────────
 *
 * Acá decía `disableNotifPrompt` con este motivo: *"pedirle permiso de
 * notificaciones a alguien que después no va a recibir ninguna es prometer algo
 * que no se cumple; cuando haya una venta que justifique interrumpirlo, se saca
 * esta bandera"*.
 *
 * **Ya la hay.** Una venta digital cobrada manda push desde `digitales/cobro`,
 * que es exactamente el caso que justifica interrumpir a alguien: entró plata.
 * Se sacó la bandera y el cartel de permiso aparece solo.
 *
 * ⚠️ Y es el ÚNICO que se manda. Ni la devolución, ni la entrega que falló, ni
 * la caída a Free: esos se leen en la campanita al entrar. Un push es una
 * interrupción, y gastarla en algo que no se resuelve en el momento es la forma
 * de que la próxima —la que sí importa— llegue con el permiso ya revocado.
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

  /* ── La cuenta cerrada ──────────────────────────────────────────────────
     Antes del recibimiento y de la barra: una cuenta que ella misma cerró
     (Configuración → Zona de peligro) no tiene panel que mostrar, sólo la
     puerta de reabrir. Se lee acá y no en cada pantalla por lo mismo que el
     recibimiento: cubre todas de una. Ver `lib/cierre-digital`. */
  const cuenta = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true, closedAt: true } });
  if (cuenta?.closedAt) {
    return (
      <>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <TemaDelPanel />
        <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" scope="/digitales" disableNotifPrompt />
        <PanelSplash nombre="TiendaApps Digitales" />
        {/* `exportar`: el historial de ventas se puede bajar sin reabrir, si el
            plan lo incluye (Starter y Pro, como en la pantalla de Ventas). Free
            lo ve en pantalla al reabrir, que es gratis. */}
        <CuentaCerrada cerradaEl={cuenta.closedAt.toISOString()} vuelven={await pausadosPorCierreDe(prisma, cuenta.id)} exportar={puedeVer(tier, "exportar")} />
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     EL RECIBIMIENTO: HASTA QUE LA CUENTA NO ESTÁ ARMADA, EL PANEL NO EXISTE
     ══════════════════════════════════════════════════════════════════════════

     Sin barra lateral, sin Configuración, sin Mi cuenta, sin números: la
     pantalla entera son los pasos, y el panel aparece recién cuando están los
     CUATRO de la puerta — con el producto, el archivo, la página y el cobro ya
     resueltos.

     ⚠️ Publicar NO abre la puerta, aunque también impida vender. Se entra en
     borrador a propósito: pedir la publicación para entrar obliga a poner la
     página a la vista antes de haberla visto, y lo primero que verían los
     compradores sería la versión que la dueña nunca revisó. Se entra, se mira,
     se acomoda, y se publica desde el panel — donde la lista de `PrimerosPasos`
     lo sigue pidiendo hasta que esté hecho. Ver `pasosDeLaPuerta`.

     ⚠️ Va en el LAYOUT y no en cada pantalla, y ahí está la gracia: cubre las
     nueve de una sola vez. Puesto pantalla por pantalla, alcanzaría con agregar
     la décima y olvidarse para que una cuenta a medio armar entre por esa
     puerta — y entraría a un panel de tres ceros, que es justo lo que esto
     viene a evitar.

     El costo es una consulta más por cada pantalla del panel que se abra. Es a
     propósito y está medida: son dos lecturas por índice (`Store.ownerId` y el
     principal más viejo). La alternativa era guardar una bandera de "ya
     terminó", y esa se desincroniza el día que alguien borra su único producto:
     diría "listo" con la cuenta vacía. Ver `lib/recibimiento`. */
  const recibimiento = await estadoDelRecibimiento(user.id);
  if (!recibimiento.listo) {
    return (
      <>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <TemaDelPanel />
        <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" scope="/digitales" />
        <PanelSplash nombre="TiendaApps Digitales" />
        <Recibimiento
          pasos={recibimiento.pasos}
          productoId={recibimiento.productoId}
          cupoIA={await estadoDelCupo(user.id, tier)}
          /* Sólo para saludar. Ya está en la sesión, así que no cuesta una
             consulta más — y de `user` no puede salir nada más que esto: lo que
             se le pasa a un componente de cliente termina escrito adentro del
             HTML. Ver el aviso de `estadoDelRecibimiento`. */
          nombre={user.name}
        />
      </>
    );
  }

  return (
    /* ⚠️ `shrink-0` NO ES DECORACIÓN.
       ══════════════════════════════════════════════════════════════════════
       Este `<div>` es hijo del `<body>`, que es `flex flex-col`. En un flex,
       un hijo se puede ENCOGER por debajo del alto que pidió: `flex-shrink`
       vale 1 por defecto. O sea que `h-screen` acá no era una garantía, era
       una intención — y alcanzaba con que cualquier hermano del `<body>`
       ocupara algo para que este armazón midiera menos que la ventana.

       Cuando eso pasa se ve una franja abajo: la barra lateral llega hasta el
       fondo igual —es `fixed` con `h-full`, no la afecta el flex— pero el área
       de contenido no, y queda un escalón. Visto en pantalla el 08/09/26.

       Con `shrink-0`, `h-screen` pasa a ser lo que dice. */
    <div className="h-screen shrink-0 bg-gray-50 panel-oscuro:bg-gray-950 flex overflow-hidden text-gray-900 panel-oscuro:text-gray-100 transition-colors">
      {/* Pinta el tema ANTES del primer dibujo. Sin esto, entrar en oscuro es un
          flash blanco de pantalla completa: el HTML llega claro, React hidrata y
          recién ahí se lee la preferencia. Ningún efecto de React puede correr
          antes de que el navegador pinte; un `<script>` sincrónico sí. */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      {/* El script de arriba sólo corre cuando la página se carga, y lee el tema
          del sistema una sola vez. Esto se ocupa del resto de la visita: pinta
          cuando se entra con un Link, sigue los cambios del sistema mientras la
          preferencia sea "Automático", y levanta el atributo al salir del panel
          para no dejárselo puesto al resto del sitio. */}
      <TemaDelPanel />
      {process.env.NODE_ENV === "development" && <SondaDePantalla />}
      {/* `botonDeInstalar`: Configuración → Avisos tiene el botón "Instalar la
          app", así que acá se guarda el aviso del navegador. */}
      <PWAManager appVersion={DIGITALES_VERSION} versionKey="pwa_digitales_version" scope="/digitales" botonDeInstalar />
      <PanelSplash nombre="TiendaApps Digitales" />
      {/* Envuelve la barra Y la pantalla, y en ese orden importa: la pantalla es
          la que dice "tengo cambios sin guardar" y los links que se los llevan
          puestos están en la barra. Separados, cada uno tendría su propio estado
          y la barra nunca se enteraría. */}
      {/* ⚠️ EL CIERRE: elegir el aspecto y la felicitación, encima del panel ya
          armado. Se dibuja sólo mientras la publicación siga pendiente — o sea,
          en el ratito entre terminar la puerta y publicar—. Sin esa condición,
          el día que esto salga toda cuenta que ya venía usando el panel se
          comería una felicitación por algo que hizo hace meses.

          Que se muestre UNA VEZ lo decide el navegador y no la base: no gobierna
          nada, la puerta sigue saliendo del estado real. Ver `Cierre`. */}
      {!recibimiento.publicado && (
        <Cierre
          productoId={recibimiento.productoId}
          productoNombre={recibimiento.productoNombre}
          pasos={recibimiento.pasos}
          pendientes={recibimiento.pendientesAdentro}
          aspecto={recibimiento.aspecto}
        />
      )}
      <ProveedorDeSalida>
        <DigitalesSidebar tier={tier} />
        {/* `lg:ml-14` deja libre la franja de la barra, que es `fixed`; `pt-14` hace
            lo mismo con la barra de arriba del celular. El scroll va acá adentro y
            no en el `body`: si no, la barra lateral se va con la página. Mismo
            molde que `DashboardLayout`. */}
        <main className="lg:ml-14 flex-1 flex flex-col bg-gray-50 panel-oscuro:bg-gray-950 pt-14 lg:pt-0 overflow-y-auto overflow-x-hidden transition-colors">
          {/* ⚠️ LA CAMPANITA EN ESCRITORIO. Existía sólo en la barra del celular,
              así que quien trabaja en una computadora —que es donde se arma un
              producto— NO VEÍA NINGUNO de los avisos. Y se escriben desde el
              03/09: la venta, la devolución, la entrega que falló y la caída a
              Free. Estaban ahí, escritos, y nadie los leía.

              Va adentro del propio main y no flotando sobre la pantalla, que es
              el molde de DashboardLayout: como es un renglón de verdad, empuja
              al contenido en vez de taparle la esquina, y el desplegable no lo
              recorta el overflow-hidden de la franja lateral. */}
          <div className="hidden lg:flex justify-end items-center gap-1 px-4 pt-3 pb-0 shrink-0">
            <NotificationBell userId={user.id} />
          </div>
          {children}
        </main>
      </ProveedorDeSalida>
    </div>
  );
}
