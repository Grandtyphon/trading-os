"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import {
  computeDowHeatmap,
  computeHourHeatmap,
  computeDowHourMatrix,
  computeSymbolStats,
  type HeatCell,
} from "@/lib/stats";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, useDateRangeWindow, filterByDateRange } from "@/components/shared/date-range-filter";
import { Clock, CalendarDays, Grid3x3, Coins, TrendingUp } from "lucide-react";

const HOUR_LABELS_FULL = [
  "۰۰–۰۶ (آسیا)",
  "۰۶–۰۹ (پیش‌لندن)",
  "۰۹–۱۲ (لندن)",
  "۱۲–۱۵ (هم‌پوشانی)",
  "۱۵–۱۸ (نیویورک)",
  "۱۸–۲۱ (پس‌نیویورک)",
  "۲۱–۲۴ (آسیا)",
];

export function AnalyticsSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const trades = useTrades(profileId);
  const { start, end } = useDateRangeWindow();

  const filteredTrades = useMemo(
    () => (trades ? filterByDateRange(trades, start, end) : trades),
    [trades, start, end]
  );

  const dow = useMemo(() => (filteredTrades ? computeDowHeatmap(filteredTrades) : []), [filteredTrades]);
  const hour = useMemo(() => (filteredTrades ? computeHourHeatmap(filteredTrades) : []), [filteredTrades]);
  const matrix = useMemo(() => (filteredTrades ? computeDowHourMatrix(filteredTrades) : []), [filteredTrades]);
  const symbols = useMemo(() => (filteredTrades ? computeSymbolStats(filteredTrades) : []), [filteredTrades]);

  if (!trades) {
    return (
      <div className="space-y-5">
        <SectionHeader title="آنالیز پیشرفته" icon={<Grid3x3 className="h-5 w-5" />} />
        <EmptyState icon={<Grid3x3 className="h-7 w-7" />} title={T.common.loading} />
      </div>
    );
  }

  if (trades.filter((t) => t.outcome !== "open").length === 0) {
    return (
      <div className="space-y-5">
        <SectionHeader title="آنالیز پیشرفته" icon={<Grid3x3 className="h-5 w-5" />} />
        <EmptyState
          icon={<Grid3x3 className="h-7 w-7" />}
          title={T.common.empty}
          hint="ترید ثبت کن تا آنالیز زمان‌محور نشون داده بشه"
        />
      </div>
    );
  }

  const maxAbsDow = Math.max(...dow.map((d) => Math.abs(d.netR)), 1);
  const maxAbsHour = Math.max(...hour.map((d) => Math.abs(d.netR)), 1);
  const maxAbsMatrix = Math.max(...matrix.flat().map((c) => Math.abs(c.netR)), 1);

  // find best/worst day and hour
  const bestDay = [...dow].sort((a, b) => b.netR - a.netR)[0];
  const worstDay = [...dow].sort((a, b) => a.netR - b.netR)[0];
  const bestHour = [...hour].sort((a, b) => b.netR - a.netR)[0];
  const worstHour = [...hour].sort((a, b) => a.netR - b.netR)[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="آنالیز پیشرفته"
        subtitle="الگوهای زمانی و نمادمحور — کِی و کجا بهترین عملکردو داری؟"
        icon={<Grid3x3 className="h-5 w-5" />}
        action={<DateRangeFilter />}
      />

      {/* Insight highlights */}
      <div className="grid grid-cols-2 gap-3">
        {bestDay && bestDay.count > 0 && (
          <Card className="border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
              بهترین روز
            </div>
            <p className="mt-1 text-sm font-bold">{bestDay.label}</p>
            <p className="text-xs text-emerald-500">
              <Num>{formatR(bestDay.netR)}</Num> · <Num>{bestDay.winRate}%</Num>
            </p>
          </Card>
        )}
        {worstDay && worstDay.count > 0 && worstDay.netR < 0 && (
          <Card className="border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-rose-500" />
              ضعیف‌ترین روز
            </div>
            <p className="mt-1 text-sm font-bold">{worstDay.label}</p>
            <p className="text-xs text-rose-500">
              <Num>{formatR(worstDay.netR)}</Num> · <Num>{worstDay.winRate}%</Num>
            </p>
          </Card>
        )}
        {bestHour && bestHour.count > 0 && (
          <Card className="border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              بهترین بازه
            </div>
            <p className="mt-1 text-sm font-bold">{HOUR_LABELS_FULL[parseInt(bestHour.key.split("-")[0]) / 3 | 0] ?? bestHour.label}</p>
            <p className="text-xs text-emerald-500">
              <Num>{formatR(bestHour.netR)}</Num> · <Num>{bestHour.winRate}%</Num>
            </p>
          </Card>
        )}
        {worstHour && worstHour.count > 0 && worstHour.netR < 0 && (
          <Card className="border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-rose-500" />
              ضعیف‌ترین بازه
            </div>
            <p className="mt-1 text-sm font-bold">{HOUR_LABELS_FULL[parseInt(worstHour.key.split("-")[0]) / 3 | 0] ?? worstHour.label}</p>
            <p className="text-xs text-rose-500">
              <Num>{formatR(worstHour.netR)}</Num> · <Num>{worstHour.winRate}%</Num>
            </p>
          </Card>
        )}
      </div>

      {/* Day-of-week heatmap */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-gold" />
          عملکرد بر اساس روز هفته
        </h3>
        <div className="space-y-1.5">
          {dow.map((cell) => (
            <HeatRow key={cell.key} cell={cell} maxAbs={maxAbsDow} />
          ))}
        </div>
      </Card>

      {/* Hour-of-day heatmap */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-gold" />
          عملکرد بر اساس بازه ساعتی (UTC)
        </h3>
        <div className="space-y-1.5">
          {hour.map((cell, i) => (
            <HeatRow key={cell.key} cell={cell} maxAbs={maxAbsHour} label={HOUR_LABELS_FULL[i] ?? cell.label} />
          ))}
        </div>
      </Card>

      {/* 2D Matrix heatmap */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Grid3x3 className="h-4 w-4 text-gold" />
          ماتریس روز × ساعت
        </h3>
        <p className="mb-3 text-[11px] text-muted-foreground">
          هر خانه خالص R اون روز و بازه ساعتیه. سبز=سود، قرمز=ضرر، شدت رنگ = شدت عملکرد
        </p>
        <div className="overflow-x-auto scroll-thin">
          <div className="min-w-[420px]">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div></div>
              {HOUR_LABELS_FULL.map((h) => (
                <div key={h} className="text-center text-[9px] text-muted-foreground leading-tight" dir="ltr">
                  {h.split(" ")[0]}
                </div>
              ))}
            </div>
            {/* Matrix rows */}
            {matrix.map((row, ri) => (
              <div key={ri} className="grid grid-cols-8 gap-1 mb-1">
                <div className="flex items-center justify-center rounded bg-muted/40 text-xs font-bold">
                  {row[0]?.dow}
                </div>
                {row.map((cell, ci) => (
                  <MatrixCell key={ci} cell={cell} maxAbs={maxAbsMatrix} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Symbol breakdown */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Coins className="h-4 w-4 text-gold" />
          عملکرد بر اساس نماد
        </h3>
        {symbols.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{T.common.empty}</p>
        ) : (
          <div className="space-y-2">
            {symbols.map((s) => (
              <div key={s.symbol} className="flex items-center gap-3">
                <div className="flex h-9 w-16 items-center justify-center rounded-lg bg-muted/40 font-mono text-xs font-bold">
                  <Num>{s.symbol}</Num>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <Num>{s.count}</Num> ترید · نرخ برد <Num>{s.winRate}%</Num>
                    </span>
                    <span className={cn("font-bold tabular-nums", pnlColor(s.netR))}>
                      <Num>{formatR(s.netR)}</Num>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", s.netR >= 0 ? "bg-emerald-500" : "bg-rose-500")}
                      style={{ width: `${Math.min(100, (Math.abs(s.netR) / Math.max(...symbols.map((x) => Math.abs(x.netR)), 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HeatRow({ cell, maxAbs, label }: { cell: HeatCell; maxAbs: number; label?: string }) {
  const intensity = cell.count > 0 ? Math.abs(cell.netR) / maxAbs : 0;
  const isGreen = cell.netR > 0.01;
  const isRed = cell.netR < -0.01;
  const bg = cell.count === 0
    ? "bg-muted/20"
    : isGreen
    ? `color-mix(in oklab, var(--gain) ${8 + intensity * 35}%, transparent)`
    : isRed
    ? `color-mix(in oklab, var(--loss) ${8 + intensity * 35}%, transparent)`
    : "bg-muted/30";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 shrink-0 text-xs text-muted-foreground">{label ?? cell.label}</div>
      <div
        className={cn("relative flex h-9 flex-1 items-center justify-between overflow-hidden rounded-lg border border-border/40 px-2", bg)}
      >
        <span className="text-xs font-medium">
          <Num>{cell.count}</Num> ترید
          {cell.count > 0 && (
            <span className="mr-2 text-muted-foreground">· <Num>{cell.winRate}%</Num></span>
          )}
        </span>
        {cell.count > 0 && (
          <span className={cn("text-xs font-bold tabular-nums", pnlColor(cell.netR))}>
            <Num>{formatR(cell.netR)}</Num>
          </span>
        )}
      </div>
    </div>
  );
}

function MatrixCell({ cell, maxAbs }: { cell: { dow: string; hour: string; count: number; netR: number }; maxAbs: number }) {
  const intensity = cell.count > 0 ? Math.abs(cell.netR) / maxAbs : 0;
  const isGreen = cell.netR > 0.01;
  const isRed = cell.netR < -0.01;
  const bg = cell.count === 0
    ? "bg-muted/15"
    : isGreen
    ? `color-mix(in oklab, var(--gain) ${12 + intensity * 40}%, transparent)`
    : isRed
    ? `color-mix(in oklab, var(--loss) ${12 + intensity * 40}%, transparent)`
    : "bg-muted/30";

  return (
    <div
      className={cn("flex h-9 items-center justify-center rounded text-[10px] font-bold tabular-nums", bg, cell.count > 0 && "cursor-help")}
      title={cell.count > 0 ? `${cell.count} ترید · ${formatR(cell.netR)}` : "بدون ترید"}
      dir="ltr"
    >
      {cell.count > 0 ? (
        <Num>{formatR(cell.netR).replace("R", "")}</Num>
      ) : (
        <span className="text-muted-foreground/30">—</span>
      )}
    </div>
  );
}
