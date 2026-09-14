"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Flame, TrendingUp, TrendingDown, Zap, Award, Activity } from "lucide-react";
import type { Trade } from "@/lib/types";

// Streak Tracker — shows current, best win, and worst loss streaks with visual flair.
export function StreakTracker() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);

  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);

  // build streak history (last 15 trades) for the visual dots
  const streakDots = useMemo(() => {
    if (!trades) return [];
    const closed = trades
      .filter((t) => t.outcome !== "open")
      .sort((a, b) => (a.openedAt ?? 0) - (b.openedAt ?? 0));
    return closed.slice(-15).map((t) => t.outcome as "win" | "loss" | "breakeven");
  }, [trades]);

  if (!stats || stats.total === 0) return null;

  const isWinStreak = stats.currentStreak > 0;
  const isLossStreak = stats.currentStreak < 0;
  const currentAbs = Math.abs(stats.currentStreak);

  return (
    <Card className="relative overflow-hidden border-border/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">رشته‌های برد و باخت</h3>
          <p className="text-[10px] text-muted-foreground">۱۵ ترید اخیر</p>
        </div>
      </div>

      {/* Current streak — big highlight */}
      <div className={cn(
        "mb-3 flex items-center justify-between rounded-lg border p-3",
        isWinStreak
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isLossStreak
          ? "border-rose-500/30 bg-rose-500/5"
          : "border-border/60 bg-muted/20"
      )}>
        <div className="flex items-center gap-2">
          {isWinStreak ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : isLossStreak ? (
            <TrendingDown className="h-5 w-5 text-rose-500" />
          ) : (
            <Activity className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-[10px] text-muted-foreground">رشته فعلی</p>
            <p className={cn(
              "text-lg font-bold",
              isWinStreak ? "text-emerald-500" : isLossStreak ? "text-rose-500" : "text-muted-foreground"
            )}>
              {isWinStreak ? `${currentAbs} برد` : isLossStreak ? `${currentAbs} باخت` : "—"}
            </p>
          </div>
        </div>
        {/* Streak dots */}
        {streakDots.length > 0 && (
          <div className="flex gap-1">
            {streakDots.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  d === "win" ? "bg-emerald-500" : d === "loss" ? "bg-rose-500" : "bg-muted-foreground/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Best & worst streaks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Award className="h-3 w-3 text-emerald-500" />
            بهترین رشته برد
          </div>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500 count-up">
            <Num>{stats.bestStreak}</Num>
          </p>
          <p className="text-[10px] text-muted-foreground">برد متوالی</p>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Zap className="h-3 w-3 text-rose-500" />
            بدترین رشته باخت
          </div>
          <p className="mt-1 text-2xl font-extrabold text-rose-500 count-up">
            <Num>{stats.worstStreak}</Num>
          </p>
          <p className="text-[10px] text-muted-foreground">باخت متوالی</p>
        </div>
      </div>
    </Card>
  );
}
