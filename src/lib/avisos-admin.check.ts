/* Corre con: npx tsx src/lib/avisos-admin.check.ts */
import { readFileSync } from "node:fs";
import { validarAviso, validarAudiencia, linkDelBoton, leToca, elegirAviso, conNombre, type AvisoParaElegir } from "./avisos-admin";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}

const AHORA = new Date("2026-10-01T12:00:00Z");
const DIA = 24 * 60 * 60 * 1000;
const base = { titulo: "Hola", texto: "Texto", roles: ["DIGITAL"] };

/* ── Validación ──────────────────────────────────────────────────────────── */
check("AV-A", validarAviso(base, AHORA).ok, "un aviso con título, texto y un panel se acepta");
check("AV-B", !validarAviso({ ...base, titulo: "   " }, AHORA).ok, "sin título no");
check("AV-C", !validarAviso({ ...base, roles: [] }, AHORA).ok && !validarAviso({ ...base, roles: ["ADMIN", "BUYER"] }, AHORA).ok,
  "sin panel, o con paneles que no existen, no");
check("AV-D", !validarAviso({ ...base, botonTexto: "Escribinos" }, AHORA).ok && !validarAviso({ ...base, botonLink: "https://x.com" }, AHORA).ok,
  "el botón va entero: texto sin link o link sin texto se rechaza");
check("AV-E", !validarAviso({ ...base, botonTexto: "x", botonLink: "javascript:alert(1)" }, AHORA).ok
  && !validarAviso({ ...base, botonTexto: "x", botonLink: "http://x.com" }, AHORA).ok
  && !validarAviso({ ...base, botonTexto: "x", botonLink: "data:text/html,hola" }, AHORA).ok,
  "el link del botón sólo puede ser https: nada de javascript:, http: ni data:");
check("AV-F", linkDelBoton("2254447183") === "https://wa.me/5492254447183"
  && linkDelBoton("02254 447183") === "https://wa.me/5492254447183"
  && linkDelBoton("+54 9 2254 447183") === "https://wa.me/5492254447183",
  "un número suelto se vuelve un link de WhatsApp con el 549 adelante");
check("AV-G", (() => { const r = validarAviso({ ...base, titulo: "a\u0000b\u0007c", texto: "uno\r\ndos\n\n\n\ntres" }, AHORA); return r.ok && r.aviso.titulo === "a b c" && r.aviso.texto === "uno\ndos\n\ntres"; })(),
  "saca los caracteres de control; el texto conserva los párrafos pero no más de un renglón en blanco");
check("AV-H", (() => { const r = validarAviso({ ...base, titulo: "x".repeat(500), texto: "y".repeat(5000) }, AHORA); return r.ok && r.aviso.titulo.length === 90 && r.aviso.texto.length === 600; })(),
  "título y texto tienen tope de largo");
check("AV-I", !validarAviso({ ...base, soloNuevosDias: 0 }, AHORA).ok && !validarAviso({ ...base, soloNuevosDias: 91 }, AHORA).ok
  && !validarAviso({ ...base, soloNuevosDias: 2.5 }, AHORA).ok && validarAviso({ ...base, soloNuevosDias: 7 }, AHORA).ok,
  '"sólo los nuevos" va de 1 a 90 días enteros');
check("AV-J", !validarAviso({ ...base, desde: "2026-10-05", hasta: "2026-10-02" }, AHORA).ok,
  "la fecha de fin no puede ser antes de la de inicio");
check("AV-J2", !validarAviso({ ...base, hasta: "2026-09-30T12:00:00Z" }, AHORA).ok && validarAviso({ ...base, hasta: "2026-10-08T12:00:00Z" }, AHORA).ok,
  "una fecha de fin que ya pasó se rechaza: el aviso no lo vería nadie");
check("AV-K", (() => { const r = validarAviso({ ...base, tono: "constructor" }, AHORA); return r.ok && r.aviso.tono === "verde"; })(),
  "un tono que no existe cae en verde (y 'constructor' no se cuela desde el prototipo)");

/* ── A quién le toca ─────────────────────────────────────────────────────── */
const aviso = (extra: Partial<AvisoParaElegir> = {}): AvisoParaElegir => ({
  id: "a", roles: ["DIGITAL"], soloNuevosDias: null, desde: new Date(AHORA.getTime() - DIA), hasta: null, activo: true, createdAt: new Date(AHORA.getTime() - DIA), ...extra,
});
const jorge = { id: "u-jorge", role: "DIGITAL", createdAt: new Date(AHORA.getTime() - 1 * DIA) };
const viejo = { id: "u-viejo", role: "DIGITAL", createdAt: new Date(AHORA.getTime() - 40 * DIA) };

check("AV-L", leToca(aviso(), jorge, AHORA) && !leToca(aviso(), { ...jorge, role: "OWNER" }, AHORA),
  "le toca a los paneles elegidos y a los demás no");
check("AV-M", leToca(aviso({ soloNuevosDias: 7 }), jorge, AHORA) && !leToca(aviso({ soloNuevosDias: 7 }), viejo, AHORA),
  '"sólo los nuevos" le sale a quien llegó hace 1 día y no a quien tiene 40');
check("AV-N", !leToca(aviso({ activo: false }), jorge, AHORA)
  && !leToca(aviso({ desde: new Date(AHORA.getTime() + DIA) }), jorge, AHORA)
  && !leToca(aviso({ hasta: new Date(AHORA.getTime() - 1000) }), jorge, AHORA),
  "apagado, programado para después o vencido: no sale");
check("AV-O", (() => {
  const a = aviso({ id: "viejo", desde: new Date(AHORA.getTime() - 3 * DIA) });
  const b = aviso({ id: "nuevo", desde: new Date(AHORA.getTime() - 1 * DIA) });
  return elegirAviso([a, b], jorge, new Set(), AHORA)?.id === "nuevo"
    && elegirAviso([a, b], jorge, new Set(["nuevo"]), AHORA)?.id === "viejo"
    && elegirAviso([a, b], jorge, new Set(["nuevo", "viejo"]), AHORA) === null;
})(), "sale uno solo, el más nuevo; cerrado no vuelve y deja pasar al siguiente");

/* ── Lo que le falta y a una persona ───────────────────────────────────── */
check("AV-R", validarAudiencia({ roles: ["DIGITAL", "OWNER"], condicion: "SIN_MP" }).ok
  && !validarAudiencia({ roles: ["DIGITAL", "SELLER"], condicion: "SIN_MP" }).ok
  && !validarAudiencia({ roles: ["OWNER"], condicion: "SIN_ARCHIVO" }).ok,
  "una condición sólo va a los paneles donde tiene sentido: sin Mercado Pago no le aplica a Afiliados, ni el archivo a Tiendas");
check("AV-S", !validarAudiencia({ roles: ["DIGITAL"], condicion: "constructor" }).ok && !validarAudiencia({ roles: ["DIGITAL"], condicion: "BORRAR_TODO" }).ok,
  "una condición inventada se rechaza");
check("AV-T", (() => { const r = validarAudiencia({ paraUserId: "00000000-0000-4000-8000-000000000001", roles: [], soloNuevosDias: 7, condicion: "SIN_MP" });
  return r.ok && r.audiencia.paraUserId !== null && r.audiencia.soloNuevosDias === null && r.audiencia.condicion === null; })()
  && !validarAudiencia({ paraUserId: "x' OR 1=1" }).ok,
  "a una persona: no hace falta panel, se ignoran los nuevos y la condición, y un id raro se rechaza");
check("AV-U", (() => {
  const solo = aviso({ id: "solo", paraUserId: "u-jorge", desde: new Date(AHORA.getTime() - 5 * DIA) });
  const general = aviso({ id: "general", desde: new Date(AHORA.getTime() - 1 * DIA) });
  return !leToca(solo, viejo, AHORA) && elegirAviso([general, solo], jorge, new Set(), AHORA)?.id === "solo"
    && elegirAviso([general, solo], viejo, new Set(), AHORA)?.id === "general";
})(), "el aviso para una persona sólo lo ve ella, y le gana a los generales aunque sea más viejo");

/* ── Las rutas: lo personal es de su dueña ─────────────────────────────── */
/* La consulta vive en `avisosParaElPanel`; la ruta y las páginas la llaman. */
const rutaGet = readFileSync("src/lib/avisos-admin-servidor.ts", "utf8");
const rutaAccion = readFileSync("src/app/api/avisos/[id]/route.ts", "utf8");
check("AV-V", rutaGet.includes("paraUserId: null, roles: { has: user.role") && rutaGet.includes("paraUserId: user.id,"),
  "el panel trae los generales de su rol y SÓLO sus personales, en consultas aparte (un tope no los deja afuera)");
check("AV-W", rutaAccion.includes("OR: [{ paraUserId: null }, { paraUserId: user.id }]"),
  "cerrar, votar o marcar visto un aviso personal ajeno no se puede: sólo el propio");

/* ── El nombre ───────────────────────────────────────────────────────────── */
check("AV-P", conNombre("Hola {nombre}, bienvenido", "Jorge Sosa") === "Hola Jorge, bienvenido",
  "{nombre} pone sólo el primer nombre");
check("AV-Q", conNombre("Hola {nombre}, bienvenido", null) === "Hola, bienvenido" && conNombre("¡Hola {nombre}!", "  ") === "¡Hola!",
  'sin nombre no queda "Hola ," ni la marca a la vista');

const cartel = readFileSync("src/components/AvisoDelPanel.tsx", "utf8");
check("AV-X", readFileSync("src/app/api/avisos/route.ts", "utf8").includes("avisosParaElPanel(user)")
  && ["src/app/digitales/page.tsx", "src/app/dashboard/page.tsx"].every((p) => {
    const pag = readFileSync(p, "utf8");
    return pag.includes("avisosParaElPanel(user).catch(() => undefined)") && !pag.includes("<AvisoDelPanel />");
  })
  && cartel.includes("if (!yaVinieron.current) { traer(); return; }") && cartel.includes("conLoDeLaPestana(iniciales ?? [])"),
  "el inicio de tiendas y de digitales trae el aviso con el panel (no aparece un segundo después); si falla, el cartel lo pide solo");
check("AV-Y", /const CERRADOS_EN_LA_PESTANA = new Set/.test(cartel) && cartel.includes("useRef(CERRADOS_EN_LA_PESTANA)")
  && cartel.includes("VOTOS_EN_LA_PESTANA.set(id, nuevo)"),
  "al volver con \"atrás\" no reaparece el aviso recién cerrado ni se pierde el voto (la página vieja trae los avisos como estaban)");

if (fallos) { console.log(`\n${fallos} fallo(s).`); process.exit(1); }
console.log("\nok — los avisos le llegan a quien tienen que llegar, y nada más");
