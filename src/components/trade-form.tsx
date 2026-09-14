"use client";

import { useEffect, useState } from "react";
import type { Trade, Direction, Outcome, TradingSession } from "@/lib/types";
import { uid } from "@/lib/dexie";
import { saveTrade } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import {
  SETUP_OPTIONS,
  TRADING_SESSIONS,
  TIMEFRAME_OPTIONS,
  HTF_BIAS_OPTIONS,
  LTF_CONFIRMATION_OPTIONS,
  INDUCEMENT_OPTIONS,
  MISTAKE_TAGS,
  COMMON_SYMBOLS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RiskReward } from "@/components/shared/risk-reward";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, ImagePlus, TrendingUp, TrendingDown, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  trade?: Trade | null;
}

function emptyTrade(profileId: string): Trade {
  const now = Date.now();
  return {
    id: uid(),
    profileId,
    openedAt: now,
    closedAt: now,
    symbol: "XAUUSD",
    direction: "long",
    entry: 0,
    stop: 0,
    target: null,
    exit: null,
    resultR: null,
    pnlPercent: null,
    riskPercent: 1,
    outcome: "open",
    thesis: "",
    setup: "liquidity-grab",
    session: "london",
    timeframe: "M15",
    htfBias: "bullish",
    ltfConfirmation: "bos",
    inducement: "small",
    biasConflictConsidered: false,
    postNote: "",
    lessons: "",
    mistakeTags: [],
    tags: [],
    chartImage: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Auto-compute R from entry/stop/exit
function computeR(direction: Direction, entry: number, stop: number, exit: number | null): number | null {
  if (!exit || !entry || !stop) return null;
  const riskDist = direction === "long" ? entry - stop : stop - entry;
  if (riskDist === 0) return null;
  const profitDist = direction === "long" ? exit - entry : entry - exit;
  return Number((profitDist / riskDist).toFixed(2));
}

export function TradeForm({ open, onOpenChange, profileId, trade }: Props) {
  const [form, setForm] = useState<Trade>(trade ?? emptyTrade(profileId));
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(trade ?? emptyTrade(profileId));
  }, [trade, profileId, open]);

  // auto R when relevant fields change
  useEffect(() => {
    if (form.exit && form.entry && form.stop && form.outcome !== "open") {
      const r = computeR(form.direction, form.entry, form.stop, form.exit);
      if (r !== null && r !== form.resultR) {
        setForm((f) => ({ ...f, resultR: r }));
      }
    }
  }, [form.exit, form.entry, form.stop, form.direction, form.outcome, form.resultR]);

  const update = (patch: Partial<Trade>) => setForm((f) => ({ ...f, ...patch, updatedAt: Date.now() }));

  const toggleMistake = (tag: string) => {
    setForm((f) => ({
      ...f,
      mistakeTags: f.mistakeTags.includes(tag)
        ? f.mistakeTags.filter((t) => t !== tag)
        : [...f.mistakeTags, tag],
    }));
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !form.tags.includes(v)) {
      setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    }
    setTagInput("");
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_500_000) {
      toast.error("تصویر خیلی بزرگه (بیشتر از ۲.۵MB). یه تصویر کوچیک‌تر انتخاب کن.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // compress via canvas to keep storage small
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 1280;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL("image/jpeg", 0.78);
          update({ chartImage: data });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.symbol) {
      toast.error("نماد رو وارد کن");
      return;
    }
    setSaving(true);
    try {
      await saveTrade(form);
      toast.success(trade ? "ترید به‌روز شد" : "ترید ثبت شد");
      onOpenChange(false);
    } catch (e) {
      toast.error("خطا در ذخیره‌سازی");
    } finally {
      setSaving(false);
    }
  };

  const thesisMissing = !form.thesis || form.thesis.trim().length < 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-right">
            {trade ? T.journal.editTrade : T.journal.newTrade}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] scroll-thin">
          <div className="space-y-5 px-5 py-5">
            {/* Direction + symbol + outcome */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update({ direction: "long" })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors",
                    form.direction === "long"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  {T.journal.long}
                </button>
                <button
                  type="button"
                  onClick={() => update({ direction: "short" })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors",
                    form.direction === "short"
                      ? "border-rose-500 bg-rose-500/10 text-rose-500"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <TrendingDown className="h-4 w-4" />
                  {T.journal.short}
                </button>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>{T.journal.symbol}</Label>
                <Select value={form.symbol} onValueChange={(v) => update({ symbol: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SYMBOLS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    {!COMMON_SYMBOLS.includes(form.symbol as any) && (
                      <SelectItem value={form.symbol}>{form.symbol}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Entry / Stop / Target / Exit */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={T.journal.entry}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.entry || ""}
                  onChange={(e) => update({ entry: parseFloat(e.target.value) || 0 })}
                />
              </Field>
              <Field label={T.journal.stop}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.stop || ""}
                  onChange={(e) => update({ stop: parseFloat(e.target.value) || 0 })}
                />
              </Field>
              <Field label={T.journal.target}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.target ?? ""}
                  onChange={(e) => update({ target: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </Field>
              <Field label={T.journal.exit}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.exit ?? ""}
                  onChange={(e) => update({ exit: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </Field>
              <Field label={T.journal.riskPercent}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.riskPercent}
                  onChange={(e) => update({ riskPercent: parseFloat(e.target.value) || 0 })}
                />
              </Field>
              <Field label={T.journal.resultR}>
                <Input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-left"
                  value={form.resultR ?? ""}
                  onChange={(e) => update({ resultR: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="خودکار"
                />
              </Field>
            </div>

            {/* Risk/Reward visualization */}
            {form.entry > 0 && form.stop > 0 && form.target !== null && (
              <RiskReward
                entry={form.entry}
                stop={form.stop}
                target={form.target}
                direction={form.direction}
              />
            )}

            {/* Outcome */}
            <Field label={T.journal.outcome}>
              <div className="grid grid-cols-4 gap-2">
                {(["open", "win", "loss", "breakeven"] as Outcome[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => update({ outcome: o })}
                    className={cn(
                      "rounded-lg border py-2 text-xs font-medium transition-colors",
                      form.outcome === o
                        ? o === "win"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : o === "loss"
                          ? "border-rose-500 bg-rose-500/10 text-rose-500"
                          : o === "breakeven"
                          ? "border-muted-foreground bg-muted text-foreground"
                          : "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {o === "open" ? T.journal.open : o === "win" ? T.journal.win : o === "loss" ? T.journal.loss : T.journal.breakeven}
                  </button>
                ))}
              </div>
            </Field>

            {/* LIT methodology */}
            <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
              <p className="mb-3 text-xs font-semibold text-gold">چک‌لیست LIT</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={T.journal.setup}>
                  <Select value={form.setup} onValueChange={(v) => update({ setup: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SETUP_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={T.journal.timeframe}>
                  <Select value={form.timeframe} onValueChange={(v) => update({ timeframe: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEFRAME_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={T.journal.htfBias}>
                  <Select value={form.htfBias} onValueChange={(v) => update({ htfBias: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HTF_BIAS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={T.journal.ltfConfirmation}>
                  <Select value={form.ltfConfirmation} onValueChange={(v) => update({ ltfConfirmation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LTF_CONFIRMATION_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={T.journal.inducement}>
                  <Select value={form.inducement} onValueChange={(v) => update({ inducement: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDUCEMENT_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={T.journal.session}>
                  <Select value={form.session} onValueChange={(v) => update({ session: v as TradingSession })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRADING_SESSIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-background/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">{T.journal.biasConflictConsidered}</span>
                <Switch checked={form.biasConflictConsidered} onCheckedChange={(c) => update({ biasConflictConsidered: c })} />
              </label>
            </div>

            {/* Thesis — prominent */}
            <Field label={T.journal.thesis} hint={`${T.journal.thesisHint} — از Markdown پشتیبانی می‌شه (مثلاً **متن بولد** یا لیست)`} required>
              <Textarea
                dir="rtl"
                rows={4}
                value={form.thesis}
                onChange={(e) => update({ thesis: e.target.value })}
                placeholder="بایاس چیه؟ کجا لیکوییدیتی هست؟ چه القایی انتظار داری؟ تایید ورودت چیه؟ دیدگاه مخالف چیه؟"
                className="resize-none"
              />
              {thesisMissing && form.outcome !== "open" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {T.journal.noThesisWarn}
                </p>
              )}
            </Field>

            {/* Post note + lessons */}
            <Field label={T.journal.postNote}>
              <Textarea
                dir="rtl"
                rows={3}
                value={form.postNote}
                onChange={(e) => update({ postNote: e.target.value })}
                placeholder="چی شد؟ طبق پلن بود؟ چه درسی گرفتی؟"
                className="resize-none"
              />
            </Field>
            <Field label={T.journal.lessons}>
              <Textarea
                dir="rtl"
                rows={2}
                value={form.lessons}
                onChange={(e) => update({ lessons: e.target.value })}
                className="resize-none"
              />
            </Field>

            {/* Mistake tags */}
            <Field label={T.journal.mistakeTags}>
              <div className="flex flex-wrap gap-1.5">
                {MISTAKE_TAGS.map((m) => {
                  const active = form.mistakeTags.includes(m.value);
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => toggleMistake(m.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-500"
                          : "border-border text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Custom tags */}
            <Field label={T.journal.tags}>
              <div className="flex gap-2">
                <Input
                  dir="rtl"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="برچسب + اینتر"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addTag}>+</Button>
              </div>
              {form.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => update({ tags: form.tags.filter((x) => x !== t) })}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Field>

            {/* Chart image */}
            <Field label={T.journal.chartImage}>
              {form.chartImage ? (
                <div className="relative overflow-hidden rounded-xl border">
                  <img src={form.chartImage} alt="chart" className="max-h-64 w-full object-contain bg-black/30" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute left-2 top-2"
                    onClick={() => update({ chartImage: null })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-muted-foreground transition-colors hover:bg-muted/40">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">{T.journal.uploadChart}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImage(e.target.files?.[0])}
                  />
                </label>
              )}
            </Field>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {T.common.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? T.common.loading : T.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
