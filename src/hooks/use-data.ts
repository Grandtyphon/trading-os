"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeedData, getSettings, uid, migratePracticeToHabits } from "@/lib/dexie";
import type { Trade, BacktestTrade, Profile, Settings, DailyJournal, Direction, Outcome, TradingSession, MentorHistory, ChatMessage, Conversation, MentorRule, PracticeTask, Habit, HabitEntry, Todo } from "@/lib/types";
import { buildDefaultHabits, dayKeyOf, startOfDay } from "@/lib/habits";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/use-app-store";

// Ensure seed data runs once on client
let seeded = false;
export function useEnsureSeed() {
  useEffect(() => {
    if (seeded) return;
    seeded = true;
    ensureSeedData();
  }, []);
}

export function useProfiles(): Profile[] | undefined {
  useEnsureSeed();
  return useLiveQuery(() => db.profiles.toArray().then((p) => p.sort((a, b) => a.createdAt - b.createdAt)), []);
}

export function useSettings(): Settings | undefined {
  const [s, setS] = useState<Settings | undefined>(undefined);
  useEffect(() => {
    getSettings().then(setS);
  }, []);
  // sync with store
  const storeTheme = useAppStore((s) => s.theme);
  const storeCal = useAppStore((s) => s.calendarMode);
  const storeDigits = useAppStore((s) => s.persianDigits);
  useEffect(() => {
    if (!s) return;
    if (s.theme !== storeTheme || s.calendarMode !== storeCal || s.persianDigits !== storeDigits) {
      // store is source of truth for these
    }
  }, [storeTheme, storeCal, storeDigits, s]);
  return s;
}

// All trades, optionally filtered by profile
export function useTrades(profileId: string | "all"): Trade[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.trades.toArray();
      return all.sort((a, b) => (b.openedAt ?? b.createdAt) - (a.openedAt ?? a.createdAt));
    }
    const items = await db.trades.where("profileId").equals(profileId).toArray();
    return items.sort((a, b) => (b.openedAt ?? b.createdAt) - (a.openedAt ?? a.createdAt));
  }, [profileId]);
}

export function useBacktests(profileId: string | "all"): BacktestTrade[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.backtests.toArray();
      return all.sort((a, b) => b.date - a.date);
    }
    const items = await db.backtests.where("profileId").equals(profileId).toArray();
    return items.sort((a, b) => b.date - a.date);
  }, [profileId]);
}

// CRUD helpers
export async function saveTrade(trade: Trade) {
  await db.trades.put(trade);
}
export async function deleteTrade(id: string) {
  await db.trades.delete(id);
}
export async function saveBacktest(bt: BacktestTrade) {
  await db.backtests.put(bt);
}
export async function deleteBacktest(id: string) {
  await db.backtests.delete(id);
}
export async function saveProfile(p: Profile) {
  await db.profiles.put(p);
}
export async function deleteProfile(id: string) {
  await db.profiles.delete(id);
  await db.trades.where("profileId").equals(id).delete();
  await db.backtests.where("profileId").equals(id).delete();
  await db.practiceTasks.where("profileId").equals(id).delete();
  await db.habits.where("profileId").equals(id).delete();
  await db.habitEntries.where("profileId").equals(id).delete();
  await db.todos.where("profileId").equals(id).delete();
}

export async function exportAllData() {
  const [profiles, trades, backtests, settings, dailyJournals, mentorHistory, conversations, chatMessages, mentorRules, practiceTasks, habits, habitEntries, todos] = await Promise.all([
    db.profiles.toArray(),
    db.trades.toArray(),
    db.backtests.toArray(),
    db.settings.toArray(),
    db.dailyJournals.toArray(),
    db.mentorHistory.toArray(),
    db.conversations.toArray(),
    db.chatMessages.toArray(),
    db.mentorRules.toArray(),
    db.practiceTasks.toArray(),
    db.habits.toArray(),
    db.habitEntries.toArray(),
    db.todos.toArray(),
  ]);
  return { profiles, trades, backtests, settings, dailyJournals, mentorHistory, conversations, chatMessages, mentorRules, practiceTasks, habits, habitEntries, todos, exportedAt: Date.now(), version: 7 };
}

export async function importAllData(data: any) {
  if (!data || !data.profiles) throw new Error("داده نامعتبر");
  const tables = [db.profiles, db.trades, db.backtests, db.settings, db.dailyJournals, db.mentorHistory, db.conversations, db.chatMessages, db.mentorRules, db.practiceTasks, db.habits, db.habitEntries, db.todos];
  await db.transaction("rw", tables, async () => {
    if (data.profiles) await db.profiles.bulkPut(data.profiles);
    if (data.trades) await db.trades.bulkPut(data.trades);
    if (data.backtests) await db.backtests.bulkPut(data.backtests);
    if (data.settings) await db.settings.bulkPut(data.settings);
    if (data.dailyJournals) await db.dailyJournals.bulkPut(data.dailyJournals);
    if (data.mentorHistory) await db.mentorHistory.bulkPut(data.mentorHistory);
    if (data.conversations) await db.conversations.bulkPut(data.conversations);
    if (data.chatMessages) await db.chatMessages.bulkPut(data.chatMessages);
    if (data.mentorRules) await db.mentorRules.bulkPut(data.mentorRules);
    if (data.practiceTasks) await db.practiceTasks.bulkPut(data.practiceTasks);
    if (data.habits) await db.habits.bulkPut(data.habits);
    if (data.habitEntries) await db.habitEntries.bulkPut(data.habitEntries);
    if (data.todos) await db.todos.bulkPut(data.todos);
  });
  // old (v5) backups: convert re-imported legacy practice rows into habits/entries
  await migratePracticeToHabits();
}

export async function clearAllData() {
  await db.trades.clear();
  await db.backtests.clear();
  await db.profiles.clear();
  await db.dailyJournals.clear();
  await db.mentorHistory.clear();
  await db.conversations.clear();
  await db.chatMessages.clear();
  await db.mentorRules.clear();
  await db.practiceTasks.clear();
  await db.habits.clear();
  await db.habitEntries.clear();
  await db.todos.clear();
}

// ---------- Daily Journal CRUD ----------
export function useDailyJournals(profileId: string | "all") {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.dailyJournals.toArray();
      return all.sort((a, b) => b.date - a.date);
    }
    const items = await db.dailyJournals
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => b.date - a.date);
  }, [profileId]);
}

export async function saveDailyJournal(j: DailyJournal) {
  await db.dailyJournals.put(j);
}
export async function deleteDailyJournal(id: string) {
  await db.dailyJournals.delete(id);
}

// ---------- Mentor History CRUD ----------
export function useMentorHistory(profileId: string | "all") {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.mentorHistory.toArray();
      return all.sort((a, b) => b.createdAt - a.createdAt);
    }
    const items = await db.mentorHistory
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [profileId]);
}

export async function saveMentorHistory(h: MentorHistory) {
  await db.mentorHistory.put(h);
}
export async function deleteMentorHistory(id: string) {
  await db.mentorHistory.delete(id);
}
export async function clearMentorHistory(profileId?: string) {
  if (profileId && profileId !== "all") {
    await db.mentorHistory.where("profileId").equals(profileId).delete();
  } else {
    await db.mentorHistory.clear();
  }
}

// ---------- Sample data seeding (for testing/preview) ----------
export async function seedSampleData(liveProfileId: string): Promise<{ trades: number; journals: number; practices: number; todos: number }> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const setups = [
    "liquidity-grab", "inducement-small", "bos-continuation",
    "mitigation", "order-block", "equal-highs-lows", "trendline-liquidity",
  ];
  const sessions: TradingSession[] = ["asia", "london", "newyork", "london-nyc"];
  const timeframes = ["M5", "M15", "M15", "H1", "H1", "H4"];
  const symbols = ["XAUUSD", "XAUUSD", "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "NAS100"];
  const biases = ["bullish", "bearish", "ranging"];
  const confirms = ["bos", "choch", "mitigation", "fvg"];
  const mistakes: string[][] = [
    [], [], [], ["fomo"], ["revenge"], ["no-htf-check"], ["moved-stop"], ["early-exit"],
  ];
  const theses = [
    "بایاس H4 صعودیه. لیکوییدیتی زیر ۲۳۴۵ مشخصه. انتظار القای کوچک و بعد BOS صعودی برای ورود.",
    "تاپ‌دان نزولیه. اکوال لوز پایین گرفته شده. منتظر sweep و برگشت با CHoCH.",
    "روند صعودی قوی، pullback به اوردر بلاک H1. ورود با تایید mitigation.",
    "رنج مارکت. بدون تز واضح، صبر می‌کنم تا ساختار مشخص بشه.",
    "BOS نزولی H4. mitigated شد. انتظار ادامه‌ی نزول با هدف لیکوییدیتی پایین‌تر.",
    "FVG پر نشده. بایاس خنثیه. ورود محافظه‌کارانه با ریسک کم.",
    "خط روند نزولی شکسته شده و retest میشه. بایاس به صعودی تغییر کرد.",
    "القای بزرگ دیده میشه — احتمال تغییر روند. صبر می‌کنم تا تایید بشه.",
  ];

  const trades: Trade[] = [];
  // generate ~28 trades over the last 45 days, realistic distribution
  for (let i = 0; i < 28; i++) {
    const daysAgo = Math.floor(Math.random() * 45) + 1;
    const openedAt = now - daysAgo * day - Math.floor(Math.random() * 8 * 3600000);
    const direction: Direction = Math.random() > 0.5 ? "long" : "short";
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const base = symbol === "XAUUSD" ? 2350 : symbol === "BTCUSD" ? 62000 : symbol === "NAS100" ? 18000 : 1.08;
    const entry = base + (Math.random() - 0.5) * base * 0.01;
    const riskDist = base * (0.002 + Math.random() * 0.003);
    const stop = direction === "long" ? entry - riskDist : entry + riskDist;
    const isWin = Math.random() > 0.42; // ~58% win rate
    const rMultiple = isWin ? [1, 1.5, 2, 2, 2.5, 3, 1, 1.5][Math.floor(Math.random() * 8)] : -[1, 1, 1, 0.8, 1.2][Math.floor(Math.random() * 5)];
    const exit = direction === "long" ? entry + riskDist * rMultiple : entry - riskDist * rMultiple;
    const outcome: Outcome = isWin ? "win" : "loss";
    const session = sessions[Math.floor(Math.random() * sessions.length)];
    const setup = setups[Math.floor(Math.random() * setups.length)];
    const hasThesis = Math.random() > 0.15;
    const id = uid();
    trades.push({
      id,
      profileId: liveProfileId,
      openedAt,
      closedAt: openedAt + (1 + Math.floor(Math.random() * 180)) * 60000,
      symbol,
      direction,
      entry: Number(entry.toFixed(symbol === "XAUUSD" ? 2 : 4)),
      stop: Number(stop.toFixed(symbol === "XAUUSD" ? 2 : 4)),
      target: null,
      exit: Number(exit.toFixed(symbol === "XAUUSD" ? 2 : 4)),
      resultR: Number(rMultiple.toFixed(2)),
      pnlPercent: Number((rMultiple * (0.8 + Math.random() * 0.6)).toFixed(2)),
      riskPercent: Math.random() > 0.85 ? 2 : 1,
      outcome,
      thesis: hasThesis ? theses[Math.floor(Math.random() * theses.length)] : "",
      setup,
      session,
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      htfBias: biases[Math.floor(Math.random() * biases.length)],
      ltfConfirmation: confirms[Math.floor(Math.random() * confirms.length)],
      inducement: Math.random() > 0.7 ? "large" : Math.random() > 0.3 ? "small" : "none",
      biasConflictConsidered: Math.random() > 0.25,
      postNote: isWin ? "طبق پلن اجرا شد." : Math.random() > 0.5 ? "زود وارد شدم." : "",
      lessons: "",
      mistakeTags: mistakes[Math.floor(Math.random() * mistakes.length)],
      tags: [],
      chartImage: null,
      createdAt: openedAt,
      updatedAt: openedAt,
    });
  }
  await db.trades.bulkPut(trades);

  // seed a few daily journals
  const moods: DailyJournal["mood"][] = ["calm", "confident", "anxious", "frustrated", "neutral"];
  const journals: DailyJournal[] = [];
  for (let i = 0; i < 8; i++) {
    const daysAgo = i * 4 + 2;
    const date = now - daysAgo * day;
    journals.push({
      id: uid(),
      profileId: liveProfileId,
      date,
      mood: moods[Math.floor(Math.random() * moods.length)],
      bias: biases[Math.floor(Math.random() * biases.length)] as DailyJournal["bias"],
      preMarketNotes: "بازار احتمالاً در سشن لندن حرکت داره. روی XAUUSD تمرکز می‌کنم.",
      marketObservations: "لیکوییدیتی زیر قیمت جمع شده. منتظر القا هستم.",
      keyLevels: "حمایت: ۲۳۴۵ / مقاومت: ۲۳۶۰",
      mistakesToday: Math.random() > 0.5 ? "زود وارد شدم، باید تایید رو بیشتر صبر می‌کردم." : "",
      gratitude: "یه روز خوب بود، به پلن پایبند بودم.",
      createdAt: date,
      updatedAt: date,
    });
  }
  await db.dailyJournals.bulkPut(journals);

  // seed habit-tracker data: default habits (if the profile has none) + ~12 recent check-ins
  const habitNotes: Record<string, string[]> = {
    marking: [
      "مارک‌گذاری سشن آسیا روی XAUUSD — نیم‌دیوار و چک‌پوینت‌های لیکوییدیتی مشخص شد",
      "لیکوییدیتی زیر اکوال لوز EURUSD پیدا و مارک شد — منتظر القا در لندن",
    ],
    backtest: [
      "بک‌تست ست‌آپ liquidity-grab روی دیتای تاریخی XAUUSD — ۶ حالت از ۸ وسته",
      "بک‌تست mitigation روی M15 EURUSD — نتیجه: بهتره بعد از CHoCH صبر کنم",
    ],
    tradeReview: [
      "مرور ترید امروز — تایید ورود زودتر از پلن انجام شد، ریسک درست بود",
      "بازبینی ترید هفته‌ی پیش — خروج زود از نصف پوزیشن، پلن اجرا نشد",
    ],
    lightStudy: [
      "مطالعه‌ی کوتاه مبحث القا (inducement) — تفاوت القای کوچک و بزرگ",
      "مرور چک‌لیست قبل از ورود — دو موردش رو معمولاً رعایت نمی‌کردم",
    ],
  };
  let existing = await db.habits.where("profileId").equals(liveProfileId).toArray();
  if (existing.length === 0) {
    const seeded = buildDefaultHabits(liveProfileId);
    await db.habits.bulkPut(seeded);
    existing = seeded;
  }
  const habitByKey = new Map(existing.map((h) => [h.id.split("-").pop() ?? "", h]));
  const entries: HabitEntry[] = [];
  const seedKeys = ["marking", "backtest", "tradeReview", "lightStudy"];
  for (let i = 0; i < 12; i++) {
    const daysAgo = i; // 0..11 → guarantees a current streak
    const key = seedKeys[i % 4];
    const habit = habitByKey.get(key);
    if (!habit) continue;
    const notes = habitNotes[key];
    entries.push({
      id: uid(),
      profileId: liveProfileId,
      habitId: habit.id,
      date: startOfDay(now - daysAgo * day),
      note: notes[Math.floor(Math.random() * notes.length)],
      linkedTradeId: key === "tradeReview" && trades.length > 0 ? trades[i % trades.length].id : null,
      createdAt: now - daysAgo * day + 3600000,
    });
  }
  await db.habitEntries.bulkPut(entries);

  // seed life-OS todos: 2 for today (1 open + 1 done) + 2 longterm goals
  const todoSeeds: Todo[] = [
    {
      id: uid(), profileId: liveProfileId, scope: "today",
      text: "۲۰ دقیقه شنا", note: "استخر محله",
      done: false, date: startOfDay(now), targetDate: null, reminderTime: "07:30",
      doneAt: null, createdAt: now - 2 * 3600000, updatedAt: now - 2 * 3600000,
    },
    {
      id: uid(), profileId: liveProfileId, scope: "today",
      text: "مرور چک‌لیست ورود قبل از سشن لندن", note: "",
      done: true, date: startOfDay(now), targetDate: null, reminderTime: null,
      doneAt: now - 3600000, createdAt: now - 5 * 3600000, updatedAt: now - 3600000,
    },
    {
      id: uid(), profileId: liveProfileId, scope: "today",
      text: "نوشتن خلاصه‌ی روز در ژورنال", note: "",
      done: false, date: startOfDay(now - day), targetDate: null, reminderTime: null,
      doneAt: null, createdAt: now - day, updatedAt: now - day,
    },
    {
      id: uid(), profileId: liveProfileId, scope: "longterm",
      text: "خوندن کتاب Disciplina", note: "روزی ۱۰ صفحه",
      done: false, date: startOfDay(now), targetDate: startOfDay(now + 21 * day), reminderTime: null,
      doneAt: null, createdAt: now - 3 * day, updatedAt: now - 3 * day,
    },
    {
      id: uid(), profileId: liveProfileId, scope: "longterm",
      text: "راه‌اندازی روتین صبحگاهی پایدار", note: "",
      done: false, date: startOfDay(now), targetDate: null, reminderTime: null,
      doneAt: null, createdAt: now - 6 * day, updatedAt: now - 6 * day,
    },
  ];
  await db.todos.bulkPut(todoSeeds);

  return { trades: trades.length, journals: journals.length, practices: entries.length, todos: todoSeeds.length };
}

// ---------- Chat System CRUD ----------

export function useConversations(profileId: string | "all") {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.conversations.toArray();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    const items = await db.conversations.where("profileId").equals(profileId).toArray();
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [profileId]);
}

export function useChatMessages(conversationId: string | null) {
  return useLiveQuery(async () => {
    if (!conversationId) return [];
    const msgs = await db.chatMessages.where("conversationId").equals(conversationId).toArray();
    return msgs.sort((a, b) => a.createdAt - b.createdAt);
  }, [conversationId]);
}

export async function createConversation(profileId: string | "all", title: string): Promise<string> {
  const id = uid();
  const now = Date.now();
  await db.conversations.put({
    id,
    profileId,
    title: title.slice(0, 60) || "گفتگو جدید",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  });
  return id;
}

export async function saveChatMessage(msg: ChatMessage) {
  await db.chatMessages.put(msg);
  // update conversation timestamp + count
  const conv = await db.conversations.get(msg.conversationId);
  if (conv) {
    await db.conversations.put({
      ...conv,
      updatedAt: Date.now(),
      messageCount: conv.messageCount + 1,
    });
  }
}

export async function deleteConversation(id: string) {
  await db.chatMessages.where("conversationId").equals(id).delete();
  await db.conversations.delete(id);
}

export async function renameConversation(id: string, title: string) {
  const conv = await db.conversations.get(id);
  if (conv) {
    await db.conversations.put({ ...conv, title: title.slice(0, 60) });
  }
}

// ---------- Mentor Rules (learning) ----------

export function useMentorRules() {
  return useLiveQuery(async () => {
    const rules = await db.mentorRules.toArray();
    return rules.sort((a, b) => b.createdAt - a.createdAt);
  }, []);
}

export async function saveMentorRule(rule: MentorRule) {
  await db.mentorRules.put(rule);
}

export async function deleteMentorRule(id: string) {
  await db.mentorRules.delete(id);
}

export async function getAllRules(): Promise<MentorRule[]> {
  return db.mentorRules.toArray();
}

// ---------- Practice Tasks CRUD (LEGACY — kept for old-backup compat) ----------
export function usePracticeTasks(profileId: string | "all"): PracticeTask[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.practiceTasks.toArray();
      return all.sort((a, b) => b.date - a.date);
    }
    const items = await db.practiceTasks
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => b.date - a.date);
  }, [profileId]);
}

// ---------- Habits CRUD ----------
export function useHabits(profileId: string | "all"): Habit[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.habits.toArray();
      return all.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
    }
    const items = await db.habits
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }, [profileId]);
}

export function useHabitEntries(profileId: string | "all"): HabitEntry[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.habitEntries.toArray();
      return all.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
    }
    const items = await db.habitEntries
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  }, [profileId]);
}

export async function saveHabit(h: Habit) {
  await db.habits.put(h);
}

/** Deletes a habit AND all of its check-ins (prompt-level confirm lives in the UI). */
export async function deleteHabit(id: string) {
  await db.habitEntries.where("habitId").equals(id).delete();
  await db.habits.delete(id);
}

export async function setHabitArchived(id: string, archived: boolean) {
  const h = await db.habits.get(id);
  if (h) await db.habits.put({ ...h, archived, updatedAt: Date.now() });
}

export async function saveHabitEntry(e: HabitEntry) {
  await db.habitEntries.put(e);
}

export async function deleteHabitEntry(id: string) {
  await db.habitEntries.delete(id);
}

/**
 * Toggle one habit-day check-in. Returns the created entry (checked in) or null
 * when it un-checked (entry removed). Fast path for the tap-to-complete button.
 */
export async function toggleHabitDay(habit: Habit, dayTs: number): Promise<HabitEntry | null> {
  const day = startOfDay(dayTs);
  const existing = await db.habitEntries
    .where("habitId")
    .equals(habit.id)
    .filter((e) => dayKeyOf(e.date) === dayKeyOf(day))
    .toArray();
  if (existing.length > 0) {
    await db.habitEntries.bulkDelete(existing.map((e) => e.id));
    return null;
  }
  const entry: HabitEntry = {
    id: uid(),
    profileId: habit.profileId,
    habitId: habit.id,
    date: day,
    note: "",
    linkedTradeId: null,
    createdAt: Date.now(),
  };
  await db.habitEntries.put(entry);
  return entry;
}

/**
 * Create-or-update a check-in (habit + day are unique together).
 * Returns the entry id and whether it was newly created (for toasts).
 */
export async function upsertHabitEntry(
  habit: Habit,
  dayTs: number,
  note: string,
  linkedTradeId: string | null
): Promise<{ id: string; created: boolean }> {
  const day = startOfDay(dayTs);
  const existing = await db.habitEntries
    .where("habitId")
    .equals(habit.id)
    .filter((e) => dayKeyOf(e.date) === dayKeyOf(day))
    .toArray();
  if (existing.length > 0) {
    const e = existing[0];
    await db.habitEntries.put({ ...e, note, linkedTradeId, date: day });
    return { id: e.id, created: false };
  }
  const id = uid();
  await db.habitEntries.put({
    id,
    profileId: habit.profileId,
    habitId: habit.id,
    date: day,
    note,
    linkedTradeId,
    createdAt: Date.now(),
  });
  return { id, created: true };
}

/** Find the single check-in of a habit on a day (if any). */
export async function findHabitEntry(habitId: string, dayTs: number): Promise<HabitEntry | null> {
  const day = startOfDay(dayTs);
  const existing = await db.habitEntries
    .where("habitId")
    .equals(habitId)
    .filter((e) => dayKeyOf(e.date) === dayKeyOf(day))
    .toArray();
  return existing[0] ?? null;
}

/** Fetch one check-in by id (edit dialog). */
export async function getHabitEntryById(id: string): Promise<HabitEntry | null> {
  return (await db.habitEntries.get(id)) ?? null;
}

// Clear all practice data of one profile (settings) — habits + entries + todos + legacy rows.
// Returns the number of deleted check-ins.
export async function clearPracticeData(profileId: string): Promise<{ entries: number; todos: number }> {
  const [eKeys, hKeys, tKeys] = await Promise.all([
    db.habitEntries.where("profileId").equals(profileId).primaryKeys(),
    db.habits.where("profileId").equals(profileId).primaryKeys(),
    db.todos.where("profileId").equals(profileId).primaryKeys(),
  ]);
  await db.habitEntries.bulkDelete(eKeys);
  await db.habits.bulkDelete(hKeys);
  await db.todos.bulkDelete(tKeys);
  await db.practiceTasks.where("profileId").equals(profileId).delete();
  return { entries: eKeys.length, todos: tKeys.length };
}

// ---------- Life-OS Todos CRUD ----------
export function useTodos(profileId: string | "all"): Todo[] | undefined {
  return useLiveQuery(async () => {
    if (profileId === "all") {
      const all = await db.todos.toArray();
      return all.sort((a, b) => a.createdAt - b.createdAt);
    }
    const items = await db.todos
      .where("profileId")
      .equals(profileId)
      .toArray();
    return items.sort((a, b) => a.createdAt - b.createdAt);
  }, [profileId]);
}

export async function saveTodo(t: Todo) {
  await db.todos.put(t);
}

export async function deleteTodo(id: string) {
  await db.todos.delete(id);
}

/** Toggle a to-do's done flag. Returns the updated row (for undo toasts). */
export async function toggleTodo(t: Todo): Promise<Todo> {
  const next: Todo = { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null, updatedAt: Date.now() };
  await db.todos.put(next);
  return next;
}

/** Move a longterm goal into today's list (scope switch, date reset to today). */
export async function moveTodoToToday(t: Todo): Promise<Todo> {
  const next: Todo = { ...t, scope: "today", date: startOfDay(Date.now()), done: false, doneAt: null, updatedAt: Date.now() };
  await db.todos.put(next);
  return next;
}
