"use client";

import { cn } from "@/lib/utils";
import { Num } from "@/components/shared/ui-bits";

// Risk/Reward visualization — shows the ratio of potential reward to risk
// based on entry, stop, and target prices.
export function RiskReward({
  entry,
  stop,
  target,
  direction,
  className,
  compact,
}: {
  entry: number;
  stop: number;
  target: number | null;
  direction: "long" | "short";
  className?: string;
  compact?: boolean;
}) {
  // Calculate risk distance (entry to stop)
  const riskDist = direction === "long" ? entry - stop : stop - entry;
  // Calculate reward distance (entry to target)
  const rewardDist = target !== null
    ? direction === "long"
      ? target - entry
      : entry - target
    : 0;

  const rr = riskDist > 0 && rewardDist > 0 ? rewardDist / riskDist : null;
  const rrColor = rr === null
    ? "text-muted-foreground"
    : rr >= 3 ? "text-emerald-500"
    : rr >= 2 ? "text-emerald-400"
    : rr >= 1 ? "text-amber-500"
    : "text-rose-500";

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-bold", rrColor, className)}>
        <Num>{rr !== null ? `${rr.toFixed(2)}:1` : "—"}</Num>
      </span>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border/60 bg-background/40 p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">نسبت ریسک به سود</span>
        <span className={cn("text-lg font-extrabold tabular-nums", rrColor)}>
          <Num>{rr !== null ? `${rr.toFixed(2)}:1` : "—"}</Num>
        </span>
      </div>

      {/* Visual bar */}
      {rr !== null && (
        <div className="relative h-6 overflow-hidden rounded-lg">
          {/* Risk portion (left) */}
          <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500/30 text-[10px] font-bold text-rose-500"
            style={{ width: `${(riskDist / (riskDist + rewardDist)) * 100}%` }}>
            ریسک <Num className="mr-1">{riskDist.toFixed(2)}</Num>
          </div>
          {/* Reward portion (right) */}
          <div className="absolute inset-y-0 left-0 flex items-center justify-center bg-emerald-500/30 text-[10px] font-bold text-emerald-500"
            style={{ width: `${(rewardDist / (riskDist + rewardDist)) * 100}%` }}>
            سود <Num className="mr-1">{rewardDist.toFixed(2)}</Num>
          </div>
          {/* Entry marker */}
          <div className="absolute inset-y-0 right-0 w-px bg-gold" style={{ right: `${(riskDist / (riskDist + rewardDist)) * 100}%` }} />
        </div>
      )}

      {/* Level labels */}
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>استاپ: <Num className="font-mono">{stop.toFixed(2)}</Num></span>
        <span>ورود: <Num className="font-mono text-gold">{entry.toFixed(2)}</Num></span>
        {target !== null && (
          <span>هدف: <Num className="font-mono">{target.toFixed(2)}</Num></span>
        )}
      </div>

      {/* Quality badge */}
      {rr !== null && (
        <div className="mt-2 flex justify-center">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            rr >= 3 ? "bg-emerald-500/15 text-emerald-500"
            : rr >= 2 ? "bg-emerald-400/15 text-emerald-400"
            : rr >= 1 ? "bg-amber-500/15 text-amber-500"
            : "bg-rose-500/15 text-rose-500"
          )}>
            {rr >= 3 ? "عالی" : rr >= 2 ? "خوب" : rr >= 1 ? "قابل‌قبول" : "ضعیف"}
          </span>
        </div>
      )}
    </div>
  );
}
