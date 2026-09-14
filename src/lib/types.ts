// Core domain types for Trading OS

export type ProfileType = "live" | "demo" | "backtest" | "prop";

export interface PropRules {
  dailyLossLimitPct: number; // max daily loss as % of starting balance
  maxOverallLossPct: number; // max overall/trailing drawdown %
  profitTargetPct: number; // profit target %
  maxDailyTrades: number;
  newsTradingAllowed: boolean;
  weekendHoldingAllowed: boolean;
  startingBalance: number;
  currentBalance: number;
  // tracking
  phase: "phase1" | "phase2" | "funded" | "evaluation";
  status: "active" | "passed" | "failed";
}

export interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  createdAt: number;
  propRules?: PropRules | null;
}

export type Direction = "long" | "short";
export type TradingSession = "asia" | "london" | "newyork" | "london-nyc" | "off-session";
export type Outcome = "win" | "loss" | "breakeven" | "open";

export interface Trade {
  id: string;
  profileId: string;
  // dates stored as ISO (gregorian) ms timestamps for accurate offline use
  openedAt: number; // entry time
  closedAt: number | null; // exit time, null if open
  symbol: string;
  direction: Direction;
  entry: number;
  stop: number;
  target: number | null;
  exit: number | null;
  resultR: number | null; // e.g. 2.0, -1.0
  pnlPercent: number | null;
  riskPercent: number; // risk per trade % of account
  outcome: Outcome;
  // LIT methodology fields
  thesis: string; // pre-trade thesis (strongly encouraged)
  setup: string; // setup tag
  session: TradingSession;
  timeframe: string;
  htfBias: string; // higher timeframe bias
  ltfConfirmation: string; // BOS / mitigation / etc
  inducement: "none" | "small" | "large";
  biasConflictConsidered: boolean;
  postNote: string; // post-trade review
  lessons: string;
  mistakeTags: string[];
  tags: string[];
  chartImage: string | null; // dataURL
  createdAt: number;
  updatedAt: number;
}

export interface BacktestTrade {
  id: string;
  profileId: string;
  date: number;
  symbol: string;
  direction: Direction;
  entry: number;
  stop: number;
  target: number | null;
  exit: number | null;
  resultR: number | null;
  pnlPercent: number | null;
  outcome: Outcome;
  thesis: string;
  setup: string;
  session: TradingSession;
  timeframe: string;
  htfBias: string;
  postNote: string;
  lessons: string;
  tags: string[];
  mistakeTags: string[];
  chartImage: string | null;
  createdAt: number;
}

export interface Settings {
  id: string; // singleton 'app'
  theme: "dark" | "light";
  defaultRiskPercent: number;
  persianDigits: boolean;
  calendarMode: "jalali" | "gregorian";
}

export interface Stats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  open: number;
  winRate: number;
  netR: number;
  avgWinR: number;
  avgLossR: number;
  largestWinR: number;
  largestLossR: number;
  expectancy: number;
  profitFactor: number;
  totalPnl: number;
  bestStreak: number;
  worstStreak: number;
  currentStreak: number; // positive = win streak, negative = loss streak
  avgRiskPercent: number;
  equityCurve: { index: number; r: number; cumulative: number; date: number }[];
  bySession: Record<string, { count: number; netR: number; winRate: number }>;
  bySetup: Record<string, { count: number; netR: number; winRate: number }>;
  byDirection: Record<string, { count: number; netR: number; winRate: number }>;
  byTimeframe: Record<string, { count: number; netR: number; winRate: number }>;
  mistakeFrequency: { tag: string; count: number; netR: number }[];
  noThesisCount: number;
  noThesisNetR: number;
  revengeTrades: number; // trades shortly after a loss
}

export interface MentorAnalysis {
  summary: string;
  patterns: {
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
    evidence: string;
    confidence?: "high" | "medium" | "low";
    tradeIds?: string[];
    evidenceMetrics?: Record<string, number | string>;
  }[];
  strengths: string[];
  recommendations: {
    action: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
    confidence?: "high" | "medium" | "low";
    relatedTradeIds?: string[];
  }[];
  confidence_note: string;
}

// Daily market journal — separate from trades. Pre-market prep, observations, mood.
export interface DailyJournal {
  id: string;
  profileId: string | "all";
  date: number; // the day this note is for (noon UTC of that day)
  mood: "calm" | "confident" | "anxious" | "frustrated" | "neutral";
  bias: "bullish" | "bearish" | "ranging" | "neutral";
  preMarketNotes: string;
  marketObservations: string;
  keyLevels: string;
  mistakesToday: string;
  gratitude: string;
  createdAt: number;
  updatedAt: number;
}

// Saved mentor analyses — conversation history (legacy analysis mode)
export interface MentorHistory {
  id: string;
  profileId: string | "all";
  range: string;
  question: string | null;
  analysis: MentorAnalysis;
  rawText: string;
  tradeCount: number;
  createdAt: number;
}

// ===== Chat system =====
export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  // metadata: did this message include trade data context?
  hasTradeContext?: boolean;
  // for assistant messages: was it an analysis (JSON) or free chat?
  kind?: "chat" | "analysis";
}

export interface Conversation {
  id: string;
  profileId: string | "all";
  title: string; // auto-generated from first user message
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

// User-defined rules/preferences that the mentor learns over time
export interface MentorRule {
  id: string;
  rule: string;       // the rule text in Persian
  category: "risk" | "setup" | "psychology" | "session" | "general";
  createdAt: number;
  source: "manual" | "learned"; // manually added or extracted from chat
}

// Daily practice tasks — LEGACY model (v5). Kept ONLY so old backups import and
// the one-time migration `migratePracticeToHabits()` can convert rows losslessly.
// No new rows are ever written to it; see Habit / HabitEntry below.
export type PracticeCategory = "marking" | "backtest" | "tradeReview" | "lightStudy";

export interface PracticeTask {
  id: string;
  profileId: string;
  date: number; // the day this practice belongs to (epoch ms, local midnight like dailyJournals)
  category: PracticeCategory;
  note: string; // short outcome/result text
  linkedTradeId?: string | null; // optional link to an existing trade (trade review only)
  createdAt: number;
}

// ===== Habit tracker (replaces the fixed-category practice model) =====
// How often a habit is scheduled.
export type HabitFrequency =
  | { type: "daily" }
  | { type: "weekdays"; weekdays: number[] } // JS getDay(): 0=Sun … 6=Sat
  | { type: "timesPerWeek"; timesPerWeek: number }; // flexible weekly target

export type HabitColorKey =
  | "gold" | "violet" | "sky" | "emerald" | "rose" | "amber" | "teal" | "fuchsia";

export interface Habit {
  id: string;
  profileId: string;
  name: string;
  icon: string; // key into HABIT_ICONS (lucide)
  color: HabitColorKey; // key into HABIT_COLORS (neon palette)
  note: string; // short optional description
  frequency: HabitFrequency;
  reminderTime: string | null; // "HH:MM" — schema-ready only, no notification logic yet
  archived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

// One check-in of one habit on one day (local-midnight date).
export interface HabitEntry {
  id: string;
  profileId: string;
  habitId: string;
  date: number; // epoch ms, local midnight of the day it belongs to
  note: string; // optional short note on this check-in
  linkedTradeId?: string | null; // optional link to a trade (carried over from legacy practice)
  createdAt: number;
}

// ===== Life-OS to-dos (growth section) =====
// "today" = one-off daily tasks (rollover until done), "longterm" = open-ended goals.
export type TodoScope = "today" | "longterm";

export interface Todo {
  id: string;
  profileId: string;
  scope: TodoScope;
  text: string;
  note: string;
  done: boolean;
  date: number; // local midnight — the day a "today" todo belongs to (creation day; older = overdue)
  targetDate: number | null; // optional deadline for longterm goals (local midnight)
  reminderTime: string | null; // "HH:MM" — schema-ready only, no notification logic yet
  doneAt: number | null;
  createdAt: number;
  updatedAt: number;
}
