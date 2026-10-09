import assert from "node:assert/strict";
import { huellaTemporalDeIp } from "./security-events";

const clave = "a".repeat(64);
const ipReal = "203.0.113.17";
const huella = huellaTemporalDeIp({ "x-forwarded-for": `198.51.100.8, ${ipReal}` }, clave);

assert.match(huella ?? "", /^[a-f\d]{24}$/);
assert.equal(
  huellaTemporalDeIp({ "x-forwarded-for": `192.0.2.44, ${ipReal}` }, clave),
  huella,
  "un prefijo falsificado no debería cambiar la IP cliente que aporta el proxy",
);
assert.equal(huellaTemporalDeIp({ "X-Forwarded-For": ipReal }, clave), huella);
assert.notEqual(huellaTemporalDeIp({ "x-forwarded-for": "203.0.113.18" }, clave), huella);
assert.notEqual(huellaTemporalDeIp({ "x-forwarded-for": ipReal }, "b".repeat(64)), huella);
assert.equal(huellaTemporalDeIp({ "x-forwarded-for": ipReal }, "invalid"), null);
assert.equal(huellaTemporalDeIp({}, clave), null);
assert.equal(huella?.includes(ipReal), false);

console.log("ok — la huella es HMAC, usa el último salto del proxy y omite claves inválidas");
