export function normalizeCouponCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("es-AR");
}

export function isValidCouponCode(value: string) {
  return /^[\p{L}\p{N}\s_\-+.!%&/]+$/u.test(value);
}

export function getCouponVisualSeed(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
