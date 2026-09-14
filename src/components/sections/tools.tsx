"use client";

import { PositionCalculator } from "@/components/shared/position-calculator";
import { RiskReward } from "@/components/shared/risk-reward";
import { Num, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Wrench, Calculator, Scale, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="ابزارها"
        subtitle="ابزارهای کاربردی معامله‌گری"
        icon={<Wrench className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PositionCalculator />
        <RiskPercentTable />
      </div>

      <RRCalculator />
    </div>
  );
}

// Risk percent table — shows $ risk for different account sizes and risk %
function RiskPercentTable() {
  const [account, setAccount] = useState(10000);

  const rows = useMemo(() => {
    const pcts = [0.5, 1, 1.5, 2, 3, 5];
    return pcts.map((p) => ({
      pct: p,
      amount: account * (p / 100),
    }));
  }, [account]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Percent className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">جدول ریسک</h3>
          <p className="text-[10px] text-muted-foreground">مبلغ ریسک برای درصدهای مختلف</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">حساب ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            dir="ltr"
            className="text-left"
            value={account}
            onChange={(e) => setAccount(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {rows.map((r) => (
            <div
              key={r.pct}
              className={cn(
                "rounded-lg border p-2 text-center",
                r.pct <= 1 ? "border-emerald-500/20 bg-emerald-500/5" :
                r.pct <= 2 ? "border-amber-500/20 bg-amber-500/5" :
                "border-rose-500/20 bg-rose-500/5"
              )}
            >
              <p className="text-[10px] text-muted-foreground"><Num>{r.pct}%</Num></p>
              <p className={cn(
                "text-sm font-bold",
                r.pct <= 1 ? "text-emerald-500" :
                r.pct <= 2 ? "text-amber-500" :
                "text-rose-500"
              )}>
                $<Num>{r.amount.toFixed(0)}</Num>
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// R:R Calculator — standalone R:R with target calculation
function RRCalculator() {
  const [entry, setEntry] = useState(0);
  const [stop, setStop] = useState(0);
  const [target, setTarget] = useState(0);
  const [direction, setDirection] = useState<"long" | "short">("long");

  const rr = useMemo(() => {
    if (!entry || !stop || !target) return null;
    const risk = direction === "long" ? entry - stop : stop - entry;
    const reward = direction === "long" ? target - entry : entry - target;
    if (risk <= 0 || reward <= 0) return null;
    return reward / risk;
  }, [entry, stop, target, direction]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Scale className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">محاسبه‌گر R:R</h3>
          <p className="text-[10px] text-muted-foreground">نسبت ریسک به سود</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">جهت</Label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setDirection("long")}
              className={cn("rounded border py-1.5 text-xs", direction === "long" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border")}
            >خرید</button>
            <button
              onClick={() => setDirection("short")}
              className={cn("rounded border py-1.5 text-xs", direction === "short" ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-border")}
            >فروش</button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ورود</Label>
          <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={entry || ""} onChange={(e) => setEntry(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">استاپ</Label>
          <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={stop || ""} onChange={(e) => setStop(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">هدف</Label>
          <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={target || ""} onChange={(e) => setTarget(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      {rr !== null && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
          <span className="text-sm text-muted-foreground">نسبت R:R</span>
          <span className={cn(
            "text-2xl font-extrabold neon-text",
            rr >= 3 ? "text-emerald-500" : rr >= 2 ? "text-emerald-400" : rr >= 1 ? "text-amber-500" : "text-rose-500"
          )}>
            <Num>{rr.toFixed(2)}</Num>:1
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            rr >= 3 ? "bg-emerald-500/15 text-emerald-500" :
            rr >= 2 ? "bg-emerald-400/15 text-emerald-400" :
            rr >= 1 ? "bg-amber-500/15 text-amber-500" :
            "bg-rose-500/15 text-rose-500"
          )}>
            {rr >= 3 ? "عالی" : rr >= 2 ? "خوب" : rr >= 1 ? "قابل‌قبول" : "ضعیف"}
          </span>
        </div>
      )}
    </Card>
  );
}
