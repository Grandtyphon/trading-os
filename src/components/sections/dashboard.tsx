"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats, getSessionLabel, getMistakeLabel } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { formatR, pnlColor } from "@/lib/format";
import { Num, EmptyState, SectionHeader, StatCard } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeeklyRecap } from "@/components/shared/weekly-recap";
import { GoalTracker } from "@/components/shared/goal-tracker";
import { StreakTracker } from "@/components/shared/streak-tracker";
import { TradeStatistics } from "@/components/shared/trade-statistics";
import { SessionPerformance } from "@/components/shared/session-performance";
import { PreTradeChecklist } from "@/components/shared/pre-trade-checklist";
import { QuickActions } from "@/components/shared/quick-actions";
import { DateRangeFilter, useDateRangeWindow, filterByDateRange } from "@/components/shared/date-range-filter";
import {
  LayoutDashboard,
  Trophy,
  Target,
  Activity,
  Flame,
  TrendingUp,
  Scale,
  Zap,
  Plus,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { SETUP_OPTIONS, TRADING_SESSIONS } from "@/lib/constants";
import { useProfiles } from "@/hooks/use-data";
import { useRouter } from "next/navigation";

const SETUP_LABEL: Record<string, string> = Object.fromEntries(
  SETUP_OPTIONS.map((s) => [s.value, s.label])
);

export function DashboardSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const profiles = useProfiles();
  const trades = useTrades(profileId);
  const setSection = useAppStore((s) => s.setSection);
  const activeProfile = profiles?.find((p) => p.id === profileId);
  const { start, end } = useDateRangeWindow();

  const filteredTrades = useMemo(
    () => (trades ? filterByDateRange(trades, start, end) : trades),
    [trades, start, end]
  );

  const stats = useMemo(() => (filteredTrades ? computeStats(filteredTrades) : null), [filteredTrades]);

  const setupData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.bySetup)
      .map(([k, v]) => ({ name: SETUP_LABEL[k] ?? k, netR: v.netR, count: v.count, winRate: v.winRate }))
      .sort((a, b) => b.netR - a.netR)
      .slice(0, 6);
  }, [stats]);

  const sessionData = useMemo(() => {
    if (!stats) return [];
    return TRADING_SESSIONS.map((s) => {
      const v = stats.bySession[s.value];
      return { name: s.label, netR: v?.netR ?? 0, count: v?.count ?? 0 };
    });
  }, [stats]);

  if (!trades || !stats) {
    return (
      <div className="space-y-5">
        <SectionHeader title={T.dashboard.title} icon={<LayoutDashboard className="h-5 w-5" />} />
        <EmptyState icon={<Activity className="h-7 w-7" />} title={T.common.loading} />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="space-y-5">
        <SectionHeader title={T.dashboard.title} icon={<LayoutDashboard className="h-5 w-5" />} />
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 via-transparent to-transparent p-8 text-center">
          <div className="bg-grid absolute inset-0 opacity-30" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/20 to-primary/10 ring-1 ring-gold/30">
              <LayoutDashboard className="h-9 w-9 text-gold" />
            </div>
            <h2 className="text-lg font-bold">به داشبوردت خوش اومدی</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              هنوز تریدی ثبت نشده. اولین تریدت رو اضافه کن تا آنالیز، منحنی سرمایه و الگوها نمایش داده بشن.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setSection("journal")} className="gap-2">
                <Plus className="h-4 w-4" />
                ثبت اولین ترید
              </Button>
              <Button variant="outline" onClick={() => setSection("calendar")}>
                <CalendarDays className="ml-2 h-4 w-4" />
                مشاهده تقویم
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const streakLabel =
    stats.currentStreak > 0
      ? `${stats.currentStreak} برد`
      : stats.currentStreak < 0
      ? `${Math.abs(stats.currentStreak)} باخت`
      : "—";

  return (
    <div className="space-y-5">
      <SectionHeader
        title={T.dashboard.title}
        subtitle={activeProfile ? `پروفایل: ${activeProfile.name}` : T.common.all}
        icon={<LayoutDashboard className="h-5 w-5" />}
        action={<DateRangeFilter />}
      />

      {/* Weekly recap — auto-generated 7-day summary */}
      <WeeklyRecap />

      {/* Goal tracker — monthly R target progress */}
      <GoalTracker />

      {/* Pre-trade checklist + Quick actions */}
      <div className="grid gap-3 lg:grid-cols-2">
        <PreTradeChecklist />
        <QuickActions />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={T.dashboard.winRate}
          value={`${stats.winRate}%`}
          sub={`${stats.wins}${T.journal.win} / ${stats.losses}${T.journal.loss}`}
          icon={<Trophy className="h-4 w-4" />}
          accent={stats.winRate >= 50 ? "gain" : "loss"}
        />
        <StatCard
          label={T.dashboard.netR}
          value={formatR(stats.netR)}
          sub={`${stats.total} ترید`}
          icon={<Zap className="h-4 w-4" />}
          accent={stats.netR >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label={T.dashboard.expectancy}
          value={formatR(stats.expectancy)}
          sub="به ازای هر ترید"
          icon={<Target className="h-4 w-4" />}
          accent={stats.expectancy >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label={T.dashboard.profitFactor}
          value={stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2)}
          sub="سود / ضرر"
          icon={<Scale className="h-4 w-4" />}
          accent={stats.profitFactor >= 1 ? "gain" : "loss"}
        />
      </div>

      {/* Equity curve */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-gold" />
            {T.dashboard.equityCurve}
          </h3>
          <span className={`text-sm font-bold ${pnlColor(stats.netR)}`}>
            <Num>{formatR(stats.netR)}</Num>
          </span>
        </div>
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.equityCurve} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="index" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number) => [`${v}R`, "تجمعی"]}
                labelFormatter={(l) => `ترید #${l}`}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="var(--gain)"
                strokeWidth={2}
                fill="url(#eqGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Streaks + secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={T.dashboard.bestStreak} value={`${stats.bestStreak}`} sub="برد متوالی" icon={<Flame className="h-4 w-4" />} accent="gain" />
        <StatCard label={T.dashboard.worstStreak} value={`${stats.worstStreak}`} sub="باخت متوالی" icon={<Flame className="h-4 w-4" />} accent="loss" />
        <StatCard label={T.dashboard.currentStreak} value={streakLabel} sub="رشته فعلی" icon={<Activity className="h-4 w-4" />} accent={stats.currentStreak >= 0 ? "gain" : "loss"} />
        <StatCard label={T.dashboard.avgRisk} value={`${stats.avgRiskPercent}%`} sub="میانگین ریسک" icon={<Scale className="h-4 w-4" />} />
      </div>

      {/* Streak tracker + Trade statistics */}
      <div className="grid gap-3 lg:grid-cols-2">
        <StreakTracker />
        <TradeStatistics />
      </div>

      {/* By setup + by session */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{T.dashboard.bySetup}</h3>
          {setupData.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{T.common.empty}</p>
          ) : (
            <div className="h-48 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} stroke="var(--border)" width={70} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}R`, "خالص"]}
                  />
                  <Bar dataKey="netR" radius={[0, 4, 4, 0]}>
                    {setupData.map((d, i) => (
                      <Cell key={i} fill={d.netR >= 0 ? "var(--gain)" : "var(--loss)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{T.dashboard.bySession}</h3>
          <div className="space-y-2">
            {sessionData.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{s.name}</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted/50">
                  <div
                    className={`absolute inset-y-0 ${s.netR >= 0 ? "right-0 bg-emerald-500/30" : "right-0 bg-rose-500/30"}`}
                    style={{ width: `${Math.min(100, (Math.abs(s.netR) / 10) * 100 || 5)}%` }}
                  />
                  <span className="relative flex h-full items-center justify-center text-xs font-medium">
                    <Num>{formatR(s.netR)}</Num> · <Num>{s.count}</Num>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Session Performance comparison (ranked) */}
      <SessionPerformance />

      {/* direction + timeframe mini */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(stats.byDirection).map(([k, v]) => (
          <StatCard
            key={k}
            label={k === "long" ? "خرید" : "فروش"}
            value={formatR(v.netR)}
            sub={`${v.count} ترید · ${v.winRate}%`}
            accent={v.netR >= 0 ? "gain" : "loss"}
          />
        ))}
        {stats.mistakeFrequency[0] && (
          <StatCard
            label="پرتکرارترین اشتباه"
            value={getMistakeLabel(stats.mistakeFrequency[0].tag)}
            sub={`${stats.mistakeFrequency[0].count} بار`}
            accent="loss"
          />
        )}
      </div>

      {/* CTA to mentor */}
      <Card className="flex flex-wrap items-center justify-between gap-3 border-gold/30 bg-gold/5 p-4">
        <div>
          <p className="text-sm font-semibold text-gold">تحلیل منتور آماده‌ست</p>
          <p className="text-xs text-muted-foreground">بذار هوش مصنوعی دیتاهات رو بررسی کنه و الگوها رو پیدا کنه</p>
        </div>
        <button
          onClick={() => setSection("mentor")}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          {T.nav.mentor}
        </button>
      </Card>
    </div>
  );
}
