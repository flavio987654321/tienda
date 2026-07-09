"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Copy, Check, Mail } from "lucide-react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { Turnstile } from "@/components/Turnstile";

// Se muestra cuando el dueño de la tienda no cargó su propio texto legal —
// deja en claro que los sectores no tienen todos la misma chance de salir.
const DEFAULT_LEGAL_TEXT = "Los premios se sortean con distinta probabilidad cada uno. Un premio por persona.";

// ─── Types ─────────────────────────────────────────────────────────────────

type WStyles = {
  popupBg: string; textColor: string;
  buttonBg: string; buttonText: string;
  couponBg: string; couponText: string;
  spinnerColors: string[]; spinnerBorder: string;
  centerBg: string; centerBorder: string; centerText: string;
};

type WPrize = { id: string; label: string; order: number; isNoPrize: boolean; };

type WidgetConfig = {
  id: string; type: "SPIN" | "SCRATCH";
  title: string; subtitle: string; buttonText: string;
  reclaimText: string; legalText: string;
  centerType: string; centerText: string;
  triggerType: "ON_ENTER" | "FIRST_CLICK" | "DELAY";
  triggerDelay: number | null;
  showFrequency: "ONCE_EVER" | "ONCE_SESSION" | "ALWAYS";
  emailRequired: boolean;
  styles: WStyles;
  prizes: WPrize[];
};

type PlayResult = {
  alreadySpun: boolean;
  prizeLabel: string | null;
  couponCode: string | null;
  isNoPrize: boolean;
  prizeIndex: number;
  expiresAt: string | null;
};

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${date} a las ${time}`;
}

// ─── Wheel drawing ──────────────────────────────────────────────────────────

function renderWheel(canvas: HTMLCanvasElement, cfg: WidgetConfig, rotation: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width; const H = canvas.height;
  const cx = W / 2; const cy = H / 2;
  const r = Math.min(W, H) / 2 - 3;
  const items = cfg.prizes.length > 0 ? cfg.prizes : [
    { label: "Premio 1", isNoPrize: false }, { label: "Premio 2", isNoPrize: false },
    { label: "Premio 3", isNoPrize: false }, { label: "Sin premio", isNoPrize: true },
  ];
  const n = items.length;
  const step = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, W, H);

  items.forEach((p, i) => {
    const sa = rotation + i * step - Math.PI / 2;
    const ea = sa + step;
    const x1 = cx + r * Math.cos(sa); const y1 = cy + r * Math.sin(sa);
    const x2 = cx + r * Math.cos(ea); const y2 = cy + r * Math.sin(ea);
    const mid = sa + step / 2;
    const tx = cx + r * 0.64 * Math.cos(mid); const ty = cy + r * 0.64 * Math.sin(mid);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sa, ea);
    ctx.closePath();
    ctx.fillStyle = cfg.styles.spinnerColors[i % cfg.styles.spinnerColors.length];
    ctx.fill();
    ctx.strokeStyle = cfg.styles.spinnerBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(r * 0.1)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((p.label || "").length > 10 ? p.label.slice(0, 10) + "…" : p.label, 0, 0);
    ctx.restore();
  });

  // Center circle
  const cr = Math.round(r * 0.21);
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, 2 * Math.PI);
  ctx.fillStyle = cfg.styles.centerBg;
  ctx.fill();
  ctx.strokeStyle = cfg.styles.centerBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  const lbl = (cfg.centerType === "text" ? cfg.centerText : "").slice(0, 6);
  if (lbl) {
    ctx.fillStyle = cfg.styles.centerText;
    ctx.font = `bold ${Math.round(cr * 0.46)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl, cx, cy);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

type Phase = "idle" | "tab" | "popup" | "playing" | "done";

export default function GamificationWidget() {
  const store = useStoreConfig();
  const storeId = store?.storeId;

  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [result, setResult] = useState<PlayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileConfigured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(0);
  const scratchInited = useRef(false);

  // ── Load config ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/gamification/public?storeId=${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.widget) setCfg(data.widget); })
      .catch(() => {});
  }, [storeId]);

  // ── Trigger logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cfg) return;
    const key = `gw_${cfg.id}`;
    if (cfg.showFrequency === "ONCE_EVER" && typeof window !== "undefined" && localStorage.getItem(key)) return;
    if (cfg.showFrequency === "ONCE_SESSION" && typeof window !== "undefined" && sessionStorage.getItem(key)) return;

    const show = () => setPhase(p => p === "idle" ? "tab" : p);

    if (cfg.triggerType === "ON_ENTER") {
      const t = setTimeout(show, 800); // pequeña pausa para no aparecer antes de que cargue la tienda
      return () => clearTimeout(t);
    } else if (cfg.triggerType === "FIRST_CLICK") {
      const h = () => { show(); document.removeEventListener("click", h, true); };
      document.addEventListener("click", h, true);
      return () => document.removeEventListener("click", h, true);
    } else if (cfg.triggerType === "DELAY") {
      const t = setTimeout(show, (cfg.triggerDelay ?? 5) * 1000);
      return () => clearTimeout(t);
    }
  }, [cfg]);

  // ── Draw wheel when popup opens ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "popup" || cfg?.type !== "SPIN") return;
    const canvas = wheelRef.current;
    if (canvas) renderWheel(canvas, cfg, rotation.current);
  }, [phase, cfg]);

  // ── Init scratch canvas when playing phase starts ────────────────────────
  const initScratch = useCallback(() => {
    const canvas = scratchRef.current;
    if (!canvas || scratchInited.current) return;
    scratchInited.current = true;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;

    // Gold cover
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#D4A836");
    grad.addColorStop(0.48, "#F0C84A");
    grad.addColorStop(1, "#A87820");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Texture dots
    for (let i = 0; i < 250; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2.5 + 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fill();
    }
    // Horizontal scratch lines
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 12 + i * 18, W, 6);
    }

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `bold ${Math.round(W * 0.057)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RASPÁ Y GANÁ", W / 2, H / 2);

    let scratching = false;

    function pos(e: MouseEvent | Touch) {
      const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    }

    function scratch(x: number, y: number) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, 2 * Math.PI);
      ctx.fill();
      // Check if enough is scratched
      const d = ctx.getImageData(0, 0, W, H).data;
      let cleared = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] === 0) cleared++;
      if (cleared / (W * H) > 0.52) revealScratch();
    }

    function revealScratch() {
      if (!scratchInited.current) return;
      ctx.clearRect(0, 0, W, H);
      setPhase("done");
    }

    canvas.addEventListener("mousedown", () => { scratching = true; });
    canvas.addEventListener("mousemove", (e) => { if (scratching) { const p = pos(e); scratch(p.x, p.y); } });
    canvas.addEventListener("mouseup", () => { scratching = false; });
    canvas.addEventListener("mouseleave", () => { scratching = false; });
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); scratching = true; }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (scratching) { const p = pos(e.touches[0]); scratch(p.x, p.y); }
    }, { passive: false });
    canvas.addEventListener("touchend", () => { scratching = false; });
  }, []);

  useEffect(() => {
    if (phase === "playing" && cfg?.type === "SCRATCH") {
      const t = setTimeout(initScratch, 60);
      return () => clearTimeout(t);
    }
  }, [phase, cfg, initScratch]);

  // ── Play ─────────────────────────────────────────────────────────────────
  async function handlePlay() {
    if (!cfg || busy) return;
    if (cfg.emailRequired) {
      if (!email.trim()) { setEmailErr("Ingresá tu email para continuar"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Email inválido"); return; }
    }
    setEmailErr("");
    setBusy(true);

    try {
      const res = await fetch("/api/gamification/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId: cfg.id, email: email.trim() || undefined, turnstileToken }),
      });
      const data: PlayResult = await res.json();

      // Mark as played (frequency tracking)
      const key = `gw_${cfg.id}`;
      if (cfg.showFrequency === "ONCE_EVER") localStorage.setItem(key, "1");
      else if (cfg.showFrequency === "ONCE_SESSION") sessionStorage.setItem(key, "1");

      if (cfg.type === "SPIN") {
        await spinAnimate(data);
      } else {
        // Scratch: set result then show scratch canvas
        setResult(data);
        if (data.alreadySpun || data.isNoPrize) {
          setPhase("done");
        } else {
          setPhase("playing");
        }
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  async function spinAnimate(data: PlayResult) {
    const canvas = wheelRef.current;
    if (!canvas || !cfg) { setResult(data); setPhase("done"); setBusy(false); return; }

    const n = cfg.prizes.length || 4;
    const step = (2 * Math.PI) / n;
    const idx = Math.max(0, Math.min(data.prizeIndex, n - 1));
    const sliceCenter = idx * step + step / 2;
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const target = fullSpins - sliceCenter;
    const startRot = rotation.current;
    const duration = 4200;
    const start = performance.now();

    await new Promise<void>(resolve => {
      function frame(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const rot = startRot + target * ease;
        renderWheel(canvas!, cfg!, rot);
        if (t < 1) requestAnimationFrame(frame);
        else { rotation.current = rot % (2 * Math.PI); resolve(); }
      }
      requestAnimationFrame(frame);
    });

    setResult(data);
    setPhase("done");
    setBusy(false);
  }

  function copyCode() {
    if (!result?.couponCode) return;
    navigator.clipboard.writeText(result.couponCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function closePopup() {
    setPhase("tab");
    scratchInited.current = false;
    // Keep result and email so re-open shows a sensible state
  }

  function openPopup() {
    setPhase("popup");
    // If already played and have result, go straight to done
    if (result) setPhase("done");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!cfg || phase === "idle") return null;

  const s = cfg.styles;
  const isPopupOpen = phase === "popup" || phase === "playing" || phase === "done";

  return (
    <>
      {/* ── Floating tab ── */}
      {phase === "tab" && (
        <button
          onClick={openPopup}
          aria-label={cfg.title}
          className="fixed left-0 top-1/2 z-[9990] -translate-y-1/2 rounded-r-2xl px-2.5 py-5 shadow-xl transition-all duration-200 hover:translate-x-0.5 hover:brightness-110 active:scale-95"
          style={{ background: s.buttonBg }}
        >
          <span
            className="flex flex-col items-center gap-1.5"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: s.buttonText }}
          >
            <span className="text-base">{cfg.type === "SPIN" ? "🎡" : "🪙"}</span>
            <span className="text-xs font-black tracking-wide whitespace-nowrap">{cfg.title}</span>
          </span>
        </button>
      )}

      {/* ── Popup overlay ── */}
      {isPopupOpen && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: s.popupBg }}
          >
            {/* Close button */}
            <button
              onClick={closePopup}
              className="absolute right-4 top-4 z-10 rounded-full p-1.5 transition-opacity hover:opacity-60"
              style={{ background: "rgba(255,255,255,0.12)" }}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" style={{ color: s.textColor }} />
            </button>

            <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-6">

              {/* ── DONE: ya jugó / ya tenía resultado ── */}
              {phase === "done" && result?.alreadySpun && (
                <>
                  <p className="text-3xl">👋</p>
                  <p className="text-center font-black text-lg" style={{ color: s.textColor }}>Ya participaste</p>
                  {result.couponCode && !result.isNoPrize && (
                    <>
                      <p className="text-center text-sm opacity-70" style={{ color: s.textColor }}>Tu código de descuento</p>
                      <div className="w-full rounded-2xl p-4 text-center" style={{ background: s.couponBg }}>
                        <p className="font-black text-2xl tracking-widest font-mono" style={{ color: s.couponText }}>{result.couponCode}</p>
                      </div>
                      <button onClick={copyCode}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-opacity hover:opacity-90"
                        style={{ background: s.buttonBg, color: s.buttonText }}>
                        {copied ? <><Check className="h-4 w-4" /> ¡Copiado!</> : <><Copy className="h-4 w-4" /> {cfg.reclaimText || "Copiar código"}</>}
                      </button>
                      {result.expiresAt && (
                        <p className="text-xs text-center opacity-50" style={{ color: s.textColor }}>Válido hasta el {formatExpiry(result.expiresAt)}</p>
                      )}
                      <p className="text-xs text-center opacity-40" style={{ color: s.textColor }}>Vas a poder volver a girar cuando uses este cupón o cuando venza.</p>
                    </>
                  )}
                  {result.isNoPrize && (
                    <p className="text-center text-sm opacity-60" style={{ color: s.textColor }}>No ganaste un premio esta vez.</p>
                  )}
                </>
              )}

              {/* ── DONE: ganó ── */}
              {phase === "done" && !result?.alreadySpun && !result?.isNoPrize && (
                <>
                  <p className="text-4xl animate-bounce">🎉</p>
                  <p className="text-center font-black text-xl leading-tight" style={{ color: s.textColor }}>{result?.prizeLabel}</p>
                  <div className="w-full rounded-2xl p-5 text-center" style={{ background: s.couponBg }}>
                    <p className="text-xs mb-1.5 opacity-60 uppercase tracking-widest" style={{ color: s.couponText }}>Tu código de descuento</p>
                    <p className="font-black text-2xl tracking-widest font-mono" style={{ color: s.couponText }}>{result?.couponCode}</p>
                  </div>
                  <button onClick={copyCode}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-opacity hover:opacity-90"
                    style={{ background: s.buttonBg, color: s.buttonText }}>
                    {copied ? <><Check className="h-4 w-4" /> ¡Copiado!</> : <><Copy className="h-4 w-4" /> Copiar código</>}
                  </button>
                  {result?.expiresAt && (
                    <p className="text-xs text-center opacity-50" style={{ color: s.textColor }}>Válido hasta el {formatExpiry(result.expiresAt)}</p>
                  )}
                  <p className="text-xs text-center opacity-50" style={{ color: s.textColor }}>Ingresalo al finalizar tu compra</p>
                </>
              )}

              {/* ── DONE: no ganó ── */}
              {phase === "done" && !result?.alreadySpun && result?.isNoPrize && (
                <>
                  <p className="text-4xl">😔</p>
                  <p className="text-center font-black text-lg" style={{ color: s.textColor }}>¡Esta vez no fue!</p>
                  <p className="text-center text-sm opacity-60" style={{ color: s.textColor }}>Seguí explorando la tienda, ¡hay productos increíbles!</p>
                  <button onClick={closePopup}
                    className="w-full rounded-2xl py-3 font-bold"
                    style={{ background: s.buttonBg, color: s.buttonText }}>
                    Ver productos
                  </button>
                </>
              )}

              {/* ── SPIN: rueda ── */}
              {(phase === "popup" || (phase !== "done" && cfg.type === "SPIN")) && cfg.type === "SPIN" && (
                <>
                  <p className="text-center font-black text-xl leading-tight" style={{ color: s.textColor }}>{cfg.title}</p>
                  <p className="text-center text-sm opacity-70" style={{ color: s.textColor }}>{cfg.subtitle}</p>

                  {/* Wheel */}
                  <div className="relative">
                    <canvas ref={wheelRef} width={256} height={256} className="block rounded-full" />
                    {/* Pointer */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        top: -10,
                        width: 0, height: 0,
                        borderLeft: "11px solid transparent",
                        borderRight: "11px solid transparent",
                        borderTop: `24px solid ${s.spinnerBorder}`,
                        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                      }}
                    />
                  </div>

                  {/* Email input */}
                  {cfg.emailRequired && (
                    <div className="w-full space-y-1">
                      <div
                        className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
                        style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)" }}
                      >
                        <Mail className="h-4 w-4 shrink-0 opacity-50" style={{ color: s.textColor }} />
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                          placeholder="tu@email.com"
                          className="flex-1 bg-transparent text-sm outline-none"
                          style={{ color: s.textColor }}
                        />
                      </div>
                      {emailErr && <p className="text-xs text-red-400">{emailErr}</p>}
                    </div>
                  )}

                  <Turnstile onVerify={setTurnstileToken} />

                  <button
                    onClick={handlePlay}
                    disabled={busy || (turnstileConfigured && !turnstileToken)}
                    className="w-full rounded-2xl py-3 font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: s.buttonBg, color: s.buttonText }}
                  >
                    {busy ? "Girando…" : cfg.buttonText}
                  </button>

                  <p className="text-center text-xs opacity-40 leading-relaxed" style={{ color: s.textColor }}>{cfg.legalText || DEFAULT_LEGAL_TEXT}</p>
                </>
              )}

              {/* ── SCRATCH: email + botón inicial ── */}
              {phase === "popup" && cfg.type === "SCRATCH" && (
                <>
                  <p className="text-center font-black text-xl leading-tight" style={{ color: s.textColor }}>{cfg.title}</p>
                  <p className="text-center text-sm opacity-70" style={{ color: s.textColor }}>{cfg.subtitle}</p>

                  {/* Preview estática de la raspadita (antes de rascar) */}
                  <div
                    className="w-full rounded-2xl flex items-center justify-center"
                    style={{ height: 110, background: "linear-gradient(135deg,#D4A836 0%,#F0C84A 50%,#A87820 100%)" }}
                  >
                    <span className="font-black text-sm tracking-widest text-white/70 uppercase">Raspá y ganá</span>
                  </div>

                  {cfg.emailRequired && (
                    <div className="w-full space-y-1">
                      <div
                        className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
                        style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.07)" }}
                      >
                        <Mail className="h-4 w-4 shrink-0 opacity-50" style={{ color: s.textColor }} />
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                          placeholder="tu@email.com"
                          className="flex-1 bg-transparent text-sm outline-none"
                          style={{ color: s.textColor }}
                        />
                      </div>
                      {emailErr && <p className="text-xs text-red-400">{emailErr}</p>}
                    </div>
                  )}

                  <Turnstile onVerify={setTurnstileToken} />

                  <button
                    onClick={handlePlay}
                    disabled={busy || (turnstileConfigured && !turnstileToken)}
                    className="w-full rounded-2xl py-3 font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: s.buttonBg, color: s.buttonText }}
                  >
                    {busy ? "Preparando…" : cfg.buttonText}
                  </button>

                  <p className="text-center text-xs opacity-40 leading-relaxed" style={{ color: s.textColor }}>{cfg.legalText || DEFAULT_LEGAL_TEXT}</p>
                </>
              )}

              {/* ── SCRATCH: canvas de raspado ── */}
              {phase === "playing" && cfg.type === "SCRATCH" && (
                <>
                  <p className="text-center font-black text-xl" style={{ color: s.textColor }}>¡Raspá para ganar!</p>
                  <p className="text-center text-sm opacity-60" style={{ color: s.textColor }}>Usá el dedo o el mouse</p>

                  {/* Prize behind + canvas on top */}
                  <div className="relative w-full" style={{ height: 130 }}>
                    {/* Prize reveal behind canvas */}
                    <div
                      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1"
                      style={{ background: s.couponBg }}
                    >
                      <p className="text-xs opacity-50 uppercase tracking-widest" style={{ color: s.couponText }}>Tu premio</p>
                      <p className="font-black text-xl tracking-widest font-mono" style={{ color: s.couponText }}>
                        {result?.isNoPrize ? "Sin premio" : (result?.couponCode ?? "——")}
                      </p>
                      {!result?.isNoPrize && result?.prizeLabel && (
                        <p className="text-xs opacity-70" style={{ color: s.couponText }}>{result.prizeLabel}</p>
                      )}
                    </div>
                    {/* Gold scratch cover */}
                    <canvas
                      ref={scratchRef}
                      width={340}
                      height={130}
                      className="absolute inset-0 w-full h-full rounded-2xl"
                      style={{ touchAction: "none", cursor: "crosshair" }}
                    />
                  </div>

                  <p className="text-center text-xs opacity-40" style={{ color: s.textColor }}>Raspá más del 50% para revelar</p>

                  <p className="text-center text-xs opacity-40 leading-relaxed" style={{ color: s.textColor }}>{cfg.legalText || DEFAULT_LEGAL_TEXT}</p>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
