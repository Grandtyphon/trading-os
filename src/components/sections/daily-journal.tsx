"use client";

import { useState, useEffect } from "react";
import { useDailyJournals, saveDailyJournal, deleteDailyJournal } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/dexie";
import { Num, DateText, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
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
  BookHeart, Plus, Pencil, Trash2, Smile, Meh, Frown, Brain, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { DailyJournal } from "@/lib/types";
import moment from "jalali-moment";

const MOOD_META = {
  calm: { label: T.dailyJournal.moodCalm, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "😌" },
  confident: { label: T.dailyJournal.moodConfident, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/30", icon: "💪" },
  neutral: { label: T.dailyJournal.moodNeutral, color: "text-muted-foreground", bg: "bg-muted border-border", icon: "😐" },
  anxious: { label: T.dailyJournal.moodAnxious, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: "😰" },
  frustrated: { label: T.dailyJournal.moodFrustrated, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30", icon: "😤" },
} as const;

const BIAS_META = {
  bullish: { label: T.dailyJournal.biasBullish, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  bearish: { label: T.dailyJournal.biasBearish, color: "text-rose-500", bg: "bg-rose-500/10" },
  ranging: { label: T.dailyJournal.biasRanging, color: "text-amber-500", bg: "bg-amber-500/10" },
  neutral: { label: T.dailyJournal.biasNeutral, color: "text-muted-foreground", bg: "bg-muted" },
} as const;

function emptyJournal(profileId: string): DailyJournal {
  const now = Date.now();
  return {
    id: uid(),
    profileId,
    date: now,
    mood: "neutral",
    bias: "neutral",
    preMarketNotes: "",
    marketObservations: "",
    keyLevels: "",
    mistakesToday: "",
    gratitude: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function DailyJournalSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const list = useDailyJournals(profileId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyJournal | null>(null);
  const [form, setForm] = useState<DailyJournal>(emptyJournal("all"));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyJournal(profileId === "all" ? "all" : profileId));
    setOpen(true);
  };
  const openEdit = (j: DailyJournal) => {
    setEditing(j);
    setForm(j);
    setOpen(true);
  };
  const handleSave = async () => {
    await saveDailyJournal({ ...form, updatedAt: Date.now() });
    toast.success(editing ? "یادداشت به‌روز شد" : "یادداشت ثبت شد");
    setOpen(false);
  };
  const handleDelete = async (id: string) => {
    await deleteDailyJournal(id);
    toast.success("یادداشت حذف شد");
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.dailyJournal.title}
        subtitle={T.dailyJournal.subtitle}
        icon={<BookHeart className="h-5 w-5" />}
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{T.dailyJournal.add}</span>
          </Button>
        }
      />

      {!list || list.length === 0 ? (
        <EmptyState
          icon={<BookHeart className="h-7 w-7" />}
          title={T.common.empty}
          hint="هر روز قبل از بازار، یادداشتت رو بنویس — بایاس، سطوح کلیدی و حال‌وهوات"
          action={<Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />{T.dailyJournal.add}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {list.map((j) => {
            const mood = MOOD_META[j.mood];
            const bias = BIAS_META[j.bias];
            return (
              <Card key={j.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border text-xl", mood.bg)}>
                      {mood.icon}
                    </div>
                    <div>
                      <DateText ts={j.date} className="text-sm font-bold" />
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px]", mood.bg, mood.color)}>
                          {mood.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px]", bias.bg, bias.color)}>
                          <TrendingUp className="ml-1 h-2.5 w-2.5" />
                          {bias.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(j)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDelete(j.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(j.preMarketNotes || j.marketObservations || j.keyLevels) && (
                  <div className="mt-3 space-y-2">
                    {j.preMarketNotes && (
                      <div>
                        <p className="mb-0.5 text-[11px] font-medium text-gold">{T.dailyJournal.preMarketNotes}</p>
                        <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-2 text-xs leading-relaxed">{j.preMarketNotes}</p>
                      </div>
                    )}
                    {j.keyLevels && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{T.dailyJournal.keyLevels}:</span>
                        <span className="text-xs" dir="ltr"><Num>{j.keyLevels}</Num></span>
                      </div>
                    )}
                    {j.marketObservations && (
                      <div>
                        <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{T.dailyJournal.marketObservations}</p>
                        <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-2 text-xs leading-relaxed">{j.marketObservations}</p>
                      </div>
                    )}
                    {j.mistakesToday && (
                      <div>
                        <p className="mb-0.5 text-[11px] font-medium text-rose-500">{T.dailyJournal.mistakesToday}</p>
                        <p className="whitespace-pre-wrap rounded-lg bg-rose-500/5 p-2 text-xs leading-relaxed">{j.mistakesToday}</p>
                      </div>
                    )}
                    {j.gratitude && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-emerald-500/5 p-2">
                        <span className="text-[11px]">🙏</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{j.gratitude}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-right">{editing ? T.dailyJournal.edit : T.dailyJournal.add}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[68vh] scroll-thin">
            <div className="space-y-4 px-5 py-5">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{T.dailyJournal.date}</Label>
                <Input
                  type="date"
                  dir="ltr"
                  className="text-left"
                  value={moment(form.date).format("YYYY-MM-DD")}
                  onChange={(e) => {
                    const m = moment(e.target.value, "YYYY-MM-DD");
                    if (m.isValid()) setForm((f) => ({ ...f, date: m.valueOf() }));
                  }}
                />
              </div>

              {/* Mood */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{T.dailyJournal.mood}</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(MOOD_META) as DailyJournal["mood"][]).map((m) => {
                    const meta = MOOD_META[m];
                    const active = form.mood === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setForm((f) => ({ ...f, mood: m }))}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border-2 py-2 transition-all",
                          active ? cn(meta.bg, "scale-105") : "border-border opacity-60 hover:opacity-100"
                        )}
                      >
                        <span className="text-xl">{meta.icon}</span>
                        <span className={cn("text-[9px] font-medium", active ? meta.color : "text-muted-foreground")}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bias */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{T.dailyJournal.bias}</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(BIAS_META) as DailyJournal["bias"][]).map((b) => {
                    const meta = BIAS_META[b];
                    const active = form.bias === b;
                    return (
                      <button
                        key={b}
                        onClick={() => setForm((f) => ({ ...f, bias: b }))}
                        className={cn(
                          "rounded-lg border-2 py-2 text-xs font-medium transition-all",
                          active ? cn(meta.bg, meta.color, "scale-105") : "border-border opacity-60 hover:opacity-100"
                        )}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label={T.dailyJournal.preMarketNotes}>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={form.preMarketNotes}
                  onChange={(e) => setForm((f) => ({ ...f, preMarketNotes: e.target.value }))}
                  placeholder="امروز چه انتظاری داری؟ روی چه چیزی تمرکز می‌کنی؟"
                  className="resize-none"
                />
              </Field>
              <Field label={T.dailyJournal.keyLevels}>
                <Input
                  dir="ltr"
                  className="text-left"
                  value={form.keyLevels}
                  onChange={(e) => setForm((f) => ({ ...f, keyLevels: e.target.value }))}
                  placeholder="Support: 2345 / Resistance: 2360"
                />
              </Field>
              <Field label={T.dailyJournal.marketObservations}>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={form.marketObservations}
                  onChange={(e) => setForm((f) => ({ ...f, marketObservations: e.target.value }))}
                  placeholder="چه دیدی؟ چه الگویی شکل گرفت؟"
                  className="resize-none"
                />
              </Field>
              <Field label={T.dailyJournal.mistakesToday}>
                <Textarea
                  dir="rtl"
                  rows={2}
                  value={form.mistakesToday}
                  onChange={(e) => setForm((f) => ({ ...f, mistakesToday: e.target.value }))}
                  placeholder="اگه اشتباهی کردی، رک بنویس"
                  className="resize-none"
                />
              </Field>
              <Field label={T.dailyJournal.gratitude}>
                <Textarea
                  dir="rtl"
                  rows={2}
                  value={form.gratitude}
                  onChange={(e) => setForm((f) => ({ ...f, gratitude: e.target.value }))}
                  placeholder="یه نکته مثبت از امروز..."
                  className="resize-none"
                />
              </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
