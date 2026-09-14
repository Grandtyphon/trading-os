"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num, DateText } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Flame, Target, Zap, Activity,
} from "lucide-react";
import type { Trade } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export function WeeklyRecap() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);

  const recap = useMemo(() => {
    if (!trades) return null;
    const now = Date.now();
    const weekAgo = now - 7 * DAY;
    const weekTrades = trades.filter((t) => t.openedAt >= weekAgo);
    const stats = computeStats(weekTrades);

    // yesterday comparison
    const yesterdayStart = now - DAY;
    const yesterdayTrades = trades.filter((t) => t.openedAt >= yesterdayStart && t.openedAt < now);
    const yesterdayR = yesterdayTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);

    // previous week comparison
    const twoWeeksAgo = now - 14 * DAY;
    const prevWeekTrades = trades.filter((t) => t.openedAt >= twoWeeksAgo && t.openedAt < weekAgo);
    const prevWeekR = prevWeekTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);

    const trend = stats.netR > prevWeekR ? "up" : stats.netR < prevWeekR ? "down" : "flat";
    const trendPct = prevWeekR !== 0 ? Math.abs(((stats.netR - prevWeekR) / Math.abs(prevWeekR)) * 100) : 0;

    // best day this week
    const dayMap: Record<string, Trade[]> = {};
    for (const t of weekTrades) {
      const d = new Date(t.openedAt).toISOString().slice(0, 10);
      (dayMap[d] ??= []).push(t);
    }
    const dayEntries = Object.entries(dayMap).map(([d, list]) => ({
      day: d,
      netR: list.reduce((s, t) => s + (t.resultR ?? 0), 0),
      count: list.length,
    }));
    const bestDay = dayEntries.length ? [...dayEntries].sort((a, b) => b.netR - a.netR)[0] : null;
    const worstDay = dayEntries.length ? [...dayEntries].sort((a, b) => a.netR - b.netR)[0] : null;

    return {
      stats,
      trend,
      trendPct,
      yesterdayR,
      prevWeekR,
      bestDay,
      worstDay,
      daysActive: dayEntries.length,
    };
  }, [trades]);

  if (!recap || recap.stats.total === 0) return null;

  const { stats, trend, trendPct, bestDay, worstDay, daysActive } = recap;

  const trendIcon = trend === "up" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : trend === "down" ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden border-gold/20 bg-gradient-to-br from-gold/5 via-transparent to-transparent p-4 noise-bg">
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">خلاصه‌ی هفته</h3>
              <p className="text-[10px] text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", trendColor, trend === "up" ? "border-emerald-500/30 bg-emerald-500/10" : trend === "down" ? "border-rose-500/30 bg-rose-500/10" : "border-border bg-muted")}>
            {trendIcon}
            {trendPct > 0 && <Num>{trendPct.toFixed(0)}%</Num>}
            <span>{trend === "up" ? "بهتر" : trend === "down" ? "ضعیف‌تر" : "ثابت"}</span>
          </div>
        </div>

        {/* Big net R */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">خالص هفته</p>
            <p className={cn("text-3xl font-bold tabular-nums count-up", pnlColor(stats.netR))}>
              <Num>{formatR(stats.netR)}</Num>
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                <Activity className="h-2.5 w-2.5" />
                ترید
              </div>
              <div className="text-lg font-bold"><Num>{stats.total}</Num></div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                <Target className="h-2.5 w-2.5" />
                نرخ برد
              </div>
              <div className={cn("text-lg font-bold", stats.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
                <Num>{stats.winRate}%</Num>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                <Flame className="h-2.5 w-2.5" />
                رشته
              </div>
              <div className={cn("text-lg font-bold", stats.currentStreak > 0 ? "text-emerald-500" : stats.currentStreak < 0 ? "text-rose-500" : "")}>
                <Num>{stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}</Num>
              </div>
            </div>
          </div>
        </div>

        {/* Best/worst day */}
        {(bestDay || worstDay) && bestDay?.day !== worstDay?.day && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {bestDay && bestDay.netR > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                <p className="text-[10px] text-muted-foreground">بهترین روز</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    <DateText ts={new Date(bestDay.day).getTime()} />
                  </span>
                  <span className="text-xs font-bold text-emerald-500"><Num>{formatR(bestDay.netR)}</Num></span>
                </div>
              </div>
            )}
            {worstDay && worstDay.netR < 0 && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
                <p className="text-[10px] text-muted-foreground">ضعیف‌ترین روز</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    <DateText ts={new Date(worstDay.day).getTime()} />
                  </span>
                  <span className="text-xs font-bold text-rose-500"><Num>{formatR(worstDay.netR)}</Num></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>روزهای فعال</span>
            <span><Num>{daysActive}</Num>/۷</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayDate = new Date(Date.now() - (6 - i) * DAY);
              const dayKey = dayDate.toISOString().slice(0, 10);
              const dayTrades = trades?.filter((t) => new Date(t.openedAt).toISOString().slice(0, 10) === dayKey) ?? [];
              const dayR = dayTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);
              const has = dayTrades.length > 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-6 flex-1 rounded-sm transition-colors",
                    !has && "bg-muted/30",
                    has && dayR >= 0 && "bg-emerald-500/60",
                    has && dayR < 0 && "bg-rose-500/60"
                  )}
                  title={has ? `${dayTrades.length} ترید · ${formatR(dayR)}` : "بدون ترید"}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
