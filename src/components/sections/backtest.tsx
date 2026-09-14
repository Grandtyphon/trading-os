"use client";

import { useState, useMemo } from "react";
import { useBacktests, saveBacktest, deleteBacktest } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatR, pnlColor, formatPrice } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import { SETUP_OPTIONS, TRADING_SESSIONS, TIMEFRAME_OPTIONS, HTF_BIAS_OPTIONS, COMMON_SYMBOLS } from "@/lib/constants";
import { Num, DateText, EmptyState, SectionHeader, StatCard } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FlaskConical, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import type { BacktestTrade, Direction, Outcome } from "@/lib/types";
import { uid } from "@/lib/dexie";

const SETUP_LABEL: Record<string, string> = Object.fromEntries(SETUP_OPTIONS.map((s) => [s.value, s.label]));

function emptyBT(profileId: string): BacktestTrade {
  const now = Date.now();
  return {
    id: uid(),
    profileId,
    date: now,
    symbol: "XAUUSD",
    direction: "long",
    entry: 0, stop: 0, target: null, exit: null,
    resultR: null, pnlPercent: null, outcome: "win",
    thesis: "", setup: "liquidity-grab", session: "london",
    timeframe: "M15", htfBias: "bullish",
    postNote: "", lessons: "", tags: [], mistakeTags: [],
    chartImage: null, createdAt: now,
  };
}

export function BacktestSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const list = useBacktests(profileId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BacktestTrade | null>(null);
  const [form, setForm] = useState<BacktestTrade>(emptyBT(""));

  // Treat all backtest-type profiles. If active profile isn't a backtest profile,
  // we still allow logging against it but recommend switching.
  const stats = useMemo(() => (list ? computeStats(list as any) : null), [list]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyBT(profileId === "all" ? "" : profileId));
    setOpen(true);
  };
  const openEdit = (b: BacktestTrade) => {
    setEditing(b);
    setForm(b);
    setOpen(true);
  };
  const handleSave = async () => {
    if (!form.profileId) {
      toast.error("اول یه پروفایل بک‌تست انتخاب کن");
      return;
    }
    await saveBacktest(form);
    toast.success(editing ? "به‌روز شد" : "بک‌تست ثبت شد");
    setOpen(false);
  };
  const handleDelete = async (id: string) => {
    await deleteBacktest(id);
    toast.success("حذف شد");
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.backtest.title}
        subtitle={T.backtest.subtitle}
        icon={<FlaskConical className="h-5 w-5" />}
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{T.backtest.add}</span>
          </Button>
        }
      />

      {stats && list && list.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={T.dashboard.winRate} value={`${stats.winRate}%`} accent={stats.winRate >= 50 ? "gain" : "loss"} />
          <StatCard label={T.dashboard.netR} value={formatR(stats.netR)} accent={stats.netR >= 0 ? "gain" : "loss"} />
          <StatCard label={T.dashboard.totalTrades} value={`${stats.total}`} />
          <StatCard label={T.dashboard.expectancy} value={formatR(stats.expectancy)} accent={stats.expectancy >= 0 ? "gain" : "loss"} />
        </div>
      )}

      {!list || list.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-7 w-7" />}
          title={T.common.empty}
          hint={T.backtest.subtitle}
          action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{T.backtest.add}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {list.map((b) => {
            const isLong = b.direction === "long";
            return (
              <Card key={b.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                    {isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm"><Num>{b.symbol}</Num></span>
                      <Badge variant="outline" className="text-[10px]">{SETUP_LABEL[b.setup] ?? b.setup}</Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      <DateText ts={b.date} />
                    </div>
                  </div>
                  <span className={cn("text-base font-bold tabular-nums", pnlColor(b.resultR))}>
                    <Num>{formatR(b.resultR)}</Num>
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {b.thesis && <p className="mt-2 line-clamp-2 rounded bg-muted/40 p-2 text-xs text-muted-foreground">{b.thesis}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-right">{editing ? T.common.edit : T.backtest.add}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[68vh] scroll-thin">
            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  {(["long", "short"] as Direction[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm((f) => ({ ...f, direction: d }))}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold",
                        form.direction === d
                          ? d === "long" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-rose-500 bg-rose-500/10 text-rose-500"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {d === "long" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {d === "long" ? T.journal.long : T.journal.short}
                    </button>
                  ))}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>{T.journal.symbol}</Label>
                  <Select value={form.symbol} onValueChange={(v) => setForm((f) => ({ ...f, symbol: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMON_SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      <SelectItem value={form.symbol}>{form.symbol}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Labeled label={T.journal.entry}><Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.entry || ""} onChange={(e) => setForm((f) => ({ ...f, entry: parseFloat(e.target.value) || 0 }))} /></Labeled>
                <Labeled label={T.journal.stop}><Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.stop || ""} onChange={(e) => setForm((f) => ({ ...f, stop: parseFloat(e.target.value) || 0 }))} /></Labeled>
                <Labeled label={T.journal.exit}><Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.exit ?? ""} onChange={(e) => setForm((f) => ({ ...f, exit: e.target.value ? parseFloat(e.target.value) : null }))} /></Labeled>
                <Labeled label={T.journal.resultR}><Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.resultR ?? ""} onChange={(e) => setForm((f) => ({ ...f, resultR: e.target.value ? parseFloat(e.target.value) : null }))} /></Labeled>
                <Labeled label={T.journal.setup}>
                  <Select value={form.setup} onValueChange={(v) => setForm((f) => ({ ...f, setup: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SETUP_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Labeled>
                <Labeled label={T.journal.session}>
                  <Select value={form.session} onValueChange={(v) => setForm((f) => ({ ...f, session: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRADING_SESSIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Labeled>
                <Labeled label={T.journal.timeframe}>
                  <Select value={form.timeframe} onValueChange={(v) => setForm((f) => ({ ...f, timeframe: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEFRAME_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Labeled>
                <Labeled label={T.journal.htfBias}>
                  <Select value={form.htfBias} onValueChange={(v) => setForm((f) => ({ ...f, htfBias: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HTF_BIAS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Labeled>
                <Labeled label={T.journal.outcome}>
                  <Select value={form.outcome} onValueChange={(v) => setForm((f) => ({ ...f, outcome: v as Outcome }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="win">{T.journal.win}</SelectItem>
                      <SelectItem value="loss">{T.journal.loss}</SelectItem>
                      <SelectItem value="breakeven">{T.journal.breakeven}</SelectItem>
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>
              <Labeled label={T.journal.thesis}>
                <Textarea dir="rtl" rows={3} value={form.thesis} onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))} className="resize-none" />
              </Labeled>
              <Labeled label={T.journal.postNote}>
                <Textarea dir="rtl" rows={2} value={form.postNote} onChange={(e) => setForm((f) => ({ ...f, postNote: e.target.value }))} className="resize-none" />
              </Labeled>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t px-5 py-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>{T.common.cancel}</Button>
            <Button onClick={handleSave}>{T.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
