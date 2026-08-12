/**
 * Chequeos de los topes de Sasha. Se corre a mano:
 *
 *   npx tsx src/lib/asistente-limites.check.ts
 *
 * Lo que se prueba acá es plata. Un tope que no corta no se nota hasta que
 * llega la factura, y un tope que corta de más deja sin asistente a alguien
 * que paga — las dos fallas son mudas, así que van escritas.
 *
 * Corre sin Redis: `permitirMensaje` recibe el contador por parámetro y acá se
 * le pasa uno en memoria que se comporta igual (suma siempre, incluso cuando
 * ya se pasó, que es lo que hace `INCR`).
 */

import {
  permitirMensaje,
  LIMITE_RAFAGA,
  LIMITE_DIARIO,
  LIMITE_DIARIO_PRUEBA,
  LIMITE_GLOBAL_PRUEBA_DIARIO,
  LIMITE_GLOBAL_DIARIO,
  type Contador,
  type Motivo,
} from "./asistente-limites";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/** Un contador en memoria que se porta como `INCR`: suma siempre. */
function contadorFalso() {
  const cuentas = new Map<string, number>();
  const contar: Contador = async (clave, limite) => {
    const cuenta = (cuentas.get(clave) ?? 0) + 1;
    cuentas.set(clave, cuenta);
    return { permitido: cuenta <= limite, cuenta };
  };
  return Object.assign(contar, { cuentas });
}

/* La ráfaga (30) es más baja que el tope diario de pago (150), así que taparía
   todo lo que se quiera probar del día para abajo. Este envoltorio la deja
   pasar siempre; lo que se está probando es la capa de abajo. */
function sinRafaga(c: Contador): Contador {
  return async (clave, limite, ventana) =>
    clave.startsWith("asistente:") ? { permitido: true, cuenta: 0 } : c(clave, limite, ventana);
}

const DIA = "2026-08-12";

/** Manda `n` mensajes de un mismo dueño y devuelve el primer motivo de rechazo. */
async function mandar(n: number, enPrueba: boolean, contar: Contador, userId = "u1"): Promise<Motivo | null> {
  for (let i = 0; i < n; i++) {
    const v = await permitirMensaje({ userId, enPrueba, day: DIA }, contar);
    if (!v.permitido) return v.motivo;
  }
  return null;
}

async function main() {
  /* ── 1. El tope de ráfaga ───────────────────────────────────────────────── */
  console.log("\n1) La ráfaga corta antes que nada");
  {
    const c = contadorFalso();
    const motivo = await mandar(LIMITE_RAFAGA + 1, false, c);
    chequear(`corta en el mensaje ${LIMITE_RAFAGA + 1}`, motivo === "rafaga", { motivo });
  }

  /* ── 2. El tope diario, distinto según quién sea ────────────────────────── */
  console.log("\n2) El tope del día es más bajo en prueba que pagando");

  chequear("el de prueba es más bajo que el de pago", LIMITE_DIARIO_PRUEBA < LIMITE_DIARIO,
    { prueba: LIMITE_DIARIO_PRUEBA, pago: LIMITE_DIARIO });

  {
    const motivo = await mandar(LIMITE_DIARIO_PRUEBA + 1, true, sinRafaga(contadorFalso()));
    chequear(`en prueba corta en el mensaje ${LIMITE_DIARIO_PRUEBA + 1}`, motivo === "diario", { motivo });
  }
  {
    const motivo = await mandar(LIMITE_DIARIO_PRUEBA + 1, false, sinRafaga(contadorFalso()));
    chequear(`pagando NO corta en el ${LIMITE_DIARIO_PRUEBA + 1}`, motivo === null, { motivo });
  }
  {
    const motivo = await mandar(LIMITE_DIARIO + 1, false, sinRafaga(contadorFalso()));
    chequear(`pagando corta recién en el ${LIMITE_DIARIO + 1}`, motivo === "diario", { motivo });
  }

  /* ── 3. El global de pruebas ────────────────────────────────────────────── */
  console.log("\n3) Muchas cuentas en prueba comparten un presupuesto");
  {
    /* El agujero que esto tapa: cada cuenta trucha está DENTRO de su tope
       personal, así que ninguna capa por usuario las ve como un problema. */
    const c = contadorFalso();
    const contar = sinRafaga(c);
    const cuentas = Math.ceil(LIMITE_GLOBAL_PRUEBA_DIARIO / LIMITE_DIARIO_PRUEBA) + 2;

    let cortadas = 0;
    for (let u = 0; u < cuentas; u++) {
      if (await mandar(LIMITE_DIARIO_PRUEBA, true, contar, `trucha-${u}`) === "global-prueba") cortadas++;
    }
    chequear(`${cuentas} cuentas en prueba chocan con el global`, cortadas > 0, { cortadas });
    chequear(`ninguna se pasó de su tope personal (${LIMITE_DIARIO_PRUEBA})`,
      [...c.cuentas].filter(([k]) => k.startsWith("asistente-dia:")).every(([, n]) => n <= LIMITE_DIARIO_PRUEBA));
  }

  /* ── 4. Y NO deja sin Sasha a quien paga ────────────────────────────────── */
  console.log("\n4) El que paga no se queda sin asistente por culpa de las truchas");
  {
    const c = contadorFalso();
    const contar = sinRafaga(c);

    for (let u = 0; u < 20; u++) await mandar(LIMITE_DIARIO_PRUEBA, true, contar, `trucha-${u}`);
    const quemado = c.cuentas.get(`asistente-prueba-dia:${DIA}`) ?? 0;
    chequear("el presupuesto de pruebas quedó pasado", quemado > LIMITE_GLOBAL_PRUEBA_DIARIO, { quemado });

    const v = await permitirMensaje({ userId: "cliente-que-paga", enPrueba: false, day: DIA }, contar);
    chequear("la tienda que paga pasa igual", v.permitido, v);
  }

  /* ── 5. El corta-corriente ──────────────────────────────────────────────── */
  console.log("\n5) El global total frena a todos, pague o no");
  {
    const c = contadorFalso();
    const soloGlobal: Contador = async (clave, limite, ventana) =>
      clave.startsWith("asistente-global-dia:") ? c(clave, limite, ventana) : { permitido: true, cuenta: 0 };

    let motivo: Motivo | null = null;
    for (let i = 0; i < LIMITE_GLOBAL_DIARIO + 1 && motivo === null; i++) {
      const r = await permitirMensaje({ userId: `u${i}`, enPrueba: false, day: DIA }, soloGlobal);
      if (!r.permitido) motivo = r.motivo;
    }
    chequear(`corta en el mensaje ${LIMITE_GLOBAL_DIARIO + 1}`, motivo === "global", { motivo });
  }

  /* ── 6. Lo rechazado no se cobra al presupuesto de todos ────────────────── */
  console.log("\n6) Un rechazado no se come el presupuesto global");
  {
    /* `INCR` suma aunque el pedido se rechace. Por eso los globales van
       ÚLTIMOS: si fueran primero, alguien ya bloqueado seguiría gastando el
       presupuesto de la plataforma con cada intento. */
    const c = contadorFalso();
    await mandar(LIMITE_RAFAGA + 50, false, c);
    const global = c.cuentas.get(`asistente-global-dia:${DIA}`) ?? 0;
    chequear("los 50 intentos ya bloqueados no tocaron el global", global <= LIMITE_RAFAGA,
      { global, rafaga: LIMITE_RAFAGA });
  }

  /* ── 7. El día está en la clave ─────────────────────────────────────────── */
  console.log("\n7) Los contadores globales se caen solos al cambiar el día");
  {
    const c = contadorFalso();
    await permitirMensaje({ userId: "u1", enPrueba: true, day: "2026-08-12" }, c);
    await permitirMensaje({ userId: "u1", enPrueba: true, day: "2026-08-13" }, c);
    chequear("son dos claves distintas",
      c.cuentas.has("asistente-global-dia:2026-08-12") && c.cuentas.has("asistente-global-dia:2026-08-13"));
  }

  console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main();
