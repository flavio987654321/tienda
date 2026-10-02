/* Corre con: npx tsx src/lib/alta-google.check.ts */
import { readFileSync } from "node:fs";
import {
  tieneGoogle, registroSinConfirmarConGoogle, altaPendiente, caminoSeguro, destinoTrasGoogle, esNavegadorDeApp,
} from "./alta-google";
import { estadoDeLaSesion, vencida } from "./sesion-admin";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}
const leer = (p: string) => readFileSync(p, "utf8");

/* ── Quién tiene Google ──────────────────────────────────────────────────── */
check("GO-A", tieneGoogle({ app_metadata: { providers: ["email", "google"] } })
  && tieneGoogle({ identities: [{ provider: "google" }] })
  && !tieneGoogle({ app_metadata: { providers: ["email"] } }) && !tieneGoogle(null),
  "se reconoce una cuenta con Google, y una de mail sola no");
const GOOGLE_LLEGO = "2026-10-02T06:04:02.921Z";
const conMailYGoogle = (confirmado: string | null, extra: Record<string, unknown> = {}) => ({
  email_confirmed_at: confirmado,
  app_metadata: { providers: ["email", "google"], ...extra },
  // email_verified en false A PROPÓSITO: así está en 11 de 17 cuentas reales, confirmadas o no.
  identities: [{ provider: "email", identity_data: { email_verified: false } }, { provider: "google", created_at: GOOGLE_LLEGO }],
});
check("GO-B", registroSinConfirmarConGoogle(conMailYGoogle(null))
  && registroSinConfirmarConGoogle(conMailYGoogle(GOOGLE_LLEGO))
  && !registroSinConfirmarConGoogle({ email_confirmed_at: null, identities: [{ provider: "email" }] }),
  "el robo por adelantado: Google llega a una cuenta con mail nunca confirmado (o confirmado recién por Google)");
check("GO-B2", !registroSinConfirmarConGoogle(conMailYGoogle("2026-05-24T22:39:00.266Z")),
  "EL CASO REAL del 02/10/26: cuenta confirmada en mayo que suma Google en octubre NO es un robo, aunque su identidad diga email_verified=false");
check("GO-B3", !registroSinConfirmarConGoogle(conMailYGoogle(null, { clave_anulada: true })),
  "a una cuenta ya se le anuló la contraseña una vez: no se repite en cada entrada");
const servidorG = leer("src/lib/alta-google-servidor.ts");
check("GO-B4", servidorG.includes("clave_anulada: true") && servidorG.indexOf("updateUserById(") < servidorG.indexOf("generateLink({ type: \"magiclink\"")
  && servidorG.includes("supabase.auth.verifyOtp({ email, token: codigo"),
  "anular la contraseña cierra todas las sesiones: se reabre la de quien acaba de entrar");
check("GO-B5", !leer("src/lib/alta-google.ts").includes("identity_data?.email_verified"),
  "nadie decide nada con identity_data.email_verified, que en esta base miente");

/* ── Alta a medio hacer ──────────────────────────────────────────────────── */
const vacio = { role: "BUYER", termsAcceptedAt: null, tieneTienda: false, tieneSuscripcion: false };
check("GO-C", altaPendiente(null) && altaPendiente(vacio), "sin perfil, o con el comprador vacío: le falta el alta");
check("GO-D", !altaPendiente({ ...vacio, termsAcceptedAt: new Date() })
  && !altaPendiente({ ...vacio, role: "OWNER" })
  && !altaPendiente({ ...vacio, tieneTienda: true })
  && !altaPendiente({ ...vacio, tieneSuscripcion: true }),
  "una cuenta que ya eligió algo nunca vuelve al alta (no se le puede cambiar el rol ni el plan)");

/* ── A dónde va ──────────────────────────────────────────────────────────── */
check("GO-E", caminoSeguro("//malo.com") === null && caminoSeguro("https://malo.com") === null
  && caminoSeguro("/\\malo.com") === null && caminoSeguro("/a\nb") === null && caminoSeguro("/dashboard") === "/dashboard",
  "el regreso solo va a caminos de este sitio");
check("GO-F", destinoTrasGoogle(true, "/registro?google=1&plan=owner&tier=PREMIUM") === "/registro?google=1&plan=owner&tier=PREMIUM"
  && destinoTrasGoogle(true, "/registro?plan=seller") === "/registro?plan=seller&google=1"
  && destinoTrasGoogle(true, "/dashboard") === "/registro?google=1"
  && destinoTrasGoogle(true, "//malo.com") === "/registro?google=1",
  "sin el alta terminada va al registro, con lo que ya había elegido");
check("GO-G", destinoTrasGoogle(false, "/registro?google=1") === "/panel"
  && destinoTrasGoogle(false, "/dashboard/pedidos") === "/dashboard/pedidos"
  && destinoTrasGoogle(false, "https://malo.com") === "/panel"
  && destinoTrasGoogle(false, null) === "/panel",
  "con la cuenta hecha va a donde iba, o a su panel");

/* ── Navegadores de apps ─────────────────────────────────────────────────── */
check("GO-H", esNavegadorDeApp("Mozilla/5.0 (iPhone) Instagram 300.0")
  && esNavegadorDeApp("Mozilla/5.0 [FBAN/FBIOS;FBAV/400]")
  && esNavegadorDeApp("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit")
  && !esNavegadorDeApp("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36")
  && !esNavegadorDeApp("Mozilla/5.0 (iPhone) Version/17 Mobile Safari/604.1"),
  "Instagram y Facebook muestran el aviso de abrir Chrome; Chrome y Safari, el botón");

/* ── El admin no entra con Google ────────────────────────────────────────── */
const conGoogleYCodigo = estadoDeLaSesion({
  currentLevel: "aal2", nextLevel: "aal2",
  currentAuthenticationMethods: [{ method: "totp", timestamp: Math.floor(Date.now() / 1000) }, { method: "oauth", timestamp: Math.floor(Date.now() / 1000) }],
});
check("GO-I", vencida(conGoogleYCodigo, Date.now(), Date.now()) === "sin-contrasena",
  "en el admin, una sesión de Google se corta aunque haya puesto el código");
const cb = leer("src/app/auth/callback/route.ts");
check("GO-J", cb.includes("esElAdmin(user.id, user.email)") && cb.includes('signOut({ scope: "local" })')
  && cb.indexOf("esElAdmin(") < cb.indexOf("destinoTrasGoogle("),
  "el regreso de Google le cierra la sesión al admin antes de mandarlo a ningún lado");
check("GO-K", leer("src/middleware.ts").includes("!estado.sinContrasena"), "el middleware mira Google también en las rutas del admin");

/* ── El alta con Google valida lo mismo que la de siempre ────────────────── */
const g = leer("src/app/api/auth/registro/google/route.ts");
const r = leer("src/app/api/auth/registro/route.ts");
check("GO-L", g.includes("validarDatosDeAlta(body)") && r.includes("validarDatosDeAlta(body)")
  && g.includes("nombreDeTiendaTomado(") && r.includes("nombreDeTiendaTomado(")
  && g.includes("perfilDeAlta(") && r.includes("perfilDeAlta("),
  "las dos puertas usan las mismas validaciones y arman el mismo perfil");
check("GO-M", g.includes("tieneGoogle(user)") && g.includes("tieneAltaPendiente(user.id)") && g.includes("esElAdmin(")
  && g.includes("checkRateLimit("),
  "el alta con Google solo sirve a una cuenta de Google, sin terminar, que no es el admin, y con límite");
check("GO-N", leer("src/components/BotonGoogle.tsx").includes("if (!GOOGLE_PRENDIDO"),
  "el botón queda apagado hasta configurar Google");
check("GO-O", leer("src/app/panel/page.tsx").includes('redirect("/registro?google=1")'),
  "quien entra al panel sin terminar el alta va a terminarla");

/* ── Lo que salió de la auditoría ────────────────────────────────────────── */
check("GO-P", caminoSeguro("/\t/malo.com") === null && caminoSeguro("/\n/malo.com") === null
  && caminoSeguro("/%09/malo.com") === "/%09/malo.com" && caminoSeguro("/x".repeat(1500)) === null,
  "un tab escondido no puede mandar a otro sitio (el navegador lo borra y queda //malo.com)");
const login = leer("src/app/(auth)/login/page.tsx");
const reg = leer("src/app/(auth)/registro/page.tsx");
check("GO-Q", login.includes("caminoSeguro(redirectTo)") && reg.includes("caminoSeguro(rawRedirect)"),
  "el login y el registro usan el mismo control para a dónde volver");
check("GO-R", /if \(enviando\.current\) return;/.test(reg) && (reg.match(/AbortSignal\.timeout\(/g) ?? []).length >= 3
  && reg.includes("enviando.current = false;"),
  "el alta no sale dos veces con doble click, y sin internet no queda girando (con techo de tiempo)");
const boton = leer("src/components/BotonGoogle.tsx");
check("GO-S", boton.includes('addEventListener("pageshow"') && boton.includes("if (yendoYa.current) return;"),
  "el botón de Google se destraba al volver atrás, y no sale dos veces");
check("GO-T", cb.includes("return await regreso(req, a);") && /catch \(e\)[\s\S]*signOut\(\{ scope: "local" \}\)[\s\S]*google=error/.test(cb),
  "si el regreso de Google falla, cierra la sesión y vuelve al login, nunca una pantalla de error");
check("GO-U", g.includes("$transaction(") && g.includes('where: { id: user.id, role: "BUYER", termsAcceptedAt: null }')
  && g.includes("reclamo.count === 0") && g.includes("existe?.banned"),
  "dos altas a la vez: la segunda no pisa a la primera; y una cuenta suspendida no se completa");
const auth = leer("src/components/AuthProvider.tsx");
check("GO-V", auth.includes("payload.altaPendiente") && auth.includes("(registro|terminos|privacidad)")
  && leer("src/app/api/auth/me/route.ts").includes("altaPendiente"),
  "quien no terminó el alta no anda por el sitio; los términos sí se pueden leer");
check("GO-W", auth.includes('signal: AbortSignal.timeout(15_000)') && auth.includes('addEventListener("online"'),
  "sin internet la sesión se reintenta y no queda cargando para siempre");

if (fallos) { console.log(`\n${fallos} chequeo(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
