// Habit-tracker pure logic — no React, no DB. Everything operates on local-day
// keys so the whole module is deterministic and testable.
import type { Habit, HabitFrequency } from "./types";
import { HABIT_SEEDS, HABIT_COLORS } from "./constants";
import {
  Dumbbell, PenTool, FlaskConical, Eye, GraduationCap, BookOpen, Brain, Zap, Flame,
  Target, TrendingUp, LineChart, BarChart3, Clock, CalendarDays, Sun, MoonStar,
  Coffee, Heart, Trophy, Medal, Star, Sparkles, ShieldCheck, Newspaper, Timer,
  NotebookPen, Scale, Coins, Activity, Focus, Headphones, type LucideIcon,
} from "lucide-react";

// ---- icon set (from the project's existing lucide dependency) ----
export const HABIT_ICONS: Record<string, LucideIcon> = {
  Dumbbell, PenTool, FlaskConical, Eye, GraduationCap, BookOpen, Brain, Zap, Flame,
  Target, TrendingUp, LineChart, BarChart3, Clock, CalendarDays, Sun, MoonStar,
  Coffee, Heart, Trophy, Medal, Star, Sparkles, ShieldCheck, Newspaper, Timer,
  NotebookPen, Scale, Coins, Activity, Focus, Headphones,
};

export function habitIcon(key: string): LucideIcon {
  return HABIT_ICONS[key] ?? Dumbbell;
}

export function habitColor(key: string) {
  return HABIT_COLORS[key] ?? HABIT_COLORS.gold;
}

// ---- day helpers (local-time, same convention as the old practice section) ----
export function dayKeyOf(ts: number): number {
  const d = new Date(ts);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function todayStart(): number {
  return startOfDay(Date.now());
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Persian week starts Saturday — returns local-midnight of the week's Saturday. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  const satOffset = (d.getDay() + 1) % 7; // Sat→0, Sun→1, … Fri→6
  return startOfDay(addDays(ts, -satOffset));
}

// ---- deterministic ids (make migration + default seeding idempotent) ----
export function defaultHabitId(profileId: string, key: string): string {
  return `habit-${profileId}-${key}`;
}

export function buildDefaultHabits(profileId: string, baseOrder = 0): Habit[] {
  const now = Date.now();
  return HABIT_SEEDS.map((s, i) => ({
    id: defaultHabitId(profileId, s.key),
    profileId,
    name: s.name,
    icon: s.icon,
    color: s.color,
    note: s.note,
    frequency: { type: "daily" } as HabitFrequency,
    reminderTime: null,
    archived: false,
    sortOrder: baseOrder + i,
    createdAt: now,
    updatedAt: now,
  }));
}

// ---- frequency ----
export function isDueOn(habit: Habit, ts: number): boolean {
  const f = habit.frequency;
  if (f.type === "daily" || f.type === "timesPerWeek") return true; // flexible habits are shown every day
  return f.weekdays.includes(new Date(ts).getDay());
}

export function frequencyLabel(f: HabitFrequency): string {
  if (f.type === "daily") return "هر روز";
  if (f.type === "timesPerWeek") return `${f.timesPerWeek} بار در هفته`;
  return "روزهای خاص هفته";
}

// ---- streaks (frequency-aware) ----
/**
 * Current streak of a habit.
 * - daily / weekdays: consecutive scheduled days completed, anchored on today
 *   (grace: an uncompleted *today* doesn't break the streak yet — it's "at risk").
 * - timesPerWeek: consecutive Persian weeks (Saturday-first) that met the target;
 *   the running week only counts once the target is already met.
 */
export function habitStreak(habit: Habit, dayKeys: Set<number>, now = Date.now()): number {
  const f = habit.frequency;
  if (f.type === "timesPerWeek") {
    let cursor = weekStart(now);
    let weeks = 0;
    for (let i = 0; i < 540; i++) {
      const count = countDaysInRange(dayKeys, cursor, addDays(cursor, 6));
      if (count >= f.timesPerWeek) weeks++;
      else if (i === 0) {
        // current week still in progress — don't break the chain yet
      } else break;
      cursor = addDays(cursor, -7);
    }
    return weeks;
  }
  const scheduled = (ts: number) =>
    f.type === "daily" ? true : f.weekdays.includes(new Date(ts).getDay());
  const today = todayStart();
  let cursor: number;
  if (dayKeys.has(dayKeyOf(today))) {
    cursor = today;
  } else if (!scheduled(today)) {
    // today not scheduled — chain continues from the previous scheduled day
    cursor = addDays(today, -1);
    let guard = 0;
    while (!scheduled(cursor) && guard++ < 10) cursor = addDays(cursor, -1);
    if (!dayKeys.has(dayKeyOf(cursor))) return 0;
  } else {
    // today scheduled but not done yet — grace: count from the previous scheduled day
    cursor = addDays(today, -1);
    let guard = 0;
    while (!scheduled(cursor) && guard++ < 10) cursor = addDays(cursor, -1);
    if (!dayKeys.has(dayKeyOf(cursor))) return 0;
  }
  let streak = 0;
  let guard = 0;
  while (guard++ < 3650) {
    if (dayKeys.has(dayKeyOf(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    } else if (!scheduled(cursor)) {
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

/** Longest streak ever achieved (same rules as habitStreak, scanned over all history). */
export function longestHabitStreak(habit: Habit, dayKeys: Set<number>, now = Date.now()): number {
  if (dayKeys.size === 0) return 0;
  const f = habit.frequency;
  if (f.type === "timesPerWeek") {
    const first = Math.min(...dayKeys);
    let cursor = weekStart(now);
    const lastWeek = weekStart(first);
    let best = 0;
    let run = 0;
    while (cursor >= lastWeek) {
      const count = countDaysInRange(dayKeys, cursor, addDays(cursor, 6));
      if (count >= f.timesPerWeek) {
        run++;
        best = Math.max(best, run);
      } else if (cursor < weekStart(now)) {
        run = 0; // a fully-past week that failed ends the run
      }
      cursor = addDays(cursor, -7);
    }
    return best;
  }
  const scheduled = (ts: number) =>
    f.type === "daily" ? true : f.weekdays.includes(new Date(ts).getDay());
  const today = todayStart();
  // collect sorted scheduled-day presence, scanning back from today
  const days = [...dayKeys].sort((a, b) => a - b);
  const firstTs = dayKeyToTs(days[0]);
  let best = 0;
  let run = 0;
  let cursor = firstTs;
  let guard = 0;
  while (cursor <= today && guard++ < 3650) {
    if (scheduled(cursor)) {
      if (dayKeys.has(dayKeyOf(cursor))) {
        run++;
        best = Math.max(best, run);
      } else if (cursor < today) {
        run = 0; // a missed *past* scheduled day breaks the run; today is still grace
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

function dayKeyToTs(key: number): number {
  const y = Math.floor(key / 10000);
  const m = Math.floor((key % 10000) / 100);
  const d = key % 100;
  return new Date(y, m - 1, d).getTime();
}

function countDaysInRange(dayKeys: Set<number>, fromTs: number, toTs: number): number {
  let n = 0;
  for (const k of dayKeys) {
    const ts = dayKeyToTs(k);
    if (ts >= fromTs && ts <= toTs) n++;
  }
  return n;
}

// ---- completion rates ----
export interface HabitRates {
  week: { done: number; due: number } | null; // current Persian week (so far)
  month: { done: number; due: number } | null; // last 30 days
}

export function habitRates(habit: Habit, dayKeys: Set<number>, now = Date.now()): HabitRates {
  const today = todayStart();
  const f = habit.frequency;
  if (f.type === "timesPerWeek") {
    const wStart = weekStart(now);
    const doneW = countDaysInRange(dayKeys, wStart, today);
    const doneM = countDaysInRange(dayKeys, addDays(today, -29), today);
    return {
      week: { done: doneW, due: f.timesPerWeek },
      month: { done: doneM, due: Math.round((f.timesPerWeek * 30) / 7) },
    };
  }
  const scheduled = (ts: number) =>
    f.type === "daily" ? true : f.weekdays.includes(new Date(ts).getDay());
  // week: Saturday..today (due-so-far only — fair, not punishing half-weeks)
  const wStart = weekStart(now);
  let dueW = 0;
  for (let ts = wStart; ts <= today; ts = addDays(ts, 1)) if (scheduled(ts)) dueW++;
  const doneW = countDaysInRange(dayKeys, wStart, today);
  // month: last 30 days
  const mStart = addDays(today, -29);
  let dueM = 0;
  for (let ts = mStart; ts <= today; ts = addDays(ts, 1)) if (scheduled(ts)) dueM++;
  const doneM = countDaysInRange(dayKeys, mStart, today);
  return {
    week: dueW > 0 ? { done: doneW, due: dueW } : null,
    month: dueM > 0 ? { done: doneM, due: dueM } : null,
  };
}

export function pct(done: number, due: number): number {
  if (due <= 0) return 0;
  return Math.min(100, Math.round((done / due) * 100));
}
