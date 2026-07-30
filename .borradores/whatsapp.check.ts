/**
 * Chequeos de WhatsApp. Se corre a mano:
 *
 *   npx tsx src/lib/whatsapp.check.ts
 *
 * Acá se prueba lo que NO se puede probar a mano: la firma y el parseo del
 * payload. Para verificar a ojo que un payload raro no rompe nada habría que
 * conseguir que Meta lo mande, y Meta manda lo que quiere cuando quiere.
 *
 * La firma es lo más importante del archivo: es la única puerta del webhook. No
 * hay sesión ni cookie — si la validación tiene un agujero, cualquiera que
 * descubra la URL nos hace pagar tokens de Claude.
 */

import { createHmac } from "crypto";
import {
  verificarFirmaWhatsApp, resolverChallenge, parsearMensajes, esNumeroAutorizado,
} from "./whatsapp";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const SECRETO = "un-secreto-de-prueba";
const firmar = (cuerpo: string, secreto = SECRETO) =>
  "sha256=" + createHmac("sha256", secreto).update(cuerpo).digest("hex");

process.env.WHATSAPP_APP_SECRET = SECRETO;

/* ── La firma ─────────────────────────────────────────────────────────────── */
console.log("\n1) La firma: la única puerta del webhook");

const CUERPO = '{"object":"whatsapp_business_account","entry":[]}';

chequear("una firma correcta pasa", verificarFirmaWhatsApp(CUERPO, firmar(CUERPO)));
chequear("acepta el hex sin el prefijo sha256=",
  verificarFirmaWhatsApp(CUERPO, firmar(CUERPO).slice(7)));

chequear("sin cabecera se rechaza", !verificarFirmaWhatsApp(CUERPO, null));
chequear("cabecera vacía se rechaza", !verificarFirmaWhatsApp(CUERPO, ""));
chequear("firmado con otro secreto se rechaza",
  !verificarFirmaWhatsApp(CUERPO, firmar(CUERPO, "otro-secreto")));

// El punto de firmar el cuerpo crudo: si alguien cambia UN caracter, no da.
chequear("un cuerpo alterado se rechaza",
  !verificarFirmaWhatsApp(CUERPO.replace("entry", "entrz"), firmar(CUERPO)));

// Reparsear y volver a serializar cambia el texto, así que la firma del original
// ya no sirve. Es exactamente el error que hay que no cometer en el route.
chequear("el JSON reparseado ya no valida (por eso se firma el crudo)",
  !verificarFirmaWhatsApp(JSON.stringify(JSON.parse(CUERPO)) + " ", firmar(CUERPO)));

chequear("basura en la cabecera no explota", !verificarFirmaWhatsApp(CUERPO, "sha256=nada"));
chequear("una cabecera cortada no explota", !verificarFirmaWhatsApp(CUERPO, "sha256=ab"));

/* ── Sin secreto configurado ──────────────────────────────────────────────── */
console.log("\n2) Sin WHATSAPP_APP_SECRET");

delete process.env.WHATSAPP_APP_SECRET;
const nodeEnvOriginal = process.env.NODE_ENV;

// En producción, sin secreto se rechaza TODO. Dejar pasar sería tener un endpoint
// abierto que gasta plata, y el síntoma sería la factura.
Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
chequear("en producción se rechaza todo", !verificarFirmaWhatsApp(CUERPO, firmar(CUERPO)));

Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
chequear("en desarrollo deja pasar (no hay secreto que validar)",
  verificarFirmaWhatsApp(CUERPO, null));

Object.defineProperty(process.env, "NODE_ENV", { value: nodeEnvOriginal, configurable: true });
process.env.WHATSAPP_APP_SECRET = SECRETO;

/* ── El handshake ─────────────────────────────────────────────────────────── */
console.log("\n3) El handshake de verificación");

process.env.WHATSAPP_VERIFY_TOKEN = "mi-token-inventado";
const qs = (o: Record<string, string>) => new URLSearchParams(o);

chequear("con el token correcto devuelve el challenge",
  resolverChallenge(qs({ "hub.mode": "subscribe", "hub.verify_token": "mi-token-inventado", "hub.challenge": "1234" })) === "1234");
chequear("con el token equivocado no devuelve nada",
  resolverChallenge(qs({ "hub.mode": "subscribe", "hub.verify_token": "otro", "hub.challenge": "1234" })) === null);
chequear("sin mode=subscribe no devuelve nada",
  resolverChallenge(qs({ "hub.verify_token": "mi-token-inventado", "hub.challenge": "1234" })) === null);

delete process.env.WHATSAPP_VERIFY_TOKEN;
chequear("sin token configurado no devuelve nada",
  resolverChallenge(qs({ "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "1234" })) === null);
process.env.WHATSAPP_VERIFY_TOKEN = "mi-token-inventado";

/* ── El parseo ────────────────────────────────────────────────────────────── */
console.log("\n4) Sacar los mensajes del payload de Meta");

const payload = (mensajes: unknown[]) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "1", changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages: mensajes } }] }],
});

const unoDeTexto = parsearMensajes(payload([
  { id: "wamid.AAA", from: "5491122334455", timestamp: "1", type: "text", text: { body: "hola" } },
]));
chequear("saca un mensaje de texto", unoDeTexto.length === 1, unoDeTexto);
chequear("con el texto", unoDeTexto[0]?.texto === "hola", unoDeTexto);
chequear("con el wamid", unoDeTexto[0]?.id === "wamid.AAA", unoDeTexto);
chequear("con el número", unoDeTexto[0]?.de === "5491122334455", unoDeTexto);

// Los acuses de entrega llegan por el MISMO webhook y NO son mensajes. Tratarlos
// como mensajes sería contestarle a un "leído" — y pagarle un mensaje a Claude por
// cada uno.
const soloEstados = parsearMensajes({
  object: "whatsapp_business_account",
  entry: [{ id: "1", changes: [{ field: "messages", value: { statuses: [{ id: "wamid.X", status: "delivered" }] } }] }],
});
chequear("los acuses de entrega NO son mensajes", soloEstados.length === 0, soloEstados);

// Audio, fotos y stickers llegan sin `text`. No se descartan: se devuelven con
// `texto: null` para poder explicarle que sólo leemos texto.
const audio = parsearMensajes(payload([
  { id: "wamid.BBB", from: "549112233", type: "audio", audio: { id: "x" } },
]));
chequear("un audio llega con texto null", audio.length === 1 && audio[0].texto === null, audio);
chequear("y con su tipo, para poder explicarlo", audio[0]?.tipo === "audio", audio);

const varios = parsearMensajes(payload([
  { id: "a", from: "1", type: "text", text: { body: "uno" } },
  { id: "b", from: "1", type: "text", text: { body: "dos" } },
]));
chequear("saca varios de una", varios.length === 2, varios);

/* ── Payloads roñosos ─────────────────────────────────────────────────────── */
console.log("\n5) Nada de esto puede tirar una excepción");

const BASURA: [string, unknown][] = [
  ["null", null],
  ["undefined", undefined],
  ["un número", 42],
  ["un string", "hola"],
  ["un objeto vacío", {}],
  ["entry que no es lista", { entry: "no" }],
  ["entry vacío", { entry: [] }],
  ["changes que no es lista", { entry: [{ changes: 5 }] }],
  ["value ausente", { entry: [{ changes: [{}] }] }],
  ["messages que no es lista", { entry: [{ changes: [{ value: { messages: "no" } }] }] }],
  ["un mensaje null", { entry: [{ changes: [{ value: { messages: [null] } }] }] }],
  ["un mensaje sin id", { entry: [{ changes: [{ value: { messages: [{ from: "1" }] }] }] }] }],
];
for (const [nombre, cuerpo] of BASURA) {
  let exploto = false;
  let largo = -1;
  try { largo = parsearMensajes(cuerpo).length; } catch { exploto = true; }
  chequear(`${nombre} devuelve lista vacía sin explotar`, !exploto && largo === 0, { exploto, largo });
}

/* ── El número autorizado ─────────────────────────────────────────────────── */
console.log("\n6) Sólo contesta al número autorizado");

process.env.WHATSAPP_OWNER_PHONE = "+54 9 11 2233-4455";
chequear("el mismo número con formato distinto pasa", esNumeroAutorizado("5491122334455"));
chequear("con el mismo formato pasa", esNumeroAutorizado("+54 9 11 2233-4455"));
chequear("otro número NO pasa", !esNumeroAutorizado("5491199887766"));
chequear("un número parecido NO pasa", !esNumeroAutorizado("549112233445"));
chequear("vacío NO pasa", !esNumeroAutorizado(""));

// Sin la variable cargada NADIE pasa. Es lo importante: si se olvida de
// configurar, Sasha no contesta — en vez de contestarle a cualquiera con los
// datos de una tienda.
delete process.env.WHATSAPP_OWNER_PHONE;
chequear("sin la variable cargada, nadie pasa", !esNumeroAutorizado("5491122334455"));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
