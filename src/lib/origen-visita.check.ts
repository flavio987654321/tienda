/**
 * Chequeos del clasificador de origen. Se corre a mano:
 *
 *   npx tsx src/lib/origen-visita.check.ts
 *
 * Acá el error no se ve nunca: una visita mal clasificada no rompe nada, no tira
 * ningún log y sale por pantalla como un número perfectamente creíble. La dueña
 * mueve plata de Instagram a Facebook por una etiqueta equivocada y no hay forma
 * de que se entere. Por eso hay más chequeos que reglas.
 */

import {
  clasificarOrigen, ordenarOrigenes, ORIGENES, NOMBRE_ORIGEN,
  type Origen,
} from "./origen-visita";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const da = (titulo: string, ref: string | null, esperado: Origen, utm?: string, propio?: string) => {
  const r = clasificarOrigen(ref, utm ?? null, propio ?? null);
  chequear(`${titulo} → ${esperado}`, r === esperado, r);
};
const daPwa = (titulo: string, ref: string | null, esperado: Origen, utm?: string) => {
  const r = clasificarOrigen(ref, utm ?? null, null, true);
  chequear(`${titulo} → ${esperado}`, r === esperado, r);
};

/* ── Las redes ────────────────────────────────────────────────────────────── */
console.log("\n1) Las redes, por el referente");

da("instagram.com", "https://www.instagram.com/", "instagram");
// Por acá llega la mayoría: es el redirector del link del perfil y de las historias.
da("l.instagram.com (el redirector)", "https://l.instagram.com/?u=algo", "instagram");
da("facebook.com", "https://www.facebook.com/algo", "facebook");
da("m.facebook.com", "https://m.facebook.com/algo", "facebook");
da("l.facebook.com", "https://l.facebook.com/l.php?u=x", "facebook");
da("fb.me", "https://fb.me/x", "facebook");
da("api.whatsapp.com", "https://api.whatsapp.com/", "whatsapp");
da("web.whatsapp.com", "https://web.whatsapp.com/", "whatsapp");
da("tiktok", "https://www.tiktok.com/@alguien", "tiktok");
da("youtu.be", "https://youtu.be/abc", "youtube");

/* ── Google y el correo, que se pisan ─────────────────────────────────────── */
console.log("\n2) Google y el correo");

da("google.com", "https://www.google.com/", "google");
da("google.com.ar", "https://www.google.com.ar/", "google");
da("google.es", "https://google.es/search?q=x", "google");

// LA trampa: `mail.google.com` engancha con la regla de Google. Si el orden se
// da vuelta, cada click desde un mail que la dueña mandó se le acredita al
// buscador — dos canales distintos y uno se lleva el crédito del otro.
da("gmail NO es google", "https://mail.google.com/mail/u/0", "email");
da("outlook", "https://outlook.live.com/mail/0", "email");
da("yahoo mail", "https://mail.yahoo.com/d/folders/1", "email");

/* ── Directo, y lo que no lo es ───────────────────────────────────────────── */
console.log("\n3) Directo");

da("sin referente", null, "directo");
da("referente vacio", "", "directo");
da("solo espacios", "   ", "directo");

// Algo lo mando, aunque no sepamos qué. Decir "directo" seria afirmar que
// escribio la direccion a mano, y eso es otra cosa.
da("referente que no es URL", "no-soy-una-url", "otro");
da("un blog cualquiera", "https://algunblog.com.ar/nota", "otro");

/* ── La tienda misma ──────────────────────────────────────────────────────── */
console.log("\n4) La tienda no se cuenta a si misma");

da("mismo host", "https://mitienda.com/producto/1", "directo", undefined, "mitienda.com");
da("mismo host con www", "https://www.mitienda.com/x", "directo", undefined, "mitienda.com");
da("el host propio venia con www", "https://mitienda.com/x", "directo", undefined, "www.mitienda.com");
// Con dominio propio, venir del listado de TiendaApps SI es trafico que trajo
// la plataforma.
da("desde el listado de TiendaApps", "https://tiendaapps.com/tiendas", "tiendaapps", undefined, "mitienda.com");

/* ── El utm le gana al referente ──────────────────────────────────────────── */
console.log("\n5) El utm manda");

// Es el arreglo del agujero de WhatsApp: el navegador de WhatsApp casi nunca
// manda referente, asi que sin utm esa visita cae en "directo". Con utm se
// clasifica bien SIEMPRE, y por eso le tiene que ganar al referente.
da("utm=whatsapp sin referente", null, "whatsapp", "whatsapp");
da("utm=wsp", null, "whatsapp", "wsp");
da("utm=ig", null, "instagram", "ig");
da("utm en mayusculas", null, "instagram", "Instagram");
da("utm con espacios", null, "instagram", "  instagram  ");
da("el utm le gana al referente", "https://www.google.com/", "instagram", "instagram");

// Un utm que no conocemos NO es directo: la duena etiqueto el link a proposito,
// asi que algo lo trajo. Decir "directo" seria borrar una campaña real.
da("utm desconocido no es directo", null, "otro", "revista-del-barrio");

/* ── La app instalada ─────────────────────────────────────────────────────── */
console.log("\n5b) La app instalada");

// Una app abierta desde la pantalla de inicio no manda referente. Sin esta
// etiqueta caía en "directo", que no es un dato que falta sino uno mal puesto:
// cuantas más instalaciones, más se infla la bolsa y peor se lee el tablero.
daPwa("app sin referente ya no es directo", null, "pwa");

// El envase no se lleva el crédito del canal: si tocó un link etiquetado y
// Android lo abrió adentro de la app, esa visita la trajo WhatsApp.
daPwa("el utm le gana a la app", null, "whatsapp", "whatsapp");
daPwa("y tambien con utm desconocido", null, "otro", "revista-del-barrio");

// Lo mismo con el referente, por el mismo motivo. En Android un link de Instagram
// se puede abrir ADENTRO de la app instalada: hay standalone Y hay referente, y esa
// visita la trajo Instagram. Contarla como "app" borraba el canal que la trajo.
daPwa("el referente tambien le gana a la app", "https://www.instagram.com/", "instagram");
daPwa("y un referente desconocido igual", "https://algunblog.com.ar/nota", "otro");

// La tienda misma no es un canal, asi que ahi la app SI es el dato que queda.
chequear("desde la tienda misma, adentro de la app, cuenta como app",
  clasificarOrigen("https://mitienda.com/x", null, "mitienda.com", true) === "pwa");
chequear("y sin la app, sigue siendo directo",
  clasificarOrigen("https://mitienda.com/x", null, "mitienda.com", false) === "directo");

// Sin la bandera nada cambia: es el camino de todo el mundo que entra por el
// navegador, y no se puede haber movido.
da("sin la bandera sigue siendo directo", null, "directo");

// "pwa" es un canal de verdad, no una bolsa: tiene que poder subir en la lista.
chequear("la app no es una bolsa",
  ordenarOrigenes([
    { origen: "directo" as Origen, visitas: 900 },
    { origen: "pwa" as Origen, visitas: 5 },
  ])[0].origen === "pwa");

/* ── Basura ───────────────────────────────────────────────────────────────── */
console.log("\n6) Lo que puede mandar cualquiera");

// El referente y el utm los manda el cliente: son texto de un desconocido.
const larguisimo = "https://x.com/" + "a".repeat(50_000);
chequear("un referente de 50k no explota", (() => {
  try { clasificarOrigen(larguisimo, null); return true; } catch { return false; }
})());
chequear("un utm de 50k no explota", (() => {
  try { clasificarOrigen(null, "a".repeat(50_000)); return true; } catch { return false; }
})());
da("javascript: no es un host", "javascript:alert(1)", "otro");
da("un host que parece google pero no", "https://notgoogle.com/x", "otro");
da("google en el path no cuenta", "https://malicioso.com/google.com/", "otro");

/* ── El orden de la pantalla ──────────────────────────────────────────────── */
console.log("\n7) El orden");

const filas = [
  { origen: "directo" as Origen, visitas: 500 },
  { origen: "instagram" as Origen, visitas: 80 },
  { origen: "otro" as Origen, visitas: 300 },
  { origen: "whatsapp" as Origen, visitas: 120 },
];
const ordenadas = ordenarOrigenes(filas).map((f) => f.origen);
// "Directo" y "otro" son bolsas, no canales: nadie decide invertir mas en
// directo. Arriba tienen que quedar los que si se pueden mover, aunque sean
// mas chicos.
chequear("las bolsas van al final aunque sean las mas grandes",
  ordenadas[0] === "whatsapp" && ordenadas[1] === "instagram", ordenadas);
chequear("y entre ellas tambien ordena", ordenadas[2] === "directo" && ordenadas[3] === "otro", ordenadas);

/* ── La lista cerrada ─────────────────────────────────────────────────────── */
console.log("\n8) La lista");

chequear("todos los origenes tienen nombre para mostrar",
  ORIGENES.every((o) => typeof NOMBRE_ORIGEN[o] === "string" && NOMBRE_ORIGEN[o].length > 0));
// La etiqueta es parte de la clave de la tabla: lo que salga de acá se escribe
// en la base y se compara con lo ya escrito.
const salidas = new Set<string>();
for (const ref of [null, "", "x", "https://instagram.com", "https://raro.io", "javascript:x"]) {
  for (const utm of [null, "ig", "loquesea", ""]) {
    // Las dos ramas, con y sin app: la de la app también escribe en la tabla.
    salidas.add(clasificarOrigen(ref, utm));
    salidas.add(clasificarOrigen(ref, utm, null, true));
  }
}
chequear("nunca devuelve algo fuera de la lista",
  [...salidas].every((s) => (ORIGENES as readonly string[]).includes(s)), [...salidas]);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
