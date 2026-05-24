"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Trophy, Medal, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

interface RankEntry {
  affiliateId: string;
  isMe: boolean;
  name: string;
  image: string | null;
  monthlyEarned: number | null;
  totalOrders: number | null;
  relativeScore: number;
  rank: number;
}

interface AffStore {
  id: string;
  storeId: string;
  store: { name: string; slug: string };
}

function monthLabel(m: string) {
  const [year, month] = m.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-gray-400 w-5 text-center">#{rank}</span>;
}

export default function RankingPage() {
  const { status: sessionStatus } = useAuth();
  const [affiliates, setAffiliates] = useState<AffStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [myRank, setMyRank] = useState<RankEntry | null>(null);
  const [month, setMonth] = useState("");
  const [loadingAff, setLoadingAff] = useState(true);
  const [loadingRank, setLoadingRank] = useState(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        const active: AffStore[] = (d.affiliates ?? [])
          .filter((a: any) => a.isActive && a.status === "APPROVED")
          .map((a: any) => ({ id: a.id, storeId: a.store?.id ?? "", store: a.store }));
        setAffiliates(active);
        if (active[0]) setSelectedStoreId(active[0].storeId);
        setLoadingAff(false);
      });
  }, [sessionStatus]);

  const loadRanking = useCallback((storeId: string) => {
    if (!storeId) return;
    setLoadingRank(true);
    fetch(`/api/vendedoras/ranking?storeId=${storeId}`)
      .then((r) => r.json())
      .then((d) => {
        setRanking(d.ranking ?? []);
        setMyRank(d.myRank ?? null);
        setMonth(d.month ?? "");
        setLoadingRank(false);
      });
  }, []);

  useEffect(() => {
    if (selectedStoreId) loadRanking(selectedStoreId);
  }, [selectedStoreId, loadRanking]);

  if (loadingAff) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const selectedStore = affiliates.find((a) => a.storeId === selectedStoreId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/vendedoras" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ranking del mes</h1>
            {month && <p className="text-sm text-gray-500">{monthLabel(month)} — {selectedStore?.store.name}</p>}
          </div>
          <Star className="h-5 w-5 text-amber-400" />
        </div>

        {affiliates.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <Trophy className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenés afiliaciones activas</p>
          </div>
        ) : (
          <>
            {/* Selector de tienda */}
            {affiliates.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-5">
                {affiliates.map((a) => (
                  <button key={a.storeId} onClick={() => setSelectedStoreId(a.storeId)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedStoreId === a.storeId ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"}`}>
                    {a.store.name}
                  </button>
                ))}
              </div>
            )}

            {/* Mi posición */}
            {myRank && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 mb-5">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Tu posición este mes</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      <RankBadge rank={myRank.rank} />
                    </div>
                    <div>
                      <p className="font-bold text-indigo-900 dark:text-indigo-100">Posición #{myRank.rank}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">{ranking.length} afiliadas activas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-900 dark:text-indigo-100">${(myRank.monthlyEarned ?? 0).toLocaleString("es-AR")}</p>
                    <p className="text-xs text-indigo-500">en comisiones</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de ranking */}
            {loadingRank ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
            ) : ranking.length <= 1 ? (
              <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-10 text-center">
                <TrendingUp className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">Sola en el equipo</p>
                <p className="text-gray-400 text-sm mt-1">No hay suficientes afiliadas para mostrar un ranking.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top vendedoras</p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {ranking.map((entry, i) => {
                    const barWidth = entry.relativeScore;
                    return (
                      <motion.div
                        key={entry.affiliateId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-4 px-5 py-4 ${entry.isMe ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                      >
                        {/* Rank */}
                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                          <RankBadge rank={entry.rank} />
                        </div>

                        {/* Avatar */}
                        <div className="shrink-0">
                          {entry.isMe && entry.image ? (
                            <div className="relative h-9 w-9 rounded-full overflow-hidden">
                              <Image src={entry.image} alt={entry.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${entry.isMe ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                              {entry.name[0].toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info + barra */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-semibold ${entry.isMe ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>
                              {entry.name}{entry.isMe && " (vos)"}
                            </p>
                            <p className={`text-sm font-bold ml-3 shrink-0 ${entry.rank === 1 ? "text-amber-500" : entry.isMe ? "text-indigo-600" : "text-gray-400"}`}>
                              {entry.isMe && entry.monthlyEarned !== null
                                ? `$${entry.monthlyEarned.toLocaleString("es-AR")}`
                                : "···"}
                            </p>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: entry.rank === 1 ? "#f59e0b" : entry.isMe ? "#6366f1" : "#d1d5db" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              El ranking muestra comisiones acreditadas en el mes actual. Se actualiza en tiempo real.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
