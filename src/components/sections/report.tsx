"use client";

import { useMemo } from "react";
import { useTrades, useProfiles } from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { computeStats, computeEdge, detectLeaks, getSessionLabel } from "@/lib/stats";
import { T } from "@/lib/i18n";
import { formatR, formatPct, formatPrice } from "@/lib/format";
import { Num, EmptyState, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { SETUP_OPTIONS, TRADING_SESSIONS, PROFILE_TYPE_META } from "@/lib/constants";
import moment from "jalali-moment";

const SETUP_LABEL: Record<string, string> = Object.fromEntries(SETUP_OPTIONS.map((s) => [s.value, s.label]));

export function ReportSection() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const calendarMode = useAppStore((s) => s.calendarMode);
  const profiles = useProfiles();
  const trades = useTrades(profileId);
  const activeProfile = profiles?.find((p) => p.id === profileId);

  const stats = useMemo(() => (trades ? computeStats(trades) : null), [trades]);
  const edges = useMemo(() => (trades ? computeEdge(trades) : []), [trades]);
  const leaks = useMemo(() => (trades ? detectLeaks(trades) : []), [trades]);

  const reportDate = useMemo(() => {
    return calendarMode === "jalali"
      ? moment().format("jD jMMMM jYYYY")
      : moment().format("D MMMM YYYY");
  }, [calendarMode]);

  const handlePrint = () => {
    window.print();
  };

  // plain-text performance digest — copies to the clipboard for pasting into
  // Telegram/notes (offline: navigator.clipboard + legacy fallback)
  const handleCopySummary = async () => {
    if (!stats) return;
    const topSetup = edges.length > 0 ? [...edges].sort((a, b) => b.netR - a.netR)[0] : null;
    const lines = [
      `📊 گزارش عملکرد — ${activeProfile?.name ?? T.common.all} — ${reportDate}`,
      ``,
      `${stats.total} ترید · ${stats.wins} برد / ${stats.losses} باخت (نرخ برد ${stats.winRate}%)`,
      `خالص: ${formatR(stats.netR)} · میانگین: ${formatR(stats.expectancy)} · پروفیت فکتور: ${stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2)}`,
      `بهترین رشته: ${stats.bestStreak} برد · بدترین رشته: ${stats.worstStreak} باخت`,
    ];
    if (topSetup) {
      lines.push(`ست‌آپ برتر: ${SETUP_LABEL[topSetup.setup] ?? topSetup.setup} (${topSetup.count} ترید · ${formatR(topSetup.netR)})`);
    }
    if (leaks.length > 0) {
      lines.push(`نشتی‌های شناسایی‌شده: ${leaks.length} مورد`);
    }
    lines.push("", "— Trading OS");
    const text = lines.join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // legacy fallback for non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success(T.common.copied);
    } catch {
      toast.error("کپی ناموفق بود");
    }
  };

  const handleDownloadHTML = () => {
    const reportEl = document.getElementById("printable-report");
    if (!reportEl) return;
    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>گزارش عملکرد — ${reportDate}</title>
<style>
  body { font-family: 'Vazirmatn', 'Tahoma', sans-serif; background: #0d1117; color: #e6edf3; padding: 24px; max-width: 800px; margin: 0 auto; }
  h1 { color: #e8b65a; border-bottom: 2px solid #e8b65a; padding-bottom: 8px; }
  h2 { color: #e8b65a; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 8px 12px; text-align: right; border-bottom: 1px solid #30363d; }
  th { background: #161b22; color: #e8b65a; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .stat-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; }
  .stat-label { font-size: 11px; color: #8b949e; }
  .stat-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  .gain { color: #34d399; }
  .loss { color: #fb7185; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 2px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
</style>
</head>
<body>
${reportEl.innerHTML}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading-os-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="space-y-5">
        <SectionHeader title="گزارش عملکرد" icon={<FileText className="h-5 w-5" />} />
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={T.common.empty}
          hint="ترید ثبت کن تا گزارش ساخته بشه"
        />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="گزارش عملکرد"
        subtitle="گزارش جامع قابل چاپ و دانلود"
        icon={<FileText className="h-5 w-5" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopySummary} className="gap-1.5 print:hidden">
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{T.common.copySummary}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadHTML} className="gap-1.5 print:hidden">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">دانلود HTML</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">چاپ / PDF</span>
            </Button>
          </div>
        }
      />

      <div id="printable-report" className="space-y-4">
        {/* Report header */}
        <Card className="print:border-0 print:shadow-none p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gradient-gold print:text-black">
                گزارش عملکرد معاملات
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                پروفایل: {activeProfile?.name ?? T.common.all}
                {" · "}تاریخ گزارش: <Num>{reportDate}</Num>
              </p>
            </div>
            <div className="text-left text-xs text-muted-foreground">
              <p>تریدینگ اُ‌اس</p>
              <p><Num>{stats.total}</Num> ترید · <Num>{stats.wins}</Num> برد / <Num>{stats.losses}</Num> باخت</p>
            </div>
          </div>
        </Card>

        {/* KPI summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Card className="print:border-0 p-4">
            <div className="text-xs text-muted-foreground">{T.dashboard.winRate}</div>
            <div className={`mt-1 text-2xl font-bold ${stats.winRate >= 50 ? "text-emerald-500 print:text-emerald-600" : "text-rose-500"}`}>
              <Num>{stats.winRate}%</Num>
            </div>
          </Card>
          <Card className="print:border-0 p-4">
            <div className="text-xs text-muted-foreground">{T.dashboard.netR}</div>
            <div className={`mt-1 text-2xl font-bold ${stats.netR >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              <Num>{formatR(stats.netR)}</Num>
            </div>
          </Card>
          <Card className="print:border-0 p-4">
            <div className="text-xs text-muted-foreground">{T.dashboard.expectancy}</div>
            <div className={`mt-1 text-2xl font-bold ${stats.expectancy >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              <Num>{formatR(stats.expectancy)}</Num>
            </div>
          </Card>
          <Card className="print:border-0 p-4">
            <div className="text-xs text-muted-foreground">{T.dashboard.profitFactor}</div>
            <div className={`mt-1 text-2xl font-bold ${stats.profitFactor >= 1 ? "text-emerald-500" : "text-rose-500"}`}>
              <Num>{stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2)}</Num>
            </div>
          </Card>
        </div>

        {/* Streaks + secondary */}
        <Card className="print:border-0 p-4">
          <h3 className="mb-3 text-sm font-semibold">خلاصه آماری</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <StatRow label={T.dashboard.bestStreak} value={`${stats.bestStreak} برد`} />
            <StatRow label={T.dashboard.worstStreak} value={`${stats.worstStreak} باخت`} />
            <StatRow label="رشته فعلی" value={stats.currentStreak > 0 ? `${stats.currentStreak} برد` : stats.currentStreak < 0 ? `${Math.abs(stats.currentStreak)} باخت` : "—"} />
            <StatRow label="میانگین سود" value={formatR(stats.avgWinR)} />
            <StatRow label="میانگین ضرر" value={formatR(stats.avgLossR)} />
            <StatRow label={T.dashboard.avgRisk} value={`${stats.avgRiskPercent}%`} />
            <StatRow label="بدون تز" value={`${stats.noThesisCount} ترید`} />
            <StatRow label="ریونج ترید" value={`${stats.revengeTrades} مورد`} />
            <StatRow label="کل سود/ضرر" value={formatPct(stats.totalPnl)} />
          </div>
        </Card>

        {/* Setup breakdown */}
        {edges.length > 0 && (
          <Card className="print:border-0 p-4">
            <h3 className="mb-3 text-sm font-semibold">عملکرد بر اساس ست‌آپ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-xs text-muted-foreground">
                    <th className="py-2">ست‌آپ</th>
                    <th className="py-2 text-center">تعداد</th>
                    <th className="py-2 text-center">نرخ برد</th>
                    <th className="py-2 text-center">میانگین R</th>
                    <th className="py-2 text-left">خالص R</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.map((e) => (
                    <tr key={e.setup} className="border-b border-border/40 transition-colors hover:bg-muted/30">
                      <td className="py-2">{SETUP_LABEL[e.setup] ?? e.setup}</td>
                      <td className="py-2 text-center"><Num>{e.count}</Num></td>
                      <td className="py-2 text-center"><Num>{e.winRate}%</Num></td>
                      <td className="py-2 text-center"><Num>{formatR(e.avgR)}</Num></td>
                      <td className={`py-2 text-left font-bold ${e.netR >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        <Num>{formatR(e.netR)}</Num>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Session breakdown */}
        <Card className="print:border-0 p-4">
          <h3 className="mb-3 text-sm font-semibold">عملکرد بر اساس سشن</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-xs text-muted-foreground">
                  <th className="py-2">سشن</th>
                  <th className="py-2 text-center">تعداد</th>
                  <th className="py-2 text-center">نرخ برد</th>
                  <th className="py-2 text-left">خالص R</th>
                </tr>
              </thead>
              <tbody>
                {TRADING_SESSIONS.map((s) => {
                  const v = stats.bySession[s.value];
                  if (!v) return null;
                  return (
                    <tr key={s.value} className="border-b border-border/40 transition-colors hover:bg-muted/30">
                      <td className="py-2">{s.label}</td>
                      <td className="py-2 text-center"><Num>{v.count}</Num></td>
                      <td className="py-2 text-center"><Num>{v.winRate}%</Num></td>
                      <td className={`py-2 text-left font-bold ${v.netR >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        <Num>{formatR(v.netR)}</Num>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Leaks */}
        {leaks.length > 0 && (
          <Card className="print:border-0 p-4">
            <h3 className="mb-3 text-sm font-semibold">نشتی‌های شناسایی‌شده</h3>
            <div className="space-y-2">
              {leaks.map((l) => (
                <div key={l.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{l.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      l.severity === "high" ? "bg-rose-500/15 text-rose-500" :
                      l.severity === "medium" ? "bg-amber-500/15 text-amber-500" :
                      "bg-sky-500/15 text-sky-500"
                    }`}>
                      {l.severity === "high" ? "بحرانی" : l.severity === "medium" ? "هشدار" : "نکته"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">پیشنهاد: {l.suggestion}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent trades table */}
        <Card className="print:border-0 p-4">
          <h3 className="mb-3 text-sm font-semibold">تریدهای اخیر</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="py-1.5">تاریخ</th>
                  <th className="py-1.5">نماد</th>
                  <th className="py-1.5">جهت</th>
                  <th className="py-1.5">ست‌آپ</th>
                  <th className="py-1.5">سشن</th>
                  <th className="py-1.5 text-left">R</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-b border-border/30 transition-colors hover:bg-muted/30">
                    <td className="py-1.5" dir="ltr">
                      <Num>{calendarMode === "jalali" ? moment(t.openedAt).format("jYY/jMM/jDD") : moment(t.openedAt).format("YY/MM/DD")}</Num>
                    </td>
                    <td className="py-1.5 font-mono"><Num>{t.symbol}</Num></td>
                    <td className="py-1.5">{t.direction === "long" ? "خرید" : "فروش"}</td>
                    <td className="py-1.5">{SETUP_LABEL[t.setup] ?? t.setup}</td>
                    <td className="py-1.5">{getSessionLabel(t.session)}</td>
                    <td className={`py-1.5 text-left font-bold ${(t.resultR ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      <Num>{formatR(t.resultR)}</Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium"><Num>{value}</Num></span>
    </div>
  );
}
