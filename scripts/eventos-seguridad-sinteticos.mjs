import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const PREFIJO_PRUEBA = "security-test-";
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1"]);
const DB_LOCAL_O_PRUEBA = /(?:^|[_-])(?:local|test|testing|dev|development)(?:[_-]|$)/i;

class SafeFixtureError extends Error {}

function validarDestinoLocal() {
  for (const nombre of ["DATABASE_URL", "DIRECT_URL"]) {
    const valor = process.env[nombre];
    if (!valor) throw new SafeFixtureError("Falta una configuración de base requerida.");

    let url;
    try {
      url = new URL(valor);
    } catch {
      throw new SafeFixtureError("La configuración de base no tiene un formato válido.");
    }

    const base = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (
      !HOSTS_LOCALES.has(url.hostname.toLowerCase())
      || !DB_LOCAL_O_PRUEBA.test(base)
    ) {
      throw new SafeFixtureError("Prueba cancelada: solo se permiten bases locales con nombre de desarrollo o prueba.");
    }
  }
}

function validarIdPrueba(value) {
  if (!new RegExp(`^${PREFIJO_PRUEBA}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, "i").test(value ?? "")) {
    throw new SafeFixtureError("El identificador de prueba no es válido; no se borró ningún evento.");
  }
  return value;
}

function escaparHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function resumenCompartible({ type, count, status, date }) {
  const route = "omitida para proteger datos de la ruta";
  const meaning = type === "SERVER_ERROR"
    ? "El servidor encontró un fallo al procesar una solicitud."
    : "Se alcanzó un límite de frecuencia; esto puede deberse a reintentos y no confirma automatización maliciosa.";
  const next = type === "SERVER_ERROR"
    ? "Revisar los registros de la aplicación alrededor de esa hora y comprobar si el error se repite."
    : "Comparar hora, tipo y cantidad; comprobar si usuarios legítimos también tuvieron problemas.";
  return [
    "Necesito ayuda para investigar esta alerta técnica de TiendaApps.",
    `Qué significa: ${meaning}`,
    `Qué revisar: ${next}`,
    `Ruta: ${route}.`,
    ...(status ? [`Código HTTP: ${status}.`] : []),
    ...(count ? [`Cantidad agrupada: ${count}.`] : []),
    `Fecha y hora: ${date.toISOString()}.`,
    "No incluyo huellas, identificadores de solicitud, credenciales ni datos personales.",
    "Explicá causas probables, cómo confirmarlas con registros seguros y una solución de bajo riesgo. No concluyas que hubo un ataque sin evidencia.",
  ].join("\n");
}

function crearVistaHtml(eventos) {
  const ultimaPrueba = eventos[0]?.requestId;
  if (!ultimaPrueba) throw new SafeFixtureError("No se encontraron eventos ficticios para mostrar.");
  const prueba = eventos.filter((evento) => evento.requestId === ultimaPrueba);
  const errorGrave = prueba.find((evento) => evento.kind === "SERVER_ERROR" && (evento.status ?? 0) >= 500);
  const repetidos = new Map();

  for (const evento of prueba) {
    if (!evento.ipFingerprint) continue;
    const key = [evento.ipFingerprint, evento.route, evento.kind, evento.origin].join("|");
    const grupo = repetidos.get(key) ?? {
      ipFingerprint: evento.ipFingerprint,
      route: evento.route,
      kind: evento.kind,
      origin: evento.origin,
      count: 0,
      firstAt: evento.createdAt,
      lastAt: evento.createdAt,
    };
    grupo.count += 1;
    if (evento.createdAt < grupo.firstAt) grupo.firstAt = evento.createdAt;
    if (evento.createdAt > grupo.lastAt) grupo.lastAt = evento.createdAt;
    repetidos.set(key, grupo);
  }

  const alertaRepetida = [...repetidos.values()].find((grupo) => grupo.count >= 10);
  const formato = (date) => new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
  const filaEvento = (evento) => `
    <tr>
      <td>${escaparHtml(formato(evento.createdAt))}</td>
      <td>${evento.kind === "SERVER_ERROR" ? "Error técnico" : "Límite excedido"}<br><small>${escaparHtml(evento.origin === "UNKNOWN" ? "Origen no determinado" : "Señal automatizada")}</small></td>
      <td><code>${escaparHtml(evento.method)} ${escaparHtml(evento.route)}</code><br><small>HTTP ${escaparHtml(evento.status ?? "—")}</small></td>
      <td>Evento ficticio creado para probar el panel.</td>
    </tr>`;

  const alertas = [
    ...(errorGrave ? [`
      <li class="grave">
        <strong>Error técnico · HTTP ${escaparHtml(errorGrave.status)}</strong>
        <p>Qué significa: el servidor encontró un fallo al procesar una solicitud.</p>
        <p>Qué revisar: mirá los registros de la aplicación y Sentry alrededor de esa hora; fijate si volvió a pasar.</p>
        <p>No prueba un ataque: también puede ser un error de código o de un servicio externo.</p>
        <small>${escaparHtml(formato(errorGrave.createdAt))}</small>
        <button class="copy-summary" data-copy="${escaparHtml(resumenCompartible({
          type: errorGrave.kind,
          status: errorGrave.status,
          date: errorGrave.createdAt,
        }))}">Copiar resumen seguro</button>
      </li>`] : []),
    ...(alertaRepetida ? [`
      <li class="repetida">
        <strong>${alertaRepetida.count} eventos repetidos · Límite excedido</strong>
        <p>Qué significa: se agruparon varios intentos similares desde una misma huella temporal.</p>
        <p>Qué revisar: compará hora, ruta y cantidad; comprobá si usuarios legítimos tuvieron problemas.</p>
        <p>No confirma que sea un bot ni un intento de hackeo; varias personas pueden compartir una conexión.</p>
        <small>${escaparHtml(formato(alertaRepetida.lastAt))}</small>
        <button class="copy-summary" data-copy="${escaparHtml(resumenCompartible({
          type: alertaRepetida.kind,
          count: alertaRepetida.count,
          date: alertaRepetida.lastAt,
        }))}">Copiar resumen seguro</button>
      </li>`] : []),
  ];
  const alertasHtml = alertas.length
    ? `<ul>${alertas.join("")}</ul>`
    : '<p class="muted">La última prueba no cumple las reglas activas.</p>';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vista local de alertas de seguridad</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#030712;color:#e5e7eb;font:14px Arial,sans-serif}
main{max-width:1100px;margin:auto}.aviso{padding:12px 16px;border:1px solid #38bdf8;border-radius:12px;color:#bae6fd;background:#0c4a6e55}
h1{margin:24px 0 6px;color:white}h2{margin:0;color:white;font-size:16px}.muted,small{color:#9ca3af}.cards{display:flex;gap:12px;margin:20px 0}.card,.panel{background:#111827;border:1px solid #ffffff12;border-radius:12px;padding:16px}.card{flex:1}.card strong{display:block;font-size:28px;margin-top:10px;color:#fca5a5}.card:nth-child(2) strong{color:#fcd34d}
.panel{margin:16px 0}.alert{padding:14px 16px;background:#f59e0b0d;border:1px solid #f59e0b55;border-radius:10px}.alert ul{padding:0;list-style:none}.alert li{padding:10px;margin-top:8px;border-radius:8px;background:#ffffff08}.grave{color:#fecaca}.repetida{color:#fde68a}.copy-summary{display:block;margin-top:10px;padding:7px 10px;border:1px solid #ffffff30;border-radius:6px;background:#ffffff0a;color:#f3f4f6;cursor:pointer}.copy-summary:hover{background:#ffffff18}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #ffffff12;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#9ca3af}code{color:#d1d5db;font-size:12px}small{font-size:11px}
@media(max-width:700px){body{padding:16px}.cards{display:block}.card{margin:8px 0}table{font-size:12px}.panel{overflow:auto}}
</style></head><body><main>
<div class="aviso"><strong>Vista de prueba local</strong> · Solo datos ficticios guardados en Docker. No es el Admin real y no se conectó a Supabase.</div>
<h1>Seguridad</h1><p class="muted">Errores y actividad sospechosa · Ejemplo sintético</p>
<div class="cards"><div class="card">Errores técnicos<strong>${prueba.filter((evento) => evento.kind === "SERVER_ERROR").length}</strong></div><div class="card">Señales automatizadas<strong>${prueba.filter((evento) => evento.origin === "AUTOMATION_SIGNAL").length}</strong></div><div class="card">Eventos de cuentas<strong>${prueba.filter((evento) => evento.origin === "REGISTERED_USER").length}</strong></div></div>
<section class="panel alert"><h2>Alertas activas · ${alertas.length}</h2><p class="muted">Reglas: error 5xx o 10 eventos iguales dentro de 5 minutos.</p>${alertasHtml}<p class="muted">Una repetición es una señal para revisar; no confirma que sea un bot.</p></section>
<section class="panel"><h2>Eventos sintéticos · ${prueba.length}</h2><table><thead><tr><th>Cuándo</th><th>Tipo / origen</th><th>Ruta</th><th>Detalle</th></tr></thead><tbody>${prueba.map(filaEvento).join("")}</tbody></table></section>
</main><script>
document.querySelectorAll(".copy-summary").forEach(button => button.addEventListener("click", async () => {
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(button.dataset.copy || "");
    button.textContent = "Copiado";
    setTimeout(() => { button.textContent = original; }, 2000);
  } catch {
    button.textContent = "No se pudo copiar; revisá permisos del navegador";
  }
}));
</script></body></html>`;
}

async function main() {
  const [confirmacion, accion, identificador] = process.argv.slice(2);
  if (confirmacion !== "--confirm-local-only") {
    throw new SafeFixtureError("Falta confirmar que esta operación es solo para una base local.");
  }

  validarDestinoLocal();

  if (accion === "migrate") {
    const prismaCli = resolve(process.cwd(), "node_modules", "prisma", "build", "index.js");
    if (!existsSync(prismaCli))     throw new SafeFixtureError("No se encontró Prisma CLI local.");
    try {
      execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "ignore",
      });
    } catch {
      throw new SafeFixtureError("No se pudo aplicar la migración local. No se muestran detalles de conexión.");
    }
    console.log("Migraciones pendientes aplicadas a la base local permitida.");
    return;
  }

  if (accion !== "seed" && accion !== "cleanup" && accion !== "preview") {
    throw new SafeFixtureError("Uso: security:fixtures -- --confirm-local-only migrate | seed | preview | cleanup <identificador>");
  }

  const prisma = new PrismaClient();
  try {
    if (accion === "preview") {
      const eventos = await prisma.securityEvent.findMany({
        where: { reason: "synthetic_security_test", requestId: { startsWith: PREFIJO_PRUEBA } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const archivo = resolve(tmpdir(), "tienda-vista-alertas-sinteticas.html");
      writeFileSync(archivo, crearVistaHtml(eventos), "utf8");
      console.log("Vista local generada con eventos ficticios. Abrí el archivo indicado:");
      console.log(archivo);
      return;
    }

    if (accion === "seed") {
      const id = `${PREFIJO_PRUEBA}${randomUUID()}`;
      const route = `/__security_test__/${id}`;
      const fingerprint = createHash("sha256").update(id).digest("hex").slice(0, 24);

      await prisma.securityEvent.createMany({
        data: [
          {
            kind: "SERVER_ERROR",
            origin: "UNKNOWN",
            route,
            method: "GET",
            status: 500,
            reason: "synthetic_security_test",
            errorName: "SyntheticTestError",
            requestId: id,
            ipFingerprint: fingerprint,
          },
          ...Array.from({ length: 10 }, () => ({
            kind: "RATE_LIMITED",
            origin: "AUTOMATION_SIGNAL",
            route,
            method: "POST",
            status: 429,
            reason: "synthetic_security_test",
            requestId: id,
            ipFingerprint: fingerprint,
          })),
        ],
      });

      console.log("Se insertaron 11 eventos sintéticos. Revisá Admin → Seguridad.");
      console.log(`Identificador para limpiar esta prueba: ${id}`);
      return;
    }

    const id = validarIdPrueba(identificador);
    const resultado = await prisma.securityEvent.deleteMany({ where: { requestId: id } });
    console.log(`Se eliminaron ${resultado.count} eventos sintéticos de esa prueba.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof SafeFixtureError
      ? error.message
      : "Falló la prueba sintética. Se omitieron los detalles de conexión por seguridad.",
  );
  process.exitCode = 1;
});
