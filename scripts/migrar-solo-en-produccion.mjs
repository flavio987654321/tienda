// Corre `prisma migrate deploy` SOLO en el deploy de producción de Vercel.
//
// Por qué existe
// --------------
// El `build` era `prisma migrate deploy && next build`, sin distinguir dónde
// estaba corriendo. Eso trae dos problemas, y los dos ya nos mordieron:
//
//   1) En un deploy de PREVIEW, con las credenciales de producción cargadas, el
//      build le aplica las migraciones a la base REAL. Un preview es para mirar,
//      no para migrar: el día que haya una migración pendiente, se aplica en
//      producción sin que nadie la haya aprobado.
//
//   2) EN LA MÁQUINA DE UNO, `npm run build` hace lo mismo. Por eso durante toda
//      la auditoría hubo que compilar con `npx next build` y acordarse de no usar
//      el atajo. Una regla que hay que recordar es una regla que alguna vez se
//      olvida.
//
// La regla
// --------
// Se migra únicamente cuando Vercel dice que esto es producción
// (`VERCEL_ENV === "production"`). En preview, en local y en cualquier otro lado,
// se saltea y se compila igual. Es deliberadamente conservador: si mañana el
// deploy se hace desde otro lado, no migra solo — prefiere no hacer nada antes
// que tocar la base por las suyas.
//
// Si la migración falla, el build falla. Eso no cambia.

import { execSync } from "node:child_process";

const entorno = process.env.VERCEL_ENV ?? "local";

if (entorno !== "production") {
  console.log(`▸ migraciones: entorno "${entorno}" — se saltean (solo corren en producción).`);
  process.exit(0);
}

console.log("▸ migraciones: entorno de producción — corriendo `prisma migrate deploy`…");
try {
  execSync("prisma migrate deploy", { stdio: "inherit" });
} catch {
  console.error("▸ migraciones: FALLARON. Se corta el build a propósito, para no publicar código que espera un esquema que la base todavía no tiene.");
  process.exit(1);
}
