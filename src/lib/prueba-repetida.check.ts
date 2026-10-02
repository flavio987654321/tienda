/* Corre con: npx tsx src/lib/prueba-repetida.check.ts */
import { readFileSync } from "node:fs";
import { huellaDeMail, dominiosParaBuscar } from "./prueba-repetida";
import { altaDigitalFreeSinPrueba, altaDigitalFree, pruebaYaUsada, getSubscriptionStatus, closureDeadline, TRIAL_CLOSURE_DAYS } from "./subscription";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}
const leer = (p: string) => readFileSync(p, "utf8");

/* ── El mismo mail, con otra cara ────────────────────────────────────────── */
check("PR-A", huellaDeMail(" Ana@Gmail.com ") === "ana@gmail.com"
  && huellaDeMail("a.n.a@gmail.com") === "ana@gmail.com"
  && huellaDeMail("ana+prueba2@gmail.com") === "ana@gmail.com"
  && huellaDeMail("ana@googlemail.com") === "ana@gmail.com",
  "en Gmail, los puntos, el +algo y googlemail.com son el mismo correo");
check("PR-B", huellaDeMail("ana+2@hotmail.com") === "ana@hotmail.com"
  && huellaDeMail("a.na@hotmail.com") === "a.na@hotmail.com",
  "fuera de Gmail se saca el +algo, pero los puntos sí cuentan (son otro correo)");
check("PR-C", dominiosParaBuscar("x@gmail.com").includes("googlemail.com") && dominiosParaBuscar("x@hotmail.com").join() === "hotmail.com",
  "en la base se busca Gmail con sus dos dominios");

/* ── Cómo nace la cuenta sin prueba ──────────────────────────────────────── */
const ahora = new Date("2026-01-02T12:00:00Z"); // en el pasado: closureDeadline mira el reloj real
const sinPrueba = { ...altaDigitalFreeSinPrueba(ahora), createdAt: ahora };
const conPrueba = { ...altaDigitalFree(ahora), createdAt: ahora };
check("PR-D", pruebaYaUsada(sinPrueba) && !pruebaYaUsada(conPrueba) && sinPrueba.tier === "FREE" && sinPrueba.status === "ACTIVE",
  "digital sin prueba: Free para siempre, y la prueba de Starter/Pro figura como usada");
const tiendaSinPrueba = { role: "OWNER", tier: "BASIC", status: "TRIAL", trialEndsAt: ahora, currentPeriodEnd: null, gracePeriodEndsAt: null };
check("PR-E", getSubscriptionStatus(tiendaSinPrueba, new Date(ahora.getTime() + 1000)) === "EXPIRED"
  && closureDeadline({ ...tiendaSinPrueba })?.getTime() === ahora.getTime() + TRIAL_CLOSURE_DAYS * 86400000,
  "tienda sin prueba: nace vencida (pide plan) y sigue el camino de siempre si no paga");

/* ── Cableado ────────────────────────────────────────────────────────────── */
const alta = leer("src/lib/alta-de-cuenta.ts");
check("PR-F", alta.includes("sinPrueba ? now : now + 7") && alta.includes("altaDigitalFreeSinPrueba()"),
  "el alta compartida arma la tienda y la cuenta digital sin prueba cuando corresponde");
for (const [id, archivo] of [["PR-G1", "src/app/api/auth/registro/route.ts"], ["PR-G2", "src/app/api/auth/registro/google/route.ts"]] as const) {
  const r = leer(archivo);
  check(id, r.includes("pruebaUsadaAntes(") && r.includes("{ sinPrueba }") && r.includes("sinPrueba,"),
    `${archivo.includes("google") ? "el alta con Google" : "el alta con mail"} pregunta si ya usó la prueba, y el mail de bienvenida se entera`);
}
const servidor = leer("src/lib/alta-google-servidor.ts");
check("PR-H", servidor.includes("deletedAccountAudit.findMany") && servidor.includes("subscriptionRole: tipo")
  && servidor.includes("huellaDeMail(c.originalEmail) === huella"),
  "se mira el registro legal de cuentas eliminadas, por producto y con la huella del mail");
const reg = leer("src/app/(auth)/registro/page.tsx");
check("PR-I", reg.includes("&& !data?.sinPrueba") && reg.includes('"&prueba=0"')
  && leer("src/app/(auth)/login/page.tsx").includes('searchParams.get("prueba") === "0"'),
  "no se le cuenta a Meta una prueba que no hubo, y el login le avisa");
check("PR-J", leer("src/lib/resend.ts").includes("Como ya usaste la prueba gratis con este mail"),
  "el mail de bienvenida no promete 7 días a quien ya los usó");

if (fallos) { console.log(`\n${fallos} chequeo(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
