"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num } from "@/components/shared/ui-bits";

// Compact at-a-glance metrics strip — shows net R, win rate, count
export function QuickStats() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);

  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);

  if (!stats || stats.total === 0) return null;

  return (
    <div className="flex items-center gap-3 overflow-x-auto scroll-thin rounded-xl border border-border/40 bg-card/50 px-3 py-2 text-xs backdrop-blur-sm">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-muted-foreground">خالص</span>
        <span className={cn("font-bold tabular-nums", pnlColor(stats.netR))}>
          <Num>{formatR(stats.netR)}</Num>
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-muted-foreground">برد</span>
        <span className={cn("font-bold tabular-nums", stats.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
          <Num>{stats.winRate}%</Num>
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-muted-foreground">ترید</span>
        <span className="font-bold tabular-nums"><Num>{stats.total}</Num></span>
      </div>
      {stats.currentStreak !== 0 && (
        <>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">رشته</span>
            <span className={cn("font-bold tabular-nums", stats.currentStreak > 0 ? "text-emerald-500" : "text-rose-500")}>
              <Num>{stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}</Num>
            </span>
          </div>
        </>
      )}
      {stats.expectancy !== 0 && (
        <>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">امید</span>
            <span className={cn("font-bold tabular-nums", pnlColor(stats.expectancy))}>
              <Num>{formatR(stats.expectancy)}</Num>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
