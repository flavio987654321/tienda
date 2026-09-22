/**
 * Chequeos de cerrar y eliminar una cuenta de Productos Digitales.
 *
 *   npx tsx src/lib/cierre-digital.check.ts
 *
 * Lo que se cuida: que cerrar no borre nada y se pueda deshacer; que quien
 * compró siga descargando pase lo que pase con la cuenta; que la
 * confirmación la valide el servidor; y que al reabrir vuelva lo que estaba
 * publicado, y sólo eso, con el tope del plan de hoy.
 */

import { readFileSync } from "node:fs";
import { cerrarCuentaDigital, reabrirCuentaDigital } from "./cierre-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (p: string) => readFileSync(p, "utf8");

/* ── La lógica, con una base de mentira ─────────────────────────────────── */
type Llamada = { que: string; args: unknown };
const llamadas: Llamada[] = [];
const tx = {
  product: {
    updateMany: async (args: unknown) => { llamadas.push({ que: "product.updateMany", args }); return { count: 3 }; },
    count: async () => 0,
  },
  store: { update: async (args: unknown) => { llamadas.push({ que: "store.update", args }); return {}; } },
} as unknown as Parameters<typeof cerrarCuentaDigital>[0];

async function main() {
  const cuando = new Date("2026-09-21T15:00:00Z");
  const apagadas = await cerrarCuentaDigital(tx, "st1", cuando);
  const [p1, s1] = llamadas;
  check("CIE-A", apagadas === 3
    && JSON.stringify(p1.args) === JSON.stringify({ where: { storeId: "st1", deletedAt: null, isActive: true, rolDigital: { not: null } }, data: { isActive: false, pausadoPorCierre: true } })
    && JSON.stringify(s1.args) === JSON.stringify({ where: { id: "st1" }, data: { closedAt: cuando } }),
    "cerrar despublica lo publicado y lo MARCA, y deja la cuenta con closedAt; no borra ni toca nada más");

  llamadas.length = 0;
  const volvieron = await reabrirCuentaDigital(tx, "st1");
  const [p2, s2] = llamadas;
  check("CIE-B", volvieron === 3
    && JSON.stringify(p2.args) === JSON.stringify({ where: { storeId: "st1", deletedAt: null, pausadoPorCierre: true }, data: { isActive: true, pausadoPorCierre: false } })
    && JSON.stringify(s2.args) === JSON.stringify({ where: { id: "st1" }, data: { closedAt: null } }),
    "reabrir vuelve a publicar SÓLO lo que el cierre apagó (un borrador sigue en borrador) y limpia closedAt");

  /* ── La columna y su migración ───────────────────────────────────────── */
  const esquema = leer("prisma/schema.prisma");
  const migracion = leer("prisma/migrations/20260921210000_pausado_por_cierre/migration.sql");
  check("CIE-C", /pausadoPorCierre Boolean @default\(false\)/.test(esquema)
    && /ADD COLUMN IF NOT EXISTS "pausadoPorCierre" BOOLEAN NOT NULL DEFAULT false/.test(migracion),
    "la marca es una columna con migración idempotente");

  /* ── La ruta de cerrar ───────────────────────────────────────────────── */
  const cerrar = leer("src/app/api/digitales/cerrar/route.ts");
  check("CIE-D", /user\.role !== "DIGITAL"/.test(cerrar) && /checkRateLimit\(`cerrar-digital:\$\{user\.id\}`/.test(cerrar)
    && /isValidClosureReason\(reason\)/.test(cerrar) && /confirm\.trim\(\) !== store\.name/.test(cerrar)
    && /if \(store\.closedAt\) return/.test(cerrar) && /comentario\.length > CLOSURE_COMMENT_MAX/.test(cerrar),
    "cerrar pide sesión digital, tiene tope, valida el motivo, el largo del comentario y el nombre EN EL SERVIDOR, y no cierra dos veces");
  check("CIE-E", /prisma\.\$transaction\(async \(tx\) => \{\s*const apagadas = await cerrarCuentaDigital\(tx, store\.id\);\s*[\s\S]*?tx\.storeClosure\.create/.test(cerrar)
    && cerrar.indexOf("sendCuentaDigitalCerradaEmail(") > cerrar.indexOf("$transaction")
    && !/subscription\./.test(cerrar),
    "el cierre y su registro para el admin van en una transacción; el mail sale después del commit; la suscripción no se toca (no se renueva sola)");

  /* ── La ruta de reabrir ──────────────────────────────────────────────── */
  const reabrir = leer("src/app/api/digitales/reabrir/route.ts");
  check("CIE-F", /user\.role !== "DIGITAL"/.test(reabrir) && /if \(!store\.closedAt\) return/.test(reabrir)
    && /\$transaction\(\(tx\) => reabrirCuentaDigital\(tx, store\.id\)\)/.test(reabrir)
    && reabrir.indexOf("despublicarLasDeMas(store.id, tier)") > reabrir.indexOf("$transaction")
    && /isSubscriptionActive\(sub\) \? \(sub\.tier as TierDigital\) : "FREE"/.test(reabrir),
    "reabrir vuelve a publicar y DESPUÉS hace cumplir el tope del plan de hoy (Free si el plan venció mientras estuvo cerrada)");

  /* ── Quien compró sigue descargando: la promesa de las dos puertas ───── */
  const descargar = leer("src/app/api/digitales/descargar/[token]/route.ts");
  check("CIE-G", !/isActive|closedAt|isPublished/.test(descargar),
    "la descarga no mira si el producto está publicado ni si la cuenta está abierta: lo pagado se descarga igual");
  const cuenta = leer("src/app/api/cuenta/route.ts");
  const recoleccion = cuenta.slice(cuenta.indexOf("Recolectar archivos"), cuenta.indexOf("allFileUrls"));
  check("CIE-H", /user\.role === "DIGITAL" && userData\?\.store/.test(cuenta) && /soltarLosDominiosDe\(userData\.store\.id\)/.test(cuenta)
    && !/archivoPath/.test(recoleccion),
    "eliminar la cuenta despublica y suelta los dominios, pero NO borra los archivos vendidos: las descargas de quien pagó siguen");

  /* ── La puerta del panel ─────────────────────────────────────────────── */
  const layout = leer("src/app/digitales/layout.tsx");
  const puerta = layout.indexOf("if (cuenta?.closedAt)");
  check("CIE-I", puerta > 0 && puerta < layout.indexOf("estadoDelRecibimiento(user.id)") && puerta > layout.indexOf('user.role !== "DIGITAL"')
    && /<CuentaCerrada cerradaEl=\{cuenta\.closedAt\.toISOString\(\)\} vuelven=\{await pausadosPorCierreDe\(prisma, cuenta\.id\)\} exportar=/.test(layout)
    && /<PWAManager[^>]*disableNotifPrompt \/>\s*<PanelSplash[^>]*\/>\s*<CuentaCerrada/.test(layout),
    "con la cuenta cerrada el panel no existe: sólo la puerta de reabrir, después del rol y antes del recibimiento, sin pedir permiso de avisos");
  const gate = leer("src/app/digitales/CuentaCerrada.tsx");
  check("CIE-J", /fetch\("\/api\/digitales\/reabrir", \{ method: "POST" \}\)/.test(gate) && /enVuelo\.current/.test(gate)
    && /window\.location\.href = "\/digitales\/productos"/.test(gate) && /signOut\(enLaApp \? "\/digitales" : "\/"\)/.test(gate),
    "la puerta reabre con freno de doble click, lleva a Productos (donde ve lo que volvió), y cerrar sesión no saca de la app instalada");

  /* ── La zona de peligro ──────────────────────────────────────────────── */
  const zona = leer("src/app/digitales/configuracion/ZonaDePeligro.tsx");
  const tab = leer("src/app/digitales/configuracion/TabGeneral.tsx");
  check("CIE-K", /<ZonaDePeligro nombre=\{p\.nombreOriginal\} publicados=\{p\.publicados\} exportar=\{p\.exportar\} \/>/.test(tab)
    && !/NotaPendiente|Se prende cuando esté resuelto/.test(tab),
    "la zona confirma contra el nombre GUARDADO (no lo que esté escribiendo arriba), y ya no queda ningún botón apagado");
  check("CIE-L", /fetch\("\/api\/digitales\/cerrar"/.test(zona) && /confirmacion\.trim\(\) === nombre/.test(zona) && /motivo !== ""/.test(zona)
    && /fetch\("\/api\/cuenta", \{\s*method: "DELETE"/.test(zona) && /target: "account", confirm: email/.test(zona)
    && (zona.match(/enVuelo\.current = true/g) ?? []).length === 2
    && /mejor <strong>cerrá tu cuenta<\/strong>/.test(zona),
    "cerrar pide motivo y nombre; eliminar pide el mail y va por la ruta común de todas las cuentas; las dos con freno de doble click, y eliminar recomienda cerrar");

  /* ── El historial, sin reabrir ────────────────────────────────────────── */
  /* La competencia lo llama "tiendas archivadas": después de cerrar se puede
     consultar el historial. Acá es la misma cuenta, entera, y con plan pago
     se baja en .csv desde la puerta cerrada y antes de eliminar. */
  const cliente = leer("src/app/digitales/configuracion/ConfiguracionClient.tsx");
  check("CIE-N", /exportar=\{puedeVer\(tier, "exportar"\)\}/.test(layout)
    && /href="\/api\/digitales\/ventas\/exportar"/.test(gate) && /descargalo ahora \(\.csv\)/.test(gate) && /lo ves en Ventas al reabrir/.test(gate)
    && /exportar=\{puedeVer\(p\.tier, "exportar"\)\}/.test(cliente) && /exportar=\{p\.exportar\}/.test(tab)
    && /\{exportar && \(/.test(zona) && /href="\/api\/digitales\/ventas\/exportar"/.test(zona) && /antes de eliminar/.test(zona),
    "el historial de ventas se baja en .csv desde la puerta de cuenta cerrada y desde el modal de eliminar, si el plan lo incluye; en Free se ve al reabrir");

  /* ── El mail ─────────────────────────────────────────────────────────── */
  const resend = leer("src/lib/resend.ts");
  const mail = resend.slice(resend.indexOf("export async function sendCuentaDigitalCerradaEmail"));
  check("CIE-M", /RESEND_API_KEY no configurada/.test(mail) && /escapeHtml\(storeName\)/.test(mail) && /escapeHtml\(reason\)/.test(mail)
    && /sus descargas siguen andando/.test(mail) && /No te cobramos nada/.test(mail) && /\/digitales"/.test(mail),
    "el mail de cierre falla sin clave en vez de callarse, escapa lo que escribe la gente, y dice lo que importa: descargas siguen, no se cobra, cómo reabrir");

  console.log(fallos === 0
    ? "\nok — cerrar no borra nada y se deshace; quien compró sigue descargando"
    : `\nFALLA — ${fallos} chequeo(s) del cierre digital`);
  process.exit(fallos === 0 ? 0 : 1);
}
main();
