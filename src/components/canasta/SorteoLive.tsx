"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartHandshake, Clock, Users, Radio, Trophy, Gift, PhoneCall, ArrowRightCircle, ArrowLeft } from "lucide-react";
import RouletteWheel from "./RouletteWheel";
import Confetti from "./Confetti";

const PASOS_SORTEO = [
  { icon: Users, title: "1. Participan todos", text: "Cada persona que donó entra al sorteo con la misma chance, sin importar el monto." },
  { icon: Gift, title: "2. Se eligen 3 puestos", text: "Al azar: 1°, 2° y 3°. El resultado se calcula en el servidor, nunca antes de tiempo." },
  { icon: PhoneCall, title: "3. Contactamos al 1°", text: "Tiene 48hs para responder y coordinar la entrega." },
  { icon: ArrowRightCircle, title: "4. Si no responde, pasa al siguiente", text: "Del 1° al 2°, y si tampoco responde, al 3°. Así nadie se queda sin oportunidad." },
];

type DrawStatusResponse = {
  campaign: {
    id: string;
    name: string;
    drawStatus: "SCHEDULED" | "LIVE" | "FINISHED";
    scheduledDrawAt: string | null;
    drawStartedAt: string | null;
  } | null;
  draw: {
    attemptNumber: number;
    revealAt: string | null;
    winnerStatus: string;
    winners: { first: string | null; second: string | null; third: string | null } | null;
  } | null;
  serverNow: string;
};

const ANIMATION_DURATION_MS = 10_000; // debe coincidir con el del backend (drawStartedAt → revealAt)
const SPIN_MS = 6000; // duración de cada uno de los 3 giros que caen en un nombre real
const PAUSE_MS = 2000; // pausa mostrando al ganador de ese puesto antes del siguiente giro
const STAGE_MS = SPIN_MS + PAUSE_MS;
const REVEAL_SEQUENCE_MS = STAGE_MS * 3; // tiempo total de los 3 giros (1°, 2°, 3°)
const STAGE_LABELS = ["1er", "2do", "3er"] as const;
const POLL_MS = 2000;
const POLL_FAST_MS = 800;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Countdown({ targetMs, nowMs }: { targetMs: number; nowMs: number }) {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {[
        [days, "días"],
        [hours, "hs"],
        [minutes, "min"],
        [seconds, "seg"],
      ].map(([value, label]) => (
        <div key={label as string} className="text-center">
          <div className="text-3xl sm:text-5xl font-bold text-amber-700 tabular-nums">{pad(value as number)}</div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function SorteoLive() {
  const [data, setData] = useState<DrawStatusResponse | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const fastPolling = useRef(false);

  useEffect(() => {
    fetch("/api/canasta/participants", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setParticipants(d.participants ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/canasta/draw-status", { cache: "no-store" });
        const json: DrawStatusResponse = await res.json();
        if (cancelled) return;
        setData(json);
        setServerOffset(new Date(json.serverNow).getTime() - Date.now());

        const scheduled = json.campaign?.scheduledDrawAt ? new Date(json.campaign.scheduledDrawAt).getTime() : null;
        const drawStarted = json.campaign?.drawStartedAt ? new Date(json.campaign.drawStartedAt).getTime() : null;
        const drawStatus = json.campaign?.drawStatus;
        const msToScheduled = scheduled ? scheduled - Date.now() : Infinity;
        const msToStart = drawStarted ? drawStarted - Date.now() : Infinity;
        fastPolling.current =
          drawStatus === "LIVE" ||
          (msToScheduled < 60_000 && msToScheduled > -ANIMATION_DURATION_MS) ||
          (msToStart < 60_000 && msToStart > -ANIMATION_DURATION_MS);
      } catch {
        // silencioso: el próximo poll reintenta solo
      }
      if (!cancelled) {
        // setTimeout (no setInterval) para poder ajustar la velocidad del
        // polling en cada vuelta según el estado actual, no solo al montar.
        timeoutId = setTimeout(poll, fastPolling.current ? POLL_FAST_MS : POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando sorteo...</div>
      </div>
    );
  }

  const effectiveNow = nowMs + serverOffset;
  const { campaign, draw } = data;

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center text-center px-6">
        <HeartHandshake className="h-14 w-14 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No hay un sorteo programado</h1>
        <Link href="/canasta" className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Volver a la canasta
        </Link>
      </div>
    );
  }

  const scheduledMs = campaign.scheduledDrawAt ? new Date(campaign.scheduledDrawAt).getTime() : null;
  const drawStartedMs = campaign.drawStartedAt ? new Date(campaign.drawStartedAt).getTime() : null;
  const revealAtMs = draw?.revealAt ? new Date(draw.revealAt).getTime() : null;
  const winners = draw?.winners ?? null;

  let phase: "upcoming" | "starting" | "live" | "revealing" | "revealed" | "none" = "none";
  if (campaign.drawStatus === "SCHEDULED" && scheduledMs) phase = "upcoming";
  else if (campaign.drawStatus === "LIVE" && drawStartedMs && effectiveNow < drawStartedMs) phase = "starting";
  else if (campaign.drawStatus === "LIVE" && revealAtMs && effectiveNow < revealAtMs) phase = "live";
  else if (winners && revealAtMs && effectiveNow < revealAtMs + REVEAL_SEQUENCE_MS) phase = "revealing";
  else if (winners) phase = "revealed";
  else if (campaign.drawStatus === "LIVE") phase = "live";

  // Solo tiene sentido durante "revealing": en qué de los 3 giros estamos
  // (0=1°, 1=2°, 2=3°) y si ese giro todavía está girando o ya está en pausa
  // mostrando al ganador de ese puesto.
  let stageIndex = 0;
  let stageSpinning = true;
  let stageElapsedMs = 0;
  if (phase === "revealing" && revealAtMs) {
    const sinceReveal = effectiveNow - revealAtMs;
    stageIndex = Math.min(2, Math.floor(sinceReveal / STAGE_MS));
    const withinStage = sinceReveal - stageIndex * STAGE_MS;
    stageSpinning = withinStage < SPIN_MS;
    stageElapsedMs = Math.min(withinStage, SPIN_MS);
  }
  const stageWinnerName = winners ? [winners.first, winners.second, winners.third][stageIndex] : null;

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900">
      <div className="border-b border-amber-900/10 px-6 py-5 grid grid-cols-3 items-center sticky top-0 bg-[#FFFBF5]/90 backdrop-blur-xl z-10">
        <Link
          href="/canasta"
          aria-label="Volver a la canasta"
          className="w-9 h-9 rounded-full border border-amber-900/10 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-amber-50 transition-colors justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/" className="text-sm font-bold text-gray-900 justify-self-center hover:text-amber-700 transition-colors">TiendaApps</Link>
        <div className="flex items-center gap-2 text-amber-700 justify-self-end">
          <HeartHandshake className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">{campaign.name} — Sorteo</span>
        </div>
      </div>

      {/* Cómo funciona el sorteo */}
      <div className="max-w-3xl mx-auto px-6 pt-10 grid sm:grid-cols-2 gap-3">
        {PASOS_SORTEO.map((p) => (
          <div key={p.title} className="rounded-xl border border-amber-900/10 bg-white p-4 shadow-sm flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <p.icon className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {phase === "none" && (
          <div className="text-center">
            <HeartHandshake className="h-10 w-10 text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold mb-2">El sorteo todavía no fue programado</h1>
            <p className="text-sm text-gray-500 mb-8">Cuando se complete la canasta, vamos a anunciar el día y la hora acá mismo.</p>
            <RouletteWheel names={[]} elapsedMs={0} durationMs={ANIMATION_DURATION_MS} preview />
          </div>
        )}

        {(phase === "live" || phase === "revealing") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 mx-auto block w-fit"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" /> EN VIVO
          </motion.div>
        )}

        {phase === "upcoming" && scheduledMs && (
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">El sorteo empieza en...</h1>
            <Countdown targetMs={scheduledMs} nowMs={effectiveNow} />
            <p className="text-sm text-gray-500 mt-8">
              {new Date(scheduledMs).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        )}

        {phase === "starting" && drawStartedMs && (
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" /> El admin ya activó el sorteo
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">La ruleta arranca en...</h1>
            <Countdown targetMs={drawStartedMs} nowMs={effectiveNow} />
          </div>
        )}

        {phase === "live" && drawStartedMs && (
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-6">Eligiendo a los ganadores...</h1>
            <RouletteWheel
              names={participants}
              elapsedMs={effectiveNow - drawStartedMs}
              durationMs={ANIMATION_DURATION_MS}
            />
          </div>
        )}

        {phase === "revealing" && (
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              {stageSpinning ? `Girando para el puesto ${STAGE_LABELS[stageIndex]}...` : `¡Tenemos al ganador del puesto ${STAGE_LABELS[stageIndex]}!`}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {stageSpinning ? "La ruleta ya sabe el resultado, mirá dónde cae." : "Preparando el siguiente giro..."}
            </p>
            {!stageSpinning && stageWinnerName && (
              <div className="relative inline-block mb-6">
                <Confetti trigger={`stage-${stageIndex}`} />
                <motion.div
                  key={`stage-card-${stageIndex}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="relative inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-6 py-4 shadow-md"
                >
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <div className="text-left">
                    <p className="text-xs text-amber-600 font-semibold">{STAGE_LABELS[stageIndex]} puesto</p>
                    <p className="text-base font-bold text-gray-900">{stageWinnerName}</p>
                  </div>
                </motion.div>
              </div>
            )}
            <RouletteWheel
              key={`stage-${stageIndex}`}
              names={participants}
              elapsedMs={stageElapsedMs}
              durationMs={SPIN_MS}
              landOnName={stageWinnerName ?? undefined}
            />
          </div>
        )}

        {phase === "revealed" && winners && (
          <div className="text-center">
            <div className="relative inline-block">
              <Confetti trigger="final" />
              <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">¡Felicitaciones a los ganadores! 🎉</h1>
            <p className="text-sm text-gray-500 mb-8">Nos vamos a contactar por teléfono con el 1er puesto para coordinar la entrega.</p>
            <div className="space-y-3 max-w-sm mx-auto">
              {[
                ["1°", winners.first],
                ["2°", winners.second],
                ["3°", winners.third],
              ].map(([place, name]) => (
                name && (
                  <motion.div
                    key={place}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-amber-200 bg-white p-4 flex items-center justify-between shadow-sm"
                  >
                    <span className="text-amber-600 font-bold">{place}</span>
                    <span className="font-semibold text-gray-900">{name}</span>
                  </motion.div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Contexto siempre visible */}
        <div className="grid grid-cols-2 gap-4 mt-12">
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-lg font-semibold">{participants.length}</p>
              <p className="text-xs text-gray-400">Participantes</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-lg font-semibold">{campaign.name}</p>
              <p className="text-xs text-gray-400">Campaña</p>
            </div>
          </div>
        </div>

        {/* Lista de participantes */}
        {participants.length > 0 && phase !== "revealed" && phase !== "revealing" && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">Participantes</h2>
            <div className="rounded-2xl border border-amber-900/10 bg-white p-4 max-h-64 overflow-y-auto shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {participants.map((name, i) => (
                  <span key={i} className="text-sm text-gray-700 truncate">{name}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
