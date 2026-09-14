"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Num } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingUp, TrendingDown, Copy } from "lucide-react";
import { toast } from "sonner";

// Common instrument contract sizes
const INSTRUMENTS: Record<string, {
  label: string;
  pipSize: number;      // size of 1 pip in price terms
  pipValuePerLot: number; // USD value of 1 pip per 1 standard lot
  contractSize: number; // units per 1 lot
}> = {
  XAUUSD: { label: "طلا (XAUUSD)", pipSize: 0.1, pipValuePerLot: 1, contractSize: 100 },
  EURUSD: { label: "یورو/دلار", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  GBPUSD: { label: "پوند/دلار", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  USDJPY: { label: "دلار/ین", pipSize: 0.01, pipValuePerLot: 9.13, contractSize: 100000 },
  AUDUSD: { label: "دلار استرالیا", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  USDCAD: { label: "دلار کانادا", pipSize: 0.0001, pipValuePerLot: 7.5, contractSize: 100000 },
  BTCUSD: { label: "بیت‌کوین", pipSize: 1, pipValuePerLot: 1, contractSize: 1 },
  ETHUSD: { label: "اتریوم", pipSize: 0.01, pipValuePerLot: 1, contractSize: 1 },
  NAS100: { label: "نزدک", pipSize: 1, pipValuePerLot: 1, contractSize: 1 },
  US30: { label: "داو جونز", pipSize: 1, pipValuePerLot: 1, contractSize: 1 },
  custom: { label: "سفارشی", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
};

export function PositionCalculator() {
  const [instrument, setInstrument] = useState("XAUUSD");
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entry, setEntry] = useState(2350);
  const [stop, setStop] = useState(2345);
  const [direction, setDirection] = useState<"long" | "short">("long");

  const result = useMemo(() => {
    const inst = INSTRUMENTS[instrument] ?? INSTRUMENTS.custom;
    const riskAmount = accountSize * (riskPercent / 100);

    // distance between entry and stop in price
    const stopDistance = Math.abs(entry - stop);
    // convert to pips
    const stopPips = stopDistance / inst.pipSize;
    // value of 1 pip per lot
    const pipValuePerLot = inst.pipValuePerLot;
    // lot size = riskAmount / (stopPips * pipValuePerLot)
    const lotSize = stopPips > 0 && pipValuePerLot > 0
      ? riskAmount / (stopPips * pipValuePerLot)
      : 0;

    // units
    const units = lotSize * inst.contractSize;

    // potential profit at 1:2 and 1:3 R:R
    const profit2R = riskAmount * 2;
    const profit3R = riskAmount * 3;

    return {
      riskAmount,
      stopDistance,
      stopPips,
      lotSize,
      units,
      profit2R,
      profit3R,
      pipValuePerLot,
      rr: stopDistance > 0 ? "calculated" : null,
    };
  }, [instrument, accountSize, riskPercent, entry, stop]);

  const handleCopy = () => {
    const text = `LOT: ${result.lotSize.toFixed(2)} | RISK: $${result.riskAmount.toFixed(2)} | STOP: ${result.stopPips.toFixed(1)} pips`;
    navigator.clipboard.writeText(text);
    toast.success("کپی شد");
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary neon-glow">
          <Calculator className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">ماشین‌حساب حجم</h3>
          <p className="text-[10px] text-muted-foreground">محاسبه‌ی دقیق حجم بر اساس ریسک</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Instrument + Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">نماد</Label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INSTRUMENTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">جهت</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection("long")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-xs font-semibold transition-colors",
                  direction === "long" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border text-muted-foreground"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                خرید
              </button>
              <button
                onClick={() => setDirection("short")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-xs font-semibold transition-colors",
                  direction === "short" ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-border text-muted-foreground"
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                فروش
              </button>
            </div>
          </div>
        </div>

        {/* Account + Risk */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">حساب ($)</Label>
            <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={accountSize} onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ریسک (٪)</Label>
            <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={riskPercent} onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {/* Entry + Stop */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">ورود</Label>
            <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={entry} onChange={(e) => setEntry(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">حد ضرر</Label>
            <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={stop} onChange={(e) => setStop(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">حجم پیشنهادی (Lot)</span>
            <span className="text-2xl font-extrabold text-primary neon-text">
              <Num>{result.lotSize.toFixed(2)}</Num>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-background/40 p-2">
              <span className="text-muted-foreground">مبلغ ریسک</span>
              <p className="font-bold text-rose-500">$<Num>{result.riskAmount.toFixed(2)}</Num></p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <span className="text-muted-foreground">فاصله‌ی استاپ</span>
              <p className="font-bold"><Num>{result.stopPips.toFixed(1)}</Num> پیپ</p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <span className="text-muted-foreground">سود در 2R</span>
              <p className="font-bold text-emerald-500">$<Num>{result.profit2R.toFixed(2)}</Num></p>
            </div>
            <div className="rounded-lg bg-background/40 p-2">
              <span className="text-muted-foreground">سود در 3R</span>
              <p className="font-bold text-emerald-500">$<Num>{result.profit3R.toFixed(2)}</Num></p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleCopy} className="w-full gap-2">
          <Copy className="h-3.5 w-3.5" />
          کپی نتیجه
        </Button>
      </div>
    </Card>
  );
}
