/**
 * Detección de bots por User-Agent.
 *
 * Las visitas se registran desde el navegador, así que un crawler que no ejecuta
 * JavaScript no llegaba nunca a contarse. El problema son los que sí lo ejecutan
 * —Googlebot renderiza, y lo mismo hacen los de SEO, los de captura de pantalla y
 * los monitores de uptime—: ésos entraban como visitas reales, inflaban el número
 * y hundían la conversión, porque nunca compran.
 *
 * La lista es por sufijo/palabra y no por coincidencia exacta a propósito: los
 * User-Agent cambian de versión todo el tiempo pero conservan el nombre.
 */

/**
 * Un User-Agent se considera bot si contiene alguno de estos. Todo en minúscula:
 * la comparación se hace sobre el UA ya pasado a minúscula.
 */
const SENALES_DE_BOT = [
  // Genéricos — cubren la enorme mayoría
  "bot", "crawl", "spider", "slurp", "scraper", "fetcher",

  // Buscadores que ejecutan JavaScript
  "googlebot", "adsbot", "mediapartners", "bingpreview", "applebot",
  "yandex", "baidu", "duckduck", "sogou", "exabot",

  // Vistas previas de links (no ejecutan JS, pero sí llegan por POST directo)
  "facebookexternalhit", "facebot", "whatsapp", "telegram", "discord",
  "slack", "pinterest", "redditbot", "embedly", "quora link preview",

  // SEO y análisis de la competencia — de los que más ensucian
  "ahrefs", "semrush", "mj12", "dotbot", "petal", "seznam", "serpstat",
  "dataforseo", "blexbot", "screaming frog",

  // Entrenamiento de modelos
  "gptbot", "claudebot", "anthropic", "ccbot", "perplexity", "bytespider",
  "amazonbot", "youbot", "diffbot", "img2dataset",

  // Navegadores automatizados y auditorías
  "headless", "phantomjs", "puppeteer", "playwright", "selenium",
  "lighthouse", "pagespeed", "chrome-lighthouse",

  // Monitores y clientes de consola
  "uptime", "pingdom", "statuscake", "monitoring", "newrelic",
  "curl/", "wget", "python-requests", "python-urllib", "go-http-client",
  "java/", "okhttp", "axios/", "node-fetch", "postman", "insomnia",
  "libwww-perl", "httpclient", "apache-httpclient",
];

/**
 * ¿Este User-Agent es de un bot?
 *
 * Un UA vacío también cuenta: todos los navegadores mandan uno. Que falte
 * significa que del otro lado no hay un navegador —es un script pegándole
 * derecho al endpoint—.
 */
export function esBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase().trim();
  if (ua.length === 0) return true;
  return SENALES_DE_BOT.some((senal) => ua.includes(senal));
}
