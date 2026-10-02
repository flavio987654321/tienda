/* Corre con: npx tsx src/lib/sesion-admin.check.ts */
import { readFileSync } from "node:fs";
import {
  estadoDeLaSesion, vencida, cuentaComoActividad, firmarActividad, leerActividad,
  INACTIVIDAD_MS, TOPE_MS, ESPERA_CODIGO_MS,
} from "./sesion-admin";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}

const AHORA = Date.UTC(2026, 9, 1, 12);
const MIN = 60 * 1000;
const seg = (ms: number) => Math.floor(ms / 1000);

const conCodigo = (hace: number) => estadoDeLaSesion({
  currentLevel: "aal2", nextLevel: "aal2",
  currentAuthenticationMethods: [
    { method: "totp", timestamp: seg(AHORA - hace) },
    { method: "password", timestamp: seg(AHORA - hace - MIN) },
  ],
});
const esperando = (hace: number, metodo = "password") => estadoDeLaSesion({
  currentLevel: "aal1", nextLevel: "aal2",
  currentAuthenticationMethods: [{ method: metodo, timestamp: seg(AHORA - hace) }],
});

/* ── Los tres topes ──────────────────────────────────────────────────────── */
check("SA-A", vencida(conCodigo(5 * MIN), AHORA - 2 * MIN, AHORA) === null, "recién entrado y moviéndose: sigue");
check("SA-B", vencida(conCodigo(3 * 60 * MIN), AHORA - INACTIVIDAD_MS - MIN, AHORA) === "inactividad",
  "más de una hora quieto: se corta");
check("SA-C", vencida(conCodigo(3 * 60 * MIN), AHORA - INACTIVIDAD_MS + MIN, AHORA) === null,
  "59 minutos quieto: todavía no");
check("SA-D", vencida(conCodigo(TOPE_MS + MIN), AHORA - MIN, AHORA) === "tope",
  "más de doce horas desde el código: se corta aunque se esté moviendo");
check("SA-E", vencida(conCodigo(2 * 60 * MIN), null, AHORA) === "inactividad"
  && vencida(conCodigo(10 * MIN), null, AHORA) === null,
  "sin cookie se cuenta desde que pasó el código: borrarla no estira nada");
check("SA-F", vencida(esperando(ESPERA_CODIGO_MS + MIN), null, AHORA) === "espera-codigo"
  && vencida(esperando(ESPERA_CODIGO_MS - MIN), null, AHORA) === null,
  "en la pantalla del código: a los diez minutos se corta, antes no");
check("SA-G", vencida(esperando(MIN, "otp"), null, AHORA) === "sin-contrasena"
  && vencida(esperando(MIN, "oauth"), null, AHORA) === "sin-contrasena",
  "al admin no se entra sin contraseña (código por mail o Google): se corta en el acto");
check("SA-H", vencida(estadoDeLaSesion({
  currentLevel: "aal1", nextLevel: "aal1",
  currentAuthenticationMethods: [{ method: "password", timestamp: seg(AHORA - 30 * 24 * 60 * MIN) }],
}), null, AHORA) === null,
  "sin segundo factor (tiendas, afiliados, digitales) nunca vence por esto");
check("SA-I", vencida(estadoDeLaSesion(null), null, AHORA) === null
  && vencida(estadoDeLaSesion({ currentLevel: "aal2", nextLevel: "aal2", currentAuthenticationMethods: ["totp"] }), null, AHORA) === null,
  "datos raros o sin fechas no cortan a nadie (falla abierto)");
check("SA-J", vencida(conCodigo(30 * MIN), AHORA - 3 * 60 * MIN, AHORA) === null,
  "una actividad anterior al código (de otra sesión) no cuenta: vale la del código");

/* ── Qué cuenta como moverse ─────────────────────────────────────────────── */
check("SA-K", cuentaComoActividad({ pathname: "/admin/tiendas", method: "GET", prefetch: false })
  && cuentaComoActividad({ pathname: "/api/admin/avisos", method: "POST", prefetch: false })
  && cuentaComoActividad({ pathname: "/api/admin/avisos/x", method: "DELETE", prefetch: false }),
  "abrir una página o hacer algo cuenta");
check("SA-L", !cuentaComoActividad({ pathname: "/api/admin/badges", method: "GET", prefetch: false })
  && !cuentaComoActividad({ pathname: "/admin/tiendas", method: "GET", prefetch: true }),
  "los contadores que se piden solos y los prefetch no mantienen viva la sesión");

/* ── La cookie ───────────────────────────────────────────────────────────── */
const SECRETO = "secreto-de-prueba";
const USUARIO = "00000000-0000-0000-0000-000000000001";
const CODIGO = AHORA - 30 * MIN;
void (async () => {
  const buena = await firmarActividad(SECRETO, USUARIO, CODIGO, AHORA - MIN);
  check("SA-M", await leerActividad(SECRETO, USUARIO, CODIGO, buena, AHORA) === AHORA - MIN,
    "la cookie firmada por nosotros se lee");
  const [, firma] = buena.split(".");
  check("SA-N", await leerActividad(SECRETO, USUARIO, CODIGO, `${AHORA}.${firma}`, AHORA) === null,
    "cambiarle la fecha rompe la firma");
  check("SA-O", await leerActividad(SECRETO, USUARIO, CODIGO + 1000, buena, AHORA) === null
    && await leerActividad(SECRETO, "00000000-0000-0000-0000-000000000002", CODIGO, buena, AHORA) === null,
    "una cookie de otra sesión u otra persona no sirve");
  check("SA-P", await leerActividad(SECRETO, USUARIO, CODIGO, await firmarActividad(SECRETO, USUARIO, CODIGO, AHORA + 10 * MIN), AHORA) === null
    && await leerActividad(SECRETO, USUARIO, CODIGO, "basura", AHORA) === null
    && await leerActividad(SECRETO, USUARIO, CODIGO, undefined, AHORA) === null,
    "fechas futuras, basura o sin cookie: null");

  /* ── Cableado ──────────────────────────────────────────────────────────── */
  const mw = readFileSync("src/middleware.ts", "utf8");
  check("SA-Q", /RUTAS_DEL_ADMIN\s*=\s*\/\^\\\/\(admin\|api\\\/admin\|verificar-2fa\|api\\\/verificar-2fa\)/.test(mw)
    && mw.includes("vigilarSesionAdmin(request, res, supabase, userId, cookiesDeSupabase)"),
    "el middleware vigila el panel, sus endpoints y la pantalla del código");
  check("SA-R", mw.includes('signOut({ scope: "local" })') && mw.includes("corte.cookies.delete(COOKIE_ACTIVIDAD)"),
    "al cortar se revoca la sesión en Supabase, no solo en el navegador");
  check("SA-S", readFileSync("src/app/admin/AdminSidebar.tsx", "utf8").includes("d?.sesionVencida")
    && readFileSync("src/app/verificar-2fa/Verificar2faClient.tsx", "utf8").includes("data.sesionVencida"),
    "el panel abierto y la pantalla del código se enteran y van al login");

  if (fallos) { console.log(`\n${fallos} chequeo(s) fallaron`); process.exit(1); }
  console.log("\nTodo bien");
})();
