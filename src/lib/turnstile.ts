import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import type { Prisma } from "@prisma/client";

const MAX_HOSTNAMES = 10;
const MAX_WIDGETS = 20;
type WidgetApiResult = { success?: boolean; result?: { sitekey?: string; secret?: string; name?: string; domains?: string[]; mode?: string } | Array<unknown>; errors?: unknown };

export function normalizeTurnstileHostname(hostname: string): string {
  let normalized = hostname.trim().toLowerCase();
  if (normalized.startsWith("[") && normalized.includes("]")) normalized = normalized.slice(1, normalized.indexOf("]"));
  else normalized = normalized.replace(/:\d+$/, "");
  return normalized.replace(/^www\./, "").replace(/\.$/, "");
}

function adminConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_TURNSTILE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

function widgetUrl(siteKey?: string) {
  const cfg = adminConfig();
  if (!cfg) return null;
  return `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/challenges/widgets${siteKey ? `/${encodeURIComponent(siteKey)}` : ""}`;
}

function headers() {
  return { Authorization: `Bearer ${adminConfig()?.apiToken ?? ""}`, "Content-Type": "application/json" };
}

async function callWidget(url: string, init?: RequestInit): Promise<WidgetApiResult> {
  const response = await fetch(url, { ...init, headers: headers(), signal: AbortSignal.timeout(10_000) });
  if (response.status === 204) return { success: true };
  const data = await response.json() as WidgetApiResult;
  if (!response.ok || !data.success) throw new Error(JSON.stringify(data.errors ?? `Cloudflare HTTP ${response.status}`));
  return data;
}

async function saveWidget(tx: Prisma.TransactionClient, siteKey: string, name: string, secret: string) {
  await tx.turnstileWidget.upsert({
    where: { siteKey },
    create: { siteKey, name, secretEncrypted: encrypt(secret) },
    update: { name, secretEncrypted: encrypt(secret) },
  });
}

async function setWidgetDomains(siteKey: string, domains: string[]) {
  const url = widgetUrl(siteKey);
  if (!url) throw new Error("Falta configurar Cloudflare Turnstile");
  const current = await callWidget(url);
  const r = current.result as { name?: string; mode?: string; domains?: string[]; bot_fight_mode?: boolean; clearance_level?: string; offlabel?: boolean; region?: string } | undefined;
  if (!r) throw new Error("Cloudflare no devolvió la configuración del widget");
  await callWidget(url, { method: "PUT", body: JSON.stringify({
    name: r.name, mode: r.mode, domains,
    ...(r.bot_fight_mode !== undefined ? { bot_fight_mode: r.bot_fight_mode } : {}),
    ...(r.clearance_level ? { clearance_level: r.clearance_level } : {}),
    ...(r.offlabel !== undefined ? { offlabel: r.offlabel } : {}),
    ...(r.region ? { region: r.region } : {}),
  }) });
}

/** Registra dominios en una flota de widgets del plan gratuito (20 x 10). */
export async function syncTurnstileHostname(hostname: string, op: "add" | "remove"): Promise<boolean> {
  const domain = normalizeTurnstileHostname(hostname);
  if (!domain || !domain.includes(".")) return false;
  const cfg = adminConfig();
  const primaryKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const primarySecret = process.env.TURNSTILE_SECRET_KEY;
  const collectionUrl = widgetUrl();
  if (!cfg || !primaryKey || !primarySecret || !collectionUrl) {
    console.error("[turnstile] faltan claves de Cloudflare para administrar dominios");
    return false;
  }
  try { encrypt("turnstile-config-check"); } catch (error) {
    console.error("[turnstile] ENCRYPTION_KEY no está configurada; no se pueden guardar secretos de widgets", error);
    return false;
  }

  let newlyCreatedSiteKey: string | undefined;
  try {
    // El bloqueo evita que altas simultáneas asignen más de 10 dominios al mismo widget.
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('turnstile-widget-pool'))`;

      const existing = await tx.turnstileHostname.findUnique({ where: { hostname: domain } });
      if (op === "remove") {
        if (!existing || domain === normalizeTurnstileHostname(new URL(SITE_URL).hostname)) return true;
        // Serializar con las reservas Store/Product y volver a comprobar aquí:
        // el chequeo previo del caller no alcanza para evitar una carrera.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dom:" + domain}))`;
        const [storeUse, productUse] = await Promise.all([
          tx.store.findFirst({
            where: { OR: [{ customDomain: { in: [domain, `www.${domain}`] } }, { customDomain: { endsWith: `.${domain}` } }] },
            select: { id: true },
          }),
          tx.product.findFirst({
            where: { OR: [{ dominioPropio: { in: [domain, `www.${domain}`] } }, { dominioPropio: { endsWith: `.${domain}` } }] },
            select: { id: true },
          }),
        ]);
        if (storeUse || productUse) return true;
        const widget = await tx.turnstileWidget.findUnique({ where: { siteKey: existing.siteKey }, include: { hostnames: true } });
        if (!widget) { await tx.turnstileHostname.delete({ where: { hostname: domain } }); return true; }
        const remaining = widget.hostnames.map((h) => h.hostname).filter((h) => h !== domain);
        await setWidgetDomains(widget.siteKey, remaining);
        await tx.turnstileHostname.delete({ where: { hostname: domain } });
        if (remaining.length === 0 && widget.siteKey !== primaryKey) {
          const delUrl = widgetUrl(widget.siteKey);
          if (delUrl) await callWidget(delUrl, { method: "DELETE" });
          await tx.turnstileWidget.delete({ where: { siteKey: widget.siteKey } });
        }
        return true;
      }
      if (existing) return true;

      // Registrar la clave primaria existente en el pool, conservando las listas remotas.
      await saveWidget(tx, primaryKey, "TiendaApps principal", primarySecret);
      const primary = await callWidget(widgetUrl(primaryKey)!);
      const primaryResult = primary.result as { domains?: string[] } | undefined;
      const primaryDomains = (primaryResult?.domains ?? []).map(normalizeTurnstileHostname);
      for (const known of primaryDomains) {
        await tx.turnstileHostname.upsert({ where: { hostname: known }, create: { hostname: known, siteKey: primaryKey }, update: {} });
      }
      if (await tx.turnstileHostname.findUnique({ where: { hostname: domain } })) return true;

      const widgets = await tx.turnstileWidget.findMany({ include: { hostnames: true }, orderBy: { createdAt: "asc" } });
      const available = widgets.find((w) => w.hostnames.length < MAX_HOSTNAMES);
      if (available) {
        const domains = [...new Set([...available.hostnames.map((h) => h.hostname), domain])];
        await setWidgetDomains(available.siteKey, domains);
        await tx.turnstileHostname.create({ data: { hostname: domain, siteKey: available.siteKey } });
        return true;
      }

      const remoteWidgets = await callWidget(collectionUrl);
      const remoteCount = Array.isArray(remoteWidgets.result) ? remoteWidgets.result.length : widgets.length;
      if (remoteCount >= MAX_WIDGETS) throw new Error("Se alcanzó el máximo de 20 widgets Turnstile del plan gratuito");
      const created = await callWidget(collectionUrl, { method: "POST", body: JSON.stringify({ name: `TiendaApps ${widgets.length + 1}`, domains: [domain], mode: "managed" }) });
      const r = created.result as { sitekey?: string; secret?: string; name?: string } | undefined;
      if (!r?.sitekey || !r.secret) throw new Error("Cloudflare no devolvió las claves del nuevo widget");
      newlyCreatedSiteKey = r.sitekey;
      await saveWidget(tx, r.sitekey, r.name ?? `TiendaApps ${widgets.length + 1}`, r.secret);
      await tx.turnstileHostname.create({ data: { hostname: domain, siteKey: r.sitekey } });
      return true;
    }, { timeout: 60_000 });
  } catch (error) {
    if (newlyCreatedSiteKey) {
      const url = widgetUrl(newlyCreatedSiteKey);
      if (url) await callWidget(url, { method: "DELETE" }).catch((cleanupError) => console.error("[turnstile] no se pudo limpiar un widget creado sin guardar", cleanupError));
    }
    console.error(`[turnstile] no se pudo ${op} ${domain}:`, error);
    return false;
  }
}

export async function getTurnstileSiteKey(hostname: string): Promise<{ configured: boolean; siteKey?: string; error?: string }> {
  const publicKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const domain = normalizeTurnstileHostname(hostname);
  const primaryHost = normalizeTurnstileHostname(new URL(SITE_URL).hostname);
  const isPrimaryHost = domain === primaryHost || domain === "tiendaapps.com";
  const isLocalHost = domain === "localhost" || domain === "127.0.0.1" || domain === "::1";
  const isVercelPreview = process.env.VERCEL_ENV === "preview" && domain.endsWith(".vercel.app");
  if (isPrimaryHost || isVercelPreview || (isLocalHost && process.env.NODE_ENV !== "production")) {
    if (publicKey && secret) return { configured: true, siteKey: publicKey };
    if (process.env.NODE_ENV !== "production") return { configured: false };
    return { configured: true, error: "La verificación de seguridad no está configurada. Contactá al administrador." };
  }
  let candidate = domain;
  while (candidate.includes(".")) {
    const mapping = await prisma.turnstileHostname.findUnique({ where: { hostname: candidate }, select: { siteKey: true } });
    if (mapping) return { configured: true, siteKey: mapping.siteKey };
    candidate = candidate.slice(candidate.indexOf(".") + 1);
  }
  const alternate = domain.startsWith("www.") ? domain.slice(4) : `www.${domain}`;
  const [store, product] = await Promise.all([
    prisma.store.findFirst({ where: { customDomain: { in: [domain, alternate] } }, select: { id: true } }),
    prisma.product.findFirst({ where: { dominioPropio: { in: [domain, alternate] }, deletedAt: null }, select: { id: true } }),
  ]);
  if (publicKey && secret && (store || product) && await syncTurnstileHostname(domain, "add")) {
    const mapping = await prisma.turnstileHostname.findUnique({ where: { hostname: domain }, select: { siteKey: true } });
    if (mapping) return { configured: true, siteKey: mapping.siteKey };
  }
  return { configured: true, error: "Este dominio todavía no tiene la verificación de seguridad configurada." };
}

export async function verifyTurnstile(token: unknown, ip: string, expectedAction: string, expectedHostname: string): Promise<boolean> {
  let secret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHost = normalizeTurnstileHostname(expectedHostname);
  const primaryHost = normalizeTurnstileHostname(new URL(SITE_URL).hostname);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(expectedHost);
  const isVercelPreview = process.env.VERCEL_ENV === "preview" && expectedHost.endsWith(".vercel.app");
  const isPrimaryHost = expectedHost === primaryHost || expectedHost === "tiendaapps.com" || isVercelPreview || (isLocalHost && process.env.NODE_ENV !== "production");
  if (!isPrimaryHost) {
    let candidate = expectedHost;
    let mapping: { siteKey: string; widget: { secretEncrypted: string } } | null = null;
    while (candidate.includes(".")) {
      mapping = await prisma.turnstileHostname.findUnique({ where: { hostname: candidate }, include: { widget: true } });
      if (mapping) break;
      candidate = candidate.slice(candidate.indexOf(".") + 1);
    }
    if (!mapping) return false;
    try { secret = decrypt(mapping.widget.secretEncrypted); }
    catch (e) { console.error("[turnstile] no se pudo descifrar la clave del widget", e); return false; }
  }
  const allowUnconfigured = process.env.NODE_ENV !== "production" && isPrimaryHost;
  if (!secret) { console.warn("[turnstile] TURNSTILE_SECRET_KEY no configurada"); return allowUnconfigured; }
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && isPrimaryHost) { console.warn("[turnstile] clave pública no configurada"); return allowUnconfigured; }
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Siteverify respondió HTTP ${res.status}`);
    const data = await res.json() as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
    if (data.success === true) return data.action === expectedAction && normalizeTurnstileHostname(data.hostname ?? "") === expectedHost;
    const codes = data["error-codes"] ?? [];
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      console.error("[turnstile] clave secreta inválida — verificación omitida:", codes);
      return allowUnconfigured;
    }
    return false;
  } catch (e) { console.error("[turnstile] siteverify inaccesible:", e); return allowUnconfigured; }
}
