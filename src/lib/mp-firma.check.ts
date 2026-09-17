// Verificación ejecutable de LO ÚNICO que separa un aviso de pago real de un
// `POST` escrito a mano. Corre con:
//   npx tsx src/lib/mp-firma.check.ts
//
// Se prueban dos cosas distintas, y las dos hacen falta:
//
//   1. La firma en sí (casos FIRMA-*): que acepte la buena, rechace la falsa, y
//      —desde el 16/09/26— rechace también una buena pero vieja.
//   2. Que los CUATRO webhooks de pago usen esta pieza (casos COPIA-*). Esto es
//      una prueba de texto sobre los archivos de las rutas, no de comportamiento,
//      y es a propósito: el problema que arregló no fue nunca que la firma
//      estuviera mal escrita, sino que estuviera escrita CUATRO VECES. Dos de
//      esas copias se perdieron la ventana de tiempo de arriba sin que nada
//      fallara. Una prueba de comportamiento no puede ver eso: cada copia anda
//      bien por su cuenta. Sólo se ve mirando quién importa de dónde.

import { createHmac } from "crypto";
import { readFileSync } from "node:fs";
import type { NextRequest } from "next/server";
import { firmaDeMercadoPagoValida } from "./mp-firma";

/* Sin secreto configurado la pieza se comporta distinto —en desarrollo deja
   pasar todo, y esta prueba corre justamente en desarrollo—, así que hay que
   ponerle uno. Alcanza con hacerlo acá arriba, antes del primer llamado: el
   secreto se lee adentro de la función y no al cargar el módulo. */
process.env.MP_WEBHOOK_SECRET = "secreto-de-prueba";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(9)} ${desc}`);
}

const SECRETO = "secreto-de-prueba";
const ID = "123456789";
const PEDIDO = "req-abc";

/** Un pedido como el que manda Mercado Pago, firmado de verdad. */
function pedido(
  { ts, dataId = ID, requestId = PEDIDO, v1 }: { ts: string; dataId?: string; requestId?: string; v1?: string }
): NextRequest {
  const manifiesto = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const firma = v1 ?? createHmac("sha256", SECRETO).update(manifiesto).digest("hex");
  const headers = new Map([
    ["x-signature", `ts=${ts},v1=${firma}`],
    ["x-request-id", requestId],
  ]);
  return { headers: { get: (k: string) => headers.get(k) ?? null } } as unknown as NextRequest;
}

const ahoraSeg = () => String(Math.floor(Date.now() / 1000));
const haceSeg = (s: number) => String(Math.floor(Date.now() / 1000) - s);

// ── La firma ────────────────────────────────────────────────────────────────
{
  check("FIRMA-A", firmaDeMercadoPagoValida(pedido({ ts: ahoraSeg() }), ID),
    "un aviso recién firmado por Mercado Pago pasa");

  check("FIRMA-B", !firmaDeMercadoPagoValida(pedido({ ts: ahoraSeg(), v1: "a".repeat(64) }), ID),
    "una firma inventada no pasa");

  /* El identificador del pago es parte del manifiesto: cambiarlo después de
     firmar es justo el ataque que esto frena —mandar el aviso de un pago propio
     con el número de la orden de otro—. */
  check("FIRMA-C", !firmaDeMercadoPagoValida(pedido({ ts: ahoraSeg() }), "999999"),
    "una firma válida pero de OTRO pago no pasa");

  check("FIRMA-D", !firmaDeMercadoPagoValida(
    { headers: { get: () => null } } as unknown as NextRequest, ID),
    "sin encabezado de firma no pasa");
}

// ── La ventana de tiempo, lo agregado el 16/09/26 ───────────────────────────
{
  check("FIRMA-E", firmaDeMercadoPagoValida(pedido({ ts: haceSeg(30 * 60) }), ID),
    "media hora es viejo pero está adentro de la ventana: pasa");

  /* El caso que existe la ventana para frenar: alguien capturó un aviso real
     —de un log, de un proxy— y lo reenvía. La firma sigue siendo perfecta. */
  check("FIRMA-F", !firmaDeMercadoPagoValida(pedido({ ts: haceSeg(3 * 60 * 60) }), ID),
    "tres horas después, la MISMA firma válida ya no pasa");

  check("FIRMA-G", firmaDeMercadoPagoValida(pedido({ ts: String(Date.now()) }), ID),
    "el ts en milisegundos se entiende igual que en segundos");

  check("FIRMA-H", !firmaDeMercadoPagoValida(pedido({ ts: String(Date.now() - 3 * 60 * 60 * 1000) }), ID),
    "y vencido en milisegundos también se rechaza");

  /* Un reloj corrido no es un ataque, y perder un pago por eso sería peor que
     el problema que vinimos a resolver. */
  check("FIRMA-I", firmaDeMercadoPagoValida(pedido({ ts: String(Math.floor(Date.now() / 1000) + 600) }), ID),
    "un aviso 'del futuro' (reloj corrido) pasa");

  /* Si mañana cambian el formato del ts, la firma sigue probando que lo escribió
     Mercado Pago. Tirar pagos de verdad por no entender un número sería peor. */
  check("FIRMA-J", firmaDeMercadoPagoValida(pedido({ ts: "no-es-un-numero" }), ID),
    "un ts que no se entiende no tira el aviso: manda la firma");
}

// ── Que no vuelva a haber copias sueltas ────────────────────────────────────
{
  /* Los cuatro lugares por donde entra plata. Si mañana aparece un quinto, va
     acá: es una lista escrita a mano justamente para que sumar un webhook
     obligue a pasar por esta prueba. */
  const WEBHOOKS = [
    "src/app/api/mp/webhook/route.ts",
    "src/app/api/suscripcion/webhook/route.ts",
    "src/app/api/canasta/webhook/route.ts",
    "src/app/api/digitales/cobro/route.ts",
  ];

  const fuentes = WEBHOOKS.map((f) => ({ f, s: readFileSync(f, "utf8") }));

  const sinImportar = fuentes.filter(({ s }) => !s.includes("firmaDeMercadoPagoValida"));
  check("COPIA-A", sinImportar.length === 0,
    `los ${WEBHOOKS.length} webhooks de pago verifican la firma con la pieza compartida${
      sinImportar.length ? ` — le falta a: ${sinImportar.map((x) => x.f).join(", ")}` : ""}`);

  /* La marca de que alguien volvió a escribirla a mano. `createHmac` fuera de
     `lib/mp-firma` en una ruta de pago es exactamente lo que había antes. */
  const conCopia = fuentes.filter(({ s }) => s.includes("createHmac"));
  check("COPIA-B", conCopia.length === 0,
    `ninguno se escribió su propia verificación${
      conCopia.length ? ` — la tiene: ${conCopia.map((x) => x.f).join(", ")}` : ""}`);
}

// ── Y que el webhook de suscripción no vuelva a ser un upsert pelado ────────
{
  /* No es una prueba de la firma, pero vive acá porque es el mismo tipo de
     defecto: algo que anda bien en tres lugares y falta en el cuarto.

     El webhook de suscripción aplicaba cada aviso con un `upsert` por `userId`,
     sin mirar si ese pago ya se había aplicado. Mercado Pago manda el mismo
     aviso más de una vez con normalidad, y cada repetición le movía el
     vencimiento a la fecha del último aviso: un aviso que llega tres meses
     después de un pago anual regalaba tres meses, sin ningún error a la vista.

     Se mira que exista el compare-and-swap y que NO haya vuelto el upsert. */
  const s = readFileSync("src/app/api/suscripcion/webhook/route.ts", "utf8");

  check("IDEM-A", !/subscription\.upsert/.test(s),
    "el webhook de suscripción ya no aplica el pago con un upsert pelado");

  check("IDEM-B", /updateMany/.test(s) && /mpPaymentId/.test(s) && /aplicado\.count === 0/.test(s),
    "lo aplica con un compare-and-swap sobre mpPaymentId, y se rinde si ya estaba");

  /* La rama `null` del OR no es adorno: en SQL `columna <> 'x'` sobre un valor
     nulo no da verdadero, da nulo. Sin ella, la PRIMERA suscripción que paga
     —la que todavía tiene la columna vacía— no la tomaría el where y el pago no
     se aplicaría nunca. Es el error fácil de cometer al tocar esto. */
  check("IDEM-C", /mpPaymentId: null/.test(s),
    "y contempla la fila que todavía no tiene ningún pago guardado");
}

console.log(failed === 0 ? "\n✅ La firma y sus cuatro usos están bien." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
