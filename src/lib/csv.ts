import type { Trade, BacktestTrade, Habit, HabitEntry } from "@/lib/types";
import { SETUP_LABELS, SESSION_LABELS, MISTAKE_LABELS } from "@/lib/constants";
import moment from "jalali-moment";

// Build CSV from trades — spreadsheet-friendly format with Persian labels
export function tradesToCSV(trades: Trade[]): string {
  const headers = [
    "تاریخ",
    "نماد",
    "جهت",
    "ورود",
    "حد ضرر",
    "هدف",
    "خروج",
    "نتیجه (R)",
    "سود/ضرر (٪)",
    "ریسک (٪)",
    "وضعیت",
    "ست‌آپ",
    "سشن",
    "تایم‌فریم",
    "بایاس HTF",
    "تایید ورود",
    "القا",
    "دیدگاه مخالف",
    "تز",
    "یادداشت پس",
    "درس",
    "اشتباهات",
    "برچسب‌ها",
  ];

  const rows = trades.map((t) => {
    const outcomeMap = { win: "برد", loss: "باخت", breakeven: "بدون تغییر", open: "باز" };
    const dirMap = { long: "خرید", short: "فروش" };
    return [
      moment(t.openedAt).format("YYYY-MM-DD HH:mm"),
      t.symbol,
      dirMap[t.direction] ?? t.direction,
      t.entry || "",
      t.stop || "",
      t.target ?? "",
      t.exit ?? "",
      t.resultR ?? "",
      t.pnlPercent ?? "",
      t.riskPercent ?? "",
      outcomeMap[t.outcome] ?? t.outcome,
      SETUP_LABELS[t.setup] ?? t.setup,
      SESSION_LABELS[t.session] ?? t.session,
      t.timeframe,
      t.htfBias,
      t.ltfConfirmation,
      t.inducement,
      t.biasConflictConsidered ? "بله" : "خیر",
      escapeCSV(t.thesis),
      escapeCSV(t.postNote),
      escapeCSV(t.lessons),
      escapeCSV((t.mistakeTags ?? []).map((m) => MISTAKE_LABELS[m] ?? m).join("; ")),
      escapeCSV((t.tags ?? []).join("; ")),
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function backtestsToCSV(items: BacktestTrade[]): string {
  const headers = [
    "تاریخ",
    "نماد",
    "جهت",
    "ورود",
    "حد ضرر",
    "خروج",
    "نتیجه (R)",
    "سود/ضرر (٪)",
    "وضعیت",
    "ست‌آپ",
    "سشن",
    "تایم‌فریم",
    "بایاس HTF",
    "تز",
    "یادداشت پس",
    "درس",
    "اشتباهات",
    "برچسب‌ها",
  ];

  const rows = items.map((t) => {
    const outcomeMap = { win: "برد", loss: "باخت", breakeven: "بدون تغییر", open: "باز" };
    const dirMap = { long: "خرید", short: "فروش" };
    return [
      moment(t.date).format("YYYY-MM-DD"),
      t.symbol,
      dirMap[t.direction] ?? t.direction,
      t.entry || "",
      t.stop || "",
      t.exit ?? "",
      t.resultR ?? "",
      t.pnlPercent ?? "",
      outcomeMap[t.outcome] ?? t.outcome,
      SETUP_LABELS[t.setup] ?? t.setup,
      SESSION_LABELS[t.session] ?? t.session,
      t.timeframe,
      t.htfBias,
      escapeCSV(t.thesis),
      escapeCSV(t.postNote),
      escapeCSV(t.lessons),
      escapeCSV((t.mistakeTags ?? []).map((m) => MISTAKE_LABELS[m] ?? m).join("; ")),
      escapeCSV((t.tags ?? []).join("; ")),
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

// Build CSV from habit check-ins — spreadsheet-friendly with Persian labels
export function habitEntriesToCSV(items: HabitEntry[], habits: Habit[]): string {
  const habitName = new Map(habits.map((h) => [h.id, h.name]));
  const headers = [
    "تاریخ",
    "عادت",
    "یادداشت",
    "ترید مرتبط",
  ];

  const rows = items.map((e) => {
    return [
      moment(e.date).format("YYYY-MM-DD"),
      habitName.get(e.habitId) ?? e.habitId,
      escapeCSV(e.note),
      e.linkedTradeId ?? "",
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function escapeCSV(s: string): string {
  if (!s) return "";
  // OWASP CSV-injection mitigation: neutralize formula-leading characters in free-text
  // fields so spreadsheet apps can't execute them as formulas (=cmd, +1+2, -2+3, @SUM, …).
  // The "'" prefix is consumed as a text-escape marker by Excel and renders as plain text.
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function csvCell(value: string | number): string {
  const s = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Trigger a CSV file download in the browser
export function downloadCSV(csv: string, filename: string) {
  // BOM for Excel to detect UTF-8
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
