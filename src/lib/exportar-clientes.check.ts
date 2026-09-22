/**
 * Chequeos de bajar la lista de clientes: la planilla y la lista para Meta.
 *
 *   npx tsx src/lib/exportar-clientes.check.ts
 */

import { readFileSync } from "node:fs";
import { csvClientes, csvParaMeta, filaParaMeta, esFormatoDeClientes, nombreDelArchivoDeClientes } from "./exportar-clientes";
import type { ClienteEnPantalla } from "./clientes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8");

const base: ClienteEnPantalla = {
  id: "u1", nombre: "María José Pérez", email: "Maria@X.com", telefono: "+54 9 11 5555-1234",
  compras: 2, devoluciones: 0, gasto: 15000, neto: 13500, primera: "01/08/26", ultima: "10/09/26",
  productos: ["Guía", "Recetario"], sinBajar: 1, dioDeBaja: false, ultimoProducto: "Recetario", historial: [],
};

/* ── Para Meta ─────────────────────────────────────────────────────────── */
check("META-A", filaParaMeta(base).join("|") === "maria@x.com|5491155551234|maría|josé pérez|ar",
  "mail en minúscula, teléfono con 549 y sin signos, nombre y apellido en minúscula, país ar");
check("META-B", filaParaMeta({ email: "a@b.co", nombre: "=HYPERLINK(\"x\") Ana, 22", telefono: "1234" }).join("|") === "a@b.co||hyperlink|x ana|ar",
  "el teléfono que no parece un celular va vacío, y del nombre quedan sólo letras: sin fórmulas ni comas");
const meta = csvParaMeta([base, { email: "b@b.co", nombre: null, telefono: null }]);
check("META-C", meta.split("\r\n")[0] === "email,phone,fn,ln,country" && meta.split("\r\n")[2] === "b@b.co,,,,ar" && !meta.startsWith("﻿"),
  "las columnas con los nombres que Meta pide, separadas por coma, sin BOM (Meta no es Excel), y una fila sin nombre ni teléfono sale igual");

/* ── La planilla ───────────────────────────────────────────────────────── */
const planilla = csvClientes([{ ...base, nombre: "=1+1" }], "Tus clientes — prueba", true);
check("PLAN-A", planilla.startsWith("﻿") && /"Correo";"Nombre";"Teléfono";"Compras";"Devoluciones";"Pagó";"Te quedó";"Primera compra";"Última compra";"Productos";"Archivos sin bajar";"Pidió no recibir mails"/.test(planilla)
  && /"Maria@X\.com";"'=1\+1"/.test(planilla) && /Guía, Recetario/.test(planilla) && /Hay más clientes/.test(planilla),
  "la planilla lleva BOM y punto y coma (Excel en castellano), la celda que empieza con = se desactiva, y avisa si se cortó");

check("FMT-A", esFormatoDeClientes("meta") && esFormatoDeClientes("planilla") && !esFormatoDeClientes("xls") && !esFormatoDeClientes(undefined)
  && nombreDelArchivoDeClientes("meta", "2026-09-22") === "clientes-para-meta-2026-09-22.csv" && nombreDelArchivoDeClientes("planilla", "2026-09-22") === "clientes-2026-09-22.csv",
  "sólo los dos formatos, y el nombre del archivo dice para qué es");

/* ── La ruta y la pantalla ─────────────────────────────────────────────── */
const ruta = leer("src/app/api/digitales/clientes/exportar/route.ts");
const cliente = leer("src/app/digitales/clientes/ClientesClient.tsx");
const page = leer("src/app/digitales/clientes/page.tsx");
check("RUTA-A", /user\.role !== "DIGITAL"/.test(ruta) && /checkRateLimit\(`exportar-clientes:\$\{user\.id\}`/.test(ruta)
  && /puedeVer\(ctx\.tier, "exportar"\)/.test(ruta) && /contextoDeClientes\(user\.id, params\)/.test(ruta) && /contextoDeClientes\(user\.id, await searchParams\)/.test(page)
  && /esFormatoDeClientes\(params\.formato\) \? params\.formato : "planilla"/.test(ruta) && /TECHO_DE_EXPORTACION = 5_000/.test(ruta),
  "la ruta pide sesión digital, tiene tope, mira el plan (Starter+), y usa el MISMO contexto que la pantalla: baja lo que se ve");
check("PANT-A", /exportar\("meta"\)/.test(cliente) && /exportar\("planilla"\)/.test(cliente) && /Lista para Meta Ads/.test(cliente)
  && /puedeExportar && clientes\.length === 0 \?/.test(cliente) && /DESDE_QUE_PLAN\.exportar/.test(cliente) && /excluir<\/strong>/.test(cliente) && /gente parecida<\/strong>/.test(cliente),
  "la pantalla ofrece los dos archivos, apagados sin filas, con candado en Free, y explica los dos usos de la lista para Meta");

console.log(fallos === 0 ? "\nok — la lista se baja como se ve, y la de Meta en el formato que Meta acepta" : `\nFALLA — ${fallos} chequeo(s) de exportar clientes`);
process.exit(fallos === 0 ? 0 : 1);
