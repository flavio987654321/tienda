// Browser-only — import only from client components ("use client").

export function isPwa(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Deep links from push notifications carry ?source=pwa
  const fromPwa = new URLSearchParams(window.location.search).get("source") === "pwa";
  return standalone || fromPwa;
}
