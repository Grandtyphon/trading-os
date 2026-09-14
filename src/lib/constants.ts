// Domain constants — LIT methodology aligned

export const TRADING_SESSIONS = [
  { value: "asia", label: "آسیا", labelEn: "Asia", time: "۰۰:۰۰–۰۹:۰۰ UTC" },
  { value: "london", label: "لندن", labelEn: "London", time: "۰۷:۰۰–۱۶:۰۰ UTC" },
  { value: "newyork", label: "نیویورک", labelEn: "New York", time: "۱۲:۰۰–۲۱:۰۰ UTC" },
  { value: "london-nyc", label: "هم‌پوشانی", labelEn: "London/NYC", time: "۱۲:۰۰–۱۶:۰۰ UTC" },
  { value: "off-session", label: "خارج سشن", labelEn: "Off-session", time: "—" },
] as const;

export const SETUP_OPTIONS = [
  { value: "liquidity-grab", label: "گراب لیکوییدیتی" },
  { value: "inducement-small", label: "القا کوچک (شارژ)" },
  { value: "inducement-large", label: "القا بزرگ (تغییر روند)" },
  { value: "bos-continuation", label: "BOS ادامه‌دهنده" },
  { value: "bos-reversal", label: "BOS بازگشتی" },
  { value: "mitigation", label: "Mitigation / بازگشت به مبدا" },
  { value: "fvg-fill", label: "پر شدن FVG" },
  { value: "order-block", label: "اوردر بلاک" },
  { value: "equal-highs-lows", label: "اکوال های/لوز" },
  { value: "trendline-liquidity", label: "لیکوییدیتی خط روند" },
  { value: "other", label: "سایر" },
] as const;

export const HTF_BIAS_OPTIONS = [
  { value: "bullish", label: "صعودی" },
  { value: "bearish", label: "نزولی" },
  { value: "ranging", label: "رنج" },
  { value: "transition", label: "در حال تغییر" },
] as const;

export const LTF_CONFIRMATION_OPTIONS = [
  { value: "bos", label: "BOS" },
  { value: "choch", label: "CHoCH" },
  { value: "mitigation", label: "Mitigation" },
  { value: "fvg", label: "FVG" },
  { value: "order-block", label: "Order Block" },
  { value: "liquidity-sweep", label: "Sweep" },
  { value: "none", label: "بدون تایید" },
] as const;

export const INDUCEMENT_OPTIONS = [
  { value: "none", label: "بدون القا" },
  { value: "small", label: "کوچک (شارژ لیکوییدیتی)" },
  { value: "large", label: "بزرگ (تغییر روند)" },
] as const;

export const TIMEFRAME_OPTIONS = [
  "M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1",
] as const;

export const MISTAKE_TAGS = [
  { value: "revenge", label: "ریونج ترید" },
  { value: "no-thesis", label: "بدون تز" },
  { value: "oversized-risk", label: "ریسک نامتناسب" },
  { value: "fomo", label: "FOMO / زود وارد شدن" },
  { value: "moved-stop", label: "جابجایی حد ضرر" },
  { value: "early-exit", label: "خروج زودهنگام" },
  { value: "late-entry", label: "ورود دیرهنگام" },
  { value: "no-htf-check", label: "بی‌محلی به بایاس تاپ‌دان" },
  { value: "against-bias", label: "خلاف بایاس" },
  { value: "overtrading", label: "اورتریدینگ" },
  { value: "no-confirm", label: "بدون تایید ورود" },
  { value: "size-too-small", label: "حجم کمتر از برنامه" },
] as const;

export const COMMON_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ETHUSD",
  "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "GBPJPY", "EURJPY",
  "US30", "NAS100", "SPX500", "GER40", "UK100",
] as const;

// Daily practice categories — LEGACY (pre-habit-tracker). Kept for the one-time
// migration + old-backup import; the live model is HABIT_ICONS/HABIT_COLORS/HABIT_SEEDS.
export const PRACTICE_CATEGORIES = [
  { value: "marking", label: "مارک‌گذاری", hint: "لیکوییدیتی مارک‌کردن چارت" },
  { value: "backtest", label: "بک‌تست", hint: "اجرای پلن روی دیتای تاریخی" },
  { value: "tradeReview", label: "مرور معامله", hint: "بازبینی یک ترید ثبت‌شده" },
  { value: "lightStudy", label: "آموزش سبک", hint: "مطالعه‌ی کوتاه و متمرکز" },
] as const;

export const PRACTICE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRACTICE_CATEGORIES.map((c) => [c.value, c.label])
);

// ===== Habit tracker =====
// Persian weekday labels ordered Saturday-first (display order).
// Value = JS getDay(): Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5.
export const WEEKDAY_LABELS: { value: number; label: string; short: string }[] = [
  { value: 6, label: "شنبه", short: "ش" },
  { value: 0, label: "یکشنبه", short: "ی" },
  { value: 1, label: "دوشنبه", short: "د" },
  { value: 2, label: "سه‌شنبه", short: "س" },
  { value: 3, label: "چهارشنبه", short: "چ" },
  { value: 4, label: "پنجشنبه", short: "پ" },
  { value: 5, label: "جمعه", short: "ج" },
];

// Neon palette — full literal class strings so Tailwind's scanner sees them.
export const HABIT_COLORS: Record<
  string,
  { label: string; text: string; bg: string; border: string; solid: string; solidText: string; heat: string; glow: string }
> = {
  gold: {
    label: "طلایی",
    text: "text-gold",
    bg: "bg-gold/10",
    border: "border-gold/30",
    solid: "bg-gold",
    solidText: "text-[#1a1408]",
    heat: "bg-[color-mix(in_oklab,var(--gold)_48%,transparent)]",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_35%,transparent)]",
  },
  violet: {
    label: "بنفش",
    text: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    solid: "bg-violet-500",
    solidText: "text-white",
    heat: "bg-violet-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#8b5cf6_35%,transparent)]",
  },
  sky: {
    label: "آبی روشن",
    text: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    solid: "bg-sky-500",
    solidText: "text-white",
    heat: "bg-sky-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#0ea5e9_35%,transparent)]",
  },
  emerald: {
    label: "سبز",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    solid: "bg-emerald-500",
    solidText: "text-white",
    heat: "bg-emerald-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#10b981_35%,transparent)]",
  },
  rose: {
    label: "سرخابی",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    solid: "bg-rose-500",
    solidText: "text-white",
    heat: "bg-rose-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#f43f5e_35%,transparent)]",
  },
  amber: {
    label: "کهربایی",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    solid: "bg-amber-500",
    solidText: "text-[#241703]",
    heat: "bg-amber-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#f59e0b_35%,transparent)]",
  },
  teal: {
    label: "فیروزه‌ای",
    text: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    solid: "bg-teal-500",
    solidText: "text-white",
    heat: "bg-teal-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#14b8a6_35%,transparent)]",
  },
  fuchsia: {
    label: "سرخابی تیره",
    text: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    solid: "bg-fuchsia-500",
    solidText: "text-white",
    heat: "bg-fuchsia-500/45",
    glow: "shadow-[0_0_14px_color-mix(in_oklab,#d946ef_35%,transparent)]",
  },
};

export const HABIT_COLOR_KEYS = Object.keys(HABIT_COLORS);

// The four LIT practice habits — seeded as editable habits (legacy categories 1:1).
// Deterministic ids make the legacy migration + seeding idempotent per profile.
export const HABIT_SEEDS = [
  { key: "marking", name: "مارک‌گذاری", icon: "PenTool", color: "gold" as const, note: "لیکوییدیتی مارک‌کردن چارت" },
  { key: "backtest", name: "بک‌تست", icon: "FlaskConical", color: "violet" as const, note: "اجرای پلن روی دیتای تاریخی" },
  { key: "tradeReview", name: "مرور معامله", icon: "Eye", color: "sky" as const, note: "بازبینی یک ترید ثبت‌شده" },
  { key: "lightStudy", name: "آموزش سبک", icon: "GraduationCap", color: "emerald" as const, note: "مطالعه‌ی کوتاه و متمرکز" },
] as const;

// Streak milestones celebrated per habit (days, or weeks for timesPerWeek habits)
export const HABIT_MILESTONES = [7, 14, 30, 60, 100];

export const PROFILE_TYPE_META = {
  live: { label: "لایو", labelEn: "Live", color: "emerald", desc: "حساب واقعی" },
  demo: { label: "دمو", labelEn: "Demo", color: "sky", desc: "حساب تمرینی" },
  backtest: { label: "بک‌تست", labelEn: "Backtest", color: "violet", desc: "تست استراتژی" },
  prop: { label: "پراپ", labelEn: "Prop Firm", color: "amber", desc: "چالش پراپ فرم" },
} as const;

/** Tailwind dot color per profile type — shared by the switcher and the command palette. */
export const PROFILE_TYPE_COLOR: Record<string, string> = {
  live: "bg-emerald-500",
  demo: "bg-sky-500",
  backtest: "bg-violet-500",
  prop: "bg-amber-500",
};

export const DEFAULT_PROFIT_TARGETS_R = [1, 1.5, 2, 3, 5] as const;

export const SEVERITY_META = {
  high: { label: "بحرانی", color: "rose" },
  medium: { label: "هشدار", color: "amber" },
  low: { label: "نکته", color: "sky" },
} as const;

export const PRIORITY_META = {
  high: { label: "اولویت بالا", color: "rose" },
  medium: { label: "اولویت متوسط", color: "amber" },
  low: { label: "اولویت کم", color: "sky" },
} as const;

// Label lookup maps (Persian) for CSV export and display
export const SETUP_LABELS: Record<string, string> = Object.fromEntries(
  SETUP_OPTIONS.map((s) => [s.value, s.label])
);
export const SESSION_LABELS: Record<string, string> = Object.fromEntries(
  TRADING_SESSIONS.map((s) => [s.value, s.label])
);
export const MISTAKE_LABELS: Record<string, string> = Object.fromEntries(
  MISTAKE_TAGS.map((m) => [m.value, m.label])
);
export const HTF_BIAS_LABELS: Record<string, string> = Object.fromEntries(
  HTF_BIAS_OPTIONS.map((s) => [s.value, s.label])
);
export const LTF_CONFIRMATION_LABELS: Record<string, string> = Object.fromEntries(
  LTF_CONFIRMATION_OPTIONS.map((s) => [s.value, s.label])
);
export const INDUCEMENT_LABELS: Record<string, string> = Object.fromEntries(
  INDUCEMENT_OPTIONS.map((s) => [s.value, s.label])
);
