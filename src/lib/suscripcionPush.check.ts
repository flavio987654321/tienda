/**
 * Chequeo de la validación de suscripciones push. Se corre con:
 *
 *   npx tsx src/lib/suscripcionPush.check.ts
 */
import { endpointDePushValido, leerSuscripcionPush } from "./suscripcionPush";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };

const keys = { auth: "a".repeat(22), p256dh: "B".repeat(86) + "_" };
for (const e of [
  "https://fcm.googleapis.com/fcm/send/abc:APA91b",
  "https://web.push.apple.com/QF1x",
  "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
  "https://wns2-par02p.notify.windows.com/w/?token=BQYA",
]) ok(`acepta ${new URL(e).host}`, endpointDePushValido(e));

for (const [e, por] of [
  ["http://fcm.googleapis.com/x", "http"],
  ["https://169.254.169.254/latest/meta-data", "ip interna"],
  ["https://localhost/x", "localhost"],
  ["https://fcm.googleapis.com.malo.com/x", "dominio parecido"],
  ["https://notify.windows.com.evil.io/x", "sufijo trucho"],
  ["https://user:pw@fcm.googleapis.com/x", "con usuario"],
  ["https://fcm.googleapis.com:8443/x", "otro puerto"],
  ["no es url", "basura"],
] as const) ok(`rechaza ${por}`, !endpointDePushValido(e));

ok("suscripción completa", !!leerSuscripcionPush({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys }));
ok("rechaza claves con caracteres raros", !leerSuscripcionPush({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { ...keys, auth: "<script>aaaaaaaaaaaaaa" } }));
ok("rechaza claves gigantes", !leerSuscripcionPush({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { ...keys, p256dh: "A".repeat(5000) } }));
ok("rechaza sin claves", !leerSuscripcionPush({ endpoint: "https://fcm.googleapis.com/fcm/send/x" }));
ok("rechaza null", !leerSuscripcionPush(null));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
