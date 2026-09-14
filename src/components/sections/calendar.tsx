"use client";

import { useState, useMemo } from "react";
import moment from "jalali-moment";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num, EmptyState, SectionHeader, StatCard } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalIcon, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, X,
} from "lucide-react";
import type { Trade } from "@/lib/types";

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // Saturday-first for Jalali

interface DayCell {
  date: moment.Moment;
  isCurrentMonth: boolean;
  isToday: boolean;
  trades: Trade[];
  netR: number;
}

export function CalendarSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const calendarMode = useAppStore((s) => s.calendarMode);
  const trades = useTrades(profileId);
  const [cursor, setCursor] = useState(moment());
  const [selectedDay, setSelectedDay] = useState<moment.Moment | null>(null);

  // month unit follows the calendar mode so the grid covers exactly the month shown in the title
  const monthUnit = calendarMode === "jalali" ? "jMonth" : "month";

  const cells = useMemo<DayCell[]>(() => {
    if (!trades) return [];
    const monthStart = cursor.clone().startOf(monthUnit);
    const monthEnd = cursor.clone().endOf(monthUnit);
    // Saturday-first weeks (labels are ش..ج; Persian week starts Saturday).
    // JS day(): Sun=0..Sat=6 → Saturday offset = (day + 1) % 7
    const startOffset = (monthStart.day() + 1) % 7;
    const gridStart = monthStart.clone().subtract(startOffset, "day");
    const endOffset = (6 - ((monthEnd.day() + 1) % 7)) % 7;
    const gridEnd = monthEnd.clone().add(endOffset, "day");
    const today = moment();
    const cells: DayCell[] = [];
    let d = gridStart.clone();
    while (d.isSameOrBefore(gridEnd)) {
      const dayTrades = trades.filter((t) => {
        const tDay = moment(t.openedAt);
        return tDay.isSame(d, "day");
      });
      const netR = dayTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);
      cells.push({
        date: d.clone(),
        isCurrentMonth: d.isSame(cursor, monthUnit),
        isToday: d.isSame(today, "day"),
        trades: dayTrades,
        netR,
      });
      d = d.add(1, "day");
    }
    return cells;
  }, [trades, cursor, monthUnit]);

  const monthStats = useMemo(() => {
    const monthTrades = trades?.filter((t) => moment(t.openedAt).isSame(cursor, monthUnit)) ?? [];
    return computeStats(monthTrades);
  }, [trades, cursor, monthUnit]);

  const monthLabel = useMemo(() => {
    if (calendarMode === "jalali") {
      return cursor.format("jMMMM jYYYY");
    }
    return cursor.format("MMMM YYYY");
  }, [cursor, calendarMode]);

  const prevMonth = () => setCursor((c) => c.clone().subtract(1, monthUnit));
  const nextMonth = () => setCursor((c) => c.clone().add(1, monthUnit));
  const goToday = () => setCursor(moment());

  const maxAbsR = useMemo(() => {
    if (!cells.length) return 1;
    return Math.max(...cells.map((c) => Math.abs(c.netR)), 1);
  }, [cells]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.calendar.title}
        subtitle={T.calendar.subtitle}
        icon={<CalIcon className="h-5 w-5" />}
        action={
          <Button variant="outline" size="sm" onClick={goToday} className="gap-1.5">
            <CalIcon className="h-3.5 w-3.5" />
            {T.calendar.today}
          </Button>
        }
      />

      {/* Month navigation */}
      <Card className="flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9">
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold text-gradient-gold">{monthLabel}</h2>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Card>

      {/* Month summary */}
      {monthStats && monthStats.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={T.calendar.monthlyNet} value={formatR(monthStats.netR)} accent={monthStats.netR >= 0 ? "gain" : "loss"} />
          <StatCard label={T.calendar.monthlyCount} value={`${monthStats.total}`} />
          <StatCard label={T.calendar.monthlyWinRate} value={`${monthStats.winRate}%`} accent={monthStats.winRate >= 50 ? "gain" : "loss"} />
        </div>
      )}

      {/* Calendar grid */}
      <Card className="overflow-hidden p-2">
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 px-1 pb-1">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            const hasTrades = cell.trades.length > 0;
            const intensity = hasTrades ? Math.abs(cell.netR) / maxAbsR : 0;
            const isGreen = cell.netR > 0.01;
            const isRed = cell.netR < -0.01;
            return (
              <button
                key={i}
                onClick={() => hasTrades && setSelectedDay(cell.date)}
                disabled={!hasTrades}
                className={cn(
                  "relative aspect-square rounded-lg border p-1 text-right transition-all sm:aspect-[4/3]",
                  cell.isCurrentMonth ? "border-border/60" : "border-transparent opacity-30",
                  cell.isToday && "ring-2 ring-gold/60",
                  hasTrades && "cursor-pointer hover:scale-[1.03] hover:border-gold/40",
                  !hasTrades && "cursor-default"
                )}
                style={
                  hasTrades
                    ? {
                        background: isGreen
                          ? `color-mix(in oklab, var(--gain) ${Math.min(40, 8 + intensity * 32)}%, transparent)`
                          : isRed
                          ? `color-mix(in oklab, var(--loss) ${Math.min(40, 8 + intensity * 32)}%, transparent)`
                          : "color-mix(in oklab, var(--muted) 30%, transparent)",
                      }
                    : undefined
                }
              >
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  cell.isToday ? "text-gold" : "text-muted-foreground"
                )}>
                  <Num>{calendarMode === "jalali" ? cell.date.format("jD") : cell.date.format("D")}</Num>
                </span>
                {hasTrades && (
                  <div className="absolute inset-x-1 bottom-1">
                    <div className={cn(
                      "text-[10px] font-bold tabular-nums leading-tight",
                      isGreen ? "text-emerald-400" : isRed ? "text-rose-400" : "text-muted-foreground"
                    )}>
                      <Num>{formatR(cell.netR).replace("R", "")}</Num>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      <Num>{cell.trades.length}</Num> ترید
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/30" /> {T.calendar.greenDay}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-500/30" /> {T.calendar.redDay}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-muted" /> {T.calendar.flatDay}
        </span>
      </div>

      {!trades || trades.length === 0 ? (
        <EmptyState
          icon={<CalIcon className="h-7 w-7" />}
          title={T.common.empty}
          hint="ترید ثبت کن تا تقویمت پر بشه"
        />
      ) : null}

      {/* Day detail sheet */}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          trades={trades?.filter((t) => moment(t.openedAt).isSame(selectedDay, "day")) ?? []}
          calendarMode={calendarMode}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

function DayDetail({
  date,
  trades,
  calendarMode,
  onClose,
}: {
  date: moment.Moment;
  trades: Trade[];
  calendarMode: "jalali" | "gregorian";
  onClose: () => void;
}) {
  const dayLabel =
    calendarMode === "jalali"
      ? date.format("jD jMMMM jYYYY")
      : date.format("D MMMM YYYY");
  const netR = trades.reduce((s, t) => s + (t.resultR ?? 0), 0);
  const wins = trades.filter((t) => t.outcome === "win").length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <Card
        className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-t-2xl sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-base font-bold">{dayLabel}</h3>
            <p className="text-xs text-muted-foreground">
              <Num>{trades.length}</Num> ترید · خالص{" "}
              <span className={pnlColor(netR)}><Num>{formatR(netR)}</Num></span>
              {" · "}<Num>{wins}</Num> برد
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto scroll-thin p-3">
          {trades.map((t) => {
            const isLong = t.direction === "long";
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold"><Num>{t.symbol}</Num></span>
                    <Badge variant="outline" className="text-[9px]">{t.setup}</Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {t.thesis || "(بدون تز)"}
                  </p>
                </div>
                <span className={cn("text-sm font-bold tabular-nums", pnlColor(t.resultR))}>
                  <Num>{formatR(t.resultR)}</Num>
                </span>
              </div>
            );
          })}
          {trades.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{T.calendar.noTrades}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
