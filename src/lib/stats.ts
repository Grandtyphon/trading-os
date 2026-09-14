import type { Trade, Stats, Outcome } from "./types";

const SESSION_LABELS: Record<string, string> = {
  asia: "آسیا",
  london: "لندن",
  newyork: "نیویورک",
  "london-nyc": "هم‌پوشانی",
  "off-session": "خارج سشن",
};

export function getSessionLabel(s: string): string {
  return SESSION_LABELS[s] ?? s;
}

// group trades by a key, returning per-group stats
function groupStats(trades: Trade[], keyFn: (t: Trade) => string) {
  const groups: Record<string, { count: number; netR: number; wins: number; losses: number }> = {};
  for (const t of trades) {
    const k = keyFn(t);
    if (!groups[k]) groups[k] = { count: 0, netR: 0, wins: 0, losses: 0 };
    groups[k].count++;
    const r = t.resultR ?? 0;
    groups[k].netR += r;
    if (t.outcome === "win") groups[k].wins++;
    else if (t.outcome === "loss") groups[k].losses++;
  }
  const out: Record<string, { count: number; netR: number; winRate: number }> = {};
  for (const [k, v] of Object.entries(groups)) {
    const decided = v.wins + v.losses;
    out[k] = {
      count: v.count,
      netR: Number(v.netR.toFixed(2)),
      winRate: decided > 0 ? Number(((v.wins / decided) * 100).toFixed(1)) : 0,
    };
  }
  return out;
}

export function computeStats(trades: Trade[]): Stats {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const sorted = [...closed].sort((a, b) => (a.openedAt ?? a.createdAt) - (b.openedAt ?? b.createdAt));

  const wins = sorted.filter((t) => t.outcome === "win");
  const losses = sorted.filter((t) => t.outcome === "loss");
  const breakeven = sorted.filter((t) => t.outcome === "breakeven");
  const open = trades.filter((t) => t.outcome === "open");

  const netR = sorted.reduce((s, t) => s + (t.resultR ?? 0), 0);
  const winSum = wins.reduce((s, t) => s + (t.resultR ?? 0), 0);
  const lossSum = losses.reduce((s, t) => s + (t.resultR ?? 0), 0);
  const avgWinR = wins.length ? winSum / wins.length : 0;
  const avgLossR = losses.length ? lossSum / losses.length : 0;
  const largestWinR = wins.length ? Math.max(...wins.map((t) => t.resultR ?? 0)) : 0;
  const largestLossR = losses.length ? Math.min(...losses.map((t) => t.resultR ?? 0)) : 0;
  const decided = wins.length + losses.length;
  const winRate = decided ? (wins.length / decided) * 100 : 0;
  const expectancy = decided ? netR / decided : 0;
  const profitFactor = lossSum !== 0 ? Math.abs(winSum / lossSum) : winSum > 0 ? Infinity : 0;
  const totalPnl = sorted.reduce((s, t) => s + (t.pnlPercent ?? 0), 0);

  // streaks
  let bestStreak = 0;
  let worstStreak = 0;
  let cur = 0;
  for (const t of sorted) {
    if (t.outcome === "win") {
      cur = cur > 0 ? cur + 1 : 1;
      bestStreak = Math.max(bestStreak, cur);
    } else if (t.outcome === "loss") {
      cur = cur < 0 ? cur - 1 : -1;
      worstStreak = Math.min(worstStreak, cur);
    } else {
      cur = 0;
    }
  }
  const currentStreak = cur;

  // equity curve (cumulative R)
  let cum = 0;
  const equityCurve = sorted.map((t, i) => {
    cum += t.resultR ?? 0;
    return { index: i + 1, r: Number((t.resultR ?? 0).toFixed(2)), cumulative: Number(cum.toFixed(2)), date: t.openedAt ?? t.createdAt };
  });

  const avgRiskPercent = sorted.length
    ? sorted.reduce((s, t) => s + (t.riskPercent ?? 0), 0) / sorted.length
    : 0;

  // mistake frequency
  const mistakeMap: Record<string, { count: number; netR: number }> = {};
  let noThesisCount = 0;
  let noThesisNetR = 0;
  for (const t of sorted) {
    if (!t.thesis || t.thesis.trim().length < 10) {
      noThesisCount++;
      noThesisNetR += t.resultR ?? 0;
    }
    for (const m of t.mistakeTags ?? []) {
      if (!mistakeMap[m]) mistakeMap[m] = { count: 0, netR: 0 };
      mistakeMap[m].count++;
      mistakeMap[m].netR += t.resultR ?? 0;
    }
  }
  const mistakeFrequency = Object.entries(mistakeMap)
    .map(([tag, v]) => ({ tag, count: v.count, netR: Number(v.netR.toFixed(2)) }))
    .sort((a, b) => b.count - a.count);

  // revenge trades: a loss followed by another trade within 30 minutes
  let revengeTrades = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curT = sorted[i];
    if (prev.outcome === "loss" && curT.openedAt && prev.closedAt) {
      const gap = curT.openedAt - prev.closedAt;
      if (gap > 0 && gap < 30 * 60 * 1000) revengeTrades++;
    }
  }

  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    open: open.length,
    winRate: Number(winRate.toFixed(1)),
    netR: Number(netR.toFixed(2)),
    avgWinR: Number(avgWinR.toFixed(2)),
    avgLossR: Number(avgLossR.toFixed(2)),
    largestWinR: Number(largestWinR.toFixed(2)),
    largestLossR: Number(largestLossR.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    profitFactor: profitFactor === Infinity ? 999 : Number(profitFactor.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    bestStreak,
    worstStreak: Math.abs(worstStreak),
    currentStreak,
    avgRiskPercent: Number(avgRiskPercent.toFixed(2)),
    equityCurve,
    bySession: groupStats(sorted, (t) => t.session),
    bySetup: groupStats(sorted, (t) => t.setup),
    byDirection: groupStats(sorted, (t) => t.direction),
    byTimeframe: groupStats(sorted, (t) => t.timeframe),
    mistakeFrequency,
    noThesisCount,
    noThesisNetR: Number(noThesisNetR.toFixed(2)),
    revengeTrades,
  };
}

export interface EdgeRow {
  setup: string;
  count: number;
  winRate: number;
  netR: number;
  avgR: number;
  edge: number; // expectancy * sqrt(count) — stability-weighted
}

export function computeEdge(trades: Trade[]): EdgeRow[] {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const map: Record<string, Trade[]> = {};
  for (const t of closed) {
    (map[t.setup] ??= []).push(t);
  }
  return Object.entries(map)
    .map(([setup, list]) => {
      const wins = list.filter((t) => t.outcome === "win");
      const losses = list.filter((t) => t.outcome === "loss");
      const decided = wins.length + losses.length;
      const winRate = decided ? (wins.length / decided) * 100 : 0;
      const netR = list.reduce((s, t) => s + (t.resultR ?? 0), 0);
      const avgR = list.length ? netR / list.length : 0;
      const edge = avgR * Math.sqrt(list.length);
      return {
        setup,
        count: list.length,
        winRate: Number(winRate.toFixed(1)),
        netR: Number(netR.toFixed(2)),
        avgR: Number(avgR.toFixed(2)),
        edge: Number(edge.toFixed(2)),
      };
    })
    .sort((a, b) => b.edge - a.edge);
}

export interface Leak {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  metric: string;
  suggestion: string;
}

const MISTAKE_LABEL: Record<string, string> = {
  revenge: "ریونج ترید",
  "no-thesis": "بدون تز",
  "oversized-risk": "ریسک نامتناسب",
  fomo: "FOMO",
  "moved-stop": "جابجایی حد ضرر",
  "early-exit": "خروج زودهنگام",
  "late-entry": "ورود دیرهنگام",
  "no-htf-check": "بی‌محلی به بایاس",
  "against-bias": "خلاف بایاس",
  overtrading: "اورتریدینگ",
  "no-confirm": "بدون تایید ورود",
  "size-too-small": "حجم کمتر از برنامه",
};

export function getMistakeLabel(tag: string): string {
  return MISTAKE_LABEL[tag] ?? tag;
}

export function detectLeaks(trades: Trade[]): Leak[] {
  const stats = computeStats(trades);
  const leaks: Leak[] = [];
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);

  if (closed.length < 5) return leaks;

  // 1. Revenge trading
  if (stats.revengeTrades >= 2) {
    leaks.push({
      id: "revenge",
      title: "ریونج ترید",
      description: `${stats.revengeTrades} ترید زیر ۳۰ دقیقه بعد از یک باخت ثبت شده. این الگوی کلاسیک انتقام‌جوییه.`,
      severity: stats.revengeTrades >= 4 ? "high" : "medium",
      metric: `${stats.revengeTrades} مورد`,
      suggestion: "بعد از هر باخت حداقل ۳۰ دقیقه (ترجیحاً تا پایان سشن) از چارت فاصله بگیر.",
    });
  }

  // 2. No-thesis trades
  if (stats.noThesisCount >= 3) {
    leaks.push({
      id: "no-thesis",
      title: "ورود بدون تز",
      description: `${stats.noThesisCount} ترید بدون تز پیش از ورود ثبت شده (خالص ${stats.noThesisNetR}R). ترید بدون تز قمار نیست؟`,
      severity: stats.noThesisNetR < -3 ? "high" : "medium",
      metric: `${stats.noThesisCount} مورد`,
      suggestion: "تز رو اجباری کن — بدون ثبت تز و دیدگاه، دکمه ورود رو نزن.",
    });
  }

  // 3. Oversized risk
  const oversized = closed.filter((t) => t.riskPercent > 2);
  if (oversized.length >= 2) {
    const totalRisk = oversized.reduce((s, t) => s + t.riskPercent, 0);
    leaks.push({
      id: "oversized",
      title: "ریسک نامتناسب",
      description: `${oversized.length} ترید با ریسک بالای ۲٪ (میانگین ${(totalRisk / oversized.length).toFixed(1)}٪).`,
      severity: "high",
      metric: `${oversized.length} مورد`,
      suggestion: "ریسک ثابت ۱٪ رو رعایت کن — مدیریت سرمایه پایه‌ی بقاست.",
    });
  }

  // 4. Against bias / no HTF check
  const againstBias = closed.filter((t) => t.mistakeTags.includes("against-bias") || t.mistakeTags.includes("no-htf-check"));
  if (againstBias.length >= 2) {
    const net = againstBias.reduce((s, t) => s + (t.resultR ?? 0), 0);
    leaks.push({
      id: "against-bias",
      title: "خلاف بایاس تاپ‌دان",
      description: `${againstBias.length} ترید خلاف یا بدون توجه به بایاس تایم‌فریم بالاتر (خالص ${net.toFixed(1)}R).`,
      severity: net < 0 ? "medium" : "low",
      metric: `${againstBias.length} مورد`,
      suggestion: "قبل از هر ورود، بایاس H1/H4 رو مشخص کن و فقط هم‌جهت معامله کن.",
    });
  }

  // 5. Worst setup
  const edges = computeEdge(trades);
  const worst = edges[edges.length - 1];
  if (worst && worst.count >= 3 && worst.netR < -2) {
    leaks.push({
      id: "worst-setup",
      title: `ست‌آپ زیان‌ده: ${worst.setup}`,
      description: `${worst.count} ترید با این ست‌آپ، خالص ${worst.netR}R و نرخ برد ${worst.winRate}٪.`,
      severity: worst.netR < -5 ? "high" : "medium",
      metric: `${worst.netR}R`,
      suggestion: "این ست‌آپ رو موقتاً از برنامه حذف کن یا روی کاغذ معامله کن تا لبه‌اش پیدا بشه.",
    });
  }

  // 6. Worst session
  const sessionEntries = Object.entries(stats.bySession).filter(([, v]) => v.count >= 3);
  const worstSession = sessionEntries.sort((a, b) => a[1].netR - b[1].netR)[0];
  if (worstSession && worstSession[1].netR < -2) {
    leaks.push({
      id: "worst-session",
      title: `سشن ضعیف: ${getSessionLabel(worstSession[0])}`,
      description: `${worstSession[1].count} ترید در سشن ${getSessionLabel(worstSession[0])} با خالص ${worstSession[1].netR}R و نرخ برد ${worstSession[1].winRate}٪.`,
      severity: worstSession[1].netR < -5 ? "medium" : "low",
      metric: `${worstSession[1].netR}R`,
      suggestion: `سشن ${getSessionLabel(worstSession[0])} رو محدود کن یا فقط مشاهده کن.`,
    });
  }

  // 7. Loss streak length
  if (stats.worstStreak >= 4) {
    leaks.push({
      id: "streak",
      title: "رشته باخت طولانی",
      description: `بدترین رشته باختت ${stats.worstStreak} تریده. احتمالاً در طول رشته ریسک یا فرکانس رو افزایش دادی.`,
      severity: stats.worstStreak >= 5 ? "high" : "medium",
      metric: `${stats.worstStreak} باخت`,
      suggestion: "بعد از ۳ باخت متوالی، حجم رو نصف کن و تا روز بعد معامله نکن.",
    });
  }

  return leaks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// Compress trades into a compact summary for the AI mentor.
// Enhanced: full analytics + representative trades with IDs + time analysis + setup edge.
// All analytics are computed from existing functions — no duplication.
export function buildMentorPayload(trades: Trade[], rangeLabel: string) {
  const stats = computeStats(trades);
  const edges = computeEdge(trades);
  const leaks = detectLeaks(trades);
  const dowHeatmap = computeDowHeatmap(trades);
  const hourHeatmap = computeHourHeatmap(trades);
  const symbolStats = computeSymbolStats(trades);

  // Representative trades — smart selection, not blind dump
  const closed = trades.filter((t) => t.outcome !== "open");
  const sortedByDate = [...closed].sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
  const sortedByR = [...closed].sort((a, b) => (b.resultR ?? -999) - (a.resultR ?? -999));

  // Select: 8 recent + 3 best + 3 worst + 3 from leaks (no-thesis, revenge, oversized)
  const recentIds = new Set(sortedByDate.slice(0, 8).map((t) => t.id));
  const bestIds = new Set(sortedByR.slice(0, 3).map((t) => t.id));
  const worstIds = new Set(sortedByR.slice(-3).map((t) => t.id));
  const leakTradeIds = new Set(
    closed
      .filter(
        (t) =>
          !t.thesis ||
          t.thesis.trim().length < 10 ||
          t.riskPercent > 2 ||
          (t.mistakeTags ?? []).length > 0
      )
      .slice(0, 5)
      .map((t) => t.id)
  );

  const selectedIds = new Set([
    ...recentIds,
    ...bestIds,
    ...worstIds,
    ...leakTradeIds,
  ]);

  const representativeTrades = closed
    .filter((t) => selectedIds.has(t.id))
    .sort((a, b) => (a.openedAt ?? 0) - (b.openedAt ?? 0))
    .slice(0, 20) // hard cap
    .map((t) => ({
      id: t.id,
      direction: t.direction,
      symbol: t.symbol,
      setup: t.setup,
      session: t.session,
      timeframe: t.timeframe,
      htfBias: t.htfBias,
      resultR: t.resultR,
      riskPercent: t.riskPercent,
      outcome: t.outcome,
      thesis: t.thesis ? t.thesis.slice(0, 200) : "",
      mistakes: t.mistakeTags ?? [],
      openedAt: t.openedAt,
    }));

  // Build possible revenge sequences (heuristic, not definitive)
  const possibleRevengeSequences: {
    lossTradeId: string;
    nextTradeId: string;
    gapMinutes: number;
    nextResultR: number | null;
  }[] = [];
  const sortedAll = [...closed].sort((a, b) => (a.openedAt ?? 0) - (b.openedAt ?? 0));
  for (let i = 1; i < sortedAll.length; i++) {
    const prev = sortedAll[i - 1];
    const cur = sortedAll[i];
    if (prev.outcome === "loss" && cur.openedAt && prev.closedAt) {
      const gap = (cur.openedAt - prev.closedAt) / 60000; // minutes
      if (gap > 0 && gap < 30) {
        possibleRevengeSequences.push({
          lossTradeId: prev.id,
          nextTradeId: cur.id,
          gapMinutes: Math.round(gap),
          nextResultR: cur.resultR,
        });
      }
    }
  }

  return {
    range: rangeLabel,
    summary: {
      total: stats.total,
      closed: stats.wins + stats.losses + stats.breakeven,
      wins: stats.wins,
      losses: stats.losses,
      breakeven: stats.breakeven,
      winRate: stats.winRate,
      netR: stats.netR,
      avgWinR: stats.avgWinR,
      avgLossR: stats.avgLossR,
      largestWinR: stats.largestWinR,
      largestLossR: stats.largestLossR,
      expectancy: stats.expectancy,
      profitFactor: stats.profitFactor,
      bestStreak: stats.bestStreak,
      worstStreak: stats.worstStreak,
      currentStreak: stats.currentStreak,
      avgRisk: stats.avgRiskPercent,
    },
    performance: {
      bySetup: Object.entries(stats.bySetup).map(([k, v]) => ({
        setup: k,
        count: v.count,
        winRate: v.winRate,
        netR: v.netR,
      })),
      bySession: Object.entries(stats.bySession).map(([k, v]) => ({
        session: k,
        count: v.count,
        winRate: v.winRate,
        netR: v.netR,
      })),
      byDirection: Object.entries(stats.byDirection).map(([k, v]) => ({
        direction: k,
        count: v.count,
        winRate: v.winRate,
        netR: v.netR,
      })),
      byTimeframe: Object.entries(stats.byTimeframe).map(([k, v]) => ({
        timeframe: k,
        count: v.count,
        winRate: v.winRate,
        netR: v.netR,
      })),
      bySymbol: symbolStats.map((s) => ({
        symbol: s.symbol,
        count: s.count,
        winRate: s.winRate,
        netR: s.netR,
        avgR: s.avgR,
      })),
    },
    setupEdge: edges.map((e) => ({
      setup: e.setup,
      count: e.count,
      winRate: e.winRate,
      netR: e.netR,
      avgR: e.avgR,
      edge: e.edge,
    })),
    mistakes: stats.mistakeFrequency.map((m) => ({
      tag: m.tag,
      count: m.count,
      netR: m.netR,
    })),
    noThesis: {
      count: stats.noThesisCount,
      netR: stats.noThesisNetR,
    },
    possibleRevengeSequences,
    detectedLeaks: leaks.map((l) => ({
      id: l.id,
      title: l.title,
      severity: l.severity,
      description: l.description,
      metric: l.metric,
    })),
    timeAnalysis: {
      dayOfWeek: dowHeatmap.map((d) => ({ day: d.label, count: d.count, netR: d.netR, winRate: d.winRate })),
      hourBuckets: hourHeatmap.map((h) => ({ hour: h.label, count: h.count, netR: h.netR, winRate: h.winRate })),
    },
    representativeTrades,
  };
}

export function isWin(t: Trade): boolean {
  return t.outcome === ("win" as Outcome);
}

// ---------- Heatmap analytics ----------

export interface HeatCell {
  key: string;
  label: string;
  count: number;
  netR: number;
  winRate: number;
  avgR: number;
}

// Day-of-week heatmap (Saturday-first for Jalali week, Persian labels)
const DOW_KEYS = [
  { key: "6", label: "شنبه", labelShort: "ش" },
  { key: "0", label: "یکشنبه", labelShort: "ی" },
  { key: "1", label: "دوشنبه", labelShort: "د" },
  { key: "2", label: "سه‌شنبه", labelShort: "س" },
  { key: "3", label: "چهارشنبه", labelShort: "چ" },
  { key: "4", label: "پنجشنبه", labelShort: "پ" },
  { key: "5", label: "جمعه", labelShort: "ج" },
];

export function computeDowHeatmap(trades: Trade[]): HeatCell[] {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const map: Record<string, Trade[]> = {};
  for (const t of closed) {
    const dow = new Date(t.openedAt).getDay().toString();
    (map[dow] ??= []).push(t);
  }
  return DOW_KEYS.map((d) => {
    const list = map[d.key] ?? [];
    const wins = list.filter((t) => t.outcome === "win").length;
    const losses = list.filter((t) => t.outcome === "loss").length;
    const decided = wins + losses;
    const netR = list.reduce((s, t) => s + (t.resultR ?? 0), 0);
    return {
      key: d.key,
      label: d.label,
      count: list.length,
      netR: Number(netR.toFixed(2)),
      winRate: decided ? Number(((wins / decided) * 100).toFixed(1)) : 0,
      avgR: list.length ? Number((netR / list.length).toFixed(2)) : 0,
    };
  });
}

// Hour-of-day heatmap (UTC hours 0-23, grouped into trading-relevant buckets)
const HOUR_BUCKETS = [
  { range: [0, 6], key: "00-06", label: "۰۰–۰۶", labelEn: "00-06" },
  { range: [6, 9], key: "06-09", label: "۰۶–۰۹", labelEn: "06-09" },
  { range: [9, 12], key: "09-12", label: "۰۹–۱۲", labelEn: "09-12" },
  { range: [12, 15], key: "12-15", label: "۱۲–۱۵", labelEn: "12-15" },
  { range: [15, 18], key: "15-18", label: "۱۵–۱۸", labelEn: "15-18" },
  { range: [18, 21], key: "18-21", label: "۱۸–۲۱", labelEn: "18-21" },
  { range: [21, 24], key: "21-24", label: "۲۱–۲۴", labelEn: "21-24" },
];

export function computeHourHeatmap(trades: Trade[]): HeatCell[] {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const map: Record<string, Trade[]> = {};
  for (const t of closed) {
    const h = new Date(t.openedAt).getUTCHours();
    for (const b of HOUR_BUCKETS) {
      if (h >= b.range[0] && h < b.range[1]) {
        (map[b.key] ??= []).push(t);
        break;
      }
    }
  }
  return HOUR_BUCKETS.map((b) => {
    const list = map[b.key] ?? [];
    const wins = list.filter((t) => t.outcome === "win").length;
    const losses = list.filter((t) => t.outcome === "loss").length;
    const decided = wins + losses;
    const netR = list.reduce((s, t) => s + (t.resultR ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      count: list.length,
      netR: Number(netR.toFixed(2)),
      winRate: decided ? Number(((wins / decided) * 100).toFixed(1)) : 0,
      avgR: list.length ? Number((netR / list.length).toFixed(2)) : 0,
    };
  });
}

// Combined day-of-week × hour-bucket matrix (for a 2D heatmap)
export function computeDowHourMatrix(trades: Trade[]): { dow: string; hour: string; count: number; netR: number }[][] {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const matrix: { dow: string; hour: string; count: number; netR: number }[][] = [];
  for (const d of DOW_KEYS) {
    const row: { dow: string; hour: string; count: number; netR: number }[] = [];
    for (const h of HOUR_BUCKETS) {
      const list = closed.filter((t) => {
        const td = new Date(t.openedAt).getDay().toString();
        const th = new Date(t.openedAt).getUTCHours();
        return td === d.key && th >= h.range[0] && th < h.range[1];
      });
      const netR = list.reduce((s, t) => s + (t.resultR ?? 0), 0);
      row.push({ dow: d.labelShort, hour: h.key, count: list.length, netR: Number(netR.toFixed(2)) });
    }
    matrix.push(row);
  }
  return matrix;
}

// Symbol performance breakdown
export interface SymbolStat {
  symbol: string;
  count: number;
  netR: number;
  winRate: number;
  avgR: number;
}

export function computeSymbolStats(trades: Trade[]): SymbolStat[] {
  const closed = trades.filter((t) => t.outcome !== "open" && t.resultR !== null);
  const map: Record<string, Trade[]> = {};
  for (const t of closed) {
    (map[t.symbol] ??= []).push(t);
  }
  return Object.entries(map)
    .map(([symbol, list]) => {
      const wins = list.filter((t) => t.outcome === "win").length;
      const losses = list.filter((t) => t.outcome === "loss").length;
      const decided = wins + losses;
      const netR = list.reduce((s, t) => s + (t.resultR ?? 0), 0);
      return {
        symbol,
        count: list.length,
        netR: Number(netR.toFixed(2)),
        winRate: decided ? Number(((wins / decided) * 100).toFixed(1)) : 0,
        avgR: list.length ? Number((netR / list.length).toFixed(2)) : 0,
      };
    })
    .sort((a, b) => b.netR - a.netR);
}
