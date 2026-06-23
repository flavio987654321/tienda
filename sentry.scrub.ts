import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEYS = [
  "email",
  "phone",
  "telefono",
  "address",
  "shippingaddress",
  "direccion",
  "dni",
  "cbu",
  "cvu",
  "cuil",
  "cuit",
  "alias",
  "password",
  "token",
  "authorization",
  "cookie",
  "mpaccesstoken",
  "mprefreshtoken",
  "snapshotcbu",
  "snapshotalias",
  "snapshotcuil",
  "snapshotholder",
];

function isSensitiveKey(key: string) {
  const k = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[Filtered]" : scrub(val, depth + 1);
    }
    return out;
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by Sentry's beforeSend signature
export function scrubPii(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  if (event.request) {
    if (event.request.data) event.request.data = scrub(event.request.data) as typeof event.request.data;
    if (event.request.cookies) event.request.cookies = {};
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete headers.cookie;
      delete headers.Cookie;
      delete headers.authorization;
      delete headers.Authorization;
      event.request.headers = headers;
    }
  }
  if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
  if (event.user) {
    const { id } = event.user;
    event.user = id ? { id } : undefined;
  }
  return event;
}
