/**
 * Chequeos del filtro de bots. Se corre a mano:
 *
 *   npx tsx src/lib/bots.check.ts
 *
 * Un filtro de bots tiene dos formas de fallar y las dos importan: dejar pasar un
 * crawler (infla las visitas y hunde la conversión) o bloquear a una persona real
 * (se pierde una venta del conteo y nadie se entera nunca). Los User-Agent de
 * abajo son textuales.
 */

import { esBot } from "./bots";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── Personas reales ──────────────────────────────────────────────────────── */
console.log("\n1) Gente de verdad — NINGUNO puede dar bot");

const NAVEGADORES: [string, string][] = [
  ["Chrome en Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"],
  ["Chrome en Android", "Mozilla/5.0 (Linux; Android 13; SM-A526B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"],
  ["Safari en iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"],
  ["Safari en Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15"],
  ["Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"],
  ["Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.68"],
  ["Samsung Internet", "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36"],
  ["Opera", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0"],
  ["Chrome en iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1"],
  ["el navegador de Instagram", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.0.32.98"],
  ["el navegador de Facebook", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.47.108]"],
];

for (const [nombre, ua] of NAVEGADORES) {
  chequear(`${nombre} pasa`, !esBot(ua), ua);
}

/* ── Bots ─────────────────────────────────────────────────────────────────── */
console.log("\n2) Bots — TODOS tienen que quedar afuera");

const BOTS: [string, string][] = [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["Googlebot que renderiza", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36"],
  ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
  ["AdsBot de Google", "AdsBot-Google (+http://www.google.com/adsbot.html)"],
  ["Applebot", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)"],
  ["YandexBot", "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)"],
  ["AhrefsBot", "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)"],
  ["SemrushBot", "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)"],
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot"],
  ["ClaudeBot", "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"],
  ["PerplexityBot", "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"],
  ["Bytespider", "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)"],
  ["Chrome headless", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36"],
  ["Lighthouse", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Chrome-Lighthouse"],
  ["la vista previa de WhatsApp", "WhatsApp/2.23.20.0"],
  ["la vista previa de Facebook", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
  ["Twitterbot", "Twitterbot/1.0"],
  ["Telegram", "TelegramBot (like TwitterBot)"],
  ["Discord", "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"],
  ["curl", "curl/8.4.0"],
  ["wget", "Wget/1.21.4"],
  ["python requests", "python-requests/2.31.0"],
  ["axios", "axios/1.6.8"],
  ["Postman", "PostmanRuntime/7.37.3"],
  ["Go", "Go-http-client/2.0"],
  ["un monitor de uptime", "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)"],
];

for (const [nombre, ua] of BOTS) {
  chequear(`${nombre} queda afuera`, esBot(ua), ua);
}

/* ── Sin User-Agent ───────────────────────────────────────────────────────── */
console.log("\n3) Sin User-Agent");

// Todos los navegadores mandan uno. Que falte significa que del otro lado no hay
// un navegador: es un script pegándole derecho al endpoint.
chequear("null cuenta como bot", esBot(null));
chequear("undefined cuenta como bot", esBot(undefined));
chequear("vacío cuenta como bot", esBot(""));
chequear("sólo espacios cuenta como bot", esBot("   "));

/* ── Mayúsculas ───────────────────────────────────────────────────────────── */
console.log("\n4) Da igual cómo esté escrito");

chequear("GOOGLEBOT en mayúsculas", esBot("GOOGLEBOT/2.1"));
chequear("CuRl mezclado", esBot("CuRl/8.4.0"));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
