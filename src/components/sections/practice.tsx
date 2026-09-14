"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useHabits, useHabitEntries, useTrades, useTodos, saveHabit, deleteHabit, setHabitArchived,
  toggleHabitDay, upsertHabitEntry, deleteHabitEntry, getHabitEntryById, saveHabitEntry,
} from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { T } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { uid, migratePracticeToHabits } from "@/lib/dexie";
import { HABIT_COLORS, HABIT_COLOR_KEYS, HABIT_MILESTONES, WEEKDAY_LABELS } from "@/lib/constants";
import {
  HABIT_ICONS, habitIcon, habitColor, dayKeyOf, startOfDay, todayStart, addDays,
  isDueOn, habitStreak, longestHabitStreak, habitRates, buildDefaultHabits, pct,
} from "@/lib/habits";
import type { Habit, HabitEntry, HabitFrequency, HabitColorKey, Trade } from "@/lib/types";
import { formatR, pnlColor } from "@/lib/format";
import { formatDateShort, toPersianDigits } from "@/lib/calendar";
import { habitEntriesToCSV, downloadCSV } from "@/lib/csv";
import { Num, DateText, EmptyState, SectionHeader, SkeletonList } from "@/components/shared/ui-bits";
import { TodayTab } from "@/components/sections/growth/today-tab";
import { LongtermTab } from "@/components/sections/growth/longterm-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sprout, Plus, Pencil, Trash2, Flame, Link2, ArrowUpRight, ArrowDownRight, Download,
  SlidersHorizontal, Check, FilterX, CalendarDays, X, MousePointerClick, Search, SearchX,
  Minus, History, Trophy, Archive, ArchiveRestore, MoonStar, ChevronDown, Zap, Sparkles,
  Clock, Sun, Target,
} from "lucide-react";
import { toast } from "sonner";
import moment from "jalali-moment";

// ---- shared heatmap constants (12-week view, Saturday-first weeks like the calendar) ----
const HEAT_WEEKS = 12;
const HEAT_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // Saturday-first
const HEAT_LEVEL_BG = [
  "bg-muted-foreground/15",
  "bg-[color-mix(in_oklab,var(--gold)_28%,transparent)]",
  "bg-[color-mix(in_oklab,var(--gold)_50%,transparent)]",
  "bg-[color-mix(in_oklab,var(--gold)_78%,transparent)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_45%,transparent)]",
];
const heatLevel = (count: number) => (count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3);

// global (any-habit) streak milestones — celebrated once per profile
const MILESTONES = [7, 14, 30, 60, 100];

// ---- streak helpers (global — days with ≥1 check-in) ----
function computeStreak(dayKeys: Set<number>): number {
  if (dayKeys.size === 0) return 0;
  const now = new Date();
  const todayKey = dayKeyOf(now.getTime());
  const yesterdayKey = dayKeyOf(now.getTime() - 86_400_000);
  let cursor: Date;
  if (dayKeys.has(todayKey)) {
    cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dayKeys.has(yesterdayKey)) {
    cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else {
    return 0;
  }
  let streak = 0;
  while (dayKeys.has(dayKeyOf(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeLongestStreak(dayKeys: Set<number>): number {
  if (dayKeys.size === 0) return 0;
  const keys = [...dayKeys].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] - keys[i - 1] === 1) run++;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}

// short frequency descriptor for habit cards
function freqShort(f: HabitFrequency): string {
  if (f.type === "daily") return "هر روز";
  if (f.type === "timesPerWeek") return `${toPersianDigits(f.timesPerWeek)}× در هفته`;
  const ordered = WEEKDAY_LABELS.filter((w) => f.weekdays.includes(w.value));
  return ordered.length === 7 ? "هر روز" : ordered.map((w) => w.short).join(" ");
}

function tradeLabel(t: Trade, mode: "jalali" | "gregorian"): string {
  const r = t.resultR !== null ? ` ${formatR(t.resultR)}` : "";
  return `${t.symbol} — ${formatDateShort(t.openedAt, mode)}${r}`;
}

// ============================================================================
// Progress ring — hero "۳ از ۵ امروز" (KPI-grid quality)
// ============================================================================
function ProgressRing({ percent, done, due }: { percent: number; done: number; due: number }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const p = due > 0 ? Math.min(1, percent / 100) : 0;
  return (
    <div
      className="relative h-[88px] w-[88px] shrink-0"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={due > 0 ? percent : undefined}
      aria-label={`${done} / ${due}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="habit-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="9" className="stroke-muted-foreground/20" />
        <circle
          cx="50" cy="50" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke="url(#habit-ring-grad)"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {due > 0 ? (
          <>
            <span className="num text-lg font-extrabold leading-none text-gold">
              <Num>{percent}</Num>
              <span className="text-[10px] font-bold">٪</span>
            </span>
            <span className="num mt-0.5 text-[10px] font-semibold text-muted-foreground">
              <Num>{done}</Num>
              <span className="text-muted-foreground/50">/</span>
              <Num>{due}</Num>
            </span>
          </>
        ) : (
          <MoonStar className="h-6 w-6 text-muted-foreground/50" aria-hidden />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Habit card — tap-to-complete + expandable detail panel (7-day strip + heatmap + stats)
// ============================================================================
interface HabitCardProps {
  habit: Habit;
  dayKeys: Set<number>;
  entriesForHabit: HabitEntry[];
  expanded: boolean;
  celebrating: boolean;
  canWrite: boolean;
  quickDayTs: number;
  calMode: "jalali" | "gregorian";
  onToggleExpand: () => void;
  onToggleDay: (habit: Habit, dayTs: number) => void;
  onEditHabit: (habit: Habit) => void;
  onOpenNote: (habit: Habit, entry: HabitEntry) => void;
}

function HabitCard({
  habit, dayKeys, entriesForHabit, expanded, celebrating, canWrite, quickDayTs, calMode,
  onToggleExpand, onToggleDay, onEditHabit, onOpenNote,
}: HabitCardProps) {
  const Icon = habitIcon(habit.icon);
  const c = habitColor(habit.color);
  const streak = useMemo(() => habitStreak(habit, dayKeys), [habit, dayKeys]);
  const best = useMemo(() => longestHabitStreak(habit, dayKeys), [habit, dayKeys]);
  const rates = useMemo(() => habitRates(habit, dayKeys), [habit, dayKeys]);
  const dueToday = isDueOn(habit, Date.now());
  const todayKey = dayKeyOf(Date.now());
  const targetKey = dayKeyOf(quickDayTs);
  const doneTarget = dayKeys.has(targetKey);
  const targetEntry = entriesForHabit.find((e) => dayKeyOf(e.date) === targetKey) ?? null;
  const showRest = !dueToday && !doneTarget;
  const isTimes = habit.frequency.type === "timesPerWeek";
  const weekDone = isTimes ? countThisWeek(dayKeys) : 0;
  const weekTarget = habit.frequency.type === "timesPerWeek" ? habit.frequency.timesPerWeek : 0;
  const goalMet = isTimes && weekDone >= weekTarget;

  // big check button: empty → instant toggle; filled → open the note dialog.
  // The pop animation fires ONLY on an actual check-in tap — never on remount
  // with already-done state (page reload must stay calm).
  const [justPopped, setJustPopped] = useState(false);
  const handleCheck = () => {
    if (!canWrite || showRest) return;
    if (doneTarget && targetEntry) onOpenNote(habit, targetEntry);
    else {
      setJustPopped(true);
      window.setTimeout(() => setJustPopped(false), 1200); // > pop (450ms) + liveQuery latency
      onToggleDay(habit, quickDayTs);
    }
  };

  return (
    <Card
      className={cn(
        "group animate-fade-up overflow-hidden border-border/60 p-3.5 transition-all card-lift",
        doneTarget && "border-border",
        showRest && "opacity-75"
      )}
    >
      {/* ---- header row: icon + name/freq + streak + check button ---- */}
      <div className="flex items-center gap-3">
        <div
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
        >
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110",
            c.bg, c.border, c.text
          )}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-bold text-foreground">{habit.name}</p>
              {streak > 0 && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                    c.border, c.bg, c.text,
                    celebrating && "animate-milestone"
                  )}
                  title={T.practice.streak}
                >
                  <Flame className={cn("h-3 w-3", streak > 0 && "pulse-glow")} />
                  <Num>{streak}</Num>
                </span>
              )}
              {goalMet && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                  <Sparkles className="h-3 w-3" />
                  {T.practice.goalReached}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{freqShort(habit.frequency)}</span>
              {habit.note && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="max-w-[180px] truncate text-[10px] text-muted-foreground/70" title={habit.note}>
                    {habit.note}
                  </span>
                </>
              )}
            </div>
            {/* timesPerWeek weekly progress micro-bar */}
            {isTimes && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div
                  className="h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={weekTarget}
                  aria-valuenow={Math.min(weekDone, weekTarget)}
                  aria-label={T.practice.timesGoal}
                >
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", goalMet ? "bg-emerald-500" : c.solid)}
                    style={{ width: `${Math.min(100, (weekDone / weekTarget) * 100)}%` }}
                  />
                </div>
                <span className="num shrink-0 text-[9px] font-semibold tabular-nums text-muted-foreground">
                  <Num>{weekDone}</Num>
                  <span className="text-muted-foreground/50">/</span>
                  <Num>{weekTarget}</Num>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* expand chevron (keyboard-accessible) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground/60"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={T.practice.detailsHint}
          title={T.practice.detailsHint}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")} />
        </Button>

        {/* tap-to-complete */}
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canWrite || showRest}
          aria-pressed={doneTarget}
          aria-label={`${T.practice.checkIn} — ${habit.name}`}
          title={showRest ? T.practice.notDueToday : doneTarget ? T.practice.editNote : T.practice.checkIn}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
            doneTarget
              ? cn(c.solid, c.solidText, c.border, c.glow, justPopped && "animate-check-pop")
              : "border-border/70 bg-muted/30 text-muted-foreground/50 hover:border-border hover:bg-muted/50",
            canWrite && !showRest && "active:scale-90 cursor-pointer",
            (!canWrite || showRest) && "cursor-not-allowed",
            showRest && "opacity-40"
          )}
        >
          {showRest ? (
            <MoonStar className="h-5 w-5" aria-hidden />
          ) : (
            <Check className="h-6 w-6 transition-transform duration-200" strokeWidth={3} aria-hidden />
          )}
        </button>
      </div>

      {/* ---- expanded detail panel ---- */}
      {expanded && (
        <div className="mt-3 animate-fade-up space-y-3 border-t border-border/40 pt-3">
          {/* stats row — KPI mini-grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-center">
              <p className={cn("num text-sm font-extrabold tabular-nums", streak > 0 ? c.text : "text-muted-foreground")}>
                <Num>{streak}</Num>
              </p>
              <p className="text-[8.5px] font-medium text-muted-foreground">{T.practice.streak}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-center">
              <p className="num flex items-center justify-center gap-0.5 text-sm font-extrabold tabular-nums text-foreground/80">
                <Trophy className="h-3 w-3 text-gold/80" aria-hidden />
                <Num>{best}</Num>
              </p>
              <p className="text-[8.5px] font-medium text-muted-foreground">{T.practice.streakBest}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-center">
              <p className="num text-sm font-extrabold tabular-nums text-foreground/80">
                {rates.week ? <><Num>{pct(rates.week.done, rates.week.due)}</Num><span className="text-[9px]">٪</span></> : "—"}
              </p>
              <p className="text-[8.5px] font-medium text-muted-foreground">{T.practice.thisWeek}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-center">
              <p className="num text-sm font-extrabold tabular-nums text-foreground/80">
                {rates.month ? <><Num>{pct(rates.month.done, rates.month.due)}</Num><span className="text-[9px]">٪</span></> : "—"}
              </p>
              <p className="text-[8.5px] font-medium text-muted-foreground">{T.practice.last30}</p>
            </div>
          </div>

          {/* last-7-days strip — tap a day to toggle its check-in */}
          <div>
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">{T.practice.last7Strip}</p>
            <div className="flex items-center justify-between gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const ts = addDays(todayStart(), -(6 - i));
                const key = dayKeyOf(ts);
                const has = dayKeys.has(key);
                const isToday = i === 6;
                const scheduled =
                  habit.frequency.type === "weekdays"
                    ? habit.frequency.weekdays.includes(new Date(ts).getDay())
                    : true;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!canWrite || !scheduled}
                    onClick={() => onToggleDay(habit, ts)}
                    aria-pressed={has}
                    aria-label={`${formatDateShort(ts, calMode)} — ${has ? T.practice.checkedIn : T.practice.checkIn}`}
                    title={`${formatDateShort(ts, calMode)}${has ? " — برای حذف بزن" : ""}${!scheduled ? " — " + T.practice.restDay : ""}`}
                    className={cn(
                      "flex h-9 w-full flex-col items-center justify-center rounded-lg border text-[10px] font-bold transition-all",
                      has
                        ? cn(c.bg, c.border, c.text)
                        : "border-border/60 bg-muted/20 text-muted-foreground/60",
                      isToday && "ring-1 ring-gold/50 ring-offset-1 ring-offset-background",
                      canWrite && scheduled ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-not-allowed opacity-40"
                    )}
                  >
                    {has ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <span>{WEEKDAY_LABELS.find((w) => w.value === new Date(ts).getDay())?.short}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 12-week per-habit heatmap — GitHub-style, habit-colored; click toggles */}
          <div className="overflow-x-auto pb-0.5">
            <div className="flex w-max gap-[3px]">
              <div className="flex flex-col gap-[3px]" aria-hidden>
                <span className="h-[11px]" />
                {HEAT_WEEKDAYS.map((w) => (
                  <span key={w} className="flex h-[11px] w-[11px] items-center justify-center text-[8px] font-medium leading-none text-muted-foreground/70">
                    {w}
                  </span>
                ))}
              </div>
              {habitHeatWeeks(dayKeys).map((wk) => (
                <div key={wk.startTs} className="flex flex-col gap-[3px]">
                  <span className="h-[11px] w-[11px]" aria-hidden />
                  {wk.days.map((d) => {
                    const has = d.has;
                    const future = d.ts > todayStart();
                    return (
                      <button
                        key={d.key}
                        type="button"
                        disabled={!canWrite || future}
                        onClick={() => onToggleDay(habit, d.ts)}
                        aria-pressed={has}
                        aria-label={`${formatDateShort(d.ts, calMode)} — ${has ? T.practice.checkedIn : T.practice.checkIn}`}
                        title={`${formatDateShort(d.ts, calMode)}${has ? " ✓" : ""}`}
                        className={cn(
                          "h-[11px] w-[11px] shrink-0 rounded-[3px] transition-all duration-200",
                          has ? c.heat : "bg-muted-foreground/15",
                          d.key === todayKey && "ring-1 ring-gold/60 ring-offset-1 ring-offset-background",
                          !future && canWrite && "cursor-pointer hover:scale-125",
                          future && "opacity-30"
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* today/yesterday note row */}
          {targetEntry && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-medium text-muted-foreground">
                  {targetKey === todayKey ? T.practice.today : T.practice.yesterday}
                  <span className="text-muted-foreground/40"> · </span>
                  <DateText ts={targetEntry.createdAt} withTime />
                </p>
                <p className="truncate text-[11px] text-foreground">
                  {targetEntry.note || <span className="text-muted-foreground/60">{T.practice.noCheckinNote}</span>}
                </p>
              </div>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                onClick={() => onOpenNote(habit, targetEntry)}
                aria-label={T.practice.editNote}
                title={T.practice.editNote}
                disabled={!canWrite}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* edit habit */}
          <Button
            variant="outline" size="sm"
            className="w-full gap-1.5 border-border/70 text-muted-foreground hover:bg-accent/60"
            onClick={() => onEditHabit(habit)}
            disabled={!canWrite}
          >
            <Pencil className="h-3.5 w-3.5" />
            {T.practice.editHabit}
          </Button>
        </div>
      )}
    </Card>
  );
}

// helper: last-12 weeks grid for one habit (binary done/not-done, Saturday-first)
function habitHeatWeeks(dayKeys: Set<number>): { startTs: number; days: { key: number; ts: number; has: boolean }[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const satOffset = (today.getDay() + 1) % 7;
  const thisSaturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - satOffset);
  const weeks: { startTs: number; days: { key: number; ts: number; has: boolean }[] }[] = [];
  for (let w = HEAT_WEEKS - 1; w >= 0; w--) {
    const start = new Date(thisSaturday.getFullYear(), thisSaturday.getMonth(), thisSaturday.getDate() - w * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = dayKeyOf(d.getTime());
      return { key, ts: d.getTime(), has: dayKeys.has(key) };
    });
    weeks.push({ startTs: start.getTime(), days });
  }
  return weeks;
}

// helper: completions in the current Persian week (for timesPerWeek display)
function countThisWeek(dayKeys: Set<number>): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const satOffset = (today.getDay() + 1) % 7;
  const wStart = dayKeyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - satOffset).getTime());
  const tKey = dayKeyOf(today.getTime());
  let n = 0;
  for (const k of dayKeys) if (k >= wStart && k <= tKey) n++;
  return n;
}

// ============================================================================
// Habit create/edit dialog
// ============================================================================
interface HabitFormState {
  id: string | null;
  name: string;
  icon: string;
  color: HabitColorKey;
  note: string;
  freqType: "daily" | "weekdays" | "timesPerWeek";
  weekdays: number[];
  timesPerWeek: number;
  reminderTime: string;
  archived: boolean;
}

const emptyHabitForm = (): HabitFormState => ({
  id: null,
  name: "",
  icon: "Dumbbell",
  color: "gold",
  note: "",
  freqType: "daily",
  weekdays: [6, 0, 1, 2, 3], // Sat..Wed default
  timesPerWeek: 3,
  reminderTime: "",
  archived: false,
});

function HabitFormDialog({
  open, onOpenChange, form, setForm, editing, profileId, nextSortOrder, onSaved, onDeleted, onArchived,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: HabitFormState;
  setForm: (f: HabitFormState) => void;
  editing: Habit | null;
  profileId: string;
  nextSortOrder: number;
  onSaved: (h: Habit) => void;
  onDeleted: (id: string) => void;
  onArchived: (id: string, archived: boolean) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // note: parent remounts this dialog (key=…) on every open, so confirmDelete always starts false — no reset effect needed

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error(T.practice.nameRequired);
      return;
    }
    if (form.freqType === "weekdays" && form.weekdays.length === 0) {
      toast.error(T.practice.weekdayRequired);
      return;
    }
    const now = Date.now();
    const frequency: HabitFrequency =
      form.freqType === "daily"
        ? { type: "daily" }
        : form.freqType === "weekdays"
          ? { type: "weekdays", weekdays: form.weekdays }
          : { type: "timesPerWeek", timesPerWeek: form.timesPerWeek };
    const habit: Habit = {
      id: editing?.id ?? uid(),
      profileId,
      name: name.slice(0, 40),
      icon: form.icon,
      color: form.color,
      note: form.note.trim().slice(0, 120),
      frequency,
      reminderTime: form.reminderTime || null,
      archived: editing?.archived ?? false,
      sortOrder: editing?.sortOrder ?? nextSortOrder,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveHabit(habit);
    toast.success(T.practice.habitSaved, { description: habit.name });
    onSaved(habit);
    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (!editing) return;
    await setHabitArchived(editing.id, !editing.archived);
    toast.success(editing.archived ? T.practice.habitRestored : T.practice.habitArchived, { description: editing.name });
    onArchived(editing.id, !editing.archived);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteHabit(editing.id);
    toast.success(T.practice.habitDeleted, { description: editing.name });
    onDeleted(editing.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-right">{editing ? T.practice.editHabit : T.practice.newHabit}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-5">
          {/* name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {T.practice.habitName}
              <span className="text-rose-500"> *</span>
            </Label>
            <Input
              dir="rtl"
              value={form.name}
              maxLength={40}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={T.practice.habitNamePh}
              className="focus-visible:ring-gold/40"
            />
          </div>

          {/* icon picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.icon}</Label>
            <div className="grid max-h-28 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2">
              {Object.entries(HABIT_ICONS).map(([key, Ic]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, icon: key })}
                  aria-label={key}
                  aria-pressed={form.icon === key}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                    form.icon === key
                      ? cn(habitColor(form.color).bg, habitColor(form.color).border, habitColor(form.color).text, "scale-110")
                      : "border-transparent text-muted-foreground/70 hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Ic className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* color picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.color}</Label>
            <div className="flex items-center gap-2">
              {HABIT_COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, color: k as HabitColorKey })}
                  aria-label={HABIT_COLORS[k].label}
                  aria-pressed={form.color === k}
                  title={HABIT_COLORS[k].label}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    HABIT_COLORS[k].solid,
                    form.color === k
                      ? "scale-110 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                      : "opacity-70 hover:scale-105 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          {/* description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.habitNoteLabel}</Label>
            <Input
              dir="rtl"
              value={form.note}
              maxLength={120}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={T.practice.habitNotePh}
              className="focus-visible:ring-gold/40"
            />
          </div>

          {/* frequency */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.frequency}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: "daily", label: T.practice.freqDaily },
                { value: "weekdays", label: T.practice.freqWeekdays },
                { value: "timesPerWeek", label: T.practice.freqTimes },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, freqType: opt.value })}
                  aria-pressed={form.freqType === opt.value}
                  className={cn(
                    "rounded-xl border-2 px-2 py-2 text-[11px] font-semibold transition-all",
                    form.freqType === opt.value
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.freqType === "weekdays" && (
              <div className="flex flex-wrap gap-1 pt-1">
                {WEEKDAY_LABELS.map((w) => {
                  const active = form.weekdays.includes(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          weekdays: active
                            ? form.weekdays.filter((d) => d !== w.value)
                            : [...form.weekdays, w.value],
                        })
                      }
                      aria-pressed={active}
                      title={w.label}
                      className={cn(
                        "h-8 w-8 rounded-lg border text-[11px] font-bold transition-all active:scale-95",
                        active
                          ? "border-gold/50 bg-gold/10 text-gold"
                          : "border-border/70 bg-muted/20 text-muted-foreground/70 hover:bg-accent/50"
                      )}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
            )}
            {form.freqType === "timesPerWeek" && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setForm({ ...form, timesPerWeek: Math.max(1, form.timesPerWeek - 1) })}
                  aria-label="-"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="num min-w-[72px] text-center text-sm font-bold text-foreground">
                  <Num>{form.timesPerWeek}</Num>
                  <span className="ms-1 text-[10px] font-medium text-muted-foreground">{T.practice.timesLabel}</span>
                </span>
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setForm({ ...form, timesPerWeek: Math.min(7, form.timesPerWeek + 1) })}
                  aria-label="+"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* reminder time (schema-only for now) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.reminderTime}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                dir="ltr"
                value={form.reminderTime}
                onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                className="max-w-[140px] text-left focus-visible:ring-gold/40"
              />
              {form.reminderTime && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reminderTime: "" })}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="X"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70">{T.practice.reminderHint}</p>
          </div>
        </div>

        {/* destructive row (edit only) */}
        {editing && (
          <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
            <Button
              variant="outline" size="sm"
              className="flex-1 gap-1.5 border-border/70 text-muted-foreground hover:bg-accent/60"
              onClick={handleArchive}
            >
              {editing.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              {editing.archived ? T.practice.unarchive : T.practice.archiveHabit}
            </Button>
            <Button
              variant="outline" size="sm"
              className={cn(
                "gap-1.5",
                confirmDelete
                  ? "border-rose-500/60 bg-rose-500/10 text-rose-500"
                  : "border-border/70 text-rose-500/90 hover:bg-rose-500/10 hover:text-rose-500"
              )}
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? T.practice.deleteHabitConfirm : T.practice.deleteHabit}
            </Button>
          </div>
        )}

        <DialogFooter className="border-t px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{T.common.cancel}</Button>
          <Button onClick={handleSave}>{T.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Check-in dialog — create / edit one check-in (note + optional trade link)
// ============================================================================
interface CheckinFormState {
  habitId: string;
  dateTs: number;
  note: string;
  linkedTradeId: string | null;
  editingId: string | null;
}

function CheckInDialog({
  open, onOpenChange, state, setState, habits, trades, calMode, canWrite, onSaved, onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: CheckinFormState;
  setState: (s: CheckinFormState) => void;
  habits: Habit[]; // selectable (active)
  trades: Trade[] | undefined;
  calMode: "jalali" | "gregorian";
  canWrite: boolean;
  onSaved: () => void;
  onDeleted: (id: string) => void;
}) {
  const habit = habits.find((h) => h.id === state.habitId);

  const handleSave = async () => {
    if (!habit) return;
    const note = state.note.trim();
    if (state.editingId) {
      // preserve id — direct update
      const existing = await getHabitEntryById(state.editingId);
      if (existing) {
        await saveHabitEntry({
          ...existing,
          habitId: habit.id,
          date: startOfDay(state.dateTs),
          note,
          linkedTradeId: state.linkedTradeId,
        });
      }
    } else {
      await upsertHabitEntry(habit, state.dateTs, note, state.linkedTradeId);
    }
    toast.success(T.practice.checkinSaved, { description: habit.name });
    onSaved();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!state.editingId) return;
    await deleteHabitEntry(state.editingId);
    toast.success(T.practice.checkinRemoved);
    onDeleted(state.editingId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-right">
            {state.editingId ? T.practice.editNote : T.practice.addCheckin}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-5">
          {/* habit select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.selectHabit}</Label>
            <Select
              value={state.habitId}
              onValueChange={(v) => setState({ ...state, habitId: v })}
              disabled={!canWrite || habits.length === 0}
            >
              <SelectTrigger className="w-full" dir="rtl">
                <SelectValue placeholder={T.practice.selectHabit} />
              </SelectTrigger>
              <SelectContent>
                {habits.map((h) => {
                  const Ic = habitIcon(h.icon);
                  return (
                    <SelectItem key={h.id} value={h.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <Ic className={cn("h-3.5 w-3.5", habitColor(h.color).text)} />
                        {h.name}
                        {h.archived && <Archive className="h-3 w-3 text-muted-foreground/50" />}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{T.practice.date}</Label>
            <Input
              type="date"
              dir="ltr"
              className="text-left"
              value={moment(state.dateTs).format("YYYY-MM-DD")}
              onChange={(e) => {
                const m = moment(e.target.value, "YYYY-MM-DD");
                if (m.isValid()) setState({ ...state, dateTs: m.valueOf() });
              }}
            />
          </div>

          {/* note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {T.practice.checkinNote}
              <span className="text-muted-foreground/60"> ({T.common.recommended} — اختیاری)</span>
            </Label>
            <Textarea
              dir="rtl"
              rows={3}
              maxLength={300}
              value={state.note}
              onChange={(e) => setState({ ...state, note: e.target.value })}
              placeholder={T.practice.notePh}
              className="resize-none"
            />
            <p className="text-left text-[10px] text-muted-foreground/70">
              <Num>{state.note.length}</Num>
              <span dir="ltr"> / 300</span>
            </p>
          </div>

          {/* optional trade link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {T.practice.linkedTrade}
              <span className="text-muted-foreground/60"> (اختیاری)</span>
            </Label>
            <Select
              value={state.linkedTradeId ?? "none"}
              onValueChange={(v) => setState({ ...state, linkedTradeId: v === "none" ? null : v })}
            >
              <SelectTrigger className="w-full" dir="rtl">
                <SelectValue placeholder={T.practice.noLinkedTrade} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{T.practice.noLinkedTrade}</SelectItem>
                {(trades ?? []).slice(0, 50).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span dir="ltr" className="num">{tradeLabel(t, calMode)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-row items-center gap-2 border-t px-5 py-3">
          {state.editingId && (
            <Button
              variant="ghost" size="sm"
              className="me-auto gap-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {T.practice.deleteCheckin}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{T.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!habit}>{T.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Section
// ============================================================================
export function PracticeSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const calMode = useAppStore((s) => s.calendarMode);
  const habits = useHabits(profileId);
  const entries = useHabitEntries(profileId);
  const trades = useTrades(profileId);
  const todos = useTodos(profileId);
  const isRealProfile = profileId !== "all";
  const celebrated = useAppStore((s) => s.celebratedMilestones);
  const markMilestone = useAppStore((s) => s.markMilestone);
  const habitsSeeded = useAppStore((s) => s.habitsSeededProfiles);
  const markHabitsSeeded = useAppStore((s) => s.markHabitsSeeded);

  // ---- one-time legacy migration (practiceTasks → habits) with notice toast ----
  useEffect(() => {
    if (!isRealProfile) return;
    let cancelled = false;
    void migratePracticeToHabits().then((n) => {
      if (!cancelled && n > 0) {
        toast.success(T.practice.migratedToast, { description: `${toPersianDigits(n)} چک‌این` });
      }
    }).catch(() => 0);
    return () => { cancelled = true; };
  }, [profileId, isRealProfile]);

  // ---- seed default habits for a fresh profile (once per profile) ----
  useEffect(() => {
    if (!isRealProfile || !habits) return;
    if (habits.length > 0 || habitsSeeded.includes(profileId)) return;
    markHabitsSeeded(profileId);
    void (async () => {
      for (const h of buildDefaultHabits(profileId)) await saveHabit(h);
    })();
  }, [habits, profileId, isRealProfile, habitsSeeded, markHabitsSeeded]);

  const activeHabits = useMemo(() => (habits ?? []).filter((h) => !h.archived), [habits]);
  const archivedHabits = useMemo(() => (habits ?? []).filter((h) => h.archived), [habits]);

  // per-habit maps: entries + done-day key sets
  const entriesByHabit = useMemo(() => {
    const m = new Map<string, HabitEntry[]>();
    for (const e of entries ?? []) {
      const arr = m.get(e.habitId) ?? [];
      arr.push(e);
      m.set(e.habitId, arr);
    }
    return m;
  }, [entries]);

  const dayKeysByHabit = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const e of entries ?? []) {
      const s = m.get(e.habitId) ?? new Set<number>();
      s.add(dayKeyOf(e.date));
      m.set(e.habitId, s);
    }
    return m;
  }, [entries]);

  const allDayKeys = useMemo(() => new Set((entries ?? []).map((e) => dayKeyOf(e.date))), [entries]);
  const todayKey = dayKeyOf(Date.now());

  // ---- global (any-habit) streak + milestones (legacy keys preserved) ----
  const streak = useMemo(() => computeStreak(allDayKeys), [allDayKeys]);
  const bestGlobal = useMemo(() => computeLongestStreak(allDayKeys), [allDayKeys]);

  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!isRealProfile || streak <= 0) return;
    const newly = MILESTONES.filter((m) => streak >= m && !celebrated.includes(`${profileId}:${m}`));
    if (newly.length === 0) return;
    newly.forEach((m) => markMilestone(`${profileId}:${m}`));
    const top = newly[newly.length - 1];
    toast.success(T.practice.milestoneToast, {
      description: `${toPersianDigits(top)} ${T.practice.streakDesc}`,
    });
    setCelebrating(true);
    const t = window.setTimeout(() => setCelebrating(false), 1600);
    return () => window.clearTimeout(t);
  }, [streak, profileId, isRealProfile, celebrated, markMilestone]);

  // ---- per-habit milestone celebration (Flame bounce on the card) ----
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);
  useEffect(() => {
    if (!isRealProfile || activeHabits.length === 0) return;
    const fires: { habit: Habit; m: number }[] = [];
    for (const h of activeHabits) {
      const s = habitStreak(h, dayKeysByHabit.get(h.id) ?? new Set());
      for (const m of HABIT_MILESTONES) {
        if (s >= m && !celebrated.includes(`h:${h.id}:${m}`)) fires.push({ habit: h, m });
      }
    }
    if (fires.length === 0) return;
    fires.forEach((f) => markMilestone(`h:${f.habit.id}:${f.m}`));
    const top = fires[fires.length - 1];
    const unit = top.habit.frequency.type === "timesPerWeek" ? "هفته" : "روز";
    toast.success(T.practice.milestoneToast, {
      description: `${top.habit.name} — ${toPersianDigits(top.m)} ${unit} پشت‌سرهم`,
    });
    setCelebratingHabitId(top.habit.id);
    const t = window.setTimeout(() => setCelebratingHabitId(null), 1600);
    return () => window.clearTimeout(t);
  }, [activeHabits, dayKeysByHabit, isRealProfile, celebrated, markMilestone]);

  // ---- hero: due/done today + milestone progress ----
  const dueToday = useMemo(() => activeHabits.filter((h) => isDueOn(h, Date.now())), [activeHabits]);
  const doneToday = useMemo(
    () => dueToday.filter((h) => (dayKeysByHabit.get(h.id) ?? new Set()).has(todayKey)).length,
    [dueToday, dayKeysByHabit, todayKey]
  );
  const heroPercent = dueToday.length > 0 ? Math.round((doneToday / dueToday.length) * 100) : 0;
  const allDone = dueToday.length > 0 && doneToday === dueToday.length;
  const nextMilestone = MILESTONES.find((m) => m > streak);
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  const milestoneProgress = nextMilestone
    ? Math.min(100, Math.round(((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
    : 100;

  const last7Count = useMemo(() => {
    const cutoff = dayKeyOf(Date.now() - 6 * 86_400_000);
    return (entries ?? []).filter((e) => dayKeyOf(e.date) >= cutoff).length;
  }, [entries]);

  const last7 = useMemo(() => {
    const base = todayStart();
    return Array.from({ length: 7 }, (_, i) => {
      const ts = addDays(base, -(6 - i));
      const key = dayKeyOf(ts);
      return { key, ts, has: allDayKeys.has(key), isToday: i === 6 };
    });
  }, [allDayKeys]);

  const weekDelta = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const satOffset = (today.getDay() + 1) % 7;
    const thisStart = dayKeyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - satOffset).getTime());
    const prevStart = dayKeyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - satOffset - 7).getTime());
    const counts = new Map<number, number>();
    for (const e of entries ?? []) {
      const k = dayKeyOf(e.date);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    let thisCount = 0;
    let prevCount = 0;
    for (const [k, c] of counts) {
      if (k >= thisStart) thisCount += c;
      else if (k >= prevStart) prevCount += c;
    }
    return { thisCount, prevCount, diff: thisCount - prevCount };
  }, [entries]);

  // ---- interactive state ----
  const [quickDay, setQuickDay] = useState<"today" | "yesterday">("today");
  const quickDayTs = quickDay === "today" ? todayStart() : addDays(todayStart(), -1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [habitForm, setHabitForm] = useState<HabitFormState>(emptyHabitForm());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinState, setCheckinState] = useState<CheckinFormState>({
    habitId: "", dateTs: todayStart(), note: "", linkedTradeId: null, editingId: null,
  });
  const [habitFilter, setHabitFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<{ key: number; ts: number } | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [confirmArchiveDelete, setConfirmArchiveDelete] = useState<string | null>(null);

  const tradeMap = useMemo(() => {
    const m = new Map<string, Trade>();
    for (const t of trades ?? []) m.set(t.id, t);
    return m;
  }, [trades]);
  const habitMap = useMemo(() => new Map((habits ?? []).map((h) => [h.id, h])), [habits]);

  // ---- actions ----
  const handleToggleDay = async (habit: Habit, dayTs: number) => {
    if (!isRealProfile) {
      toast.error(T.practice.needProfile);
      return;
    }
    if (startOfDay(dayTs) > todayStart()) return;
    const created = await toggleHabitDay(habit, dayTs);
    if (created) {
      toast.success(T.practice.checkedIn, {
        description: `${habit.name} — ${formatDateShort(dayTs, calMode)}`,
        action: { label: T.practice.undo, onClick: () => void deleteHabitEntry(created.id) },
      });
    } else {
      toast(T.practice.checkinRemoved, { description: habit.name });
    }
  };

  const openNewHabit = () => {
    if (!isRealProfile) {
      toast.error(T.practice.needProfile);
      return;
    }
    setEditingHabit(null);
    setHabitForm(emptyHabitForm());
    setHabitFormOpen(true);
  };

  const openEditHabit = (h: Habit) => {
    setEditingHabit(h);
    setHabitForm({
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      note: h.note,
      freqType: h.frequency.type,
      weekdays: h.frequency.type === "weekdays" ? [...h.frequency.weekdays] : [6, 0, 1, 2, 3],
      timesPerWeek: h.frequency.type === "timesPerWeek" ? h.frequency.timesPerWeek : 3,
      reminderTime: h.reminderTime ?? "",
      archived: h.archived,
    });
    setHabitFormOpen(true);
  };

  const openNote = (habit: Habit, entry: HabitEntry) => {
    setCheckinState({
      habitId: habit.id,
      dateTs: entry.date,
      note: entry.note,
      linkedTradeId: entry.linkedTradeId ?? null,
      editingId: entry.id,
    });
    setCheckinOpen(true);
  };

  const openNewCheckin = () => {
    if (!isRealProfile) {
      toast.error(T.practice.needProfile);
      return;
    }
    if (activeHabits.length === 0) {
      toast.error(T.practice.needHabit);
      return;
    }
    setCheckinState({
      habitId: activeHabits[0].id,
      dateTs: quickDayTs,
      note: "",
      linkedTradeId: null,
      editingId: null,
    });
    setCheckinOpen(true);
  };

  const openEditEntry = (e: HabitEntry) => {
    setCheckinState({
      habitId: e.habitId,
      dateTs: e.date,
      note: e.note,
      linkedTradeId: e.linkedTradeId ?? null,
      editingId: e.id,
    });
    setCheckinOpen(true);
  };

  const restoreDefaults = async () => {
    if (!isRealProfile) {
      toast.error(T.practice.needProfile);
      return;
    }
    const existing = new Set((habits ?? []).map((h) => h.id));
    const missing = buildDefaultHabits(profileId).filter((h) => !existing.has(h.id));
    for (const h of missing) await saveHabit(h);
    markHabitsSeeded(profileId);
    toast.success(T.practice.defaultsRestored, {
      description: `${toPersianDigits(missing.length)} عادت`,
    });
  };

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) {
      toast.error(T.practice.csvEmpty);
      return;
    }
    try {
      const csv = habitEntriesToCSV(entries, habits ?? []);
      downloadCSV(csv, `practice-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(T.practice.csvDone);
    } catch {
      toast.error("خطا در خروجی CSV");
    }
  };

  // ---- history: grouped entries with filters ----
  const groups = useMemo(() => {
    if (!entries) return [];
    const map = new Map<number, HabitEntry[]>();
    for (const e of entries) {
      const key = dayKeyOf(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([key, items]) => ({ key, date: items[0].date, items: items.sort((a, b) => b.createdAt - a.createdAt) }));
  }, [entries]);

  const visibleGroups = useMemo(() => {
    let gs = groups;
    if (dayFilter !== null) gs = gs.filter((g) => g.key === dayFilter.key);
    const q = search.trim().toLowerCase();
    if (q || habitFilter !== "all") {
      gs = gs
        .map((g) => ({
          ...g,
          items: g.items.filter((e) => {
            if (habitFilter !== "all" && e.habitId !== habitFilter) return false;
            if (!q) return true;
            if (e.note.toLowerCase().includes(q)) return true;
            const h = habitMap.get(e.habitId);
            if (h && h.name.toLowerCase().includes(q)) return true;
            const linked = e.linkedTradeId ? tradeMap.get(e.linkedTradeId) : undefined;
            return linked ? linked.symbol.toLowerCase().includes(q) : false;
          }),
        }))
        .filter((g) => g.items.length > 0);
    }
    return gs;
  }, [groups, habitFilter, dayFilter, search, habitMap, tradeMap]);

  // ---- global 12-week heatmap (all habits, count-based) ----
  const heatmap = useMemo(() => {
    const countMap = new Map<number, number>();
    for (const e of entries ?? []) {
      const k = dayKeyOf(e.date);
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const satOffset = (today.getDay() + 1) % 7;
    const thisSaturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - satOffset);
    const weeks: { startTs: number; days: { key: number; ts: number; count: number }[] }[] = [];
    for (let w = HEAT_WEEKS - 1; w >= 0; w--) {
      const start = new Date(thisSaturday.getFullYear(), thisSaturday.getMonth(), thisSaturday.getDate() - w * 7);
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dayKeyOf(d.getTime());
        return { key, ts: d.getTime(), count: countMap.get(key) ?? 0 };
      });
      weeks.push({ startTs: start.getTime(), days });
    }
    let total = 0;
    let activeDays = 0;
    for (const wk of weeks) for (const d of wk.days) if (d.count > 0) { total += d.count; activeDays++; }
    return { weeks, total, activeDays, weekAvg: total / HEAT_WEEKS };
  }, [entries]);

  const nextSortOrder = (habits ?? []).reduce((mx, h) => Math.max(mx, h.sortOrder), -1) + 1;
  const loading = !habits || !entries || !todos;

  // ---- Life-OS tab state + badge stats ----
  const [tab, setTab] = useState<string>("today");
  const openTodayCount = useMemo(
    () => (todos ?? []).filter((t) => t.scope === "today" && !t.done).length,
    [todos]
  );
  const activeGoalsCount = useMemo(
    () => (todos ?? []).filter((t) => t.scope === "longterm" && !t.done).length,
    [todos]
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.practice.title}
        subtitle={T.practice.subtitle}
        icon={<Sprout className="h-5 w-5" />}
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          {/* ============ segmented tab bar ============ */}
          <TabsList className="h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1">
            <TabsTrigger
              value="today"
              className="gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground transition-all sm:text-xs data-[state=active]:border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_15%,transparent)]"
            >
              <Sun className="h-4 w-4" />
              {T.practice.tabToday}
              {openTodayCount > 0 && (
                <Badge variant="outline" className="ml-0.5 h-4 border-gold/30 bg-gold/10 px-1 text-[9px] font-bold text-gold">
                  <Num>{openTodayCount}</Num>
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="longterm"
              className="gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground transition-all sm:text-xs data-[state=active]:border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_15%,transparent)]"
            >
              <Target className="h-4 w-4" />
              {T.practice.tabLongterm}
              {activeGoalsCount > 0 && (
                <Badge variant="outline" className="ml-0.5 h-4 border-gold/30 bg-gold/10 px-1 text-[9px] font-bold text-gold">
                  <Num>{activeGoalsCount}</Num>
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="habits"
              className="gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground transition-all sm:text-xs data-[state=active]:border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_15%,transparent)]"
            >
              <Flame className="h-4 w-4" />
              {T.practice.tabHabits}
              {dueToday.length > 0 && (
                <Badge variant="outline" className="ml-0.5 h-4 border-gold/30 bg-gold/10 px-1 text-[9px] font-bold text-gold">
                  <Num>{doneToday}</Num>
                  <span className="text-muted-foreground/50">/</span>
                  <Num>{dueToday.length}</Num>
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ============ امروز — one-off daily to-dos ============ */}
          <TabsContent value="today" className="mt-0">
            <TodayTab
              todos={todos}
              profileId={profileId}
              canWrite={isRealProfile}
              calMode={calMode}
              habitsToday={{ done: doneToday, due: dueToday.length }}
              onGoToHabits={() => setTab("habits")}
            />
          </TabsContent>

          {/* ============ بلندمدت — long-term goals ============ */}
          <TabsContent value="longterm" className="mt-0">
            <LongtermTab
              todos={todos}
              profileId={profileId}
              canWrite={isRealProfile}
              calMode={calMode}
            />
          </TabsContent>

          {/* ============ عادت‌ها — the habit tracker ============ */}
          <TabsContent value="habits" className="mt-0">
            {activeHabits.length === 0 && archivedHabits.length === 0 ? (
              <EmptyState
                icon={<Sprout className="h-7 w-7 animate-soft-pulse text-gold/70" />}
                title={T.common.empty}
                hint={T.practice.emptyHint}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button onClick={openNewHabit} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {T.practice.newHabit}
                    </Button>
                    <Button variant="outline" onClick={restoreDefaults} className="gap-2 border-gold/30 text-gold hover:bg-gold/10">
                      <ArchiveRestore className="h-4 w-4" />
                      {T.practice.restoreDefaults}
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
          {/* ================= hero — today's progress ring + streak ================= */}
          <Card className={cn(
            "relative overflow-hidden border-border/60 p-4 transition-all",
            streak > 0 && "border-gold/25 neon-glow",
            allDone && "border-emerald-500/25"
          )}>
            {streak > 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--gold)_6%,transparent),transparent_55%)]"
              />
            )}
            {allDone && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,color-mix(in_oklab,#10b981_7%,transparent),transparent_55%)]"
              />
            )}
            <div className="relative flex items-center gap-4">
              <ProgressRing percent={heroPercent} done={doneToday} due={dueToday.length} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">{T.practice.today}</p>
                  {allDone ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-500">
                      <Check className="h-3 w-3" />
                      {T.practice.allDone}
                    </Badge>
                  ) : dueToday.length === 0 ? (
                    <Badge variant="outline" className="border-border bg-muted/40 text-[10px] text-muted-foreground">
                      <MoonStar className="h-3 w-3" />
                      {T.practice.noHabitsDue}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={cn(
                      "gap-1 text-[10px]",
                      doneToday > 0
                        ? "border-gold/30 bg-gold/10 text-gold"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    )}>
                      <Num>{doneToday}</Num>
                      <span className="text-muted-foreground/60">از</span>
                      <Num>{dueToday.length}</Num>
                      {T.practice.doneOf}
                    </Badge>
                  )}
                </div>
                {/* global streak + best */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border transition-all",
                      streak > 0
                        ? "border-gold/30 bg-gold/10 text-gold shadow-[0_0_18px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
                        : "border-border bg-muted/30 text-muted-foreground",
                      celebrating && "animate-milestone"
                    )}>
                      <Flame className={cn("h-4 w-4", streak > 0 && "pulse-glow", celebrating && "text-gold")} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground">{T.practice.streak}</p>
                      <p className={cn("text-xl font-extrabold tabular-nums count-up", streak > 0 ? "text-gold" : "text-muted-foreground")}>
                        <Num>{streak}</Num>
                      </p>
                    </div>
                  </div>
                  {bestGlobal > 0 && (
                    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                      <Trophy className="h-3 w-3 text-gold/70" />
                      {T.practice.streakBest}:
                      <span className="font-bold text-foreground/80"><Num>{bestGlobal}</Num></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* last 7 days dots */}
            <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                {T.practice.last7Days}
                <span className="text-muted-foreground/40">·</span>
                <span className="text-gold/90">
                  <Num>{last7Count}</Num> {T.practice.last7Count}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {last7.map((d) => (
                  <span
                    key={d.key}
                    title={formatDateShort(d.ts, calMode)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      d.has
                        ? "bg-gold shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_50%,transparent)]"
                        : "bg-muted-foreground/25",
                      d.isToday && "ring-1 ring-gold/50 ring-offset-1 ring-offset-background"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* this week vs last week */}
            <div className="relative mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                {T.practice.weekThis}
                <span className="text-gold/90"><Num>{weekDelta.thisCount}</Num></span>
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  weekDelta.diff > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : weekDelta.diff < 0
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                      : "border-border bg-muted/40 text-muted-foreground"
                )}
                title={T.practice.weekVsPrev}
              >
                {weekDelta.diff > 0 && <ArrowUpRight className="h-3 w-3" />}
                {weekDelta.diff < 0 && <ArrowDownRight className="h-3 w-3" />}
                {weekDelta.diff === 0 && <Minus className="h-3 w-3" />}
                {weekDelta.diff === 0 ? (
                  T.practice.weekEqual
                ) : (
                  <>
                    <Num>{Math.abs(weekDelta.diff)}</Num>
                    {T.practice.weekVsPrev}
                  </>
                )}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                {T.practice.weekPrev}
                <Num>{weekDelta.prevCount}</Num>
              </span>
            </div>

            {/* milestone progress bar */}
            {streak > 0 && nextMilestone && (
              <div className="relative mt-2 border-t border-border/40 pt-2.5">
                <div className="flex items-center justify-between text-[10px] font-medium">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Trophy className="h-3 w-3 text-gold/80" />
                    {T.practice.nextMilestone}
                  </span>
                  <span className="flex items-center gap-0.5 tabular-nums text-gold/90">
                    <Num>{streak}</Num>
                    <span className="text-muted-foreground/50">/</span>
                    <Num>{nextMilestone}</Num>
                    <span className="text-muted-foreground">روز</span>
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted-foreground/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={milestoneProgress}
                  aria-label={`${T.practice.nextMilestone}: ${streak}/${nextMilestone}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-gold/90 via-gold/60 to-gold/30 transition-all duration-500"
                    style={{ width: `${milestoneProgress}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* ================= habit list ================= */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80">
              <Zap className="h-3 w-3 text-gold" />
              {T.practice.habitsList}
              <span className="text-muted-foreground/40">·</span>
              <span className="num"><Num>{activeHabits.length}</Num> {T.practice.habitCount}</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* CSV export (habit check-ins) */}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleExportCSV}
                aria-label={T.practice.csvExport}
                title={T.practice.csvExport}
                disabled={!entries || entries.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={openNewHabit} size="sm" className="h-7 gap-1 px-2.5 text-[11px]">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{T.practice.newHabit}</span>
              </Button>
              {/* target-day toggle — flip to yesterday to backfill a missed day */}
              <button
                onClick={() => setQuickDay((d) => (d === "today" ? "yesterday" : "today"))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                  quickDay === "yesterday"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-[0_0_10px_color-mix(in_oklab,#f59e0b_18%,transparent)]"
                    : "border-border/70 bg-muted/30 text-muted-foreground hover:border-gold/40 hover:bg-accent/60 hover:text-accent-foreground"
                )}
                title={T.practice.yesterdayHint}
                aria-pressed={quickDay === "yesterday"}
              >
                <History className={cn("h-3 w-3 transition-colors", quickDay === "yesterday" && "text-amber-500")} />
                {quickDay === "yesterday" ? T.practice.yesterday : T.practice.today}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {activeHabits.map((h, idx) => (
              <div key={h.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}>
                <HabitCard
                  habit={h}
                  dayKeys={dayKeysByHabit.get(h.id) ?? new Set()}
                  entriesForHabit={entriesByHabit.get(h.id) ?? []}
                  expanded={expandedId === h.id}
                  celebrating={celebratingHabitId === h.id}
                  canWrite={isRealProfile}
                  quickDayTs={quickDayTs}
                  calMode={calMode}
                  onToggleExpand={() => setExpandedId((id) => (id === h.id ? null : h.id))}
                  onToggleDay={handleToggleDay}
                  onEditHabit={openEditHabit}
                  onOpenNote={openNote}
                />
              </div>
            ))}
          </div>

          {/* ================= archived habits ================= */}
          {archivedHabits.length > 0 && (
            <Card className="border-border/60 p-4">
              <button
                onClick={() => setArchiveOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2"
                aria-expanded={archiveOpen}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Archive className="h-4 w-4 text-muted-foreground/70" />
                  {T.practice.archivedSection}
                  <Badge variant="outline" className="h-4 border-border bg-muted/40 px-1.5 text-[9px] text-muted-foreground">
                    <Num>{archivedHabits.length}</Num>
                  </Badge>
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-300", archiveOpen && "rotate-180")} />
              </button>
              {archiveOpen && (
                <div className="mt-3 animate-fade-up space-y-2">
                  {archivedHabits.map((h) => {
                    const Ic = habitIcon(h.icon);
                    const c = habitColor(h.color);
                    const s = habitStreak(h, dayKeysByHabit.get(h.id) ?? new Set());
                    return (
                      <div key={h.id} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", c.bg, c.border, c.text)}>
                          <Ic className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-muted-foreground">{h.name}</p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {freqShort(h.frequency)}
                            {s > 0 && <> · <Flame className="inline h-3 w-3 text-gold/70" /> <Num>{s}</Num></>}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={async () => {
                            await setHabitArchived(h.id, false);
                            toast.success(T.practice.habitRestored, { description: h.name });
                          }}
                          aria-label={T.practice.unarchive}
                          title={T.practice.unarchive}
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={cn(
                            "h-7 w-7 text-rose-500",
                            confirmArchiveDelete === h.id && "border border-rose-500/50 bg-rose-500/10"
                          )}
                          onClick={async () => {
                            if (confirmArchiveDelete !== h.id) {
                              setConfirmArchiveDelete(h.id);
                              return;
                            }
                            await deleteHabit(h.id);
                            setConfirmArchiveDelete(null);
                            toast.success(T.practice.habitDeleted, { description: h.name });
                          }}
                          aria-label={T.practice.deleteHabit}
                          title={confirmArchiveDelete === h.id ? T.practice.deleteHabitConfirm : T.practice.deleteHabit}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ================= global 12-week heatmap ================= */}
          <Card className="animate-fade-up border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/25 bg-gold/10 text-gold">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{T.practice.heatTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{T.practice.heatSubtitle}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="font-semibold text-gold">
                  <Num>{heatmap.total}</Num> {T.practice.heatTotal}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span>
                  <Num>{heatmap.activeDays}</Num> {T.practice.heatActiveDays}
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto pb-0.5">
              <div className="flex w-max gap-[3px]">
                <div className="flex flex-col gap-[3px]" aria-hidden>
                  <span className="h-[11px]" />
                  {HEAT_WEEKDAYS.map((w) => (
                    <span key={w} className="flex h-[11px] w-[11px] items-center justify-center text-[8px] font-medium leading-none text-muted-foreground/70">
                      {w}
                    </span>
                  ))}
                </div>
                {heatmap.weeks.map((wk, wi) => {
                  const month = moment(wk.startTs).format(calMode === "jalali" ? "jMMM" : "MMM");
                  const prevMonth = wi > 0 ? moment(heatmap.weeks[wi - 1].startTs).format(calMode === "jalali" ? "jMMM" : "MMM") : "";
                  const showMonth = month !== prevMonth;
                  return (
                    <div key={wk.startTs} className="flex animate-fade-up flex-col gap-[3px]" style={{ animationDelay: `${Math.min(wi * 30, 250)}ms` }}>
                      <span
                        className={cn(
                          "h-[11px] w-[11px] whitespace-nowrap text-right text-[8px] font-medium leading-[11px] text-muted-foreground/80",
                          !showMonth && "invisible"
                        )}
                        aria-hidden={!showMonth}
                      >
                        {month}
                      </span>
                      {wk.days.map((d) => {
                        const selected = dayFilter?.key === d.key;
                        const clickable = d.count > 0;
                        const label = `${formatDateShort(d.ts, calMode)} · ${d.count === 0 ? T.practice.heatNoEntry : `${toPersianDigits(d.count)} ${T.practice.heatTotal}`}`;
                        const cellCls = cn(
                          "h-[11px] w-[11px] shrink-0 rounded-[3px] transition-all duration-200",
                          clickable && "cursor-pointer hover:scale-125 hover:shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_50%,transparent)]",
                          HEAT_LEVEL_BG[heatLevel(d.count)],
                          d.key === todayKey && !selected && "ring-1 ring-gold/60 ring-offset-1 ring-offset-background",
                          selected && "scale-[1.35] ring-2 ring-gold ring-offset-1 ring-offset-background shadow-[0_0_10px_color-mix(in_oklab,var(--gold)_60%,transparent)]"
                        );
                        if (!clickable) return <span key={d.key} title={label} className={cellCls} aria-hidden />;
                        return (
                          <button
                            key={d.key}
                            type="button"
                            title={label}
                            aria-label={label}
                            aria-pressed={selected}
                            onClick={() => setDayFilter((f) => (f?.key === d.key ? null : { key: d.key, ts: d.ts }))}
                            className={cellCls}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                <span>{T.practice.heatLess}</span>
                {HEAT_LEVEL_BG.map((bg, i) => (
                  <span key={i} className={cn("h-2 w-2 rounded-[2px]", bg)} />
                ))}
                <span>{T.practice.heatMore}</span>
              </div>
              {dayFilter === null ? (
                <span className="hidden items-center gap-1 text-[9px] text-muted-foreground/80 sm:flex">
                  <MousePointerClick className="h-3 w-3 text-gold/70" />
                  {T.practice.heatHint}
                </span>
              ) : (
                <span className="hidden items-center gap-1 text-[9px] font-medium text-gold sm:flex">
                  <CalendarDays className="h-3 w-3" />
                  {T.practice.heatDaySelected}
                </span>
              )}
              <span className="hidden items-center gap-1 text-[9px] text-muted-foreground sm:flex">
                {T.practice.heatWeeklyAvg}:
                <span className="font-semibold text-gold"><Num>{heatmap.weekAvg.toFixed(1)}</Num></span>
              </span>
            </div>
          </Card>

          {/* day drill-down chip */}
          {dayFilter !== null && (
            <div className="flex animate-fade-up items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <DateText ts={dayFilter.ts} className="font-semibold" />
                <span className="text-muted-foreground/60">·</span>
                <Num>{groups.find((g) => g.key === dayFilter.key)?.items.length ?? 0}</Num>
                <span className="text-[9px] font-normal text-muted-foreground">{T.practice.heatTotal}</span>
              </span>
              <button
                onClick={() => setDayFilter(null)}
                aria-label={T.practice.clearDayFilter}
                title={T.practice.clearDayFilter}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground transition-all hover:border-gold/40 hover:text-gold active:scale-95"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* ================= history ================= */}
          {groups.length > 0 && (
            <>
              {/* search + habit filter chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative min-w-[150px] flex-1 sm:max-w-[240px]">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    dir="rtl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={T.common.search}
                    className="h-8 border-border/70 bg-muted/30 pr-9 text-xs focus-visible:ring-gold/40"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label={T.practice.clearSearch}
                      title={T.practice.clearSearch}
                      className="absolute left-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80">
                  <SlidersHorizontal className="h-3 w-3 text-gold" />
                  {T.practice.filterLabel}
                </span>
                <button
                  onClick={() => setHabitFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                    habitFilter === "all"
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-border/70 bg-muted/30 text-muted-foreground hover:border-gold/30 hover:bg-accent/50"
                  )}
                >
                  {T.practice.filterAll}
                  <span className={cn(
                    "rounded-full px-1 text-[9px] tabular-nums",
                    habitFilter === "all" ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"
                  )}>
                    <Num>{(entries ?? []).length}</Num>
                  </span>
                </button>
                {(habits ?? []).map((h) => {
                  const c = habitColor(h.color);
                  const Ic = habitIcon(h.icon);
                  const active = habitFilter === h.id;
                  const count = (entries ?? []).filter((e) => e.habitId === h.id).length;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setHabitFilter(active ? "all" : h.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                        active
                          ? cn(c.bg, c.border, c.text, "scale-[1.02]")
                          : "border-border/70 bg-muted/30 text-muted-foreground hover:border-gold/30 hover:bg-accent/50 hover:text-accent-foreground",
                        h.archived && !active && "opacity-60"
                      )}
                      title={h.note || h.name}
                    >
                      <Ic className="h-3 w-3" />
                      {h.name}
                      {h.archived && <Archive className="h-2.5 w-2.5" />}
                      <span className={cn(
                        "rounded-full px-1 text-[9px] tabular-nums",
                        active ? "bg-background/40 text-current" : "bg-muted text-muted-foreground"
                      )}>
                        <Num>{count}</Num>
                      </span>
                    </button>
                  );
                })}
                <Button
                  variant="outline" size="sm"
                  className="ms-auto h-7 gap-1.5 border-gold/30 px-2.5 text-[11px] text-gold hover:bg-gold/10"
                  onClick={openNewCheckin}
                  disabled={!isRealProfile || activeHabits.length === 0}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {T.practice.addCheckin}
                </Button>
              </div>

              {/* day-grouped entry list */}
              {visibleGroups.length === 0 ? (
                <Card className="border-dashed border-border/70 bg-muted/10 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                    {search.trim() ? <SearchX className="h-5 w-5" /> : <FilterX className="h-5 w-5" />}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {search.trim() ? T.practice.searchEmpty : T.practice.filteredEmpty}
                  </p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { setSearch(""); setHabitFilter("all"); setDayFilter(null); }}
                    className="mt-3 gap-1.5 border-gold/30 text-gold hover:bg-gold/10"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {T.practice.clearFilter}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleGroups.map((g) => (
                    <div key={g.key} className="animate-fade-up">
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <DateText ts={g.date} className="text-xs font-bold text-muted-foreground" />
                        {g.key === todayKey && (
                          <Badge variant="outline" className="h-4 border-gold/30 bg-gold/10 px-1.5 text-[9px] font-semibold text-gold">
                            {T.practice.today}
                          </Badge>
                        )}
                        <Badge variant="outline" className="h-4 border-border bg-muted/40 px-1.5 text-[9px] text-muted-foreground">
                          <Num>{g.items.length}</Num>
                        </Badge>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>
                      <div className="space-y-2">
                        {g.items.map((e, idx) => {
                          const h = habitMap.get(e.habitId);
                          const c = habitColor(h?.color ?? "gold");
                          const Ic = habitIcon(h?.icon ?? "Dumbbell");
                          const linked = e.linkedTradeId ? tradeMap.get(e.linkedTradeId) : undefined;
                          return (
                            <Card
                              key={e.id}
                              className="group animate-fade-up p-3.5 transition-all hover:border-gold/25 card-lift"
                              style={{ animationDelay: `${Math.min(idx * 50, 250)}ms` }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 group-hover:scale-110",
                                  c.bg, c.border, c.text
                                )}>
                                  <Ic className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline" className={cn("text-[10px]", c.bg, c.border, c.text)}>
                                      {h?.name ?? "—"}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      <DateText ts={e.createdAt} withTime />
                                    </span>
                                  </div>
                                  {e.note && (
                                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                                      {e.note}
                                    </p>
                                  )}
                                  {linked && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                                      <Link2 className="h-3 w-3 text-gold" />
                                      <span dir="ltr" className="num inline-flex items-center gap-1 font-medium">
                                        {linked.direction === "long" ? (
                                          <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                          <ArrowDownRight className="h-3 w-3 text-rose-500" />
                                        )}
                                        {linked.symbol}
                                        {linked.resultR !== null && (
                                          <span className={pnlColor(linked.resultR)}>
                                            <Num>{formatR(linked.resultR)}</Num>
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEntry(e)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7 text-rose-500"
                                    onClick={async () => {
                                      await deleteHabitEntry(e.id);
                                      toast.success(T.practice.checkinRemoved);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* dialogs */}
      <HabitFormDialog
        key={habitFormOpen ? editingHabit?.id ?? "new" : "closed"}
        open={habitFormOpen}
        onOpenChange={setHabitFormOpen}
        form={habitForm}
        setForm={setHabitForm}
        editing={editingHabit}
        profileId={profileId === "all" ? "all" : profileId}
        nextSortOrder={nextSortOrder}
        onSaved={() => { /* liveQuery refreshes */ }}
        onDeleted={() => { /* liveQuery refreshes */ }}
        onArchived={() => { /* liveQuery refreshes */ }}
      />
      <CheckInDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        state={checkinState}
        setState={setCheckinState}
        habits={habits ?? []}
        trades={trades}
        calMode={calMode}
        canWrite={isRealProfile}
        onSaved={() => { /* liveQuery refreshes */ }}
        onDeleted={() => { /* liveQuery refreshes */ }}
      />
    </div>
  );
}
