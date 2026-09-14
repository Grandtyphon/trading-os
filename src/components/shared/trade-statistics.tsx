"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Gauge } from "lucide-react";

// Trade Statistics — avg win/loss, largest win/loss, R distribution breakdown
export function TradeStatistics() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);

  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);

  // R distribution buckets
  const distribution = useMemo(() => {
    if (!trades) return [];
    const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
    const buckets = [
      { label: "≤ -2R", range: [-Infinity, -2], count: 0, color: "bg-rose-500" },
      { label: "-2 to -1R", range: [-2, -1], count: 0, color: "bg-rose-400" },
      { label: "-1 to 0R", range: [-1, 0], count: 0, color: "bg-rose-300" },
      { label: "0 to 1R", range: [0, 1], count: 0, color: "bg-emerald-300" },
      { label: "1 to 2R", range: [1, 2], count: 0, color: "bg-emerald-400" },
      { label: "2 to 3R", range: [2, 3], count: 0, color: "bg-emerald-500" },
      { label: "> 3R", range: [3, Infinity], count: 0, color: "bg-emerald-600" },
    ];
    for (const t of closed) {
      const r = t.resultR ?? 0;
      for (const b of buckets) {
        if (r > b.range[0] && r <= b.range[1]) {
          b.count++;
          break;
        }
      }
    }
    const max = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({ ...b, pct: (b.count / max) * 100 }));
  }, [trades]);

  if (!stats || stats.total === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">آمار معاملات</h3>
          <p className="text-[10px] text-muted-foreground">میانگین و توزیع R</p>
        </div>
      </div>

      {/* Avg win / avg loss */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            میانگین سود
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-500">
            <Num>{formatR(stats.avgWinR)}</Num>
          </p>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingDown className="h-3 w-3 text-rose-500" />
            میانگین ضرر
          </div>
          <p className="mt-1 text-xl font-bold text-rose-500">
            <Num>{formatR(stats.avgLossR)}</Num>
          </p>
        </div>
      </div>

      {/* Largest win / largest loss */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <ArrowUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">بزرگ‌ترین برد</p>
            <p className="text-sm font-bold text-emerald-500">
              <Num>{formatR(stats.largestWinR)}</Num>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">بزرگ‌ترین باخت</p>
            <p className="text-sm font-bold text-rose-500">
              <Num>{formatR(stats.largestLossR)}</Num>
            </p>
          </div>
        </div>
      </div>

      {/* R distribution */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Gauge className="h-3 w-3" />
          توزیع R
        </div>
        <div className="space-y-1.5">
          {distribution.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[10px] text-muted-foreground" dir="ltr">
                <Num>{b.label}</Num>
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
                <div
                  className={cn("h-full rounded transition-all", b.color)}
                  style={{ width: `${Math.max(2, b.pct)}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-[10px] font-bold tabular-nums">
                <Num>{b.count}</Num>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
