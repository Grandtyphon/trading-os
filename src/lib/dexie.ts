import Dexie, { type Table } from "dexie";
import type { Profile, Trade, BacktestTrade, Settings, DailyJournal, MentorHistory, ChatMessage, Conversation, MentorRule, PracticeTask, Habit, HabitEntry, Todo } from "./types";
import { buildDefaultHabits, dayKeyOf, startOfDay } from "./habits";

export class TradingOSDB extends Dexie {
  profiles!: Table<Profile, string>;
  trades!: Table<Trade, string>;
  backtests!: Table<BacktestTrade, string>;
  settings!: Table<Settings, string>;
  dailyJournals!: Table<DailyJournal, string>;
  mentorHistory!: Table<MentorHistory, string>;
  conversations!: Table<Conversation, string>;
  chatMessages!: Table<ChatMessage, string>;
  mentorRules!: Table<MentorRule, string>;
  practiceTasks!: Table<PracticeTask, string>; // legacy — emptied after migration, kept for old-backup import
  habits!: Table<Habit, string>;
  habitEntries!: Table<HabitEntry, string>;
  todos!: Table<Todo, string>;

  constructor() {
    super("trading-os-db");
    this.version(1).stores({
      profiles: "id, type, createdAt",
      trades: "id, profileId, openedAt, closedAt, outcome, session, setup, direction, createdAt",
      backtests: "id, profileId, date, outcome, session, setup, createdAt",
      settings: "id",
    });
    this.version(2).stores({
      dailyJournals: "id, profileId, date, mood, bias, createdAt",
    });
    this.version(3).stores({
      mentorHistory: "id, profileId, createdAt",
    });
    this.version(4).stores({
      conversations: "id, profileId, createdAt, updatedAt",
      chatMessages: "id, conversationId, role, createdAt",
      mentorRules: "id, category, source, createdAt",
    });
    this.version(5).stores({
      practiceTasks: "id, profileId, date, category, createdAt",
    });
    // v6 — habit tracker. practiceTasks stays in the schema (data migration is
    // done lazily at runtime so old backups keep importing cleanly).
    this.version(6).stores({
      habits: "id, profileId, archived, createdAt",
      habitEntries: "id, profileId, habitId, date, createdAt",
    });
    // v7 — growth Life-OS: one-off to-dos (today list) + long-term goals.
    this.version(7).stores({
      todos: "id, profileId, scope, date, done, createdAt",
    });
  }
}

export const db = new TradingOSDB();

/**
 * One-time migration: legacy practiceTasks → habits + habitEntries.
 * - The 4 fixed categories become 4 editable default habits (deterministic ids → idempotent).
 * - Tasks become check-in entries (entry id `migrated:<taskId>` → re-running never duplicates).
 * - Multiple tasks of the same category on the same day merge into one entry
 *   (notes joined) to preserve the one-check-in-per-habit-day invariant.
 * - practiceTasks is cleared only after everything landed — nothing is lost.
 * Returns the number of entries converted (0 = nothing to do).
 */
export async function migratePracticeToHabits(): Promise<number> {
  const legacy = await db.practiceTasks.toArray();
  if (legacy.length === 0) return 0;
  const [existingHabits, existingEntries] = await Promise.all([
    db.habits.toArray(),
    db.habitEntries.toArray(),
  ]);
  const habitIds = new Set(existingHabits.map((h) => h.id));
  const entryIds = new Set(existingEntries.map((e) => e.id));

  // 1) default habits for every profile that has legacy tasks
  const profileIds = [...new Set(legacy.map((t) => t.profileId))];
  const newHabits: Habit[] = [];
  for (const pid of profileIds) {
    for (const h of buildDefaultHabits(pid)) {
      if (!habitIds.has(h.id)) newHabits.push(h);
    }
  }

  // 2) tasks → entries (merge same habit+day; normalize date to local midnight)
  const byKey = new Map<string, HabitEntry>();
  for (const t of legacy) {
    const id = `migrated:${t.id}`;
    if (entryIds.has(id)) continue;
    const date = startOfDay(t.date);
    const habitId = defaultHabitIdFor(t.profileId, t.category);
    const key = `${t.profileId}|${habitId}|${dayKeyOf(date)}`;
    const prev = byKey.get(key);
    if (prev) {
      // same habit same day — merge notes/links instead of dropping data
      prev.note = t.note ? (prev.note ? `${prev.note} — ${t.note}` : t.note) : prev.note;
      prev.linkedTradeId = prev.linkedTradeId ?? t.linkedTradeId ?? null;
      prev.createdAt = Math.min(prev.createdAt, t.createdAt);
    } else {
      byKey.set(key, {
        id,
        profileId: t.profileId,
        habitId,
        date,
        note: t.note ?? "",
        linkedTradeId: t.linkedTradeId ?? null,
        createdAt: t.createdAt,
      });
    }
  }
  const newEntries = [...byKey.values()];

  await db.transaction("rw", db.habits, db.habitEntries, db.practiceTasks, async () => {
    if (newHabits.length > 0) await db.habits.bulkPut(newHabits);
    if (newEntries.length > 0) await db.habitEntries.bulkPut(newEntries);
    await db.practiceTasks.clear();
  });
  return newEntries.length;
}

// legacy category → deterministic habit id (mirrors buildDefaultHabits ids)
function defaultHabitIdFor(profileId: string, category: string): string {
  return `habit-${profileId}-${category}`;
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  theme: "dark",
  defaultRiskPercent: 1,
  persianDigits: false,
  calendarMode: "jalali",
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  if (s) return s;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch, id: "app" };
  await db.settings.put(next);
  return next;
}

// Seed default profile on first run.
// NOTE: legacy practice→habit migration intentionally does NOT run here — it runs
// on practice-section mount (migratePracticeToHabits) so the user sees the
// "تمرین‌های قبلی منتقل شد" toast, and after old-backup imports (importAllData).
export async function ensureSeedData(): Promise<void> {
  const count = await db.profiles.count();
  if (count === 0) {
    const now = Date.now();
    await db.profiles.bulkAdd([
      {
        id: crypto.randomUUID(),
        name: "لایو — اصلی",
        type: "live",
        createdAt: now,
        propRules: null,
      },
      {
        id: crypto.randomUUID(),
        name: "بک‌تست — تمرین",
        type: "backtest",
        createdAt: now,
        propRules: null,
      },
    ]);
  }
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
