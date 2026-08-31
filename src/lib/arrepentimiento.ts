import { randomBytes } from "crypto";

/**
 * El botón de arrepentimiento.
 *
 * ── Qué exige la ley ─────────────────────────────────────────────────────────
 *
 * La **Resolución 424/2020** de la Secretaría de Comercio Interior obliga a
 * todo sitio de venta online a tener un "Botón de Arrepentimiento" que:
 *
 *   · esté **en la primera pantalla**, visible y sin tener que registrarse;
 *   · permita **iniciar** la revocación de la compra (no que la explique: que la
 *     inicie);
 *   · entregue una **constancia con número de identificación**.
 *
 * Es distinto del derecho en sí, que ya estaba: los 10 días corridos del art. 34
 * de la Ley 24.240 están escritos en las políticas de cada tienda y en
 * /terminos. Lo que faltaba era el botón — el derecho estaba explicado y no
 * había por dónde ejercerlo salvo escribiéndole al comercio y esperar.
 *
 * ── Por qué vive en la página legal y no en una ruta propia ──────────────────
 *
 * Porque los pies de las once plantillas ya linkean ahí, y **arman el link
 * ellos**: `/tienda/<slug>/politicas?tipo=<clave>`. Metiéndolo como una solapa
 * más de esa página, los once lo muestran sin tocar ni uno. Una ruta aparte
 * habría obligado a editar once archivos para agregar un link — once
 * oportunidades de olvidarse de uno, y ese uno sería una tienda sin botón.
 *
 * ── Dos destinatarios ────────────────────────────────────────────────────────
 *
 * Cada tienda vende, así que le corresponde. Pero **TiendaApps también vende**
 * —suscripciones—, así que le corresponde igual y por su cuenta. Es la misma
 * máquina con `storeId` en null.
 */

/** El estado inicial. Hoy es el único: el listado en el panel viene después. */
export const ESTADO_INICIAL = "RECIBIDO";

/* Los topes de cada campo. Van acá y no sueltos en la ruta porque el formulario
   los necesita para avisar ANTES de mandar, y dos números que tienen que
   coincidir escritos en dos lados se separan solos. */
export const MAX_NOMBRE = 120;
export const MAX_EMAIL = 200;
export const MAX_TELEFONO = 40;
export const MAX_REFERENCIA = 120;
export const MAX_MOTIVO = 1500;

/**
 * El número de constancia.
 *
 * Tiene que poder **dictarse por teléfono**: es lo que la persona va a leerle a
 * alguien si tiene que reclamar. Por eso son mayúsculas y dígitos sin las
 * parejas que se confunden dichas en voz alta —la O y el 0, la I y el 1— y va
 * partido en dos bloques cortos en vez de una tira larga.
 *
 * No es secreto: no da acceso a nada. Igual se arma con `randomBytes` y no con
 * `Math.random()`, porque no hay ninguna razón para usar un dado cargado cuando
 * el bueno cuesta lo mismo.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0, I/1

export function numeroDeConstancia(): string {
  const bytes = randomBytes(8);
  let texto = "";
  for (let i = 0; i < 8; i++) texto += ALFABETO[bytes[i] % ALFABETO.length];
  return `AR-${texto.slice(0, 4)}-${texto.slice(4)}`;
}

/** El formato, para poder validarlo donde haga falta sin repetir la expresión. */
export const FORMATO_CONSTANCIA = /^AR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/**
 * ¿Los datos alcanzan para tomar la solicitud?
 *
 * Se piden **tres** cosas y no más: nombre, email y qué compra. Cada campo
 * obligatorio de más es una persona que abandona el formulario, y esta es
 * justamente la pantalla donde no se puede poner un obstáculo — la ley pide que
 * se pueda iniciar la revocación, no que se pueda iniciar si completás ocho
 * campos.
 *
 * El motivo NO es obligatorio, y eso es del derecho mismo: el art. 34 dice "sin
 * necesidad de justificar el motivo". Pedirlo como requisito sería contradecir
 * en el formulario lo que la política promete dos solapas más allá.
 */
export type DatosArrepentimiento = {
  nombre: string;
  email: string;
  telefono?: string;
  referencia: string;
  motivo?: string;
};

export function errorDeLosDatos(d: Partial<DatosArrepentimiento>): string | null {
  const nombre = (d.nombre ?? "").trim();
  const email = (d.email ?? "").trim();
  const referencia = (d.referencia ?? "").trim();

  if (nombre.length < 2) return "Escribí tu nombre y apellido.";
  if (nombre.length > MAX_NOMBRE) return "El nombre es demasiado largo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Revisá el email: no parece válido.";
  if (email.length > MAX_EMAIL) return "El email es demasiado largo.";
  if (referencia.length < 2) return "Escribí el número de pedido o con qué email compraste.";
  if (referencia.length > MAX_REFERENCIA) return "Ese dato es demasiado largo.";
  if ((d.telefono ?? "").length > MAX_TELEFONO) return "El teléfono es demasiado largo.";
  if ((d.motivo ?? "").length > MAX_MOTIVO) return "El motivo es demasiado largo.";
  return null;
}
