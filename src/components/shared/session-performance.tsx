"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Clock, Award, AlertTriangle } from "lucide-react";
import { TRADING_SESSIONS } from "@/lib/constants";

const SESSION_TIME_MAP: Record<string, string> = {
  asia: "۰۰–۰۹ UTC",
  london: "۰۷–۱۶ UTC",
  newyork: "۱۲–۲۱ UTC",
  "london-nyc": "۱۲–۱۶ UTC",
  "off-session": "—",
};

// Session Performance comparison — shows all sessions ranked by net R
export function SessionPerformance() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);

  const sessions = useMemo(() => {
    if (!trades) return [];
    const stats = computeStats(trades);
    return TRADING_SESSIONS.map((s) => {
      const v = stats.bySession[s.value] ?? { count: 0, netR: 0, winRate: 0 };
      return {
        ...s,
        ...v,
        time: SESSION_TIME_MAP[s.value] ?? "—",
      };
    }).filter((s) => s.count > 0)
      .sort((a, b) => b.netR - a.netR);
  }, [trades]);

  if (!trades || sessions.length === 0) return null;

  const maxAbsR = Math.max(...sessions.map((s) => Math.abs(s.netR)), 1);
  const bestSession = sessions[0];
  const worstSession = sessions[sessions.length - 1];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">مقایسه‌ی عملکرد سشن‌ها</h3>
          <p className="text-[10px] text-muted-foreground">رتبه‌بندی بر اساس خالص R</p>
        </div>
      </div>

      {/* Best/Worst highlights */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Award className="h-3 w-3 text-emerald-500" />
            بهترین سشن
          </div>
          <p className="mt-0.5 text-sm font-bold text-emerald-500">{bestSession.label}</p>
          <p className="text-[10px] text-muted-foreground">
            <Num>{formatR(bestSession.netR)}</Num> · <Num>{bestSession.winRate}%</Num> · <Num>{bestSession.count}</Num> ترید
          </p>
        </div>
        {worstSession && worstSession.netR < 0 && worstSession.value !== bestSession.value && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              ضعیف‌ترین سشن
            </div>
            <p className="mt-0.5 text-sm font-bold text-rose-500">{worstSession.label}</p>
            <p className="text-[10px] text-muted-foreground">
              <Num>{formatR(worstSession.netR)}</Num> · <Num>{worstSession.winRate}%</Num> · <Num>{worstSession.count}</Num> ترید
            </p>
          </div>
        )}
      </div>

      {/* Ranked bars */}
      <div className="space-y-2">
        {sessions.map((s, i) => {
          const isPositive = s.netR >= 0;
          const widthPct = (Math.abs(s.netR) / maxAbsR) * 100;
          const isBest = i === 0;
          const isWorst = i === sessions.length - 1 && s.netR < 0;
          return (
            <div key={s.value} className="flex items-center gap-2">
              {/* Rank */}
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                isBest ? "bg-emerald-500/15 text-emerald-500" : isWorst ? "bg-rose-500/15 text-rose-500" : "bg-muted text-muted-foreground"
              )}>
                <Num>{i + 1}</Num>
              </span>
              {/* Label + time */}
              <div className="w-24 shrink-0">
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-[9px] text-muted-foreground" dir="ltr"><Num>{s.time}</Num></p>
              </div>
              {/* Bar */}
              <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted/30">
                <div
                  className={cn(
                    "absolute inset-y-0 flex items-center justify-end rounded-lg px-2 transition-all",
                    isPositive ? "left-0 bg-emerald-500/40" : "right-0 bg-rose-500/40"
                  )}
                  style={{ width: `${Math.max(8, widthPct)}%` }}
                >
                  <span className={cn("text-[10px] font-bold tabular-nums", isPositive ? "text-emerald-500" : "text-rose-500")}>
                    <Num>{formatR(s.netR)}</Num>
                  </span>
                </div>
              </div>
              {/* Win rate */}
              <div className="w-12 shrink-0 text-center">
                <p className={cn("text-xs font-bold", s.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
                  <Num>{s.winRate}%</Num>
                </p>
                <p className="text-[9px] text-muted-foreground"><Num>{s.count}</Num></p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
