/**
 * Chequeos de los avisos de Productos Digitales.
 *
 *   npx tsx src/lib/avisos-digitales.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Que un aviso escrito se pueda leer.** Los cuatro avisos de digitales se
 * venían escribiendo desde el 03/09 y en la computadora NO SE VEÍA NINGUNO: la
 * campanita existía sólo en la barra del celular. Alguien vendía un viernes y se
 * enteraba el lunes al entrar. Un aviso que nadie puede leer es una fila en una
 * tabla.
 *
 * **Y que el push se gaste UNA sola vez, en lo que importa.** Es una
 * interrupción: usarla para algo que la persona no puede resolver en el momento
 * es la forma más rápida de que revoque el permiso, y entonces la próxima —la
 * que sí importa— no llega.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const campanita = readFileSync("src/components/NotificationBell.tsx", "utf8");
const layout = readFileSync("src/app/digitales/layout.tsx", "utf8");
const barra = readFileSync("src/app/digitales/DigitalesSidebar.tsx", "utf8");
const cobro = readFileSync("src/app/api/digitales/cobro/route.ts", "utf8");
const cron = readFileSync("src/app/api/cron/daily/route.ts", "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   TODO AVISO ESCRITO TIENE QUE TENER CARA
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Todos los `type: "DIGITAL_…"` que escribe el código, buscados en el árbol.
 *
 * ⚠️ Se BUSCAN en vez de listarse a mano, y ese es el punto: una lista escrita
 * acá se desactualiza el día que alguien agrega un aviso nuevo, que es
 * exactamente el día en que este chequeo tendría que saltar.
 */
function tiposEnUso(dir: string, encontrados = new Set<string>()): Set<string> {
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre === ".next") continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) { tiposEnUso(ruta, encontrados); continue; }
    if (!/\.tsx?$/.test(nombre) || /\.check\.ts$/.test(nombre)) continue;
    const fuente = readFileSync(ruta, "utf8");
    for (const m of fuente.matchAll(/type: "(DIGITAL_[A-Z_]+)"/g)) encontrados.add(m[1]);
  }
  return encontrados;
}

const tipos = [...tiposEnUso("src")].sort();
check("AVI-A", tipos.length >= 4, "se encuentran los avisos de digitales en el código", tipos);

const sinCara = tipos.filter((t) => !new RegExp(`${t}: "`).test(campanita));
check("AVI-B", sinCara.length === 0,
  "todos los avisos de digitales tienen su icono en la campanita", sinCara);

/* Y no todos el mismo: una VENTA no se puede ver igual que una devolución. */
const iconoDe = (t: string) => new RegExp(`${t}: "([^"]+)"`).exec(campanita)?.[1] ?? "";
check("AVI-C",
  iconoDe("DIGITAL_VENTA") !== "" && iconoDe("DIGITAL_VENTA") !== iconoDe("DIGITAL_DEVOLUCION"),
  "la venta y la devolución no se ven iguales");

/* ══════════════════════════════════════════════════════════════════════════
   Y SE TIENE QUE PODER LEER, EN LOS DOS LADOS
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ En la computadora no se veía ninguno: la campanita estaba sólo en la barra
   del celular, y armar un producto se hace en una computadora. */
check("AVI-D",
  /<NotificationBell userId=\{user\.id\} \/>/.test(layout) && /hidden lg:flex justify-end/.test(layout),
  "la campanita está en el panel de escritorio");

check("AVI-E",
  /<NotificationBell userId=\{user\.id\} \/>/.test(barra) && /lg:hidden fixed top-0/.test(barra),
  "y sigue estando en la barra del celular");

/* Va adentro del `main` y no flotando: como es un renglón de verdad, empuja al
   contenido en vez de taparle la esquina, y el desplegable no lo recorta el
   `overflow-hidden` de la franja lateral. */
check("AVI-F",
  layout.indexOf("hidden lg:flex justify-end") > layout.indexOf("<main"),
  "la campanita de escritorio va adentro del contenido, no flotando encima");

/* ══════════════════════════════════════════════════════════════════════════
   EL PUSH SE GASTA UNA VEZ
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ El permiso se pide en el panel de alguien que ENTRÓ y es de digitales, y en
   ningún otro lado. Las otras dos pantallas del mismo archivo —la de login y la
   de "esta cuenta es de otro panel"— lo siguen apagando, y está bien: pedirle
   permiso de notificaciones a alguien que ni siquiera entró es pedir por algo
   que no le va a llegar nunca.

   Este chequeo empezó escrito como "que la palabra no aparezca en el archivo", y
   se ponía en rojo por dos usos correctos. */
const bloqueDelPanel = layout.slice(layout.indexOf("<ProveedorDeSalida>") - 2000);
check("AVI-G",
  /<PWAManager[^>]*scope="\/digitales" \/>/.test(bloqueDelPanel) &&
  !/<PWAManager[^>]*disableNotifPrompt[^>]*>/.test(bloqueDelPanel),
  "el panel pide permiso de notificaciones, ahora que hay algo que mandar");

/* Y desde el 21/09/26, tampoco la puerta de "tu cuenta está cerrada": a quien
   cerró no le va a llegar ninguna venta que avisar. */
check("AVI-G2",
  (layout.match(/<PWAManager[^>]*disableNotifPrompt/g) ?? []).length === 3,
  "la pantalla de login, la de rol ajeno y la de cuenta cerrada siguen sin pedirlo");

/* ⚠️ UNO SOLO. Ni la devolución, ni la entrega fallida, ni la caída a Free. */
check("AVI-H",
  (cobro.match(/sendPushToUser\(/g) ?? []).length === 1,
  "el webhook manda un solo push, no uno por cada cosa que pasa");

check("AVI-I",
  !/sendPushToUser/.test(cron),
  "la caída a Free no interrumpe a nadie: se lee en la campanita");

/* Y el único que se manda es el de la venta, que es lo que justifica
   interrumpir: entró plata. */
const bloqueVenta = cobro.slice(cobro.indexOf('type: "DIGITAL_VENTA"'));
check("AVI-J",
  bloqueVenta.indexOf("sendPushToUser(") > 0 &&
  bloqueVenta.indexOf("sendPushToUser(") < bloqueVenta.indexOf("armadoDelMail"),
  "el push que se manda es el de la venta");

/* ⚠️ Con `despues`: sale a la red, a veces a un servicio que no contesta, y una
   venta ya cobrada no puede quedar esperando por un aviso. */
check("AVI-K",
  /despues\(\s*\(\) => sendPushToUser\(/.test(cobro),
  "el push no bloquea una venta ya cobrada");

/* La fila de la campanita se escribe ANTES y sin `despues`: si el push falla, la
   persona se entera igual al entrar. */
check("AVI-L",
  cobro.indexOf('type: "DIGITAL_VENTA"') < cobro.indexOf("sendPushToUser("),
  "primero se anota el aviso que se puede leer, después se intenta interrumpir");

/* Dos ventas distintas se ven las dos; la misma no se apila dos veces. */
check("AVI-M",
  /tag: `digital-venta-\$\{orden\.id\}`/.test(cobro),
  "dos ventas distintas se ven las dos en la pantalla de bloqueo");

/* ⚠️ Dice lo que LE QUEDA, no lo que se vendió. El bruto ya lo ve en Mercado
   Pago; el número que nadie le muestra es el de después de la comisión. */
check("AVI-N",
  /body: `\$\{plata\(orden\.total\)\} — te quedan \$\{plata\(leQueda\)\}/.test(cobro),
  "el push dice lo que le queda después de la comisión, no sólo el bruto");

/* ── 21/09/26: el aviso dice QUÉ se vendió, y el mail a quien vende ─────────
   Decía "¡Vendiste!" a secas: con cinco productos no se sabía cuál. Y el mail
   por venta es opcional (Store.avisoMailVentas), con `despues` como el push,
   al mail de la CUENTA (el de soporte es a donde le escriben los compradores). */
check("AVI-O",
  (cobro.match(/title: `¡Vendiste «\$\{queSeVendio\}»!`/g) ?? []).length === 2
  && /const \{ comoSeLlama: queSeVendio \} = armadoDelMail\(orden\.items\)/.test(cobro),
  "la campanita y el push dicen qué producto se vendió, con el mismo nombre que encabeza el mail de entrega");
check("AVI-P",
  /if \(orden\.store\.avisoMailVentas && orden\.store\.owner\.email\)/.test(cobro)
  && /despues\(\s*\(\) => sendVentaDigitalVendedorEmail\(\{\s*to: paraElVendedor,/.test(cobro)
  && /avisoMailVentas: true, owner: \{ select: \{ role: true, name: true, email: true \} \}/.test(cobro)
  && !/to: orden\.store\.supportEmail/.test(cobro),
  "el mail a quien vende sale sólo si lo prendió, sin bloquear la venta, y al mail de la cuenta");
const resendSrc = readFileSync("src/lib/resend.ts", "utf8");
const configApi = readFileSync("src/app/api/digitales/configuracion/route.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migracionAviso = readFileSync("prisma/migrations/20260921180000_aviso_mail_ventas/migration.sql", "utf8");
check("AVI-Q",
  /export async function sendVentaDigitalVendedorEmail/.test(resendSrc) && /RESEND_API_KEY no configurada/.test(resendSrc.slice(resendSrc.indexOf("sendVentaDigitalVendedorEmail")))
  && /escapeHtml\(producto\)/.test(resendSrc.slice(resendSrc.indexOf("sendVentaDigitalVendedorEmail")))
  && /avisoMailVentas\s+Boolean\s+@default\(false\)/.test(schema) && /ADD COLUMN IF NOT EXISTS "avisoMailVentas" BOOLEAN NOT NULL DEFAULT false/.test(migracionAviso)
  && /typeof avisoMailVentas !== "boolean"/.test(configApi) && /typeof avisoMailVentas === "boolean" \? \{ avisoMailVentas \}/.test(configApi),
  "el mail escapa lo que escribe la gente, falla sin clave en vez de callarse, y la opción es una columna con migración idempotente que la API sólo acepta como booleano");

console.log(fallos === 0
  ? "\nok — los avisos se pueden leer en los dos lados, y el push se gasta una vez"
  : `\nFALLA — ${fallos} chequeo(s) de los avisos`);
process.exit(fallos === 0 ? 0 : 1);
