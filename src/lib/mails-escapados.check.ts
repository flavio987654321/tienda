/**
 * Que ningún mail meta texto de una persona crudo adentro del HTML.
 *
 *   npx tsx src/lib/mails-escapados.check.ts
 *
 * ── Qué agujero cuida ────────────────────────────────────────────────────────
 * Los mails se arman con plantillas de texto. Todo lo que entra por un `${}` se
 * pega tal cual, así que un nombre como `<img src=x onerror=...>` viaja adentro
 * de un correo que mandamos **nosotros**, con nuestro remitente. No es teórico:
 * `sendVerificationReceivedEmail` y `sendVerificationApprovedEmail` metían el
 * nombre crudo y eran las dos únicas del archivo sin `escapeHtml`; después
 * aparecieron trece más entre las denuncias y la canasta —incluida la
 * descripción libre de una denuncia y el mensaje de una campaña—.
 *
 * Estaba escondido porque el resto del archivo SÍ escapaba: se leía como si la
 * regla estuviera puesta, y las que faltaban no se veían.
 *
 * ── Cómo lo revisa ───────────────────────────────────────────────────────────
 * Busca `${...}` en líneas que son HTML, le saca lo que ya es seguro
 * (`escapeHtml`, `encodeURIComponent`, los formateadores de plata) y, si lo que
 * queda nombra algo que suele venir de una persona o de la base, falla.
 *
 * Es tosco a propósito. Prefiere avisar de más: agregar un nombre a la lista de
 * permitidos obliga a ir a mirar de dónde sale ese valor, que es exactamente lo
 * que hay que hacer.
 *
 * ⚠️ Los `subject:` NO se revisan y no se escapan: son texto plano, no HTML.
 * Escaparlos haría que a alguien le llegue "Tienda &amp; Co" en el asunto.
 */

import { readFileSync } from "node:fs";

const ARCHIVOS = ["src/lib/resend.ts", "src/lib/email.ts"];

/** Nombres que casi siempre vienen de un formulario o de la base. */
const SOSPECHOSOS =
  /\b(name|nombre|comment|comentario|mensaje|message|descripcion|description|asunto|motivo|reason|address|direccion|storeSlug|storeName|buyerName|customerName|productName|ownerName|ownerEmail|donorName|campaignName|campaignUrl|reporterEmail|email|variant|banco|titular|alias|cbu|cvu|cuil|userName)\b/i;

/**
 * Lo que ya se miró y está bien, con el motivo. Es una lista de nombres y no de
 * números de línea: los números se corren solos con cualquier edición y el
 * chequeo empezaría a fallar por nada.
 *
 * ⚠️ Sumar algo acá NO es apagar el aviso: es afirmar que ese valor no lo escribe
 * una persona. Antes de agregarlo hay que ir a ver de dónde sale.
 */
const PERMITIDOS: { expresion: string; porque: string }[] = [
  { expresion: "titular", porque: "en el mail de bienvenida es uno de cuatro textos fijos elegidos por el rol, no el nombre de nadie" },
];

let fallos = 0;
const hallazgos: string[] = [];

/**
 * Lo que queda de una expresión después de sacarle todo lo que NO se dibuja o ya
 * está protegido. Si acá adentro todavía aparece un nombre sospechoso, ese valor
 * se pinta crudo.
 *
 * Los cuatro pasos, y por qué hace falta cada uno:
 *
 *   1. Las llamadas que ya protegen (`escapeHtml`, `encodeURIComponent`, los
 *      formateadores de plata). Se repite porque pueden estar anidadas.
 *   2. Los textos entre comillas. Son literales escritos por nosotros, y sin
 *      sacarlos una frase como "Reportado por:" dispara el aviso sola.
 *   3. De un texto entre acentos invertidos queda sólo lo de adentro de `${}`:
 *      el resto es HTML escrito a mano.
 *   4. **La condición de un ternario.** Este es el que más falsos avisos evitaba:
 *      `description ? \`...${escapeHtml(description)}...\` : ""` está bien —el
 *      valor va escapado— pero el nombre aparecía igual en la pregunta de
 *      adelante, que no se dibuja. El `?.` no se toca, que no es un ternario.
 */
function loQueQuedaSinProteger(expresion: string): string {
  let s = expresion;

  for (let i = 0; i < 6; i++) {
    const antes = s;
    s = s
      .replace(/escapeHtml\([^()]*\)/g, "")
      .replace(/encodeURIComponent\([^()]*\)/g, "")
      .replace(/\b(fmt|emailMoney|money)\([^()]*\)/g, "");
    if (s === antes) break;
  }

  s = s.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");

  s = s.replace(/`([^`]*)`/g, (_, dentro: string) =>
    (dentro.match(/\$\{[^}]*\}/g) ?? []).join(" ")
  );

  const partes = s.split(/\?(?!\.)/);
  if (partes.length > 1) s = partes.slice(1).join(" ");

  return s;
}

for (const archivo of ARCHIVOS) {
  const lineas = readFileSync(archivo, "utf8").split(/\r?\n/);
  lineas.forEach((linea, i) => {
    // Sólo líneas que son HTML. Un `${}` en código normal no se pinta en ningún lado.
    if (!/<[a-z]|style=|href=/.test(linea)) return;

    for (const m of linea.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
      const expresion = m[1].trim();
      if (PERMITIDOS.some((p) => p.expresion === expresion)) continue;
      if (!SOSPECHOSOS.test(loQueQuedaSinProteger(expresion))) continue;
      fallos++;
      hallazgos.push(`  ${archivo}:${i + 1}  ${expresion.slice(0, 90)}`);
    }
  });
}

if (fallos === 0) {
  console.log(`ok — ${ARCHIVOS.length} archivos de mails, ningún dato de una persona sin escapar`);
} else {
  console.log(`FALLA — ${fallos} interpolación(es) sin escapar en el HTML de un mail:\n`);
  console.log(hallazgos.join("\n"));
  console.log(
    "\nEnvolvelas en escapeHtml(). Si el valor NO lo escribe una persona,\n" +
    "agregalo a PERMITIDOS con el motivo — pero andá a mirar de dónde sale primero."
  );
}
process.exit(fallos === 0 ? 0 : 1);
