"use client";

import { useState, useMemo } from "react";
import { useProfiles, saveProfile, deleteProfile, useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatMoney, formatR, pnlColor } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import { Num, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Trash2, Target, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Profile, PropRules } from "@/lib/types";
import { uid } from "@/lib/dexie";

const PHASE_LABEL = { phase1: T.prop.phase1, phase2: T.prop.phase2, funded: T.prop.funded, evaluation: T.prop.evaluation };
const STATUS_LABEL = { active: T.prop.active, passed: T.prop.passed, failed: T.prop.failed };
const STATUS_STYLE = {
  active: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  passed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

function emptyProp(name: string): Profile {
  const rules: PropRules = {
    dailyLossLimitPct: 5,
    maxOverallLossPct: 10,
    profitTargetPct: 8,
    maxDailyTrades: 0,
    newsTradingAllowed: false,
    weekendHoldingAllowed: false,
    startingBalance: 100000,
    currentBalance: 100000,
    phase: "phase1",
    status: "active",
  };
  return { id: uid(), name, type: "prop", createdAt: Date.now(), propRules: rules };
}

export function PropTrackerSection() {
  const profiles = useProfiles();
  const propProfiles = useMemo(() => profiles?.filter((p) => p.type === "prop") ?? [], [profiles]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Profile>(emptyProp("چالش جدید"));

  const openAdd = () => {
    setForm(emptyProp("چالش جدید"));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("نام چالش رو وارد کن");
      return;
    }
    await saveProfile(form);
    toast.success("چالش ثبت شد");
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteProfile(id);
    toast.success("چالش حذف شد");
  };

  const updateBalance = async (p: Profile, delta: number) => {
    const newBal = (p.propRules?.currentBalance ?? 0) + delta;
    await saveProfile({ ...p, propRules: { ...(p.propRules as PropRules), currentBalance: newBal } });
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.prop.title}
        subtitle={T.prop.subtitle}
        icon={<Building2 className="h-5 w-5" />}
        action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">{T.prop.addChallenge}</span></Button>}
      />

      {!propProfiles || propProfiles.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title={T.common.empty}
          hint="چالش پراپ فرمت رو تعریف کن تا قوانینش رو پیگیری کنی"
          action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{T.prop.addChallenge}</Button>}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {propProfiles.map((p) => (
            <PropCard key={p.id} profile={p} onDelete={() => handleDelete(p.id)} onUpdateBalance={updateBalance} onEdit={() => { setForm(p); setOpen(true); }} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-right">{form.createdAt === Date.now() ? T.prop.addChallenge : T.common.edit}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[68vh] scroll-thin">
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <Label>{T.common.profile}</Label>
                <Input dir="rtl" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label={T.prop.startingBalance}>
                  <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.propRules?.startingBalance ?? 0} onChange={(e) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), startingBalance: parseFloat(e.target.value) || 0 } }))} />
                </Labeled>
                <Labeled label={T.prop.currentBalance}>
                  <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.propRules?.currentBalance ?? 0} onChange={(e) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), currentBalance: parseFloat(e.target.value) || 0 } }))} />
                </Labeled>
                <Labeled label={T.prop.dailyLossLimit + " (٪)"}>
                  <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.propRules?.dailyLossLimitPct ?? 0} onChange={(e) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), dailyLossLimitPct: parseFloat(e.target.value) || 0 } }))} />
                </Labeled>
                <Labeled label={T.prop.maxOverallLoss + " (٪)"}>
                  <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.propRules?.maxOverallLossPct ?? 0} onChange={(e) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), maxOverallLossPct: parseFloat(e.target.value) || 0 } }))} />
                </Labeled>
                <Labeled label={T.prop.profitTarget + " (٪)"}>
                  <Input type="number" inputMode="decimal" dir="ltr" className="text-left" value={form.propRules?.profitTargetPct ?? 0} onChange={(e) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), profitTargetPct: parseFloat(e.target.value) || 0 } }))} />
                </Labeled>
                <Labeled label={T.prop.phase}>
                  <Select value={form.propRules?.phase ?? "phase1"} onValueChange={(v) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), phase: v as any } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PHASE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{T.prop.newsTrading}</span>
                <Switch checked={form.propRules?.newsTradingAllowed ?? false} onCheckedChange={(c) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), newsTradingAllowed: c } }))} />
              </label>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{T.prop.weekendHolding}</span>
                <Switch checked={form.propRules?.weekendHoldingAllowed ?? false} onCheckedChange={(c) => setForm((f) => ({ ...f, propRules: { ...(f.propRules as PropRules), weekendHoldingAllowed: c } }))} />
              </label>
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

function PropCard({ profile: p, onDelete, onUpdateBalance, onEdit }: { profile: Profile; onDelete: () => void; onUpdateBalance: (p: Profile, d: number) => void; onEdit: () => void }) {
  const trades = useTrades(p.id);
  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);
  const rules = p.propRules!;
  const start = rules.startingBalance;
  const current = rules.currentBalance;
  const pnl = current - start;
  const pnlPct = start ? (pnl / start) * 100 : 0;
  const targetAmt = start * (rules.profitTargetPct / 100);
  const maxLossAmt = start * (rules.maxOverallLossPct / 100);
  const dailyLossAmt = start * (rules.dailyLossLimitPct / 100);
  const progress = targetAmt ? Math.max(0, Math.min(100, (pnl / targetAmt) * 100)) : 0;
  const breachRisk = pnl < 0 && Math.abs(pnl) > maxLossAmt * 0.8;

  return (
    <Card className={cn("p-4", breachRisk && "border-rose-500/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{p.name}</h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{PHASE_LABEL[rules.phase]}</Badge>
              <Badge className={cn("text-[10px]", STATUS_STYLE[rules.status])}>{STATUS_LABEL[rules.status]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Wallet className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Balance + P&L */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">{T.prop.startingBalance}</div>
          <div className="mt-0.5 text-sm font-bold"><Num>{formatMoney(start, 0)}</Num></div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">{T.prop.currentBalance}</div>
          <div className="mt-0.5 text-sm font-bold"><Num>{formatMoney(current, 0)}</Num></div>
        </div>
        <div className={cn("rounded-lg p-2", pnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <div className="text-[10px] text-muted-foreground">سود/ضرر</div>
          <div className={cn("mt-0.5 text-sm font-bold", pnlColor(pnl))}>
            <Num>{pnl >= 0 ? "+" : ""}{formatMoney(pnl, 0)}</Num>
          </div>
        </div>
      </div>

      {/* Progress to target */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">پیشرفت تا هدف (<Num>{rules.profitTargetPct}%</Num>)</span>
          <span className={cn("font-medium", pnlColor(pnlPct))}><Num>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</Num></span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          {/* max loss marker */}
          <div className="absolute inset-y-0 right-0 w-px bg-rose-500/50" style={{ right: `${100 - (maxLossAmt / (targetAmt + maxLossAmt)) * 100}%` }} />
          <div className={cn("h-full rounded-full", pnl >= 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${Math.max(2, progress)}%` }} />
        </div>
      </div>

      {/* Rules */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          حد افت روزانه: <Num>${formatMoney(dailyLossAmt, 0)}</Num>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          حداکثر افت: <Num>${formatMoney(maxLossAmt, 0)}</Num>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-emerald-500" />
          هدف: <Num>${formatMoney(targetAmt, 0)}</Num>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          اخبار: {rules.newsTradingAllowed ? T.prop.allowed : T.prop.notAllowed}
        </div>
      </div>

      {/* Stats from trades */}
      {stats && stats.total > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/20 p-2 text-xs">
          <span className="text-muted-foreground"><Num>{stats.total}</Num> ترید ثبت‌شده</span>
          <span className={cn("font-bold", pnlColor(stats.netR))}><Num>{formatR(stats.netR)}</Num></span>
        </div>
      )}
    </Card>
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
