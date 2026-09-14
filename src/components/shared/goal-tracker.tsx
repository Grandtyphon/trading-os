"use client";

import { useMemo, useState } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore, type TradingGoal } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { formatR, pnlColor } from "@/lib/format";
import { Num } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Target, Settings2, TrendingUp, AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import moment from "jalali-moment";
import type { Trade } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export function GoalTracker() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const goal = useAppStore((s) => s.goal);
  const setGoal = useAppStore((s) => s.setGoal);
  const trades = useTrades(profileId);
  const [editOpen, setEditOpen] = useState(false);

  const progress = useMemo(() => {
    if (!trades) return null;
    const now = Date.now();
    const monthStart = moment().startOf("month").valueOf();
    const weekStart = now - 7 * DAY;
    const dayStart = moment().startOf("day").valueOf();

    const monthTrades = trades.filter((t) => t.openedAt >= monthStart);
    const monthR = monthTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);
    const monthPct = goal.monthlyTargetR > 0 ? Math.min(100, (monthR / goal.monthlyTargetR) * 100) : 0;

    const weekTrades = trades.filter((t) => t.openedAt >= weekStart);
    const weekCount = weekTrades.length;

    const dayTrades = trades.filter((t) => t.openedAt >= dayStart);
    const dayCount = dayTrades.length;
    const dayOverLimit = goal.dailyMaxTrades > 0 && dayCount > goal.dailyMaxTrades;

    // check for trades exceeding max risk
    const overRiskTrades = monthTrades.filter((t) => t.riskPercent > goal.maxRiskPerTrade);
    const overRiskCount = overRiskTrades.length;

    const monthLabel = moment().format("jMMMM jYYYY");

    return {
      monthR,
      monthPct,
      weekCount,
      weekMinMet: weekCount >= goal.weeklyMinTrades,
      dayCount,
      dayOverLimit,
      overRiskCount,
      monthLabel,
      daysInMonth: moment().daysInMonth(),
      dayOfMonth: moment().date(),
    };
  }, [trades, goal]);

  if (!progress) return null;

  const isOnTrack = progress.monthR >= goal.monthlyTargetR;
  const projectedR = progress.dayOfMonth > 0
    ? (progress.monthR / progress.dayOfMonth) * progress.daysInMonth
    : 0;

  return (
    <>
      <Card className="relative overflow-hidden border-gold/20 bg-gradient-to-br from-gold/5 via-card to-card p-4 noise-bg">
        <div className="relative">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">هدف ماهانه</h3>
                <p className="text-[10px] text-muted-foreground">{progress.monthLabel}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="mb-1 flex items-end justify-between">
              <div>
                <span className={cn("text-2xl font-extrabold tabular-nums", pnlColor(progress.monthR))}>
                  <Num>{formatR(progress.monthR)}</Num>
                </span>
                <span className="mr-1 text-sm text-muted-foreground">/ <Num>{goal.monthlyTargetR}R</Num></span>
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                isOnTrack ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
              )}>
                <Num>{progress.monthPct.toFixed(0)}%</Num>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isOnTrack ? "bg-emerald-500" : progress.monthR >= 0 ? "bg-gold" : "bg-rose-500"
                )}
                style={{ width: `${Math.max(2, progress.monthPct)}%` }}
              />
            </div>
            {projectedR !== 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                پیش‌بینی پایان ماه:{" "}
                <span className={cn("font-bold", pnlColor(projectedR))}>
                  <Num>{formatR(projectedR)}</Num>
                </span>
                {projectedR >= goal.monthlyTargetR && (
                  <span className="mr-1 text-emerald-500"> ✓ در مسیر درست</span>
                )}
              </p>
            )}
          </div>

          {/* Status indicators */}
          <div className="grid grid-cols-3 gap-2">
            {/* Daily trades */}
            <div className={cn(
              "rounded-lg border p-2 text-center",
              progress.dayOverLimit ? "border-rose-500/30 bg-rose-500/5" : "border-border/60 bg-background/40"
            )}>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                {progress.dayOverLimit ? <AlertTriangle className="h-2.5 w-2.5 text-rose-500" /> : <Flame className="h-2.5 w-2.5" />}
                ترید امروز
              </div>
              <div className={cn("mt-0.5 text-base font-bold", progress.dayOverLimit && "text-rose-500")}>
                <Num>{progress.dayCount}</Num>
                {goal.dailyMaxTrades > 0 && (
                  <span className="text-[10px] text-muted-foreground">/<Num>{goal.dailyMaxTrades}</Num></span>
                )}
              </div>
            </div>

            {/* Weekly consistency */}
            <div className={cn(
              "rounded-lg border p-2 text-center",
              progress.weekMinMet ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-background/40"
            )}>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                {progress.weekMinMet ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <TrendingUp className="h-2.5 w-2.5" />}
                ترید هفته
              </div>
              <div className={cn("mt-0.5 text-base font-bold", progress.weekMinMet && "text-emerald-500")}>
                <Num>{progress.weekCount}</Num>
                <span className="text-[10px] text-muted-foreground">/<Num>{goal.weeklyMinTrades}</Num></span>
              </div>
            </div>

            {/* Risk violations */}
            <div className={cn(
              "rounded-lg border p-2 text-center",
              progress.overRiskCount > 0 ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"
            )}>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <AlertTriangle className={cn("h-2.5 w-2.5", progress.overRiskCount > 0 ? "text-rose-500" : "text-emerald-500")} />
                ریسک زیاد
              </div>
              <div className={cn("mt-0.5 text-base font-bold", progress.overRiskCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                <Num>{progress.overRiskCount}</Num>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <GoalEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        goal={goal}
        onSave={setGoal}
      />
    </>
  );
}

function GoalEditDialog({
  open,
  onOpenChange,
  goal,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal: TradingGoal;
  onSave: (g: Partial<TradingGoal>) => void;
}) {
  const [form, setForm] = useState<TradingGoal>(goal);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Target className="h-4 w-4 text-gold" />
            تنظیم اهداف
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">هدف ماهانه (R)</Label>
            <Input
              type="number"
              inputMode="decimal"
              dir="ltr"
              className="text-left"
              value={form.monthlyTargetR}
              onChange={(e) => setForm((f) => ({ ...f, monthlyTargetR: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-[10px] text-muted-foreground">مثلاً ۲۰R در ماه</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">حداکثر ترید روزانه</Label>
              <Input
                type="number"
                inputMode="decimal"
                dir="ltr"
                className="text-left"
                value={form.dailyMaxTrades}
                onChange={(e) => setForm((f) => ({ ...f, dailyMaxTrades: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">۰ = بدون محدودیت</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">حداکثر ریسک هر ترید (٪)</Label>
              <Input
                type="number"
                inputMode="decimal"
                dir="ltr"
                className="text-left"
                value={form.maxRiskPerTrade}
                onChange={(e) => setForm((f) => ({ ...f, maxRiskPerTrade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">حداقل ترید هفته‌ای (برای انسجام)</Label>
            <Input
              type="number"
              inputMode="decimal"
              dir="ltr"
              className="text-left"
              value={form.weeklyMinTrades}
              onChange={(e) => setForm((f) => ({ ...f, weeklyMinTrades: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={handleSave}>ذخیره</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
